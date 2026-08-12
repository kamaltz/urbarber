/**
 * Batch 10B-5H-C: unit tests for the POST /api/payments/create guards --
 * server-side active-service enforcement (Phase 6) and the canonical
 * bookingType -> serviceLocationType derivation (Phase 4).
 */
import { describe, expect, it } from 'vitest';
import { isServiceActive, resolveServiceLocationType } from '../src/bookings/service-booking-guard.js';

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
