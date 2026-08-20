/**
 * Batch 10B-5H-C: unit tests for the POST /api/payments/create guards --
 * server-side active-service enforcement (Phase 6) and the canonical
 * bookingType -> serviceLocationType derivation (Phase 4).
 */
import { describe, expect, it } from 'vitest';
import {
  canTransitionToInProgress,
  isBarberAcceptingBookings,
  isHomeServiceAllowedForBarber,
  isHomeServiceBooking,
  isServiceActive,
  resolveServiceLocationType,
} from '../src/bookings/service-booking-guard.js';

describe('isServiceActive', () => {
  it('allows a service with active: true', () => {
    expect(isServiceActive({ active: true })).toBe(true);
  });

  it('rejects a service with active: false', () => {
    expect(isServiceActive({ active: false })).toBe(false);
  });

  it('allows a service with no active field (legacy document, missing = active)', () => {
    expect(isServiceActive({})).toBe(true);
  });
});

describe('resolveServiceLocationType', () => {
  it('maps home -> customer_home', () => {
    expect(resolveServiceLocationType('home')).toBe('customer_home');
  });

  it('maps onsite -> barbershop', () => {
    expect(resolveServiceLocationType('onsite')).toBe('barbershop');
  });
});

describe('isBarberAcceptingBookings (P0-3)', () => {
  it('allows an approved, active barber', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'approved', listingStatus: 'active' })).toBe(true);
  });

  it('rejects a pending barber', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'pending', listingStatus: 'active' })).toBe(false);
  });

  it('rejects a rejected barber', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'rejected', listingStatus: 'inactive' })).toBe(false);
  });

  it('rejects a draft (not-yet-submitted) barber', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'draft' })).toBe(false);
  });

  it('rejects an approved barber whose listing was suspended by admin', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'approved', listingStatus: 'suspended' })).toBe(false);
  });

  it('rejects an approved barber whose listing is inactive', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'approved', listingStatus: 'inactive' })).toBe(false);
  });

  it('fails closed when listingStatus is missing entirely (legacy document)', () => {
    expect(isBarberAcceptingBookings({ verificationStatus: 'approved' })).toBe(false);
  });

  it('fails closed when the barber document does not exist', () => {
    expect(isBarberAcceptingBookings(null)).toBe(false);
    expect(isBarberAcceptingBookings(undefined)).toBe(false);
  });
});

describe('isHomeServiceAllowedForBarber (§10 Home Service availability toggle)', () => {
  it('allows an onsite booking regardless of acceptsHomeService', () => {
    expect(isHomeServiceAllowedForBarber({ acceptsHomeService: false }, 'onsite')).toBe(true);
  });

  it('allows a home booking when acceptsHomeService is true', () => {
    expect(isHomeServiceAllowedForBarber({ acceptsHomeService: true }, 'home')).toBe(true);
  });

  it('rejects a home booking when acceptsHomeService is explicitly false', () => {
    expect(isHomeServiceAllowedForBarber({ acceptsHomeService: false }, 'home')).toBe(false);
  });

  it('allows a home booking when acceptsHomeService is missing (legacy barber, defaults true)', () => {
    expect(isHomeServiceAllowedForBarber({}, 'home')).toBe(true);
  });

  it('allows a home booking when the barber document is null/undefined (defaults true)', () => {
    expect(isHomeServiceAllowedForBarber(null, 'home')).toBe(true);
    expect(isHomeServiceAllowedForBarber(undefined, 'home')).toBe(true);
  });
});

describe('isHomeServiceBooking', () => {
  it('true when serviceLocationType is customer_home', () => {
    expect(isHomeServiceBooking({ serviceLocationType: 'customer_home' })).toBe(true);
  });

  it('true when bookingType is home (legacy record predating serviceLocationType)', () => {
    expect(isHomeServiceBooking({ bookingType: 'home' })).toBe(true);
  });

  it('false for an onsite/barbershop booking', () => {
    expect(isHomeServiceBooking({ serviceLocationType: 'barbershop', bookingType: 'onsite' })).toBe(false);
  });

  it('false when neither field is set', () => {
    expect(isHomeServiceBooking({})).toBe(false);
  });
});

/**
 * Server-side mirror of the Barber app's own arrival gate
 * (booking/[bookingId].tsx) -- must reject accepted -> in_progress for a
 * Home Service booking whose tracking hasn't reached 'arrived' yet, closing
 * the "UI hiding a button is not security" gap: a direct API call bypassing
 * the client entirely must still be rejected.
 */
describe('canTransitionToInProgress', () => {
  it('allows an on-the-spot booking to start service regardless of tracking (no travel concept)', () => {
    expect(
      canTransitionToInProgress({ bookingData: { serviceLocationType: 'barbershop' }, trackingStatus: undefined })
    ).toBe(true);
  });

  it('allows a Home Service booking once tracking has reached arrived', () => {
    expect(
      canTransitionToInProgress({ bookingData: { serviceLocationType: 'customer_home' }, trackingStatus: 'arrived' })
    ).toBe(true);
  });

  it('rejects a Home Service booking still en_route', () => {
    expect(
      canTransitionToInProgress({ bookingData: { serviceLocationType: 'customer_home' }, trackingStatus: 'en_route' })
    ).toBe(false);
  });

  it('rejects a Home Service booking with no tracking document at all', () => {
    expect(
      canTransitionToInProgress({ bookingData: { serviceLocationType: 'customer_home' }, trackingStatus: undefined })
    ).toBe(false);
  });
});
