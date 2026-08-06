import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSlotLockId } from '../../src/bookings/slot-lock.js';
import { config } from '../../src/config/index.js';
import { authenticateRequest } from '../../src/lib/auth-middleware.js';
import { handleCors } from '../../src/lib/cors.js';
import { db } from '../../src/lib/firebase-admin.js';
import { mapMidtransStatus, shouldReleaseSlot } from '../../src/payments/status-mapper.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

const syncPaymentSchema = z.object({
  bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  const parseResult = syncPaymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId } = parseResult.data;
  const bookingRef = db.collection('bookings').doc(bookingId);
  const paymentRef = db.collection('payments').doc(bookingId);

  const [bookingSnap, paymentSnap] = await Promise.all([bookingRef.get(), paymentRef.get()]);

  if (!bookingSnap.exists) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Pemesanan tidak ditemukan.' } });
    return;
  }

  const bookingData = bookingSnap.data() || {};
  const paymentData = paymentSnap.exists ? paymentSnap.data() || {} : {};

  // Access Control: Customer can sync only own booking; Admin can sync any
  if (authUser.appRole !== 'admin' && bookingData.customerId !== authUser.uid) {
    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pemesanan ini.' } });
    return;
  }

  const orderId = paymentData.orderId || bookingData.paymentOrderId || `URB-${bookingId}`;
  const snap = new midtransClient.Snap({
    isProduction: config.midtransIsProduction,
    serverKey: config.midtransServerKey,
  });

  let transactionStatus = paymentData.transactionStatus || 'pending';
  let fraudStatus = paymentData.fraudStatus || null;
  let paymentType = paymentData.paymentType || null;
  let transactionId = paymentData.transactionId || null;

  try {
    const statusResponse = await snap.transaction.status(orderId);
    transactionStatus = statusResponse.transaction_status || transactionStatus;
    fraudStatus = statusResponse.fraud_status || fraudStatus;
    paymentType = statusResponse.payment_type || paymentType;
    transactionId = statusResponse.transaction_id || transactionId;
  } catch (statusErr: any) {
    const statusCode = statusErr?.httpStatusCode || statusErr?.statusCode;
    if (statusCode === '404' || statusCode === 404 || statusErr?.message?.includes('404')) {
      res.status(200).json({
        success: true,
        paymentStatus: paymentData.status || 'pending',
        bookingStatus: bookingData.status || 'pending',
      });
      return;
    }
  }

  const targetStatus = mapMidtransStatus(transactionStatus, fraudStatus);
  const nowIso = new Date().toISOString();
  const slotDocId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
  const slotLockRef = db.collection('slotLocks').doc(slotDocId);

  await db.runTransaction(async (t) => {
    const updatePayment: Record<string, any> = {
      status: targetStatus,
      transactionStatus,
      fraudStatus,
      paymentType,
      transactionId,
      updatedAt: nowIso,
      lastSyncedAt: nowIso,
    };

    const updateBooking: Record<string, any> = {
      paymentStatus: targetStatus,
      updatedAt: nowIso,
    };

    if (targetStatus === 'paid' && !paymentData.paidAt) {
      updatePayment.paidAt = nowIso;
      updateBooking.paidAt = nowIso;
    }

    if (shouldReleaseSlot(targetStatus)) {
      updateBooking.status = 'cancelled';
      t.delete(slotLockRef);
    }

    if (paymentSnap.exists) {
      t.update(paymentRef, updatePayment);
    } else {
      t.set(paymentRef, {
        bookingId,
        customerId: bookingData.customerId,
        barberId: bookingData.barberId,
        provider: 'midtrans',
        environment: config.midtransIsProduction ? 'production' : 'sandbox',
        orderId,
        grossAmount: bookingData.totalPrice || 0,
        createdAt: nowIso,
        ...updatePayment,
      });
    }

    t.update(bookingRef, updateBooking);
  });

  res.status(200).json({
    success: true,
    paymentStatus: targetStatus,
    bookingStatus: bookingData.status || 'pending',
  });
}
