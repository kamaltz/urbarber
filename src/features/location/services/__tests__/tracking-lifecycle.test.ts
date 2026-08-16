import { describe, expect, it } from 'vitest';
import { isTrackingTransitionAllowed, mapTrackingDocument } from '../tracking.model';

describe('Realtime Home Tracking Lifecycle & Model', () => {
  it('1. permits valid tracking transitions: inactive -> en_route -> arrived -> stopped', () => {
    expect(isTrackingTransitionAllowed('inactive', 'en_route')).toBe(true);
    expect(isTrackingTransitionAllowed('en_route', 'arrived')).toBe(true);
    expect(isTrackingTransitionAllowed('en_route', 'stopped')).toBe(true);
    expect(isTrackingTransitionAllowed('arrived', 'stopped')).toBe(true);
  });

  it('2. rejects invalid tracking transitions', () => {
    expect(isTrackingTransitionAllowed('inactive', 'arrived')).toBe(false);
    expect(isTrackingTransitionAllowed('inactive', 'stopped')).toBe(false);
    expect(isTrackingTransitionAllowed('stopped', 'en_route')).toBe(false);
    expect(isTrackingTransitionAllowed('arrived', 'en_route')).toBe(false);
  });

  it('3. mapTrackingDocument throws error on bookingId mismatch or invalid status', () => {
    expect(() =>
      mapTrackingDocument('book-100', {
        bookingId: 'book-999',
        trackingStatus: 'en_route',
        location: { latitude: -7.2, longitude: 107.9 },
      })
    ).toThrow('TRACKING_BOOKING_ID_MISMATCH');

    expect(() =>
      mapTrackingDocument('book-100', {
        bookingId: 'book-100',
        trackingStatus: 'invalid_status',
        location: { latitude: -7.2, longitude: 107.9 },
      })
    ).toThrow('INVALID_TRACKING_STATUS');
  });

  it('4. mapTrackingDocument correctly identifies fresh vs stale update status (>2 minutes)', () => {
    const nowMs = 1700000000000;
    const freshDate = new Date(nowMs - 30 * 1000).toISOString(); // 30s ago
    const staleDate = new Date(nowMs - 5 * 60 * 1000).toISOString(); // 5m ago

    const freshDoc = mapTrackingDocument(
      'book-100',
      {
        bookingId: 'book-100',
        trackingStatus: 'en_route',
        location: { latitude: -7.2, longitude: 107.9 },
        updatedAt: freshDate,
      },
      nowMs
    );
    expect(freshDoc.isStale).toBe(false);

    const staleDoc = mapTrackingDocument(
      'book-100',
      {
        bookingId: 'book-100',
        trackingStatus: 'en_route',
        location: { latitude: -7.2, longitude: 107.9 },
        updatedAt: staleDate,
      },
      nowMs
    );
    expect(staleDoc.isStale).toBe(true);
  });
});
