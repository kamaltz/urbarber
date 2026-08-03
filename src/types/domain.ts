export type UserRole = "customer" | "barber" | "admin";

export type UserStatus =
  | "active"
  | "pending_verification"
  | "suspended";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatarUrl?: string;
}

export interface Barber {
  id: string;
  userId: string;
  displayName: string;
  description: string;
  address: string;
  ratingAverage: number;
  reviewCount: number;
  verified: boolean;
  imageUrl?: string;
}

export interface BarberService {
  id: string;
  barberId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  active: boolean;
}

export interface Booking {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  address: string;
  notes?: string;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerId: string;
  barberId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}