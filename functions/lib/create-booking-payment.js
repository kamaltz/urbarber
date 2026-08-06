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
exports.createBookingPayment = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const config_1 = require("./config");
// Midtrans Node.js SDK
// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');
exports.createBookingPayment = (0, https_1.onCall)({ secrets: [config_1.midtransServerKey] }, async (request) => {
    // 1. Reject unauthenticated requests
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Pengguna harus terautentikasi untuk membuat pesanan.');
    }
    const customerId = request.auth.uid;
    const data = request.data;
    // 2. Validate client input parameters
    const barberId = (data.barberId || '').trim();
    const serviceId = (data.serviceId || '').trim();
    const date = (data.date || '').trim();
    const startTime = (data.startTime || '').trim();
    const address = (data.address || '').trim();
    const notes = (data.notes || '').trim();
    if (!barberId || !serviceId || !date || !startTime || !address) {
        throw new https_1.HttpsError('invalid-argument', 'Parameter booking tidak lengkap (barberId, serviceId, date, startTime, address wajib diisi).');
    }
    const db = admin.firestore();
    // 3. Fetch authoritative records from Firestore
    const customerRef = db.collection('customers').doc(customerId);
    const userRef = db.collection('users').doc(customerId);
    const barberRef = db.collection('barbers').doc(barberId);
    const serviceRef = db.collection('barberServices').doc(serviceId);
    const [customerSnap, userSnap, barberSnap, serviceSnap] = await Promise.all([
        customerRef.get(),
        userRef.get(),
        barberRef.get(),
        serviceRef.get(),
    ]);
    // 4. Verify Customer account
    const userStatus = userSnap.exists ? userSnap.data()?.status : 'active';
    if (userStatus === 'suspended') {
        throw new https_1.HttpsError('permission-denied', 'Akun pelanggan sedang ditangguhkan.');
    }
    const customerName = customerSnap.data()?.name ||
        customerSnap.data()?.fullName ||
        userSnap.data()?.name ||
        userSnap.data()?.fullName ||
        request.auth.token.name ||
        'Pelanggan URBarber';
    const customerEmail = customerSnap.data()?.email ||
        userSnap.data()?.email ||
        request.auth.token.email ||
        'customer@urbarber.app';
    const customerPhone = customerSnap.data()?.phone ||
        customerSnap.data()?.phoneNumber ||
        userSnap.data()?.phoneNumber ||
        '08123456789';
    // 5. Verify Barber
    if (!barberSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Barber tidak ditemukan.');
    }
    const barberData = barberSnap.data();
    if (barberData?.status !== 'active' || barberData?.verified !== true) {
        throw new https_1.HttpsError('failed-precondition', 'Barber tidak aktif atau belum terverifikasi.');
    }
    // 6. Verify Service
    if (!serviceSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Layanan barber tidak ditemukan.');
    }
    const serviceData = serviceSnap.data();
    if (serviceData?.barberId !== barberId || serviceData?.active === false) {
        throw new https_1.HttpsError('failed-precondition', 'Layanan tidak valid atau tidak aktif untuk barber ini.');
    }
    const serviceName = serviceData.name || 'Layanan Barber';
    const grossAmount = Number(serviceData.price || 0);
    const durationMinutes = Number(serviceData.durationMinutes || 30);
    if (grossAmount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Harga layanan tidak valid.');
    }
    // 7. Generate server booking ID and Midtrans order ID
    const bookingRef = db.collection('bookings').doc();
    const bookingId = bookingRef.id;
    const orderId = `URB-${bookingId}`;
    const paymentRef = db.collection('payments').doc(bookingId);
    // Slot lock reference
    const slotDocId = `${barberId}_${date}_${startTime.replace(':', '')}`;
    const slotLockRef = db.collection('slotLocks').doc(slotDocId);
    // 8. Execute Firestore Transaction for initial booking & slot lock
    try {
        await db.runTransaction(async (transaction) => {
            // Check slot availability
            const slotSnap = await transaction.get(slotLockRef);
            if (slotSnap.exists) {
                const slotData = slotSnap.data();
                if (slotData?.status === 'locked' || slotData?.status === 'booked') {
                    throw new https_1.HttpsError('already-exists', 'Jadwal slot waktu yang dipilih sudah dipesan.');
                }
            }
            const nowIso = new Date().toISOString();
            const serverNow = admin.firestore.FieldValue.serverTimestamp();
            // Create booking document
            transaction.set(bookingRef, {
                id: bookingId,
                customerId,
                barberId,
                serviceId,
                serviceName,
                date,
                startTime,
                address,
                notes,
                totalPrice: grossAmount,
                durationMinutes,
                status: 'pending',
                paymentStatus: 'initiated',
                paymentProvider: 'midtrans',
                paymentOrderId: orderId,
                paymentId: bookingId,
                createdAt: nowIso,
                createdAtTimestamp: serverNow,
                updatedAt: nowIso,
            });
            // Create slot lock
            transaction.set(slotLockRef, {
                bookingId,
                barberId,
                date,
                startTime,
                status: 'locked',
                lockedAt: nowIso,
            });
            // Create initial payment document
            transaction.set(paymentRef, {
                bookingId,
                customerId,
                barberId,
                provider: 'midtrans',
                environment: config_1.MIDTRANS_IS_PRODUCTION ? 'production' : 'sandbox',
                orderId,
                grossAmount,
                status: 'initiated',
                createdAt: nowIso,
                updatedAt: nowIso,
            });
        });
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        throw new https_1.HttpsError('aborted', err?.message || 'Gagal mengunci jadwal booking. Silakan coba waktu lain.');
    }
    // 9. Call Midtrans Snap Sandbox API after Firestore transaction succeeds
    const serverKey = (0, config_1.getMidtransServerKey)();
    const snap = new midtransClient.Snap({
        isProduction: config_1.MIDTRANS_IS_PRODUCTION,
        serverKey,
    });
    const snapPayload = {
        transaction_details: {
            order_id: orderId,
            gross_amount: grossAmount,
        },
        item_details: [
            {
                id: serviceId,
                price: grossAmount,
                quantity: 1,
                name: serviceName.substring(0, 50),
            },
        ],
        customer_details: {
            first_name: customerName.substring(0, 50),
            email: customerEmail,
            phone: customerPhone,
        },
        expiry: {
            unit: 'minute',
            duration: 15,
        },
    };
    try {
        const snapResponse = await snap.createTransaction(snapPayload);
        const snapToken = snapResponse.token;
        const redirectUrl = snapResponse.redirect_url;
        const updatedNowIso = new Date().toISOString();
        // Update payment & booking with Snap credentials
        await db.runTransaction(async (t) => {
            t.update(paymentRef, {
                snapToken,
                redirectUrl,
                status: 'pending',
                updatedAt: updatedNowIso,
            });
            t.update(bookingRef, {
                paymentStatus: 'pending',
                updatedAt: updatedNowIso,
            });
        });
        return {
            bookingId,
            orderId,
            snapToken,
            redirectUrl,
            paymentStatus: 'pending',
        };
    }
    catch (midtransErr) {
        // Rollback: mark payment failed & release slot lock
        const nowIso = new Date().toISOString();
        await db.runTransaction(async (t) => {
            t.update(paymentRef, {
                status: 'failed',
                errorMessage: 'Gagal membuat transaksi Midtrans Sandbox',
                updatedAt: nowIso,
            });
            t.update(bookingRef, {
                paymentStatus: 'failed',
                updatedAt: nowIso,
            });
            t.delete(slotLockRef);
        });
        throw new https_1.HttpsError('internal', 'Gagal menghubungkan ke layanan pembayaran Midtrans. Silakan coba lagi.');
    }
});
//# sourceMappingURL=create-booking-payment.js.map