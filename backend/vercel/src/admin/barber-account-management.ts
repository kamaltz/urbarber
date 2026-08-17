/**
 * Barber Account Management Service
 * Handles suspend, reactivate, and delete operations for barber accounts.
 *
 * Core Invariants:
 * 1. All state mutations use atomic Firestore transactions
 * 2. Firebase Admin Auth disabled flag is the authoritative lock
 * 3. Refresh tokens are revoked on suspend to force re-authentication
 * 4. Suspension prevents new bookings but preserves historical data
 * 5. Deletion prevents login, booking, and discovery (soft delete)
 * 6. Payment-first invariant is maintained (no payment status modifications)
 * 7. Every operation is logged in adminAuditLogs for audit trail
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from '../lib/firebase-admin.js';
import { getSlotLockId } from '../bookings/slot-lock.js';

/**
 * Statuses considered "active" (not yet in a final state) for a booking.
 * Matches deleteBarber's pre-existing query filter -- kept as a single source
 * so the force-delete cancellation loop below can never drift from what the
 * eligibility check itself queried for. Exported for reuse by
 * user-account-management.ts's customer-deletion cancellation loop.
 */
export const ACTIVE_BOOKING_STATUSES = ['pending', 'accepted', 'in_progress', 'en_route', 'arrived'];

// ============================================================================
// Types
// ============================================================================

export interface BarberSuspendResult {
  success: boolean;
  message: string;
}

export interface BarberReactivateResult {
  success: boolean;
  message: string;
}

export interface BarberDeleteResult {
  success: boolean;
  message: string;
  cancelledBookingsCount: number;
  paidBookingsNeedingReviewCount: number;
}

// ============================================================================
// Audit Logging
// ============================================================================

/** Exported for reuse by user-account-management.ts -- same adminAuditLogs shape applies to any account-lifecycle action, not just barber ones. */
export async function logAdminAction(
  adminId: string,
  targetUserId: string,
  targetRole: string,
  action: string,
  reason: string,
  previousStatus: string,
  newStatus: string,
): Promise<void> {
  try {
    const logEntry = {
      adminId,
      targetUserId,
      targetRole,
      action,
      reason: reason?.trim() || null,
      previousStatus,
      newStatus,
      createdAt: FieldValue.serverTimestamp(),
    };

    await db.collection('adminAuditLogs').add(logEntry);
  } catch (err: any) {
    // Log error but don't fail the operation
    console.error('[AuditLog] Failed to log action:', err.message);
  }
}

// ============================================================================
// Barber Suspension
// ============================================================================

/**
 * Suspend a barber account.
 *
 * Operations:
 * 1. Verify barber exists and is not already suspended
 * 2. Disable Firebase Auth account
 * 3. Revoke all refresh tokens
 * 4. Update Firestore: users/{barberId}.status = suspended
 * 5. Update Firestore: barbers/{barberId}.listingStatus = suspended, acceptingNewBookings = false
 * 6. Log action in adminAuditLogs
 *
 * Side Effects:
 * - Barber loses ability to login (Firebase Auth disabled)
 * - Existing active sessions become invalid (tokens revoked)
 * - Barber appears offline/unavailable to customers
 * - New bookings cannot be created for this barber
 * - Historical bookings and payments are preserved
 */
export async function suspendBarber(
  barberId: string,
  adminId: string,
  reason: string,
): Promise<BarberSuspendResult> {
  let previousStatus = 'unknown';

  return db.runTransaction(async tx => {
    const userRef = db.collection('users').doc(barberId);
    const barberRef = db.collection('barbers').doc(barberId);

    const [userSnap, barberSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(barberRef),
    ]);

    if (!userSnap.exists) {
      throw new Error('USER_NOT_FOUND');
    }

    const userData = userSnap.data()!;
    // A barbers/{barberId} doc is what actually makes an account appear as a
    // barber to the admin (getBarberList queries the `barbers` collection
    // directly, not users.role) -- so it, not users.role, is the authoritative
    // signal here. users.role can legitimately drift from it (e.g. an account
    // that registered as a customer before ever completing barber onboarding,
    // or any account whose role was never backfilled), and previously any such
    // drift made a barber shown in the admin's own list permanently
    // un-suspendable with a 403, even though the admin UI presented it as a
    // manageable barber.
    if (userData.role !== 'barber' && !barberSnap.exists) {
      throw new Error('USER_NOT_BARBER');
    }

    previousStatus = userData.status;

    if (userData.status === 'suspended') {
      return {
        success: true,
        message: 'Barber is already suspended.',
      };
    }

    // Disable Firebase Auth account
    try {
      await adminAuth.updateUser(barberId, { disabled: true });
      await adminAuth.revokeRefreshTokens(barberId);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        throw new Error('AUTH_USER_NOT_FOUND');
      }
      throw new Error(`AUTH_UPDATE_FAILED: ${err.message}`);
    }

    const now = FieldValue.serverTimestamp();

    // Update users document
    tx.update(userRef, {
      status: 'suspended',
      statusReason: reason?.trim() || null,
      statusChangedAt: now,
      statusChangedBy: adminId,
      updatedAt: now,
    });

    // Update barbers document if exists
    if (barberSnap.exists) {
      tx.update(barberRef, {
        listingStatus: 'suspended',
        acceptingNewBookings: false,
        statusChangedAt: now,
        statusChangedBy: adminId,
        updatedAt: now,
      });
    }

    // Log action (done outside transaction)
    setImmediate(() => {
      logAdminAction(adminId, barberId, 'barber', 'BARBER_SUSPENDED', reason, previousStatus, 'suspended').catch(
        (err) => console.error('[suspendBarber] Audit log failed:', err),
      );
    });

    return {
      success: true,
      message: 'Barber account suspended successfully.',
    };
  });
}

