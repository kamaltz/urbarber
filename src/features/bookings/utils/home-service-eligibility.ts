/**
 * Mirrors the backend's isHomeServiceAllowedForBarber
 * (backend/vercel/src/bookings/service-booking-guard.ts) so the client can
 * hide/disable the Home Service booking option before the customer ever
 * reaches checkout, instead of only discovering the 403 HOME_SERVICE_DISABLED
 * rejection at payment creation. Missing field defaults to true (`!== false`)
 * -- a legacy barber document predating this field must not disappear from
 * Home Service.
 */
export function isHomeServiceEligible(
  barber: { acceptsHomeService?: boolean } | null | undefined
): boolean {
  return barber?.acceptsHomeService !== false;
}
