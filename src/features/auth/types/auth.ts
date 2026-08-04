/**
 * Authentication Types
 */

export type AuthPurpose = 'login' | 'register' | 'reset';

export type SocialProvider = 'google' | 'apple';

export interface OtpVerificationParams {
  identifier: string;
  purpose: AuthPurpose;
}

export interface LoginFormData {
  email: string;
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

export interface AuthContextType {
  isAuthenticated: boolean;
  user: null;
  loading: boolean;
}
