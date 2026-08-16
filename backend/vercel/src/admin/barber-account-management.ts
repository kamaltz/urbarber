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

import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from '../lib/firebase-admin.js';

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
}

// ============================================================================
// Audit Logging
// ============================================================================

async function logAdminAction(
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
    if (userData.role !== 'barber') {
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
    if (userData.role !== 'barber') {
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
 * Delete a barber account (soft delete).
 *
 * Operations:
 * 1. Verify barber exists
 * 2. Check for active bookings (paid, accepted, in_progress)
 * 3. Delete Firebase Auth account
 * 4. Update Firestore: users/{barberId}.status = deleted (soft delete)
 * 5. Update Firestore: barbers/{barberId}.status = deleted, isDiscoverable = false
 * 6. Preserve all payment and booking history
 * 7. Log action in adminAuditLogs
 *
 * Rules:
 * - Cannot delete if barber has active paid/accepted/in_progress bookings
 * - Soft delete: profile remains in database, marked as deleted
 * - Deleted barber cannot receive new bookings
 * - Deleted barber cannot login (Firebase Auth account deleted)
 * - Cannot reactivate a deleted account (must contact admin)
 * - All transaction history is preserved for audit trail
 */
export async function deleteBarber(
  barberId: string,
  adminId: string,
): Promise<BarberDeleteResult> {
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
    if (userData.role !== 'barber') {
      throw new Error('USER_NOT_BARBER');
    }

    previousStatus = userData.status;

    // Check for active bookings (pending, accepted, in_progress, en_route, arrived)
    const activeBookingsSnap = await db
      .collection('bookings')
      .where('barberId', '==', barberId)
      .where('status', 'in', ['pending', 'accepted', 'in_progress', 'en_route', 'arrived'])
      .get();

    const nonFinishedBookings = activeBookingsSnap.docs.filter((docSnap) => {
      const d = docSnap.data();
      return d.status !== 'completed' && d.status !== 'cancelled' && d.status !== 'rejected';
    });

    if (nonFinishedBookings.length > 0) {
      throw new Error('BARBER_HAS_ACTIVE_BOOKINGS');
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

    // Soft delete: Mark as deleted instead of physically removing
    tx.update(userRef, {
      status: 'deleted',
      deletedAt: now,
      deletedBy: adminId,
      isDiscoverable: false,
      updatedAt: now,
    });

    // Soft delete barber profile
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

    // Log action (done outside transaction)
    setImmediate(() => {
      logAdminAction(adminId, barberId, 'barber', 'BARBER_DELETED', '', previousStatus, 'deleted').catch(
        (err) => console.error('[deleteBarber] Audit log failed:', err),
      );
    });

    return {
      success: true,
      message: 'Barber account deleted successfully.',
    };
  });
}
