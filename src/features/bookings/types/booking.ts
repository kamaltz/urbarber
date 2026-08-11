/**
 * Booking Feature Types
 */

import type { BookingStatus as DomainBookingStatus, PaymentStatus as DomainPaymentStatus } from '@/types/domain';

export type BookingStatus = DomainBookingStatus;
export type BookingType = 'home' | 'onsite';
export type PaymentMethod = 'ewallet' | 'bank_transfer';

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
  imageUrl?: string;
}

export interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export interface Barber {
  id: string;
  name: string;
  specialization: string;
  profileUrl?: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  distance: string;
  rating: string;
  imageUrl: string;
  address?: string;
}

export interface Booking {
  id: string;
  barberId: string;
  customerId: string;
  shopId: string;
  shop: Shop;
  barber: Barber;
  services: Service[];
  status: BookingStatus;
  paymentStatus?: DomainPaymentStatus;
  bookingType: BookingType;
  serviceLocationType?: 'barbershop' | 'customer_home';
  serviceAddress?: string;
  serviceLocation?: {
    latitude: number;
    longitude: number;
  };
  locationSource?: 'manual' | 'current_location' | 'map_pin';
  distanceKm?: number;
  scheduledAt: string; // ISO date
  scheduledTime: string; // HH:MM format
  totalPrice: number;
  subtotal: number;
  travelFee?: number;
  handlingFee?: number;
  discount?: number;
  couponCode?: string;
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt: string;
}

export interface BookingTracking {
  bookingId: string;
  customerId: string;
  barberId: string;
  trackingStatus: 'inactive' | 'en_route' | 'arrived' | 'stopped';
  isActive: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
  accuracy?: number;
  heading?: number;
  speed?: number;
  startedAt?: string;
  arrivedAt?: string;
  updatedAt?: string;
  stoppedAt?: string;
  expiresAt?: string;
}

export interface BookingReview {
  id: string;
  bookingId: string;
  customerId: string;
  rating: number;
  reviewText: string;
  tags?: string[];
  createdAt: string;
}

export interface CouponCode {
  code: string;
  discount: number;
  description?: string;
  isValid: boolean;
}

export interface BookingFormData {
  barberId: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes?: number;
  selectedDate: string;
  selectedTime?: string;
  slotKey?: string;
  address?: string;
  notes?: string;
  bookingType: BookingType;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
}

export interface TimeSlotAvailability {
  date: string;
  slots: TimeSlot[];
}

export interface Bank {
  id: string;
  code: string;
  name: string;
  logo?: string;
}