// ============================================================================
// Barber Reactivation
// ============================================================================

/**
 * Reactivate a suspended barber account.
 *
 * Operations:
 * 1. Verify barber exists and is suspended
 * 2. Enable Firebase Auth account
 * 3. Update Firestore: users/{barberId}.status = active
 * 4. Update Firestore: barbers/{barberId}.listingStatus = active (if verified), acceptingNewBookings = true
 * 5. Log action in adminAuditLogs
 *
 * Rules:
 * - Barber must be verified (verificationStatus = approved) to become active
 * - If verification status is not approved, listing remains inactive
 * - Historical bookings and payments are untouched
 */
export async function reactivateBarber(
  barberId: string,
  adminId: string,
): Promise<BarberReactivateResult> {
  let previousStatus = 'unknown';

  return db.runTransaction(async tx => {
    const userRef = db.collection('users').doc(barberId);
    const barberRef = db.collection('barbers').doc(barberId);

    const [userSnap, barberSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(barberRef),
    ]);

    if (!userSnap.exists) {
      throw new Error('USER_NOT_FOUND');
    }

    const userData = userSnap.data()!;
    // See suspendBarber's identical check above for why barberSnap.exists,
    // not users.role, is authoritative here.
    if (userData.role !== 'barber' && !barberSnap.exists) {
      throw new Error('USER_NOT_BARBER');
    }

    previousStatus = userData.status;

    if (userData.status !== 'suspended') {
      return {
        success: true,
        message: 'Barber is not suspended.',
      };
    }

    // Enable Firebase Auth account
    try {
      await adminAuth.updateUser(barberId, { disabled: false });
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        throw new Error('AUTH_USER_NOT_FOUND');
      }
      throw new Error(`AUTH_UPDATE_FAILED: ${err.message}`);
    }

    const now = FieldValue.serverTimestamp();

    // Update users document
    tx.update(userRef, {
      status: 'active',
      statusReason: null,
      statusChangedAt: now,
      statusChangedBy: adminId,
      updatedAt: now,
    });

    // Update barbers document if exists
    if (barberSnap.exists) {
      const barberData = barberSnap.data()!;
      // Only set to active if verified/approved
      if (barberData.verificationStatus === 'approved') {
        tx.update(barberRef, {
          listingStatus: 'active',
          acceptingNewBookings: true,
          statusChangedAt: now,
          statusChangedBy: adminId,
          updatedAt: now,
        });
      } else {
        // Keep listing inactive but mark account as active
        tx.update(barberRef, {
          statusChangedAt: now,
          statusChangedBy: adminId,
          updatedAt: now,
        });
      }
    }

    // Log action (done outside transaction)
    setImmediate(() => {
      logAdminAction(adminId, barberId, 'barber', 'BARBER_REACTIVATED', '', previousStatus, 'active').catch(
        (err) => console.error('[reactivateBarber] Audit log failed:', err),
      );
    });

    return {
      success: true,
      message: 'Barber account reactivated successfully.',
    };
  });
}

// ============================================================================
// Barber Account Deletion (Soft Delete)
// ============================================================================

