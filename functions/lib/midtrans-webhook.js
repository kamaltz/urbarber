"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.midtransWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("./config");
const signature_1 = require("./utils/signature");
const status_mapper_1 = require("./utils/status-mapper");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');
exports.midtransWebhook = (0, https_1.onRequest)({ secrets: [config_1.midtransServerKey] }, async (req, res) => {
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
    const serverKey = (0, config_1.getMidtransServerKey)();
    // 2. Verify Signature Key
    const isValidSignature = (0, signature_1.verifyMidtransSignature)(signatureKey, orderId, statusCode, grossAmount, serverKey);
    if (!isValidSignature) {
        // Re-verify with raw payload
        const expectedSig = (0, signature_1.generateMidtransSignature)(orderId, statusCode, grossAmount, serverKey);
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
            isProduction: config_1.MIDTRANS_IS_PRODUCTION,
            serverKey,
        });
        const statusResponse = await snap.transaction.notification(payload);
        authoritativeStatus = statusResponse.transaction_status || transactionStatus;
        authoritativeFraud = statusResponse.fraud_status || fraudStatus;
    }
    catch (statusErr) {
        // Fall back to notification payload if direct API query fails in sandbox
    }
    const targetPaymentStatus = (0, status_mapper_1.mapMidtransStatus)(authoritativeStatus, authoritativeFraud);
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
            const updatePaymentData = {
                status: targetPaymentStatus,
                transactionStatus: authoritativeStatus,
                fraudStatus: authoritativeFraud || null,
                paymentType: paymentType || null,
                transactionId: transactionId || null,
                updatedAt: nowIso,
            };
            const updateBookingData = {
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
            if ((0, status_mapper_1.shouldReleaseSlot)(targetPaymentStatus)) {
                t.delete(slotLockRef);
            }
        });
        res.status(200).json({
            status: 'success',
            bookingId,
            orderId,
            paymentStatus: targetPaymentStatus,
        });
    }
    catch (err) {
        res.status(500).json({ status: 'error', message: 'Failed to update payment status' });
    }
});
//# sourceMappingURL=midtrans-webhook.js.map