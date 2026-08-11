import type { AuthBootstrapErrorCode } from '../types/auth';
import type { PublicRegistrationRole } from '@/types/domain';
import type { User } from 'firebase/auth';
import { accountBootstrapService } from './account-bootstrap.service';

export interface ClaimsSelfHealResult {
  attempted: boolean;
  claimsOk: boolean;
  role: PublicRegistrationRole;
}

export interface BootstrapFlags {
  isUninitialized: boolean;
  bootstrapError?: AuthBootstrapErrorCode;
}

type SelfHealUser = Pick<User, 'displayName' | 'email'> & {
  getIdTokenResult: User['getIdTokenResult'];
};

function isPublicRole(role: unknown): role is PublicRegistrationRole {
  return role === 'customer' || role === 'barber';
}

export function claimsNeedRepair(
  claims: Record<string, unknown>,
  canonicalRole: PublicRegistrationRole,
): boolean {
  return claims.role !== 'authenticated' || claims.app_role !== canonicalRole;
}

/**
 * Repairs Firebase custom claims for an account whose users/{uid} Firestore
 * profile already exists but whose ID token still lacks role/app_role --
 * e.g. accounts provisioned before claim assignment shipped. isUninitialized
 * only tracks Firestore doc existence, so this is the only path that catches
 * a claims-only gap on an otherwise fully set up account.
 *
 * Restricted to public application roles (customer/barber); admin and any
 * unexpected stored role are never passed to the public bootstrap endpoint.
 * Returns null when no repair was eligible (fail-closed).
 */
export async function selfHealClaimsIfNeeded(
  user: SelfHealUser,
  currentClaims: Record<string, unknown>,
  storedRole: unknown,
): Promise<ClaimsSelfHealResult | null> {
  if (!isPublicRole(storedRole)) {
    return null;
  }

  if (!claimsNeedRepair(currentClaims, storedRole)) {
    return { attempted: false, claimsOk: true, role: storedRole };
  }

  const heal = await accountBootstrapService.initializeAccount({
    requestedRole: storedRole,
    name: user.displayName || user.email || 'User',
  });

  if (!heal.success) {
    return { attempted: true, claimsOk: false, role: storedRole };
  }

  // Verify the repair actually took effect -- never assume success.
  const refreshed = await user.getIdTokenResult(true);
  const claimsOk = !claimsNeedRepair(refreshed.claims, storedRole);

  return { attempted: true, claimsOk, role: storedRole };
}

/**
 * Maps a self-heal outcome to the two auth-bootstrap flags. isUninitialized
 * must mean ONLY "Firestore profile does not exist" -- an existing profile
 * with a claims mismatch that repair could not fix must never route through
 * the missing-profile recovery screen (that would let an existing account's
 * role look switchable). It instead surfaces as a distinct, controlled
 * bootstrapError so normal navigation can still proceed on the authoritative
 * Firestore role.
 */
export function resolveBootstrapFlags(
  firestoreProfileExists: boolean,
  healResult: ClaimsSelfHealResult | null,
): BootstrapFlags {
  if (!firestoreProfileExists) {
    return { isUninitialized: true };
  }

  if (healResult && !healResult.claimsOk) {
    return { isUninitialized: false, bootstrapError: 'ACCOUNT_CLAIMS_REPAIR_FAILED' };
  }

  return { isUninitialized: false };
}
