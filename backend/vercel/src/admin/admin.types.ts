/**
 * Admin Shared Types
 * Types for admin-only backend operations.
 */

export type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ListingStatus      = 'active' | 'inactive' | 'suspended';
export type UserStatus         = 'active' | 'pending_verification' | 'suspended';
export type UserRole           = 'customer' | 'barber' | 'admin';
export type AllowedDocType     = 'ktp' | 'selfie_with_ktp' | 'business_permit';

export interface AdminBarberRegistration {
  barberId: string;
  ownerName: string;
  businessName: string;
  phoneNumber?: string;
  businessAddress?: string;
  serviceArea?: string;
  verificationStatus: VerificationStatus;
  onboardingStatus?: string;
  submittedAt?: FirebaseFirestore.Timestamp;
  reviewedAt?: FirebaseFirestore.Timestamp;
  reviewedBy?: string;
  rejectionReason?: string | null;
  documents?: Record<string, string>; // documentType -> storagePath
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  createdAt?: FirebaseFirestore.Timestamp;
}

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
  approvedAt?: FirebaseFirestore.Timestamp;
  approvedBy?: string;
}

export interface AdminBookingRecord {
  id: string;
  customerId: string;
  barberId: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  totalPrice: number;
  date: string;
  startTime: string;
  createdAt?: FirebaseFirestore.Timestamp;
}

export interface ApproveBarberResult {
  alreadyApproved: boolean;
}

export interface RejectBarberResult {
  alreadyRejected: boolean;
}

export interface UpdateUserStatusResult {
  idempotent: boolean;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: string; // ISO string
}
