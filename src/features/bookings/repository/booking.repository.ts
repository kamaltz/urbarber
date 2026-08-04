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
import { Booking, BookingReview, CouponCode, TimeSlotAvailability } from '../types/booking';

class BookingRepository {
  /**
   * Get all active bookings
   */
  async getActiveBookings(customerId: string): Promise<Booking[]> {
    try {
      const q = query(
        collection(firestore, 'bookings'),
        where('customerId', '==', customerId),
        where('status', 'in', ['booked', 'waiting', 'on_process']),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Booking[];
    } catch (error) {
      console.error('Error fetching active bookings:', error);
      return [];
    }
  }

  /**
   * Get booking history (past bookings)
   */
  async getBookingHistory(customerId: string): Promise<Booking[]> {
    try {
      const q = query(
        collection(firestore, 'bookings'),
        where('customerId', '==', customerId),
        where('status', 'in', ['finished', 'cancelled']),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Booking[];
    } catch (error) {
      console.error('Error fetching booking history:', error);
      return [];
    }
  }

  /**
   * Get booking detail by ID
   */
  async getBookingDetail(bookingId: string): Promise<Booking | null> {
    try {
      const docRef = doc(firestore, 'bookings', bookingId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return {
        ...snapshot.data(),
        id: snapshot.id,
      } as Booking;
    } catch (error) {
      console.error('Error fetching booking detail:', error);
      return null;
    }
  }

  /**
   * Get available time slots for a specific date and barber
   */
  async getAvailableSlots(barberId: string, date: string): Promise<TimeSlotAvailability> {
    try {
      const q = query(
        collection(firestore, 'barberSchedules'),
        where('barberId', '==', barberId),
        where('date', '==', date),
      );

      const snapshot = await getDocs(q);
      const scheduleDoc = snapshot.docs[0];

      if (!scheduleDoc) {
        // Return default empty slots
        return { date, slots: [] };
      }

      const scheduleData = scheduleDoc.data();
      return {
        date,
        slots: scheduleData.availableSlots || [],
      };
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return { date, slots: [] };
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: any): Promise<{ success: boolean; bookingId?: string; error?: any }> {
    try {
      if (!bookingData.barberId || !bookingData.customerId || !bookingData.services?.length) {
        return {
          success: false,
          error: { code: 'INVALID_DATA', message: 'Data booking tidak lengkap' },
        };
      }

      const booking = {
        ...bookingData,
        status: 'waiting',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(firestore, 'bookings'), booking);

      return {
        success: true,
        bookingId: docRef.id,
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: 'Gagal membuat booking' },
      };
    }
  }

  /**
   * Cancel a booking
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

      if (!['booked', 'waiting'].includes(booking.status)) {
        return {
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Booking tidak bisa dibatalkan' },
        };
      }

      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { code: 'CANCEL_FAILED', message: 'Gagal membatalkan booking' },
      };
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: string,
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
    } catch (error) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Gagal mengupdate booking' },
      };
    }
  }

  /**
   * Validate coupon code
   */
  async validateCoupon(code: string): Promise<CouponCode | null> {
    try {
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
    } catch (error) {
      console.error('Error validating coupon:', error);
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
    } catch (error) {
      return {
        success: false,
        error: { code: 'REVIEW_FAILED', message: 'Gagal mengirim review' },
      };
    }
  }

  /**
   * Get review for a booking
   */
  async getBookingReview(bookingId: string): Promise<BookingReview | null> {
    try {
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
        createdAt: data.createdAt?.toDate().toISOString() || new Date().toISOString(),
      } as BookingReview;
    } catch (error) {
      console.error('Error fetching booking review:', error);
      return null;
    }
  }

  /**
   * Process payment
   */
  async processPayment(bookingId: string, paymentData: any): Promise<{ success: boolean; error?: any }> {
    try {
      if (!bookingId || !paymentData.method) {
        return {
          success: false,
          error: { code: 'INVALID_PAYMENT', message: 'Data pembayaran tidak lengkap' },
        };
      }

      // Create payment record in Firestore
      const payment = {
        bookingId,
        method: paymentData.method,
        amount: paymentData.amount,
        status: 'pending',
        createdAt: Timestamp.now(),
      };

      const paymentRef = await addDoc(collection(firestore, 'payments'), payment);

      // In production, integrate with payment gateway (Stripe, Midtrans, etc.)
      // For now, simulate successful payment
      const success = Math.random() > 0.1;

      if (success) {
        await updateDoc(doc(firestore, 'payments', paymentRef.id), {
          status: 'completed',
          completedAt: Timestamp.now(),
        });

        await updateDoc(doc(firestore, 'bookings', bookingId), {
          paymentMethod: paymentData.method,
          status: 'booked',
          updatedAt: Timestamp.now(),
        });

        return { success: true };
      } else {
        await updateDoc(doc(firestore, 'payments', paymentRef.id), {
          status: 'failed',
          failedAt: Timestamp.now(),
        });

        return {
          success: false,
          error: { code: 'PAYMENT_FAILED', message: 'Pembayaran gagal, silakan coba lagi' },
        };
      }
    } catch (error) {
      return {
        success: false,
        error: { code: 'PAYMENT_ERROR', message: 'Error memproses pembayaran' },
      };
    }
  }
}

export const bookingRepository = new BookingRepository();
