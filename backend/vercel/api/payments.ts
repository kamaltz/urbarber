/**
 * Consolidated Payments API Router
 *
 * Consolidates all authenticated payment operations under a single Vercel Serverless Function.
 * Routes:
 * - POST /api/payments/create
 * - POST /api/payments/sync
 * - GET /api/payments/return
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSlotLockId } from '../src/bookings/slot-lock.js';
import { config } from '../src/config/index.js';
import { authenticateRequest } from '../src/lib/auth-middleware.js';
import { handleCors } from '../src/lib/cors.js';
import { db } from '../src/lib/firebase-admin.js';
import { mapMidtransStatus, shouldReleaseSlot } from '../src/payments/status-mapper.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const midtransClient = require('midtrans-client');

// ============================================================================
// Types & Schemas
// ============================================================================

interface RouteContext {
  req: VercelRequest;
  res: VercelResponse;
  method: string;
  pathname: string;
}

type RouteHandler = (ctx: RouteContext) => Promise<void>;

// ============================================================================
// Route Handlers: Payments
// ============================================================================

/**
 * POST /api/payments/create
 * Create a Midtrans payment transaction for a booking
 */
async function handleCreatePayment(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

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

  const createPaymentSchema = z.object({
    requestId: z.string({ required_error: 'requestId wajib diisi.' }).min(1),
    barberId: z.string({ required_error: 'barberId wajib diisi.' }).min(1),
    serviceId: z.string({ required_error: 'serviceId wajib diisi.' }).min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
    startTime: z.string().min(1, 'startTime wajib diisi.'),
    address: z.string().min(1, 'address wajib diisi.'),
    notes: z.string().optional().default(''),
  });

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

  try {
    // Check if request already exists (idempotency)
    const existingBooking = await db
      .collection('bookings')
      .where('customerId', '==', customerId)
      .where('requestId', '==', requestId)
      .limit(1)
      .get();

    if (!existingBooking.empty) {
      const existing = existingBooking.docs[0].data();
      res.status(200).json({
        success: true,
        bookingId: existingBooking.docs[0].id,
        status: existing.status,
        paymentUrl: existing.paymentUrl || null,
        message: 'Permintaan booking sudah diproses sebelumnya',
      });
    }

    // Get service details for pricing
    const serviceSnap = await db.collection('services').doc(serviceId).get();
    if (!serviceSnap.exists) {
      res.status(404).json({
        error: { code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan.' },
      });
    }

    const serviceData = serviceSnap.data() || {};
    const price = serviceData.price || 0;

    // Lock the slot
    const slotLockId = getSlotLockId(barberId, date, startTime);
    const slotLockRef = db.collection('slotLocks').doc(slotLockId);
    const lockSnap = await slotLockRef.get();

    if (lockSnap.exists && lockSnap.data()?.customerId !== customerId) {
      res.status(409).json({
        error: {
          code: 'SLOT_NOT_AVAILABLE',
          message: 'Slot waktu telah diambil oleh pengguna lain.',
        },
      });
    }

    const timestamp = new Date().toISOString();

    // Create slot lock
    await slotLockRef.set({
      barberId,
      date,
      startTime,
      customerId,
      createdAt: timestamp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiry
    });

    // Create booking record
    const bookingRef = db.collection('bookings').doc();
    const bookingId = bookingRef.path.split('/').pop()!;

    const bookingData = {
      id: bookingId,
      customerId,
      barberId,
      serviceId,
      requestId,
      date,
      startTime,
      address,
      notes,
      price,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      paymentUrl: null as string | null,
    };

    await bookingRef.set(bookingData);

    // Create Midtrans transaction
    const snap = new midtransClient.Snap({
      isProduction: config.midtransIsProduction || false,
      serverKey: config.midtransServerKey,
    });

    const orderId = `URB-${bookingId}`;
    const transactionDetails = {
      order_id: orderId,
      gross_amount: Math.round(price),
    };

    const customerDetails = {
      customer_details: {
        email: authUser.email || customerId,
        customer_id: customerId,
      },
    };

    const transactionData = {
      ...transactionDetails,
      ...customerDetails,
    };

    try {
      const transaction = await snap.createTransaction(transactionData);
      const paymentUrl = transaction.redirect_url;

      // Save payment record
      const paymentRef = db.collection('payments').doc(bookingId);
      await paymentRef.set({
        bookingId,
        customerId,
        orderId,
        amount: price,
        currency: 'IDR',
        method: 'midtrans_sandbox',
        status: 'pending',
        transactionId: transaction.transaction_id,
        createdAt: timestamp,
        updatedAt: timestamp,
        paymentUrl,
      });

      // Update booking with payment URL
      await bookingRef.update({ paymentUrl });

      res.status(201).json({
        success: true,
        bookingId,
        orderId,
        amount: price,
        paymentUrl,
        message: 'Transaksi pembayaran berhasil dibuat',
      });
    } catch (midtransErr: any) {
      // Rollback slot lock
      await slotLockRef.delete();
      await bookingRef.delete();

      console.error('[Create Payment] Midtrans error:', midtransErr.message);
      res.status(500).json({
        error: {
          code: 'PAYMENT_GATEWAY_ERROR',
          message: 'Gagal membuat transaksi pembayaran. Silakan coba lagi.',
        },
      });
    }
  } catch (err: any) {
    console.error('[Payments/create] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

/**
 * POST /api/payments/sync
 * Sync payment status with Midtrans
 */
async function handleSyncPayment(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  const syncPaymentSchema = z.object({
    bookingId: z.string({ required_error: 'bookingId wajib diisi.' }).min(1),
  });

  const parseResult = syncPaymentSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { bookingId } = parseResult.data;

  try {
    const paymentRef = db.collection('payments').doc(bookingId);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      res.status(404).json({
        error: { code: 'PAYMENT_NOT_FOUND', message: 'Pembayaran tidak ditemukan.' },
      });
    }

    const paymentData = paymentSnap.data() || {};
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingSnap = await bookingRef.get();
    const bookingData = bookingSnap.exists ? bookingSnap.data() || {} : null;

    if (!bookingData) {
      res.status(404).json({
        error: { code: 'BOOKING_NOT_FOUND', message: 'Pemesanan tidak ditemukan.' },
      });
      return;
    }

    // Ownership check
    if (bookingData.customerId !== authUser.uid && authUser.appRole !== 'admin') {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pembayaran ini.' },
      });
      return;
    }

    // Query Midtrans
    const snap = new midtransClient.Snap({
      isProduction: config.midtransIsProduction || false,
      serverKey: config.midtransServerKey,
    });

    const transactionId = paymentData.transactionId;
    if (!transactionId) {
      res.status(400).json({
        error: { code: 'INVALID_STATE', message: 'Transaction ID tidak ditemukan.' },
      });
      return;
    }

    const midtransStatus = await snap.transaction.status(transactionId);
    const mappedStatus = mapMidtransStatus(midtransStatus.transaction_status);

    const timestamp = new Date().toISOString();
    const updateData: Record<string, any> = {
      status: mappedStatus,
      transactionStatus: midtransStatus.transaction_status,
      updatedAt: timestamp,
    };

    if (mappedStatus === 'paid') {
      updateData.paidAt = timestamp;

      // Update booking status
      await bookingRef.update({ status: 'confirmed', updatedAt: timestamp });
    } else if (shouldReleaseSlot(mappedStatus)) {
      // Release slot for cancelled/expired payments
      const slotLockId = getSlotLockId(bookingData.barberId, bookingData.date, bookingData.startTime);
      await db.collection('slotLocks').doc(slotLockId).delete();
      await bookingRef.update({ status: 'cancelled', updatedAt: timestamp });
    }

    await paymentRef.update(updateData);

    res.status(200).json({
      success: true,
      bookingId,
      paymentStatus: mappedStatus,
      transactionStatus: midtransStatus.transaction_status,
      message: 'Status pembayaran berhasil disinkronkan',
    });
  } catch (err: any) {
    console.error('[Payments/sync] Error:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' },
    });
  }
}

