/**
 * Consolidated App API Router
 *
 * Consolidates all authenticated application endpoints under a single Vercel Serverless Function.
 * Routes: Auth, Barber operations, and Booking operations.
 * Uses lightweight typed routing without heavy framework dependencies.
 *
 * Routes:
 * - POST /api/auth/initialize-account
 * - POST /api/barber/registration/submit
 * - POST /api/barber/bookings/respond
 * - POST /api/barber/bookings/status
 * - POST /api/barber/bookings/tracking/arrive
 * - POST /api/barber/bookings/tracking/start
 * - POST /api/barber/bookings/tracking/stop
 * - POST /api/bookings/cancel
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { config } from '../src/config/index.js';
import { authenticateRequest } from '../src/lib/auth-middleware.js';
import { handleCors } from '../src/lib/cors.js';
import { adminAuth, db } from '../src/lib/firebase-admin.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

// ============================================================================
// Types & Schemas
// ============================================================================

interface RouteContext {
  req: VercelRequest;
  res: VercelResponse;
  method: string;
  pathname: string;
}

type RouteHandler = (ctx: RouteContext) => Promise<void>;

// ============================================================================
// Route Handlers: Auth
// ============================================================================

/**
 * POST /api/auth/initialize-account
 */
async function handleInitializeAccount(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method tidak diizinkan.' } });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Header Authorization Bearer token tidak ditemukan.' },
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token terautentikasi tidak valid.' },
    });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (err: any) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token Firebase tidak valid atau telah kadaluwarsa.' },
    });
    return;
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email || '';

  const { requestedRole, name, phoneNumber } = req.body || {};

  // Validate requestedRole
  if (!requestedRole || (requestedRole !== 'customer' && requestedRole !== 'barber')) {
    res.status(400).json({
      error: {
        code: 'INVALID_ROLE',
        message: 'Role yang diminta harus "customer" atau "barber". Pendaftaran admin tidak diizinkan.',
      },
    });
    return;
  }

  try {
    // Check if user already has a profile
    const userSnap = await db.collection('users').doc(uid).get();

    if (userSnap.exists) {
      const userData = userSnap.data() || {};
      res.status(200).json({
        success: true,
        message: 'Akun sudah diinisialisasi',
        user: {
          uid,
          email,
          role: userData.role || requestedRole,
          status: userData.status || 'active',
        },
      });
    }

    // Create new user profile
    const userRef = db.collection('users').doc(uid);
    const userTimestamp = new Date().toISOString();

    const newUserData = {
      uid,
      email,
      role: requestedRole,
      app_role: requestedRole,
      status: 'active',
      emailVerified: decodedToken.email_verified || false,
      displayName: name || decodedToken.name || email.split('@')[0],
      phoneNumber: phoneNumber || null,
      createdAt: userTimestamp,
      updatedAt: userTimestamp,
    };

    await userRef.set(newUserData);

    res.status(201).json({
      success: true,
      message: 'Akun berhasil diinisialisasi',
      user: {
        uid,
        email,
        role: requestedRole,
        status: 'active',
      },
    });
  } catch (err: any) {
    console.error('[Auth/initialize-account] Error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal saat menginisialisasi akun.',
      },
    });
  }
}

// ============================================================================
// Route Handlers: Barber Registration
// ============================================================================

/**
 * POST /api/barber/registration/submit
 */
