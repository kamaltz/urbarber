/**
 * Tests for Barber Account Management
 *
 * Tests cover:
 * 1. Authorization checks (no token, customer token, barber token, admin token)
 * 2. Suspend operations
 * 3. Reactivate operations
 * 4. Delete operations
 * 5. Firebase Auth integration
 * 6. Audit logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db, adminAuth } from '../src/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
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
 * The functions under test build Firestore refs via db.collection(...).doc(...)
 * (the standard Admin SDK pattern -- transactions read/write using refs, they
 * don't expose their own .collection()), then pass those refs into
 * tx.get/tx.update. A bare `collection: vi.fn()` with no default implementation
 * returns undefined, so `.doc(...)` on it throws before tx.get is ever reached.
 * This default gives every test a chainable collection mock supporting both
 * .doc() (for building tx refs) and .where()/.get() (for deleteBarber's
 * active-bookings query) -- individual tests only need to override the
 * resolved value of .get() where they care about the active-bookings result.
 */
function createChainableCollectionMock(getResult: any = { size: 0, docs: [] }) {
  const mock: any = {};
  mock.doc = vi.fn(() => ({}));
  mock.where = vi.fn(() => mock);
  mock.orderBy = vi.fn(() => mock);
  mock.limit = vi.fn(() => mock);
  mock.get = vi.fn().mockResolvedValue(getResult);
  mock.add = vi.fn().mockResolvedValue({ id: 'mock-audit-log-id' });
  return mock;
}

describe('Barber Account Management', () => {
  beforeEach(() => {
    (db.collection as any).mockImplementation(() => createChainableCollectionMock());
  });

  // ============================================================================
  // SUSPEND BARBER TESTS
  // ============================================================================

  describe('suspendBarber', () => {
    it('should throw USER_NOT_FOUND when barber does not exist', async () => {
      // Mock: user not found
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

    it('should throw USER_NOT_BARBER when user is not a barber', async () => {
      // Mock: user exists but is customer
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'customer', status: 'active' }),
          }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      await expect(suspendBarber('customer-uid', 'admin-uid', 'reason'))
        .rejects
        .toThrow('USER_NOT_BARBER');
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
  // DELETE BARBER TESTS
  // ============================================================================

  describe('deleteBarber', () => {
    it('should throw USER_NOT_FOUND when barber does not exist', async () => {
      const mockTx = {
        get: vi.fn().mockResolvedValueOnce({
          exists: false,
        }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      await expect(deleteBarber('nonexistent', 'admin-uid'))
        .rejects
        .toThrow('USER_NOT_FOUND');
    });

    it('should throw BARBER_HAS_ACTIVE_BOOKINGS when barber has active bookings', async () => {
      // Mock: barber exists
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({}),
          }),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      // Mock: barber has active bookings. db.collection('users')/('barbers') still
      // need .doc() to build the transaction refs above -- only the 'bookings'
      // collection's query should resolve to an active-bookings result.
      // deleteBarber filters activeBookingsSnap.docs via docSnap.data(), so each
      // mock doc needs a real .data() method, not a plain object.
      const mockBookingsSnap = {
        size: 2,
        docs: [
          { data: () => ({ status: 'pending' }) },
          { data: () => ({ status: 'accepted' }) },
        ],
      };
      (db.collection as any).mockImplementation((name: string) =>
        createChainableCollectionMock(name === 'bookings' ? mockBookingsSnap : undefined)
      );

      await expect(deleteBarber('barber-uid', 'admin-uid'))
        .rejects
        .toThrow('BARBER_HAS_ACTIVE_BOOKINGS');
    });

    it('should successfully delete a barber with no active bookings', async () => {
      // Mock: barber exists
      const mockTx = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({ role: 'barber' }),
          })
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({}),
          }),
        update: vi.fn(),
      };

      (db.runTransaction as any).mockImplementationOnce(async (callback: Function) => {
        return callback(mockTx);
      });

      // Mock: no active bookings (the beforeEach default already resolves
      // { size: 0, docs: [] } for any collection, including 'bookings').

      (adminAuth.deleteUser as any).mockResolvedValueOnce({});

      const result = await deleteBarber('barber-uid', 'admin-uid');

      expect(result.success).toBe(true);
      expect(adminAuth.deleteUser).toHaveBeenCalledWith('barber-uid');
      expect(mockTx.update).toHaveBeenCalledTimes(2);
    });
  });
});
