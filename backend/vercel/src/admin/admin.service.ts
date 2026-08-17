/**
 * Admin Service
 * Core business logic for administrative operations.
 * All state mutations use atomic Firestore transactions.
 */

import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firebase-admin.js';
import { getSupabaseAdminClient } from '../lib/supabase-admin.js';
import { ACTIVE_BOOKING_STATUSES } from './barber-account-management.js';
import type { AdminBookingIdentities } from './admin-booking-dto.js';
import {
  mapAdminBookingDetail,
  mapAdminBookingSummary,
  resolveBookingAmount,
  resolveBookingDate,
  resolveBookingGrossAmount,
  resolveBookingPricingBreakdown,
  resolveBookingStartTime,
} from './admin-booking-dto.js';
import { ALLOWED_DOC_TYPES, assertPathFromFirestore, validateStoragePathNamespace } from './admin.validation.js';
import type {
    AdminBarberDetail,
    AdminBarberRegistration,
    AdminBarberServicePreview,
    AdminBarberSummary,
    AdminBookingRecord,
    AdminCategory,
    AdminSuspendedBarber,
    AdminTransaction,
    AdminUserRecord,
    ApproveBarberResult,
    CategoryCreateRequest,
    CategoryUpdateRequest,
    DashboardMetrics,
    PaginationParams,
    PaginationResult,
    RejectBarberResult,
    SignedUrlResult,
    UpdateUserStatusResult
} from './admin.types.js';

/**
 * Converts a Firestore Timestamp (or already-string legacy value) to an ISO
 * string for the Admin browser. Firestore Timestamp objects serialize to
 * `{ _seconds, _nanoseconds }` over JSON, not a parseable date, so passing
 * one through unconverted silently breaks `new Date(...)` on the frontend.
 */
function toIsoStringSafe(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return undefined;
}

