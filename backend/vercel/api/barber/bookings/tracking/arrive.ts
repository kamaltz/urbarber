import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticateRequest } from '../../../../src/lib/auth-middleware.js';
import { handleCors } from '../../../../src/lib/cors.js';
import { db } from '../../../../src/lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

const arriveTrackingSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat mencatat kedatangan.' },
    });
    return;
  }

  const parseResult = arriveTrackingSchema.safeParse(req.body);
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

  // Update tracking status
  const trackingRef = db.collection('bookingTracking').doc(bookingId);
  await trackingRef.set(
    {
      bookingId,
      customerId: bookingData.customerId,
      barberId,
      trackingStatus: 'arrived',
      isActive: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  res.status(200).json({
    success: true,
    data: {
      bookingId,
      trackingStatus: 'arrived',
      isActive: true,
    },
  });
}
