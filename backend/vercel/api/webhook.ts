import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Transaction } from 'firebase-admin/firestore';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { config } from '../src/config/index.js';
import { handleCors } from '../src/lib/cors.js';
import { db } from '../src/lib/firebase-admin.js';
import { parseOrderId, verifyMidtransSignature } from '../src/payments/signature.js';
import { mapMidtransStatus, shouldReleaseSlot } from '../src/payments/status-mapper.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const body = req.body || {};
  const {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: signatureKey,
    transaction_status: notifStatus,
    fraud_status: notifFraud,
    payment_type: paymentType,
    transaction_id: transactionId,
  } = body;

  if (!orderId || !statusCode || !grossAmount || !signatureKey) {
    res.status(400).json({ error: { code: 'INVALID_WEBHOOK_PAYLOAD', message: 'Payload notifikasi tidak lengkap.' } });
    return;
  }

  // 1. Verify SHA-512 Signature
  const isSignatureValid = verifyMidtransSignature(
    signatureKey,
    orderId,
    statusCode,
    grossAmount,
    config.midtransServerKey
  );

  if (!isSignatureValid) {
    res.status(403).json({ error: { code: 'INVALID_SIGNATURE', message: 'Signature key Midtrans tidak valid.' } });
    return;
  }

  // 2. Parse bookingId from orderId
  const { valid, bookingId } = parseOrderId(orderId);
  if (!valid || !bookingId) {
    res.status(400).json({ error: { code: 'INVALID_ORDER_ID', message: 'Format Order ID tidak valid.' } });
    return;
  }

  // 3. Load payment document from Firestore
  const paymentRef = db.collection('payments').doc(bookingId);
  const bookingRef = db.collection('bookings').doc(bookingId);

  const [paymentSnap, bookingSnap] = await Promise.all([paymentRef.get(), bookingRef.get()]);

  if (!paymentSnap.exists || !bookingSnap.exists) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Dokumen pembayaran atau booking tidak ditemukan.' } });
    return;
  }

  const paymentData = paymentSnap.data() || {};
  const bookingData = bookingSnap.data() || {};

  // Verify gross amount matches stored amount
  const storedAmount = Number(paymentData.grossAmount || 0);
  const notifAmount = Number(grossAmount || 0);
  if (Math.abs(storedAmount - notifAmount) > 0.01) {
    res.status(400).json({ error: { code: 'AMOUNT_MISMATCH', message: 'Jumlah pembayaran tidak sesuai.' } });
    return;
  }

  // 4. Call Midtrans Get Status API server-side to verify status authoritatively
  const snap = new midtransClient.Snap({
    isProduction: config.midtransIsProduction,
    serverKey: config.midtransServerKey,
  });

  let verifiedStatus = notifStatus;
  let verifiedFraud = notifFraud;
  let verifiedPaymentType = paymentType || paymentData.paymentType || null;
  let verifiedTransactionId = transactionId || paymentData.transactionId || null;

  try {
    const statusResponse = await snap.transaction.status(orderId);
    verifiedStatus = statusResponse.transaction_status || verifiedStatus;
    verifiedFraud = statusResponse.fraud_status || verifiedFraud;
    verifiedPaymentType = statusResponse.payment_type || verifiedPaymentType;
    verifiedTransactionId = statusResponse.transaction_id || verifiedTransactionId;
  } catch (err: any) {
    // If Get Status API fails, fallback to notification values if signature was verified
  }

  const targetStatus = mapMidtransStatus(verifiedStatus, verifiedFraud);

  // 5. Idempotent check: If status is unchanged, return 200 without duplicate writes
  if (paymentData.status === targetStatus && bookingData.paymentStatus === targetStatus) {
    res.status(200).json({ status: 'OK', message: 'Notification already processed.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const slotDocId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
  const slotLockRef = db.collection('slotLocks').doc(slotDocId);

  // 6. Update Firestore atomically
  await db.runTransaction(async (t: Transaction) => {
    const updatePayment: Record<string, any> = {
      status: targetStatus,
      transactionStatus: verifiedStatus,
      fraudStatus: verifiedFraud || null,
      paymentType: verifiedPaymentType,
      transactionId: verifiedTransactionId,
      updatedAt: nowIso,
      lastNotificationAt: nowIso,
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

    t.update(paymentRef, updatePayment);
    t.update(bookingRef, updateBooking);
  });

  res.status(200).json({ status: 'OK', message: 'Notification processed successfully.' });
}
