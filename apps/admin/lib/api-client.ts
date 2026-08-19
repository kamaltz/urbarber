import { firebaseAuth } from './firebase';
import { ApiError } from './errors';

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL;

if (!configuredApiBaseUrl && process.env.NODE_ENV === 'production') {
  throw new Error(
    'NEXT_PUBLIC_API_BASE_URL wajib dikonfigurasi untuk production.',
  );
}

const API_BASE_URL =
  configuredApiBaseUrl || 'http://localhost:3000';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  success?: boolean;
}

export interface AdminIdentity {
  uid: string;
  email: string;
  appRole: 'admin';
  status: 'active';
  displayName?: string;
}

// Dashboard
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
  totalBarbers: number;
  totalApprovedBarbers: number;
  pendingBarberRegistrations: number;
  suspendedAccounts: number;
  suspendedBarbers: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  todayBookings?: number;
  currentMonthServiceValue: number;
  // Gross Transaction Value: what customers actually paid, not "revenue".
  grossTransactionValue: number;
  // Platform's actual monetization metric -- use this label for "revenue", never grossTransactionValue.
  platformApplicationFees: number;
  activeVouchersCount: number;
  recentBarberRegistrations: AdminBarberRegistration[];
  recentBookings: (AdminBookingRecord & { customerName?: string; barberName?: string })[];
  suspendedBarbersList?: AdminSuspendedBarber[];
  recentTransactions?: AdminTransaction[];
}

// Barber Registration
// Canonical document types actually written by the mobile upload flow
// (src/app/(barber-onboarding)/documents.tsx + barber-registration.service.ts),
// matching backend/vercel/src/admin/admin.types.ts's AllowedDocType. Kept as a small
// local type/constant here rather than importing across the apps/admin <-> backend
// package boundary, since the two are deployed independently.
export type AllowedDocType = 'ktp' | 'business_license' | 'certificate';

export const DOCUMENT_TYPE_LABELS: Record<AllowedDocType, string> = {
  ktp: 'KTP',
  business_license: 'Izin Usaha',
  certificate: 'Sertifikat',
};

export const ALL_DOCUMENT_TYPES: AllowedDocType[] = ['ktp', 'business_license', 'certificate'];

export interface AdminBarberServicePreview {
  serviceId: string;
  name: string;
  price: number;
  durationMinutes?: number;
  isActive: boolean;
}

export interface AdminBarberRegistration {
  barberId: string;
  ownerName: string;
  businessName: string;
  email?: string;
  phoneNumber: string;
  businessAddress: string;
  serviceArea: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  // Presence-only map; the Admin browser never receives or needs raw storage paths.
  // A signed URL is requested on demand via getDocumentUrl(barberId, documentType).
  documentsAvailable?: Record<AllowedDocType, boolean>;
  services?: AdminBarberServicePreview[];
  galleryImageUrls?: string[];
  galleryCount?: number;
}

// User Management
export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName?: string;
  role: 'customer' | 'barber' | 'admin';
  status: 'active' | 'pending_verification' | 'suspended' | 'deleted';
  phoneNumber?: string;
  createdAt: string;
}

// Bookings - Legacy (backward compat for dashboard recent bookings)
export interface AdminBookingRecord {
  bookingId: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  date: string;
  startTime: string;
  price: number;
  paymentMethod?: 'cash_on_service' | 'midtrans_sandbox';
  paymentStatus?: 'not_required' | 'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded' | 'partially_refunded';
  createdAt: string;
}

// Canonical pricing breakdown, as persisted on bookings/payments by
// backend/vercel/src/payments/pricing-calculator.ts. Optional throughout --
// legacy records predating the pricing/voucher engine have none of these.
export interface AdminPricingBreakdown {
  baseAmount?: number;
  voucherCode?: string | null;
  voucherDiscount?: number;
  homeServiceFee?: number;
  applicationFee?: number;
  tipAmount?: number;
  grossAmount?: number;
}

// Bookings - Phase 3: Summary for admin monitoring list
export interface AdminBookingSummary extends AdminPricingBreakdown {
  bookingId: string;
  customerName: string;
  barberName: string;
  serviceName: string;
  serviceLocationType?: 'home_service' | 'at_salon';
  serviceAddress?: string;
  date: string;
  startTime: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled';
  paymentMethod: 'cash_on_service' | 'midtrans_sandbox';
  paymentStatus: 'not_required' | 'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded' | 'partially_refunded';
  totalPrice: number;
  createdAt: string;
}

