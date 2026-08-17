/**
 * Admin Shared Types
 * Types for admin-only backend operations.
 */

export type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ListingStatus = 'active' | 'inactive' | 'suspended';
export type UserStatus = 'active' | 'pending_verification' | 'suspended';
export type UserRole = 'customer' | 'barber' | 'admin';
// Canonical document types actually written by the mobile upload flow
// (src/app/(barber-onboarding)/documents.tsx + barber-registration.service.ts).
export type AllowedDocType = 'ktp' | 'business_license' | 'certificate';

// ============================================================================
// Barber Registration
// ============================================================================

export interface AdminBarberRegistration {
  barberId: string;
  ownerName: string;
  businessName: string;
  phoneNumber?: string;
  businessAddress?: string;
  serviceArea?: string;
  verificationStatus: VerificationStatus;
  onboardingStatus?: string;
  submittedAt?: any; // Firestore Timestamp
  reviewedAt?: any;
  reviewedBy?: string;
  rejectionReason?: string | null;
  // Batch 09D-2B: raw documentPaths (storage paths) are intentionally NOT part of the
  // browser-facing contract -- the Admin browser must never rely on/receive authoritative
  // storage paths (see getSignedDocumentUrl). Only a presence map is exposed; the actual
  // path is resolved server-side again when the Admin requests a signed URL.
  documentsAvailable?: Record<AllowedDocType, boolean>;
}

export interface ApproveBarberResult {
  alreadyApproved: boolean;
}

export interface RejectBarberResult {
  alreadyRejected: boolean;
}

export interface SignedUrlResult {
  url: string;
  expiresAt: string; // ISO string
}

// ============================================================================
// User Management
// ============================================================================

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName?: string;
  phoneNumber?: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: any; // Firestore Timestamp
  statusChangedAt?: any;
  statusChangedBy?: string;
}

export interface UpdateUserStatusResult {
  idempotent: boolean;
}

// ============================================================================
// Barber Profiles
// ============================================================================

export interface AdminBarberRecord {
  id: string;
  displayName: string;
  businessName?: string;
  verificationStatus: VerificationStatus;
  listingStatus?: ListingStatus;
  acceptingNewBookings?: boolean;
  ratingAverage?: number;
  reviewCount?: number;
  approvedAt?: any;
  approvedBy?: string;
}

// ============================================================================
// Bookings
// ============================================================================

export interface AdminBookingRecord {
  bookingId: string;
  customerId: string;
  barberId: string;
  serviceId?: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  price: number;
  date: string;
  startTime: string;
  createdAt?: any;
}

// ============================================================================
// Categories
// ============================================================================

export interface AdminCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

// ============================================================================
// Dashboard Metrics
// ============================================================================

export interface AdminSuspendedBarber {
  uid: string;
  displayName: string;
  businessName?: string;
  email?: string;
  status: string;
  statusReason?: string;
  statusChangedAt?: string;
}

export interface DashboardMetrics {
  totalActiveCustomers: number;
  totalApprovedBarbers: number;
  pendingBarberRegistrations: number;
  suspendedAccounts: number;
  suspendedBarbers: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayBookings: number;
  currentMonthServiceValue: number; // IDR, real transaction value only
  recentBarberRegistrations: AdminBarberRegistration[];
  recentBookings: (AdminBookingRecord & { customerName?: string; barberName?: string })[];
  suspendedBarbersList: AdminSuspendedBarber[];
  recentTransactions: AdminTransaction[];
}

// ============================================================================
// Transactions
// ============================================================================

export interface AdminTransaction {
  transactionId: string;
  bookingId?: string;
  provider: 'cash_on_service' | 'midtrans_sandbox';
  environment: 'cash' | 'sandbox';
  orderId?: string;
  grossAmount: number;
  status: string;
  paymentType?: string;
  createdAt?: string;
  paidAt?: string;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  pageSize?: number;
  startAfter?: string; // documentId
}

export interface PaginationResult<T> {
  items: T[];
  nextPageStartAfter?: string;
  hasMore: boolean;
}

// ============================================================================
// Verification Detail
// ============================================================================

export interface VerificationDocumentMetadata {
  type: AllowedDocType;
  label: string;
  available: boolean;
}

export interface AdminBarberRegistrationDetail extends AdminBarberRegistration {
  documents_metadata?: VerificationDocumentMetadata[];
  accountStatus?: UserStatus;
}

// ============================================================================
// Barber Management
// ============================================================================

export interface AdminBarberSummary {
  uid: string;
  displayName: string;
  businessName?: string;
  verificationStatus: VerificationStatus;
  listingStatus?: ListingStatus;
  accountStatus: UserStatus;
  ratingAverage?: number;
  reviewCount?: number;
  approvedAt?: any;
}

export interface AdminBarberDetail extends AdminBarberSummary {
  phoneNumber?: string;
  email?: string;
  businessAddress?: string;
  serviceArea?: string;
  acceptingNewBookings?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// ============================================================================
// Category Management
// ============================================================================

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  icon?: string;
  active?: boolean;
  order?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  icon?: string;
  active?: boolean;
  order?: number;
}
