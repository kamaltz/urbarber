/**
 * Mock Admin Data
 * Provides sample data for admin feature development
 */

import type {
    AdminAnalyticsData,
    AdminDashboardData,
    AdminDashboardMetrics,
    AdminUser,
    BookingForVerification,
    ChatConversation,
    ReviewForModeration,
    SupportTicket,
    SystemHealthData,
    SystemUser,
    UserManagementSummary,
} from '../types/admin';

export const MOCK_ADMIN_ID = 'ADM001';

export const MOCK_ADMIN_USER: AdminUser = {
  adminId: MOCK_ADMIN_ID,
  name: 'Siti Nurhaliza',
  email: 'admin@urbarber.app',
  role: 'super_admin',
  permissions: [
    'manage_users',
    'manage_bookings',
    'moderate_reviews',
    'view_analytics',
    'manage_tickets',
  ],
  createdAt: '2024-01-01T00:00:00Z',
  lastLogin: '2024-08-04T08:00:00Z',
};

export const MOCK_SYSTEM_USERS: SystemUser[] = [
  {
    userId: 'CUST001',
    name: 'Ahmad Pratama',
    email: 'ahmad@example.com',
    phone: '+62812-1111-1111',
    userRole: 'customer',
    profileImageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    status: 'active',
    joinedAt: '2024-02-15T00:00:00Z',
    verificationStatus: 'approved',
  },
  {
    userId: 'BARB001',
    name: 'Toni Suryatno',
    email: 'toni@tonibarbershop.com',
    phone: '+62812-3456-7890',
    userRole: 'barber',
    profileImageUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    status: 'active',
    joinedAt: '2024-01-20T00:00:00Z',
    verificationStatus: 'approved',
  },
  {
    userId: 'BARB002',
    name: 'Rido Handoko',
    email: 'rido@barbershop.com',
    phone: '+62812-2222-2222',
    userRole: 'barber',
    profileImageUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
    status: 'active',
    joinedAt: '2024-03-10T00:00:00Z',
    verificationStatus: 'pending',
  },
  {
    userId: 'CUST002',
    name: 'Budi Santoso',
    email: 'budi@example.com',
    userRole: 'customer',
    status: 'suspended',
    joinedAt: '2024-04-05T00:00:00Z',
    verificationStatus: 'approved',
  },
];

export const MOCK_SUPPORT_TICKETS: SupportTicket[] = [
  {
    ticketId: 'TK001',
    userId: 'CUST001',
    userName: 'Ahmad Pratama',
    userRole: 'customer',
    subject: 'Pembayaran tidak terproses',
    description: 'Saya sudah transfer tapi booking belum dikonfirmasi. Mohon bantuan.',
    status: 'open',
    priority: 'high',
    category: 'billing',
    createdAt: '2024-08-03T10:00:00Z',
    updatedAt: '2024-08-03T10:00:00Z',
  },
  {
    ticketId: 'TK002',
    userId: 'BARB001',
    userName: 'Toni Suryatno',
    userRole: 'barber',
    subject: 'Tidak bisa mengedit jadwal',
    description: 'Fitur edit jadwal tidak berfungsi di aplikasi',
    status: 'in_progress',
    priority: 'medium',
    category: 'technical',
    assignedTo: MOCK_ADMIN_ID,
    createdAt: '2024-08-02T14:00:00Z',
    updatedAt: '2024-08-03T09:00:00Z',
    notes: 'Sedang investigasi issue di backend',
  },
  {
    ticketId: 'TK003',
    userId: 'CUST002',
    userName: 'Budi Santoso',
    userRole: 'customer',
    subject: 'Lupa password',
    description: 'Saya lupa password akun saya',
    status: 'resolved',
    priority: 'low',
    category: 'account',
    createdAt: '2024-08-01T11:00:00Z',
    updatedAt: '2024-08-02T12:00:00Z',
  },
];

export const MOCK_USER_SUMMARY: UserManagementSummary = {
  totalCustomers: 456,
  activeCustomers: 440,
  suspendedCustomers: 16,
  totalBarbers: 89,
  activeBarbers: 83,
  suspendedBarbers: 6,
  unverifiedCount: 12,
};

export const MOCK_REVIEWS_FOR_MODERATION: ReviewForModeration[] = [
  {
    reviewId: 'REV001',
    bookingId: 'BOOK001',
    reviewerId: 'CUST001',
    reviewerName: 'Ahmad Pratama',
    barberName: 'Toni Suryatno',
    rating: 5,
    comment: 'Potongan rambut rapi, master Toni sangat profesional dan ramah',
    status: 'pending',
    createdAt: '2024-08-03T16:30:00Z',
  },
  {
    reviewId: 'REV002',
    bookingId: 'BOOK002',
    reviewerId: 'CUST003',
    reviewerName: 'Dedi Wibowo',
    barberName: 'Rido Handoko',
    rating: 1,
    comment: 'Sangat kecewa, hasil potong berantakan dan service buruk',
    status: 'pending',
    flaggedReason: 'Potentially false negative review',
    createdAt: '2024-08-03T14:15:00Z',
  },
  {
    reviewId: 'REV003',
    bookingId: 'BOOK003',
    reviewerId: 'CUST004',
    reviewerName: 'Edi Kesuma',
    barberName: 'Toni Suryatno',
    rating: 4,
    comment: 'Bagus, hanya sedikit banyak tunggu',
    status: 'approved',
    submittedAt: '2024-08-02T10:00:00Z',
    createdAt: '2024-08-02T09:00:00Z',
  },
];

