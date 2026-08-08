/**
 * Admin Service
 * Core business logic for administrative operations.
 * All state mutations use atomic Firestore transactions.
 */

import { createClient } from '@supabase/supabase-js';
import { FieldValue } from 'firebase-admin/firestore';
import { config } from '../config/index.js';
import { db } from '../lib/firebase-admin.js';
import type {
  AdminBarberRecord,
  AdminBarberRegistration,
  AdminBookingRecord,
  AdminUserRecord,
  ApproveBarberResult,
  RejectBarberResult,
  SignedUrlResult,
  UpdateUserStatusResult,
} from './admin.types.js';

// ─── Supabase Service-Role Client ─────────────────────────────────────────────
// Uses the service-role key (server-only). NEVER return this key to the client.
function getSupabaseAdmin() {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ─── Barber Registration Approval ────────────────────────────────────────────

export async function approveBarber(
  barberId: string,
  adminUid: string,
): Promise<ApproveBarberResult> {
  return db.runTransaction(async (tx) => {
    const userRef   = db.collection('users').doc(barberId);
    const barberRef = db.collection('barbers').doc(barberId);
    const regRef    = db.collection('barberRegistrations').doc(barberId);

    const [userSnap, barberSnap, regSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(barberRef),
      tx.get(regRef),
    ]);

    // Idempotency: already approved → return current state
    if (barberSnap.exists && barberSnap.data()?.verificationStatus === 'approved') {
      return { alreadyApproved: true };
    }

    // Precondition checks
    if (!userSnap.exists) throw new Error('USER_NOT_FOUND');
    const userData = userSnap.data()!;
    if (userData.role !== 'barber') throw new Error('USER_NOT_BARBER');
    if (userData.status !== 'pending_verification') throw new Error('USER_NOT_PENDING');

    if (!regSnap.exists) throw new Error('REGISTRATION_NOT_FOUND');
    const regData = regSnap.data()!;
    if (regData.verificationStatus !== 'pending') throw new Error('REGISTRATION_NOT_PENDING');

    // Validate required registration data
    if (!regData.ownerName?.trim()) throw new Error('REGISTRATION_MISSING_OWNER_NAME');

    const now = FieldValue.serverTimestamp();

    // Atomic writes across three documents
    tx.update(userRef, {
      status: 'active',
      updatedAt: now,
    });

    tx.update(barberRef, {
      verificationStatus: 'approved',
      listingStatus: 'active',
      onboardingStatus: 'completed',
      verified: true,
      approvedAt: now,
      approvedBy: adminUid,
      acceptingNewBookings: true,
      updatedAt: now,
    });

    tx.update(regRef, {
      verificationStatus: 'approved',
      onboardingStatus: 'completed',
      reviewedAt: now,
      reviewedBy: adminUid,
      rejectionReason: null,
      updatedAt: now,
    });

    return { alreadyApproved: false };
  });
}

// ─── Barber Registration Rejection ───────────────────────────────────────────

export async function rejectBarber(
  barberId: string,
  reason: string,
  adminUid: string,
): Promise<RejectBarberResult> {
  return db.runTransaction(async (tx) => {
    const userRef   = db.collection('users').doc(barberId);
    const barberRef = db.collection('barbers').doc(barberId);
    const regRef    = db.collection('barberRegistrations').doc(barberId);

    const [barberSnap, regSnap] = await Promise.all([
      tx.get(barberRef),
      tx.get(regRef),
    ]);

    // Idempotency: already rejected → idempotent
    if (regSnap.exists && regSnap.data()?.verificationStatus === 'rejected') {
      return { alreadyRejected: true };
    }

    if (!regSnap.exists) throw new Error('REGISTRATION_NOT_FOUND');
    if (regSnap.data()!.verificationStatus !== 'pending') throw new Error('REGISTRATION_NOT_PENDING');

    const now = FieldValue.serverTimestamp();

    tx.update(userRef, {
      status: 'pending_verification',
      updatedAt: now,
    });

    if (barberSnap.exists) {
      tx.update(barberRef, {
        verificationStatus: 'rejected',
        listingStatus: 'inactive',
        onboardingStatus: 'profile_incomplete',
        verified: false,
        acceptingNewBookings: false,
        updatedAt: now,
      });
    }

    tx.update(regRef, {
      verificationStatus: 'rejected',
      reviewedAt: now,
      reviewedBy: adminUid,
      rejectionReason: reason.trim(),
      updatedAt: now,
    });

    return { alreadyRejected: false };
  });
}

