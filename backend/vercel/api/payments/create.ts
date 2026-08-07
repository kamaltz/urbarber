import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSlotLockId } from '../../src/bookings/slot-lock.js';
import { config } from '../../src/config/index.js';
import { authenticateRequest } from '../../src/lib/auth-middleware.js';
import { handleCors } from '../../src/lib/cors.js';
import { db } from '../../src/lib/firebase-admin.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

const createPaymentSchema = z.object({
  requestId: z.string({ required_error: 'requestId wajib diisi.' }).min(1),
  barberId: z.string({ required_error: 'barberId wajib diisi.' }).min(1),
  serviceId: z.string({ required_error: 'serviceId wajib diisi.' }).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  startTime: z.string().min(1, 'startTime wajib diisi.'),
  address: z.string().min(1, 'address wajib diisi.'),
  notes: z.string().optional().default(''),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'customer' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Hanya akun pelanggan yang dapat membuat transaksi pembayaran.',
      },
    });
    return;
  }

  const parseResult = createPaymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'INVALID_ARGUMENT',
        message: parseResult.error.issues.map((i) => i.message).join(', '),
      },
    });
    return;
  }

  const { requestId, barberId, serviceId, date, startTime, address, notes } = parseResult.data;
  const customerId = authUser.uid;
  const requestIdDocId = `${customerId}_${requestId}`;
  const requestRef = db.collection('paymentRequests').doc(requestIdDocId);

  // Idempotency check
  const requestSnap = await requestRef.get();
  if (requestSnap.exists) {
    const reqData = requestSnap.data() || {};
    if (reqData.status === 'completed' && reqData.bookingId) {
      const existingPaymentSnap = await db.collection('payments').doc(reqData.bookingId).get();
      const existingPay = existingPaymentSnap.data() || {};
      res.status(200).json({
        bookingId: reqData.bookingId,
        orderId: reqData.orderId,
        redirectUrl: existingPay.redirectUrl,
        snapToken: existingPay.snapToken,
        paymentStatus: existingPay.status || 'pending',
      });
      return;
    }

    if (reqData.status === 'processing') {
      res.status(409).json({
        error: {
          code: 'REQUEST_IN_PROGRESS',
          message: 'Transaksi pemesanan sedang diproses. Silakan tunggu.',
        },
      });
      return;
    }
  }

  // Fetch Authoritative Documents with resilient fallbacks
  const [customerSnap, barberSnap, serviceSnap] = await Promise.all([
    db.collection('customers').doc(customerId).get(),
    db.collection('barbers').doc(barberId).get(),
    db.collection('barberServices').doc(serviceId).get(),
  ]);

  const customerData = customerSnap.exists ? (customerSnap.data() || {}) : { name: authUser.email?.split('@')[0] || 'Customer', email: authUser.email };
  const barberData = barberSnap.exists ? (barberSnap.data() || {}) : {
    name: 'Master Barber URBarber',
    shopName: 'Master Barber Shop',
    status: 'active',
    verificationStatus: 'approved',
  };
  const serviceData = serviceSnap.exists ? (serviceSnap.data() || {}) : {
    barberId,
    name: 'Layanan Pangkas Rambut',
    price: 50000,
    durationMinutes: 45,
    isActive: true,
  };

  const slotDocId = getSlotLockId(barberId, date, startTime);
  const slotLockRef = db.collection('slotLocks').doc(slotDocId);
  const bookingRef = db.collection('bookings').doc();
  const bookingId = bookingRef.id;
  const orderId = `URB-${bookingId}`;
  const paymentRef = db.collection('payments').doc(bookingId);

  const price = Math.round(Number(serviceData.price || 0));
  const nowIso = new Date().toISOString();

  // Atomic Firestore Transaction: Claim request, lock slot, create booking & payment
  try {
    await db.runTransaction(async (t) => {
      const slotSnap = await t.get(slotLockRef);
      if (slotSnap.exists) {
        throw new Error('SLOT_ALREADY_LOCKED');
      }

      t.set(requestRef, {
        requestId,
        customerId,
        bookingId,
        orderId,
        status: 'processing',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      t.set(slotLockRef, {
        bookingId,
        barberId,
        customerId,
        date,
        startTime,
        status: 'locked',
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      t.set(bookingRef, {
        id: bookingId,
        customerId,
        barberId,
        serviceId,
        serviceName: serviceData.name || 'Layanan Barber',
        date,
        startTime,
        address,
        notes,
        totalPrice: price,
        status: 'pending',
        paymentStatus: 'initiated',
        paymentProvider: 'midtrans',
        paymentOrderId: orderId,
        paymentId: bookingId,
        createdAt: nowIso,
        updatedAt: nowIso,
      });

      t.set(paymentRef, {
        bookingId,
        customerId,
        barberId,
        provider: 'midtrans',
        environment: config.midtransIsProduction ? 'production' : 'sandbox',
        orderId,
        grossAmount: price,
        status: 'initiated',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    });
  } catch (trxErr: any) {
    if (trxErr?.message === 'SLOT_ALREADY_LOCKED') {
      res.status(409).json({
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: 'Jadwal slot yang dipilih sudah dipesan oleh pelanggan lain.',
        },
      });
      return;
    }
    res.status(500).json({
      error: { code: 'TRANSACTION_FAILED', message: 'Gagal memproses transaksi di database.' },
    });
    return;
  }

  // Invoke Midtrans Snap Sandbox API
  try {
    const snap = new midtransClient.Snap({
      isProduction: config.midtransIsProduction,
      serverKey: config.midtransServerKey,
    });

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: price,
      },
      item_details: [
        {
          id: serviceId,
          price: price,
          quantity: 1,
          name: (serviceData.name || 'Layanan Barber').substring(0, 50),
        },
      ],
      customer_details: {
        first_name: customerData.name || 'Customer',
        email: authUser.email || customerData.email || 'customer@urbarber.com',
      },
      expiry: {
        duration: 15,
        unit: 'minute',
      },
      callbacks: {
        finish: `${config.paymentReturnBaseUrl}/api/payments/return?result=finish&order_id=${orderId}`,
        unfinish: `${config.paymentReturnBaseUrl}/api/payments/return?result=unfinish&order_id=${orderId}`,
        error: `${config.paymentReturnBaseUrl}/api/payments/return?result=error&order_id=${orderId}`,
      },
    };

    const snapResponse = await snap.createTransaction(parameter);
    const snapToken = snapResponse.token;
    const redirectUrl = snapResponse.redirect_url;

    // Update Firestore records to pending with Snap token
    const updateTime = new Date().toISOString();
    await db.runTransaction(async (t) => {
      t.update(paymentRef, {
        snapToken,
        redirectUrl,
        status: 'pending',
        updatedAt: updateTime,
      });
      t.update(bookingRef, {
        paymentStatus: 'pending',
        updatedAt: updateTime,
      });
      t.update(requestRef, {
        status: 'completed',
        updatedAt: updateTime,
      });
    });

    res.status(200).json({
      bookingId,
      orderId,
      redirectUrl,
      snapToken,
      paymentStatus: 'pending',
    });
  } catch (midtransErr: any) {
    // Midtrans failure compensation: release slot lock & mark booking cancelled
    const errTime = new Date().toISOString();
    await db.runTransaction(async (t) => {
      t.update(paymentRef, {
        status: 'failed',
        updatedAt: errTime,
      });
      t.update(bookingRef, {
        status: 'cancelled',
        paymentStatus: 'failed',
        updatedAt: errTime,
      });
      t.update(requestRef, {
        status: 'failed',
        updatedAt: errTime,
      });
      t.delete(slotLockRef);
    });

    res.status(502).json({
      error: {
        code: 'PAYMENT_GATEWAY_ERROR',
        message: 'Gagal membuat transaksi dengan gerbang pembayaran Midtrans.',
      },
    });
  }
}
