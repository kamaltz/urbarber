/**
 * Firebase Booking Repository
 * Data access layer for booking operations
 */

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { mapLegacyBookingStatus, BookingStatus } from '@/types/domain';
import { Booking, BookingReview, CouponCode, TimeSlotAvailability } from '../types/booking';

class BookingRepository {
  /**
   * Get active bookings for a customer (pending, accepted, in_progress)
   */
  async getActiveBookings(customerId: string): Promise<Booking[]> {
    try {
      if (!customerId) return [];

      const q = query(
        collection(firestore, 'bookings'),
        where('customerId', '==', customerId),
        where('status', 'in', ['pending', 'accepted', 'in_progress']),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          status: mapLegacyBookingStatus(data.status),
        } as Booking;
      });
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository getActiveBookings Error]', error?.code, error?.message || error);
      }
      return [];
    }
  }

  /**
   * Get booking history for a customer (completed, cancelled, rejected)
   */
  async getBookingHistory(customerId: string): Promise<Booking[]> {
    try {
      if (!customerId) return [];

      const q = query(
        collection(firestore, 'bookings'),
        where('customerId', '==', customerId),
        where('status', 'in', ['completed', 'cancelled', 'rejected']),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          status: mapLegacyBookingStatus(data.status),
        } as Booking;
      });
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository getBookingHistory Error]', error?.code, error?.message || error);
      }
      return [];
    }
  }

  /**
   * Get booking detail by ID
   */
  async getBookingDetail(bookingId: string): Promise<Booking | null> {
    try {
      if (!bookingId) return null;

      const docRef = doc(firestore, 'bookings', bookingId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        ...data,
        id: snapshot.id,
        status: mapLegacyBookingStatus(data.status),
      } as Booking;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository getBookingDetail Error]', error?.code, error?.message || error);
      }
      return null;
    }
  }

  /**
   * Get available time slots for a specific date and barber
   */
  async getAvailableSlots(barberId: string, date: string): Promise<TimeSlotAvailability> {
    try {
      if (!barberId || !date) return { date, slots: [] };

      const q = query(
        collection(firestore, 'barberSchedules'),
        where('barberId', '==', barberId),
        where('date', '==', date),
      );

      const snapshot = await getDocs(q);
      const scheduleDoc = snapshot.docs[0];

      if (!scheduleDoc) {
        return { date, slots: [] };
      }

      const scheduleData = scheduleDoc.data();
      return {
        date,
        slots: scheduleData.availableSlots || [],
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository getAvailableSlots Error]', error?.code, error?.message || error);
      }
      return { date, slots: [] };
    }
  }

  /**
   * Create a new booking (initial status strictly 'pending')
   */
  async createBooking(bookingData: any): Promise<{ success: boolean; bookingId?: string; error?: any }> {
    try {
      if (!bookingData.barberId || !bookingData.customerId) {
        return {
          success: false,
          error: { code: 'INVALID_DATA', message: 'Data booking tidak lengkap' },
        };
      }

      const booking = {
        ...bookingData,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(firestore, 'bookings'), booking);

      return {
        success: true,
        bookingId: docRef.id,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository createBooking Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: error?.message || 'Gagal membuat booking' },
      };
    }
  }

  /**
   * Cancel a booking (transition allowed from 'pending' or 'accepted' to 'cancelled')
   */
  async cancelBooking(bookingId: string): Promise<{ success: boolean; error?: any }> {
    try {
      const booking = await this.getBookingDetail(bookingId);

      if (!booking) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Booking tidak ditemukan' },
        };
      }

      if (!['pending', 'accepted'].includes(booking.status)) {
        return {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Booking tidak dapat dibatalkan dalam status saat ini' },
        };
      }

      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository cancelBooking Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { code: 'CANCEL_FAILED', message: error?.message || 'Gagal membatalkan booking' },
      };
    }
  }

  /**
   * Update booking status with canonical validation
   */
  async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const booking = await this.getBookingDetail(bookingId);

      if (!booking) {
        return {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Booking tidak ditemukan' },
        };
      }

      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository updateBookingStatus Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: error?.message || 'Gagal mengupdate booking' },
      };
    }
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(code: string): Promise<CouponCode | null> {
    try {
      if (!code) return null;
      const docRef = doc(firestore, 'coupons', code);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data() as any;
      return {
        code: data.code,
        discount: data.discount,
        description: data.description,
        isValid: data.isValid ?? true,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository validateCoupon Error]', error?.code, error?.message || error);
      }
      return null;
    }
  }

  /**
   * Submit booking review
   */
  async submitReview(bookingId: string, reviewData: any): Promise<{ success: boolean; error?: any }> {
    try {
      if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
        return {
          success: false,
          error: { code: 'INVALID_RATING', message: 'Rating harus antara 1-5' },
        };
      }

      const review = {
        bookingId,
        customerId: reviewData.customerId,
        barberId: reviewData.barberId,
        rating: reviewData.rating,
        reviewText: reviewData.reviewText || '',
        tags: reviewData.tags || [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(firestore, 'reviews'), review);

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository submitReview Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { code: 'REVIEW_FAILED', message: error?.message || 'Gagal mengirim review' },
      };
    }
  }

  /**
   * Get review for a booking
   */
  async getBookingReview(bookingId: string): Promise<BookingReview | null> {
    try {
      if (!bookingId) return null;

      const q = query(
        collection(firestore, 'reviews'),
        where('bookingId', '==', bookingId),
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const data = snapshot.docs[0].data();
      return {
        id: snapshot.docs[0].id,
        bookingId: data.bookingId,
        customerId: data.customerId,
        rating: data.rating,
        reviewText: data.reviewText,
        tags: data.tags || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as BookingReview;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository getBookingReview Error]', error?.code, error?.message || error);
      }
      return null;
    }
  }

  /**
   * Confirm booking creation (deterministic, no payment gateway or fake simulation)
   */
  async processPayment(bookingId: string, paymentData: any): Promise<{ success: boolean; error?: any }> {
    try {
      if (!bookingId || !paymentData.method) {
        return {
          success: false,
          error: { code: 'INVALID_PAYMENT', message: 'Data pesanan tidak lengkap' },
        };
      }

      // Update booking directly with payment method and canonical pending status
      await updateDoc(doc(firestore, 'bookings', bookingId), {
        paymentMethod: paymentData.method,
        status: 'pending',
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository processPayment Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { code: 'CONFIRMATION_ERROR', message: error?.message || 'Gagal mengonfirmasi booking' },
      };
    }
  }
}

export const bookingRepository = new BookingRepository();
