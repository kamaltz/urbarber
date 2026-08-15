/**
 * Consolidated Admin API Router
 *
 * Routes all admin-specific endpoints through a single Vercel Serverless Function.
 * Uses lightweight typed routing without Express or similar frameworks.
 *
 * Routes (Phase 1):
 * - GET /api/admin/me
 * - GET /api/admin/dashboard
 * - GET /api/admin/barber-registrations
 * - GET /api/admin/barber-registrations/:barberId
 * - POST /api/admin/barber-registrations/:barberId/approve
 * - POST /api/admin/barber-registrations/:barberId/reject
 * - POST /api/admin/barber-registrations/document-url
 * - GET /api/admin/users
 * - GET /api/admin/users/:userId
 * - POST /api/admin/users/:userId/status
 *
 * Routes (Phase 2):
 * - GET /api/admin/barbers
 * - GET /api/admin/barbers/:barberId
 * - POST /api/admin/barbers/:barberId/suspend
 * - GET /api/admin/categories
 * - POST /api/admin/categories
 * - PATCH /api/admin/categories/:categoryId
 *
 * Routes (Phase 3):
 * - GET /api/admin/bookings
 * - GET /api/admin/bookings/:bookingId
 * - GET /api/admin/transactions
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAdmin } from '../src/admin/admin-auth.js';
import {
    approveBarber,
    createCategory,
    deactivateCategory,
    getBarberDetail,
    getBarberList,
    getBarberRegistrationDetail,
    getBarberRegistrations,
    getBookingDetail,
    getBookingsList,
    getCategoriesList,
    getDashboardMetrics,
    getSignedDocumentUrl,
    getTransactionsList,
    getUsers,
    rejectBarber,
    updateCategory,
    updateUserStatus
} from '../src/admin/admin.service.js';
import {
    validateCategoryName,
    validateDocumentType,
    validatePageSize,
    validateRejectionReason,
    validateTargetStatus,
} from '../src/admin/admin.validation.js';
import { handleCors } from '../src/lib/cors.js';
import { db } from '../src/lib/firebase-admin.js';

interface RouteContext {
  req: VercelRequest;
  res: VercelResponse;
  method: string;
  pathname: string;
}

type RouteHandler = (ctx: RouteContext) => Promise<void>;

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/admin/me - Admin identity bootstrap
 */
async function handleGetAdminMe(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const userSnap = await db.collection('users').doc(admin.uid).get();
    if (!userSnap.exists) {
      res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Admin tidak ditemukan.' } });
      return;
    }
    const userData = userSnap.data()!;
    if (userData.status !== 'active') {
      res.status(403).json({ error: { code: 'ADMIN_INACTIVE', message: `Status: ${userData.status}. Ditolak.` } });
      return;
    }
    res.status(200).json({
      data: {
        uid: admin.uid,
        email: admin.email || '',
        appRole: 'admin',
        status: 'active',
        displayName: userData.displayName || undefined,
      },
    });
  } catch (err: any) {
    console.error('[Admin/me]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Kesalahan server.' } });
  }
}

/**
 * GET /api/admin/dashboard - Platform metrics
 */
async function handleGetDashboard(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const metrics = await getDashboardMetrics();
    res.status(200).json({ data: metrics });
  } catch (err: any) {
    console.error('[Admin/dashboard]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load dashboard.' } });
  }
}

/**
 * GET /api/admin/barber-registrations - Barber registration list
 */
async function handleGetBarberRegistrations(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const filter = (req.query.filter as string) || 'all';
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
    const startAfter = req.query.startAfter as string | undefined;

    const sizeValidation = validatePageSize(pageSize);
    if (!sizeValidation.valid) {
      res.status(400).json({ error: { code: 'INVALID_PAGE_SIZE', message: sizeValidation.message } });
      return;
    }

    const validFilter = ['all', 'pending', 'approved', 'rejected'].includes(filter) ? (filter as any) : 'all';
    const result = await getBarberRegistrations(validFilter, { pageSize: sizeValidation.normalizedSize, startAfter });

    res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('[Admin/barber-registrations]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load daftar.' } });
  }
}

/**
 * GET /api/admin/barber-registrations/:barberId - Barber registration detail
 */
async function handleGetBarberRegistrationDetail(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const barberId = req.url?.split('/barber-registrations/')[1]?.split('?')[0];
  if (!barberId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'barberId diperlukan.' } });
    return;
  }

  try {
    const registration = await getBarberRegistrationDetail(barberId);
    if (!registration) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registrasi tidak ditemukan.' } });
      return;
    }
    res.status(200).json({ data: registration });
  } catch (err: any) {
    console.error('[Admin/barber-registrations/:id]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load detail.' } });
  }
}

