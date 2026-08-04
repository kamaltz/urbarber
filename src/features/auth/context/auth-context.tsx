import { firebaseAuth } from '@/lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useEffect, useState } from 'react';

const OTP_SESSION_KEY = '@urbarber/otp-session';

export type AuthUser = Pick<User, 'uid' | 'email' | 'displayName'>;

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  completeOtpLogin: (identifier: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [otpUser, setOtpUser] = useState<AuthUser | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setFirebaseUser(currentUser);
      setFirebaseLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(OTP_SESSION_KEY)
      .then((storedSession) => {
        if (storedSession) setOtpUser(JSON.parse(storedSession) as AuthUser);
      })
      .catch(() => AsyncStorage.removeItem(OTP_SESSION_KEY))
      .finally(() => setSessionLoading(false));
  }, []);

  const completeOtpLogin = async (identifier: string) => {
    if (firebaseUser) return;

    const normalizedIdentifier = identifier.trim().toLowerCase();
    const sessionUser: AuthUser = {
      uid: `otp:${normalizedIdentifier}`,
      email: normalizedIdentifier,
      displayName: normalizedIdentifier.split('@')[0] || 'Customer',
    };

    await AsyncStorage.setItem(OTP_SESSION_KEY, JSON.stringify(sessionUser));
    setOtpUser(sessionUser);
  };

  const user = firebaseUser ?? otpUser;

  const value: AuthContextType = {
    user,
    loading: firebaseLoading || sessionLoading,
    isAuthenticated: !!user,
    completeOtpLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
