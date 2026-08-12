/**
 * V4 Phase 4: unit tests for the canonical Admin booking DTO mapper.
 *
 * Night Shift V3 found Admin's booking reads expecting customerName/
 * barberName/totalPrice directly on the raw document; the payment-first
 * creator never writes those and stores the amount under `price`. These
 * tests lock in that the mapper tolerates all historical amount field
 * variants and that resolved identities take priority over anything
 * (never) present on the raw document, without ever fabricating an
 * identity that wasn't actually resolved.
 */
import { describe, expect, it } from 'vitest';
import {
  mapAdminBookingDetail,
  mapAdminBookingSummary,
  resolveBookingAddress,
  resolveBookingAmount,
  resolveBookingDate,
  resolveBookingStartTime,
} from '../src/admin/admin-booking-dto.js';

describe('resolveBookingAmount', () => {
  it('prefers price (current payment-first schema)', () => {
    expect(resolveBookingAmount({ price: 30000, totalAmount: 1, totalPrice: 2 })).toBe(30000);
  });

  it('falls back to totalAmount when price is absent', () => {
    expect(resolveBookingAmount({ totalAmount: 40000, totalPrice: 2 })).toBe(40000);
  });

  it('falls back to totalPrice (legacy/seeded schema) when neither price nor totalAmount is present', () => {
    expect(resolveBookingAmount({ totalPrice: 50000 })).toBe(50000);
  });

  it('defaults to 0 for a document with none of the amount fields', () => {
    expect(resolveBookingAmount({})).toBe(0);
  });
});

describe('resolveBookingDate / resolveBookingStartTime / resolveBookingAddress', () => {
  it('resolves the current-shape date/startTime fields', () => {
    expect(resolveBookingDate({ date: '2026-08-20' })).toBe('2026-08-20');
    expect(resolveBookingStartTime({ startTime: '14:00' })).toBe('14:00');
  });

  it('falls back to legacy bookingDate/bookingTime', () => {
    expect(resolveBookingDate({ bookingDate: '2026-08-21' })).toBe('2026-08-21');
    expect(resolveBookingStartTime({ bookingTime: '09:00' })).toBe('09:00');
  });

  it('resolves address from serviceAddress first, then address', () => {
    expect(resolveBookingAddress({ serviceAddress: 'Jl. Admin 1', address: 'Jl. Client 2' })).toBe('Jl. Admin 1');
    expect(resolveBookingAddress({ address: 'Jl. Client 2' })).toBe('Jl. Client 2');
  });
});

describe('mapAdminBookingSummary', () => {
  it('uses resolved identities over raw document fields', () => {
    const result = mapAdminBookingSummary(
      'booking-1',
      { customerId: 'cust-1', barberId: 'barber-1', price: 30000, status: 'pending', customerName: 'stale-name' },
      { customerName: 'Resolved Customer', barberName: 'Resolved Barber', serviceName: 'Cukur Reguler' }
    );

    expect(result.customerName).toBe('Resolved Customer');
    expect(result.barberName).toBe('Resolved Barber');
    expect(result.serviceName).toBe('Cukur Reguler');
    expect(result.totalPrice).toBe(30000);
  });

  it('falls back to "Unknown"/"Service" -- never a fabricated identity -- when nothing resolves', () => {
    const result = mapAdminBookingSummary('booking-1', { price: 30000, status: 'pending' }, {});

    expect(result.customerName).toBe('Unknown');
    expect(result.barberName).toBe('Unknown');
    expect(result.serviceName).toBe('Service');
  });

  it('preserves bookingId, customerId, barberId, status, paymentStatus', () => {
    const result = mapAdminBookingSummary(
      'booking-1',
      { customerId: 'cust-1', barberId: 'barber-1', status: 'accepted', paymentStatus: 'paid', price: 1 },
      {}
    );

    expect(result.bookingId).toBe('booking-1');
    expect(result.customerId).toBe('cust-1');
    expect(result.barberId).toBe('barber-1');
    expect(result.status).toBe('accepted');
    expect(result.paymentStatus).toBe('paid');
  });
});

describe('mapAdminBookingDetail', () => {
  it('includes contact fields from resolved identities', () => {
    const result = mapAdminBookingDetail(
      'booking-1',
      { customerId: 'cust-1', barberId: 'barber-1', price: 30000, status: 'pending' },
      {
        customerName: 'Resolved Customer',
        customerEmail: 'customer@example.com',
        customerPhone: '0812',
        barberName: 'Resolved Barber',
        barberEmail: 'barber@example.com',
        barberPhone: '0813',
        serviceName: 'Cukur Reguler',
      }
    );

    expect(result.customerEmail).toBe('customer@example.com');
    expect(result.customerPhone).toBe('0812');
    expect(result.barberEmail).toBe('barber@example.com');
    expect(result.barberPhone).toBe('0813');
    expect(result.totalPrice).toBe(30000);
  });

  it('leaves contact fields undefined (not fabricated) when identity resolution found nothing', () => {
    const result = mapAdminBookingDetail('booking-1', { price: 30000, status: 'pending' }, {});

    expect(result.customerEmail).toBeUndefined();
    expect(result.customerPhone).toBeUndefined();
    expect(result.barberEmail).toBeUndefined();
    expect(result.barberPhone).toBeUndefined();
  });
});
