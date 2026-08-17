/**
 * Firebase Booking Repository
 * Data access layer for booking operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { BookingStatus } from '@/types/domain';
import { paymentApiService } from '@/features/payments/services/payment-api.service';
import { availabilityApiService } from '../api/availability-api.service';
import { mapRawBookingToDomain } from '../utils/map-booking';
import { Booking, BookingReview, TimeSlotAvailability } from '../types/booking';

class BookingRepository {
  /**
   * Resolves raw bookings/{id} documents into the canonical Booking domain
   * shape, batch-fetching each unique barberId/serviceId once (barbers and
   * barberServices docs are public-readable -- see firestore.rules) rather
   * than per-booking, then mapping via mapRawBookingToDomain. See
   * src/features/bookings/utils/map-booking.ts for why this resolution is
   * necessary: the raw persisted shape has no shop/barber/services objects.
   */
  private async resolveBookingsDomain(raw: { id: string; data: Record<string, any> }[]): Promise<Booking[]> {
    const barberIds = Array.from(new Set(raw.map((r) => r.data.barberId).filter((v): v is string => Boolean(v))));
    const serviceIds = Array.from(new Set(raw.map((r) => r.data.serviceId).filter((v): v is string => Boolean(v))));

    const [barberDocs, serviceDocs] = await Promise.all([
      Promise.all(barberIds.map((id) => getDoc(doc(firestore, 'barbers', id)).catch(() => null))),
      Promise.all(serviceIds.map((id) => getDoc(doc(firestore, 'barberServices', id)).catch(() => null))),
    ]);

    const barberMap = new Map<string, Record<string, any>>();
    barberIds.forEach((id, i) => {
      if (barberDocs[i]?.exists()) barberMap.set(id, barberDocs[i]!.data()!);
    });

    const serviceMap = new Map<string, Record<string, any>>();
    serviceIds.forEach((id, i) => {
      if (serviceDocs[i]?.exists()) serviceMap.set(id, serviceDocs[i]!.data()!);
    });

    return raw.map(({ id, data }) =>
      mapRawBookingToDomain(id, data, barberMap.get(data.barberId), serviceMap.get(data.serviceId))
    );
  }

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
      const raw = snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }));
      return await this.resolveBookingsDomain(raw);
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
      const raw = snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() }));
      return await this.resolveBookingsDomain(raw);
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

      const [mapped] = await this.resolveBookingsDomain([{ id: snapshot.id, data: snapshot.data() }]);
      return mapped;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BookingRepository getBookingDetail Error]', error?.code, error?.message || error);
      }
      return null;
    }
  }

  /**
   * Get available time slots for a specific date and barber.
   *
   * Batch 09D-S P0 fix: previously ran a direct client Firestore query
   * (where('barberId','==',barberId) across ALL of that barber's bookings), which is
   * incompatible with participant-only booking read rules and could leak other
   * customers' booking documents. Availability is now computed by the trusted Vercel
   * backend (GET /api/bookings/availability), which returns only {time, available}
   * pairs -- schedule confirmation checks, working-hours resolution, and slot
   * generation all happen server-side via the Admin SDK.
   */
  async getAvailableSlots(
    barberId: string,
    date: string,
    options?: { serviceDurationMinutes?: number; isHomeService?: boolean }
  ): Promise<TimeSlotAvailability & { error?: string }> {
    try {
      if (!barberId || !date) return { date, slots: [] };

      const result = await availabilityApiService.getAvailability(barberId, date, options);

      if (!result.success) {
        if (__DEV__) {
          console.warn('[BookingRepository getAvailableSlots API error]', result.error.code, result.error.message);
        }
        return { date, slots: [] };
      }

      if (result.data.error) {
        return { date, slots: [], error: result.data.error };
      }

      return {
        date,
        slots: result.data.slots.map((s) => ({
          id: `slot-${date}-${s.time}`,
          time: s.time,
          available: s.available,
        })),
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
   * Uses Firestore transaction to enforce slot-lock availability concurrently (Section D).
   */
  async createBooking(bookingData: any): Promise<{ success: boolean; bookingId?: string; error?: any }> {
    try {
      if (!bookingData.barberId || !bookingData.customerId) {
        return {
          success: false,
          error: { code: 'INVALID_DATA', message: 'Data booking tidak lengkap' },
        };
      }

      const targetDate = bookingData.date || bookingData.bookingDate || bookingData.scheduledAt?.split('T')?.[0];
      const targetTime = bookingData.startTime || bookingData.scheduledTime;

      // Execute atomic transaction check for concurrent slot locking
      let newBookingId = '';

      await runTransaction(firestore, async (transaction) => {
        // Query existing active bookings for the same barber & date
        const qBookings = query(
          collection(firestore, 'bookings'),
          where('barberId', '==', bookingData.barberId),
          where('status', 'in', ['pending', 'accepted', 'in_progress'])
        );

        const snapshot = await getDocs(qBookings);
        const conflictingDoc = snapshot.docs.find((docSnap) => {
          const data = docSnap.data();
          const bDate = data.date || data.bookingDate || data.scheduledAt?.split('T')?.[0];
          const bTime = data.startTime || data.scheduledTime;
          return bDate === targetDate && bTime === targetTime;
        });

        if (conflictingDoc) {
          throw new Error('SLOT_ALREADY_BOOKED');
        }

        const newDocRef = doc(collection(firestore, 'bookings'));
        newBookingId = newDocRef.id;

        const bookingPayload = {
          ...bookingData,
          id: newBookingId,
          status: 'pending',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        transaction.set(newDocRef, bookingPayload);
      });

      return {
        success: true,
        bookingId: newBookingId,
      };
    } catch (error: any) {
      if (error?.message === 'SLOT_ALREADY_BOOKED') {
        return {
          success: false,
          error: {
            code: 'SLOT_ALREADY_BOOKED',
            message: 'Slot waktu ini baru saja dibooking oleh pelanggan lain. Silakan pilih waktu lain.',
          },
        };
      }
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

      if (booking.status === 'cancelled') {
        return { success: true };
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
   * Submit booking review via the backend (POST /api/bookings/:bookingId/review),
   * not a direct Firestore write. The backend atomically creates the review doc
   * AND updates barbers/{barberId}.ratingAverage/reviewCount in one transaction --
   * a direct client write could only ever do the former, since self-update of
   * those aggregate fields is denied by firestore.rules (see the barbers `allow
   * update` denylist), which is exactly what left the aggregate permanently
   * stale before this fix. firestore.rules now denies direct client creates on
   * `reviews` outright, so this backend call is the only way to submit a review.
   */
  async submitReview(bookingId: string, reviewData: any): Promise<{ success: boolean; error?: any }> {
    if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
      return {
        success: false,
        error: { code: 'INVALID_RATING', message: 'Rating harus antara 1-5' },
      };
    }

    const result = await paymentApiService.submitBookingReview(bookingId, {
      rating: reviewData.rating,
      reviewText: reviewData.reviewText || '',
      tags: reviewData.tags || [],
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { success: true };
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
