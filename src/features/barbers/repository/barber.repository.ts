/**
 * Firebase Barber Repository
 * Data access layer for barber operations, services, bookings, and analytics
 */

import { firestore } from '@/lib/firebase';
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
      const docRef = doc(firestore, 'barbers', barberId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as BarberProfile;
    } catch (error) {
      console.error('Error fetching barber profile:', error);
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
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update barber profile' },
      };
    }
  },

  /**
   * Get barber services
   */
  async getBarberServices(barberId: string): Promise<BarberService[]> {
    try {
      const q = query(
        collection(firestore, 'barberServices'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as unknown as BarberService[];
    } catch (error) {
      console.error('Error fetching barber services:', error);
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
      if (!barberId || !data.name || !data.price) {
        return { success: false, error: { message: 'Missing required fields' } };
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
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to add service' },
      };
    }
  },

  /**
   * Get barber bookings
   */
  async getBarberBookings(
    barberId: string,
    status?: string,
  ): Promise<BarberBooking[]> {
    try {
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
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        bookingId: doc.id,
      })) as BarberBooking[];
    } catch (error) {
      console.error('Error fetching barber bookings:', error);
      return [];
    }
  },

  /**
   * Get booking detail
   */
  async getBookingDetail(barberId: string, bookingId: string): Promise<BarberBooking | null> {
    try {
      const docRef = doc(firestore, 'bookings', bookingId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      if (data.barberId !== barberId) {
        return null;
      }

      return { ...data, bookingId: snapshot.id } as BarberBooking;
    } catch (error) {
      console.error('Error fetching booking detail:', error);
      return null;
    }
  },

  /**
   * Update booking status
   */
  async updateBookingStatus(
    barberId: string,
    bookingId: string,
    newStatus: string,
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
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update booking status' },
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
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to cancel booking' },
      };
    }
  },

  /**
   * Get booking status summary
   */
  async getBookingStatusSummary(barberId: string): Promise<BarberBookingStatusSummary> {
    try {
      const q = query(
        collection(firestore, 'bookings'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map((doc) => doc.data());

      return {
        total: bookings.length,
        completed: bookings.filter((b) => b.status === 'completed').length,
        pending: bookings.filter((b) => b.status === 'pending').length,
        cancelled: bookings.filter((b) => b.status === 'cancelled').length,
      };
    } catch (error) {
      console.error('Error fetching booking summary:', error);
      return { total: 0, completed: 0, pending: 0, cancelled: 0 };
    }
  },

  /**
   * Get weekly schedule
   */
  async getWeeklySchedule(barberId: string): Promise<BarberWeeklySchedule | null> {
    try {
      const docRef = doc(firestore, 'barberSchedules', barberId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as BarberWeeklySchedule;
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
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

      await updateDoc(doc(firestore, 'barberSchedules', barberId), {
        schedule: data.schedule,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update schedule' },
      };
    }
  },

  /**
   * Get barber reviews
   */
  async getBarberReviews(barberId: string): Promise<BarberReview[]> {
    try {
      const q = query(
        collection(firestore, 'reviews'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as unknown as BarberReview[];
    } catch (error) {
      console.error('Error fetching barber reviews:', error);
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
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to reply to review' },
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
      const q = query(
        collection(firestore, 'bookings'),
        where('barberId', '==', barberId),
      );

      const snapshot = await getDocs(q);
      const bookings = snapshot.docs.map((doc) => doc.data());

      // Calculate analytics
      const completed = bookings.filter((b) => b.status === 'completed').length;
      const pending = bookings.filter((b) => b.status === 'pending').length;
      const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      return {
        period,
        totalBookings: bookings.length,
        completedBookings: completed,
        pendingBookings: pending,
        cancelledBookings: cancelled,
        totalRevenue,
      };
    } catch (error) {
      console.error('Error fetching barber analytics:', error);
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
    } catch (error) {
      console.error('Error fetching barber dashboard:', error);
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

      // In production, use Firebase Cloud Functions to generate and return signed URL
      // For now, return a placeholder
      const reportUrl = `gs://your-bucket/reports/barber-${barberId}-${Date.now()}.${format}`;

      return { success: true, url: reportUrl };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to export analytics report' },
      };
    }
  },
};
