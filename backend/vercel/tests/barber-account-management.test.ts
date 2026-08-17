/**
 * Tests for Barber Account Management
 *
 * Tests cover:
 * 1. Authorization checks (no token, customer token, barber token, admin token)
 * 2. Suspend operations
 * 3. Reactivate operations
 * 4. Delete operations (force-delete: active bookings cancelled, never blocked)
 * 5. Firebase Auth integration
 * 6. Audit logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db, adminAuth } from '../src/lib/firebase-admin';
import {
  suspendBarber,
  reactivateBarber,
  deleteBarber,
} from '../src/admin/barber-account-management';

// Mock Firebase Admin
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

/**
 * The functions under test build Firestore refs via db.collection(...).doc(...).
 * suspendBarber/reactivateBarber still read/write through db.runTransaction's
 * tx.get/tx.update (unchanged). deleteBarber's initial reads and its per-
 * booking cancellation loop now call the doc ref's own .get()/.update()/
 * .delete() directly (not through a transaction) -- only its final soft-
 * delete step still uses db.runTransaction. This factory supports both: a
 * chainable collection mock whose .doc() returns a ref with real get/update/
 * delete spies, and whose bare .get() (after .where()) resolves a query
 * snapshot.
 */
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

/**
 * Wires db.collection(name) to a per-collection-name mock so deleteBarber's
 * multiple different collections (users, barbers, bookings, slotLocks) each
 * get independently configurable behavior in a single test.
 */