/**
 * Get real platform metrics for admin dashboard.
 * Uses Firestore count and range queries for efficiency.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Query users collection with aggregation
    const allUsersSnap = await db
      .collection('users')
      .where('role', '!=', 'admin')
      .get();
    
    const users = allUsersSnap.docs.map(d => d.data());
    const totalActiveCustomers = users.filter(u => u.role === 'customer' && u.status === 'active').length;
    // All non-deleted barber accounts, any verification/account status -- the
    // Barber Management page's "Total Barber" summary card, distinct from
    // totalApprovedBarbers (active+approved only).
    const totalBarbers = users.filter(u => u.role === 'barber' && u.status !== 'deleted').length;
    const totalApprovedBarbers = users.filter(u => u.role === 'barber' && u.status === 'active').length;
    const suspendedBarbers = users.filter(u => u.role === 'barber' && u.status === 'suspended').length;
    const suspendedAccounts = users.filter(u => u.status === 'suspended').length;

    // Pending barber registrations
    const pendingRegSnap = await db
      .collection('barberRegistrations')
      .where('verificationStatus', '==', 'pending')
      .get();
    const pendingBarberRegistrations = pendingRegSnap.size;

    // Bookings by status
    const bookingSnap = await db.collection('bookings').get();
    const bookings = bookingSnap.docs.map(d => d.data());
    const activeBookings = bookings.filter(b => ['pending', 'accepted', 'in_progress', 'en_route', 'arrived'].includes(b.status)).length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

    // Bookings today
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayBookings = bookings.filter(b => {
      const bDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return b.date === todayStr || bDate >= startOfToday;
    }).length;

    // Current month transaction value
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthBookings = bookings.filter(b => {
      const bookingDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return bookingDate >= monthStart;
    });

    // Sum transaction value: only paid/cash-eligible bookings
    const currentMonthServiceValue = monthBookings.reduce((sum, booking) => {
      const amount = resolveBookingAmount(booking);
      // Cash on service: only completed bookings count as actual revenue
      if (booking.paymentMethod === 'cash_on_service' && booking.status === 'completed') {
        return sum + amount;
      }
      // Midtrans sandbox / payment-first: only if paymentStatus is paid
      if (booking.paymentStatus === 'paid') {
        return sum + amount;
      }
      return sum;
    }, 0);

    // Gross Transaction Value: what customers actually paid (base - voucher +
    // homeFee + appFee + tip), for the same paid/cash-eligible bookings above.
    // Deliberately NOT called "revenue" -- see platformApplicationFees below
    // for the platform's actual monetization metric.
    const grossTransactionValue = monthBookings.reduce((sum, booking) => {
      const isPaidEligible =
        (booking.paymentMethod === 'cash_on_service' && booking.status === 'completed') ||
        booking.paymentStatus === 'paid';
      return isPaidEligible ? sum + resolveBookingGrossAmount(booking) : sum;
    }, 0);

    // Platform Application Fees: the platform's only current monetization
    // mechanism. Summed only from bookings that actually reached paymentStatus
    // === 'paid' -- applicationFee on a pending/failed booking was never collected.
    const platformApplicationFees = monthBookings.reduce((sum, booking) => {
      if (booking.paymentStatus !== 'paid') return sum;
      return sum + (typeof booking.applicationFee === 'number' ? booking.applicationFee : 0);
    }, 0);

    const activeVouchersSnap = await db.collection('vouchers').where('status', '==', 'active').get();
    const activeVouchersCount = activeVouchersSnap.size;

    // Recent barber registrations (last 5)
    const recentRegSnap = await db
      .collection('barberRegistrations')
      .orderBy('submittedAt', 'desc')
      .limit(5)
      .get();

    const recentBarberRegistrations = recentRegSnap.docs.map(d => {
      const { documentPaths, ...safeData } = d.data();
      return {
        barberId: d.id,
        ...safeData,
        submittedAt: toIsoStringSafe(safeData.submittedAt) || safeData.submittedAt,
      } as AdminBarberRegistration;
    });

    // Recent bookings (last 5)
    const recentBookingSnap = await db
      .collection('bookings')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();

    const rawRecentBookings: (Record<string, any> & { __bookingId: string })[] = recentBookingSnap.docs.map(d => ({
      ...d.data(),
      __bookingId: d.id,
    }));

    const identities = await resolveBookingIdentities(rawRecentBookings);

    const recentBookings = rawRecentBookings.map(data => {
      const identity = identities.get(data.__bookingId);
      return {
        bookingId: data.__bookingId,
        customerId: data.customerId,
        barberId: data.barberId,
        serviceId: data.serviceId,
        customerName: identity?.customerName || 'Pelanggan',
        barberName: identity?.barberName || 'Barber',
        status: data.status,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        price: resolveBookingAmount(data),
        date: resolveBookingDate(data),
        startTime: resolveBookingStartTime(data),
        createdAt: toIsoStringSafe(data.createdAt) || data.createdAt,
      };
    });

    // Suspended barbers list (last 5)
    const suspendedUserDocs = allUsersSnap.docs
      .filter(d => d.data().role === 'barber' && d.data().status === 'suspended')
      .slice(0, 5);

    const suspendedBarbersList: AdminSuspendedBarber[] = await Promise.all(
      suspendedUserDocs.map(async d => {
        const uData = d.data();
        const bSnap = await db.collection('barbers').doc(d.id).get();
        const bData = bSnap.exists ? bSnap.data() : {};
        return {
          uid: d.id,
          displayName: uData.displayName || bData?.displayName || 'N/A',
          // shopName is the field the barber's own Profile tab actually
          // writes (profile.tsx handleSaveProfile) -- businessName/
          // businessAddress are never written anywhere in this codebase and
          // were always undefined here; kept as a defensive fallback only.
          businessName: bData?.shopName || bData?.businessName || uData.businessName || '-',
          email: uData.email || '',
          status: uData.status,
          statusReason: uData.statusReason || '',
          statusChangedAt: toIsoStringSafe(uData.statusChangedAt),
        };
      })
    );

    // Recent transactions list (last 5)
    const transactionsResult = await getTransactionsList({}, { pageSize: 5 });
    const recentTransactions = transactionsResult.items;

    return {
      totalActiveCustomers,
      totalBarbers,
      totalApprovedBarbers,
      pendingBarberRegistrations,
      suspendedAccounts,
      suspendedBarbers,
      activeBookings,
      completedBookings,
      cancelledBookings,
      todayBookings,
      currentMonthServiceValue,
      grossTransactionValue,
      platformApplicationFees,
      activeVouchersCount,
      recentBarberRegistrations,
      recentBookings,
      suspendedBarbersList,
      recentTransactions,
    };
  } catch (err: any) {
    throw new Error(`Failed to get dashboard metrics: ${err.message}`);
  }
}

// ============================================================================
// Barber Registration Management
// ============================================================================

/**
 * Get paginated list of barber registrations with optional filtering.
 */
export async function getBarberRegistrations(
  filter: 'all' | 'pending' | 'approved' | 'rejected' = 'all',
  params: PaginationParams = {},
): Promise<PaginationResult<AdminBarberRegistration>> {
  const pageSize = params.pageSize || 20;
  const maxPageSize = 100;
  const normalizedPageSize = Math.min(pageSize, maxPageSize);

  try {
    let collRef = db.collection('barberRegistrations');

    // Build query step by step
    let queryRef: any = collRef;

    // Apply filter
    if (filter !== 'all') {
      queryRef = queryRef.where('verificationStatus', '==', filter);
    }

    // Order by submission date
    queryRef = queryRef.orderBy('submittedAt', 'desc');

    // Apply pagination
    if (params.startAfter) {
      const startDoc = await collRef.doc(params.startAfter).get();
      if (startDoc.exists) {
        queryRef = queryRef.startAfter(startDoc);
      }
    }

    // Fetch one extra to determine hasMore
    const docs = await queryRef.limit(normalizedPageSize + 1).get();
    // Batch 09F-3 (P2_ADMIN_RAW_DOCUMENT_PATHS): strip raw documentPaths -- the list
    // UI (apps/admin barber-verification table) only reads
    // businessName/ownerName/phoneNumber/verificationStatus/submittedAt, never
    // document info, so it is simply omitted here rather than replaced with a
    // documentsAvailable map it doesn't use. getBarberRegistrationDetail already
    // exposes documentsAvailable for the one screen that does need it.
    const items = docs.docs.slice(0, normalizedPageSize).map((d: any) => {
      const { documentPaths, ...safeData } = d.data();
      return {
        barberId: d.id,
        ...safeData,
      } as AdminBarberRegistration;
    });

    const nextPageStartAfter = docs.docs.length > normalizedPageSize ? docs.docs[normalizedPageSize - 1].id : undefined;

    return {
      items,
      nextPageStartAfter,
      hasMore: docs.docs.length > normalizedPageSize,
    };
  } catch (err: any) {
    throw new Error(`Failed to get barber registrations: ${err.message}`);
  }
}

