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

export interface CreateBookingPaymentResponse {
  bookingId: string;
  orderId: string;
  snapToken: string;
  redirectUrl: string;
  paymentStatus: PaymentStatus;
}

export interface SyncPaymentStatusResponse {
  success: boolean;
  paymentStatus: PaymentStatus;
  bookingStatus: string;
}
