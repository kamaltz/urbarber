/**
 * Payment Feature Types
 */

import type { PaymentRecord, PaymentStatus as DomainPaymentStatus } from '@/types/domain';

export type PaymentStatus = DomainPaymentStatus;
export type Payment = PaymentRecord;

export interface CreateBookingPaymentRequest {
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  address: string;
  notes?: string;
}

/**
 * Batch 10B-5F: mirrors the actual POST /api/payments/create response
 * (backend/vercel/api/payments.ts) -- it returns `paymentUrl`, never
 * `redirectUrl`/`snapToken`/`paymentStatus`. The idempotent existing-request
 * path can return `paymentUrl: null`, so callers must not assume a string.
 */
export interface CreateBookingPaymentResponse {
  success?: boolean;
  bookingId: string;
  orderId: string;
  amount?: number;
  paymentUrl: string | null;
  message?: string;
}

export interface SyncPaymentStatusResponse {
  success: boolean;
  paymentStatus: PaymentStatus;
  bookingStatus: string;
}