export const MOCK_BOOKINGS_FOR_VERIFICATION: BookingForVerification[] = [
  {
    bookingId: 'BOOK001',
    customerId: 'CUST001',
    customerName: 'Ahmad Pratama',
    barberId: 'BARB001',
    barberName: 'Toni Suryatno',
    bookingDate: '2024-08-04',
    bookingTime: '14:00',
    amount: 50000,
    paymentStatus: 'completed',
    verificationStatus: 'verified',
    createdAt: '2024-08-03T10:00:00Z',
  },
  {
    bookingId: 'BOOK002',
    customerId: 'CUST002',
    customerName: 'Budi Santoso',
    barberId: 'BARB001',
    barberName: 'Toni Suryatno',
    bookingDate: '2024-08-04',
    bookingTime: '15:30',
    amount: 85000,
    paymentStatus: 'pending',
    verificationStatus: 'pending',
    createdAt: '2024-08-02T14:00:00Z',
  },
  {
    bookingId: 'BOOK003',
    customerId: 'CUST005',
    customerName: 'Roni Kusuma',
    barberId: 'BARB002',
    barberName: 'Rido Handoko',
    bookingDate: '2024-08-03',
    bookingTime: '10:00',
    amount: 150000,
    paymentStatus: 'completed',
    verificationStatus: 'flagged',
    flaggedReason: 'Duplicate payment detected',
    createdAt: '2024-08-01T11:00:00Z',
  },
];

export const MOCK_ADMIN_METRICS: AdminDashboardMetrics = {
  totalUsers: 545,
  totalBookings: 2156,
  totalRevenue: 18500000,
  averageRating: 4.6,
  ticketsOpen: 12,
  reviewsPending: 8,
  bookingsFlagged: 3,
};

export const MOCK_ADMIN_DASHBOARD: AdminDashboardData = {
  adminUser: MOCK_ADMIN_USER,
  metrics: MOCK_ADMIN_METRICS,
  recentTickets: MOCK_SUPPORT_TICKETS.slice(0, 3),
  recentReviews: MOCK_REVIEWS_FOR_MODERATION.slice(0, 2),
  flaggedBookings: MOCK_BOOKINGS_FOR_VERIFICATION.filter((b) => b.verificationStatus === 'flagged'),
  usersNeedingVerification: MOCK_SYSTEM_USERS.filter((u) => u.verificationStatus === 'pending'),
};

export const MOCK_ADMIN_ANALYTICS: AdminAnalyticsData = {
  period: 'monthly',
  bookingTrend: [
    { date: '2024-07-29', count: 45 },
    { date: '2024-07-30', count: 52 },
    { date: '2024-07-31', count: 48 },
    { date: '2024-08-01', count: 61 },
    { date: '2024-08-02', count: 55 },
    { date: '2024-08-03', count: 68 },
    { date: '2024-08-04', count: 42 },
  ],
  revenueTrend: [
    { date: '2024-07-29', amount: 2250000 },
    { date: '2024-07-30', amount: 2600000 },
    { date: '2024-07-31', amount: 2400000 },
    { date: '2024-08-01', amount: 3050000 },
    { date: '2024-08-02', amount: 2750000 },
    { date: '2024-08-03', amount: 3400000 },
    { date: '2024-08-04', amount: 2100000 },
  ],
  userGrowth: [
    { date: '2024-07-29', customers: 420, barbers: 78 },
    { date: '2024-07-30', customers: 428, barbers: 80 },
    { date: '2024-07-31', customers: 436, barbers: 82 },
    { date: '2024-08-01', customers: 445, barbers: 85 },
    { date: '2024-08-02', customers: 450, barbers: 87 },
    { date: '2024-08-03', customers: 453, barbers: 89 },
    { date: '2024-08-04', customers: 456, barbers: 89 },
  ],
  topBarbers: [
    { barberId: 'BARB001', name: 'Toni Suryatno', bookings: 156, revenue: 6800000 },
    { barberId: 'BARB002', name: 'Rido Handoko', bookings: 98, revenue: 4200000 },
    { barberId: 'BARB003', name: 'Aldi Gunawan', bookings: 87, revenue: 3900000 },
  ],
  topCustomers: [
    { customerId: 'CUST001', name: 'Ahmad Pratama', bookings: 28 },
    { customerId: 'CUST006', name: 'Fajar Santoso', bookings: 22 },
    { customerId: 'CUST007', name: 'Hendra Wijaya', bookings: 19 },
  ],
};

export const MOCK_SYSTEM_HEALTH: SystemHealthData = {
  apiStatus: 'healthy',
  databaseStatus: 'healthy',
  storageUsage: 67,
  activeUsers: 234,
  averageResponseTime: 145,
  errorRate: 0.8,
};

export const MOCK_ADMIN_CHAT_CONVERSATIONS: ChatConversation[] = [
  {
    conversationId: 'CONV001',
    participantId: 'CUST001',
    participantName: 'Ahmad Pratama',
    participantRole: 'customer',
    participantAvatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    lastMessage: 'Terima kasih bantuan support-nya',
    sentTimestamp: '2024-08-03T16:30:00Z',
    unreadCount: 0,
    readStatus: 'read',
  },
  {
    conversationId: 'CONV002',
    participantId: 'BARB001',
    participantName: 'Toni Suryatno',
    participantRole: 'barber',
    participantAvatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    lastMessage: 'Kapan bisa diperbaiki?',
    sentTimestamp: '2024-08-03T14:15:00Z',
    unreadCount: 1,
    readStatus: 'delivered',
  },
  {
    conversationId: 'CONV003',
    participantId: 'CUST005',
    participantName: 'Roni Kusuma',
    participantRole: 'customer',
    lastMessage: 'Ada masalah dengan pembayaran saya',
    sentTimestamp: '2024-08-02T10:45:00Z',
    unreadCount: 0,
    readStatus: 'read',
  },
];