async function handleBarberRegistrationSubmit(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method tidak diizinkan.' } });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Header Authorization Bearer token tidak ditemukan.' },
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token terautentikasi tidak valid.' },
    });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (err: any) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token Firebase tidak valid atau telah kadaluwarsa.' },
    });
    return;
  }

  const uid = decodedToken.uid;

  try {
    const { legalName, businessName, license, categories, phone, address, schedule, documents } = req.body || {};

    // Validate basic fields
    if (!legalName || !businessName || !license || !Array.isArray(categories) || categories.length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'legalName, businessName, license, dan categories[] harus diisi.',
        },
      });
    }

    // Check if barber already exists or has pending registration
    const barberSnap = await db.collection('barbers').doc(uid).get();
    if (barberSnap.exists) {
      res.status(409).json({
        error: {
          code: 'ALREADY_EXISTS',
          message: 'Pendaftaran barber sudah ada untuk akun ini.',
        },
      });
    }

    const registrationRef = db.collection('barberRegistrations').doc(uid);
    const regSnap = await registrationRef.get();

    if (regSnap.exists && regSnap.data()?.verificationStatus !== 'rejected') {
      res.status(409).json({
        error: {
          code: 'ALREADY_REGISTERED',
          message: 'Pendaftaran barber sudah dalam proses atau sudah disetujui.',
        },
      });
    }

    const timestamp = new Date().toISOString();
    const registrationData = {
      uid,
      legalName,
      businessName,
      license,
      categories,
      phone: phone || null,
      address: address || null,
      schedule: schedule || {},
      documents: documents || {},
      verificationStatus: 'pending',
      submittedAt: timestamp,
      updatedAt: timestamp,
    };

    await registrationRef.set(registrationData);

    res.status(201).json({
      success: true,
      message: 'Pendaftaran barber berhasil disubmit',
      registration: {
        uid,
        verificationStatus: 'pending',
        submittedAt: timestamp,
      },
    });
  } catch (err: any) {
    console.error('[Barber/registration/submit] Error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal saat mensubmit pendaftaran.',
      },
    });
  }
}

// ============================================================================
// Route Handlers: Barber Bookings
// ============================================================================

/**
 * POST /api/barber/bookings/respond
 */
