import { describe, expect, it } from 'vitest';
import { createPaidCheckoutGuard } from '../paid-checkout-guard';

describe('createPaidCheckoutGuard', () => {
  it('stays for initiated', () => {
    expect(createPaidCheckoutGuard().consumeIfPaid('initiated')).toBe(false);
  });

  it('stays for pending', () => {
    expect(createPaidCheckoutGuard().consumeIfPaid('pending')).toBe(false);
  });

  it('navigates for paid', () => {
    const guard = createPaidCheckoutGuard();
    expect(guard.consumeIfPaid('paid')).toBe(true);
  });

  it('stays for failed', () => {
    expect(createPaidCheckoutGuard().consumeIfPaid('failed')).toBe(false);
  });

  it('stays for expired', () => {
    expect(createPaidCheckoutGuard().consumeIfPaid('expired')).toBe(false);
  });

  it('stays for cancelled', () => {
    expect(createPaidCheckoutGuard().consumeIfPaid('cancelled')).toBe(false);
  });

  it('stays for null/undefined (browser closed without an authoritative signal)', () => {
    const guard = createPaidCheckoutGuard();
    expect(guard.consumeIfPaid(null)).toBe(false);
    expect(guard.consumeIfPaid(undefined)).toBe(false);
  });

  it('navigates when the sync-status response reports paid', () => {
    const guard = createPaidCheckoutGuard();
    expect(guard.consumeIfPaid('paid')).toBe(true);
  });

  it('navigates when the realtime subscription reports paid', () => {
    const guard = createPaidCheckoutGuard();
    expect(guard.consumeIfPaid('paid')).toBe(true);
  });

  it('navigates exactly once when both signals report paid (duplicate paid signal)', () => {
    const guard = createPaidCheckoutGuard();
    const subscriptionResult = guard.consumeIfPaid('paid');
    const syncResult = guard.consumeIfPaid('paid');
    expect(subscriptionResult).toBe(true);
    expect(syncResult).toBe(false);
    expect(guard.hasNavigated).toBe(true);
  });

  it('redirects immediately on paid-invoice re-entry (fresh guard observing already-paid state)', () => {
    const guard = createPaidCheckoutGuard();
    expect(guard.consumeIfPaid('paid')).toBe(true);
  });

  it('does not navigate again after a pending status following a consumed paid', () => {
    const guard = createPaidCheckoutGuard();
    guard.consumeIfPaid('paid');
    expect(guard.consumeIfPaid('pending')).toBe(false);
    expect(guard.hasNavigated).toBe(true);
  });
});
