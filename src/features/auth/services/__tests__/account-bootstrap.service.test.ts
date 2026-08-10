/**
 * Unit Tests for Account Bootstrap Service
 * Covers Batch 10B-2: the backend (POST /api/auth/initialize-account) is the only
 * trusted writer of users/{uid} (Firestore rules deny client create on that
 * collection), so this service must never fall back to a direct Firestore write
 * and must always surface a controlled, retryable error instead of a raw
 * network/Firestore message.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setDocSpy = vi.fn();

vi.mock('firebase/firestore', () => ({
  setDoc: setDocSpy,
  doc: vi.fn(),
  getDoc: vi.fn(),
  Timestamp: { now: vi.fn() },
}));

const mockCurrentUser = {
  uid: 'test-uid',
  email: 'test@example.com',
  getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
};

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
  firestore: {},
}));

import { accountBootstrapService } from '../account-bootstrap.service';

describe('AccountBootstrapService.initializeAccount', () => {
  beforeEach(() => {
    setDocSpy.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('A. a network failure calling the backend does not attempt a direct users/{uid} Firestore write', async () => {
    (fetch as any).mockRejectedValue(new Error('Network request failed'));

    const result = await accountBootstrapService.initializeAccount({
      requestedRole: 'barber',
      name: 'Test Barber',
    });

    expect(result.success).toBe(false);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('B. backend unreachable/timeout returns a controlled application error, not a raw network/Firestore message', async () => {
    (fetch as any).mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

    const result = await accountBootstrapService.initializeAccount({
      requestedRole: 'customer',
      name: 'Test Customer',
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('BACKEND_UNAVAILABLE');
    expect(result.error?.message).not.toMatch(/permission|firestore|abort/i);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('B2. a structured backend application error (e.g. invalid role) is surfaced as-is, not replaced', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: { code: 'INVALID_ROLE', message: 'Role tidak valid.' } }),
    });

    const result = await accountBootstrapService.initializeAccount({
      requestedRole: 'barber',
      name: 'Test Barber',
    });

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ code: 'INVALID_ROLE', message: 'Role tidak valid.' });
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('C. retrying after the backend recovers calls the same trusted endpoint again and can succeed, with no direct Firestore write at any point', async () => {
    (fetch as any)
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uid: 'test-uid',
          appRole: 'barber',
          userStatus: 'active',
          onboardingStatus: 'draft',
          nextRoute: '/(barber-onboarding)/profile',
        }),
      });

    const first = await accountBootstrapService.initializeAccount({
      requestedRole: 'barber',
      name: 'Test Barber',
    });
    expect(first.success).toBe(false);

    const second = await accountBootstrapService.initializeAccount({
      requestedRole: 'barber',
      name: 'Test Barber',
    });
    expect(second.success).toBe(true);
    expect(second.nextRoute).toBe('/(barber-onboarding)/profile');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(setDocSpy).not.toHaveBeenCalled();
  });
});
