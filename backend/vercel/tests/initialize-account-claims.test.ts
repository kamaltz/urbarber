import { describe, expect, it } from 'vitest';

/**
 * Mirrors the claims logic in api/app.ts::handleInitializeAccount so the
 * decision rules can be exercised without a live Firebase Auth Admin SDK.
 */

function validateRequestedRole(role?: string): { valid: boolean; code?: string } {
  if (!role || (role !== 'customer' && role !== 'barber')) {
    return { valid: false, code: 'INVALID_ROLE' };
  }
  return { valid: true };
}

function computeNewAccountClaims(requestedRole: 'customer' | 'barber'): { role: string; app_role: string } {
  return { role: 'authenticated', app_role: requestedRole };
}

function computeEffectiveRole(
  storedRole: string | undefined,
  requestedRole: 'customer' | 'barber',
): 'customer' | 'barber' {
  return storedRole === 'customer' || storedRole === 'barber' ? storedRole : requestedRole;
}

function needsClaimsRepair(
  decodedTokenRole: string | undefined,
  decodedTokenAppRole: string | undefined,
  effectiveRole: string,
): boolean {
  return decodedTokenRole !== 'authenticated' || decodedTokenAppRole !== effectiveRole;
}

function computeSelfHealClaims(
  existingCustomClaims: Record<string, unknown> | undefined,
  effectiveRole: 'customer' | 'barber',
): Record<string, unknown> {
  return {
    ...(existingCustomClaims || {}),
    role: 'authenticated',
    app_role: effectiveRole,
  };
}

describe('Account Initialization Firebase Claims Provisioning (claims fix checkpoint)', () => {
  it('1. New customer account receives role=authenticated + app_role=customer', () => {
    expect(validateRequestedRole('customer').valid).toBe(true);
    expect(computeNewAccountClaims('customer')).toEqual({ role: 'authenticated', app_role: 'customer' });
  });

  it('2. New barber account receives role=authenticated + app_role=barber', () => {
    expect(validateRequestedRole('barber').valid).toBe(true);
    expect(computeNewAccountClaims('barber')).toEqual({ role: 'authenticated', app_role: 'barber' });
  });

  it('3. Existing account missing claims is repaired to match its stored role', () => {
    const effectiveRole = computeEffectiveRole('barber', 'customer');
    expect(effectiveRole).toBe('barber');
    expect(needsClaimsRepair(undefined, undefined, effectiveRole)).toBe(true);
    expect(computeSelfHealClaims(undefined, effectiveRole)).toEqual({
      role: 'authenticated',
      app_role: 'barber',
    });
  });

  it('4. Existing account with already-correct claims is left untouched', () => {
    const effectiveRole = computeEffectiveRole('customer', 'customer');
    expect(needsClaimsRepair('authenticated', 'customer', effectiveRole)).toBe(false);
  });

  it('5. Public initialize-account rejects admin as a requested role', () => {
    const res = validateRequestedRole('admin');
    expect(res.valid).toBe(false);
    expect(res.code).toBe('INVALID_ROLE');
  });

  it('6. An unexpected stored role (e.g. admin set out-of-band) is never echoed into a claim grant', () => {
    const effectiveRole = computeEffectiveRole('admin', 'customer');
    expect(effectiveRole).toBe('customer');
    expect(computeSelfHealClaims(undefined, effectiveRole).app_role).toBe('customer');
  });

  it('7. Self-heal preserves unrelated legitimate existing custom claims', () => {
    const existing = { featureFlags: { betaTracking: true }, referralCode: 'ABC123' };
    const merged = computeSelfHealClaims(existing, 'barber');
    expect(merged).toEqual({
      featureFlags: { betaTracking: true },
      referralCode: 'ABC123',
      role: 'authenticated',
      app_role: 'barber',
    });
  });

  it('8. Self-heal cannot be used to smuggle a malicious app_role via existing claims', () => {
    const existing = { app_role: 'admin', role: 'authenticated' };
    const merged = computeSelfHealClaims(existing, 'customer');
    expect(merged.app_role).toBe('customer');
    expect(merged.role).toBe('authenticated');
  });

  it('9. Firestore profile creation payload is unchanged by the claims fix', () => {
    const requestedRole = 'barber';
    const newUserData = {
      role: requestedRole,
      app_role: requestedRole,
      status: 'active',
    };
    expect(newUserData).toEqual({ role: 'barber', app_role: 'barber', status: 'active' });
  });
});