/**
 * Get detailed barber registration record.
 * Batch 09D-2B: raw documentPaths (storage paths) are stripped before returning to
 * the Admin browser -- only a per-type presence boolean is exposed. The browser
 * requests a signed URL (barberId + documentType only) when it actually needs to
 * view a document; the path is resolved authoritatively server-side again there.
 */
export async function getBarberRegistrationDetail(barberId: string): Promise<AdminBarberRegistration | null> {
  try {
    const regSnap = await db.collection('barberRegistrations').doc(barberId).get();
    if (!regSnap.exists) {
      return null;
    }

    const { documentPaths, ...safeData } = regSnap.data()!;
    const documentsAvailable = {} as Record<string, boolean>;
    for (const docType of ALLOWED_DOC_TYPES) {
      documentsAvailable[docType] = Boolean(documentPaths?.[docType]);
    }

    const [userSnap, servicesSnap, gallerySnap] = await Promise.all([
      db.collection('users').doc(barberId).get(),
      db.collection('barberServices').where('barberId', '==', barberId).get(),
      db.collection('barberGallery').where('barberId', '==', barberId).get(),
    ]);

    const services: AdminBarberServicePreview[] = servicesSnap.docs.map((d) => {
      const s = d.data();
      return {
        serviceId: d.id,
        name: s.name || 'Layanan',
        price: typeof s.price === 'number' ? s.price : 0,
        durationMinutes: s.durationMinutes,
        isActive: s.isActive !== false,
      };
    });

    const galleryImageUrls = gallerySnap.docs
      .map((d) => d.data().publicUrl)
      .filter((url): url is string => typeof url === 'string')
      .slice(0, 8);

    return {
      barberId,
      ...safeData,
      email: userSnap.data()?.email,
      documentsAvailable,
      services,
      galleryImageUrls,
      galleryCount: gallerySnap.size,
    } as AdminBarberRegistration;
  } catch (err: any) {
    throw new Error(`Failed to get registration detail: ${err.message}`);
  }
}

/**
 * Approve a barber registration.
 * Idempotent: safe to call multiple times.
 */