/**
 * POST /api/admin/barber-registrations/:barberId/approve - Approve barber
 */
async function handleApproveBarber(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const barberId = req.url?.split('/barber-registrations/')[1]?.split('/')[0];
  if (!barberId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'barberId diperlukan.' } });
    return;
  }

  try {
    const result = await approveBarber(barberId, admin.uid);
    res.status(200).json({
      data: {
        alreadyApproved: result.alreadyApproved,
        message: result.alreadyApproved ? 'Sudah disetujui.' : 'Berhasil disetujui.',
      },
    });
  } catch (err: any) {
    console.error('[Admin/approve]', err.message);
    if (err.message === 'REGISTRATION_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registrasi tidak ditemukan.' } });
    } else if (err.message === 'USER_NOT_PENDING') {
      res.status(409).json({ error: { code: 'INVALID_STATE', message: 'Status tidak sesuai.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal disetujui.' } });
    }
  }
}

/**
 * POST /api/admin/barber-registrations/:barberId/reject - Reject barber
 */
async function handleRejectBarber(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const barberId = req.url?.split('/barber-registrations/')[1]?.split('/')[0];
  if (!barberId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'barberId diperlukan.' } });
    return;
  }

  const { reason } = req.body || {};
  const reasonValidation = validateRejectionReason(reason);
  if (!reasonValidation.valid) {
    res.status(400).json({ error: { code: 'INVALID_REASON', message: reasonValidation.message } });
    return;
  }

  try {
    const result = await rejectBarber(barberId, reason as string, admin.uid);
    res.status(200).json({
      data: {
        alreadyRejected: result.alreadyRejected,
        message: result.alreadyRejected ? 'Sudah ditolak.' : 'Berhasil ditolak.',
      },
    });
  } catch (err: any) {
    console.error('[Admin/reject]', err.message);
    if (err.message === 'REGISTRATION_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Registrasi tidak ditemukan.' } });
    } else if (err.message === 'REGISTRATION_NOT_PENDING') {
      res.status(409).json({ error: { code: 'INVALID_STATE', message: 'Status tidak pending.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal ditolak.' } });
    }
  }
}

/**
 * POST /api/admin/barber-registrations/document-url - Get signed document URL
 */
async function handleGetDocumentUrl(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { barberId, documentType } = req.body || {};
  if (!barberId || !documentType) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'barberId dan documentType diperlukan.' } });
    return;
  }

  const docValidation = validateDocumentType(documentType);
  if (!docValidation.valid) {
    res.status(400).json({ error: { code: 'INVALID_DOCUMENT_TYPE', message: docValidation.message } });
    return;
  }

  try {
    const result = await getSignedDocumentUrl(barberId, documentType);
    res.status(200).json({ data: result });
  } catch (err: any) {
    // Never log/forward the raw error to the client -- may contain internal detail.
    console.error('[Admin/document-url]', err.message);
    if (err.message === 'REGISTRATION_NOT_FOUND' || err.message === 'DOCUMENT_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dokumen tidak ditemukan.' } });
    } else if (err.message === 'INVALID_DOCUMENT_TYPE') {
      res.status(400).json({ error: { code: 'INVALID_DOCUMENT_TYPE', message: 'Jenis dokumen tidak valid.' } });
    } else if (err.message === 'DOCUMENT_PATH_INVALID') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dokumen tidak ditemukan.' } });
    } else if (err.message === 'SUPABASE_NOT_CONFIGURED') {
      res.status(503).json({
        error: {
          code: 'SERVER_CONFIGURATION_ERROR',
          message: 'Layanan penyimpanan dokumen belum dikonfigurasi di server.',
        },
      });
    } else if (err.message === 'SIGNED_URL_FAILED') {
      res.status(502).json({ error: { code: 'STORAGE_ERROR', message: 'Gagal membuat URL dokumen.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal membuat URL.' } });
    }
  }
}

/**
 * GET /api/admin/users - User list with role filter
 */
async function handleGetUsers(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const roleFilter = (req.query.role as string) || 'all';
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
    const startAfter = req.query.startAfter as string | undefined;

    const sizeValidation = validatePageSize(pageSize);
    if (!sizeValidation.valid) {
      res.status(400).json({ error: { code: 'INVALID_PAGE_SIZE', message: sizeValidation.message } });
      return;
    }

    const validFilter = ['all', 'customer', 'barber'].includes(roleFilter) ? (roleFilter as any) : 'all';
    const result = await getUsers(validFilter, { pageSize: sizeValidation.normalizedSize, startAfter });

    res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('[Admin/users]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load pengguna.' } });
  }
}