function mockCollections(config: {
  users?: any;
  barbers?: any;
  bookingsQuery?: any;
}) {
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

/** A bookings-query doc with a real .data() and a real .ref.update() spy, matching deleteBarber's `for (const bookingDoc of activeBookingsSnap.docs)` usage. */
function bookingQueryDoc(data: Record<string, any>) {
  return { data: () => data, ref: { update: vi.fn().mockResolvedValue(undefined) } };
}

describe('Barber Account Management', () => {
  beforeEach(() => {
    (db.collection as any).mockImplementation(() => createChainableCollectionMock().mock);
  });

  // ============================================================================
  // SUSPEND BARBER TESTS
  // ============================================================================

  describe('suspendBarber', () => {
    it('should throw USER_NOT_FOUND when barber does not exist', async () => {
      const mockTx = {
        get: vi.fn().mockResolvedValueOnce({
          exists: false,
        }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      await expect(suspendBarber('nonexistent', 'admin-uid', 'reason'))
        .rejects
        .toThrow('USER_NOT_FOUND');
    });

    it('should throw USER_NOT_BARBER when user is not a barber and has no barbers doc', async () => {
      // Mock: user exists as customer, AND no barbers/{uid} doc exists either --
      // a genuinely non-barber account, which must still be rejected.
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'customer', status: 'active' }),
          })
          .mockResolvedValueOnce({
            exists: false,
          }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      await expect(suspendBarber('customer-uid', 'admin-uid', 'reason'))
        .rejects
        .toThrow('USER_NOT_BARBER');
    });

    it('regression: does NOT throw USER_NOT_BARBER when barbers/{id} exists even if users.role drifted -- this is the exact bug that made the admin UI\'s own barber-list entries permanently un-suspendable (403) whenever users.role was not literally "barber"', async () => {
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            // role is NOT 'barber' here, simulating drift -- but a real
            // barbers/{uid} doc exists, which is what actually makes this
            // account show up as a barber in the admin's Barber Management list.
            data: () => ({ role: 'customer', status: 'active' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ listingStatus: 'active' }),
          }),
        update: vi.fn(),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      (adminAuth.updateUser as any).mockResolvedValueOnce({});
      (adminAuth.revokeRefreshTokens as any).mockResolvedValueOnce({});

      const result = await suspendBarber('drifted-uid', 'admin-uid', 'reason');
      expect(result.success).toBe(true);
    });

    it('should successfully suspend an active barber', async () => {
      // Mock: barber exists and is active
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber', status: 'active' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ listingStatus: 'active' }),
          }),
        update: vi.fn(),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      (adminAuth.updateUser as any).mockResolvedValueOnce({});
      (adminAuth.revokeRefreshTokens as any).mockResolvedValueOnce({});

      const result = await suspendBarber('barber-uid', 'admin-uid', 'Violation of terms');

      expect(result.success).toBe(true);
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(adminAuth.updateUser).toHaveBeenCalledWith('barber-uid', { disabled: true });
      expect(adminAuth.revokeRefreshTokens).toHaveBeenCalledWith('barber-uid');
    });

    it('should return success if barber is already suspended', async () => {
      // Mock: barber already suspended
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber', status: 'suspended' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ listingStatus: 'suspended' }),
          }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      const result = await suspendBarber('barber-uid', 'admin-uid', 'reason');

      expect(result.success).toBe(true);
      expect(result.message).toContain('already suspended');
    });

    it('should throw AUTH_UPDATE_FAILED on Firebase Auth error', async () => {
      // Mock: barber exists but Auth update fails
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber', status: 'active' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ listingStatus: 'active' }),
          }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      const authError = new Error('Auth service down');
      (authError as any).code = 'auth/internal-error';
      (adminAuth.updateUser as any).mockRejectedValueOnce(authError);

      await expect(suspendBarber('barber-uid', 'admin-uid', 'reason'))
        .rejects
        .toThrow('AUTH_UPDATE_FAILED');
    });
  });

  // ============================================================================
  // REACTIVATE BARBER TESTS
  // ============================================================================

  describe('reactivateBarber', () => {
    it('should throw USER_NOT_FOUND when barber does not exist', async () => {
      const mockTx = {
        get: vi.fn().mockResolvedValueOnce({
          exists: false,
        }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      await expect(reactivateBarber('nonexistent', 'admin-uid'))
        .rejects
        .toThrow('USER_NOT_FOUND');
    });

    it('should successfully reactivate a suspended barber', async () => {
      // Mock: suspended barber with verified status
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber', status: 'suspended' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ verificationStatus: 'approved' }),
          }),
        update: vi.fn(),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      (adminAuth.updateUser as any).mockResolvedValueOnce({});

      const result = await reactivateBarber('barber-uid', 'admin-uid');

      expect(result.success).toBe(true);
      expect(mockTx.update).toHaveBeenCalledTimes(2);
      expect(adminAuth.updateUser).toHaveBeenCalledWith('barber-uid', { disabled: false });
    });

    it('should return success if barber is not suspended', async () => {
      // Mock: barber already active
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber', status: 'active' }),
          }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      const result = await reactivateBarber('barber-uid', 'admin-uid');

      expect(result.success).toBe(true);
      expect(result.message).toContain('not suspended');
    });

    it('should not set listingStatus to active if barber is not verified', async () => {
      // Mock: suspended barber with pending verification
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber', status: 'suspended' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ verificationStatus: 'pending' }),
          }),
        update: vi.fn(),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      (adminAuth.updateUser as any).mockResolvedValueOnce({});

      const result = await reactivateBarber('barber-uid', 'admin-uid');

      expect(result.success).toBe(true);
      // Check that listingStatus was not set to active (barber not verified)
      const updates = (mockTx.update as any).mock.calls;
      const barberUpdate = updates.find((call: any[]) =>
        call[1]?.listingStatus === 'active'
      );
      expect(barberUpdate).toBeUndefined();
    });
  });

  // ============================================================================
  // DELETE BARBER TESTS (force-delete: active bookings cancelled, never blocked)
  // ============================================================================

  describe('deleteBarber', () => {
    it('should throw USER_NOT_FOUND when barber does not exist', async () => {
      mockCollections({ users: { exists: false } });

      await expect(deleteBarber('nonexistent', 'admin-uid'))
        .rejects
        .toThrow('USER_NOT_FOUND');
    });

    it('should throw USER_NOT_BARBER when user is not a barber and has no barbers doc', async () => {
      mockCollections({
        users: { exists: true, data: () => ({ role: 'customer', status: 'active' }) },
        barbers: { exists: false },
      });

      await expect(deleteBarber('customer-uid', 'admin-uid'))
        .rejects
        .toThrow('USER_NOT_BARBER');
    });

    it('regression: does NOT throw USER_NOT_BARBER when barbers/{id} exists even if users.role drifted', async () => {
      mockCollections({
        users: { exists: true, data: () => ({ role: 'customer', status: 'active' }) },
        barbers: { exists: true, data: () => ({ listingStatus: 'active' }) },
        bookingsQuery: { size: 0, docs: [] },
      });
      (adminAuth.deleteUser as any).mockResolvedValueOnce({});

      const result = await deleteBarber('drifted-uid', 'admin-uid');
      expect(result.success).toBe(true);
    });

    it('deletes a barber with no active bookings', async () => {
      mockCollections({
        users: { exists: true, data: () => ({ role: 'barber', status: 'active' }) },
        barbers: { exists: true, data: () => ({}) },
        bookingsQuery: { size: 0, docs: [] },
      });
      (adminAuth.deleteUser as any).mockResolvedValueOnce({});

      const result = await deleteBarber('barber-uid', 'admin-uid');

      expect(result.success).toBe(true);
      expect(result.cancelledBookingsCount).toBe(0);
      expect(result.paidBookingsNeedingReviewCount).toBe(0);
      expect(adminAuth.deleteUser).toHaveBeenCalledWith('barber-uid');
    });

    // Section 16: pending / accepted / en_route / arrived / in_progress all
    // must be cancelled safely, never block deletion.
    it.each(['pending', 'accepted', 'en_route', 'arrived', 'in_progress'])(
      'succeeds and safely cancels a %s active booking instead of blocking deletion',
      async (status) => {
        const doc = bookingQueryDoc({
          status,
          barberId: 'barber-uid',
          paymentStatus: 'not_required',
          date: '2026-08-20',
          startTime: '10:00',
        });
        mockCollections({
          users: { exists: true, data: () => ({ role: 'barber', status: 'active' }) },
          barbers: { exists: true, data: () => ({}) },
          bookingsQuery: { size: 1, docs: [doc] },
        });
        (adminAuth.deleteUser as any).mockResolvedValueOnce({});

        const result = await deleteBarber('barber-uid', 'admin-uid');

        expect(result.success).toBe(true);
        expect(result.cancelledBookingsCount).toBe(1);
        expect(doc.ref.update).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'cancelled',
            cancellationReason: 'barber_deleted_by_admin',
            cancelledBy: 'admin',
            cancelledByAdminId: 'admin-uid',
          })
        );
      }
    );

    it('sets refundRequired (never paymentStatus) for a paid active booking, and still deletes the account', async () => {
      const doc = bookingQueryDoc({
        status: 'accepted',
        barberId: 'barber-uid',
        paymentStatus: 'paid',
        date: '2026-08-20',
        startTime: '10:00',
      });
      mockCollections({
        users: { exists: true, data: () => ({ role: 'barber', status: 'active' }) },
        barbers: { exists: true, data: () => ({}) },
        bookingsQuery: { size: 1, docs: [doc] },
      });
      (adminAuth.deleteUser as any).mockResolvedValueOnce({});

      const result = await deleteBarber('barber-uid', 'admin-uid');

      expect(result.success).toBe(true);
      expect(result.paidBookingsNeedingReviewCount).toBe(1);
      const updateCall = (doc.ref.update as any).mock.calls[0][0];
      expect(updateCall.refundRequired).toBe(true);
      expect(updateCall.status).toBe('cancelled');
      // paymentStatus itself must never be touched -- it's not even a key in the update.
      expect(updateCall.paymentStatus).toBeUndefined();
      expect(adminAuth.deleteUser).toHaveBeenCalledWith('barber-uid');
    });

    it('removes the barber from discovery (listingStatus -> inactive) on delete', async () => {
      mockCollections({
        users: { exists: true, data: () => ({ role: 'barber', status: 'active' }) },
        barbers: { exists: true, data: () => ({ listingStatus: 'active' }) },
        bookingsQuery: { size: 0, docs: [] },
      });
      (adminAuth.deleteUser as any).mockResolvedValueOnce({});

      const mockTx = { update: vi.fn() };
      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => callback(mockTx));

      await deleteBarber('barber-uid', 'admin-uid');

      const barberUpdateCall = (mockTx.update as any).mock.calls.find(
        (call: any[]) => call[1]?.listingStatus === 'inactive'
      );
      expect(barberUpdateCall).toBeDefined();
      expect(barberUpdateCall[1]).toMatchObject({
        status: 'deleted',
        isDiscoverable: false,
        listingStatus: 'inactive',
        acceptingNewBookings: false,
      });
    });

    it('continues (soft-deletes Firestore) even when the Firebase Auth account is already gone', async () => {
      mockCollections({
        users: { exists: true, data: () => ({ role: 'barber', status: 'active' }) },
        barbers: { exists: true, data: () => ({}) },
        bookingsQuery: { size: 0, docs: [] },
      });
      const authError = new Error('no user record');
      (authError as any).code = 'auth/user-not-found';
      (adminAuth.deleteUser as any).mockRejectedValueOnce(authError);

      const result = await deleteBarber('barber-uid', 'admin-uid');
      expect(result.success).toBe(true);
    });
  });
});