// ─── User Status Update (Suspension / Reactivation) ─────────────────────────

export async function updateUserStatus(
  userId: string,
  targetStatus: 'active' | 'suspended',
  reason: string,
  adminUid: string,
): Promise<UpdateUserStatusResult> {
  return db.runTransaction(async (tx) => {
    const userRef   = db.collection('users').doc(userId);
    const userSnap  = await tx.get(userRef);

    if (!userSnap.exists) throw new Error('USER_NOT_FOUND');
    const userData = userSnap.data()!;

    // Idempotency: same status already applied
    if (userData.status === targetStatus) {
      return { idempotent: true };
    }

    const now = FieldValue.serverTimestamp();
    const statusFields = {
      status: targetStatus,
      statusReason: reason.trim() || null,
      statusChangedAt: now,
      statusChangedBy: adminUid,
      updatedAt: now,
    };

    tx.update(userRef, statusFields);

    // For Barber: also update barbers document
    if (userData.role === 'barber') {
      const barberRef  = db.collection('barbers').doc(userId);
      const barberSnap = await tx.get(barberRef);
      if (barberSnap.exists) {
        const barberData = barberSnap.data()!;
        if (targetStatus === 'suspended') {
          tx.update(barberRef, {
            listingStatus: 'suspended',
            acceptingNewBookings: false,
            updatedAt: now,
          });
        } else if (targetStatus === 'active') {
          // Only reactivate listing if verificationStatus is approved
          if (barberData.verificationStatus === 'approved') {
            tx.update(barberRef, {
              listingStatus: 'active',
              acceptingNewBookings: true,
              updatedAt: now,
            });
          }
          // Rejected or pending barbers remain with their current listing status
        }
      }
    }

    return { idempotent: false };
  });
}

// ─── Private Document Signed URL ─────────────────────────────────────────────

const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

export async function generatePrivateDocUrl(
  barberId: string,
  documentType: string,
): Promise<SignedUrlResult> {
  // Always retrieve object path from Firestore — never trust client-supplied paths
  const regSnap = await db.collection('barberRegistrations').doc(barberId).get();
  if (!regSnap.exists) throw new Error('REGISTRATION_NOT_FOUND');

  const regData = regSnap.data()!;
  const documents: Record<string, string> = regData.documents ?? {};
  const storagePath = documents[documentType];

  if (!storagePath || typeof storagePath !== 'string' || !storagePath.trim()) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  // Validate the path is scoped to this barberId
  if (!storagePath.startsWith(`${barberId}/`)) {
    // Log the violation attempt (but do not log the actual path to avoid leakage)
    console.warn(`[SECURITY] Document path scope mismatch for barberId=${barberId}`);
    throw new Error('DOCUMENT_PATH_INVALID');
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(config.supabasePrivateBucket)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error('SIGNED_URL_FAILED');
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_SECONDS * 1000).toISOString();

  return {
    url: data.signedUrl,
    expiresAt,
  };
}

// ─── Barber Registration List ─────────────────────────────────────────────────

export async function listBarberRegistrations(
  verificationStatus?: string,
  limitCount = 50,
): Promise<AdminBarberRegistration[]> {
  let q = db.collection('barberRegistrations')
    .orderBy('submittedAt', 'desc')
    .limit(limitCount);

  if (verificationStatus) {
    q = db.collection('barberRegistrations')
      .where('verificationStatus', '==', verificationStatus)
      .orderBy('submittedAt', 'desc')
      .limit(limitCount) as typeof q;
  }

  const snap = await q.get();
  return snap.docs.map(d => ({
    barberId: d.id,
    ownerName: d.data().ownerName ?? '',
    businessName: d.data().businessName ?? '',
    phoneNumber: d.data().phoneNumber,
    businessAddress: d.data().businessAddress,
    serviceArea: d.data().serviceArea,
    verificationStatus: d.data().verificationStatus,
    onboardingStatus: d.data().onboardingStatus,
    submittedAt: d.data().submittedAt,
    reviewedAt: d.data().reviewedAt,
    reviewedBy: d.data().reviewedBy,
    rejectionReason: d.data().rejectionReason,
    // Omit raw document paths from the list response
  }));
}

// ─── User List ────────────────────────────────────────────────────────────────