/**
 * GET /api/admin/users/:userId - User detail
 */
async function handleGetUserDetail(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const userId = req.url?.split('/users/')[1]?.split('?')[0];
  if (!userId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'userId diperlukan.' } });
    return;
  }

  try {
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan.' } });
      return;
    }

    const userData = userSnap.data()!;
    res.status(200).json({
      data: {
        uid: userId,
        email: userData.email || '',
        displayName: userData.displayName || '',
        role: userData.role,
        status: userData.status,
        phoneNumber: userData.phoneNumber || undefined,
        createdAt: userData.createdAt,
      },
    });
  } catch (err: any) {
    console.error('[Admin/users/:id]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load pengguna.' } });
  }
}

/**
 * POST /api/admin/users/:userId/status - Update user status (active/suspended)
 */
async function handleUpdateUserStatus(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const userId = req.url?.split('/users/')[1]?.split('/')[0];
  if (!userId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'userId diperlukan.' } });
    return;
  }

  const { targetStatus, reason } = req.body || {};

  const statusValidation = validateTargetStatus(targetStatus);
  if (!statusValidation.valid) {
    res.status(400).json({ error: { code: 'INVALID_STATUS', message: statusValidation.message } });
    return;
  }

  try {
    const result = await updateUserStatus(userId, targetStatus as 'active' | 'suspended', reason || '', admin.uid);

    res.status(200).json({
      data: {
        idempotent: result.idempotent,
        message: result.idempotent ? `Sudah ${targetStatus}.` : `Berhasil diubah ke ${targetStatus}.`,
      },
    });
  } catch (err: any) {
    console.error('[Admin/users/:id/status]', err.message);
    if (err.message === 'ADMIN_CANNOT_SELF_SUSPEND') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin tidak bisa self-suspend.' } });
    } else if (err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pengguna tidak ditemukan.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal update status.' } });
    }
  }
}

// ============================================================================
// Phase 2: Barber Management
// ============================================================================

/**
 * GET /api/admin/barbers - List barbers with filtering
 */
async function handleGetBarbers(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const filter = (req.query.filter as string) || 'all';
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
    const startAfter = req.query.startAfter as string | undefined;

    const sizeValidation = validatePageSize(pageSize);
    if (!sizeValidation.valid) {
      res.status(400).json({ error: { code: 'INVALID_PAGE_SIZE', message: sizeValidation.message } });
      return;
    }

    const validFilter = ['all', 'active', 'suspended', 'approved', 'pending', 'rejected'].includes(filter) ? (filter as any) : 'all';
    const result = await getBarberList(validFilter, { pageSize: sizeValidation.normalizedSize, startAfter });

    res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('[Admin/barbers]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load barber list.' } });
  }
}

/**
 * GET /api/admin/barbers/:barberId - Barber detail
 */
async function handleGetBarberDetail(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const barberId = req.url?.split('/barbers/')[1]?.split('?')[0];
  if (!barberId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'barberId diperlukan.' } });
    return;
  }

  try {
    const detail = await getBarberDetail(barberId);
    if (!detail) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Barber tidak ditemukan.' } });
      return;
    }

    res.status(200).json({ data: detail });
  } catch (err: any) {
    console.error('[Admin/barbers/:id]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load barber detail.' } });
  }
}

// ============================================================================
// Phase 2: Category Management
// ============================================================================

/**
 * GET /api/admin/categories - List all categories
 */
async function handleGetCategories(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const categories = await getCategoriesList();
    res.status(200).json({ data: categories });
  } catch (err: any) {
    console.error('[Admin/categories]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load kategori.' } });
  }
}

/**
 * POST /api/admin/categories - Create new category
 */
async function handleCreateCategory(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { name, description, icon, active, order } = req.body || {};

  const nameValidation = validateCategoryName(name);
  if (!nameValidation.valid) {
    res.status(400).json({ error: { code: 'INVALID_NAME', message: nameValidation.message } });
    return;
  }

  try {
    const category = await createCategory({ name, description, icon, active, order }, admin.uid);
    res.status(201).json({ data: category });
  } catch (err: any) {
    console.error('[Admin/categories POST]', err.message);
    if (err.message === 'CATEGORY_ALREADY_EXISTS') {
      res.status(409).json({ error: { code: 'CATEGORY_ALREADY_EXISTS', message: 'Kategori sudah ada.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal membuat kategori.' } });
    }
  }
}

/**
 * PATCH /api/admin/categories/:categoryId - Update category
 */
