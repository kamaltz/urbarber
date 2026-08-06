/**
 * Barber Feature Types
 * Defines interfaces for barber operations, services, bookings, and analytics
 */

import type { BookingStatus } from '@/types/domain';

export interface BarberProfile {
  barberId: string;
  name: string;
  email: string;
  phone: string;
  profileImageUrl?: string;
  profileImagePath?: string;
  shopName: string;
  shopDescription: string;
  shopAddress: string;
  shopImageUrl?: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'approved' | 'rejected';
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
  totalAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: string;
}

export interface BarberScheduleDay {
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  isOpen: boolean;
  startTime?: string; // HH:MM format
  endTime?: string; // HH:MM format
}

export interface BarberWeeklySchedule {
  barberId: string;
  schedule: BarberScheduleDay[];
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
}

export interface UpdateBarberProfileRequest {
  name?: string;
  shopName?: string;
  shopDescription?: string;
  shopAddress?: string;
  phone?: string;
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
