/**
 * Tests for User Account Management (generic Customer/Barber deletion via
 * Manajemen Pengguna, as distinct from the specialized barber-management
 * flows in barber-account-management.test.ts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, adminAuth } from '../src/lib/firebase-admin';
import { deleteUser } from '../src/admin/user-account-management';

vi.mock('../src/lib/firebase-admin', () => ({
  db: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  },
  adminAuth: {
    updateUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

function createChainableCollectionMock(docGetResult: any = { exists: false }, queryGetResult: any = { size: 0, docs: [] }) {
  const docRef: any = {
    get: vi.fn().mockResolvedValue(docGetResult),
    update: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
  const mock: any = {};
  mock.doc = vi.fn(() => docRef);
  mock.where = vi.fn(() => mock);
  mock.orderBy = vi.fn(() => mock);
  mock.limit = vi.fn(() => mock);
  mock.get = vi.fn().mockResolvedValue(queryGetResult);
  mock.add = vi.fn().mockResolvedValue({ id: 'mock-audit-log-id' });
  return { mock, docRef };
}

function bookingQueryDoc(data: Record<string, any>) {
  return { data: () => data, ref: { update: vi.fn().mockResolvedValue(undefined) } };
}

function mockCollections(config: { users?: any; barbers?: any; bookingsQuery?: any }) {
  const users = createChainableCollectionMock(config.users ?? { exists: false });
  const barbers = createChainableCollectionMock(config.barbers ?? { exists: false });
  const bookings = createChainableCollectionMock(undefined, config.bookingsQuery ?? { size: 0, docs: [] });
  const slotLocks = createChainableCollectionMock();

  (db.collection as any).mockImplementation((name: string) => {
    if (name === 'users') return users.mock;
    if (name === 'barbers') return barbers.mock;
    if (name === 'bookings') return bookings.mock;
    if (name === 'slotLocks') return slotLocks.mock;
    return createChainableCollectionMock().mock;
  });

  return { users, barbers, bookings, slotLocks };
}

describe('deleteUser', () => {
  beforeEach(() => {
    (db.collection as any).mockImplementation(() => createChainableCollectionMock().mock);
  });

  it('throws ADMIN_CANNOT_SELF_DELETE when the target is the calling admin', async () => {
    await expect(deleteUser('admin-uid', 'admin-uid')).rejects.toThrow('ADMIN_CANNOT_SELF_DELETE');
  });

  it('throws USER_NOT_FOUND when the target does not exist', async () => {
    mockCollections({ users: { exists: false } });
    await expect(deleteUser('nonexistent', 'admin-uid')).rejects.toThrow('USER_NOT_FOUND');
  });

  it('throws CANNOT_DELETE_ADMIN when the target is an admin account', async () => {
    mockCollections({ users: { exists: true, data: () => ({ role: 'admin', status: 'active' }) } });
    await expect(deleteUser('other-admin-uid', 'admin-uid')).rejects.toThrow('CANNOT_DELETE_ADMIN');
  });

  it('is idempotent: returns success without re-deleting an already-deleted user', async () => {
    mockCollections({ users: { exists: true, data: () => ({ role: 'customer', status: 'deleted' }) } });

    const result = await deleteUser('customer-uid', 'admin-uid');

    expect(result.success).toBe(true);
    expect(adminAuth.deleteUser).not.toHaveBeenCalled();
  });

  it('deletes a normal customer with no active bookings', async () => {
    mockCollections({
      users: { exists: true, data: () => ({ role: 'customer', status: 'active' }) },
      bookingsQuery: { size: 0, docs: [] },
    });
    (adminAuth.deleteUser as any).mockResolvedValueOnce({});

    const result = await deleteUser('customer-uid', 'admin-uid');

    expect(result.success).toBe(true);
    expect(result.cancelledBookingsCount).toBe(0);
    expect(adminAuth.deleteUser).toHaveBeenCalledWith('customer-uid');
  });

  it('cancels a customer\'s active booking (with cancellation metadata) rather than blocking deletion, and preserves history', async () => {
    const doc = bookingQueryDoc({
      status: 'accepted',
      customerId: 'customer-uid',
      barberId: 'some-barber',
      paymentStatus: 'not_required',
      date: '2026-08-20',
      startTime: '14:00',
    });
    mockCollections({
      users: { exists: true, data: () => ({ role: 'customer', status: 'active' }) },
      bookingsQuery: { size: 1, docs: [doc] },
    });
    (adminAuth.deleteUser as any).mockResolvedValueOnce({});

    const result = await deleteUser('customer-uid', 'admin-uid');

    expect(result.success).toBe(true);
    expect(result.cancelledBookingsCount).toBe(1);
    // History (the booking document) is preserved: it's updated in place
    // (status/cancellation metadata only), never removed from Firestore.
    expect(doc.ref.update).toHaveBeenCalledTimes(1);
    expect(doc.ref.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        cancellationReason: 'customer_deleted_by_admin',
        cancelledBy: 'admin',
        cancelledByAdminId: 'admin-uid',
      })
    );
  });

  it('sets refundRequired (never paymentStatus) for a paid active booking, and still deletes the account', async () => {
    const doc = bookingQueryDoc({
      status: 'pending',
      customerId: 'customer-uid',
      barberId: 'some-barber',
      paymentStatus: 'paid',
      date: '2026-08-20',
      startTime: '09:00',
    });
    mockCollections({
      users: { exists: true, data: () => ({ role: 'customer', status: 'active' }) },
      bookingsQuery: { size: 1, docs: [doc] },
    });
    (adminAuth.deleteUser as any).mockResolvedValueOnce({});

    const result = await deleteUser('customer-uid', 'admin-uid');

    expect(result.success).toBe(true);
    expect(result.paidBookingsNeedingReviewCount).toBe(1);
    const updateCall = (doc.ref.update as any).mock.calls[0][0];
    expect(updateCall.refundRequired).toBe(true);
    expect(updateCall.paymentStatus).toBeUndefined();
  });

  it('delegates to deleteBarber for a barber-role target, so barber-specific cleanup (discovery removal etc.) is never duplicated/drifted', async () => {
    mockCollections({
      users: { exists: true, data: () => ({ role: 'barber', status: 'active' }) },
      barbers: { exists: true, data: () => ({ listingStatus: 'active' }) },
      bookingsQuery: { size: 0, docs: [] },
    });
    (adminAuth.deleteUser as any).mockResolvedValueOnce({});
    const mockTx = { update: vi.fn() };
    (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => callback(mockTx));

    const result = await deleteUser('barber-uid', 'admin-uid');

    expect(result.success).toBe(true);
    // deleteBarber's own soft-delete transaction ran (barbers/{id}.listingStatus -> inactive).
    const barberUpdateCall = (mockTx.update as any).mock.calls.find(
      (call: any[]) => call[1]?.listingStatus === 'inactive'
    );
    expect(barberUpdateCall).toBeDefined();
  });

  it('delegates to deleteBarber for a target with a barbers/{id} doc even if users.role is not literally "barber"', async () => {
    mockCollections({
      users: { exists: true, data: () => ({ role: 'customer', status: 'active' }) },
      barbers: { exists: true, data: () => ({}) },
      bookingsQuery: { size: 0, docs: [] },
    });
    (adminAuth.deleteUser as any).mockResolvedValueOnce({});

    const result = await deleteUser('drifted-uid', 'admin-uid');
    expect(result.success).toBe(true);
  });
});