async function handleUpdateCategory(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['PATCH', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const categoryId = req.url?.split('/categories/')[1]?.split('?')[0];
  if (!categoryId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'categoryId diperlukan.' } });
    return;
  }

  const { name, description, icon, active, order } = req.body || {};

  // Validate name if provided
  if (name !== undefined) {
    const nameValidation = validateCategoryName(name);
    if (!nameValidation.valid) {
      res.status(400).json({ error: { code: 'INVALID_NAME', message: nameValidation.message } });
      return;
    }
  }

  // Validate order if provided
  if (order !== undefined && (!Number.isInteger(order) || order < 0)) {
    res.status(400).json({ error: { code: 'INVALID_ORDER', message: 'Order harus berupa angka positif.' } });
    return;
  }

  try {
    const category = await updateCategory(categoryId, { name, description, icon, active, order }, admin.uid);
    res.status(200).json({ data: category });
  } catch (err: any) {
    console.error('[Admin/categories/:id PATCH]', err.message);
    if (err.message === 'CATEGORY_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan.' } });
    } else if (err.message === 'CATEGORY_ALREADY_EXISTS') {
      res.status(409).json({ error: { code: 'CATEGORY_ALREADY_EXISTS', message: 'Kategori sudah ada.' } });
    } else if (err.message === 'INVALID_ORDER') {
      res.status(400).json({ error: { code: 'INVALID_ORDER', message: 'Order tidak valid.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal update kategori.' } });
    }
  }
}

/**
 * DELETE /api/admin/categories/:categoryId - Deactivate category
 */
async function handleDeactivateCategory(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['DELETE', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const categoryId = req.url?.split('/categories/')[1]?.split('?')[0];
  if (!categoryId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'categoryId diperlukan.' } });
    return;
  }

  try {
    await deactivateCategory(categoryId, admin.uid);
    res.status(204).end();
  } catch (err: any) {
    console.error('[Admin/categories/:id DELETE]', err.message);
    if (err.message === 'CATEGORY_NOT_FOUND') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan.' } });
    } else {
      res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal deactivate kategori.' } });
    }
  }
}

// ============================================================================
// Phase 3: Booking Monitoring
// ============================================================================

/**
 * GET /api/admin/bookings - List bookings with filtering
 */
async function handleGetBookings(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const status = (req.query.status as string) || undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const paymentMethod = (req.query.paymentMethod as string) || undefined;
    const paymentStatus = (req.query.paymentStatus as string) || undefined;
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
    const startAfter = req.query.startAfter as string | undefined;

    const sizeValidation = validatePageSize(pageSize);
    if (!sizeValidation.valid) {
      res.status(400).json({ error: { code: 'INVALID_PAGE_SIZE', message: sizeValidation.message } });
      return;
    }

    // Validate status enum
    if (status && !['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: { code: 'INVALID_BOOKING_STATUS', message: 'Status tidak valid.' } });
      return;
    }

    // Validate paymentMethod
    if (paymentMethod && !['cash_on_service', 'midtrans_sandbox'].includes(paymentMethod)) {
      res.status(400).json({ error: { code: 'INVALID_PAYMENT_METHOD', message: 'Metode pembayaran tidak valid.' } });
      return;
    }

    const result = await getBookingsList(
      {
        status: status as any,
        dateFrom,
        dateTo,
        paymentMethod: paymentMethod as any,
        paymentStatus,
        pageSize: sizeValidation.normalizedSize,
        startAfter,
      },
      { pageSize: sizeValidation.normalizedSize, startAfter }
    );

    res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('[Admin/bookings]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load booking list.' } });
  }
}

/**
 * GET /api/admin/bookings/:bookingId - Booking detail
 */
async function handleGetBookingDetail(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const bookingId = req.url?.split('/bookings/')[1]?.split('?')[0];
  if (!bookingId) {
    res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'bookingId diperlukan.' } });
    return;
  }

  try {
    const detail = await getBookingDetail(bookingId);
    if (!detail) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking tidak ditemukan.' } });
      return;
    }

    res.status(200).json({ data: detail });
  } catch (err: any) {
    console.error('[Admin/bookings/:id]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load booking detail.' } });
  }
}

// ============================================================================
// Phase 3: Transaction Monitoring
// ============================================================================

/**
 * GET /api/admin/transactions - List transactions with filtering
 */
