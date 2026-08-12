import { describe, expect, it } from 'vitest';
import { isPayButtonDisabled } from '../pay-button-state';

describe('isPayButtonDisabled', () => {
  it('initiated + paymentUrl -> enabled', () => {
    expect(isPayButtonDisabled({ status: 'initiated', paymentUrl: 'https://snap.example', syncing: false })).toBe(false);
  });

  it('pending + paymentUrl -> enabled (a pending Midtrans transaction is still payable)', () => {
    expect(isPayButtonDisabled({ status: 'pending', paymentUrl: 'https://snap.example', syncing: false })).toBe(false);
  });

  it('pending + no paymentUrl -> disabled', () => {
    expect(isPayButtonDisabled({ status: 'pending', paymentUrl: null, syncing: false })).toBe(true);
  });

  it('paid + paymentUrl -> disabled (terminal, never a reusable Pay button)', () => {
    expect(isPayButtonDisabled({ status: 'paid', paymentUrl: 'https://snap.example', syncing: false })).toBe(true);
  });

  it('expired/cancelled/failed + paymentUrl -> disabled (terminal, no duplicate booking)', () => {
    expect(isPayButtonDisabled({ status: 'expired', paymentUrl: 'https://snap.example', syncing: false })).toBe(true);
    expect(isPayButtonDisabled({ status: 'cancelled', paymentUrl: 'https://snap.example', syncing: false })).toBe(true);
    expect(isPayButtonDisabled({ status: 'failed', paymentUrl: 'https://snap.example', syncing: false })).toBe(true);
  });

  it('syncing genuinely blocks interaction -> disabled even with a valid paymentUrl', () => {
    expect(isPayButtonDisabled({ status: 'pending', paymentUrl: 'https://snap.example', syncing: true })).toBe(true);
  });

  it('browser cancelled leaves authoritative status pending -> still payable', () => {
    // Mirrors the post-cancel state: syncBookingPaymentStatus reported pending,
    // syncing has been reset to false, and paymentUrl was never cleared.
    expect(isPayButtonDisabled({ status: 'pending', paymentUrl: 'https://snap.example', syncing: false })).toBe(false);
  });
});
