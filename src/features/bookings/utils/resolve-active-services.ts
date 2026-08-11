export interface BookingOptionService {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes?: number;
}

/**
 * Maps BarberService domain objects (as returned by
 * barberRepository.getBarberServices -- see
 * src/features/barbers/repository/barber.repository.ts, which normalizes
 * Firestore's persistence shape into the canonical serviceId/isActive domain
 * shape) into the params booking/options.tsx forwards as route params. Only
 * the authoritative Firestore document id (service.serviceId) may ever be
 * forwarded as serviceId; the caller must never substitute a display name or
 * placeholder string in its place.
 *
 * Inactive services (isActive === false) are excluded -- a customer must
 * never be able to select and forward a service the barber has turned off.
 */
export function resolveActiveBookingServices(raw: unknown): BookingOptionService[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((s): s is Record<string, any> => Boolean(s) && typeof s === 'object' && s.isActive !== false)
    .filter((s) => typeof s.serviceId === 'string' && s.serviceId.length > 0)
    .map((s) => ({
      id: s.serviceId,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
    }));
}