export async function approveBarber(barberId: string, adminUid: string): Promise<ApproveBarberResult> {
  return db.runTransaction(async tx => {
    const userRef = db.collection('users').doc(barberId);
    const barberRef = db.collection('barbers').doc(barberId);
    const regRef = db.collection('barberRegistrations').doc(barberId);

    const [userSnap, barberSnap, regSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(barberRef),
      tx.get(regRef),
    ]);

    // Idempotency: already approved
    if (barberSnap.exists && barberSnap.data()?.verificationStatus === 'approved') {
      return { alreadyApproved: true };
    }

    // Validation
    if (!userSnap.exists) throw new Error('USER_NOT_FOUND');
    const userData = userSnap.data()!;
    if (userData.role !== 'barber') throw new Error('USER_NOT_BARBER');
    if (userData.status !== 'pending_verification') throw new Error('USER_NOT_PENDING');

    if (!regSnap.exists) throw new Error('REGISTRATION_NOT_FOUND');
    const regData = regSnap.data()!;
    if (regData.verificationStatus !== 'pending') throw new Error('REGISTRATION_NOT_PENDING');

    // Validate required fields. barberRegistrations docs are written with
    // `shopName` (barber-registration.service.ts saveProfileDraft), never
    // `businessName` -- that field is never written anywhere in this
    // codebase, so this check unconditionally threw for every real
    // registration, making barber approval completely non-functional.
    if (!regData.ownerName?.trim()) throw new Error('REGISTRATION_MISSING_OWNER_NAME');
    if (!regData.shopName?.trim() && !regData.businessName?.trim()) throw new Error('REGISTRATION_MISSING_BUSINESS_NAME');

    const now = FieldValue.serverTimestamp();

    // Atomic update
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

/**
 * Reject a barber registration with reason.
 * Idempotent: safe to call multiple times.
 */
export async function rejectBarber(
  barberId: string,
  reason: string,
  adminUid: string,
): Promise<RejectBarberResult> {
  return db.runTransaction(async tx => {
    const userRef = db.collection('users').doc(barberId);
    const barberRef = db.collection('barbers').doc(barberId);
    const regRef = db.collection('barberRegistrations').doc(barberId);

    const [userSnap, barberSnap, regSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(barberRef),
      tx.get(regRef),
    ]);

    // Idempotency: already rejected
    if (regSnap.exists && regSnap.data()?.verificationStatus === 'rejected') {
      return { alreadyRejected: true };
    }

    if (!regSnap.exists) throw new Error('REGISTRATION_NOT_FOUND');
    if (regSnap.data()!.verificationStatus !== 'pending') throw new Error('REGISTRATION_NOT_PENDING');

    const now = FieldValue.serverTimestamp();

    // Update user to remain in pending_verification state
    tx.update(userRef, {
      status: 'pending_verification',
      updatedAt: now,
    });

    // Update barber profile
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

    // Record rejection
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

// ============================================================================
// User Management
// ============================================================================

/**
 * Get paginated list of users with optional role filtering.
 */
export async function getUsers(
  roleFilter?: 'all' | 'customer' | 'barber',
  params: PaginationParams = {},
): Promise<PaginationResult<AdminUserRecord>> {
  const pageSize = params.pageSize || 20;
  const maxPageSize = 100;
  const normalizedPageSize = Math.min(pageSize, maxPageSize);

  try {
    const collRef = db.collection('users');
    let queryRef: any = collRef.where('role', '!=', 'admin');

    if (roleFilter && roleFilter !== 'all') {
      queryRef = queryRef.where('role', '==', roleFilter);
    }

    queryRef = queryRef.orderBy('role').orderBy('createdAt', 'desc');

    if (params.startAfter) {
      const startDoc = await collRef.doc(params.startAfter).get();
      if (startDoc.exists) {
        queryRef = queryRef.startAfter(startDoc);
      }
    }

    const docs = await queryRef.limit(normalizedPageSize + 1).get();
    const items = docs.docs.slice(0, normalizedPageSize).map((d: any) => ({
      uid: d.id,
      ...d.data(),
    } as AdminUserRecord));

    const nextPageStartAfter = docs.docs.length > normalizedPageSize ? docs.docs[normalizedPageSize - 1].id : undefined;

    return {
      items,
      nextPageStartAfter,
      hasMore: docs.docs.length > normalizedPageSize,
    };
  } catch (err: any) {
    throw new Error(`Failed to get users: ${err.message}`);
  }
}

/**
 * Update user account status (active/suspended).
 * Idempotent: safe to call multiple times.
 * Prevents self-suspension.
 */
export async function updateUserStatus(
  userId: string,
  targetStatus: 'active' | 'suspended',
  reason: string,
  adminUid: string,
): Promise<UpdateUserStatusResult> {
  // Prevent self-suspension
  if (userId === adminUid && targetStatus === 'suspended') {
    throw new Error('ADMIN_CANNOT_SELF_SUSPEND');
  }

  return db.runTransaction(async tx => {
    const userRef = db.collection('users').doc(userId);
    const userSnap = await tx.get(userRef);

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
      const barberRef = db.collection('barbers').doc(userId);
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
          // Only reactivate if verified/approved
          if (barberData.verificationStatus === 'approved') {
            tx.update(barberRef, {
              listingStatus: 'active',
              acceptingNewBookings: true,
              updatedAt: now,
            });
          }
        }
      }
    }

    return { idempotent: false };
  });
}

// ============================================================================
// Private Document Access
// ============================================================================

// Short-lived expiry for Admin document viewing (10 minutes). Deliberately much
// shorter than the mobile app's generic STORAGE_CONFIG.DEFAULT_SIGNED_URL_EXPIRES_IN
// (3600s in src/features/services/storage.config.ts), which serves a different,
// unrelated call site -- Admin document review only needs a viewing window.
const ADMIN_DOCUMENT_SIGNED_URL_TTL_SECONDS = 600;

/**
 * Generate a short-lived signed URL for private verification documents.
 * CRITICAL: Backend validates path from Firestore, never from client -- the caller
 * supplies only barberId + documentType; the storage path is always resolved
 * authoritatively server-side from barberRegistrations/{barberId}.documentPaths.
 */
export async function getSignedDocumentUrl(
  barberId: string,
  documentType: string,
): Promise<SignedUrlResult> {
  // Defense in depth: the route layer also validates this, but the service must be
  // safe to call directly (e.g. from tests or future callers).
  if (!ALLOWED_DOC_TYPES.has(documentType)) {
    throw new Error('INVALID_DOCUMENT_TYPE');
  }

  const regSnap = await db.collection('barberRegistrations').doc(barberId).get();
  if (!regSnap.exists) {
    throw new Error('REGISTRATION_NOT_FOUND');
  }

  const regData = regSnap.data()!;
  const storagePath = regData.documentPaths?.[documentType];

  if (!assertPathFromFirestore(storagePath)) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  // Firestore data is not trusted blindly even though it's server-side: reject a
  // path that doesn't resolve inside this barber's own storage namespace, and
  // reject malformed/traversal-like paths.
  if (!validateStoragePathNamespace(storagePath, barberId)) {
    throw new Error('DOCUMENT_PATH_INVALID');
  }

  let supabase;
  try {
    supabase = getSupabaseAdminClient();
  } catch {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const { data, error } = await supabase.storage
    .from('private-documents')
    .createSignedUrl(storagePath, ADMIN_DOCUMENT_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    // Sanitized: never surface the raw Supabase error (may contain internal detail).
    throw new Error('SIGNED_URL_FAILED');
  }

  const expiresAt = new Date(Date.now() + ADMIN_DOCUMENT_SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  return {
    url: data.signedUrl,
    expiresAt,
  };
}

// ============================================================================
// Barber Management (Phase 2)
// ============================================================================

/**
 * Get list of barbers with filtering and pagination.
 */
export async function getBarberList(
  filter?: 'all' | 'active' | 'suspended' | 'approved' | 'pending' | 'rejected',
  params: PaginationParams = {},
): Promise<PaginationResult<AdminBarberSummary>> {
  const pageSize = params.pageSize || 20;
  const maxPageSize = 100;
  const normalizedPageSize = Math.min(pageSize, maxPageSize);

  try {
    const collRef = db.collection('barbers');
    let queryRef: any = collRef;

    // Apply filter based on verification or listing status
    if (filter && filter !== 'all') {
      if (['active', 'suspended', 'pending', 'rejected', 'approved'].includes(filter)) {
        // For verification status filters
        if (['pending', 'rejected', 'approved'].includes(filter)) {
          queryRef = queryRef.where('verificationStatus', '==', filter);
        } else {
          // For listing status filters
          queryRef = queryRef.where('listingStatus', '==', filter);
        }
      }
    }

    queryRef = queryRef.orderBy('createdAt', 'desc');

    if (params.startAfter) {
      const startDoc = await collRef.doc(params.startAfter).get();
      if (startDoc.exists) {
        queryRef = queryRef.startAfter(startDoc);
      }
    }

    const docs = await queryRef.limit(normalizedPageSize + 1).get();
    
    const items: AdminBarberSummary[] = [];
    for (const doc of docs.docs.slice(0, normalizedPageSize)) {
      const barberData = doc.data();
      
      // Load user status
      const userSnap = await db.collection('users').doc(doc.id).get();
      const userData = userSnap.data();

      items.push({
        uid: doc.id,
        displayName: barberData.displayName || userData?.displayName || 'N/A',
        businessName: barberData.shopName || barberData.businessName,
        email: userData?.email,
        phoneNumber: userData?.phoneNumber || barberData.phoneNumber || barberData.phone,
        verificationStatus: barberData.verificationStatus || 'pending',
        listingStatus: barberData.listingStatus,
        accountStatus: userData?.status || 'active',
        ratingAverage: barberData.ratingAverage,
        reviewCount: barberData.reviewCount,
        approvedAt: barberData.approvedAt,
        createdAt: barberData.createdAt || userData?.createdAt,
      });
    }

    const nextPageStartAfter = docs.docs.length > normalizedPageSize ? docs.docs[normalizedPageSize - 1].id : undefined;

    return {
      items,
      nextPageStartAfter,
      hasMore: docs.docs.length > normalizedPageSize,
    };
  } catch (err: any) {
    throw new Error(`Failed to get barber list: ${err.message}`);
  }
}

/**
 * Get detailed barber information including operational status.
 */
export async function getBarberDetail(barberId: string): Promise<AdminBarberDetail | null> {
  try {
    const barberSnap = await db.collection('barbers').doc(barberId).get();
    if (!barberSnap.exists) {
      return null;
    }

    const barberData = barberSnap.data()!;
    const userSnap = await db.collection('users').doc(barberId).get();
    const userData = userSnap.data() || {};

    // Preview counts for the delete-confirmation UI (Admin sees these BEFORE
    // confirming deletion, matching what deleteBarber will actually cancel).
    const activeBookingsSnap = await db
      .collection('bookings')
      .where('barberId', '==', barberId)
      .where('status', 'in', ACTIVE_BOOKING_STATUSES)
      .get();
    const activeBookingsCount = activeBookingsSnap.size;
    const paidActiveBookingsCount = activeBookingsSnap.docs.filter(
      (d) => d.data().paymentStatus === 'paid'
    ).length;

    return {
      uid: barberId,
      displayName: barberData.displayName || userData.displayName || 'N/A',
      email: userData.email,
      businessName: barberData.shopName || barberData.businessName,
      businessAddress: barberData.shopAddress || barberData.businessAddress,
      serviceArea: barberData.serviceArea,
      phoneNumber: userData.phoneNumber,
      verificationStatus: barberData.verificationStatus || 'pending',
      listingStatus: barberData.listingStatus,
      accountStatus: userData.status || 'active',
      ratingAverage: barberData.ratingAverage,
      reviewCount: barberData.reviewCount,
      acceptingNewBookings: barberData.acceptingNewBookings,
      approvedAt: barberData.approvedAt,
      createdAt: barberData.createdAt,
      updatedAt: barberData.updatedAt,
      activeBookingsCount,
      paidActiveBookingsCount,
    };
  } catch (err: any) {
    throw new Error(`Failed to get barber detail: ${err.message}`);
  }
}

// ============================================================================
// Category Management (Phase 2)
// ============================================================================

/**
 * Get list of all categories.
 */
export async function getCategoriesList(): Promise<AdminCategory[]> {
  try {
    const snap = await db.collection('categories').orderBy('order', 'asc').get();
    return snap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      description: d.data().description,
      icon: d.data().icon,
      active: d.data().active,
      order: d.data().order,
      createdAt: d.data().createdAt,
      updatedAt: d.data().updatedAt,
    }));
  } catch (err: any) {
    throw new Error(`Failed to get categories: ${err.message}`);
  }
}

