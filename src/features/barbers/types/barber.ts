/**
 * Barber Feature Types
 * Defines interfaces for barber operations, services, bookings, and analytics
 */

import type {
    BarberListingStatus,
    BarberOnboardingStatus,
    BarberVerificationStatus,
    BookingStatus,
    PaymentStatus,
} from '@/types/domain';

export interface BarberProfile {
  barberId: string;
  name: string;
  /** Canonical customer-facing name once set (see UpdateBarberProfileRequest) --
   * customer surfaces read `displayName || name`. Legacy documents predating
   * this field simply omit it. */
  displayName?: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
  profileImagePath?: string;
  shopName: string;
  shopDescription: string;
  shopAddress: string;
  shopImageUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  geohash?: string;
  serviceRadiusKm?: number;
  acceptsAtBarbershop?: boolean;
  acceptsHomeService?: boolean;
  homeServiceTravelBufferMinutes?: number;
  acceptingNewBookings?: boolean;
  ratingAverage?: number;
  reviewCount?: number;
  isVerified: boolean;
  verificationStatus: BarberVerificationStatus;
  listingStatus?: BarberListingStatus;
  onboardingStatus?: BarberOnboardingStatus;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export const MAX_BARBER_GALLERY_IMAGES = 8;

export interface BarberGalleryImage {
  imageId: string;
  barberId: string;
  storagePath: string;
  publicUrl: string;
  caption?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BarberService {
  serviceId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BarberBooking {
  bookingId: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  bookingDate: string;
  bookingTime: string;
  status: BookingStatus;
  services: BarberService[];
  /** Net service value (base price only) -- what dashboard/analysis already sum as "Nilai Layanan". Never applicationFee. */
  totalAmount: number;
  /** Home-service fee, when applicable -- part of the barber's operational value, distinct from the platform's applicationFee. */
  homeServiceFee?: number;
  /** Optional customer tip -- the barber's to keep. */
  tipAmount?: number;
  /** What the customer actually paid (base - voucher + homeFee + appFee + tip) -- never shown as the barber's own value. */
  grossAmount?: number;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
}

export interface BarberScheduleDay {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday' | string;
  isOpen: boolean;
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
  openTime?: string;
  closeTime?: string;
}

export interface BarberWeeklySchedule {
  barberId: string;
  schedule: BarberScheduleDay[];
  isConfigured: boolean;
  isConfirmed: boolean;
  scheduleSource: 'custom' | 'confirmed_default';
  unavailableDates?: string[];
  lastUpdated: string;
}

export interface BarberReview {
  reviewId: string;
  customerId: string;
  customerName: string;
  customerAvatarUrl?: string;
  rating: number;
  comment: string;
  createdAt: string;
  status: 'pending' | 'published' | 'replied';
  replyText?: string;
  repliedAt?: string;
}

export interface BarberAnalytics {
  period: 'daily' | 'weekly' | 'monthly';
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  dailyRevenue?: number;
  weeklyRevenue?: number;
  monthlyRevenue?: number;
  averageRating?: number;
  chartData?: { label: string; value: number }[];
  latestReview?: BarberReview;
}

export interface BarberBookingStatusSummary {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  today?: number;
}

export interface BarberAddServiceRequest {
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
}

export interface UpdateBarberScheduleRequest {
  schedule: BarberScheduleDay[];
  unavailableDates?: string[];
}

export interface UpdateBarberProfileRequest {
  name?: string;
  displayName?: string;
  shopName?: string;
  shopDescription?: string;
  shopAddress?: string;
  phone?: string;
  profileImageUrl?: string;
  shopImageUrl?: string;
}

export interface BarberDashboardData {
  profile: BarberProfile;
  bookingsSummary: BarberBookingStatusSummary;
  analytics: BarberAnalytics;
  activeBooking?: BarberBooking;
  recentReviews: BarberReview[];
}

export interface BarberVerificationData {
  barberId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'rejected';
  documentUrl?: string;
  submittedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

export interface BarberNotification {
  id: string;
  type: 'booking' | 'review' | 'payment' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface TimeDateRange {
  start: string;
  end: string;
}

export interface BarberTimeSlot {
  time: string;
  available: boolean;
  bookingId?: string;
}

export interface TimeSlotAvailability {
  date: string;
  slots: BarberTimeSlot[];
}