async function handleGetTransactions(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const provider = (req.query.provider as string) || undefined;
    const status = (req.query.status as string) || undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
    const startAfter = req.query.startAfter as string | undefined;

    const sizeValidation = validatePageSize(pageSize);
    if (!sizeValidation.valid) {
      res.status(400).json({ error: { code: 'INVALID_PAGE_SIZE', message: sizeValidation.message } });
      return;
    }

    // Validate provider
    if (provider && !['cash_on_service', 'midtrans_sandbox'].includes(provider)) {
      res.status(400).json({ error: { code: 'INVALID_PROVIDER', message: 'Provider tidak valid.' } });
      return;
    }

    const result = await getTransactionsList(
      {
        provider: provider as any,
        status,
        dateFrom,
        dateTo,
        pageSize: sizeValidation.normalizedSize,
        startAfter,
      },
      { pageSize: sizeValidation.normalizedSize, startAfter }
    );

    res.status(200).json({ data: result });
  } catch (err: any) {
    console.error('[Admin/transactions]', err.message);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Gagal load transaction list.' } });
  }
}

// ============================================================================
// Router & Pattern Matching
// ============================================================================

const exactRoutes: Record<string, Record<string, RouteHandler>> = {
  'GET': {
    '/api/admin/me': handleGetAdminMe,
    '/api/admin/dashboard': handleGetDashboard,
    '/api/admin/barber-registrations': handleGetBarberRegistrations,
    '/api/admin/users': handleGetUsers,
    '/api/admin/barbers': handleGetBarbers,
    '/api/admin/categories': handleGetCategories,
    '/api/admin/bookings': handleGetBookings,
    '/api/admin/transactions': handleGetTransactions,
  },
  'POST': {
    '/api/admin/barber-registrations/document-url': handleGetDocumentUrl,
    '/api/admin/categories': handleCreateCategory,
  },
  'PATCH': {
  },
  'DELETE': {
  },
};

function matchRoute(pathname: string, method: string): RouteHandler | null {
  // Exact match first
  if (exactRoutes[method]?.[pathname]) {
    return exactRoutes[method][pathname];
  }

  // Pattern matching for dynamic routes
  if (method === 'GET') {
    // /api/admin/barber-registrations/:barberId
    if (pathname.match(/^\/api\/admin\/barber-registrations\/[^/]+$/) && pathname !== '/api/admin/barber-registrations') {
      return handleGetBarberRegistrationDetail;
    }
    // /api/admin/users/:userId (but not /status endpoint)
    if (pathname.match(/^\/api\/admin\/users\/[^/]+$/) && !pathname.includes('/status')) {
      return handleGetUserDetail;
    }
    // /api/admin/barbers/:barberId (Phase 2)
    if (pathname.match(/^\/api\/admin\/barbers\/[^/]+$/) && pathname !== '/api/admin/barbers') {
      return handleGetBarberDetail;
    }
    // /api/admin/bookings/:bookingId (Phase 3)
    if (pathname.match(/^\/api\/admin\/bookings\/[^/]+$/) && pathname !== '/api/admin/bookings') {
      return handleGetBookingDetail;
    }
  }

  if (method === 'POST') {
    // /api/admin/barber-registrations/:barberId/approve
    if (pathname.match(/^\/api\/admin\/barber-registrations\/[^/]+\/approve$/)) {
      return handleApproveBarber;
    }
    // /api/admin/barber-registrations/:barberId/reject
    if (pathname.match(/^\/api\/admin\/barber-registrations\/[^/]+\/reject$/)) {
      return handleRejectBarber;
    }
    // /api/admin/users/:userId/status
    if (pathname.match(/^\/api\/admin\/users\/[^/]+\/status$/)) {
      return handleUpdateUserStatus;
    }
  }

  if (method === 'PATCH') {
    // /api/admin/categories/:categoryId (Phase 2)
    if (pathname.match(/^\/api\/admin\/categories\/[^/]+$/)) {
      return handleUpdateCategory;
    }
  }

  if (method === 'DELETE') {
    // /api/admin/categories/:categoryId (Phase 2)
    if (pathname.match(/^\/api\/admin\/categories\/[^/]+$/)) {
      return handleDeactivateCategory;
    }
  }

  return null;
}

async function router(ctx: RouteContext): Promise<void> {
  const { req, res, method, pathname } = ctx;

  // Handle OPTIONS for CORS preflight
  if (method === 'OPTIONS') {
    handleCors(req, res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    return;
  }

  const handler = matchRoute(pathname, method);
  if (!handler) {
    handleCors(req, res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Rute ${method} ${pathname} tidak ditemukan.` },
    });
    return;
  }

  await handler(ctx);
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = req.url?.split('?')[0] || '/';
  const method = req.method || 'GET';

  const ctx: RouteContext = { req, res, method, pathname };
  await router(ctx);
}
