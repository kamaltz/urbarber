import type { BookingTracking } from '@/features/bookings/types/booking';

export type TrackingStatus = BookingTracking['trackingStatus'];
export type WritableTrackingStatus = Exclude<TrackingStatus, 'inactive'>;

export interface TrackingCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface TrackingParticipants {
  bookingId: string;
  customerId: string;
  barberId: string;
}

type TimestampValue = unknown;

export function isTrackingTransitionAllowed(
  current: TrackingStatus,
  next: WritableTrackingStatus,
): boolean {
  if (current === 'inactive') return next === 'en_route';
  if (current === 'en_route') return ['en_route', 'arrived', 'stopped'].includes(next);
  if (current === 'arrived') return ['arrived', 'stopped'].includes(next);
  return false;
}

export function buildTrackingStartPayload(
  participants: TrackingParticipants,
  coordinates: TrackingCoordinates,
  now: TimestampValue,
) {
  return {
    ...participants,
    trackingStatus: 'en_route' as const,
    isActive: true,
    location: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
    accuracy: coordinates.accuracy ?? null,
    heading: coordinates.heading ?? null,
    speed: coordinates.speed ?? null,
    startedAt: now,
    updatedAt: now,
  };
}

export function buildTrackingTransitionPayload(
  current: TrackingStatus,
  next: Extract<WritableTrackingStatus, 'arrived' | 'stopped'>,
  now: TimestampValue,
) {
  if (!isTrackingTransitionAllowed(current, next)) {
    throw new Error(`INVALID_TRACKING_TRANSITION:${current}->${next}`);
  }

  if (next === 'arrived') {
    return {
      trackingStatus: 'arrived' as const,
      isActive: true,
      arrivedAt: now,
      updatedAt: now,
    };
  }

  return {
    trackingStatus: 'stopped' as const,
    isActive: false,
    stoppedAt: now,
    updatedAt: now,
  };
}

function timestampToIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return undefined;
}

export function mapTrackingDocument(
  expectedBookingId: string,
  data: Record<string, any>,
  nowMs = Date.now(),
): { tracking: BookingTracking; isStale: boolean } {
  if (data.bookingId !== expectedBookingId) {
    throw new Error('TRACKING_BOOKING_ID_MISMATCH');
  }

  if (!['en_route', 'arrived', 'stopped'].includes(data.trackingStatus)) {
    throw new Error('INVALID_TRACKING_STATUS');
  }

  const latitude = data.location?.latitude;
  const longitude = data.location?.longitude;
  if (
    typeof latitude !== 'number' ||
    latitude < -90 ||
    latitude > 90 ||
    typeof longitude !== 'number' ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('INVALID_TRACKING_LOCATION');
  }

  const updatedAt = timestampToIso(data.updatedAt);
  if (!updatedAt) throw new Error('INVALID_TRACKING_UPDATED_AT');

  return {
    tracking: {
      bookingId: data.bookingId,
      customerId: data.customerId,
      barberId: data.barberId,
      trackingStatus: data.trackingStatus,
      isActive: data.isActive === true,
      location: { latitude, longitude },
      accuracy: data.accuracy ?? undefined,
      heading: data.heading ?? undefined,
      speed: data.speed ?? undefined,
      startedAt: timestampToIso(data.startedAt),
      arrivedAt: timestampToIso(data.arrivedAt),
      updatedAt,
      stoppedAt: timestampToIso(data.stoppedAt),
      expiresAt: timestampToIso(data.expiresAt),
    },
    isStale: nowMs - new Date(updatedAt).getTime() > 2 * 60 * 1000,
  };
}
