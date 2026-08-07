import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticateRequest } from '../../../../src/lib/auth-middleware.js';
import { handleCors } from '../../../../src/lib/cors.js';
import { db } from '../../../../src/lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

const startTrackingSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat memulai pelacakan lokasi.' },
    });
    return;
  }

  const parseResult = startTrackingSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId } = parseResult.data;
  const barberId = authUser.uid;

  // Load booking
  const bookingSnap = await db.collection('bookings').doc(bookingId).get();
  if (!bookingSnap.exists) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan.' } });
    return;
  }

  const bookingData = bookingSnap.data() || {};

  // Check ownership
  if (bookingData.barberId !== barberId && authUser.appRole !== 'admin') {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pesanan ini.' } });
    return;
  }

  // Check booking status
  if (bookingData.status !== 'accepted') {
    res.status(400).json({
      error: {
        code: 'INVALID_BOOKING_STATUS',
        message: 'Pelacakan keberangkatan hanya dapat dimulai pada pesanan yang berstatus disetujui (accepted).',
      },
    });
    return;
  }

  // Check home service type
  const isHomeService = bookingData.serviceLocationType === 'customer_home' || bookingData.bookingType === 'home';
  if (!isHomeService) {
    res.status(400).json({
      error: {
        code: 'NOT_HOME_SERVICE',
        message: 'Pelacakan lokasi hanya berlaku untuk layanan cukur di rumah pelanggan.',
      },
    });
    return;
  }

  // Check payment eligibility
  const paymentMethod = bookingData.paymentMethod || 'cash_on_service';
  const paymentStatus = bookingData.paymentStatus || 'not_required';

  if (paymentMethod === 'midtrans_sandbox' && paymentStatus !== 'paid') {
    res.status(400).json({
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'Pembayaran Midtrans belum selesai. Pelacakan keberangkatan belum dapat dimulai.',
      },
    });
    return;
  }

  // Create or update tracking document idempotently
  const trackingRef = db.collection('bookingTracking').doc(bookingId);
  const trackingSnap = await trackingRef.get();

  if (!trackingSnap.exists) {
    await trackingRef.set({
      bookingId,
      customerId: bookingData.customerId,
      barberId,
      trackingStatus: 'en_route',
      isActive: true,
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    await trackingRef.update({
      trackingStatus: 'en_route',
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  res.status(200).json({
    success: true,
    data: {
      bookingId,
      trackingStatus: 'en_route',
      isActive: true,
    },
  });
}
