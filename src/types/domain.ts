export type AppRole = "customer" | "barber" | "admin";
export type UserRole = AppRole;

export type PublicRegistrationRole = "customer" | "barber";

export type UserStatus =
  | "active"
  | "pending_verification"
  | "suspended";

export type BarberVerificationStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected";

export type BarberListingStatus =
  | "inactive"
  | "active"
  | "suspended";

export type BarberOnboardingStatus =
  | "account_created"
  | "profile_incomplete"
  | "documents_incomplete"
  | "ready_to_submit"
  | "submitted"
  | "completed";

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "initiated"
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

/**
 * Explicit legacy status read mapper.
 * Translates old stored database values to canonical BookingStatus.
 * All new Firestore writes must use canonical values directly.
 */
export function mapLegacyBookingStatus(rawStatus?: string): BookingStatus {
  if (!rawStatus) return "pending";

  const normalized = rawStatus.toLowerCase().trim();

  switch (normalized) {
    case "booked":
    case "waiting":
    case "pending":
      return "pending";

    case "approved":
    case "accepted":
      return "accepted";

    case "declined":
    case "rejected":
      return "rejected";

    case "on_process":
    case "processing":
    case "in_progress":
      return "in_progress";

    case "finished":
    case "completed":
      return "completed";

    case "canceled":
    case "cancelled":
      return "cancelled";

    default:
      return "pending";
  }
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  profileImageUrl?: string;
  profileImagePath?: string;
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
  profileImageUrl?: string;
  profileImagePath?: string;
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
  paymentStatus?: PaymentStatus;
  paymentProvider?: string;
  paymentOrderId?: string;
  paymentId?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentRecord {
  bookingId: string;
  customerId: string;
  barberId: string;
  provider: string;
  environment: string;
  orderId: string;
  grossAmount: number;
  status: PaymentStatus;
  transactionStatus?: string;
  fraudStatus?: string;
  paymentType?: string;
  transactionId?: string;
  snapToken?: string;
  redirectUrl?: string;
  // The actual field backend/vercel/api/payments.ts writes to payments/{bookingId}
  // (see payment-api.service.ts) -- redirectUrl above was never populated.
  paymentUrl?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  expiresAt?: string;
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