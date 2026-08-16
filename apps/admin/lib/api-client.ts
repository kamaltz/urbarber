import { firebaseAuth } from './firebase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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
export interface DashboardMetrics {
  totalActiveCustomers: number;
  totalApprovedBarbers: number;
  pendingBarberRegistrations: number;
  suspendedAccounts: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  currentMonthServiceValue: number;
  recentBarberRegistrations: AdminBarberRegistration[];
  recentBookings: AdminBookingRecord[];
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

export interface AdminBarberRegistration {
  barberId: string;
  ownerName: string;
  businessName: string;
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
}

// User Management
export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName?: string;
  role: 'customer' | 'barber' | 'admin';
  status: 'active' | 'pending_verification' | 'suspended';
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

// Bookings - Phase 3: Summary for admin monitoring list
export interface AdminBookingSummary {
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
export interface AdminTransaction {
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

// Phase 2: Barber Management
export interface AdminBarberSummary {
  uid: string;
  displayName: string;
  businessName?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  listingStatus?: 'active' | 'inactive';
  accountStatus: 'active' | 'pending_verification' | 'suspended';
  ratingAverage?: number;
  reviewCount?: number;
  approvedAt?: string;
}

export interface AdminBarberDetail extends AdminBarberSummary {
  email?: string;
  phoneNumber?: string;
  businessAddress?: string;
  serviceArea?: string;
  acceptingNewBookings?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
      const err = new Error(error.message);
      (err as any).code = error.code;
      (err as any).status = response.status;
      throw err;
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
   * Delete a barber account (soft delete)
   */
  static async deleteBarber(barberId: string): Promise<{ success: boolean; message: string }> {
    const response = await this.request<ApiResponse<{ success: boolean; message: string }>>(
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
}
