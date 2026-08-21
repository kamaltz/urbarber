/**
 * Unit Tests for customerRepository.getCustomerProfile / updateCustomerProfile
 * (Customer Home/Profile consistency fix)
 *
 * Root cause of the live device finding "Home shows a stale name/photo after
 * editing Profile": useCustomerProfile() fetched customers/{uid} once per
 * screen instance with no shared cache and no refetch-on-focus, so editing on
 * one screen never reached the others until the app restarted. The fix
 * (useFocusEffect refetch in use-customer-profile.ts) only works if the
 * repository call itself is a fresh read every time, not a cached/memoized
 * one -- these tests lock that in, plus the customers/{uid} canonical
 * precedence over users/{uid} and the update dual-write both source docs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocMock, docMock, setDocMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  docMock: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  setDocMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  getDoc: getDocMock,
  getDocs: vi.fn(),
  setDoc: setDocMock,
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({
  firestore: {},
  firebaseAuth: { currentUser: { displayName: 'Auth Fallback', email: 'user@example.com', photoURL: null, phoneNumber: null } },
}));

vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));
vi.mock('@/config/map.config', () => ({ MAP_CONFIG: { defaultViewport: { latitude: 0, longitude: 0, zoom: 12 } } }));

import { customerRepository } from '../customer.repository';

function snapshot(exists: boolean, data?: Record<string, unknown>) {
  return { exists: () => exists, data: () => data };
}

describe('customerRepository.getCustomerProfile', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    docMock.mockClear();
  });

  it('1. reads customers/{uid} directly -- no caching layer masks a later edit', async () => {
    await customerRepository.getCustomerProfile('cust-1');

    expect(docMock).toHaveBeenCalledWith({}, 'customers', 'cust-1');
  });

  it('2. a second call after the document changes returns the new value, not a memoized first result', async () => {
    getDocMock.mockResolvedValueOnce(snapshot(true, { name: 'Original Name' }));
    const first = await customerRepository.getCustomerProfile('cust-1');
    expect(first?.name).toBe('Original Name');

    getDocMock.mockResolvedValueOnce(snapshot(true, { name: 'Updated After Edit' }));
    const second = await customerRepository.getCustomerProfile('cust-1');
    expect(second?.name).toBe('Updated After Edit');
  });

  it('3. falls back to users/{uid} only when customers/{uid} does not exist yet', async () => {
    getDocMock
      .mockResolvedValueOnce(snapshot(false))
      .mockResolvedValueOnce(snapshot(true, { name: 'Legacy Users Doc Name' }));

    const result = await customerRepository.getCustomerProfile('cust-2');

    expect(result?.name).toBe('Legacy Users Doc Name');
    expect(docMock).toHaveBeenCalledWith({}, 'users', 'cust-2');
  });

  it('4. customers/{uid} wins over users/{uid} when both exist -- canonical precedence', async () => {
    getDocMock.mockResolvedValueOnce(snapshot(true, { name: 'Canonical customers/{uid} Name' }));

    const result = await customerRepository.getCustomerProfile('cust-3');

    expect(result?.name).toBe('Canonical customers/{uid} Name');
    // Only one getDoc call: users/{uid} fallback must not even be read once
    // the canonical doc already resolved the name.
    expect(getDocMock).toHaveBeenCalledTimes(1);
  });
});

describe('customerRepository.updateCustomerProfile', () => {
  beforeEach(() => {
    setDocMock.mockClear();
    docMock.mockClear();
  });

  it('writes both customers/{uid} (canonical) and users/{uid} (legacy compatibility) so AuthContext.reloadUser (which reads users/{uid}) also sees the new name', async () => {
    const result = await customerRepository.updateCustomerProfile('cust-1', { name: 'New Name' });

    expect(result.success).toBe(true);
    const writtenCollections = setDocMock.mock.calls.map((call) => (call[0] as { collection: string }).collection);
    expect(writtenCollections).toEqual(expect.arrayContaining(['customers', 'users']));
  });
});
