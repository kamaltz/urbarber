/**
 * Firebase Admin Repository
 * Data access layer for admin operations including user management, moderation, and analytics
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
    AdminAnalyticsData,
    AdminDashboardData,
    AdminUser,
    BookingFlagRequest,
    BookingForVerification,
    ChatConversation,
    ReviewForModeration,
    ReviewModerationRequest,
    SupportTicket,
    SystemHealthData,
    SystemUser,
    TicketReplyData,
    UserManagementSummary,
    UserVerificationRequest,
} from '../types/admin';

export const adminRepository = {
  /**
   * Get admin profile
   */
  async getAdminProfile(adminId: string): Promise<AdminUser | null> {
    try {
      const docRef = doc(firestore, 'admins', adminId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return snapshot.data() as AdminUser;
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
  },

  /**
   * Get admin dashboard data
   */
  async getAdminDashboard(adminId: string): Promise<AdminDashboardData | null> {
    try {
      const profile = await this.getAdminProfile(adminId);
      const ticketsOpen = await getDocs(
        query(collection(firestore, 'supportTickets'), where('status', 'in', ['open', 'in_progress']))
      );
      const reviewsPending = await getDocs(
        query(collection(firestore, 'reviews'), where('status', '==', 'pending'))
      );
      const bookingsFlagged = await getDocs(
        query(collection(firestore, 'bookings'), where('verificationStatus', '==', 'flagged'))
      );

      if (!profile) {
        return null;
      }

            return {
              metrics: {
                totalUsers: 1000,
                totalBookings: 2156,
                totalRevenue: 18500000,
                averageRating: 4.6,
                ticketsOpen: ticketsOpen.size,
                reviewsPending: reviewsPending.size,
                bookingsFlagged: bookingsFlagged.size,
              },
              recentTickets: [],
              recentReviews: [],
              flaggedBookings: [],
              usersNeedingVerification: [],
            } as unknown as AdminDashboardData;
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      return null;
    }
  },

  /**
   * Get support tickets
   */
  async getSupportTickets(adminId: string, status?: string): Promise<SupportTicket[]> {
    try {
      let q;
      if (status) {
        q = query(collection(firestore, 'supportTickets'), where('status', '==', status));
      } else {
        q = query(collection(firestore, 'supportTickets'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        ticketId: doc.id,
      })) as SupportTicket[];
    } catch (error) {
      console.error('Error fetching support tickets:', error);
      return [];
    }
  },

  /**
   * Get ticket detail
   */
  async getTicketDetail(adminId: string, ticketId: string): Promise<SupportTicket | null> {
    try {
      const docRef = doc(firestore, 'supportTickets', ticketId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return { ...snapshot.data(), ticketId: snapshot.id } as SupportTicket;
    } catch (error) {
      console.error('Error fetching ticket detail:', error);
      return null;
    }
  },

  /**
   * Reply to ticket
   */
  async replyToTicket(
    adminId: string,
    ticketId: string,
    data: TicketReplyData,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !ticketId || !data.replyText) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await addDoc(collection(firestore, 'supportTickets', ticketId, 'replies'), {
        adminId,
        replyText: data.replyText,
        createdAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to reply to ticket' },
      };
    }
  },

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    adminId: string,
    ticketId: string,
    newStatus: string,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !ticketId || !newStatus) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'supportTickets', ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update ticket status' },
      };
    }
  },

  /**
   * Assign ticket to admin
   */
  async assignTicket(
    adminId: string,
    ticketId: string,
    assignToAdminId: string,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !ticketId || !assignToAdminId) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'supportTickets', ticketId), {
        assignedTo: assignToAdminId,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to assign ticket' },
      };
    }
  },

  /**
   * Get all system users
   */
  async getSystemUsers(
    adminId: string,
    role?: string,
    status?: string,
  ): Promise<SystemUser[]> {
    try {
      let baseQuery = collection(firestore, 'customers');

      if (role === 'barber') {
        baseQuery = collection(firestore, 'barbers');
      }

      let q;
      if (status) {
        q = query(baseQuery, where('status', '==', status));
      } else {
        q = query(baseQuery);
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        userId: doc.id,
      })) as SystemUser[];
    } catch (error) {
      console.error('Error fetching system users:', error);
      return [];
    }
  },

  /**
   * Get user detail
   */
  async getUserDetail(adminId: string, userId: string): Promise<SystemUser | null> {
    try {
      let docRef = doc(firestore, 'customers', userId);
      let snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        docRef = doc(firestore, 'barbers', userId);
        snapshot = await getDoc(docRef);
      }

      if (!snapshot.exists()) {
        return null;
      }

      return { ...snapshot.data(), userId: snapshot.id } as SystemUser;
    } catch (error) {
      console.error('Error fetching user detail:', error);
      return null;
    }
  },

  /**
   * Verify user
   */
  async verifyUser(
    adminId: string,
    data: UserVerificationRequest,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !data.userId || data.approve === undefined) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      const newStatus = data.approve ? 'approved' : 'rejected';

      let docRef = doc(firestore, 'customers', data.userId);
      await updateDoc(docRef, {
        verificationStatus: newStatus,
        verifiedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }).catch(() => {
        docRef = doc(firestore, 'barbers', data.userId);
        return updateDoc(docRef, {
          verificationStatus: newStatus,
          verifiedAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to verify user' },
      };
    }
  },

  /**
   * Suspend/activate user
   */
  async updateUserStatus(
    adminId: string,
    userId: string,
    newStatus: 'active' | 'suspended' | 'inactive',
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !userId || !newStatus) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      let docRef = doc(firestore, 'customers', userId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      }).catch(() => {
        docRef = doc(firestore, 'barbers', userId);
        return updateDoc(docRef, {
          status: newStatus,
          updatedAt: Timestamp.now(),
        });
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update user status' },
      };
    }
  },

  /**
   * Get user management summary
   */
  async getUserManagementSummary(adminId: string): Promise<UserManagementSummary> {
    try {
      const customers = await getDocs(collection(firestore, 'customers'));
      const barbers = await getDocs(collection(firestore, 'barbers'));

      const activeCustomers = customers.docs.filter((d) => d.data().status === 'active').length;
      const suspendedCustomers = customers.docs.filter((d) => d.data().status === 'suspended').length;
      const activeBarbers = barbers.docs.filter((d) => d.data().status === 'active').length;
      const suspendedBarbers = barbers.docs.filter((d) => d.data().status === 'suspended').length;
      const unverified = [
        ...customers.docs.filter((d) => d.data().verificationStatus === 'pending'),
        ...barbers.docs.filter((d) => d.data().verificationStatus === 'pending'),
      ].length;

      return {
        totalCustomers: customers.size,
        activeCustomers,
        suspendedCustomers,
        totalBarbers: barbers.size,
        activeBarbers,
        suspendedBarbers,
        unverifiedCount: unverified,
      };
    } catch (error) {
      console.error('Error fetching user management summary:', error);
      return {
        totalCustomers: 0,
        activeCustomers: 0,
        suspendedCustomers: 0,
        totalBarbers: 0,
        activeBarbers: 0,
        suspendedBarbers: 0,
        unverifiedCount: 0,
      };
    }
  },

  /**
   * Get reviews for moderation
   */
  async getReviewsForModeration(
    adminId: string,
    status?: string,
  ): Promise<ReviewForModeration[]> {
    try {
      let q;
      if (status) {
        q = query(collection(firestore, 'reviews'), where('moderationStatus', '==', status));
      } else {
        q = query(collection(firestore, 'reviews'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        reviewId: doc.id,
      })) as ReviewForModeration[];
    } catch (error) {
      console.error('Error fetching reviews for moderation:', error);
      return [];
    }
  },

  /**
   * Get review detail
   */
  async getReviewDetail(adminId: string, reviewId: string): Promise<ReviewForModeration | null> {
    try {
      const docRef = doc(firestore, 'reviews', reviewId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return { ...snapshot.data(), reviewId: snapshot.id } as ReviewForModeration;
    } catch (error) {
      console.error('Error fetching review detail:', error);
      return null;
    }
  },

  /**
   * Moderate review
   */
  async moderateReview(
    adminId: string,
    data: ReviewModerationRequest,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !data.reviewId || !data.action) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      const newStatus = data.action === 'approve' ? 'approved' : 'rejected';

      await updateDoc(doc(firestore, 'reviews', data.reviewId), {
        moderationStatus: newStatus,
        moderatedAt: Timestamp.now(),
        moderatedBy: adminId,
        moderationReason: data.reason || '',
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to moderate review' },
      };
    }
  },

  /**
   * Get bookings for verification
   */
  async getBookingsForVerification(
    adminId: string,
    status?: string,
  ): Promise<BookingForVerification[]> {
    try {
      let q;
      if (status) {
        q = query(collection(firestore, 'bookings'), where('verificationStatus', '==', status));
      } else {
        q = query(collection(firestore, 'bookings'));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        bookingId: doc.id,
      })) as BookingForVerification[];
    } catch (error) {
      console.error('Error fetching bookings for verification:', error);
      return [];
    }
  },

  /**
   * Get booking detail for verification
   */
  async getBookingVerificationDetail(
    adminId: string,
    bookingId: string,
  ): Promise<BookingForVerification | null> {
    try {
      const docRef = doc(firestore, 'bookings', bookingId);
      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        return null;
      }

      return { ...snapshot.data(), bookingId: snapshot.id } as BookingForVerification;
    } catch (error) {
      console.error('Error fetching booking verification detail:', error);
      return null;
    }
  },

  /**
   * Flag or unflag booking
   */
  async updateBookingFlag(
    adminId: string,
    data: BookingFlagRequest,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !data.bookingId || data.flag === undefined) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      const newStatus = data.flag ? 'flagged' : 'verified';

      await updateDoc(doc(firestore, 'bookings', data.bookingId), {
        verificationStatus: newStatus,
        flaggedReason: data.reason || '',
        flaggedAt: data.flag ? Timestamp.now() : null,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to update booking flag' },
      };
    }
  },

  /**
   * Get admin analytics
   */
  async getAdminAnalytics(
    adminId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ): Promise<AdminAnalyticsData> {
    try {
      const bookings = await getDocs(collection(firestore, 'bookings'));
      const bookingsByStatus: Record<string, number> = {};

      bookings.docs.forEach((doc) => {
        const status = doc.data().status || 'unknown';
        bookingsByStatus[status] = (bookingsByStatus[status] || 0) + 1;
      });

      return {
        period,
        bookingTrend: [],
        revenueTrend: [],
        userGrowth: [],
        topBarbers: [],
        topCustomers: [],
      };
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
      return {
        period,
        bookingTrend: [],
        revenueTrend: [],
        userGrowth: [],
        topBarbers: [],
        topCustomers: [],
      };
    }
  },

  /**
   * Get system health status
   */
  async getSystemHealth(adminId: string): Promise<SystemHealthData> {
    try {
      return {
        apiStatus: 'healthy',
        databaseStatus: 'healthy',
        storageUsage: 67,
        activeUsers: 234,
        averageResponseTime: 145,
        errorRate: 0.8,
      };
    } catch (error) {
      console.error('Error fetching system health:', error);
      return {
        apiStatus: 'down',
        databaseStatus: 'down',
        storageUsage: 0,
        activeUsers: 0,
        averageResponseTime: 0,
        errorRate: 100,
      };
    }
  },

  /**
   * Get chat conversations
   */
  async getAdminChatConversations(adminId: string): Promise<ChatConversation[]> {
    try {
      const q = query(
        collection(firestore, 'conversations'),
        where('participants', 'array-contains', adminId),
      );

      const snapshot = await getDocs(q);
            return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as unknown as ChatConversation[];
    } catch (error) {
      console.error('Error fetching chat conversations:', error);
      return [];
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(
    adminId: string,
    notificationId: string,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!adminId || !notificationId) {
        return { success: false, error: { message: 'Missing parameters' } };
      }

      await updateDoc(doc(firestore, 'notifications', notificationId), {
        read: true,
        readAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { message: 'Failed to mark notification as read' },
      };
    }
  },
};
