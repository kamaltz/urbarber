/**
 * Admin Runtime Data-Shape Crash Fix (Batch 10B-5B follow-up)
 *
 * getDashboardMetrics's recentBookings mapper used to blindly spread raw
 * Firestore booking docs ({ id: d.id, ...d.data() }). Booking docs store
 * `totalPrice`, not `price`, and have no `bookingId` field (the doc ID is
 * authoritative) -- so every recent booking silently arrived at the Admin
 * browser without the `bookingId` field its AdminBookingRecord contract
 * requires, and apps/admin's dashboard table crashed on
 * `booking.bookingId.slice(0, 8)` inside the .map().
 *
 * Exercises the actual production function against the Firestore emulator,
 * matching the convention in admin-registration-privacy.test.ts.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDashboardMetrics } from '../src/admin/admin.service.js';
import { db } from '../src/lib/firebase-admin.js';

const BOOKING_ID = 'booking-10b-5b-dashboard';

function baseBooking(overrides: Record<string, any> = {}) {
  return {
    customerId: 'customer-10b-5b',
    barberId: 'barber-10b-5b',
    serviceId: 'service-10b-5b',
    status: 'completed',
    paymentMethod: 'cash_on_service',
    paymentStatus: 'not_required',
    totalPrice: 50000,
    date: '2026-08-10',
    startTime: '10:00',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function cleanup() {
  await db.collection('bookings').doc(BOOKING_ID).delete();
}

describe('Admin dashboard recentBookings DTO contract (Batch 10B-5B)', () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it('recentBookings exposes bookingId (the doc ID), not a raw spread lacking it', async () => {
    await db.collection('bookings').doc(BOOKING_ID).set(baseBooking());

    const metrics = await getDashboardMetrics();
    const found = metrics.recentBookings.find((b) => b.bookingId === BOOKING_ID);

    expect(found).toBeDefined();
    expect(typeof found?.bookingId).toBe('string');
    expect(found?.bookingId.length).toBeGreaterThan(0);
  });

  it('recentBookings exposes price mapped from the stored totalPrice field', async () => {
    await db.collection('bookings').doc(BOOKING_ID).set(baseBooking({ totalPrice: 75000 }));

    const metrics = await getDashboardMetrics();
    const found = metrics.recentBookings.find((b) => b.bookingId === BOOKING_ID);

    expect(found?.price).toBe(75000);
  });

  it('recentBookings defaults price to 0 rather than undefined when totalPrice is missing', async () => {
    const booking = baseBooking();
    delete (booking as Record<string, any>).totalPrice;
    await db.collection('bookings').doc(BOOKING_ID).set(booking);

    const metrics = await getDashboardMetrics();
    const found = metrics.recentBookings.find((b) => b.bookingId === BOOKING_ID);

    expect(found?.price).toBe(0);
    expect(found?.price).not.toBeUndefined();
  });

  it('recentBookings retains the other fields the dashboard table renders', async () => {
    await db.collection('bookings').doc(BOOKING_ID).set(baseBooking());

    const metrics = await getDashboardMetrics();
    const found = metrics.recentBookings.find((b) => b.bookingId === BOOKING_ID);

    expect(found?.status).toBe('completed');
    expect(found?.date).toBe('2026-08-10');
    expect(found?.customerId).toBe('customer-10b-5b');
    expect(found?.barberId).toBe('barber-10b-5b');
  });
});
