import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import { UserRole, UserStatus } from '@/types/domain';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useEffect, useState } from 'react';
import { AuthContextType, AuthUser } from '../types/auth';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (currentUser: User): Promise<AuthUser> => {
    let role: UserRole = 'customer';
    let status: UserStatus = 'active';
    let phoneNumber: string | undefined = currentUser.phoneNumber || undefined;

    try {
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDocSnap = await withTimeout(
        getDoc(userDocRef),
        8_000,
        'Loading the user profile timed out',
      );

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        if (data.role) role = data.role as UserRole;
        if (data.status) status = data.status as UserStatus;
        if (data.phoneNumber) phoneNumber = data.phoneNumber;
      } else {
        await withTimeout(
          setDoc(
            userDocRef,
            {
              uid: currentUser.uid,
              email: currentUser.email,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer',
              role: 'customer',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          ),
          8_000,
          'Creating the user profile timed out',
        );
      }
    } catch (error) {
      console.warn('Error fetching or creating user profile in Firestore:', error);
    }

    return {
      uid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
      phoneNumber,
      role,
      status,
      emailVerified: currentUser.emailVerified,
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
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      await syncUser(currentUser);
    });

    return () => unsubscribe();
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