// Bookings - Phase 3: Detail for admin booking review
export interface AdminBookingDetail extends AdminBookingSummary {
  customerId: string;
  customerEmail?: string;
  customerPhone?: string;
  barberId: string;
  barberEmail?: string;
  barberPhone?: string;
  serviceId: string;
  endTime?: string;
  notes?: string;
  updatedAt?: string;
  paidAt?: string;
}

// Transactions - Phase 3: Payment transaction record
export interface AdminTransaction extends AdminPricingBreakdown {
  transactionId: string;
  bookingId?: string;
  provider: 'cash_on_service' | 'midtrans_sandbox';
  environment: 'cash' | 'sandbox';
  orderId?: string;
  grossAmount: number;
  status: 'not_required' | 'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded' | 'partially_refunded';
  paymentType?: string;
  createdAt: string;
  paidAt?: string;
}

// Pagination
export interface PaginationResult<T> {
  items: T[];
  nextPageStartAfter?: string;
  hasMore: boolean;
}

// Shared shape for the force-delete account endpoints (barbers and users) --
// active bookings are cancelled rather than blocking deletion.
export interface AccountDeleteResult {
  success: boolean;
  message: string;
  cancelledBookingsCount: number;
  paidBookingsNeedingReviewCount: number;
}

// Phase 2: Barber Management
export interface AdminBarberSummary {
  uid: string;
  displayName: string;
  businessName?: string;
  email?: string;
  phoneNumber?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  listingStatus?: 'active' | 'inactive' | 'suspended';
  accountStatus: 'active' | 'pending_verification' | 'suspended' | 'deleted';
  ratingAverage?: number;
  reviewCount?: number;
  approvedAt?: string;
  createdAt?: string;
}

export interface AdminBarberDetail extends AdminBarberSummary {
  email?: string;
  phoneNumber?: string;
  businessAddress?: string;
  serviceArea?: string;
  acceptingNewBookings?: boolean;
  createdAt?: string;
  updatedAt?: string;
  activeBookingsCount?: number;
  paidActiveBookingsCount?: number;
}

// Phase 2: Category Management
export interface AdminCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  active: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// Phase 4: Pricing Settings
export interface AdminPricingSettings {
  applicationFee: {
    enabled: boolean;
    mode: 'fixed' | 'percentage';
    fixedAmount?: number;
    percentage?: number;
    minimumAmount?: number;
    maximumAmount?: number;
  };
  homeServiceFee: {
    enabled: boolean;
    mode: 'fixed' | 'distance';
    fixedAmount?: number;
    baseAmount?: number;
    includedDistanceKm?: number;
    perKmAmount?: number;
    maxServiceDistanceKm?: number;
  };
}

