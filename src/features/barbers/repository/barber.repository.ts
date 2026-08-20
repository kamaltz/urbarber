/**
 * Firebase Barber Repository
 * Data access layer for barber operations, services, bookings, and analytics
 */

import { getDefaultWeeklySchedule } from '../constants/schedule.constants';
import { getGeohash, validateCoordinates } from '@/features/location/utils/geo.utils';
import { firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import { mapLegacyBookingStatus, BookingStatus } from '@/types/domain';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import type {
  BarberAddServiceRequest,
  BarberAnalytics,
  BarberBooking,
  BarberBookingStatusSummary,
  BarberDashboardData,
  BarberProfile,
  BarberReview,
  BarberScheduleDay,
  BarberService,
  BarberWeeklySchedule,
  UpdateBarberProfileRequest,
  UpdateBarberScheduleRequest,
} from '../types/barber';

/**
 * The payment-first booking creator (payments.ts handleCreatePayment) only
 * ever persists a single `serviceId` on the booking document, never a
 * `services` array -- so `data.services || []` (as getBarberBookings already
 * does) is empty for every real booking, silently leaving the Barber's
 * service-breakdown UI blank. Resolves the real name/price/duration from
 * barberServices/{serviceId}, mirroring the customer-side equivalent
 * (resolveServices in map-booking.ts). Falls back to a price-only synthetic
 * entry (never a fabricated duration) if the service doc is gone or the read
 * fails, so the screen still shows the amount actually charged.
 */
async function resolveBarberBookingServices(data: Record<string, any>): Promise<BarberService[]> {
  if (Array.isArray(data.services) && data.services.length > 0) {
    return data.services;
  }

  const fallbackPrice = typeof data.price === 'number' ? data.price : 0;

  if (data.serviceId) {
    try {
      const serviceSnap = await getDoc(doc(firestore, 'barberServices', data.serviceId));
      if (serviceSnap.exists()) {
        const s = serviceSnap.data();
        return [
          {
            serviceId: data.serviceId,
            name: s.name || 'Layanan Barber',
            description: s.description || '',
            price: fallbackPrice || s.price || 0,
            durationMinutes: typeof s.durationMinutes === 'number' ? s.durationMinutes : 0,
            imageUrl: s.imageUrl,
            isActive: s.isActive !== false,
            createdAt: s.createdAt || '',
          },
        ];
      }
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository resolveBarberBookingServices Error]', error?.code, error?.message || error);
      }
    }
  }

  return [
    {
      serviceId: data.serviceId || '',
      name: data.serviceName || 'Layanan Cukur',
      description: '',
      price: fallbackPrice,
      durationMinutes: 0,
      isActive: true,
      createdAt: '',
    },
  ];
}

/**
 * Mapped explicitly rather than raw-spread: the booking doc has no
 * `totalAmount` field, so a raw spread left it undefined and the detail
 * screen fell back to `totalPrice` (the customer's gross payment, including
 * applicationFee/tip) -- inconsistent with getBarberBookings/dashboard/
 * analysis, which correctly sum only `price` (net service value) as the
 * barber's "Nilai Layanan". Shared by getBookingDetail and
 * subscribeToBookingDetail so the one-shot and realtime paths can never
 * diverge in shape.
 */
function mapBarberBookingDetail(id: string, data: Record<string, any>, services: BarberService[]): BarberBooking {
  return {
    ...data,
    bookingId: id,
    status: mapLegacyBookingStatus(data.status),
    totalAmount: data.price || 0,
    homeServiceFee: data.homeServiceFee,
    tipAmount: data.tipAmount,
    grossAmount: data.grossAmount ?? data.totalPrice,
    services,
  } as BarberBooking;
}

