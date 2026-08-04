/**
 * Mock Barber Data
 * Provides sample data for barber feature development
 */

import type {
    BarberAnalytics,
    BarberBooking,
    BarberBookingStatusSummary,
    BarberDashboardData,
    BarberProfile,
    BarberReview,
    BarberService,
    BarberWeeklySchedule,
} from '../types/barber';

export const MOCK_BARBER_ID = 'BARB001';

export const MOCK_BARBER_PROFILE: BarberProfile = {
  barberId: MOCK_BARBER_ID,
  name: 'Toni Suryatno',
  email: 'toni@tonibarbershop.com',
  phone: '+62812-3456-7890',
  profileImageUrl:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  shopName: 'Toni Barbershop Premium',
  shopDescription:
    'Barbershop premium dengan pelayanan profesional dan produk berkualitas tinggi',
  shopAddress: 'Jl. H. R. Rasuna Said, Kuningan, Jakarta Selatan 12950',
  shopImageUrl:
    'https://images.unsplash.com/photo-1536828291940-19d0a72ff43c?w=600&h=400&fit=crop',
  isVerified: true,
  verificationStatus: 'approved',
  createdAt: '2024-01-15T08:00:00Z',
  updatedAt: '2024-08-04T10:30:00Z',
};

export const MOCK_BARBER_SERVICES: BarberService[] = [
  {
    serviceId: 'SVC001',
    name: 'Potongan Rambut Pria',
    description: 'Potongan rambut gaya terkini untuk pria',
    price: 50000,
    durationMinutes: 30,
    imageUrl:
      'https://images.unsplash.com/photo-1599351751234-97856d9e1a4b?w=300&h=300&fit=crop',
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    serviceId: 'SVC002',
    name: 'Perawatan Jenggot',
    description: 'Grooming jenggot dengan teknik profesional',
    price: 35000,
    durationMinutes: 20,
    imageUrl:
      'https://images.unsplash.com/photo-1585747860715-cd4628902d4a?w=300&h=300&fit=crop',
    isActive: true,
    createdAt: '2024-02-05T00:00:00Z',
  },
  {
    serviceId: 'SVC003',
    name: 'Pewarnaan Rambut',
    description: 'Pewarnaan dengan bahan premium',
    price: 200000,
    durationMinutes: 60,
    imageUrl:
      'https://images.unsplash.com/photo-1562322140-8baeae34c886?w=300&h=300&fit=crop',
    isActive: true,
    createdAt: '2024-02-10T00:00:00Z',
  },
  {
    serviceId: 'SVC004',
    name: 'Pijat Kepala & Leher',
    description: 'Relaksasi dengan pijat profesional',
    price: 75000,
    durationMinutes: 30,
    imageUrl: undefined,
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z',
  },
];

export const MOCK_BARBER_BOOKINGS: BarberBooking[] = [
  {
    bookingId: 'BOOK001',
    customerId: 'CUST001',
    customerName: 'Ahmad Pratama',
    customerCode: 'AP001',
    bookingDate: '2024-08-04',
    bookingTime: '14:00',
    status: 'waiting',
    services: [MOCK_BARBER_SERVICES[0]],
    totalAmount: 50000,
    paymentStatus: 'completed',
    notes: 'Potongan rambut clean cut dengan fade',
    createdAt: '2024-08-03T10:00:00Z',
  },
  {
    bookingId: 'BOOK002',
    customerId: 'CUST002',
    customerName: 'Budi Santoso',
    customerCode: 'BS002',
    bookingDate: '2024-08-04',
    bookingTime: '15:30',
    status: 'processing',
    services: [MOCK_BARBER_SERVICES[0], MOCK_BARBER_SERVICES[1]],
    totalAmount: 85000,
    paymentStatus: 'completed',
    createdAt: '2024-08-02T14:00:00Z',
  },
  {
    bookingId: 'BOOK003',
    customerId: 'CUST003',
    customerName: 'Rido Handoko',
    bookingDate: '2024-08-03',
    bookingTime: '11:00',
    status: 'completed',
    services: [MOCK_BARBER_SERVICES[0]],
    totalAmount: 50000,
    paymentStatus: 'completed',
    createdAt: '2024-08-02T09:00:00Z',
  },
];

export const MOCK_BARBER_REVIEWS: BarberReview[] = [
  {
    reviewId: 'REV001',
    customerId: 'CUST001',
    customerName: 'Ahmad Pratama',
    customerAvatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
    rating: 5,
    comment: 'Potongan rambut rapi, master Toni sangat profesional dan ramah',
    createdAt: '2024-08-01T16:30:00Z',
    status: 'published',
  },
  {
    reviewId: 'REV002',
    customerId: 'CUST002',
    customerName: 'Budi Santoso',
    customerAvatarUrl:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
    rating: 4,
    comment: 'Pelayanan bagus, tempat bersih, harga sesuai',
    createdAt: '2024-07-30T12:15:00Z',
    status: 'published',
    replyText: 'Terima kasih Budi, kami senang melayani Anda!',
    repliedAt: '2024-07-30T18:00:00Z',
  },
  {
    reviewId: 'REV003',
    customerId: 'CUST004',
    customerName: 'Dedi Wibowo',
    rating: 5,
    comment: 'Master Toni berpengalaman, hasil potong rapi',
    createdAt: '2024-07-28T10:45:00Z',
    status: 'published',
  },
];

export const MOCK_BARBER_ANALYTICS: BarberAnalytics = {
  period: 'monthly',
  totalBookings: 45,
  completedBookings: 42,
  pendingBookings: 2,
  cancelledBookings: 1,
  totalRevenue: 2250000,
  dailyRevenue: 150000,
  weeklyRevenue: 450000,
  monthlyRevenue: 2250000,
  averageRating: 4.8,
  chartData: [
    { label: 'Sen', value: 350000 },
    { label: 'Sel', value: 420000 },
    { label: 'Rab', value: 380000 },
    { label: 'Kam', value: 400000 },
    { label: 'Jum', value: 500000 },
    { label: 'Sab', value: 200000 },
  ],
  latestReview: MOCK_BARBER_REVIEWS[0],
};

export const MOCK_BARBER_BOOKING_SUMMARY: BarberBookingStatusSummary = {
  total: 45,
  completed: 42,
  pending: 2,
  cancelled: 1,
  today: 8,
};

export const MOCK_BARBER_WEEKLY_SCHEDULE: BarberWeeklySchedule = {
  barberId: MOCK_BARBER_ID,
  schedule: [
    { dayOfWeek: 'Monday', isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'Tuesday', isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'Wednesday', isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'Thursday', isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'Friday', isOpen: true, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 'Saturday', isOpen: true, startTime: '09:00', endTime: '18:00' },
    { dayOfWeek: 'Sunday', isOpen: false },
  ],
  lastUpdated: '2024-08-01T00:00:00Z',
};

export const MOCK_BARBER_DASHBOARD_DATA: BarberDashboardData = {
  profile: MOCK_BARBER_PROFILE,
  bookingsSummary: MOCK_BARBER_BOOKING_SUMMARY,
  analytics: MOCK_BARBER_ANALYTICS,
  activeBooking: MOCK_BARBER_BOOKINGS[0],
  recentReviews: MOCK_BARBER_REVIEWS.slice(0, 2),
};
