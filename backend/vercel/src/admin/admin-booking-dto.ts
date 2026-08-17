/**
 * Batch 10B-5H (V4 Phase 4): canonical Admin booking display mapper.
 *
 * Night Shift V3 found Admin's booking reads (getBookingsList, getBookingDetail,
 * getDashboardMetrics's recentBookings) expecting a legacy/seeded shape --
 * customerName, barberName, serviceName, totalPrice -- directly off the raw
 * bookings/{id} document. The current payment-first creator
 * (backend/vercel/api/payments.ts handleCreatePayment) never denormalizes
 * display names onto the booking document at all, and stores the amount
 * under `price`, not `totalPrice`. Every real paid booking therefore showed
 * "Unknown"/Rp 0 in Admin.
 *
 * Rather than start denormalizing names into every future booking, this
 * resolves them from the authoritative users/barbers/barberServices
 * documents at read time (see resolveIdentities in admin.service.ts), and
 * tolerates the historical amount field variants through one canonical
 * accessor.
 */

export interface AdminBookingIdentities {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  barberName?: string;
  barberEmail?: string;
  barberPhone?: string;
  serviceName?: string;
}

export function resolveBookingAmount(data: Record<string, any>): number {
  if (typeof data.price === 'number') return data.price;
  if (typeof data.totalAmount === 'number') return data.totalAmount;
  if (typeof data.totalPrice === 'number') return data.totalPrice;
  return 0;
}

/**
 * Gross amount the customer actually paid (base - voucher + homeFee + appFee + tip),
 * distinct from resolveBookingAmount() above which prefers `price` -- the barber's
 * base-service-only operational value. Never used interchangeably: this is what
 * "Gross Transaction Value" metrics must sum, not resolveBookingAmount().
 */
export function resolveBookingGrossAmount(data: Record<string, any>): number {
  if (typeof data.grossAmount === 'number') return data.grossAmount;
  if (typeof data.totalPrice === 'number') return data.totalPrice;
  if (typeof data.totalAmount === 'number') return data.totalAmount;
  return resolveBookingAmount(data);
}

/** Canonical pricing breakdown, present on bookings created since Batch 10D; absent on legacy records. */
export function resolveBookingPricingBreakdown(data: Record<string, any>) {
  return {
    baseAmount: typeof data.baseAmount === 'number' ? data.baseAmount : undefined,
    voucherCode: data.voucherCode ?? undefined,
    voucherDiscount: typeof data.voucherDiscount === 'number' ? data.voucherDiscount : undefined,
    homeServiceFee: typeof data.homeServiceFee === 'number' ? data.homeServiceFee : undefined,
    applicationFee: typeof data.applicationFee === 'number' ? data.applicationFee : undefined,
    tipAmount: typeof data.tipAmount === 'number' ? data.tipAmount : undefined,
    grossAmount: resolveBookingGrossAmount(data),
  };
}

export function resolveBookingDate(data: Record<string, any>): string {
  return data.date || data.bookingDate || '';
}

export function resolveBookingStartTime(data: Record<string, any>): string {
  return data.startTime || data.bookingTime || '';
}

export function resolveBookingAddress(data: Record<string, any>): string | undefined {
  return data.serviceAddress || data.address;
}

/**
 * Admin listing row shape (bookings list + dashboard recentBookings). Keeps
 * the exact field names apps/admin already renders (customerName,
 * barberName, serviceName, totalPrice) so no frontend change is needed --
 * only the values are now real instead of always "Unknown"/0.
 */
export function mapAdminBookingSummary(
  id: string,
  data: Record<string, any>,
  identities: AdminBookingIdentities
) {
  return {
    bookingId: id,
    customerId: data.customerId,
    barberId: data.barberId,
    customerName: identities.customerName || data.customerName || 'Unknown',
    barberName: identities.barberName || data.barberName || 'Unknown',
    serviceName: identities.serviceName || data.serviceName || 'Service',
    serviceLocationType: data.serviceLocationType,
    serviceAddress: resolveBookingAddress(data),
    date: resolveBookingDate(data),
    startTime: resolveBookingStartTime(data),
    status: data.status,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    totalPrice: resolveBookingAmount(data),
    createdAt: data.createdAt,
    ...resolveBookingPricingBreakdown(data),
  };
}

/**
 * Admin detail shape (single booking). Adds contact fields the list view
 * doesn't need; apps/admin already renders these with a `|| '-'` fallback
 * for legitimately-unavailable optional text.
 */
export function mapAdminBookingDetail(
  id: string,
  data: Record<string, any>,
  identities: AdminBookingIdentities
) {
  return {
    bookingId: id,
    customerId: data.customerId,
    customerName: identities.customerName || data.customerName || 'Unknown',
    customerEmail: identities.customerEmail || data.customerEmail,
    customerPhone: identities.customerPhone || data.customerPhone,
    barberId: data.barberId,
    barberName: identities.barberName || data.barberName || 'Unknown',
    barberEmail: identities.barberEmail || data.barberEmail,
    barberPhone: identities.barberPhone || data.barberPhone,
    serviceId: data.serviceId,
    serviceName: identities.serviceName || data.serviceName || 'Service',
    serviceLocationType: data.serviceLocationType,
    serviceAddress: resolveBookingAddress(data),
    date: resolveBookingDate(data),
    startTime: resolveBookingStartTime(data),
    endTime: data.endTime,
    status: data.status,
    notes: data.notes,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    totalPrice: resolveBookingAmount(data),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    paidAt: data.paidAt,
    ...resolveBookingPricingBreakdown(data),
  };
}
