import { describe, expect, it } from 'vitest';
import {
  buildTrackingStartPayload,
  buildTrackingTransitionPayload,
  isTrackingTransitionAllowed,
  mapTrackingDocument,
} from '../tracking.model';

describe('tracking model', () => {
  it('keeps the tracking lifecycle separate from booking statuses', () => {
    expect(isTrackingTransitionAllowed('inactive', 'en_route')).toBe(true);
    expect(isTrackingTransitionAllowed('en_route', 'arrived')).toBe(true);
    expect(isTrackingTransitionAllowed('arrived', 'stopped')).toBe(true);
    expect(isTrackingTransitionAllowed('stopped', 'en_route')).toBe(false);
  });

  it('builds the hardened 10C create payload with authoritative participants', () => {
    const now = new Date('2026-08-11T08:00:00.000Z');
    expect(
      buildTrackingStartPayload(
        { bookingId: 'booking-1', customerId: 'customer-1', barberId: 'barber-1' },
        { latitude: -7.2278, longitude: 107.9087, accuracy: 0, heading: 0, speed: 0 },
        now,
      ),
    ).toEqual({
      bookingId: 'booking-1',
      customerId: 'customer-1',
      barberId: 'barber-1',
      trackingStatus: 'en_route',
      isActive: true,
      location: { latitude: -7.2278, longitude: 107.9087 },
      accuracy: 0,
      heading: 0,
      speed: 0,
      startedAt: now,
      updatedAt: now,
    });
  });

  it('rejects an impossible tracking transition', () => {
    expect(() => buildTrackingTransitionPayload('stopped', 'arrived', new Date())).toThrow(
      'INVALID_TRACKING_TRANSITION:stopped->arrived',
    );
  });

  it('maps a valid subscription snapshot and detects stale data', () => {
    const updatedAt = new Date('2026-08-11T08:00:00.000Z');
    const result = mapTrackingDocument(
      'booking-1',
      {
        bookingId: 'booking-1',
        customerId: 'customer-1',
        barberId: 'barber-1',
        trackingStatus: 'arrived',
        isActive: true,
        location: { latitude: -7.2, longitude: 107.9 },
        updatedAt: { toDate: () => updatedAt },
      },
      updatedAt.getTime() + 120_001,
    );

    expect(result.tracking.trackingStatus).toBe('arrived');
    expect(result.tracking.location).toEqual({ latitude: -7.2, longitude: 107.9 });
    expect(result.isStale).toBe(true);
  });

  it('rejects a subscription document for a different booking', () => {
    expect(() =>
      mapTrackingDocument('booking-1', {
        bookingId: 'booking-2',
        trackingStatus: 'en_route',
        location: { latitude: -7.2, longitude: 107.9 },
        updatedAt: new Date(),
      }),
    ).toThrow('TRACKING_BOOKING_ID_MISMATCH');
  });
});
