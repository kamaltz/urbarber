/**
 * Canonical precedence for Customer display identity across screens.
 *
 * customers/{uid} (fetched into CustomerProfile via useCustomerProfile) is the
 * canonical source. Firebase Auth (user.displayName/photoURL) is authentication
 * identity only and must never shadow a newer Firestore value -- it exists here
 * purely as a fallback for the brief window before the canonical profile has
 * loaded, or for a profile document that has no name/photo set yet.
 */
import type { CustomerProfile } from '../types/customer';

export interface AuthLikeUser {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export function resolveCustomerDisplayName(
  profile: Pick<CustomerProfile, 'name'> | null | undefined,
  user: AuthLikeUser | null | undefined,
  fallback = 'Pelanggan URBarber'
): string {
  return profile?.name || user?.displayName || user?.email?.split('@')[0] || fallback;
}

export function resolveCustomerAvatarUrl(
  profile: Pick<CustomerProfile, 'profileImageUrl'> | null | undefined,
  user: AuthLikeUser | null | undefined
): string | undefined {
  return profile?.profileImageUrl || user?.photoURL || undefined;
}