// Phase 4: Voucher Management
export interface AdminVoucher {
  code: string;
  name: string;
  description?: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number;
  minimumBaseAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface VoucherCreateInput {
  code: string;
  name: string;
  description?: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number;
  minimumBaseAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  perUserLimit?: number;
  status?: 'active' | 'inactive';
}

export interface VoucherUpdateInput {
  name?: string;
  description?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minimumBaseAmount?: number | null;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number | null;
  perUserLimit?: number | null;
}

export class AdminApiClient {
  private static async getAuthToken(): Promise<string> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Not authenticated. Please log in.');
    }
    return user.getIdToken(false);
  }

  static async request<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken();

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    // Handle error responses
    if (!response.ok) {
      const error = data?.error || { code: 'UNKNOWN_ERROR', message: 'Request failed' };
      throw new ApiError(error.message, error.code, response.status);
    }

    return data;
  }

  /**
   * GET /api/admin/me
   * Verify authentication and load current admin identity
   */
  static async getAdminIdentity(): Promise<AdminIdentity> {
    const response = await this.request<ApiResponse<AdminIdentity>>('/api/admin/me', {
      method: 'GET',
    });
    return response.data!;
  }

  /**
   * GET /api/admin/dashboard
   * Get platform metrics for dashboard
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await this.request<ApiResponse<DashboardMetrics>>('/api/admin/dashboard', {
      method: 'GET',
    });
    return response.data!;
  }

  /**
   * GET /api/admin/barber-registrations
   * Get list of barber registrations with pagination
   */
  static async getBarberRegistrations(
    filter?: 'all' | 'pending' | 'approved' | 'rejected',
    pageSize?: number,
    startAfter?: string
  ): Promise<PaginationResult<AdminBarberRegistration>> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (pageSize) params.append('pageSize', String(pageSize));
    if (startAfter) params.append('startAfter', startAfter);

    const response = await this.request<ApiResponse<PaginationResult<AdminBarberRegistration>>>(
      `/api/admin/barber-registrations?${params}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * GET /api/admin/barber-registrations/:barberId
   * Get single barber registration detail
   */
  static async getBarberRegistrationDetail(barberId: string): Promise<AdminBarberRegistration> {
    const response = await this.request<ApiResponse<AdminBarberRegistration>>(
      `/api/admin/barber-registrations/${barberId}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/barber-registrations/:barberId/approve
   * Approve a barber registration
   */
  static async approveBarber(barberId: string): Promise<{ alreadyApproved: boolean; message: string }> {
    const response = await this.request<ApiResponse<{ alreadyApproved: boolean; message: string }>>(
      `/api/admin/barber-registrations/${barberId}/approve`,
      { method: 'POST' }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/barber-registrations/:barberId/reject
   * Reject a barber registration with reason
   */
  static async rejectBarber(barberId: string, reason: string): Promise<{ alreadyRejected: boolean; message: string }> {
    const response = await this.request<ApiResponse<{ alreadyRejected: boolean; message: string }>>(
      `/api/admin/barber-registrations/${barberId}/reject`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/barber-registrations/document-url
   * Get signed URL for verification document.
   * Sends ONLY barberId + documentType -- never a raw storage path. The backend
   * resolves the authoritative path from Firestore itself.
   */
  static async getDocumentUrl(
    barberId: string,
    documentType: AllowedDocType
  ): Promise<{ url: string; expiresAt: string }> {
    const response = await this.request<ApiResponse<{ url: string; expiresAt: string }>>(
      `/api/admin/barber-registrations/document-url`,
      { method: 'POST', body: JSON.stringify({ barberId, documentType }) }
    );
    return response.data!;
  }

  /**
   * GET /api/admin/users
   * Get list of users with pagination and role filter
   */
  static async getUsers(
    role?: 'all' | 'customer' | 'barber',
    pageSize?: number,
    startAfter?: string
  ): Promise<PaginationResult<AdminUserRecord>> {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (pageSize) params.append('pageSize', String(pageSize));
    if (startAfter) params.append('startAfter', startAfter);

    const response = await this.request<ApiResponse<PaginationResult<AdminUserRecord>>>(
      `/api/admin/users?${params}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * GET /api/admin/users/:userId
   * Get single user detail
   */
  static async getUserDetail(userId: string): Promise<AdminUserRecord> {
    const response = await this.request<ApiResponse<AdminUserRecord>>(`/api/admin/users/${userId}`, {
      method: 'GET',
    });
    return response.data!;
  }

  /**
   * POST /api/admin/users/:userId/status
   * Update user status (active/suspended)
   */
  static async updateUserStatus(
    userId: string,
    targetStatus: 'active' | 'suspended',
    reason?: string
  ): Promise<{ idempotent: boolean; message: string }> {
    const response = await this.request<ApiResponse<{ idempotent: boolean; message: string }>>(
      `/api/admin/users/${userId}/status`,
      { method: 'POST', body: JSON.stringify({ targetStatus, reason }) }
    );
    return response.data!;
  }

  /**
   * DELETE /api/admin/users/:userId
   * Delete a user account (soft delete, force semantics -- active bookings
   * are safely cancelled rather than blocking deletion). A barber-role
   * target is handled by the same backend delegation deleteBarber() uses.
   */
  static async deleteUser(userId: string): Promise<AccountDeleteResult> {
    const response = await this.request<ApiResponse<AccountDeleteResult>>(
      `/api/admin/users/${userId}`,
      { method: 'DELETE' }
    );
    return response.data!;
  }

  // ============================================================================
  // Phase 2: Barber Management
  // ============================================================================

  /**
   * GET /api/admin/barbers
   * Get list of barbers with pagination and filtering
   */
  static async getBarbers(
    filter?: 'all' | 'active' | 'suspended' | 'approved' | 'pending' | 'rejected',
    pageSize?: number,
    startAfter?: string
  ): Promise<PaginationResult<AdminBarberSummary>> {
    const params = new URLSearchParams();
    if (filter) params.append('filter', filter);
    if (pageSize) params.append('pageSize', String(pageSize));
    if (startAfter) params.append('startAfter', startAfter);

    const response = await this.request<ApiResponse<PaginationResult<AdminBarberSummary>>>(
      `/api/admin/barbers?${params}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * GET /api/admin/barbers/:barberId
   * Get single barber detail
   */
  static async getBarberDetail(barberId: string): Promise<AdminBarberDetail> {
    const response = await this.request<ApiResponse<AdminBarberDetail>>(
      `/api/admin/barbers/${barberId}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/barbers/:barberId/suspend
   * Suspend a barber account
   */
  static async suspendBarber(barberId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<ApiResponse<{ success: boolean; message: string }>>(
      `/api/admin/barbers/${barberId}/suspend`,
      { method: 'POST', body: JSON.stringify({ reason }) }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/barbers/:barberId/reactivate
   * Reactivate a suspended barber account
   */
  static async reactivateBarber(barberId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<ApiResponse<{ success: boolean; message: string }>>(
      `/api/admin/barbers/${barberId}/reactivate`,
      { method: 'POST' }
    );
    return response.data!;
  }

  /**
   * DELETE /api/admin/barbers/:barberId
   * Delete a barber account (soft delete, force semantics). Active bookings
   * are cancelled rather than blocking deletion -- cancelledBookingsCount/
   * paidBookingsNeedingReviewCount report what was safely wound down.
   */
  static async deleteBarber(barberId: string): Promise<AccountDeleteResult> {
    const response = await this.request<ApiResponse<AccountDeleteResult>>(
      `/api/admin/barbers/${barberId}`,
      { method: 'DELETE' }
    );
    return response.data!;
  }

  // ============================================================================
  // Phase 2: Category Management
  // ============================================================================

  /**
   * GET /api/admin/categories
   * Get list of all categories
   */
  static async getCategories(): Promise<AdminCategory[]> {
    const response = await this.request<ApiResponse<AdminCategory[]>>(
      `/api/admin/categories`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/categories
   * Create new category
   */
  static async createCategory(
    name: string,
    description?: string,
    icon?: string,
    active?: boolean,
    order?: number
  ): Promise<AdminCategory> {
    const response = await this.request<ApiResponse<AdminCategory>>(
      `/api/admin/categories`,
      {
        method: 'POST',
        body: JSON.stringify({ name, description, icon, active, order }),
      }
    );
    return response.data!;
  }

  /**
   * PATCH /api/admin/categories/:categoryId
   * Update category
   */
  static async updateCategory(
    categoryId: string,
    updates: {
      name?: string;
      description?: string;
      icon?: string;
      active?: boolean;
      order?: number;
    }
  ): Promise<AdminCategory> {
    const response = await this.request<ApiResponse<AdminCategory>>(
      `/api/admin/categories/${categoryId}`,
      { method: 'PATCH', body: JSON.stringify(updates) }
    );
    return response.data!;
  }

  /**
   * DELETE /api/admin/categories/:categoryId
   * Deactivate category
   */
  static async deactivateCategory(categoryId: string): Promise<void> {
    await this.request<ApiResponse<void>>(
      `/api/admin/categories/${categoryId}`,
      { method: 'DELETE' }
    );
  }

  // ============================================================================
  // Phase 3: Booking Monitoring
  // ============================================================================

  /**
   * GET /api/admin/bookings
   * Get list of bookings with pagination and filtering
   */
  static async getBookings(
    status?: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled' | 'all',
    dateFrom?: string,
    dateTo?: string,
    paymentMethod?: 'cash_on_service' | 'midtrans_sandbox' | 'all',
    paymentStatus?: string,
    pageSize?: number,
    startAfter?: string
  ): Promise<PaginationResult<AdminBookingSummary>> {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (paymentMethod && paymentMethod !== 'all') params.append('paymentMethod', paymentMethod);
    if (paymentStatus) params.append('paymentStatus', paymentStatus);
    if (pageSize) params.append('pageSize', String(pageSize));
    if (startAfter) params.append('startAfter', startAfter);

    const response = await this.request<ApiResponse<PaginationResult<AdminBookingSummary>>>(
      `/api/admin/bookings?${params}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * GET /api/admin/bookings/:bookingId
   * Get single booking detail
   */
  static async getBookingDetail(bookingId: string): Promise<AdminBookingDetail> {
    const response = await this.request<ApiResponse<AdminBookingDetail>>(
      `/api/admin/bookings/${bookingId}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  // ============================================================================
  // Phase 3: Transaction Monitoring
  // ============================================================================

  /**
   * GET /api/admin/transactions
   * Get list of transactions with pagination and filtering
   */
  static async getTransactions(
    provider?: 'cash_on_service' | 'midtrans_sandbox' | 'all',
    status?: string,
    dateFrom?: string,
    dateTo?: string,
    pageSize?: number,
    startAfter?: string
  ): Promise<PaginationResult<AdminTransaction>> {
    const params = new URLSearchParams();
    if (provider && provider !== 'all') params.append('provider', provider);
    if (status) params.append('status', status);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);
    if (pageSize) params.append('pageSize', String(pageSize));
    if (startAfter) params.append('startAfter', startAfter);

    const response = await this.request<ApiResponse<PaginationResult<AdminTransaction>>>(
      `/api/admin/transactions?${params}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  // ============================================================================
  // Phase 4: Pricing Settings
  // ============================================================================

  /**
   * GET /api/admin/pricing-settings
   */
  static async getPricingSettings(): Promise<AdminPricingSettings> {
    const response = await this.request<ApiResponse<AdminPricingSettings>>(
      `/api/admin/pricing-settings`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * PUT /api/admin/pricing-settings
   */
  static async updatePricingSettings(
    settings: AdminPricingSettings
  ): Promise<{ settings: AdminPricingSettings; updatedAt: string; updatedBy: string }> {
    const response = await this.request<ApiResponse<{ settings: AdminPricingSettings; updatedAt: string; updatedBy: string }>>(
      `/api/admin/pricing-settings`,
      { method: 'PUT', body: JSON.stringify(settings) }
    );
    return response.data!;
  }

  // ============================================================================
  // Phase 4: Voucher Management
  // ============================================================================

  /**
   * GET /api/admin/vouchers
   */
  static async getVouchers(status?: 'all' | 'active' | 'inactive', search?: string): Promise<AdminVoucher[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const response = await this.request<ApiResponse<{ items: AdminVoucher[] }>>(
      `/api/admin/vouchers?${params}`,
      { method: 'GET' }
    );
    return response.data!.items;
  }

  /**
   * GET /api/admin/vouchers/:code
   */
  static async getVoucherDetail(code: string): Promise<AdminVoucher> {
    const response = await this.request<ApiResponse<AdminVoucher>>(
      `/api/admin/vouchers/${encodeURIComponent(code)}`,
      { method: 'GET' }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/vouchers
   */
  static async createVoucher(input: VoucherCreateInput): Promise<AdminVoucher> {
    const response = await this.request<ApiResponse<AdminVoucher>>(
      `/api/admin/vouchers`,
      { method: 'POST', body: JSON.stringify(input) }
    );
    return response.data!;
  }

  /**
   * PATCH /api/admin/vouchers/:code
   */
  static async updateVoucher(code: string, input: VoucherUpdateInput): Promise<AdminVoucher> {
    const response = await this.request<ApiResponse<AdminVoucher>>(
      `/api/admin/vouchers/${encodeURIComponent(code)}`,
      { method: 'PATCH', body: JSON.stringify(input) }
    );
    return response.data!;
  }

  /**
   * POST /api/admin/vouchers/:code/activate | /deactivate
   */
  static async setVoucherStatus(code: string, status: 'active' | 'inactive'): Promise<AdminVoucher> {
    const action = status === 'active' ? 'activate' : 'deactivate';
    const response = await this.request<ApiResponse<AdminVoucher>>(
      `/api/admin/vouchers/${encodeURIComponent(code)}/${action}`,
      { method: 'POST' }
    );
    return response.data!;
  }
}
