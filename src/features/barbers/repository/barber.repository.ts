/**
 * Firebase Barber Repository
 * Data access layer for barber operations, services, bookings, and analytics
 */

import { firestore } from '@/lib/firebase';
import { mapLegacyBookingStatus, BookingStatus } from '@/types/domain';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
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
    BarberService,
    BarberWeeklySchedule,
    UpdateBarberProfileRequest,
    UpdateBarberScheduleRequest,
} from '../types/barber';

export const barberRepository = {
  /**
   * Get barber profile
   */
  async getBarberProfile(barberId: string): Promise<BarberProfile | null> {
    try {
      if (!barberId) return null;

      const docRef = doc(firestore, 'barbers', barberId);
      const snapshot = await getDoc(docRef);

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
   * Get barber services
   */
  async getBarberServices(barberId: string): Promise<BarberService[]> {
    try {
      if (!barberId) return [];

      const q = query(
        collection(firestore, 'barberServices'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id,
      })) as unknown as BarberService[];
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
   * Get barber bookings with canonical status mapping
   */
  async getBarberBookings(
    barberId: string,
    status?: string,
  ): Promise<BarberBooking[]> {
    try {
      if (!barberId) return [];

      let q;
      if (status) {
        q = query(
          collection(firestore, 'bookings'),
          where('barberId', '==', barberId),
          where('status', '==', status),
        );
      } else {
        q = query(
          collection(firestore, 'bookings'),
          where('barberId', '==', barberId),
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          ...data,
          bookingId: docSnap.id,
          status: mapLegacyBookingStatus(data.status),
        } as BarberBooking;
      });
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

      return {
        ...data,
        bookingId: snapshot.id,
        status: mapLegacyBookingStatus(data.status),
      } as BarberBooking;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getBookingDetail Error]', error?.code, error?.message || error);
      }
      return null;
    }
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

      const q = query(
        collection(firestore, 'bookings'),
        where('barberId', '==', barberId),
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
   * Get weekly schedule
   */
  async getWeeklySchedule(barberId: string): Promise<BarberWeeklySchedule | null> {
    try {
      if (!barberId) return null;

      const docRef = doc(firestore, 'barberSchedules', barberId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as BarberWeeklySchedule;
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[BarberRepository getWeeklySchedule Error]', error?.code, error?.message || error);
      }
      return null;
    }
  },

  /**
   * Update weekly schedule
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
          schedule: data.schedule,
          ...(data.unavailableDates ? { unavailableDates: data.unavailableDates } : {}),
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

      const q = query(
        collection(firestore, 'bookings'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        status: mapLegacyBookingStatus(docSnap.data().status),
      }));

      const completed = bookings.filter((b) => b.status === 'completed').length;
      const pending = bookings.filter((b) => b.status === 'pending').length;
      const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
      const totalRevenue = bookings.reduce((sum, b) => sum + ((b as any).totalPrice || 0), 0);

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

      const analytics = await this.getBarberAnalytics(barberId);

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
};
