/**
 * User Account Management Service
 * Handles admin-initiated deletion of Customer/Barber accounts through the
 * general Manajemen Pengguna page (as distinct from barber-account-
 * management.ts's specialized barber-management flows, which this delegates
 * to for a barber target -- see deleteUser below).
 *
 * Core Invariants (mirrors barber-account-management.ts):
 * 1. Never physically delete bookings/payments/reviews/transaction history
 * 2. Payment-first invariant is maintained (no payment status modifications)
 * 3. Every operation is logged in adminAuditLogs for audit trail
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from '../lib/firebase-admin.js';
import { getSlotLockId } from '../bookings/slot-lock.js';
import { ACTIVE_BOOKING_STATUSES, deleteBarber, logAdminAction } from './barber-account-management.js';

export interface UserDeleteResult {
  success: boolean;
  message: string;
  cancelledBookingsCount: number;
  paidBookingsNeedingReviewCount: number;
}

/**
 * Delete a user account (soft delete, FORCE semantics -- same policy as
 * deleteBarber: an account is never left un-deletable solely because it has
 * active bookings).
 *
 * Guards (all before any mutation):
 * - Admin cannot delete their own account (ADMIN_CANNOT_SELF_DELETE)
 * - Admin accounts can never be deleted through this endpoint
 *   (CANNOT_DELETE_ADMIN) -- promoting/demoting admins is a separate,
 *   deliberately out-of-band operation (scripts/set-admin-claims.mjs), not a
 *   normal User Management action
 *
 * A barber-role target (or any account with a barbers/{uid} doc) delegates
 * entirely to deleteBarber(), so there is exactly one implementation of "how
 * to safely wind down a barber's active bookings and remove them from
 * discovery" -- not two that could drift from each other.
 *
 * For a plain (customer) target: cancels their own active bookings with
 * cancellationReason/cancelledBy/cancelledByAdminId/cancelledAt metadata,
 * releases each booking's slot lock, marks refundRequired=true for any that
 * were paid (paymentStatus itself is never touched), deletes the Firebase
 * Auth account, and soft-deletes users/{userId}.
 */
export async function deleteUser(userId: string, adminId: string): Promise<UserDeleteResult> {
  if (userId === adminId) {
    throw new Error('ADMIN_CANNOT_SELF_DELETE');
  }

  const userRef = db.collection('users').doc(userId);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new Error('USER_NOT_FOUND');
  }

  const userData = userSnap.data()!;

  if (userData.role === 'admin') {
    throw new Error('CANNOT_DELETE_ADMIN');
  }

  if (userData.status === 'deleted') {
    return {
      success: true,
      message: 'User is already deleted.',
      cancelledBookingsCount: 0,
      paidBookingsNeedingReviewCount: 0,
    };
  }

  const barberSnap = await db.collection('barbers').doc(userId).get();
  if (userData.role === 'barber' || barberSnap.exists) {
    const barberResult = await deleteBarber(userId, adminId);
    return {
      success: barberResult.success,
      message: barberResult.message,
      cancelledBookingsCount: barberResult.cancelledBookingsCount,
      paidBookingsNeedingReviewCount: barberResult.paidBookingsNeedingReviewCount,
    };
  }

  const previousStatus = userData.status;

  // Force-cancel every active (non-final) booking this customer holds.
  const activeBookingsSnap = await db
    .collection('bookings')
    .where('customerId', '==', userId)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .get();

  let cancelledBookingsCount = 0;
  let paidBookingsNeedingReviewCount = 0;
  const cancelTimestamp = FieldValue.serverTimestamp();

  for (const bookingDoc of activeBookingsSnap.docs) {
    const bookingData = bookingDoc.data();

    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      cancellationReason: 'customer_deleted_by_admin',
      cancelledBy: 'admin',
      cancelledByAdminId: adminId,
      cancelledAt: cancelTimestamp,
      updatedAt: cancelTimestamp,
    };

    if (bookingData.paymentStatus === 'paid') {
      updateData.refundRequired = true;
      paidBookingsNeedingReviewCount++;
    }

    await bookingDoc.ref.update(updateData);
    cancelledBookingsCount++;

    if (bookingData.barberId && bookingData.date && bookingData.startTime) {
      const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
      await db.collection('slotLocks').doc(slotLockId).delete();
    }
  }

  // Delete Firebase Auth account
  try {
    await adminAuth.deleteUser(userId);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      console.warn(`[deleteUser] Firebase Auth user not found for ${userId}`);
    } else {
      throw new Error(`AUTH_DELETE_FAILED: ${err.message}`);
    }
  }

  const now = FieldValue.serverTimestamp();

  await userRef.update({
    status: 'deleted',
    deletedAt: now,
    deletedBy: adminId,
    isDiscoverable: false,
    updatedAt: now,
  });

  setImmediate(() => {
    logAdminAction(adminId, userId, userData.role || 'customer', 'USER_DELETED', '', previousStatus, 'deleted').catch(
      (err) => console.error('[deleteUser] Audit log failed:', err),
    );
    if (cancelledBookingsCount > 0) {
      logAdminAction(
        adminId,
        userId,
        userData.role || 'customer',
        'USER_DELETE_CANCELLED_BOOKINGS',
        `cancelled=${cancelledBookingsCount}, paidNeedingReview=${paidBookingsNeedingReviewCount}`,
        'active',
        'cancelled',
      ).catch((err) => console.error('[deleteUser] Audit log failed:', err));
    }
  });

  return {
    success: true,
    message: 'User account deleted successfully.',
    cancelledBookingsCount,
    paidBookingsNeedingReviewCount,
  };
}
