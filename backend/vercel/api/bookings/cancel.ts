import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSlotLockId } from '../../src/bookings/slot-lock.js';
import { config } from '../../src/config/index.js';
import { authenticateRequest } from '../../src/lib/auth-middleware.js';
import { handleCors } from '../../src/lib/cors.js';
import { db } from '../../src/lib/firebase-admin.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

const cancelBookingSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  reason: z.string().optional().default('Dibatalkan oleh pelanggan'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

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

  // Handle already cancelled or terminal states
  if (bookingData.status === 'cancelled' || paymentData.status === 'cancelled') {
    res.status(200).json({ success: true, message: 'Pesanan sudah dalam status pembatalan.' });
    return;
  }

  // Reject customer cancellation after payment is paid
  if (paymentData.status === 'paid' || bookingData.paymentStatus === 'paid') {
    res.status(400).json({
      error: {
        code: 'PAID_BOOKING_CANNOT_BE_CANCELLED_AUTOMATICALLY',
        message: 'Pembayaran telah dikonfirmasi. Pengembalian dana (refund) belum didukung secara otomatis.',
      },
    });
    return;
  }

  const orderId = paymentData.orderId || bookingData.paymentOrderId;

  // Call Midtrans Cancel API if transaction exists
  if (orderId) {
    try {
      const snap = new midtransClient.Snap({
        isProduction: config.midtransIsProduction,
        serverKey: config.midtransServerKey,
      });
      await snap.transaction.cancel(orderId);
    } catch (cancelErr: any) {
      // Ignore if Midtrans order doesn't exist or already expired/cancelled
    }
  }

  const nowIso = new Date().toISOString();
  const slotDocId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
  const slotLockRef = db.collection('slotLocks').doc(slotDocId);

  // Update Firestore and release slot lock atomically
  await db.runTransaction(async (t) => {
    t.update(bookingRef, {
      status: 'cancelled',
      paymentStatus: 'cancelled',
      cancellationReason: reason,
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
    message: 'Pesanan dan tagihan pembayaran berhasil dibatalkan.',
  });
}