/**
 * Create a new category.
 */
export async function createCategory(
  req: CategoryCreateRequest,
  adminUid: string,
): Promise<AdminCategory> {
  try {
    // Generate normalized name for duplicate check
    const normalizedName = req.name.toLowerCase().trim();
    
    // Check for existing category with same normalized name
    const existingSnap = await db
      .collection('categories')
      .where('name_normalized', '==', normalizedName)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      throw new Error('CATEGORY_ALREADY_EXISTS');
    }

    // Get max order
    const maxOrderSnap = await db
      .collection('categories')
      .orderBy('order', 'desc')
      .limit(1)
      .get();

    const maxOrder = maxOrderSnap.docs.length > 0 ? (maxOrderSnap.docs[0].data().order || 0) + 1 : 0;

    const now = new Date();
    const newCategory: any = {
      name: req.name.trim(),
      name_normalized: normalizedName,
      description: req.description || '',
      icon: req.icon,
      active: req.active !== false,
      order: req.order !== undefined ? req.order : maxOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUid,
    };

    const docRef = await db.collection('categories').add(newCategory);
    newCategory.id = docRef.id;

    return newCategory;
  } catch (err: any) {
    throw new Error(`Failed to create category: ${err.message}`);
  }
}

/**
 * Update an existing category.
 */
