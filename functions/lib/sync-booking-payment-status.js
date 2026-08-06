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
exports.syncBookingPaymentStatus = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("./config");
const status_mapper_1 = require("./utils/status-mapper");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');
exports.syncBookingPaymentStatus = (0, https_1.onCall)({ secrets: [config_1.midtransServerKey] }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Pengguna harus terautentikasi.');
    }
    const uid = request.auth.uid;
    const userRole = request.auth.token?.app_role || 'customer';
    const data = request.data;
    const bookingId = (data.bookingId || '').trim();
    if (!bookingId) {
        throw new https_1.HttpsError('invalid-argument', 'bookingId wajib diisi.');
    }
    const db = admin.firestore();
    const bookingRef = db.collection('bookings').doc(bookingId);
    const paymentRef = db.collection('payments').doc(bookingId);
    const [bookingSnap, paymentSnap] = await Promise.all([
        bookingRef.get(),
        paymentRef.get(),
    ]);
    if (!bookingSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Booking tidak ditemukan.');
    }
    const bookingData = bookingSnap.data() || {};
    const paymentData = paymentSnap.exists ? paymentSnap.data() || {} : {};
    // Check Access Control: Customer can sync own booking; Admin can sync any
    if (userRole !== 'admin' && bookingData.customerId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Anda tidak memiliki akses ke pesanan ini.');
    }
    const orderId = paymentData.orderId || bookingData.paymentOrderId || `URB-${bookingId}`;
    const serverKey = (0, config_1.getMidtransServerKey)();
    const snap = new midtransClient.Snap({
        isProduction: config_1.MIDTRANS_IS_PRODUCTION,
        serverKey,
    });
    let transactionStatus = paymentData.transactionStatus || 'pending';
    let fraudStatus = paymentData.fraudStatus || null;
    let paymentType = paymentData.paymentType || null;
    let transactionId = paymentData.transactionId || null;
    try {
        // Call Midtrans Get Status API
        const statusResponse = await snap.transaction.status(orderId);
        transactionStatus = statusResponse.transaction_status || transactionStatus;
        fraudStatus = statusResponse.fraud_status || fraudStatus;
        paymentType = statusResponse.payment_type || paymentType;
        transactionId = statusResponse.transaction_id || transactionId;
    }
    catch (statusErr) {
        // Handle 404 / payment not found when Snap token was created but user hasn't selected payment method
        const statusCode = statusErr?.httpStatusCode || statusErr?.statusCode;
        if (statusCode === '404' || statusCode === 404 || statusErr?.message?.includes('404')) {
            // Keep status as pending/initiated, do NOT mark as failed
            return {
                success: true,
                paymentStatus: paymentData.status || 'pending',
                bookingStatus: bookingData.status || 'pending',
            };
        }
    }
    const targetPaymentStatus = (0, status_mapper_1.mapMidtransStatus)(transactionStatus, fraudStatus);
    const nowIso = new Date().toISOString();
    const slotDocId = `${bookingData.barberId}_${bookingData.date}_${(bookingData.startTime || '').replace(':', '')}`;
    const slotLockRef = db.collection('slotLocks').doc(slotDocId);
    // Update Firestore idempotently
    await db.runTransaction(async (t) => {
        const updatePaymentData = {
            status: targetPaymentStatus,
            transactionStatus,
            fraudStatus,
            paymentType,
            transactionId,
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
        if (paymentSnap.exists) {
            t.update(paymentRef, updatePaymentData);
        }
        else {
            t.set(paymentRef, {
                bookingId,
                customerId: bookingData.customerId,
                barberId: bookingData.barberId,
                provider: 'midtrans',
                environment: config_1.MIDTRANS_IS_PRODUCTION ? 'production' : 'sandbox',
                orderId,
                grossAmount: bookingData.totalPrice || 0,
                createdAt: nowIso,
                ...updatePaymentData,
            });
        }
        t.update(bookingRef, updateBookingData);
        if ((0, status_mapper_1.shouldReleaseSlot)(targetPaymentStatus)) {
            t.delete(slotLockRef);
        }
    });
    return {
        success: true,
        paymentStatus: targetPaymentStatus,
        bookingStatus: bookingData.status || 'pending',
    };
});
//# sourceMappingURL=sync-booking-payment-status.js.map