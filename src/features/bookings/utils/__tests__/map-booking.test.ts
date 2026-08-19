/**
 * Unit Tests for mapRawBookingToDomain (Batch 10B-5G)
 *
 * Live production inspection found bookings/{bookingId} persisted under
 * multiple incompatible shapes: the current backend/vercel/api/payments.ts
 * path writes flat date/startTime/price/serviceId fields with no
 * shop/barber/services objects, while older/seeded documents carry
 * bookingDate/bookingTime/totalAmount/totalPrice and a denormalized
 * `services` array. The Booking domain type (and BookingCard, which
 * dereferences booking.shop.imageUrl unconditionally) requires shop/barber
 * objects and scheduledAt/scheduledTime/totalPrice -- spreading the raw
 * document previously left these undefined and crashed BookingCard as soon
 * as a real customerId (rather than the historical MOCK_CUSTOMER_ID) started
 * returning real rows.
 */
import { describe, expect, it } from 'vitest';
import { mapRawBookingToDomain } from '../map-booking';

const BARBER_DOC = {
  shopName: 'Kamal',
  address: 'karpaw',
  ratingAverage: 4.5,
};

const SERVICE_DOC = {
  name: 'Cukur',
  price: 30000,
  durationMinutes: 30,
  description: '',
};

describe('mapRawBookingToDomain', () => {
  it('1. current-shape document (date/startTime/price/serviceId) maps to scheduledAt/scheduledTime/totalPrice', () => {
    const result = mapRawBookingToDomain(
      'Gy2zX7BnpgtmAN7K0UjK',
      { customerId: 'cust-1', barberId: 'barber-1', serviceId: 'svc-1', date: '2026-08-26', startTime: '20:00', price: 30000, status: 'in_progress', paymentStatus: 'paid' },
      BARBER_DOC,
      SERVICE_DOC
    );

    expect(result.scheduledAt).toBe('2026-08-26');
    expect(result.scheduledTime).toBe('20:00');
    expect(result.totalPrice).toBe(30000);
    expect(result.subtotal).toBe(30000);
    expect(result.status).toBe('in_progress');
    expect(result.paymentStatus).toBe('paid');
  });

  it('2. legacy-shape document (bookingDate/bookingTime/totalAmount/services array) still maps correctly', () => {
    const result = mapRawBookingToDomain(
      'book_accepted',
      {
        customerId: 'cust-1',
        barberId: 'barber-1',
        bookingDate: '2026-08-10',
        bookingTime: '13:00',
        totalAmount: 40000,
        totalPrice: 40000,
        status: 'accepted',
        paymentStatus: 'paid',
        services: [{ name: 'Beard Trim & Style', price: 40000 }],
      },
      undefined,
      undefined
    );

    expect(result.scheduledAt).toBe('2026-08-10');
    expect(result.scheduledTime).toBe('13:00');
    expect(result.totalPrice).toBe(40000);
    expect(result.services[0].name).toBe('Beard Trim & Style');
  });

  it('3. shop/barber are never undefined, even with no resolvable barber doc -- BookingCard dereferences booking.shop.imageUrl unconditionally', () => {
    const result = mapRawBookingToDomain('b1', { customerId: 'c1', barberId: 'barber-x', status: 'pending' }, undefined, undefined);

    expect(result.shop).toBeDefined();
    expect(result.barber).toBeDefined();
    expect(typeof result.shop.imageUrl).toBe('string');
  });

  it('4. resolved barber doc supplies real shop identity (shopName/address/rating), not a fabricated name', () => {
    const result = mapRawBookingToDomain('b1', { customerId: 'c1', barberId: 'barber-1', status: 'pending' }, BARBER_DOC, undefined);

    expect(result.shop.name).toBe('Kamal');
    expect(result.barber.name).toBe('Kamal');
    expect(result.shop.location).toBe('karpaw');
    expect(result.shop.rating).toBe('4.5');
  });

  it('5. no resolvable barber doc falls back to the established generic label, not blank/undefined', () => {
    const result = mapRawBookingToDomain('b1', { customerId: 'c1', barberId: 'unknown-barber', status: 'pending' }, undefined, undefined);

    expect(result.shop.name).toBe('Barber URBarber');
    expect(result.barber.name).toBe('Barber URBarber');
  });

  it('6. resolved barberServices doc supplies the real service name/price over an unresolved serviceId', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', serviceId: 'svc-real', price: 30000, status: 'pending' },
      undefined,
      SERVICE_DOC
    );

    expect(result.services).toEqual([
      { id: 'svc-real', name: 'Cukur', description: '', price: 30000, durationMinutes: 30 },
    ]);
  });

  it('7. an unresolvable serviceId (e.g. legacy seed id "1") falls back to a generic service entry without inventing a price', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', serviceId: '1', totalPrice: 50000, status: 'pending' },
      undefined,
      undefined
    );

    expect(result.services).toEqual([{ id: '1', name: 'Layanan Barber', price: 50000 }]);
  });

  it('8. a Firestore Timestamp createdAt/updatedAt is normalized to an ISO string', () => {
    const toDate = () => new Date('2026-08-11T21:18:12.353Z');
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', createdAt: { toDate }, updatedAt: { toDate } },
      undefined,
      undefined
    );

    expect(result.createdAt).toBe('2026-08-11T21:18:12.353Z');
    expect(result.updatedAt).toBe('2026-08-11T21:18:12.353Z');
  });

  it('9. legacy status values pass through mapLegacyBookingStatus, not raw', () => {
    const result = mapRawBookingToDomain('b1', { customerId: 'c1', barberId: 'barber-1', status: 'booked' }, undefined, undefined);

    expect(result.status).toBe('pending');
  });

  // Batch 10B-5H-C: service-location canonicalization. Mirrors the exact
  // OR-check tracking uses (isHomeService) so both never disagree.
  it('10. current payment-created Home Service document preserves bookingType and serviceLocationType', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', bookingType: 'home', serviceLocationType: 'customer_home', address: 'Jl. Merdeka 1' },
      undefined,
      undefined
    );

    expect(result.bookingType).toBe('home');
    expect(result.serviceLocationType).toBe('customer_home');
    expect(result.serviceAddress).toBe('Jl. Merdeka 1');
  });

  it('11. current payment-created onsite document preserves bookingType and serviceLocationType', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', bookingType: 'onsite', serviceLocationType: 'barbershop' },
      undefined,
      undefined
    );

    expect(result.bookingType).toBe('onsite');
    expect(result.serviceLocationType).toBe('barbershop');
  });

  it('12. document with only serviceLocationType derives bookingType (never silently onsite for a home booking)', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', serviceLocationType: 'customer_home' },
      undefined,
      undefined
    );

    expect(result.bookingType).toBe('home');
  });

  it('13. document with only bookingType derives serviceLocationType', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', bookingType: 'home' },
      undefined,
      undefined
    );

    expect(result.serviceLocationType).toBe('customer_home');
  });

  it('14. document with neither field falls back to onsite/undefined (pre-location-capture legacy data, not a real home booking being converted)', () => {
    const result = mapRawBookingToDomain('b1', { customerId: 'c1', barberId: 'barber-1', status: 'pending' }, undefined, undefined);

    expect(result.bookingType).toBe('onsite');
    expect(result.serviceLocationType).toBeUndefined();
  });

  it('16. a payment-created document with a fee breakdown surfaces homeServiceFee/applicationFee/voucherDiscount/voucherCode/tipAmount, never collapsing them into subtotal alone', () => {
    const result = mapRawBookingToDomain(
      'b1',
      {
        customerId: 'c1',
        barberId: 'barber-1',
        status: 'pending',
        price: 50000,
        baseAmount: 50000,
        homeServiceFee: 10000,
        applicationFee: 2000,
        voucherDiscount: 5000,
        voucherCode: 'HEMAT5K',
        tipAmount: 3000,
        totalPrice: 60000,
        grossAmount: 60000,
      },
      undefined,
      undefined
    );

    expect(result.subtotal).toBe(50000);
    expect(result.travelFee).toBe(10000);
    expect(result.handlingFee).toBe(2000);
    expect(result.discount).toBe(5000);
    expect(result.couponCode).toBe('HEMAT5K');
    expect(result.tipAmount).toBe(3000);
    expect(result.totalPrice).toBe(60000);
  });

  it('17. a legacy document with no fee breakdown leaves travelFee/handlingFee/discount/couponCode/tipAmount undefined rather than 0/fabricated', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', totalAmount: 40000, totalPrice: 40000 },
      undefined,
      undefined
    );

    expect(result.travelFee).toBeUndefined();
    expect(result.handlingFee).toBeUndefined();
    expect(result.discount).toBeUndefined();
    expect(result.couponCode).toBeUndefined();
    expect(result.tipAmount).toBeUndefined();
  });

  it('15. Admin-shaped document (serviceAddress, no address) still resolves an address', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', serviceAddress: 'Jl. Legacy 9' },
      undefined,
      undefined
    );

    expect(result.serviceAddress).toBe('Jl. Legacy 9');
  });

  // Regression guard: payments.ts previously validated and used the
  // customer's Home Service `location` to compute homeServiceFeeDistanceKm,
  // then discarded it -- never persisting it on the booking document. That
  // silently broke serviceLocation everywhere it's read (the customer
  // tracking screen's distance/ETA, and the Barber Service Workspace's
  // destination card), which always fell back to "no destination known" for
  // every real booking. Now fixed at the source; these lock in the mapping.
  it('18. a persisted home-service location maps to serviceLocation', () => {
    const result = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', location: { latitude: -6.9, longitude: 107.6 } },
      undefined,
      undefined
    );

    expect(result.serviceLocation).toEqual({ latitude: -6.9, longitude: 107.6 });
  });

  it('19. an onsite booking (no location field, or location: null) leaves serviceLocation undefined -- never a fabricated {0,0}', () => {
    const withoutField = mapRawBookingToDomain('b1', { customerId: 'c1', barberId: 'barber-1', status: 'pending' }, undefined, undefined);
    const withNull = mapRawBookingToDomain(
      'b1',
      { customerId: 'c1', barberId: 'barber-1', status: 'pending', location: null },
      undefined,
      undefined
    );

    expect(withoutField.serviceLocation).toBeUndefined();
    expect(withNull.serviceLocation).toBeUndefined();
  });

  // Regression guard: 'startedAt'/'completedAt' are the canonical fields
  // POST /api/barber/bookings/status writes on accepted -> in_progress /
  // in_progress -> completed -- the customer-side Booking domain type never
  // carried them through the mapper at all.
  it('20. startedAt/completedAt (set by the Barber service-status transition) are normalized to ISO strings', () => {
    const result = mapRawBookingToDomain(
      'b1',
      {
        customerId: 'c1',
        barberId: 'barber-1',
        status: 'in_progress',
        startedAt: '2026-08-19T10:00:00.000Z',
      },
      undefined,
      undefined
    );

    expect(result.startedAt).toBe('2026-08-19T10:00:00.000Z');
    expect(result.completedAt).toBeUndefined();
  });
});
