/**
 * Unit Tests for PaymentRepository.createBookingPayment (Batch 10B-5F)
 * Regression guard: POST /api/payments/create actually returns `paymentUrl`
 * (backend/vercel/api/payments.ts), never `redirectUrl`/`snapToken`/
 * `paymentStatus`. The frontend types previously declared those non-existent
 * fields, so `res.data.redirectUrl` was always undefined even on a genuinely
 * successful create -- the Pay button stayed disabled forever despite a real
 * Midtrans transaction having been created server-side. This locks in that
 * `paymentUrl` (string or null, matching the idempotent existing-request
 * path) is the only field the client relies on.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createBookingPaymentMock } = vi.hoisted(() => ({ createBookingPaymentMock: vi.fn() }));

vi.mock('../../services/payment-api.service', () => ({
  paymentApiService: {
    createBookingPayment: (...args: unknown[]) => createBookingPaymentMock(...args),
  },
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  onSnapshot: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

import { paymentRepository } from '../payment.repository';

const BASE_PAYLOAD = {
  requestId: 'REQ-1',
  barberId: 'barber-1',
  serviceId: 'service-1',
  date: '2026-08-18',
  startTime: '12:30',
  address: 'Jl. Test No. 1',
  bookingType: 'onsite' as const,
};

describe('paymentRepository.createBookingPayment', () => {
  beforeEach(() => {
    createBookingPaymentMock.mockReset();
  });

  it('1 & 2. a successful create response carries a real paymentUrl through to the caller', async () => {
    createBookingPaymentMock.mockResolvedValue({
      success: true,
      data: {
        success: true,
        bookingId: 'booking-1',
        orderId: 'URB-booking-1',
        amount: 30000,
        paymentUrl: 'https://app.sandbox.midtrans.com/snap/v4/redirection/abc123',
      },
    });

    const result = await paymentRepository.createBookingPayment(BASE_PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.data?.paymentUrl).toBe('https://app.sandbox.midtrans.com/snap/v4/redirection/abc123');
    expect(result.data?.bookingId).toBe('booking-1');
  });

  it('3. no redirectUrl/snapToken/paymentStatus field is present on a successful response', async () => {
    createBookingPaymentMock.mockResolvedValue({
      success: true,
      data: {
        success: true,
        bookingId: 'booking-1',
        orderId: 'URB-booking-1',
        amount: 30000,
        paymentUrl: 'https://app.sandbox.midtrans.com/snap/v4/redirection/abc123',
      },
    });

    const result = await paymentRepository.createBookingPayment(BASE_PAYLOAD);

    expect(result.data).not.toHaveProperty('redirectUrl');
    expect(result.data).not.toHaveProperty('snapToken');
    expect(result.data).not.toHaveProperty('paymentStatus');
  });

  it('4. the idempotent existing-request response can carry paymentUrl: null, propagated as-is (not coerced to a fake URL)', async () => {
    createBookingPaymentMock.mockResolvedValue({
      success: true,
      data: {
        success: true,
        bookingId: 'booking-1',
        orderId: 'URB-booking-1',
        paymentUrl: null,
        message: 'Permintaan booking sudah diproses sebelumnya',
      },
    });

    const result = await paymentRepository.createBookingPayment(BASE_PAYLOAD);

    expect(result.success).toBe(true);
    expect(result.data?.paymentUrl).toBeNull();
  });

  it('a failed create surfaces the error without a data payload', async () => {
    createBookingPaymentMock.mockResolvedValue({
      success: false,
      error: { code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan.' },
    });

    const result = await paymentRepository.createBookingPayment(BASE_PAYLOAD);

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ code: 'SERVICE_NOT_FOUND', message: 'Layanan tidak ditemukan.' });
  });
});
