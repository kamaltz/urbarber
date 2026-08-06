import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { authenticateRequest } from '../../../src/lib/auth-middleware.js';
import { handleCors } from '../../../src/lib/cors.js';
import { db } from '../../../src/lib/firebase-admin.js';

const statusUpdateSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  targetStatus: z.enum(['in_progress', 'completed'], {
    required_error: 'targetStatus harus in_progress atau completed.',
  }),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat memperbarui status layanan.' },
    });
    return;
  }

  const parseResult = statusUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId, targetStatus } = parseResult.data;
  const barberId = authUser.uid;

  // Verify Barber Account
  const barberSnap = await db.collection('barbers').doc(barberId).get();
  if (!barberSnap.exists) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profil barber tidak ditemukan.' } });
    return;
  }

  const barberData = barberSnap.data() || {};
  if (barberData.status !== 'active' || barberData.verificationStatus !== 'approved') {
    res.status(403).json({
      error: {
        code: 'BARBER_UNVERIFIED_OR_SUSPENDED',
        message: 'Akun barber belum terverifikasi atau sedang dinonaktifkan.',
      },
    });
    return;
  }

  // Load Booking & Payment
  const bookingRef = db.collection('bookings').doc(bookingId);
  const paymentRef = db.collection('payments').doc(bookingId);

  const [bookingSnap, paymentSnap] = await Promise.all([bookingRef.get(), paymentRef.get()]);

  if (!bookingSnap.exists) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan.' } });
    return;
  }

  const bookingData = bookingSnap.data() || {};
  const paymentData = paymentSnap.exists ? paymentSnap.data() || {} : {};

  // Check Booking Ownership
  if (authUser.appRole !== 'admin' && bookingData.barberId !== barberId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Pesanan ini tidak ditugaskan kepada Anda.' } });
    return;
  }

  // Require paymentStatus === 'paid'
  const currentPaymentStatus = paymentData.status || bookingData.paymentStatus;
  if (currentPaymentStatus !== 'paid') {
    res.status(400).json({
      error: {
        code: 'PAYMENT_NOT_PAID',
        message: 'Layanan hanya dapat diproses setelah pembayaran lunas.',
      },
    });
    return;
  }

  const currentStatus = bookingData.status;

  // Validate transition matrix:
  // accepted -> in_progress
  // in_progress -> completed
  const isValidTransition =
    (currentStatus === 'accepted' && targetStatus === 'in_progress') ||
    (currentStatus === 'in_progress' && targetStatus === 'completed');

  if (!isValidTransition) {
    res.status(400).json({
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Transisi status dari ${currentStatus} ke ${targetStatus} tidak diperbolehkan.`,
      },
    });
    return;
  }

  const nowIso = new Date().toISOString();

  await db.runTransaction(async (t) => {
    const updateData: Record<string, any> = {
      status: targetStatus,
      updatedAt: nowIso,
    };

    if (targetStatus === 'in_progress') {
      updateData.startedAt = nowIso;
    } else if (targetStatus === 'completed') {
      updateData.completedAt = nowIso;
    }

    t.update(bookingRef, updateData);
  });

  res.status(200).json({
    success: true,
    bookingId,
    status: targetStatus,
    message: `Status pesanan berhasil diperbarui menjadi ${targetStatus}.`,
  });
}
