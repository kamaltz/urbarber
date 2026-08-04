/**
 * Admin Feature Types
 * Defines interfaces for admin operations, user management, and moderation
 */

export type UserRole = 'customer' | 'barber';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type BookingVerificationStatus = 'pending' | 'verified' | 'flagged';

export interface AdminUser {
  adminId: string;
  name: string;
  email: string;
  role: 'super_admin' | 'moderator';
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export interface SystemUser {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  userRole: UserRole;
  profileImageUrl?: string;
  status: 'active' | 'suspended' | 'inactive';
  joinedAt: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: 'technical' | 'billing' | 'account' | 'other';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  notes?: string;
}

export interface UserManagementSummary {
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  totalBarbers: number;
  activeBarbers: number;
  suspendedBarbers: number;
  unverifiedCount: number;
}

export interface ReviewForModeration {
  reviewId: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  barberName: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  flaggedReason?: string;
  createdAt: string;
  submittedAt?: string;
}

export interface BookingForVerification {
  bookingId: string;
  customerId: string;
  customerName: string;
  barberId: string;
  barberName: string;
  bookingDate: string;
  bookingTime: string;
  amount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  verificationStatus: BookingVerificationStatus;
  flaggedReason?: string;
  createdAt: string;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  ticketsOpen: number;
  reviewsPending: number;
  bookingsFlagged: number;
}

export interface AdminDashboardData {
  adminUser: AdminUser;
  metrics: AdminDashboardMetrics;
  recentTickets: SupportTicket[];
  recentReviews: ReviewForModeration[];
  flaggedBookings: BookingForVerification[];
  usersNeedingVerification: SystemUser[];
}

export interface AdminNotification {
  id: string;
  type: 'ticket' | 'review' | 'booking' | 'user' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface TicketReplyData {
  replyText: string;
  attachments?: string[];
}

export interface UserVerificationRequest {
  userId: string;
  approve: boolean;
  reason?: string;
}

export interface ReviewModerationRequest {
  reviewId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export interface BookingFlagRequest {
  bookingId: string;
  flag: boolean;
  reason?: string;
}

export interface AdminAnalyticsData {
  period: 'daily' | 'weekly' | 'monthly';
  bookingTrend: Array<{ date: string; count: number }>;
  revenueTrend: Array<{ date: string; amount: number }>;
  userGrowth: Array<{ date: string; customers: number; barbers: number }>;
  topBarbers: Array<{ barberId: string; name: string; bookings: number; revenue: number }>;
  topCustomers: Array<{ customerId: string; name: string; bookings: number }>;
}

export interface SystemHealthData {
  apiStatus: 'healthy' | 'degraded' | 'down';
  databaseStatus: 'healthy' | 'degraded' | 'down';
  storageUsage: number;
  activeUsers: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface ChatConversation {
  conversationId: string;
  participantId: string;
  participantName: string;
  participantRole: UserRole;
  participantAvatarUrl?: string;
  lastMessage: string;
  sentTimestamp: string;
  unreadCount?: number;
  readStatus?: 'sent' | 'read' | 'delivered';
}
