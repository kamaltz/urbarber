/**
 * Firebase Payments Repository
 * Client data access layer for initiating Midtrans Snap payments, syncing status, and real-time payment document subscriptions.
 */

import { firebaseFunctions, firestore } from '@/lib/firebase';
import type { PaymentRecord } from '@/types/domain';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import type {
  CreateBookingPaymentRequest,
  CreateBookingPaymentResponse,
  SyncPaymentStatusResponse,
} from '../types/payment';

class PaymentRepository {
  /**
   * Create booking payment via Cloud Functions
   */
  async createBookingPayment(
    payload: CreateBookingPaymentRequest
  ): Promise<{ success: boolean; data?: CreateBookingPaymentResponse; error?: any }> {
    try {
      const callable = httpsCallable<CreateBookingPaymentRequest, CreateBookingPaymentResponse>(
        firebaseFunctions,
        'createBookingPayment'
      );
      const res = await callable(payload);
      return {
        success: true,
        data: res.data,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[PaymentRepository createBookingPayment Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: {
          code: error?.code || 'PAYMENT_CREATION_FAILED',
          message: error?.message || 'Gagal membuat transaksi pembayaran',
        },
      };
    }
  }

  /**
   * Sync payment status from Midtrans server-side
   */
  async syncBookingPaymentStatus(
    bookingId: string
  ): Promise<{ success: boolean; data?: SyncPaymentStatusResponse; error?: any }> {
    try {
      if (!bookingId) {
        return { success: false, error: { message: 'bookingId tidak valid' } };
      }
      const callable = httpsCallable<{ bookingId: string }, SyncPaymentStatusResponse>(
        firebaseFunctions,
        'syncBookingPaymentStatus'
      );
      const res = await callable({ bookingId });
      return {
        success: true,
        data: res.data,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[PaymentRepository syncBookingPaymentStatus Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: {
          code: error?.code || 'SYNC_FAILED',
          message: error?.message || 'Gagal menyinkronkan status pembayaran',
        },
      };
    }
  }

  /**
   * Get payment record by bookingId
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