export async function listUsers(
  role?: string,
  status?: string,
  limitCount = 50,
): Promise<AdminUserRecord[]> {
  let q = db.collection('users')
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  if (role && status) {
    q = db.collection('users')
      .where('role', '==', role)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limitCount) as typeof q;
  } else if (role) {
    q = db.collection('users')
      .where('role', '==', role)
      .orderBy('createdAt', 'desc')
      .limit(limitCount) as typeof q;
  } else if (status) {
    q = db.collection('users')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limitCount) as typeof q;
  }

  const snap = await q.get();
  return snap.docs.map(d => ({
    uid: d.id,
    email: d.data().email ?? '',
    name: d.data().name ?? d.data().displayName ?? '',
    role: d.data().role,
    status: d.data().status,
    phoneNumber: d.data().phoneNumber,
    createdAt: d.data().createdAt,
  }));
}

// ─── Booking List ─────────────────────────────────────────────────────────────

export async function listBookings(
  status?: string,
  limitCount = 50,
): Promise<AdminBookingRecord[]> {
  let q = db.collection('bookings')
    .orderBy('createdAt', 'desc')
    .limit(limitCount);

  if (status) {
    q = db.collection('bookings')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .limit(limitCount) as typeof q;
  }

  const snap = await q.get();
  return snap.docs.map(d => ({
    id: d.id,
    customerId: d.data().customerId,
    barberId: d.data().barberId,
    status: d.data().status,
    paymentMethod: d.data().paymentMethod,
    paymentStatus: d.data().paymentStatus,
    totalPrice: d.data().totalPrice ?? 0,
    date: d.data().date ?? '',
    startTime: d.data().startTime ?? '',
    createdAt: d.data().createdAt,
  }));
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export async function getDashboardMetrics() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    pendingRegSnap,
    activeCustomerSnap,
    approvedBarberSnap,
    suspendedSnap,
    activeBookingSnap,
    completedBookingSnap,
    cancelledBookingSnap,
    monthlyBookingSnap,
    recentRegSnap,
    recentBookingSnap,
  ] = await Promise.all([
    db.collection('barberRegistrations').where('verificationStatus', '==', 'pending').count().get(),
    db.collection('users').where('role', '==', 'customer').where('status', '==', 'active').count().get(),
    db.collection('barbers').where('verificationStatus', '==', 'approved').where('listingStatus', '==', 'active').count().get(),
    db.collection('users').where('status', '==', 'suspended').count().get(),
    db.collection('bookings').where('status', 'in', ['pending', 'accepted', 'in_progress']).count().get(),
    db.collection('bookings').where('status', '==', 'completed').count().get(),
    db.collection('bookings').where('status', '==', 'cancelled').count().get(),
    db.collection('bookings')
      .where('status', '==', 'completed')
      .where('createdAt', '>=', firstOfMonth)
      .get(),
    db.collection('barberRegistrations').orderBy('submittedAt', 'desc').limit(5).get(),
    db.collection('bookings').orderBy('createdAt', 'desc').limit(5).get(),
  ]);

  // Calculate current-month transaction value from completed bookings
  let monthlyTransactionValue = 0;
  monthlyBookingSnap.docs.forEach(d => {
    monthlyTransactionValue += (d.data().totalPrice ?? 0);
  });

  return {
    pendingRegistrations: pendingRegSnap.data().count,
    activeCustomers: activeCustomerSnap.data().count,
    activeBarbers: approvedBarberSnap.data().count,
    suspendedAccounts: suspendedSnap.data().count,
    activeBookings: activeBookingSnap.data().count,
    completedBookings: completedBookingSnap.data().count,
    cancelledBookings: cancelledBookingSnap.data().count,
    // Label clearly as transaction value, not company revenue
    monthlyTransactionValue,
    recentRegistrations: recentRegSnap.docs.map(d => {
      const ts = d.data().submittedAt as any;
      return {
        barberId: d.id,
        ownerName: d.data().ownerName ?? '',
        businessName: d.data().businessName ?? '',
        verificationStatus: d.data().verificationStatus,
        submittedAt: ts ? { seconds: ts.seconds || ts._seconds, nanoseconds: ts.nanoseconds || ts._nanoseconds || 0 } : null,
      };
    }),
    recentBookings: recentBookingSnap.docs.map(d => {
      const ts = d.data().createdAt as any;
      return {
        id: d.id,
        customerId: d.data().customerId,
        barberId: d.data().barberId,
        status: d.data().status,
        totalPrice: d.data().totalPrice ?? 0,
        date: d.data().date ?? '',
        createdAt: ts ? { seconds: ts.seconds || ts._seconds, nanoseconds: ts.nanoseconds || ts._nanoseconds || 0 } : null,
      };
    }),
  };
}
