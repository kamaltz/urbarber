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
