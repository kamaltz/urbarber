/**
 * Batch 10B-5H-C: server-side guards for POST /api/payments/create.
 * Client-side filtering (resolve-active-services.ts) already hides inactive
 * services from the booking-options screen, but that is not a server
 * guarantee -- a stale client screen or a direct API call could still submit
 * an inactive serviceId. Mirrors the same `!== false` legacy-compatible
 * policy (missing field = active) barber.repository.ts already applies
 * client-side to the same raw Firestore `active` field.
 */
export function isServiceActive(serviceData: { active?: boolean }): boolean {
  return serviceData.active !== false;
}

/**
 * P0-3 (FINAL_THESIS_READINESS_AUDIT.md HIGH finding): a barber may only receive a
 * NEW paid booking (payment creation) or accept a pending one once admin-approved
 * (verificationStatus) and listed as active (listingStatus) -- the canonical fields
 * admin.service.ts already writes on approve/reject/suspend/reactivate. Previously
 * this was only gated client-side (barber-tab UI); a client bypassing that UI, or
 * calling the API directly, could still pay/accept against a pending, rejected, or
 * suspended barber. Missing/undefined listingStatus (legacy data predating the
 * field) fails closed -- treated as not active -- rather than assumed eligible.
 */
export function isBarberAcceptingBookings(
  barberData: { verificationStatus?: string; listingStatus?: string } | null | undefined
): boolean {
  if (!barberData) return false;
  return barberData.verificationStatus === 'approved' && barberData.listingStatus === 'active';
}

export type BookingType = 'home' | 'onsite';
export type ServiceLocationType = 'barbershop' | 'customer_home';

/**
 * §10 (thesis v1.1 final stabilization): a barber may disable Home Service
 * via their own profile (`acceptsHomeService`). Client screens already hide
 * the Home Service option once disabled (customer.repository.ts,
 * discovery.service.ts) -- that is UI hiding, not a server guarantee, so a
 * stale client screen or a direct API call could still create a Home
 * Service booking against a barber who turned it off. Missing field
 * defaults to true (`!== false`), matching the exact client-side default so
 * barbers predating this field don't unexpectedly disappear from Home
 * Service. Only gates NEW bookingType === 'home' payment/booking creation;
 * an already-accepted Home Service booking is never affected by this.
 */
export function isHomeServiceAllowedForBarber(
  barberData: { acceptsHomeService?: boolean } | null | undefined,
  bookingType: BookingType,
): boolean {
  if (bookingType !== 'home') return true;
  return barberData?.acceptsHomeService !== false;
}

/**
 * Canonical persisted contract (Phase 4B): serviceLocationType is the value
 * tracking (isHomeService in src/app/(barber)/booking/[bookingId].tsx) and
 * the Admin backend (admin.service.ts) already read; bookingType is the only
 * value the client ever supplies. Only 'home'/'onsite' pass Zod validation
 * upstream of this call, so this is a pure derivation, never a fallback for
 * an untrusted/arbitrary string.
 */
export function resolveServiceLocationType(bookingType: BookingType): ServiceLocationType {
  return bookingType === 'home' ? 'customer_home' : 'barbershop';
}

/** Same OR-check the Barber app's own isHomeService already uses (booking/[bookingId].tsx)
 * so server and client can never disagree about which bookings are Home Service. */
export function isHomeServiceBooking(bookingData: { serviceLocationType?: unknown; bookingType?: unknown }): boolean {
  return bookingData.serviceLocationType === 'customer_home' || bookingData.bookingType === 'home';
}

/**
 * Server-side mirror of the Home Service arrival gate the Barber app already
 * enforced client-side only (booking/[bookingId].tsx: `tracking?.trackingStatus
 * !== 'arrived'` blocks the "Mulai Layanan" tap) before allowing
 * accepted -> in_progress. UI hiding a button is not security -- this is the
 * actual enforcement point for POST /api/barber/bookings/status. An
 * on-the-spot (non-Home-Service) booking has no travel/arrival concept at
 * all, so it's always allowed here.
 */
export function canTransitionToInProgress(params: {
  bookingData: { serviceLocationType?: unknown; bookingType?: unknown };
  trackingStatus?: string | null;
}): boolean {
  if (!isHomeServiceBooking(params.bookingData)) return true;
  return params.trackingStatus === 'arrived';
}
