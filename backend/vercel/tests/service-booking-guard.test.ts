/**
 * Batch 10B-5H-C: unit tests for the POST /api/payments/create guards --
 * server-side active-service enforcement (Phase 6) and the canonical
 * bookingType -> serviceLocationType derivation (Phase 4).
 */
import { describe, expect, it } from 'vitest';
import { isBarberAcceptingBookings, isServiceActive, resolveServiceLocationType } from '../src/bookings/service-booking-guard.js';

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