export const barberRepository = {
  /**
   * Get barber profile
   */
  async getBarberProfile(barberId: string): Promise<BarberProfile | null> {
    try {
      if (!barberId) return null;

      const docRef = doc(firestore, 'barbers', barberId);
      const snapshot = await withTimeout(
        getDoc(docRef),
        10_000,
        'Loading the barber profile timed out',
      );

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as BarberProfile;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBarberProfile Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Realtime subscription to a barber's canonical profile doc (barbers/{barberId}).
   * Callers that keep a screen open across a profile edit (dashboard header,
   * chat header/list) should prefer this over a one-shot getBarberProfile so
   * name/photo update live instead of requiring a remount/refetch.
   */
  subscribeToBarberProfile(
    barberId: string,
    onNext: (profile: BarberProfile | null) => void,
    onError?: (error: unknown) => void
  ): () => void {
    if (!barberId) {
      onNext(null);
      return () => {};
    }
    return onSnapshot(
      doc(firestore, 'barbers', barberId),
      (snapshot) => onNext(snapshot.exists() ? (snapshot.data() as BarberProfile) : null),
      (error) => {
        if (__DEV__) {
          console.warn('[BarberRepository subscribeToBarberProfile Error]', error?.code, error?.message);
        }
        onError?.(error);
      }
    );
  },

  /**
   * Update barber profile
   */
  async updateBarberProfile(
    barberId: string,
    data: UpdateBarberProfileRequest,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !data) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'barbers', barberId), {
        ...data,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository updateBarberProfile Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to update barber profile' },
      };
    }
  },

  /**
   * Get barber services.
   *
   * Batch 10B-5E-R2: normalizes Firestore's persistence shape (`{active,
   * <no id field on the data itself>}`, document id carried separately by the
   * SDK) into the canonical BarberService domain shape (`serviceId`,
   * `isActive`) at this repository boundary. Every consumer -- the barber's
   * own service-management screen (svc.serviceId/svc.isActive) and the
   * customer booking flow -- expects the domain shape; returning the raw
   * persistence shape left both `serviceId` and `isActive` undefined on every
   * real document. Firestore document writes (addBarberService,
   * toggleBarberService, updateBarberService) are unchanged -- only this read
   * mapping changes.
   *
   * `activeOnly`: firestore.rules' barberServices list() rule allows a
   * non-owner, non-admin caller to see a document only when
   * `resource.data.active != false`. A bare `where('barberId','==', id)`
   * query doesn't constrain on `active`, so the rules engine can't prove the
   * request stays within that boundary and denies the whole query with
   * permission-denied -- this is exactly what customer call sites (barber
   * detail, booking options) hit live. Pass `activeOnly: true` from any
   * non-owner caller so the query's own filter is a provable subset of the
   * rule; the barber's own management screen (which must still see its
   * inactive services) omits it and keeps today's unfiltered behavior.
   */
  async getBarberServices(barberId: string, activeOnly = false): Promise<BarberService[]> {
    try {
      if (!barberId) return [];

      const q = activeOnly
        ? query(
            collection(firestore, 'barberServices'),
            where('barberId', '==', barberId),
            where('active', '==', true),
          )
        : query(
            collection(firestore, 'barberServices'),
            where('barberId', '==', barberId),
          );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const createdAt =
          data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || '';

        return {
          serviceId: docSnap.id,
          name: data.name,
          description: data.description || '',
          price: data.price,
          durationMinutes: data.durationMinutes,
          imageUrl: data.imageUrl,
          isActive: data.active !== false,
          createdAt,
        } as BarberService;
      });
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBarberServices Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },

  /**
   * Add new service
   */
  async addBarberService(
    barberId: string,
    data: BarberAddServiceRequest,
  ): Promise<{ success: boolean; serviceId?: string; error?: { message: string } }> {
    try {
      if (!barberId || !data.name || data.price === undefined || data.price < 0) {
        return { success: false, error: { message: 'Missing or invalid required fields' } };
      }

      const service = {
        barberId,
        name: data.name,
        price: data.price,
        durationMinutes: data.durationMinutes || 30,
        description: data.description || '',
        active: true,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(firestore, 'barberServices'), service);

      return { success: true, serviceId: docRef.id };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository addBarberService Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to add service' },
      };
    }
  },

  /**
   * Update existing barber service
   */
  async updateBarberService(
    serviceId: string,
    data: Partial<BarberAddServiceRequest>,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!serviceId || !data) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'barberServices', serviceId), {
        ...data,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository updateBarberService Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to update service' },
      };
    }
  },

  /**
   * Toggle active state of barber service
   */
  async toggleBarberService(
    serviceId: string,
    isActive: boolean,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!serviceId) {
        return { success: false, error: { message: 'Missing service ID' } };
      }

      await updateDoc(doc(firestore, 'barberServices', serviceId), {
        active: isActive,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository toggleBarberService Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to toggle service status' },
      };
    }
  },

  /**
   * Soft delete barber service
   */
  async deleteBarberService(
    serviceId: string,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    return this.toggleBarberService(serviceId, false);
  },

  /**
   * Get barber bookings with canonical status mapping and customer enrichment
   */
  async getBarberBookings(
    barberId: string,
    status?: string,
  ): Promise<BarberBooking[]> {
    try {
      if (!barberId) return [];

      // Payment-first visibility: an assigned barber may only read bookings once
      // paymentStatus == 'paid' (enforced by firestore.rules); an unpaid payment
      // intent must never appear in the barber's booking list. Firestore requires
      // this filter in the query itself -- a rule-incompatible query is rejected
      // wholesale, not silently missing rows, but the filter must not be applied
      // only in JS after the fact.
      let q;
      if (status) {
        q = query(
          collection(firestore, 'bookings'),
          where('barberId', '==', barberId),
          where('paymentStatus', '==', 'paid'),
          where('status', '==', status),
        );
      } else {
        q = query(
          collection(firestore, 'bookings'),
          where('barberId', '==', barberId),
          where('paymentStatus', '==', 'paid'),
        );
      }

      const snapshot = await getDocs(q);
      const raw = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        data: docSnap.data(),
      }));

      // Batch-fetch customer profiles for all unique customerIds
      const customerIds = Array.from(
        new Set(raw.map((r) => r.data.customerId).filter((v): v is string => Boolean(v)))
      );
      const customerDocs = await Promise.all(
        customerIds.map((id) => getDoc(doc(firestore, 'customers', id)).catch(() => null))
      );
      const customerMap = new Map<string, Record<string, any>>();
      customerIds.forEach((id, i) => {
        if (customerDocs[i]?.exists()) customerMap.set(id, customerDocs[i]!.data()!);
      });

      // Map raw booking data to BarberBooking domain shape. Service metadata
      // is resolved via the same canonical resolveBarberBookingServices used
      // by getBookingDetail/subscribeToBookingDetail -- a raw `data.services
      // || []` read is empty for every real (serviceId-only) booking, which
      // previously left this list's service name/price/duration blank.
      return Promise.all(
        raw.map(async ({ id, data }) => {
          const customerProfile = customerMap.get(data.customerId) || {};
          const bookingDate = data.date || data.bookingDate || '';
          const bookingTime = data.startTime || data.scheduledTime || '';
          const services = await resolveBarberBookingServices(data);

          return {
            bookingId: id,
            customerId: data.customerId || '',
            customerName: customerProfile.fullName || customerProfile.name || 'Pelanggan',
            customerCode: data.customerCode,
            bookingDate,
            bookingTime,
            status: mapLegacyBookingStatus(data.status),
            services,
            totalAmount: data.price || 0,
            // Both part of the barber's operational value (distinct from the
            // platform applicationFee) -- see BarberBooking's field docs.
            // Previously never mapped here, so dashboard/analysis revenue
            // summed only the base service price and silently under-reported
            // earnings on Home Service or tipped bookings.
            homeServiceFee: typeof data.homeServiceFee === 'number' ? data.homeServiceFee : undefined,
            tipAmount: typeof data.tipAmount === 'number' ? data.tipAmount : undefined,
            paymentStatus: data.paymentStatus || 'pending',
            notes: data.notes,
            createdAt: data.createdAt?.toISOString?.() || data.createdAt || '',
          } as BarberBooking;
        })
      );
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBarberBookings Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },

  /**
   * Get booking detail
   */
  async getBookingDetail(barberId: string, bookingId: string): Promise<BarberBooking | null> {
    try {
      if (!barberId || !bookingId) return null;

      const docRef = doc(firestore, 'bookings', bookingId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      if (data.barberId !== barberId) {
        return null;
      }

      const services = await resolveBarberBookingServices(data);
      return mapBarberBookingDetail(snapshot.id, data, services);
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBookingDetail Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Realtime booking-detail subscription for the active Service Workspace
   * screen -- a customer/admin cancellation or a completion applied from
   * another device must be reflected immediately, not only on the next
   * manual refresh. Same ownership/mapping rules as getBookingDetail;
   * onNext(null) covers "not found" and "not assigned to this barber"
   * identically (never distinguished to the caller, matching the one-shot
   * method's existing behavior).
   */
  subscribeToBookingDetail(
    barberId: string,
    bookingId: string,
    onNext: (booking: BarberBooking | null) => void
  ): () => void {
    if (!barberId || !bookingId) {
      onNext(null);
      return () => {};
    }

    return onSnapshot(
      doc(firestore, 'bookings', bookingId),
      (snapshot) => {
        if (!snapshot.exists()) {
          onNext(null);
          return;
        }
        const data = snapshot.data();
        if (data.barberId !== barberId) {
          onNext(null);
          return;
        }
        void resolveBarberBookingServices(data).then((services) => {
          onNext(mapBarberBookingDetail(snapshot.id, data, services));
        });
      },
      () => onNext(null)
    );
  },

  /**
   * Update booking status with canonical status verification
   */
  async updateBookingStatus(
    barberId: string,
    bookingId: string,
    newStatus: BookingStatus,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !bookingId || !newStatus) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      const booking = await this.getBookingDetail(barberId, bookingId);
      if (!booking) {
        return {
          success: false,
          error: { message: 'Booking not found' },
        };
      }

      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository updateBookingStatus Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to update booking status' },
      };
    }
  },

  /**
   * Cancel booking
   */
  async cancelBooking(
    barberId: string,
    bookingId: string,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !bookingId) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      const booking = await this.getBookingDetail(barberId, bookingId);
      if (!booking || booking.status === 'completed') {
        return {
          success: false,
          error: { message: 'Cannot cancel completed or non-existent booking' },
        };
      }

      await updateDoc(doc(firestore, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository cancelBooking Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to cancel booking' },
      };
    }
  },

  /**
   * Get booking status summary
   */
  async getBookingStatusSummary(barberId: string): Promise<BarberBookingStatusSummary> {
    try {
      if (!barberId) return { total: 0, completed: 0, pending: 0, cancelled: 0 };

      // Payment-first visibility: see comment in getBarberBookings above.
      const q = query(
        collection(firestore, 'bookings'),
        where('barberId', '==', barberId),
        where('paymentStatus', '==', 'paid'),
      );

      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        status: mapLegacyBookingStatus(docSnap.data().status),
      }));

      return {
        total: bookings.length,
        completed: bookings.filter((b) => b.status === 'completed').length,
        pending: bookings.filter((b) => b.status === 'pending').length,
        cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBookingStatusSummary Error]', error?.code, error?.message || error);
      }
      return { total: 0, completed: 0, pending: 0, cancelled: 0 };
    }
  },

  /**
   * Get weekly schedule with explicit confirmation check
   */
  async getWeeklySchedule(barberId: string): Promise<BarberWeeklySchedule | null> {
    try {
      if (!barberId) return null;

      const docRef = doc(firestore, 'barberSchedules', barberId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return getDefaultWeeklySchedule(barberId);
      }

      const data = snapshot.data();
      const rawSchedule = data.schedule || [];
      if (rawSchedule.length === 0) {
        return getDefaultWeeklySchedule(barberId);
      }

      return {
        barberId,
        schedule: rawSchedule,
        isConfigured: data.isConfigured !== false,
        isConfirmed: data.isConfirmed !== false,
        scheduleSource: data.scheduleSource || 'custom',
        unavailableDates: data.unavailableDates || [],
        unavailableDateRanges: Array.isArray(data.unavailableDateRanges) ? data.unavailableDateRanges : [],
        lastUpdated: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getWeeklySchedule Error]', error?.code, error?.message || error);
      }
      return getDefaultWeeklySchedule(barberId);
    }
  },

  /**
   * Update and explicitly confirm weekly schedule
   */
  async updateWeeklySchedule(
    barberId: string,
    data: UpdateBarberScheduleRequest,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !data.schedule) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await setDoc(
        doc(firestore, 'barberSchedules', barberId),
        {
          barberId,
          schedule: data.schedule,
          isConfigured: true,
          isConfirmed: true,
          scheduleSource: 'custom',
          ...(data.unavailableDates ? { unavailableDates: data.unavailableDates } : {}),
          ...(data.unavailableDateRanges ? { unavailableDateRanges: data.unavailableDateRanges } : {}),
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository updateWeeklySchedule Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to update schedule' },
      };
    }
  },

  /**
   * Get barber reviews
   */
  async getBarberReviews(barberId: string): Promise<BarberReview[]> {
    try {
      if (!barberId) return [];

      const q = query(
        collection(firestore, 'reviews'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as unknown as BarberReview[];
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBarberReviews Error]', error?.code, error?.message || error);
      }
      return [];
    }
  },

  /**
   * Reply to review
   */
  async replyToReview(
    barberId: string,
    reviewId: string,
    replyText: string,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !reviewId || !replyText) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'reviews', reviewId), {
        barberReply: replyText,
        barberReplyAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository replyToReview Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to reply to review' },
      };
    }
  },

  /**
   * Get barber analytics
   */
  async getBarberAnalytics(
    barberId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ): Promise<BarberAnalytics> {
    try {
      if (!barberId) {
        return {
          period,
          totalBookings: 0,
          completedBookings: 0,
          pendingBookings: 0,
          cancelledBookings: 0,
          totalRevenue: 0,
        };
      }

      // Payment-first visibility: bookings table counts paid bookings only
      const bookingsQuery = query(
        collection(firestore, 'bookings'),
        where('barberId', '==', barberId),
        where('paymentStatus', '==', 'paid'),
      );

      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings = bookingsSnapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        status: mapLegacyBookingStatus(docSnap.data().status),
      }));

      const completed = bookings.filter((b) => b.status === 'completed').length;
      const pending = bookings.filter((b) => b.status === 'pending').length;
      const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

      // Revenue from actual payment records, not just booking amounts
      // This gives the true transaction history
      const paymentsQuery = query(
        collection(firestore, 'payments'),
        where('barberId', '==', barberId),
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const payments = paymentsSnapshot.docs.map((docSnap) => docSnap.data() as any);

      // Only count paid, settled payments in revenue
      const paidPayments = payments.filter(
        (p) => p.status === 'paid' || p.status === 'settlement'
      );
      const totalRevenue = paidPayments.reduce((sum, p) => sum + ((p.amount || p.grossAmount || 0)), 0);

      return {
        period,
        totalBookings: bookings.length,
        completedBookings: completed,
        pendingBookings: pending,
        cancelledBookings: cancelled,
        totalRevenue,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBarberAnalytics Error]', error?.code, error?.message || error);
      }
      return {
        period,
        totalBookings: 0,
        completedBookings: 0,
        pendingBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
      };
    }
  },

  /**
   * Get dashboard data
   */
  async getBarberDashboard(barberId: string): Promise<BarberDashboardData | null> {
    try {
      if (!barberId) return null;

      const profile = await this.getBarberProfile(barberId);
      const summary = await this.getBookingStatusSummary(barberId);
      const analytics = await this.getBarberAnalytics(barberId);
      const recentBookings = await this.getBarberBookings(barberId);

      if (!profile) {
        return null;
      }

      return {
        profile,
        bookingsSummary: summary,
        analytics,
        recentBookings: recentBookings.slice(0, 5),
      } as unknown as BarberDashboardData;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBarberDashboard Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Export analytics report
   */
  async exportAnalyticsReport(
    barberId: string,
    format: 'pdf' | 'csv',
  ): Promise<{ success: boolean; url?: string; error?: { message: string } }> {
    try {
      if (!barberId) {
        return { success: false, error: { message: 'Missing barber ID' } };
      }

      const _analytics = await this.getBarberAnalytics(barberId);

      const reportUrl = `gs://your-bucket/reports/barber-${barberId}-${Date.now()}.${format}`;

      return { success: true, url: reportUrl };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository exportAnalyticsReport Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Failed to export analytics report' },
      };
    }
  },

  /**
   * Alias for getWeeklySchedule
   */
  async getBarberSchedule(barberId: string): Promise<BarberWeeklySchedule | null> {
    return this.getWeeklySchedule(barberId);
  },

  /**
   * Alias for updateWeeklySchedule
   */
  async saveBarberSchedule(
    barberId: string,
    schedule: BarberScheduleDay[],
    unavailableDates: string[] = [],
    scheduleSource: 'custom' | 'confirmed_default' = 'custom'
  ): Promise<{ success: boolean; error?: { message: string } }> {
    return this.updateWeeklySchedule(barberId, { schedule, unavailableDates });
  },

  /**
   * Update barber location configuration & compute geohash
   */
  async updateBarberLocation(
    barberId: string,
    locationData: {
      latitude: number;
      longitude: number;
      shopAddress: string;
      serviceRadiusKm?: number;
      acceptsAtBarbershop?: boolean;
      acceptsHomeService?: boolean;
      homeServiceTravelBufferMinutes?: number;
      acceptingNewBookings?: boolean;
    }
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !locationData) {
        return { success: false, error: { message: 'Missing location data' } };
      }

      if (!validateCoordinates(locationData.latitude, locationData.longitude)) {
        return { success: false, error: { message: 'Koordinat lokasi tidak valid.' } };
      }

      const geohash = getGeohash(locationData.latitude, locationData.longitude);

      const updatePayload: any = {
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
        geohash,
        shopAddress: locationData.shopAddress,
        updatedAt: Timestamp.now(),
      };

      if (locationData.serviceRadiusKm !== undefined) updatePayload.serviceRadiusKm = locationData.serviceRadiusKm;
      if (locationData.acceptsAtBarbershop !== undefined) updatePayload.acceptsAtBarbershop = locationData.acceptsAtBarbershop;
      if (locationData.acceptsHomeService !== undefined) updatePayload.acceptsHomeService = locationData.acceptsHomeService;
      if (locationData.homeServiceTravelBufferMinutes !== undefined) updatePayload.homeServiceTravelBufferMinutes = locationData.homeServiceTravelBufferMinutes;
      if (locationData.acceptingNewBookings !== undefined) updatePayload.acceptingNewBookings = locationData.acceptingNewBookings;

      await updateDoc(doc(firestore, 'barbers', barberId), updatePayload);

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository updateBarberLocation Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Gagal mengupdate lokasi barber' },
      };
    }
  },

  /**
   * Toggle barber accepting new bookings status
   */
  async toggleAcceptingNewBookings(
    barberId: string,
    accepting: boolean
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId) {
        return { success: false, error: { message: 'Missing barber ID' } };
      }

      await updateDoc(doc(firestore, 'barbers', barberId), {
        acceptingNewBookings: accepting,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository toggleAcceptingNewBookings Error]', error?.code, error?.message || error);
      }
      return {
        success: false,
        error: { message: error?.message || 'Gagal mengupdate status menerima pesanan' },
      };
    }
  },
};
