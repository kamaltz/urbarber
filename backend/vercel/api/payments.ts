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
import { assertNoActiveBooking, CustomerHasActiveBookingError } from '../src/bookings/active-booking-guard.js';
import { calculateDistanceKm } from '../src/bookings/geo-utils.js';
import { isBarberAcceptingBookings, isHomeServiceAllowedForBarber, isServiceActive, resolveServiceLocationType } from '../src/bookings/service-booking-guard.js';
import { acquireSlotLock, getSlotLockId, SlotNotAvailableError } from '../src/bookings/slot-lock.js';
import { evaluateSlotEligibility } from '../src/bookings/slot-datetime.js';
import { config } from '../src/config/index.js';
import { authenticateRequest } from '../src/lib/auth-middleware.js';
import { handleCors } from '../src/lib/cors.js';
import { db } from '../src/lib/firebase-admin.js';
import {
  buildMidtransItemDetails,
  calculatePricing,
  HomeServiceLocationRequiredError,
  HomeServiceOutOfRangeError,
  type ResolvedVoucherForPricing,
} from '../src/payments/pricing-calculator.js';
import { getBookingPricingSettings } from '../src/payments/pricing-settings.js';
import { SyncInvalidStateError, syncPaymentStatusService } from '../src/payments/sync-payment-service.js';
import { resolveVoucherForBooking, voucherInvalidMessage } from '../src/payments/voucher-service.js';

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
    // Batch 10B-5H-C: the client's home/onsite selection (options.tsx) was
    // previously dropped at this boundary -- every payment-created booking
    // persisted neither `bookingType` nor `serviceLocationType`, so downstream
    // tracking (isHomeService in src/app/(barber)/booking/[bookingId].tsx)
    // could never recognize a real Home Service booking. Only 'home'/'onsite'
    // are ever accepted; the canonical serviceLocationType is derived
    // server-side below, never taken verbatim from client input.
    bookingType: z.enum(['home', 'onsite'], {
      required_error: 'bookingType wajib diisi.',
      invalid_type_error: 'bookingType harus home atau onsite.',
    }),
    tipAmount: z.number().min(0, 'Tip tidak boleh negatif.').optional().default(0),
    voucherCode: z.string().trim().min(1).optional(),
    // Required whenever bookingType is 'home' (checked below via superRefine) --
    // the home-service distance radius cap applies to every home booking
    // regardless of fee mode, so the customer's coordinates are always needed.
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
  }).superRefine((data, ctx) => {
    if (data.bookingType === 'home' && !data.location) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Lokasi pelanggan wajib diisi untuk booking layanan ke rumah.',
        path: ['location'],
      });
    }
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

  const { requestId, barberId, serviceId, date, startTime, address, notes, bookingType, tipAmount: rawTip, voucherCode: rawVoucherCode, location } = parseResult.data;
  const customerId = authUser.uid;
  const serviceLocationType = resolveServiceLocationType(bookingType);

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
      return;
    }

    // The requested slot must still be bookable against AUTHORITATIVE SERVER TIME,
    // not merely against whatever the client's screen last rendered. Availability
    // (GET /api/bookings/availability) already hides ineligible slots, but that is a
    // display guarantee only: a screen left open past the lead-time boundary, a
    // device with a skewed clock, or a direct API call could otherwise buy a slot in
    // the past. Checked here -- before acquireSlotLock -- so the temporary hold and
    // the booking are both governed by the same rule as the slot grid.
    //
    // Full datetime comparison (date + startTime in Asia/Jakarta vs serverNow + lead
    // time), never HH:mm against HH:mm: that keeps every future date legitimately
    // bookable (tomorrow 09:00 is valid at 14:20 today) while still enforcing the
    // lead time across midnight (tomorrow 00:00 is invalid at 23:30 tonight).
    const slotEligibility = evaluateSlotEligibility({ date, startTime });
    if (!slotEligibility.bookable) {
      res.status(400).json({
        error: { code: slotEligibility.code, message: slotEligibility.reason },
      });
      return;
    }

    // Get service details for pricing. Real services are created by barbers into
    // barberServices/{serviceId} (see src/features/barbers/repository/barber.repository.ts) --
    // there is no separate top-level "services" collection.
    const serviceSnap = await db.collection('barberServices').doc(serviceId).get();
    if (!serviceSnap.exists) {
      res.status(404).json({
        error: { code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan.' },
      });
      return;
    }

    const serviceData = serviceSnap.data() || {};

    // The service must actually belong to the barber the customer is booking --
    // otherwise price/duration could be sourced from an unrelated barber's listing.
    if (serviceData.barberId !== barberId) {
      res.status(404).json({
        error: { code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan.' },
      });
      return;
    }

    if (!isServiceActive(serviceData)) {
      res.status(404).json({
        error: { code: 'SERVICE_INACTIVE', message: 'Layanan sedang tidak aktif.' },
      });
      return;
    }

    // P0-3: a customer must not be able to pay into a booking with a barber who
    // isn't admin-approved and currently listed active -- otherwise money can be
    // taken for a barber who was never cleared (or has since been suspended) to
    // operate. This must be authoritative here, not just gated by the mobile UI.
    const barberSnap = await db.collection('barbers').doc(barberId).get();
    if (!isBarberAcceptingBookings(barberSnap.exists ? barberSnap.data() : null)) {
      res.status(403).json({
        error: {
          code: 'BARBER_NOT_AVAILABLE',
          message: 'Barber ini belum diverifikasi atau sedang tidak aktif menerima pesanan.',
        },
      });
      return;
    }

    const barberData = barberSnap.exists ? barberSnap.data() || {} : {};

    // The home-service distance radius cap applies to every home booking
    // regardless of fee mode (not just when Home Service Fee is set to
    // distance mode) -- so the customer's location is always resolved here.
    let distanceKm: number | null = null;
    if (bookingType === 'home') {
      // Home Service availability toggle (§10) -- see isHomeServiceAllowedForBarber.
      if (!isHomeServiceAllowedForBarber(barberData, bookingType)) {
        res.status(403).json({
          error: {
            code: 'HOME_SERVICE_DISABLED',
            message: 'Barber ini tidak melayani Home Service saat ini.',
          },
        });
        return;
      }

      if (!location) {
        res.status(400).json({
          error: { code: 'LOCATION_REQUIRED', message: 'Lokasi pelanggan wajib diisi untuk booking layanan ke rumah.' },
        });
        return;
      }

      const barberLat = barberData.location?.latitude;
      const barberLng = barberData.location?.longitude;
      if (typeof barberLat !== 'number' || typeof barberLng !== 'number') {
        res.status(400).json({
          error: { code: 'BARBER_LOCATION_UNAVAILABLE', message: 'Lokasi barber belum tersedia untuk booking layanan ke rumah.' },
        });
        return;
      }

      distanceKm = calculateDistanceKm(barberLat, barberLng, location.latitude, location.longitude);
      if (distanceKm === null) {
        res.status(400).json({
          error: { code: 'INVALID_LOCATION', message: 'Lokasi pelanggan tidak valid.' },
        });
        return;
      }
    }

    const roundedServicePrice = Math.max(0, Math.round(serviceData.price || 0));

    // Voucher is re-validated authoritatively here even if the client already
    // called /voucher/validate for a checkout preview -- that endpoint is
    // preview-only and never trusted for the actual charge.
    let resolvedVoucher: ResolvedVoucherForPricing | null = null;
    if (rawVoucherCode) {
      const voucherResult = await resolveVoucherForBooking(rawVoucherCode, customerId, roundedServicePrice);
      if (!voucherResult.valid) {
        res.status(400).json({
          error: {
            code: 'VOUCHER_INVALID',
            message: voucherInvalidMessage(voucherResult.reason),
            reason: voucherResult.reason,
          },
        });
        return;
      }
      resolvedVoucher = voucherResult.voucher;
    }

    const pricingSnapshot = await getBookingPricingSettings();

    let pricing;
    try {
      pricing = calculatePricing({
        serviceBasePrice: roundedServicePrice,
        bookingType,
        tipAmountInput: rawTip,
        voucher: resolvedVoucher,
        distanceKm,
        barberMaxDistanceKm: typeof barberData.serviceRadiusKm === 'number' ? barberData.serviceRadiusKm : null,
        settings: pricingSnapshot.settings,
      });
    } catch (pricingErr) {
      if (pricingErr instanceof HomeServiceOutOfRangeError) {
        res.status(400).json({ error: { code: 'DISTANCE_OUT_OF_RANGE', message: pricingErr.message } });
        return;
      }
      if (pricingErr instanceof HomeServiceLocationRequiredError) {
        res.status(400).json({ error: { code: 'LOCATION_REQUIRED', message: pricingErr.message } });
        return;
      }
      throw pricingErr;
    }

    const {
      baseAmount,
      voucherDiscount,
      discountedBaseAmount,
      homeServiceFee,
      applicationFee,
      tipAmount,
      grossAmount,
      voucherCode: appliedVoucherCode,
      applicationFeeMode,
      applicationFeeRate,
      applicationFeeFixedAmount,
      homeServiceFeeMode,
      homeServiceFeeDistanceKm,
    } = pricing;
    const totalAmount = grossAmount;

    // Lock the slot and create the booking atomically. Acquisition (read the
    // existing lock, validate it, claim it for this booking) and the booking
    // write happen inside one Firestore transaction so two concurrent requests
    // for the identical barberId+date+startTime can never both observe the slot
    // as available: Firestore's optimistic concurrency control fails and retries
    // whichever transaction commits second, so on retry it observes the lock the
    // first transaction just wrote and correctly rejects (P0-1: CRITICAL slot
    // ownership race -- see FINAL_THESIS_READINESS_AUDIT.md).
    const slotLockId = getSlotLockId(barberId, date, startTime);
    const slotLockRef = db.collection('slotLocks').doc(slotLockId);
    const bookingRef = db.collection('bookings').doc();
    const bookingId = bookingRef.id;
    const timestamp = new Date().toISOString();

    const bookingData = {
      id: bookingId,
      customerId,
      barberId,
      serviceId,
      requestId,
      date,
      startTime,
      address,
      // serviceAddress mirrors `address` under the field name the Admin
      // backend (admin.service.ts getBookingsList/getBookingDetail) already
      // reads -- without this, a paid Home Service booking's address was
      // silently invisible in Admin.
      serviceAddress: address,
      // The customer's Home Service coordinates were validated and used to
      // compute homeServiceFeeDistanceKm above, then previously discarded --
      // never persisted onto the booking document at all. That silently
      // broke every distance/ETA feature keyed off it (Booking.serviceLocation
      // in map-booking.ts, the customer tracking screen, and the Barber
      // service workspace), which always fell back to "no destination known"
      // for every real booking. null for onsite bookings, where there is no
      // customer destination to navigate to.
      location: location ?? null,
      bookingType,
      serviceLocationType,
      notes,
      // price/totalPrice preserved for legacy readers; the fee breakdown below
      // is the canonical record. price mirrors the pre-voucher base service
      // amount (barber's operational value is never affected by a voucher).
      price: baseAmount,
      baseAmount,
      voucherCode: appliedVoucherCode,
      voucherDiscount,
      discountedBaseAmount,
      homeServiceFee,
      homeServiceFeeMode,
      homeServiceFeeDistanceKm,
      applicationFee,
      applicationFeeMode,
      applicationFeeRate,
      applicationFeeFixedAmount,
      tipAmount,
      totalPrice: totalAmount,
      grossAmount: totalAmount,
      pricingSettingsVersion: pricingSnapshot.version,
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      paymentUrl: null as string | null,
    };

    try {
      await db.runTransaction(async (t) => {
        // Payment-First booking-exclusivity invariant: read before acquireSlotLock's
        // own read+write so every read in this transaction happens before any write.
        await assertNoActiveBooking(t, db, customerId);
        await acquireSlotLock(t, slotLockRef, { barberId, date, startTime, customerId });
        t.set(bookingRef, bookingData);
      });
    } catch (lockErr) {
      if (lockErr instanceof CustomerHasActiveBookingError) {
        res.status(409).json({
          error: {
            code: 'CUSTOMER_HAS_ACTIVE_BOOKING',
            message: 'Anda masih memiliki pemesanan yang sedang berlangsung. Selesaikan atau batalkan pemesanan tersebut sebelum membuat pemesanan baru.',
            bookingId: lockErr.bookingId,
            status: lockErr.status,
          },
        });
        return;
      }
      if (lockErr instanceof SlotNotAvailableError) {
        res.status(409).json({
          error: {
            code: 'SLOT_NOT_AVAILABLE',
            message: 'Slot waktu telah diambil oleh pengguna lain.',
          },
        });
        return;
      }
      throw lockErr;
    }

    // Create Midtrans transaction
    const snap = new midtransClient.Snap({
      isProduction: config.midtransIsProduction || false,
      serverKey: config.midtransServerKey,
    });

    const orderId = `URB-${bookingId}`;

    // Midtrans Snap createTransaction requires transaction_details/customer_details
    // as nested objects -- they must not be spread at the top level.
    const itemDetails = buildMidtransItemDetails(pricing, serviceId, String(serviceData.name || 'Layanan Barber'));

    const itemDetailsSum = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (itemDetailsSum !== totalAmount) {
      // Must never happen given the formula above -- if it does, refuse to send
      // a mismatched payload to Midtrans rather than risk under/over-charging.
      await slotLockRef.delete();
      await bookingRef.delete();
      console.error('[Create Payment] item_details/gross_amount mismatch', { itemDetailsSum, totalAmount, bookingId });
      res.status(500).json({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal saat menghitung total pembayaran.' },
      });
      return;
    }

    const transactionData = {
      transaction_details: {
        order_id: orderId,
        gross_amount: totalAmount,
      },
      customer_details: {
        email: authUser.email || customerId,
        customer_id: customerId,
      },
      item_details: itemDetails,
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
        amount: totalAmount,
        grossAmount: totalAmount,
        baseAmount,
        voucherCode: appliedVoucherCode,
        voucherDiscount,
        discountedBaseAmount,
        homeServiceFee,
        homeServiceFeeMode,
        homeServiceFeeDistanceKm,
        applicationFee,
        applicationFeeMode,
        applicationFeeRate,
        applicationFeeFixedAmount,
        tipAmount,
        pricingSettingsVersion: pricingSnapshot.version,
        currency: 'IDR',
        method: 'midtrans_sandbox',
        // Admin's transaction list (admin.service.ts getTransactionsList) filters
        // on this field -- it was never written here, so no payment-created
        // transaction could ever appear in Admin regardless of status.
        environment: config.midtransIsProduction ? 'production' : 'sandbox',
        status: 'initiated',
        // Snap's createTransaction response only returns { token, redirect_url } --
        // transaction_id isn't assigned by Midtrans until a payment attempt occurs
        // (visible later via webhook/Get Status), so it may legitimately be absent here.
        transactionId: transaction.transaction_id || null,
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
        amount: totalAmount,
        baseAmount,
        voucherCode: appliedVoucherCode,
        voucherDiscount,
        discountedBaseAmount,
        homeServiceFee,
        applicationFee,
        tipAmount,
        totalAmount,
        grossAmount: totalAmount,
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
 * POST /api/payments/voucher/validate
 * Checkout-preview only -- re-validated authoritatively again inside
 * POST /api/payments/create, never trusted from this call alone.
 */
async function handleValidateVoucher(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const authUser = await authenticateRequest(req, res);
  if (!authUser) return;

  if (authUser.appRole !== 'customer' && authUser.appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun pelanggan yang dapat menggunakan voucher.' },
    });
    return;
  }

  const validateVoucherSchema = z.object({
    code: z.string({ required_error: 'code wajib diisi.' }).min(1),
    serviceId: z.string({ required_error: 'serviceId wajib diisi.' }).min(1),
  });

  const parseResult = validateVoucherSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: { code: 'INVALID_ARGUMENT', message: parseResult.error.issues.map((i) => i.message).join(', ') },
    });
    return;
  }

  const { code, serviceId } = parseResult.data;

  try {
    const serviceSnap = await db.collection('barberServices').doc(serviceId).get();
    if (!serviceSnap.exists) {
      res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan.' } });
      return;
    }

    const baseAmount = Math.max(0, Math.round(serviceSnap.data()?.price || 0));
    const result = await resolveVoucherForBooking(code, authUser.uid, baseAmount);

    if (!result.valid) {
      res.status(200).json({
        valid: false,
        reason: result.reason,
        message: voucherInvalidMessage(result.reason),
      });
      return;
    }

    const discount =
      result.voucher.discountType === 'fixed'
        ? Math.max(0, Math.min(result.voucher.discountValue, baseAmount))
        : Math.max(
            0,
            Math.min(
              Math.round((baseAmount * result.voucher.discountValue) / 100),
              result.voucher.maxDiscountAmount ?? Infinity,
              baseAmount
            )
          );

    res.status(200).json({
      valid: true,
      voucherCode: result.voucher.code,
      baseAmount,
      discountAmount: discount,
    });
  } catch (err: any) {
    console.error('[Payments/voucher/validate] Error:', err.message);
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
      return;
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

    // Midtrans query + reconciliation (fraud_status-aware status mapping, atomic
    // slot finalization, evidence-gated corruption recovery, and the
    // P1_SYNC_UNOPENED_SNAP_500 unrecognized-transaction handling) lives in
    // sync-payment-service.ts -- see Batch 09E-P0/09F-1 for the incidents this
    // guards against.
    const result = await syncPaymentStatusService(bookingId, bookingData, paymentData);

    res.status(200).json({ ...result, bookingId });
  } catch (err: any) {
    if (err instanceof SyncInvalidStateError) {
      res.status(400).json({ error: { code: 'INVALID_STATE', message: err.message } });
      return;
    }

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
    '/api/payments/voucher/validate': handleValidateVoucher,
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
