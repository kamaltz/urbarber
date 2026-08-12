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

export type BookingType = 'home' | 'onsite';
export type ServiceLocationType = 'barbershop' | 'customer_home';

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
