/**
 * Admin Feature Types (Canonical)
 * Types for admin operations aligned with the authoritative data model.
 */

// ─── Status & Role Enums ──────────────────────────────────────────────────────

export type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ListingStatus      = 'active' | 'inactive' | 'suspended';
export type UserStatus         = 'active' | 'pending_verification' | 'suspended';
export type UserRole           = 'customer' | 'barber' | 'admin';
export type BookingStatus      = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected';
export type PaymentMethod      = 'cash_on_service' | 'midtrans_sandbox';
export type PaymentStatus      = 'not_required' | 'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

// ─── Barber Registration ──────────────────────────────────────────────────────

export interface AdminBarberRegistration {
  barberId: string;
  ownerName: string;
  businessName: string;
  phoneNumber?: string;
  businessAddress?: string;
  serviceArea?: string;
  verificationStatus: VerificationStatus;
  onboardingStatus?: string;
  rejectionReason?: string | null;
  submittedAt?: { seconds: number } | null;
  reviewedAt?: { seconds: number } | null;
  reviewedBy?: string | null;
}

export interface AdminBarberRegistrationDetail extends AdminBarberRegistration {
  displayName: string;
  profileImageUrl?: string | null;
  ratingAverage: number;
  reviewCount: number;
  listingStatus?: ListingStatus | null;
  email: string;
  userStatus: UserStatus;
  // Document availability flags (not actual paths)
  availableDocuments: Record<string, boolean>;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface AdminUserRecord {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  createdAt?: { seconds: number } | null;
}

// ─── Barbers ──────────────────────────────────────────────────────────────────

export interface AdminBarberRecord {
  id: string;
  displayName: string;
  businessName?: string;
  verificationStatus: VerificationStatus;
  listingStatus?: ListingStatus;
  status?: UserStatus;
  acceptingNewBookings?: boolean;
  ratingAverage?: number;
  reviewCount?: number;
  approvedAt?: { seconds: number } | null;
  createdAt?: { seconds: number } | null;
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export interface AdminBookingRecord {
  id: string;
  customerId: string;
  barberId: string;
  status: BookingStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  totalPrice: number;
  date: string;
  startTime: string;
  createdAt?: { seconds: number } | null;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface CategoryRecord {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  active: boolean;
  order: number;
  createdAt?: { seconds: number } | null;
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────

export interface DashboardMetrics {
  pendingRegistrations: number;
  activeCustomers: number;
  activeBarbers: number;
  suspendedAccounts: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  /** Nilai transaksi layanan bulan ini — bukan pendapatan bersih perusahaan */
  monthlyTransactionValue: number;
  recentRegistrations: Pick<AdminBarberRegistration, 'barberId' | 'ownerName' | 'businessName' | 'verificationStatus' | 'submittedAt'>[];
  recentBookings: Pick<AdminBookingRecord, 'id' | 'customerId' | 'barberId' | 'status' | 'totalPrice' | 'date' | 'createdAt'>[];
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface AdminApiSuccess<T> {
  success: true;
  data: T;
}

export interface AdminApiError {
  success: false;
  error: { code: string; message: string };
}

export type AdminApiResult<T> = AdminApiSuccess<T> | AdminApiError;

// ─── Legacy types (kept for backward compat, gradually removed) ───────────────

/** @deprecated Use AdminUserRecord */
export interface SystemUser {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  userRole: UserRole;
  profileImageUrl?: string;
  status: UserStatus;
  joinedAt: string;
  verificationStatus: VerificationStatus;
}

/** @deprecated Use DashboardMetrics */
export interface UserManagementSummary {
  totalCustomers: number;
  activeCustomers: number;
  suspendedCustomers: number;
  totalBarbers: number;
  activeBarbers: number;
  suspendedBarbers: number;
  unverifiedCount: number;
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
  bookingTrend: { date: string; count: number }[];
  revenueTrend: { date: string; amount: number }[];
  userGrowth: { date: string; customers: number; barbers: number }[];
  topBarbers: { barberId: string; name: string; bookings: number; revenue: number }[];
  topCustomers: { customerId: string; name: string; bookings: number }[];
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'other';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  assignedTo?: string;
  notes?: string;
}

export interface ReviewForModeration {
  reviewId: string;
  bookingId: string;
  reviewerId: string;
  reviewerName: string;
  barberName: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
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
  verificationStatus: 'pending' | 'verified' | 'flagged';
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

export interface AdminUser {
  adminId: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatarUrl?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface AdminDashboardData {
  adminUser?: AdminUser;
  metrics: AdminDashboardMetrics;
  recentTickets: SupportTicket[];
  recentReviews: ReviewForModeration[];
  flaggedBookings: BookingForVerification[];
  usersNeedingVerification: SystemUser[];
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
