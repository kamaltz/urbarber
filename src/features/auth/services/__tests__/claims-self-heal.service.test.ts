/**
 * Unit Tests for Claims Self-Heal Service (Batch 10B-5B)
 * Covers repairing Firebase custom claims for accounts whose users/{uid}
 * Firestore profile already exists but whose ID token lacks role/app_role --
 * e.g. accounts provisioned before claim assignment shipped. The public
 * self-heal path must stay restricted to customer/barber and must never
 * loop or silently assume the repair succeeded.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { initializeAccountSpy } = vi.hoisted(() => ({ initializeAccountSpy: vi.fn() }));

vi.mock('../account-bootstrap.service', () => ({
  accountBootstrapService: {
    initializeAccount: initializeAccountSpy,
  },
}));

import { claimsNeedRepair, resolveBootstrapFlags, selfHealClaimsIfNeeded } from '../claims-self-heal.service';

function makeUser(overrides: { displayName?: string | null; email?: string | null; refreshedClaims?: Record<string, unknown> } = {}) {
  const getIdTokenResult = vi.fn().mockResolvedValue({ claims: overrides.refreshedClaims ?? {} });
  return {
    displayName: overrides.displayName ?? 'Test Barber',
    email: overrides.email ?? 'barber@example.com',
    getIdTokenResult,
  };
}

describe('claimsNeedRepair', () => {
  it('D. role claim missing only -> needs repair', () => {
    expect(claimsNeedRepair({ app_role: 'barber' }, 'barber')).toBe(true);
  });

  it('E. app_role claim missing only -> needs repair', () => {
    expect(claimsNeedRepair({ role: 'authenticated' }, 'barber')).toBe(true);
  });

  it('F. wrong app_role for canonical role -> needs repair', () => {
    expect(claimsNeedRepair({ role: 'authenticated', app_role: 'customer' }, 'barber')).toBe(true);
  });

  it('C. correct existing claims -> no repair needed', () => {
    expect(claimsNeedRepair({ role: 'authenticated', app_role: 'barber' }, 'barber')).toBe(false);
  });
});

describe('selfHealClaimsIfNeeded', () => {
  beforeEach(() => {
    initializeAccountSpy.mockReset();
  });

  it('A. Barber profile exists + no claims -> initialize-account called once -> refreshed claims accepted', async () => {
    initializeAccountSpy.mockResolvedValue({ success: true });
    const user = makeUser({ refreshedClaims: { role: 'authenticated', app_role: 'barber' } });

    const result = await selfHealClaimsIfNeeded(user as any, {}, 'barber');

    expect(initializeAccountSpy).toHaveBeenCalledTimes(1);
    expect(initializeAccountSpy).toHaveBeenCalledWith({ requestedRole: 'barber', name: 'Test Barber' });
    expect(user.getIdTokenResult).toHaveBeenCalledWith(true);
    expect(result).toEqual({ attempted: true, claimsOk: true, role: 'barber' });
  });

  it('B. Customer profile exists + no claims -> repaired as Customer', async () => {
    initializeAccountSpy.mockResolvedValue({ success: true });
    const user = makeUser({ refreshedClaims: { role: 'authenticated', app_role: 'customer' } });

    const result = await selfHealClaimsIfNeeded(user as any, {}, 'customer');

    expect(initializeAccountSpy).toHaveBeenCalledWith({ requestedRole: 'customer', name: 'Test Barber' });
    expect(result).toEqual({ attempted: true, claimsOk: true, role: 'customer' });
  });

  it('C. correct existing claims -> no initialize-account call (fast path preserved)', async () => {
    const user = makeUser();

    const result = await selfHealClaimsIfNeeded(
      user as any,
      { role: 'authenticated', app_role: 'barber' },
      'barber',
    );

    expect(initializeAccountSpy).not.toHaveBeenCalled();
    expect(user.getIdTokenResult).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: false, claimsOk: true, role: 'barber' });
  });

  it('D. role claim missing only -> repair attempted', async () => {
    initializeAccountSpy.mockResolvedValue({ success: true });
    const user = makeUser({ refreshedClaims: { role: 'authenticated', app_role: 'barber' } });

    const result = await selfHealClaimsIfNeeded(user as any, { app_role: 'barber' }, 'barber');

    expect(initializeAccountSpy).toHaveBeenCalledTimes(1);
    expect(result?.attempted).toBe(true);
    expect(result?.claimsOk).toBe(true);
  });

  it('E. app_role claim missing only -> repair attempted', async () => {
    initializeAccountSpy.mockResolvedValue({ success: true });
    const user = makeUser({ refreshedClaims: { role: 'authenticated', app_role: 'barber' } });

    const result = await selfHealClaimsIfNeeded(user as any, { role: 'authenticated' }, 'barber');

    expect(initializeAccountSpy).toHaveBeenCalledTimes(1);
    expect(result?.attempted).toBe(true);
    expect(result?.claimsOk).toBe(true);
  });

  it('F. wrong app_role for stored role -> repaired to canonical Firestore role, not the stale claim', async () => {
    initializeAccountSpy.mockResolvedValue({ success: true });
    const user = makeUser({ refreshedClaims: { role: 'authenticated', app_role: 'barber' } });

    const result = await selfHealClaimsIfNeeded(
      user as any,
      { role: 'authenticated', app_role: 'customer' },
      'barber',
    );

    expect(initializeAccountSpy).toHaveBeenCalledWith({ requestedRole: 'barber', name: 'Test Barber' });
    expect(result?.claimsOk).toBe(true);
    expect(result?.role).toBe('barber');
  });

  it('G. stored Admin role -> public self-heal NOT called', async () => {
    const user = makeUser();

    const result = await selfHealClaimsIfNeeded(user as any, {}, 'admin');

    expect(initializeAccountSpy).not.toHaveBeenCalled();
    expect(user.getIdTokenResult).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('H. unexpected stored role -> fail closed, no self-heal call', async () => {
    const user = makeUser();

    const result = await selfHealClaimsIfNeeded(user as any, {}, 'moderator');

    expect(initializeAccountSpy).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('H2. missing stored role -> fail closed, no self-heal call', async () => {
    const user = makeUser();

    const result = await selfHealClaimsIfNeeded(user as any, {}, undefined);

    expect(initializeAccountSpy).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('I. repair endpoint succeeds but refreshed claims still wrong -> controlled failure, single attempt, no loop', async () => {
    initializeAccountSpy.mockResolvedValue({ success: true });
    // Backend reported success, but the freshly minted token still doesn't carry
    // the expected claims (e.g. propagation lag) -- must not be assumed healed.
    const user = makeUser({ refreshedClaims: {} });

    const result = await selfHealClaimsIfNeeded(user as any, {}, 'barber');

    expect(initializeAccountSpy).toHaveBeenCalledTimes(1);
    expect(user.getIdTokenResult).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ attempted: true, claimsOk: false, role: 'barber' });
  });

  it('I2. repair endpoint itself fails -> controlled failure, no token refresh attempted', async () => {
    initializeAccountSpy.mockResolvedValue({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'x' } });
    const user = makeUser();

    const result = await selfHealClaimsIfNeeded(user as any, {}, 'barber');

    expect(initializeAccountSpy).toHaveBeenCalledTimes(1);
    expect(user.getIdTokenResult).not.toHaveBeenCalled();
    expect(result).toEqual({ attempted: true, claimsOk: false, role: 'barber' });
  });
});

/**
 * Batch 10B-5B regression: an existing profile with a claims mismatch that
 * repair could not fix was wrongly routed into isUninitialized (the
 * Firestore-profile-missing recovery flow), which let an existing account's
 * role appear switchable on the Complete Account Setup screen. isUninitialized
 * must mean ONLY "Firestore profile does not exist".
 */