async function handleBarberRespondBooking(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat merespons pesanan.' },
    });
    return;
  }

  const respondSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
    action: z.enum(['accept', 'reject'], { required_error: 'action harus accept atau reject.' }),
    reason: z.string().optional().default(''),
  });

  const parseResult = respondSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId, action, reason } = parseResult.data;
  const barberId = authUser.uid;

  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};

    // Verify booking belongs to this barber
    if (bookingData.barberId !== barberId && authUser.appRole !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Booking ini bukan untuk Anda.' } });
      return;
    }

    // Only pending bookings can be responded to
    if (bookingData.status !== 'pending') {
      res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Hanya booking dengan status "pending" yang dapat direspons. Status saat ini: ${bookingData.status}`,
        },
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: action === 'accept' ? 'accepted' : 'rejected',
      respondedAt: timestamp,
      updatedAt: timestamp,
    };

    if (reason) {
      updateData.rejectionReason = reason;
    }

    await bookingRef.update(updateData);

    // Release slot lock if rejected
    if (action === 'reject') {
      const slotLockId = getSlotLockId(barberId, bookingData.date, bookingData.startTime);
      const slotLockRef = db.collection('slotLocks').doc(slotLockId);
      await slotLockRef.delete();
    }

    res.status(200).json({
      success: true,
      bookingId,
      status: updateData.status,
      message: `Pesanan ${action === 'accept' ? 'diterima' : 'ditolak'}`,
    });
  } catch (err: any) {
    console.error('[Barber/bookings/respond] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

/**
 * POST /api/barber/bookings/status
 */
async function handleBarberUpdateBookingStatus(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat memperbarui status layanan.' },
    });
    return;
  }

  const statusUpdateSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
    targetStatus: z.enum(['in_progress', 'completed'], {
      required_error: 'targetStatus harus in_progress atau completed.',
    }),
  });

  const parseResult = statusUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId, targetStatus } = parseResult.data;
  const barberId = authUser.uid;

  try {
    const barberSnap = await db.collection('barbers').doc(barberId).get();
    if (!barberSnap.exists) {
      res.status(404).json({
        error: {
          code: 'BARBER_NOT_FOUND',
          message: 'Profil barber tidak ditemukan. Silakan selesaikan pendaftaran barber.',
        },
      });
      return;
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};

    // Verify ownership
    if (bookingData.barberId !== barberId && authUser.appRole !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Booking ini bukan untuk Anda.' } });
      return;
    }

    // Validate state transition
    const currentStatus = bookingData.status;
    const validTransitions: Record<string, string[]> = {
      accepted: ['in_progress'],
      in_progress: ['completed'],
    };

    if (!validTransitions[currentStatus]?.includes(targetStatus)) {
      res.status(400).json({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Status tidak dapat berubah dari ${currentStatus} ke ${targetStatus}.`,
        },
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: targetStatus,
      updatedAt: timestamp,
    };

    if (targetStatus === 'in_progress') {
      updateData.startedAt = timestamp;
    } else if (targetStatus === 'completed') {
      updateData.completedAt = timestamp;
    }

    await bookingRef.update(updateData);

    res.status(200).json({
      success: true,
      bookingId,
      status: targetStatus,
      message: `Status berhasil diperbarui menjadi ${targetStatus}`,
    });
  } catch (err: any) {
    console.error('[Barber/bookings/status] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

/**
 * POST /api/barber/bookings/tracking/arrive
 */
async function handleBarberTrackingArrive(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat mencatat kedatangan.' },
    });
    return;
  }

  const arriveTrackingSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  });

  const parseResult = arriveTrackingSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId } = parseResult.data;
  const barberId = authUser.uid;

  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};

    if (bookingData.barberId !== barberId && authUser.appRole !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Booking ini bukan untuk Anda.' } });
      return;
    }

    const timestamp = new Date().toISOString();
    const trackingRef = db.collection('bookingTracking').doc(bookingId);

    await trackingRef.set(
      {
        bookingId,
        barberId,
        customerId: bookingData.customerId,
        trackingStatus: 'arrived',
        arrivedAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    );

    res.status(200).json({
      success: true,
      bookingId,
      trackingStatus: 'arrived',
      message: 'Kedatangan berhasil dicatat',
    });
  } catch (err: any) {
    console.error('[Barber/bookings/tracking/arrive] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

/**
 * POST /api/barber/bookings/tracking/start
 */
async function handleBarberTrackingStart(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat memulai tracking.' },
    });
    return;
  }

  const startTrackingSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  });

  const parseResult = startTrackingSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId } = parseResult.data;
  const barberId = authUser.uid;

  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};

    if (bookingData.barberId !== barberId && authUser.appRole !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Booking ini bukan untuk Anda.' } });
      return;
    }

    const timestamp = new Date().toISOString();
    const trackingRef = db.collection('bookingTracking').doc(bookingId);

    await trackingRef.set(
      {
        bookingId,
        barberId,
        customerId: bookingData.customerId,
        trackingStatus: 'in_progress',
        startedAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    );

    res.status(200).json({
      success: true,
      bookingId,
      trackingStatus: 'in_progress',
      message: 'Tracking dimulai',
    });
  } catch (err: any) {
    console.error('[Barber/bookings/tracking/start] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

/**
 * POST /api/barber/bookings/tracking/stop
 */
async function handleBarberTrackingStop(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat menghentikan tracking.' },
    });
    return;
  }

  const stopTrackingSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  });

  const parseResult = stopTrackingSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId } = parseResult.data;
  const barberId = authUser.uid;

  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};

    if (bookingData.barberId !== barberId && authUser.appRole !== 'admin') {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Booking ini bukan untuk Anda.' } });
      return;
    }

    const timestamp = new Date().toISOString();
    const trackingRef = db.collection('bookingTracking').doc(bookingId);

    await trackingRef.set(
      {
        bookingId,
        barberId,
        customerId: bookingData.customerId,
        trackingStatus: 'completed',
        stoppedAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    );

    res.status(200).json({
      success: true,
      bookingId,
      trackingStatus: 'completed',
      message: 'Tracking dihentikan',
    });
  } catch (err: any) {
    console.error('[Barber/bookings/tracking/stop] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

// ============================================================================
// Route Handlers: Bookings
// ============================================================================

/**
 * POST /api/bookings/cancel
 */
async function handleCancelBooking(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  const cancelBookingSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
    reason: z.string().optional().default('Dibatalkan oleh pelanggan'),
  });

  const parseResult = cancelBookingSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId, reason } = parseResult.data;
  const bookingRef = db.collection('bookings').doc(bookingId);
  const paymentRef = db.collection('payments').doc(bookingId);

  try {
    const [bookingSnap, paymentSnap] = await Promise.all([bookingRef.get(), paymentRef.get()]);

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};
    const paymentData = paymentSnap.exists ? paymentSnap.data() || {} : {};

    // Access Control: Customer can cancel only own booking; Admin can cancel any
    if (authUser.appRole !== 'admin' && bookingData.customerId !== authUser.uid) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki hak untuk membatalkan pesanan ini.' } });
      return;
    }

    // Cannot cancel completed or already cancelled bookings
    if (bookingData.status === 'completed' || bookingData.status === 'cancelled') {
      res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: `Pesanan dengan status ${bookingData.status} tidak dapat dibatalkan.`,
        },
      });
      return;
    }

    const timestamp = new Date().toISOString();

    // Update booking
    await bookingRef.update({
      status: 'cancelled',
      cancelledAt: timestamp,
      cancellationReason: reason,
      updatedAt: timestamp,
    });

    // Handle payment refund if needed
    if (paymentData.status === 'paid' || paymentData.status === 'settlement') {
      const snap = new midtransClient.Snap({
        isProduction: config.midtransIsProduction || false,
        serverKey: config.midtransServerKey,
      });

      try {
        await snap.refund(paymentData.transactionId);
      } catch (refundErr: any) {
        console.error('[Cancel Booking] Refund failed:', refundErr.message);
        // Don't fail the cancel if refund fails; it can be retried
      }

      await paymentRef.update({
        status: 'refunded',
        refundedAt: timestamp,
        updatedAt: timestamp,
      });
    }

    // Release slot lock
    if (bookingData.barberId && bookingData.date && bookingData.startTime) {
      const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
      await db.collection('slotLocks').doc(slotLockId).delete();
    }

    res.status(200).json({
      success: true,
      bookingId,
      status: 'cancelled',
      message: 'Pesanan berhasil dibatalkan',
    });
  } catch (err: any) {
    console.error('[Bookings/cancel] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

// ============================================================================
// Router
// ============================================================================

const routes: Record<string, Record<string, RouteHandler>> = {
  'POST': {
    '/api/auth/initialize-account': handleInitializeAccount,
    '/api/barber/registration/submit': handleBarberRegistrationSubmit,
    '/api/barber/bookings/respond': handleBarberRespondBooking,
    '/api/barber/bookings/status': handleBarberUpdateBookingStatus,
    '/api/barber/bookings/tracking/arrive': handleBarberTrackingArrive,
    '/api/barber/bookings/tracking/start': handleBarberTrackingStart,
    '/api/barber/bookings/tracking/stop': handleBarberTrackingStop,
    '/api/bookings/cancel': handleCancelBooking,
  },
};

async function router(ctx: RouteContext): Promise<void> {
  const { res, method, pathname } = ctx;
  const handler = routes[method]?.[pathname];

  if (!handler) {
    // Check if OPTIONS is requested (CORS preflight)
    if (method === 'OPTIONS') {
      if (!handleCors(ctx.req, res, ['POST', 'OPTIONS'])) return;
      res.status(204).end();
      return;
    }

    // 405 Method Not Allowed
    if (routes[method]) {
      res.status(405).json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${method} tidak diizinkan untuk rute ini.`,
        },
      });
      return;
    }

    // 404 Not Found
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Rute ${method} ${pathname} tidak ditemukan.`,
      },
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

  const ctx: RouteContext = {
    req,
    res,
    method,
    pathname,
  };

  await router(ctx);
}