export async function updateCategory(
  categoryId: string,
  req: CategoryUpdateRequest,
  adminUid: string,
): Promise<AdminCategory> {
  try {
    const categorySnap = await db.collection('categories').doc(categoryId).get();
    if (!categorySnap.exists) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    const currentData = categorySnap.data()!;
    const updateData: any = { updatedAt: new Date(), updatedBy: adminUid };

    if (req.name !== undefined) {
      const normalizedName = req.name.toLowerCase().trim();
      updateData.name = req.name.trim();
      updateData.name_normalized = normalizedName;

      // Check for duplicate (exclude current)
      const existingSnap = await db
        .collection('categories')
        .where('name_normalized', '==', normalizedName)
        .get();

      if (existingSnap.docs.some((d) => d.id !== categoryId)) {
        throw new Error('CATEGORY_ALREADY_EXISTS');
      }
    }

    if (req.description !== undefined) updateData.description = req.description || '';
    if (req.icon !== undefined) updateData.icon = req.icon;
    if (req.active !== undefined) updateData.active = req.active;
    if (req.order !== undefined) {
      if (!Number.isInteger(req.order)) {
        throw new Error('INVALID_ORDER');
      }
      updateData.order = req.order;
    }

    await db.collection('categories').doc(categoryId).update(updateData);

    return {
      id: categoryId,
      ...currentData,
      ...updateData,
    } as AdminCategory;
  } catch (err: any) {
    throw new Error(`Failed to update category: ${err.message}`);
  }
}

/**
 * Deactivate a category (soft delete, preserve references).
 */
export async function deactivateCategory(categoryId: string, adminUid: string): Promise<void> {
  try {
    const categorySnap = await db.collection('categories').doc(categoryId).get();
    if (!categorySnap.exists) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    await db.collection('categories').doc(categoryId).update({
      active: false,
      updatedAt: new Date(),
      updatedBy: adminUid,
    });
  } catch (err: any) {
    throw new Error(`Failed to deactivate category: ${err.message}`);
  }
}

// ============================================================================
// Phase 3: Booking Monitoring
// ============================================================================

export interface BookingMonitoringFilters {
  status?: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  paymentMethod?: 'cash_on_service' | 'midtrans_sandbox';
  paymentStatus?: string;
  pageSize?: number;
  startAfter?: string;
}

/**
 * Batch-resolves customer/barber/service display identity for a set of raw
 * booking documents, one deduplicated read per unique id rather than one
 * read per booking row -- bounded by the page size, not a per-row N+1.
 * See admin-booking-dto.ts for why this exists instead of denormalizing
 * names onto every future booking.
 */