describe('resolveBootstrapFlags', () => {
  it('A. Firestore profile missing -> isUninitialized flow preserved', () => {
    expect(resolveBootstrapFlags(false, null)).toEqual({ isUninitialized: true });
  });

  it('B. existing Barber + missing claims + successful repair -> does NOT enter complete-account-setup', () => {
    const healed = { attempted: true, claimsOk: true, role: 'barber' as const };
    expect(resolveBootstrapFlags(true, healed)).toEqual({ isUninitialized: false });
  });

  it('C. existing Customer + missing claims + successful repair -> does NOT enter complete-account-setup', () => {
    const healed = { attempted: true, claimsOk: true, role: 'customer' as const };
    expect(resolveBootstrapFlags(true, healed)).toEqual({ isUninitialized: false });
  });

  it('D. existing profile + repair failure -> controlled ACCOUNT_CLAIMS_REPAIR_FAILED, NOT isUninitialized', () => {
    const failed = { attempted: true, claimsOk: false, role: 'barber' as const };
    expect(resolveBootstrapFlags(true, failed)).toEqual({
      isUninitialized: false,
      bootstrapError: 'ACCOUNT_CLAIMS_REPAIR_FAILED',
    });
  });

  it('E. existing Admin/unexpected role -> no public repair (null healResult) -> fail closed, no error state', () => {
    expect(resolveBootstrapFlags(true, null)).toEqual({ isUninitialized: false });
  });

  it('F. normal/already-correct claims -> no repair attempted -> no error state', () => {
    const alreadyOk = { attempted: false, claimsOk: true, role: 'barber' as const };
    expect(resolveBootstrapFlags(true, alreadyOk)).toEqual({ isUninitialized: false });
  });
});
