/**
 * Payment API Service for Expo Client
 * Interfaces with Vercel Node.js Backend API
 */

import { firebaseAuth } from '@/lib/firebase';
import type { PaymentStatus } from '@/types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

export interface CreateBookingPaymentPayload {
  requestId: string;
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  address: string;
  notes?: string;
  bookingType: 'home' | 'onsite';
  tipAmount?: number;
  voucherCode?: string;
  /** Required whenever bookingType is 'home' -- the backend enforces this. */
  location?: { latitude: number; longitude: number };
}

/**
 * Batch 10B-5F: mirrors the actual POST /api/payments/create response --
 * it returns `paymentUrl`, never `redirectUrl`/`snapToken`/`paymentStatus`.
 * The idempotent existing-request path can return `paymentUrl: null`.
 */
export interface CreateBookingPaymentResult {
  success?: boolean;
  bookingId: string;
  orderId: string;
  amount?: number;
  baseAmount?: number;
  voucherCode?: string | null;
  voucherDiscount?: number;
  discountedBaseAmount?: number;
  homeServiceFee?: number;
  applicationFee?: number;
  tipAmount?: number;
  totalAmount?: number;
  paymentUrl: string | null;
  message?: string;
}

export interface ValidateVoucherResult {
  valid: boolean;
  voucherCode?: string;
  baseAmount?: number;
  discountAmount?: number;
  reason?: string;
  message?: string;
}

export interface SyncPaymentStatusResult {
  success: boolean;
  paymentStatus: PaymentStatus;
  bookingStatus: string;
}

export interface ApiErrorResponse {
  error?: {
    code?: string;
    message?: string;
  };
}

class PaymentApiService {
  private async getAuthToken(): Promise<string> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Pengguna tidak terautentikasi.');
    }
    return await user.getIdToken();
  }

  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: true; data: T } | { success: false; error: { code: string; message: string } }> {
    try {
      const token = await this.getAuthToken();
      const url = `${BASE_URL.replace(/\/$/, '')}${endpoint}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers as Record<string, string>),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = (await response.json()) as T & ApiErrorResponse;

      if (!response.ok) {
        const errMessage =
          json?.error?.message || `Gagal menghubungi server (${response.status})`;
        const errCode = json?.error?.code || 'API_ERROR';
        return {
          success: false,
          error: { code: errCode, message: errMessage },
        };
      }

      return { success: true, data: json as T };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: { code: 'TIMEOUT', message: 'Koneksi ke server pembayaran batas waktu (timeout).' },
        };
      }
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err?.message || 'Gagal terhubung ke layanan backend Vercel.',
        },
      };
    }
  }

  async createBookingPayment(payload: CreateBookingPaymentPayload) {
    return this.fetchWithAuth<CreateBookingPaymentResult>('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Checkout-preview only -- the backend re-validates authoritatively again on create. */
  async validateVoucher(code: string, serviceId: string) {
    return this.fetchWithAuth<ValidateVoucherResult>('/api/payments/voucher/validate', {
      method: 'POST',
      body: JSON.stringify({ code, serviceId }),
    });
  }

  async syncBookingPaymentStatus(bookingId: string) {
    return this.fetchWithAuth<SyncPaymentStatusResult>('/api/payments/sync', {
      method: 'POST',
      body: JSON.stringify({ bookingId }),
    });
  }

  async cancelBookingPayment(bookingId: string, reason?: string) {
    return this.fetchWithAuth<{ success: boolean; message: string }>('/api/bookings/cancel', {
      method: 'POST',
      body: JSON.stringify({ bookingId, reason }),
    });
  }

  /**
   * Backend-only: also atomically updates barbers/{barberId}.ratingAverage/reviewCount
   * in the same transaction (see backend/vercel/api/app.ts handleSubmitReview). A direct
   * client write to reviews/{bookingId} cannot update those aggregate fields -- self-update
   * is denied by firestore.rules -- so this must go through the backend, not Firestore directly.
   */
  async submitBookingReview(bookingId: string, payload: { rating: number; reviewText?: string; tags?: string[] }) {
    return this.fetchWithAuth<{ success: boolean; bookingId: string; message: string }>(
      `/api/bookings/${bookingId}/review`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }
}

export const paymentApiService = new PaymentApiService();
