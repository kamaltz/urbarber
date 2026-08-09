import { describe, expect, it } from 'vitest';
import { getSlotLockId } from '../src/bookings/slot-lock';
import { generateMidtransSignature, parseOrderId, verifyMidtransSignature } from '../src/payments/signature';
import { mapMidtransStatus, shouldReleaseSlot } from '../src/payments/status-mapper';

describe('Vercel Backend Utilities Unit Tests', () => {
  const serverKey = 'SB-Mid-server-TEST_SECRET_KEY';

  it('1. Generates and verifies SHA-512 Midtrans signatures correctly', () => {
    const orderId = 'URB-test_booking_123';
    const statusCode = '200';
    const grossAmount = 75000;

    const signature = generateMidtransSignature(orderId, statusCode, grossAmount, serverKey);
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(128);

    const isValid = verifyMidtransSignature(signature, orderId, statusCode, grossAmount, serverKey);
    expect(isValid).toBe(true);

    const isInvalid = verifyMidtransSignature('invalid_signature', orderId, statusCode, grossAmount, serverKey);
    expect(isInvalid).toBe(false);
  });

  it('2. Parses booking ID from URB-{bookingId} format safely', () => {
    const parsedValid = parseOrderId('URB-book_abc99');
    expect(parsedValid.valid).toBe(true);
    expect(parsedValid.bookingId).toBe('book_abc99');

    const parsedInvalid = parseOrderId('INVALID_FORMAT_123');
    expect(parsedInvalid.valid).toBe(false);
    expect(parsedInvalid.bookingId).toBeNull();
  });

  it('3. Maps Midtrans transaction and fraud statuses to canonical PaymentStatus', () => {
    expect(mapMidtransStatus('pending')).toBe('pending');
    expect(mapMidtransStatus('authorize')).toBe('pending');
    expect(mapMidtransStatus('settlement')).toBe('paid');
    expect(mapMidtransStatus('capture', 'accept')).toBe('paid');
    expect(mapMidtransStatus('capture', 'challenge')).toBe('pending');
    expect(mapMidtransStatus('capture', 'deny')).toBe('failed');
    expect(mapMidtransStatus('deny')).toBe('failed');
    expect(mapMidtransStatus('failure')).toBe('failed');
    expect(mapMidtransStatus('cancel')).toBe('cancelled');
    expect(mapMidtransStatus('expire')).toBe('expired');
    expect(mapMidtransStatus('refund')).toBe('refunded');
    expect(mapMidtransStatus('partial_refund')).toBe('partially_refunded');
  });

  // Batch 09E-P0 regression: an incomplete/missing fraud_status on a 'capture' must
  // never be treated as a definitive failure -- that previously caused a real paid
  // sandbox transaction to be destructively cancelled when sync omitted fraud_status
  // entirely (see payment-sync-reconciliation.test.ts for the full incident scenario).
  it('3b. Capture with missing/unknown fraud_status maps to a non-destructive state, never a definitive failure', () => {
    expect(mapMidtransStatus('capture')).toBe('pending');
    expect(mapMidtransStatus('capture', undefined)).toBe('pending');
    expect(mapMidtransStatus('capture', null)).toBe('pending');
    expect(mapMidtransStatus('capture', '')).toBe('pending');
    expect(mapMidtransStatus('capture', 'unknown_future_fraud_value')).toBe('pending');

    // None of these should ever equal the destructive 'failed' state, and none are
    // in shouldReleaseSlot's destructive set -- an ambiguous read must not release a
    // slot or cancel a booking.
    expect(mapMidtransStatus('capture')).not.toBe('failed');
    expect(shouldReleaseSlot(mapMidtransStatus('capture'))).toBe(false);
  });

  it('4. Determines slot release rules correctly', () => {
    expect(shouldReleaseSlot('failed')).toBe(true);
    expect(shouldReleaseSlot('expired')).toBe(true);
    expect(shouldReleaseSlot('cancelled')).toBe(true);
    expect(shouldReleaseSlot('refunded')).toBe(true);

    expect(shouldReleaseSlot('paid')).toBe(false);
    expect(shouldReleaseSlot('pending')).toBe(false);
    expect(shouldReleaseSlot('partially_refunded')).toBe(false);
  });

  it('5. Generates deterministic slot lock IDs', () => {
    const slotId = getSlotLockId('barb123', '2026-08-10', '14:30');
    expect(slotId).toBe('barb123_2026-08-10_1430');
  });
});
