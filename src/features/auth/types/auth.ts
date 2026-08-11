/**
 * Authentication Types
 */

import { UserRole, UserStatus } from '@/types/domain';

export type AuthPurpose = 'login' | 'register' | 'reset';

export type SocialProvider = 'google' | 'apple';

export interface OtpVerificationParams {
  identifier: string;
  purpose: AuthPurpose;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SocialUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface RegisterFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}

export interface ForgotPasswordFormData {
  email: string;
}

/**
 * ACCOUNT_CLAIMS_REPAIR_FAILED: an existing users/{uid} profile whose Firebase
 * custom claims were missing/stale and self-heal could not repair them. Distinct
 * from isUninitialized (Firestore profile missing) -- must never route through
 * the missing-profile recovery screen, since the Firestore role already is
 * authoritative and correct here.
 */
export type AuthBootstrapErrorCode = 'ACCOUNT_CLAIMS_REPAIR_FAILED';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber?: string | null;
  photoURL?: string | null;
  profileImagePath?: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  isUninitialized?: boolean;
  bootstrapError?: AuthBootstrapErrorCode;
}

export interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  emailVerified: boolean;
  logout: () => Promise<void>;
  reloadUser: () => Promise<boolean>;
  completeOtpLogin?: (identifier: string) => Promise<void>;
}
