/**
 * Admin Service
 * Core business logic for administrative operations.
 * All state mutations use atomic Firestore transactions.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/firebase-admin.js';
import type {
    AdminBarberDetail,
    AdminBarberRegistration,
    AdminBarberSummary,
    AdminBookingRecord,
    AdminCategory,
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
    const totalApprovedBarbers = users.filter(u => u.role === 'barber' && u.status === 'active').length;
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
    const activeBookings = bookings.filter(b => b.status === 'in_progress').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

    // Current month transaction value
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = bookings.filter(b => {
      const bookingDate = b.createdAt?.toDate?.() || new Date(b.createdAt);
      return b.status === 'completed' && bookingDate >= monthStart;
    });

    // Sum transaction value: only paid/cash-eligible bookings
    const currentMonthServiceValue = completedThisMonth.reduce((sum, booking) => {
      // Cash on service: no payment check needed
      if (booking.paymentMethod === 'cash_on_service') {
        return sum + (booking.price || 0);
      }
      // Midtrans: only if paid
      if (booking.paymentMethod === 'midtrans_sandbox' && booking.paymentStatus === 'paid') {
        return sum + (booking.price || 0);
      }
      return sum;
    }, 0);

    // Recent barber registrations (last 5)
    const recentRegSnap = await db
      .collection('barberRegistrations')
      .orderBy('submittedAt', 'desc')
      .limit(5)
      .get();
    const recentBarberRegistrations = recentRegSnap.docs.map(d => ({
      barberId: d.id,
      ...d.data(),
    } as AdminBarberRegistration));

    // Recent bookings (last 5)
    const recentBookingSnap = await db
      .collection('bookings')
      .orderBy('createdAt', 'desc')
      .limit(5)
      .get();
    const recentBookings = recentBookingSnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    } as AdminBookingRecord));

    return {
      totalActiveCustomers,
      totalApprovedBarbers,
      pendingBarberRegistrations,
      suspendedAccounts,
      activeBookings,
      completedBookings,
      cancelledBookings,
      currentMonthServiceValue,
      recentBarberRegistrations,
      recentBookings,
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
    const items = docs.docs.slice(0, normalizedPageSize).map((d: any) => ({
      barberId: d.id,
      ...d.data(),
    } as AdminBarberRegistration));

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
 */
export async function getBarberRegistrationDetail(barberId: string): Promise<AdminBarberRegistration | null> {
  try {
    const regSnap = await db.collection('barberRegistrations').doc(barberId).get();
    if (!regSnap.exists) {
      return null;
    }
    return {
      barberId,
      ...regSnap.data(),
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

    // Validate required fields
    if (!regData.ownerName?.trim()) throw new Error('REGISTRATION_MISSING_OWNER_NAME');
    if (!regData.businessName?.trim()) throw new Error('REGISTRATION_MISSING_BUSINESS_NAME');

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

/**
 * Generate a short-lived signed URL for private verification documents.
 * CRITICAL: Backend validates path from Firestore, never from client.
 */
export async function getSignedDocumentUrl(
  barberId: string,
  documentType: string,
): Promise<SignedUrlResult> {
  try {
    // Load registration to get stored path
    const regSnap = await db.collection('barberRegistrations').doc(barberId).get();
    if (!regSnap.exists) {
      throw new Error('REGISTRATION_NOT_FOUND');
    }

    const regData = regSnap.data()!;
    const storagePath = regData.documents?.[documentType];

    if (!storagePath) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Supabase signed URL would be generated here
    // For now, document the structure:
    // 1. Get Supabase admin client
    // 2. Call supabase.storage.from('private-documents').createSignedUrl(storagePath, 3600)
    // 3. Return signed URL with 1-hour expiration

    // PLACEHOLDER: Real implementation pending Supabase integration
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    return {
      url: `https://placeholder-signed-url-for-${storagePath}`,
      expiresAt,
    };
  } catch (err: any) {
    throw new Error(`Failed to get signed document URL: ${err.message}`);
  }
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
        businessName: barberData.businessName,
        verificationStatus: barberData.verificationStatus || 'pending',
        listingStatus: barberData.listingStatus,
        accountStatus: userData?.status || 'active',
        ratingAverage: barberData.ratingAverage,
        reviewCount: barberData.reviewCount,
        approvedAt: barberData.approvedAt,
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

    return {
      uid: barberId,
      displayName: barberData.displayName || userData.displayName || 'N/A',
      email: userData.email,
      businessName: barberData.businessName,
      businessAddress: barberData.businessAddress,
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
