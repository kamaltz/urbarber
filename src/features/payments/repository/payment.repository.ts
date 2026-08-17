/**
 * Firebase Payments Repository
 * Client data access layer for calling Vercel API endpoints and real-time payment document subscriptions.
 */

import { firestore } from '@/lib/firebase';
import type { PaymentRecord } from '@/types/domain';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import {
  paymentApiService,
  type CreateBookingPaymentPayload,
  type CreateBookingPaymentResult,
  type ValidateVoucherResult,
} from '../services/payment-api.service';
import type {
  SyncPaymentStatusResponse,
} from '../types/payment';

class PaymentRepository {
  /**
   * Create booking payment via Vercel Backend API
   */
  async createBookingPayment(
    payload: CreateBookingPaymentPayload
  ): Promise<{ success: boolean; data?: CreateBookingPaymentResult; error?: any }> {
    const res = await paymentApiService.createBookingPayment(payload);
    if (res.success) {
      return {
        success: true,
        data: res.data,
      };
    }
    return {
      success: false,
      error: res.error,
    };
  }

  /**
   * Sync payment status from Midtrans server-side via Vercel API
   */
  async syncBookingPaymentStatus(
    bookingId: string
  ): Promise<{ success: boolean; data?: SyncPaymentStatusResponse; error?: any }> {
    const res = await paymentApiService.syncBookingPaymentStatus(bookingId);
    if (res.success) {
      return {
        success: true,
        data: res.data,
      };
    }
    return {
      success: false,
      error: res.error,
    };
  }

  /**
   * Validate a voucher code for checkout preview (server re-validates
   * authoritatively again inside createBookingPayment).
   */
  async validateVoucher(
    code: string,
    serviceId: string
  ): Promise<{ success: boolean; data?: ValidateVoucherResult; error?: any }> {
    const res = await paymentApiService.validateVoucher(code, serviceId);
    if (res.success) {
      return { success: true, data: res.data };
    }
    return { success: false, error: res.error };
  }

  /**
   * Cancel booking payment via Vercel API
   */
  async cancelBookingPayment(bookingId: string, reason?: string) {
    return paymentApiService.cancelBookingPayment(bookingId, reason);
  }

  /**
   * Get payment record by bookingId from Firestore
   */
  async getPaymentRecord(bookingId: string): Promise<PaymentRecord | null> {
    try {
      if (!bookingId) return null;
      const docRef = doc(firestore, 'payments', bookingId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return {
        ...snap.data(),
        bookingId: snap.id,
      } as PaymentRecord;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[PaymentRepository getPaymentRecord Error]', error?.code, error?.message || error);
      }
      return null;
    }
  }

  /**
   * Real-time subscription for payment status updates
   */
  subscribePaymentStatus(
    bookingId: string,
    onNext: (payment: PaymentRecord | null) => void,
    onError?: (err: any) => void
  ): () => void {
    if (!bookingId) {
      onNext(null);
      return () => {};
    }

    const docRef = doc(firestore, 'payments', bookingId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          onNext(null);
        } else {
          onNext({
            ...snapshot.data(),
            bookingId: snapshot.id,
          } as PaymentRecord);
        }
      },
      (error) => {
        if (__DEV__) {
          console.warn('[PaymentRepository subscribePaymentStatus Error]', error?.code, error?.message);
        }
        if (onError) onError(error);
      }
    );
  }
}

export const paymentRepository = new PaymentRepository();