async function resolveBookingIdentities(
  bookings: Record<string, any>[]
): Promise<Map<string, AdminBookingIdentities>> {
  const customerIds = Array.from(new Set(bookings.map((b) => b.customerId).filter(Boolean)));
  const barberIds = Array.from(new Set(bookings.map((b) => b.barberId).filter(Boolean)));
  const serviceIds = Array.from(new Set(bookings.map((b) => b.serviceId).filter(Boolean)));

  const [customerUserSnaps, barberDocSnaps, barberUserSnaps, serviceSnaps] = await Promise.all([
    Promise.all(customerIds.map((id) => db.collection('users').doc(id).get().catch(() => null))),
    Promise.all(barberIds.map((id) => db.collection('barbers').doc(id).get().catch(() => null))),
    Promise.all(barberIds.map((id) => db.collection('users').doc(id).get().catch(() => null))),
    Promise.all(serviceIds.map((id) => db.collection('barberServices').doc(id).get().catch(() => null))),
  ]);

  const customerMap = new Map<string, { displayName?: string; email?: string; phoneNumber?: string }>();
  customerIds.forEach((id, i) => {
    const d = customerUserSnaps[i]?.exists ? customerUserSnaps[i]!.data() : undefined;
    if (d) customerMap.set(id, d);
  });

  const barberMap = new Map<string, { displayName?: string; businessName?: string; email?: string; phoneNumber?: string }>();
  barberIds.forEach((id, i) => {
    const barberDoc = barberDocSnaps[i]?.exists ? barberDocSnaps[i]!.data() : undefined;
    const userDoc = barberUserSnaps[i]?.exists ? barberUserSnaps[i]!.data() : undefined;
    if (barberDoc || userDoc) {
      barberMap.set(id, {
        displayName: barberDoc?.displayName || barberDoc?.businessName || userDoc?.displayName,
        email: userDoc?.email,
        phoneNumber: userDoc?.phoneNumber,
      });
    }
  });

  const serviceMap = new Map<string, string>();
  serviceIds.forEach((id, i) => {
    const d = serviceSnaps[i]?.exists ? serviceSnaps[i]!.data() : undefined;
    if (d?.name) serviceMap.set(id, d.name);
  });

  const result = new Map<string, AdminBookingIdentities>();
  for (const booking of bookings) {
    const customer = booking.customerId ? customerMap.get(booking.customerId) : undefined;
    const barber = booking.barberId ? barberMap.get(booking.barberId) : undefined;
    result.set(booking.__bookingId, {
      customerName: customer?.displayName,
      customerEmail: customer?.email,
      customerPhone: customer?.phoneNumber,
      barberName: barber?.displayName,
      barberEmail: barber?.email,
      barberPhone: barber?.phoneNumber,
      serviceName: booking.serviceId ? serviceMap.get(booking.serviceId) : undefined,
    });
  }
  return result;
}

/**
 * Get list of bookings with admin-safe fields and filtering.
 * Supports pagination, status filter, date range, payment filters.
 * No location tracking history exposed.
 */
export async function getBookingsList(
  filters: BookingMonitoringFilters = {},
  params: PaginationParams = {}
): Promise<PaginationResult<any>> {
  try {
    const pageSize = Math.min(params.pageSize || 20, 100);
    let query: any = db.collection('bookings').orderBy('createdAt', 'desc');

    // Apply filters
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.paymentMethod) {
      query = query.where('paymentMethod', '==', filters.paymentMethod);
    }
    if (filters.paymentStatus) {
      query = query.where('paymentStatus', '==', filters.paymentStatus);
    }

    // Date range filtering (basic - Firestore limitation)
    if (filters.dateFrom) {
      query = query.where('date', '>=', filters.dateFrom);
    }
    if (filters.dateTo) {
      query = query.where('date', '<=', filters.dateTo);
    }

    // Pagination
    if (params.startAfter) {
      const startDoc = await db.collection('bookings').doc(params.startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    query = query.limit(pageSize + 1);

    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, pageSize);
    const hasMore = snapshot.docs.length > pageSize;

    const rawBookings: (Record<string, any> & { __bookingId: string })[] = docs.map(
      (doc: DocumentSnapshot) => ({ ...doc.data(), __bookingId: doc.id })
    );
    const identities = await resolveBookingIdentities(rawBookings);

    const items = rawBookings.map((data) =>
      mapAdminBookingSummary(data.__bookingId, data, identities.get(data.__bookingId) || {})
    );

    return {
      items,
      nextPageStartAfter: hasMore ? docs[docs.length - 1]?.id : undefined,
      hasMore,
    };
  } catch (err: any) {
    throw new Error(`Failed to get bookings list: ${err.message}`);
  }
}

/**
 * Get booking detail with safe operational fields.
 * Does NOT expose snapToken, server keys, or tracking history.
 */
