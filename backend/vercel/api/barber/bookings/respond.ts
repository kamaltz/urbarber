import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSlotLockId } from '../../../src/bookings/slot-lock.js';
import { config } from '../../../src/config/index.js';
import { authenticateRequest } from '../../../src/lib/auth-middleware.js';
import { handleCors } from '../../../src/lib/cors.js';
import { db } from '../../../src/lib/firebase-admin.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

const respondSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  action: z.enum(['accept', 'reject'], { required_error: 'action harus accept atau reject.' }),
  reason: z.string().optional().default(''),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'barber' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Master Barber yang dapat merespons pesanan.' },
    });
    return;
  }

  const parseResult = respondSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId, action, reason } = parseResult.data;
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

  // Check Booking Ownership & Status
  if (authUser.appRole !== 'admin' && bookingData.barberId !== barberId) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Pesanan ini tidak ditugaskan kepada Anda.' } });
    return;
  }

  if (bookingData.status !== 'pending') {
    res.status(400).json({
      error: {
        code: 'INVALID_BOOKING_STATUS',
        message: `Pesanan sudah dalam status ${bookingData.status} dan tidak dapat diubah lagi.`,
      },
    });
    return;
  }

  const currentPaymentStatus = paymentData.status || bookingData.paymentStatus || 'pending';
  const nowIso = new Date().toISOString();
  const slotDocId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
  const slotLockRef = db.collection('slotLocks').doc(slotDocId);

  if (action === 'accept') {
    // Accept requires paymentStatus === 'paid'
    if (currentPaymentStatus !== 'paid') {
      res.status(400).json({
        error: {
          code: 'PAYMENT_NOT_PAID',
          message: 'Pesanan belum dibayar oleh pelanggan. Terima pesanan hanya dapat dilakukan setelah pembayaran lunas.',
        },
      });
      return;
    }

    await db.runTransaction(async (t) => {
      t.update(bookingRef, {
        status: 'accepted',
        acceptedAt: nowIso,
        updatedAt: nowIso,
      });
    });

    res.status(200).json({
      success: true,
      bookingId,
      status: 'accepted',
      message: 'Pesanan berhasil diterima.',
    });
    return;
  }

  if (action === 'reject') {
    // Reject behavior: If paid, return PAYMENT_REFUND_REQUIRED error
    if (currentPaymentStatus === 'paid') {
      res.status(400).json({
        error: {
          code: 'PAYMENT_REFUND_REQUIRED',
          message: 'Pembayaran telah dikonfirmasi lunas. Pengembalian dana (refund) belum didukung secara otomatis.',
        },
      });
      return;
    }

    // Unpaid rejection: Cancel Midtrans order if exists & release slot lock
    const orderId = paymentData.orderId || bookingData.paymentOrderId;
    if (orderId) {
      try {
        const snap = new midtransClient.Snap({
          isProduction: config.midtransIsProduction,
          serverKey: config.midtransServerKey,
        });
        await snap.transaction.cancel(orderId);
      } catch (err: any) {
        // Ignore if order not found in Midtrans
      }
    }

    await db.runTransaction(async (t) => {
      t.update(bookingRef, {
        status: 'rejected',
        rejectionReason: reason || 'Ditolak oleh barber',
        updatedAt: nowIso,
      });

      if (paymentSnap.exists) {
        t.update(paymentRef, {
          status: 'cancelled',
          updatedAt: nowIso,
        });
      }

      t.delete(slotLockRef);
    });

    res.status(200).json({
      success: true,
      bookingId,
      status: 'rejected',
      message: 'Pesanan berhasil ditolak.',
    });
  }
}
