/**
 * Unit tests for TrackingService.startBarberTracking's eligibility gate
 * (resolveParticipants) and permission/write behavior. tracking.model.ts's
 * pure transition/staleness logic already has dedicated coverage
 * (tracking-lifecycle.test.ts, tracking.model.test.ts); this file covers the
 * orchestration layer that was previously untested end-to-end: who is
 * allowed to start tracking, and that a denied location permission never
 * reaches Firestore.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getDocMock, setDocMock, requestForegroundPermissionsAsyncMock, getCurrentPositionAsyncMock, watchPositionAsyncMock } =
  vi.hoisted(() => ({
    getDocMock: vi.fn(),
    setDocMock: vi.fn(),
    requestForegroundPermissionsAsyncMock: vi.fn(),
    getCurrentPositionAsyncMock: vi.fn(),
    watchPositionAsyncMock: vi.fn(),
  }));

vi.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: (...args: unknown[]) => requestForegroundPermissionsAsyncMock(...args),
  getCurrentPositionAsync: (...args: unknown[]) => getCurrentPositionAsyncMock(...args),
  watchPositionAsync: (...args: unknown[]) => watchPositionAsyncMock(...args),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, coll: string, id: string) => ({ __coll: coll, __id: id })),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: vi.fn(),
  onSnapshot: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: { currentUser: { uid: 'barber-1' } },
  firestore: {},
}));

import { trackingService } from '../tracking.service';

function bookingSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return { exists: () => exists, data: () => data };
}

const VALID_BOOKING = {
  barberId: 'barber-1',
  customerId: 'customer-1',
  paymentStatus: 'paid',
  status: 'accepted',
  bookingType: 'home',
};

describe('trackingService.startBarberTracking eligibility (resolveParticipants)', () => {
  beforeEach(() => {
    getDocMock.mockReset();
    setDocMock.mockReset();
    requestForegroundPermissionsAsyncMock.mockReset();
    getCurrentPositionAsyncMock.mockReset();
    watchPositionAsyncMock.mockReset();

    setDocMock.mockResolvedValue(undefined);
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: 'granted' });
    getCurrentPositionAsyncMock.mockResolvedValue({
      coords: { latitude: -6.2, longitude: 106.8, accuracy: 10, heading: 0, speed: 0 },
    });
    watchPositionAsyncMock.mockResolvedValue({ remove: vi.fn() });
  });

  it('rejects when the booking does not exist', async () => {
    getDocMock.mockResolvedValue(bookingSnap(false));

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tidak ditemukan/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('rejects when the booking is assigned to a different barber', async () => {
    getDocMock.mockResolvedValue(bookingSnap(true, { ...VALID_BOOKING, barberId: 'someone-else' }));

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/tidak ditugaskan/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('rejects when the booking has no valid customerId', async () => {
    getDocMock.mockResolvedValue(bookingSnap(true, { ...VALID_BOOKING, customerId: undefined }));

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/pelanggan/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('rejects an unpaid booking even if otherwise accepted', async () => {
    getDocMock.mockResolvedValue(bookingSnap(true, { ...VALID_BOOKING, paymentStatus: 'pending' }));

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/diterima dan sudah dibayar/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('rejects a booking that is paid but not yet accepted', async () => {
    getDocMock.mockResolvedValue(bookingSnap(true, { ...VALID_BOOKING, status: 'pending' }));

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/diterima dan sudah dibayar/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('rejects an onsite (non-home-service) booking', async () => {
    getDocMock.mockResolvedValue(
      bookingSnap(true, { ...VALID_BOOKING, bookingType: 'onsite', serviceLocationType: undefined })
    );

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/layanan di rumah pelanggan/);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('rejects and never writes to Firestore when location permission is denied', async () => {
    getDocMock.mockResolvedValue(bookingSnap(true, VALID_BOOKING));
    requestForegroundPermissionsAsyncMock.mockResolvedValue({ status: 'denied' });

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/[Ii]zin lokasi/);
    expect(setDocMock).not.toHaveBeenCalled();
    expect(watchPositionAsyncMock).not.toHaveBeenCalled();
  });

  it('starts tracking for a valid, eligible, paid+accepted home-service booking', async () => {
    getDocMock.mockResolvedValue(bookingSnap(true, VALID_BOOKING));

    const result = await trackingService.startBarberTracking('booking-1');

    expect(result.success).toBe(true);
    expect(setDocMock).toHaveBeenCalledTimes(1);
    const [, payload] = setDocMock.mock.calls[0];
    expect(payload).toMatchObject({
      bookingId: 'booking-1',
      customerId: 'customer-1',
      barberId: 'barber-1',
      trackingStatus: 'en_route',
      isActive: true,
    });
    expect(watchPositionAsyncMock).toHaveBeenCalledTimes(1);
  });
});