/**
 * GET /api/payments/return
 * Midtrans payment return/callback page
 * Shows user-friendly status message based on transaction status
 */
async function handlePaymentReturn(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;

  const transactionStatus = (req.query.transaction_status as string) || (req.query.result as string) || 'finish';
  const orderId = (req.query.order_id as string) || '';

  const deepLink = `${config.appDeepLinkScheme || 'urbarber'}://booking/history?orderId=${encodeURIComponent(orderId)}`;

  let title = 'Pembayaran Berhasil! 🎉';
  let message = 'Terima kasih, pembayaran Anda telah diterima dan diverifikasi oleh sistem URBarber.';
  let icon = '✅';
  let iconBg = 'rgba(16, 185, 129, 0.15)';
  let iconColor = '#10B981';

  if (transactionStatus === 'unfinish' || transactionStatus === 'pending') {
    title = 'Menunggu Pembayaran ⏳';
    message = 'Transaksi Anda telah dicatat. Silakan selesaikan pembayaran sesuai instruksi.';
    icon = '⏳';
    iconBg = 'rgba(245, 158, 11, 0.15)';
    iconColor = '#F59E0B';
  } else if (transactionStatus === 'error' || transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
    title = 'Pembayaran Belum Berhasil ⚠️';
    message = 'Transaksi pembayaran tidak dapat diselesaikan atau telah dibatalkan.';
    icon = '⚠️';
    iconBg = 'rgba(239, 68, 68, 0.15)';
    iconColor = '#EF4444';
  }

  const html = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .container { background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; width: 100%; padding: 40px; text-align: center; }
        .icon { font-size: 60px; background: ${iconBg}; width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .title { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 12px; }
        .message { font-size: 16px; color: #6b7280; line-height: 1.6; margin-bottom: 32px; }
        .button { display: inline-block; background: ${iconColor}; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: all 0.3s ease; }
        .button:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(0,0,0,0.15); }
        .divider { border-top: 1px solid #e5e7eb; margin: 32px 0; }
        .note { font-size: 14px; color: #9ca3af; }
        @media (max-width: 600px) { .container { padding: 24px; } .title { font-size: 20px; } .message { font-size: 14px; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1 class="title">${title}</h1>
        <p class="message">${message}</p>
        <a href="${deepLink}" class="button">Kembali ke Aplikasi</a>
        <div class="divider"></div>
        <p class="note">Order ID: ${orderId}</p>
        <p class="note">Status: ${transactionStatus}</p>
      </div>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

// ============================================================================
// Router
// ============================================================================

const routes: Record<string, Record<string, RouteHandler>> = {
  'POST': {
    '/api/payments/create': handleCreatePayment,
    '/api/payments/sync': handleSyncPayment,
  },
  'GET': {
    '/api/payments/return': handlePaymentReturn,
  },
};

async function router(ctx: RouteContext): Promise<void> {
  const { res, method, pathname } = ctx;
  const handler = routes[method]?.[pathname];

  if (!handler) {
    // Check if OPTIONS is requested (CORS preflight)
    if (method === 'OPTIONS') {
      if (!handleCors(ctx.req, res, ['GET', 'POST', 'OPTIONS'])) return;
      res.status(204).end();
      return;
    }

    // 405 Method Not Allowed
    if (routes[method]) {
      res.status(405).json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${method} tidak diizinkan untuk rute ini.`,
        },
      });
      return;
    }

    // 404 Not Found
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Rute ${method} ${pathname} tidak ditemukan.`,
      },
    });
    return;
  }

  await handler(ctx);
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = req.url?.split('?')[0] || '/';
  const method = req.method || 'GET';

  const ctx: RouteContext = {
    req,
    res,
    method,
    pathname,
  };

  await router(ctx);
}
