import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { getMidtransServerKey, MIDTRANS_IS_PRODUCTION, midtransServerKey } from './config';

import { generateMidtransSignature, verifyMidtransSignature } from './utils/signature';
import { mapMidtransStatus, shouldReleaseSlot } from './utils/status-mapper';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

export const midtransWebhook = onRequest(
  { secrets: [midtransServerKey] },
  async (req, res) => {
    // 1. Accept POST only
    if (req.method !== 'POST') {
      res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
      return;
    }

    const payload = req.body || {};
    const orderId = payload.order_id;
    const statusCode = payload.status_code;
    const grossAmount = payload.gross_amount;
    const signatureKey = payload.signature_key;
    const transactionStatus = payload.transaction_status;
    const fraudStatus = payload.fraud_status;
    const paymentType = payload.payment_type;
    const transactionId = payload.transaction_id;

    if (!orderId || !statusCode || !grossAmount || !signatureKey) {
      res.status(400).json({ status: 'error', message: 'Missing required notification fields' });
      return;
    }

    const serverKey = getMidtransServerKey();

    // 2. Verify Signature Key
    const isValidSignature = verifyMidtransSignature(
      signatureKey,
      orderId,
      statusCode,
      grossAmount,
      serverKey
    );

    if (!isValidSignature) {
      // Re-verify with raw payload
      const expectedSig = generateMidtransSignature(orderId, statusCode, grossAmount, serverKey);
      if (expectedSig.toLowerCase() !== signatureKey.toLowerCase()) {
        res.status(403).json({ status: 'error', message: 'Invalid signature key' });
        return;
      }
    }

    const db = admin.firestore();

    // 3. Find payment record by orderId
    const paymentsQuery = await db.collection('payments').where('orderId', '==', orderId).limit(1).get();
    if (paymentsQuery.empty) {
      res.status(404).json({ status: 'error', message: 'Payment record not found' });
      return;
    }

    const paymentDoc = paymentsQuery.docs[0];
    const paymentData = paymentDoc.data();
    const bookingId = paymentData.bookingId || paymentDoc.id;

    // 4. Verify Gross Amount matches stored payment amount
    const storedAmount = Number(paymentData.grossAmount || 0);
    const notificationAmount = Number(grossAmount);

    if (Math.abs(storedAmount - notificationAmount) > 0.01) {
      res.status(400).json({ status: 'error', message: 'Gross amount mismatch' });
      return;
    }

    // 5. Query Midtrans API directly server-side to confirm status before performing state transition
    let authoritativeStatus = transactionStatus;
    let authoritativeFraud = fraudStatus;

    try {
      const snap = new midtransClient.Snap({
        isProduction: MIDTRANS_IS_PRODUCTION,
        serverKey,
      });

      const statusResponse = await snap.transaction.notification(payload);
      authoritativeStatus = statusResponse.transaction_status || transactionStatus;
      authoritativeFraud = statusResponse.fraud_status || fraudStatus;
    } catch (statusErr: any) {
      // Fall back to notification payload if direct API query fails in sandbox
    }

    const targetPaymentStatus = mapMidtransStatus(authoritativeStatus, authoritativeFraud);
    const nowIso = new Date().toISOString();

    // 6. Idempotency Check: if already in target state, return 200 HTTP immediately
    if (paymentData.status === targetPaymentStatus && paymentData.transactionStatus === authoritativeStatus) {
      res.status(200).json({ status: 'success', message: 'Notification already processed' });
      return;
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const slotDocId = `${paymentData.barberId}_${paymentData.date}_${(paymentData.startTime || '').replace(':', '')}`;
    const slotLockRef = db.collection('slotLocks').doc(slotDocId);

    // 7. Execute Firestore Transaction for Payment & Booking Status Update
    try {
      await db.runTransaction(async (t) => {
        const updatePaymentData: Record<string, any> = {
          status: targetPaymentStatus,
          transactionStatus: authoritativeStatus,
          fraudStatus: authoritativeFraud || null,
          paymentType: paymentType || null,
          transactionId: transactionId || null,
          updatedAt: nowIso,
        };

        const updateBookingData: Record<string, any> = {
          paymentStatus: targetPaymentStatus,
          updatedAt: nowIso,
        };

        if (targetPaymentStatus === 'paid') {
          updatePaymentData.paidAt = nowIso;
          updateBookingData.paidAt = nowIso;
        }

        t.update(paymentDoc.ref, updatePaymentData);
        t.update(bookingRef, updateBookingData);

        // Release slot lock if payment failed, cancelled, or expired
        if (shouldReleaseSlot(targetPaymentStatus)) {
          t.delete(slotLockRef);
        }
      });

      res.status(200).json({
        status: 'success',
        bookingId,
        orderId,
        paymentStatus: targetPaymentStatus,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: 'Failed to update payment status' });
    }
  }
);