/**
 * Delete a barber account (soft delete, FORCE semantics).
 *
 * Admin must be able to delete a barber account regardless of whether it
 * still has active bookings -- this is a deliberate policy change from the
 * account's earlier behavior, which refused deletion outright
 * (BARBER_HAS_ACTIVE_BOOKINGS, HTTP 409) whenever any active booking existed.
 * That hard block is gone; active bookings are now safely wound down as part
 * of the same deletion instead of blocking it.
 *
 * Operations:
 * 1. Verify barber exists (barbers/{barberId} doc, or users.role === 'barber')
 * 2. Find active (non-final) bookings and force-cancel each one:
 *    - status -> 'cancelled', with cancellationReason/cancelledBy/
 *      cancelledByAdminId/cancelledAt metadata
 *    - release the booking's slot lock
 *    - if paymentStatus === 'paid': set refundRequired = true (the existing
 *      canonical manual-refund marker already used by customer/barber-
 *      initiated cancellations elsewhere in this codebase) -- paymentStatus
 *      itself is never touched, so paid history stays truthful
 * 3. Delete the Firebase Auth account
 * 4. Soft-delete users/{barberId} and barbers/{barberId} (status='deleted',
 *    isDiscoverable=false, listingStatus='inactive', acceptingNewBookings=false)
 * 5. Preserve all payment/booking/review/transaction history -- nothing in
 *    this function ever deletes a bookings/payments/reviews document
 * 6. Log action in adminAuditLogs, including the cancellation counts
 *
 * Not fully atomic by design: the active-booking scan/cancellation happens
 * before the account-deletion transaction, matching this codebase's existing
 * precedent (api/app.ts's handleCancelBooking similarly cancels a booking and
 * releases its slot lock as separate non-transactional writes) rather than
 * forcing an unbounded number of booking documents into one Firestore
 * transaction.
 */
export async function deleteBarber(
  barberId: string,
  adminId: string,
): Promise<BarberDeleteResult> {
  const userRef = db.collection('users').doc(barberId);
  const barberRef = db.collection('barbers').doc(barberId);

  const [userSnap, barberSnap] = await Promise.all([userRef.get(), barberRef.get()]);

  if (!userSnap.exists) {
    throw new Error('USER_NOT_FOUND');
  }

  const userData = userSnap.data()!;
  // See suspendBarber's identical check for why barberSnap.exists, not
  // users.role, is authoritative.
  if (userData.role !== 'barber' && !barberSnap.exists) {
    throw new Error('USER_NOT_BARBER');
  }

  const previousStatus = userData.status;

  // Force-cancel every active (non-final) booking before deleting the account.
  const activeBookingsSnap = await db
    .collection('bookings')
    .where('barberId', '==', barberId)
    .where('status', 'in', ACTIVE_BOOKING_STATUSES)
    .get();

  let cancelledBookingsCount = 0;
  let paidBookingsNeedingReviewCount = 0;
  const cancelTimestamp = FieldValue.serverTimestamp();

  for (const bookingDoc of activeBookingsSnap.docs) {
    const bookingData = bookingDoc.data();

    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      cancellationReason: 'barber_deleted_by_admin',
      cancelledBy: 'admin',
      cancelledByAdminId: adminId,
      cancelledAt: cancelTimestamp,
      updatedAt: cancelTimestamp,
    };

    // Never touch paymentStatus, never fabricate a refund -- flag for the
    // existing manual admin-refund workflow instead (same field used by
    // handleCancelBooking/handleBarberRespondBooking's paid-cancellation path).
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
    await adminAuth.deleteUser(barberId);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      // User doesn't exist in Auth, continue with Firestore deletion
      console.warn(`[deleteBarber] Firebase Auth user not found for ${barberId}`);
    } else {
      throw new Error(`AUTH_DELETE_FAILED: ${err.message}`);
    }
  }

  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    // Soft delete: Mark as deleted instead of physically removing
    tx.update(userRef, {
      status: 'deleted',
      deletedAt: now,
      deletedBy: adminId,
      isDiscoverable: false,
      updatedAt: now,
    });

    // Soft delete barber profile -- listingStatus:'inactive' is what actually
    // removes this barber from discovery/search/nearby results (both
    // discovery.service.ts and customer.repository.ts query
    // listingStatus=='active' only).
    if (barberSnap.exists) {
      tx.update(barberRef, {
        status: 'deleted',
        isDiscoverable: false,
        listingStatus: 'inactive',
        acceptingNewBookings: false,
        deletedAt: now,
        deletedBy: adminId,
        updatedAt: now,
      });
    }
  });

  // Log action (done outside transaction)
  setImmediate(() => {
    logAdminAction(adminId, barberId, 'barber', 'BARBER_DELETED', '', previousStatus, 'deleted').catch(
      (err) => console.error('[deleteBarber] Audit log failed:', err),
    );
    if (cancelledBookingsCount > 0) {
      logAdminAction(
        adminId,
        barberId,
        'barber',
        'BARBER_DELETE_CANCELLED_BOOKINGS',
        `cancelled=${cancelledBookingsCount}, paidNeedingReview=${paidBookingsNeedingReviewCount}`,
        'active',
        'cancelled',
      ).catch((err) => console.error('[deleteBarber] Audit log failed:', err));
    }
  });

  return {
    success: true,
    message: 'Barber account deleted successfully.',
    cancelledBookingsCount,
    paidBookingsNeedingReviewCount,
  };
}