export async function getBookingDetail(bookingId: string): Promise<any | null> {
  try {
    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) {
      return null;
    }

    const data = bookingSnap.data()!;
    const identities = await resolveBookingIdentities([{ ...data, __bookingId: bookingSnap.id }]);

    return {
      ...mapAdminBookingDetail(bookingSnap.id, data, identities.get(bookingSnap.id) || {}),
      // SECURITY: Do NOT expose:
      // - latitude, longitude (location tracking)
      // - snapToken (payment gateway)
      // - bookingTracking array (location history)
    };
  } catch (err: any) {
    throw new Error(`Failed to get booking detail: ${err.message}`);
  }
}

// ============================================================================
// Phase 3: Transaction Monitoring
// ============================================================================

export interface TransactionMonitoringFilters {
  provider?: 'cash_on_service' | 'midtrans_sandbox';
  status?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  pageSize?: number;
  startAfter?: string;
}

/**
 * Get list of transactions (cash + Midtrans Sandbox).
 * Safe transaction fields only.
 * Does NOT expose snapToken, server keys, or raw webhook payloads.
 */
export async function getTransactionsList(
  filters: TransactionMonitoringFilters = {},
  params: PaginationParams = {}
): Promise<PaginationResult<AdminTransaction>> {
  try {
    const pageSize = Math.min(params.pageSize || 20, 100);

    // For cash_on_service, read from bookings with paymentMethod='cash_on_service'
    // For midtrans_sandbox, read from payments collection

    const items: (Omit<AdminTransaction, 'createdAt' | 'paidAt'> & { createdAt?: any; paidAt?: any })[] = [];

    // Get cash transactions. Only paymentMethod + orderBy(createdAt) is applied
    // at the Firestore level -- that pair has a composite index
    // (bookings: paymentMethod ASC, createdAt DESC). Status is intentionally
    // filtered in-memory below rather than added as a second .where() here,
    // since every additional provider+status combination would otherwise need
    // its own dedicated composite index.
    if (!filters.provider || filters.provider === 'cash_on_service') {
      const cashDocs = await db.collection('bookings')
        .where('paymentMethod', '==', 'cash_on_service')
        .orderBy('createdAt', 'desc')
        .limit(pageSize)
        .get();
      items.push(
        ...cashDocs.docs.map((doc: DocumentSnapshot) => {
          const data = doc.data();
          return {
            transactionId: `cash-${doc.id}`,
            bookingId: doc.id,
            provider: 'cash_on_service' as const,
            environment: 'cash' as const,
            status: 'not_required',
            createdAt: data?.createdAt,
            paidAt: undefined,
            grossAmount: data ? resolveBookingGrossAmount(data) : 0,
            ...(data ? resolveBookingPricingBreakdown(data) : {}),
          };
        })
      );
    }

    // Get Midtrans Sandbox transactions. Same reasoning as above: only
    // environment + orderBy(createdAt) is applied at the Firestore level
    // (payments: environment ASC, createdAt DESC).
    if (!filters.provider || filters.provider === 'midtrans_sandbox') {
      const midtransDocs = await db.collection('payments')
        .where('environment', '==', 'sandbox')
        .orderBy('createdAt', 'desc')
        .limit(pageSize)
        .get();
      items.push(
        ...midtransDocs.docs.map((doc: DocumentSnapshot) => {
          const data = doc.data();
          return {
            transactionId: data?.transactionId || doc.id,
            bookingId: data?.bookingId,
            provider: 'midtrans_sandbox' as const,
            environment: 'sandbox' as const,
            orderId: data?.orderId,
            grossAmount: data?.grossAmount || 0,
            status: data?.status,
            paymentType: data?.paymentType,
            createdAt: data?.createdAt,
            paidAt: data?.paidAt,
            ...(data ? resolveBookingPricingBreakdown(data) : {}),
            // SECURITY: Do NOT expose:
            // - snapToken
            // - server key
            // - full raw payload
          };
        })
      );
    }

    // Sort combined results by createdAt desc (raw Firestore Timestamps support toMillis()).
    items.sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });

    // Status is applied here, across both providers, rather than as a Firestore
    // filter (see above). This is a page-local filter -- because it runs after
    // each provider query is already capped at `pageSize`, a heavily-filtered
    // status may return fewer than pageSize items even when more matching
    // records exist further back in either collection. Acceptable for an
    // admin monitoring view; never a 500.
    const filtered = filters.status
      ? items.filter((item) => item.status === filters.status)
      : items;

    const hasMore = filtered.length > pageSize;
    const paginatedItems: AdminTransaction[] = filtered.slice(0, pageSize).map((item) => ({
      ...item,
      createdAt: toIsoStringSafe(item.createdAt),
      paidAt: item.paidAt ? toIsoStringSafe(item.paidAt) : undefined,
    }));

    return {
      items: paginatedItems,
      nextPageStartAfter: hasMore ? paginatedItems[paginatedItems.length - 1]?.transactionId : undefined,
      hasMore,
    };
  } catch (err: any) {
    throw new Error(`Failed to get transactions list: ${err.message}`);
  }
}
