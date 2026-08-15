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
 * - DEAD_TRACKING_API: legacy tracking REST handlers are intentionally not routed;
 *   current mobile tracking uses participant-scoped Firestore realtime access.
 * - POST /api/bookings/cancel
 * - POST /api/bookings/:bookingId/chat
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { computeAvailability } from '../src/bookings/availability.js';
import { isBarberAcceptingBookings } from '../src/bookings/service-booking-guard.js';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
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

  if (!handleCors(req, res)) return;

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
      const storedRole = userData.role;
      // Only customer/barber are ever self-healed through this public endpoint --
      // an unexpected stored role (e.g. admin, set out-of-band) must never be
      // echoed into a claim grant here, so it falls back to the validated request.
      const effectiveRole: 'customer' | 'barber' =
        storedRole === 'customer' || storedRole === 'barber' ? storedRole : requestedRole;

      // Self-heal accounts provisioned before custom claims were assigned here --
      // Supabase Storage RLS and Firestore rules' appRole() both read these claims
      // from the ID token, not from the users/{uid} Firestore document.
      if (decodedToken.role !== 'authenticated' || decodedToken.app_role !== effectiveRole) {
        const existingUser = await adminAuth.getUser(uid);
        await adminAuth.setCustomUserClaims(uid, {
          ...(existingUser.customClaims || {}),
          role: 'authenticated',
          app_role: effectiveRole,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Akun sudah diinisialisasi',
        user: {
          uid,
          email,
          role: effectiveRole,
          status: userData.status || 'active',
        },
      });
      return;
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

    // Firebase Auth custom claims are the authoritative role signal for Supabase
    // Storage RLS (auth.jwt() ->> 'role'/'app_role') and Firestore rules' appRole() --
    // both read the ID token, not the users/{uid} Firestore document.
    await adminAuth.setCustomUserClaims(uid, { role: 'authenticated', app_role: requestedRole });

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

  if (!handleCors(req, res)) return;

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
    // The real onboarding client (barber-registration.service.ts) writes the draft
    // directly to Firestore (barberRegistrations/{uid}, barbers/{uid}) via saveProfileDraft
    // and uploadVerificationDocument before ever calling this endpoint, and sends no body
    // here at all. This endpoint's job is to promote that existing draft to 'pending' --
    // not to accept a fresh payload the client never had fields for.
    const regRef = db.collection('barberRegistrations').doc(uid);
    const barberRef = db.collection('barbers').doc(uid);
    const userRef = db.collection('users').doc(uid);

    type SubmitResult =
      | { error: { status: number; code: string; message: string } }
      | { success: true; submittedAt: string };

    const result = await db.runTransaction<SubmitResult>(async tx => {
      const regSnap = await tx.get(regRef);

      if (!regSnap.exists) {
        return {
          error: {
            status: 400,
            code: 'REGISTRATION_NOT_STARTED',
            message: 'Draf pendaftaran barber belum dibuat. Lengkapi profil dan dokumen terlebih dahulu.',
          },
        };
      }

      const regData = regSnap.data() || {};

      if (regData.verificationStatus === 'pending' || regData.verificationStatus === 'approved') {
        return {
          error: {
            status: 409,
            code: 'ALREADY_REGISTERED',
            message: 'Pendaftaran barber sudah dalam proses atau sudah disetujui.',
          },
        };
      }

      const ownerName = typeof regData.ownerName === 'string' ? regData.ownerName.trim() : '';
      const phoneNumber = typeof regData.phoneNumber === 'string' ? regData.phoneNumber.trim() : '';
      if (!ownerName || !phoneNumber) {
        return {
          error: {
            status: 400,
            code: 'REGISTRATION_INCOMPLETE',
            message: 'Profil barber (nama pemilik dan nomor telepon) belum lengkap.',
          },
        };
      }

      const documentPaths = regData.documentPaths || {};
      if (!documentPaths.ktp) {
        return {
          error: {
            status: 400,
            code: 'DOCUMENTS_INCOMPLETE',
            message: 'Dokumen KTP verifikasi wajib diunggah sebelum submit.',
          },
        };
      }

      const businessName = (typeof regData.shopName === 'string' && regData.shopName.trim()) || ownerName;
      const timestamp = new Date().toISOString();

      tx.set(regRef, {
        verificationStatus: 'pending',
        onboardingStatus: 'submitted',
        businessName,
        submittedAt: timestamp,
        updatedAt: timestamp,
      }, { merge: true });

      tx.set(barberRef, {
        verificationStatus: 'pending',
        onboardingStatus: 'submitted',
        businessName,
        updatedAt: timestamp,
      }, { merge: true });

      tx.set(userRef, {
        status: 'pending_verification',
        updatedAt: timestamp,
      }, { merge: true });

      return { success: true as const, submittedAt: timestamp };
    });

    if ('error' in result) {
      res.status(result.error.status).json({ error: { code: result.error.code, message: result.error.message } });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'Pendaftaran barber berhasil disubmit',
      registration: {
        uid,
        verificationStatus: 'pending',
        submittedAt: result.submittedAt,
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

    // Batch 08: Barber can only accept PAID bookings (enforced by rules, explicit check for clarity)
    if (action === 'accept' && bookingData.paymentStatus !== 'paid') {
      res.status(400).json({
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Booking belum dibayar. Hanya booking yang sudah dibayar yang dapat diterima.',
        },
      });
      return;
    }

    // P0-3: only an admin-approved, currently-active barber may accept a NEW
    // booking -- a pending/rejected/suspended barber must not be able to take on
    // operational responsibility for a customer just because a booking happens to
    // exist against their account. Rejecting is intentionally NOT gated here: a
    // barber suspended after already having a paid pending booking must still be
    // able to release it (see reject's refundRequired handling below), not be
    // stuck unable to respond at all.
    if (action === 'accept') {
      const barberSnap = await db.collection('barbers').doc(barberId).get();
      if (!isBarberAcceptingBookings(barberSnap.exists ? barberSnap.data() : null)) {
        res.status(403).json({
          error: {
            code: 'BARBER_NOT_AVAILABLE',
            message: 'Akun barber Anda belum diverifikasi atau sedang tidak aktif menerima pesanan.',
          },
        });
        return;
      }
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

    // Batch 08: If barber rejects a PAID booking, mark for refund reconciliation
    // Payment remains 'paid' (not refunded automatically)
    // Admin must manually handle refund via dashboard
    if (action === 'reject' && bookingData.paymentStatus === 'paid') {
      updateData.refundRequired = true;
    }

    await bookingRef.update(updateData);

    // Release slot lock if rejected (payment audit trail preserved)
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
 * DEAD_TRACKING_API: legacy POST /api/barber/bookings/tracking/arrive.
 * Kept for historical reference only; intentionally absent from the route table.
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
 * DEAD_TRACKING_API: legacy POST /api/barber/bookings/tracking/start.
 * Its `in_progress` literal is incompatible with canonical TrackingStatus.
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
 * DEAD_TRACKING_API: legacy POST /api/barber/bookings/tracking/stop.
 * Its `completed` literal is incompatible with canonical TrackingStatus.
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

    // Cannot cancel completed, cancelled, or in_progress bookings
    // Batch 08: in_progress bookings cannot be cancelled (service already underway)
    if (bookingData.status === 'completed' || bookingData.status === 'cancelled' || bookingData.status === 'in_progress') {
      res.status(400).json({
        error: {
          code: 'INVALID_BOOKING_STATE',
          message: `Pesanan dengan status "${bookingData.status}" tidak dapat dibatalkan.`,
        },
      });
      return;
    }

    const timestamp = new Date().toISOString();

    const updateData: Record<string, any> = {
      status: 'cancelled',
      cancelledAt: timestamp,
      cancellationReason: reason,
      updatedAt: timestamp,
    };

    // Batch 08: If customer cancels a PAID booking, mark for refund reconciliation
    // Payment remains 'paid' (not automatically refunded in Batch 08)
    // Admin must manually handle refund via dashboard after Batch 08
    if (paymentData.status === 'paid') {
      updateData.refundRequired = true;
    }

    // Update booking
    await bookingRef.update(updateData);

    // Release slot lock (calendar availability freed, but payment audit preserved)
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
// Route Handlers: Chat
// ============================================================================

/**
 * POST /api/bookings/:bookingId/chat
 *
 * Initialize or get a conversation for a booking.
 * Validates payment status and participant authorization.
 * Idempotent: uses bookingId as conversation document ID.
 */
async function handleInitializeChat(ctx: RouteContext, bookingId: string): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'customer' && authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Chat tidak tersedia untuk role Anda.' },
    });
    return;
  }

  try {
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();

    if (!bookingSnap.exists) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
      return;
    }

    const bookingData = bookingSnap.data() || {};

    // Verify user is a participant in this booking
    const isCustomer = bookingData.customerId === authUser.uid;
    const isBarber = bookingData.barberId === authUser.uid;
    const isAdmin = authUser.appRole === 'admin';

    if (!isCustomer && !isBarber && !isAdmin) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Anda bukan peserta booking ini.' },
      });
      return;
    }

    // Validate payment status
    const paymentStatus = bookingData.paymentStatus || 'not_required';
    if (paymentStatus !== 'paid') {
      res.status(402).json({
        error: {
          code: 'PAYMENT_REQUIRED',
          message: `Chat hanya tersedia untuk booking yang sudah dibayar. Status pembayaran saat ini: ${paymentStatus}`,
        },
      });
      return;
    }

    // Validate booking status (cannot chat if cancelled)
    if (bookingData.status === 'cancelled') {
      res.status(400).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Chat tidak tersedia untuk booking yang dibatalkan.',
        },
      });
      return;
    }

    // Get or create conversation (idempotent)
    const conversationRef = db.collection('conversations').doc(bookingId);
    const conversationSnap = await conversationRef.get();
    const timestamp = new Date().toISOString();

    if (conversationSnap.exists) {
      // Conversation already exists, return it
      const conversation = conversationSnap.data();
      res.status(200).json({
        success: true,
        conversationId: bookingId,
        conversation,
        message: 'Conversation retrieved',
      });
    } else {
      // Create new conversation
      const conversationData = {
        id: bookingId,
        bookingId,
        customerId: bookingData.customerId,
        barberId: bookingData.barberId,
        participants: [bookingData.customerId, bookingData.barberId],
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        customerUnreadCount: 0,
        barberUnreadCount: 0,
      };

      await conversationRef.set(conversationData);

      res.status(201).json({
        success: true,
        conversationId: bookingId,
        conversation: conversationData,
        message: 'Conversation created',
      });
    }
  } catch (err: any) {
    console.error('[Bookings/chat] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

// ============================================================================
// Route Handlers: Availability (Batch 09D-S P0)
// ============================================================================

const availabilityQuerySchema = z.object({
  barberId: z.string({ required_error: 'barberId wajib diisi.' }).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  serviceDurationMinutes: z.coerce.number().int().positive().max(600).optional(),
  isHomeService: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === 'true'),
});

/**
 * GET /api/bookings/availability
 * Public, unauthenticated (mirrors public barber-profile/schedule browsing).
 * Returns ONLY {barberId, date, slots: [{time, available}]} -- never customer
 * identity, bookingId, address, notes, payment, or tracking data. Distinguishes
 * AVAILABLE / TEMPORARILY_HELD / FINALIZED internally via computeAvailability(),
 * but the boolean-only response never reveals which case applies or who holds it.
 */
async function handleGetAvailability(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;

  const url = new URL(req.url || '/', 'http://localhost');
  const parseResult = availabilityQuerySchema.safeParse({
    barberId: url.searchParams.get('barberId') || undefined,
    date: url.searchParams.get('date') || undefined,
    serviceDurationMinutes: url.searchParams.get('serviceDurationMinutes') || undefined,
    isHomeService: url.searchParams.get('isHomeService') || undefined,
  });

  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_ARGUMENT',
        message: parseResult.error.issues.map((i) => i.message).join(', '),
      },
    });
    return;
  }

  const { barberId, date, serviceDurationMinutes, isHomeService } = parseResult.data;

  try {
    const result = await computeAvailability(barberId, date, {
      serviceDurationMinutes,
      isHomeService,
    });

    if (result.error) {
      res.status(200).json({ success: true, barberId, date, slots: [], error: result.error });
      return;
    }

    res.status(200).json({ success: true, barberId, date, slots: result.slots });
  } catch (err: any) {
    console.error('[Bookings/availability] Error:', err.message);
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
    '/api/bookings/cancel': handleCancelBooking,
  },
  'GET': {
    '/api/bookings/availability': handleGetAvailability,
  },
};

async function router(ctx: RouteContext): Promise<void> {
  const { res, method, pathname } = ctx;
  
  // Check for dynamic routes first
  // /api/bookings/:bookingId/chat
  const chatMatch = pathname.match(/^\/api\/bookings\/([^\/]+)\/chat$/);
  if (chatMatch && method === 'POST') {
    const bookingId = chatMatch[1];
    await handleInitializeChat(ctx, bookingId);
    return;
  }

  const handler = routes[method]?.[pathname];

  if (!handler) {
    // Check if OPTIONS is requested (CORS preflight)
    if (method === 'OPTIONS') {
      const allowedMethods = Object.keys(routes).filter((m) => routes[m]?.[pathname]);
      allowedMethods.push('OPTIONS');
      if (!handleCors(ctx.req, res, allowedMethods.length > 1 ? allowedMethods : ['POST', 'OPTIONS'])) return;
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
