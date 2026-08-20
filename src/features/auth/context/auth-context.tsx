import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import { UserRole, UserStatus } from '@/types/domain';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { resolveBootstrapFlags, selfHealClaimsIfNeeded } from '../services/claims-self-heal.service';
import { signOutGoogleNative } from '../services/google-auth.service';
import { AuthBootstrapErrorCode, AuthContextType, AuthUser } from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (currentUser: User): Promise<AuthUser> => {
    let role: UserRole = 'customer';
    let status: UserStatus = 'active';
    let phoneNumber: string | undefined = currentUser.phoneNumber || undefined;
    let photoURL: string | undefined = currentUser.photoURL || undefined;
    let profileImagePath: string | undefined = undefined;
    let displayName: string | undefined = currentUser.displayName || undefined;
    let isUninitialized = false;
    let bootstrapError: AuthBootstrapErrorCode | undefined;

    try {
      // 1. Read token custom claims
      const tokenResult = await currentUser.getIdTokenResult(false);
      if (tokenResult.claims.app_role) {
        role = tokenResult.claims.app_role as UserRole;
      }

      // 2. Fetch users/{uid} document from Firestore
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDocSnap = await withTimeout(
        getDoc(userDocRef),
        10_000,
        'Loading the user profile timed out',
      );

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.role) role = data.role as UserRole;
        if (data.status) status = data.status as UserStatus;
        if (data.phoneNumber) phoneNumber = data.phoneNumber;
        if (data.name || data.fullName) displayName = data.name || data.fullName;
        if (data.profileImageUrl || data.profileImage || data.avatarUrl) {
          photoURL = data.profileImageUrl || data.profileImage || data.avatarUrl;
        }
        if (data.profileImagePath) {
          profileImagePath = data.profileImagePath;
        }

        // Self-heal Firebase custom claims for accounts whose Firestore profile
        // already exists but whose ID token still lacks role/app_role -- e.g.
        // accounts provisioned before claim assignment shipped.
        const healResult = await selfHealClaimsIfNeeded(currentUser, tokenResult.claims, data.role);
        const flags = resolveBootstrapFlags(true, healResult);
        isUninitialized = flags.isUninitialized;
        bootstrapError = flags.bootstrapError;
      } else {
        // Document does not exist: mark as uninitialized for recovery flow (no silent fallback!)
        isUninitialized = true;
      }
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[AuthProvider fetchUserProfile Error]', error?.code, error?.message || error);
      }
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: displayName || currentUser.email?.split('@')[0] || 'User',
      phoneNumber,
      photoURL: photoURL || currentUser.photoURL || undefined,
      profileImagePath,
      role,
      status,
      emailVerified: currentUser.emailVerified,
      isUninitialized,
      bootstrapError,
    };
  }, []);

  const syncUser = useCallback(
    async (currentUser: User | null) => {
      if (!currentUser) {
        setAuthUser(null);
        setLoading(false);
        return;
      }

      const profile = await fetchUserProfile(currentUser);
      setAuthUser(profile);
      setLoading(false);
    },
    [fetchUserProfile],
  );

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      if (!isMounted) return;
      await syncUser(currentUser);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncUser]);

  const reloadUser = useCallback(async (): Promise<boolean> => {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return false;

    await currentUser.reload();
    await currentUser.getIdToken(true);
    const refreshedUser = firebaseAuth.currentUser;

    if (refreshedUser) {
      const profile = await fetchUserProfile(refreshedUser);
      setAuthUser(profile);
      return refreshedUser.emailVerified;
    }

    return false;
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth);
    await signOutGoogleNative();
    setAuthUser(null);
  }, []);

  const value: AuthContextType = {
    user: authUser,
    role: authUser?.role ?? null,
    loading,
    isAuthenticated: !!authUser,
    emailVerified: authUser?.emailVerified ?? false,
    logout,
    reloadUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
