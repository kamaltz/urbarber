/**
 * Firebase Authentication Service
 * Handles user authentication with Firebase Auth
 */

import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import { accountBootstrapService } from './account-bootstrap.service';
import { signOutGoogleNative } from './google-auth.service';
import {
    createUserWithEmailAndPassword,
    AuthError as FirebaseAuthError,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  acceptedTerms: boolean;
}

export interface RegisterBarberPayload extends RegisterPayload {
  shopName?: string;
  shopAddress?: string;
  address?: string;
  description?: string;
  autoApprove?: boolean;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthResponse {
  success: boolean;
  emailVerified?: boolean;
  error?: AuthError;
}

/**
 * Dev-only diagnostic breadcrumb for auth failures.
 *
 * Logs the Firebase error *code* and nothing else — never the email, password,
 * ID token, API key or any part of the Firebase config. `auth/invalid-api-key`
 * and `auth/network-request-failed` are the two codes that distinguish a broken
 * build-time environment from a genuine connectivity problem, which is exactly
 * what collapsing everything into a single generic code used to hide.
 */
function logAuthErrorCode(operation: string, error: unknown): void {
  if (!__DEV__) return;
  const code = (error as FirebaseAuthError)?.code;
  console.warn('[auth]', operation, 'failed with code:', code ?? 'unknown');
}

/** Friendly Indonesian copy for the failure modes shared by all auth entry points. */
function commonAuthErrorMessage(code: string | undefined): string | undefined {
  switch (code) {
    case 'auth/network-request-failed':
      return 'Koneksi ke Firebase bermasalah. Periksa internet atau pemblokir browser.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid':
    case 'auth/app-not-authorized':
      return 'Konfigurasi aplikasi bermasalah. Hubungi admin URBarber.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.';
    default:
      return undefined;
  }
}

function verificationEmailError(error: unknown): AuthError {
  const firebaseError = error as FirebaseAuthError;

  if (firebaseError.code === 'auth/too-many-requests') {
    return {
      code: firebaseError.code,
      message: 'Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.',
    };
  }

  if (firebaseError.code === 'auth/unauthorized-continue-uri') {
    return {
      code: firebaseError.code,
      message: 'Domain aplikasi belum diizinkan di Firebase Authentication.',
    };
  }

  if (firebaseError.code === 'auth/network-request-failed') {
    return {
      code: firebaseError.code,
      message: 'Koneksi ke Firebase bermasalah. Periksa internet atau pemblokir browser.',
    };
  }

  return {
    code: firebaseError.code || 'SEND_FAILED',
    message: 'Firebase gagal mengirim email verifikasi. Coba lagi beberapa saat.',
  };
}

class FirebaseAuthService {
  /**
   * Register new customer account via Firebase Auth + trusted Vercel backend bootstrap
   */
  async registerCustomer(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      if (!payload.fullName || !payload.email || !payload.password) {
        return {
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Field yang diperlukan tidak lengkap' },
        };
      }

      if (payload.password.length < 6) {
        return {
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Password minimal 6 karakter' },
        };
      }

      if (!payload.acceptedTerms) {
        return {
          success: false,
          error: { code: 'TERMS_NOT_ACCEPTED', message: 'Harus menerima syarat dan ketentuan' },
        };
      }

      // 1. Create Firebase user credential
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        payload.email.trim(),
        payload.password,
      );

      // 2. Set Firebase Auth display name & send email verification
      await updateProfile(userCredential.user, { displayName: payload.fullName.trim() });
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailErr) {
        console.warn('Failed to send verification email during customer registration:', emailErr);
      }

      // 3. Invoke trusted Vercel account initialization endpoint
      const initResult = await accountBootstrapService.initializeAccount({
        requestedRole: 'customer',
        name: payload.fullName.trim(),
        phoneNumber: payload.phoneNumber ? payload.phoneNumber.trim() : undefined,
      });

      if (!initResult.success) {
        return {
          success: false,
          error: initResult.error || { code: 'INIT_FAILED', message: 'Gagal inisialisasi akun backend.' },
        };
      }

      // 4. Refresh ID token
      await userCredential.user.getIdToken(true);

      return { success: true, emailVerified: userCredential.user.emailVerified };
    } catch (error: any) {
      const firebaseError = error as FirebaseAuthError;
      const message =
        firebaseError.code === 'auth/email-already-in-use'
          ? 'Email sudah terdaftar. Silakan login ke akun Anda.'
          : 'Pendaftaran gagal';

      return {
        success: false,
        error: { code: firebaseError.code || 'REGISTRATION_FAILED', message },
      };
    }
  }

  /**
   * Register new barber account via Firebase Auth + trusted Vercel backend bootstrap
   */
  async registerBarber(payload: RegisterBarberPayload): Promise<AuthResponse> {
    try {
      if (!payload.fullName || !payload.email || !payload.password) {
        return {
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Field yang diperlukan tidak lengkap' },
        };
      }

      if (payload.password.length < 6) {
        return {
          success: false,
          error: { code: 'WEAK_PASSWORD', message: 'Password minimal 6 karakter' },
        };
      }

      if (!payload.acceptedTerms) {
        return {
          success: false,
          error: { code: 'TERMS_NOT_ACCEPTED', message: 'Harus menerima syarat dan ketentuan' },
        };
      }

      // 1. Create Firebase user credential
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        payload.email.trim(),
        payload.password,
      );

      // 2. Set Firebase Auth display name & send email verification
      await updateProfile(userCredential.user, { displayName: payload.fullName.trim() });
      try {
        await sendEmailVerification(userCredential.user);
      } catch (emailErr) {
        console.warn('Failed to send verification email during barber registration:', emailErr);
      }

      // 3. Invoke account initialization service
      const initResult = await accountBootstrapService.initializeAccount({
        requestedRole: 'barber',
        name: payload.fullName.trim(),
        phoneNumber: payload.phoneNumber ? payload.phoneNumber.trim() : undefined,
      });

      if (!initResult.success) {
        return {
          success: false,
          error: initResult.error || { code: 'INIT_FAILED', message: 'Gagal inisialisasi akun backend.' },
        };
      }

      // 4. Refresh ID token
      await userCredential.user.getIdToken(true);

      return { success: true, emailVerified: userCredential.user.emailVerified };
    } catch (error: any) {
      const firebaseError = error as FirebaseAuthError;
      const message =
        firebaseError.code === 'auth/email-already-in-use'
          ? 'Email sudah terdaftar. Silakan login ke akun Anda.'
          : 'Pendaftaran barber gagal';

      return {
        success: false,
        error: { code: firebaseError.code || 'REGISTRATION_FAILED', message },
      };
    }
  }

  /**
   * Login with email and password, checking suspended status
   */
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const userCredential = await withTimeout(
        signInWithEmailAndPassword(firebaseAuth, email.trim(), password),
        15_000,
        'Login request timed out',
      );

      const user = userCredential.user;

      // Check if user is suspended in Firestore users/{uid}
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().status === 'suspended') {
          await signOut(firebaseAuth);
          return {
            success: false,
            error: {
              code: 'USER_SUSPENDED',
              message: 'Akun Anda telah ditangguhkan. Silakan hubungi admin.',
            },
          };
        }
      } catch (docError) {
        console.warn('Unable to verify user status document:', docError);
      }

      await user.reload();
      return {
        success: true,
        emailVerified: firebaseAuth.currentUser?.emailVerified ?? false,
      };
    } catch (error: any) {
      logAuthErrorCode('loginWithEmail', error);

      const firebaseError = error as FirebaseAuthError;
      const isTimeout = error instanceof Error && error.message === 'Login request timed out';
      const code = isTimeout ? 'auth/network-request-failed' : firebaseError.code;

      const invalidCredentials = [
        'auth/invalid-credential',
        'auth/invalid-email',
        'auth/user-not-found',
        'auth/wrong-password',
      ].includes(code);

      const message = invalidCredentials
        ? 'Email atau password salah'
        : (commonAuthErrorMessage(code) ?? 'Login gagal. Coba lagi.');

      return {
        success: false,
        error: { code: code || 'LOGIN_FAILED', message },
      };
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(identifier: string): Promise<AuthResponse> {
    try {
      if (!identifier || !identifier.includes('@')) {
        return {
          success: false,
          error: { code: 'INVALID_EMAIL', message: 'Email tidak valid' },
        };
      }

      await withTimeout(
        sendPasswordResetEmail(firebaseAuth, identifier.trim()),
        15_000,
        'Password reset request timed out',
      );
      return { success: true };
    } catch (error: any) {
      logAuthErrorCode('requestPasswordReset', error);

      const firebaseError = error as FirebaseAuthError;
      const isTimeout =
        error instanceof Error && error.message === 'Password reset request timed out';
      const code = isTimeout ? 'auth/network-request-failed' : firebaseError.code;

      const message =
        commonAuthErrorMessage(code) ??
        (code === 'auth/invalid-email' || code === 'auth/user-not-found'
          ? // Deliberately non-committal: confirming whether an address is
            // registered would leak account existence.
            'Jika email terdaftar, link reset password akan dikirim.'
          : 'Gagal mengirim link reset password');

      return {
        success: false,
        error: { code: code || 'RESET_FAILED', message },
      };
    }
  }

  /**
   * Resend Email Verification
   */
  async resendVerificationEmail(): Promise<AuthResponse> {
    try {
      const user = firebaseAuth.currentUser;
      if (!user) {
        return {
          success: false,
          error: { code: 'NO_USER', message: 'User tidak ditemukan' },
        };
      }
      await user.reload();
      if (user.emailVerified) {
        return { success: true, emailVerified: true };
      }

      await withTimeout(
        sendEmailVerification(user),
        15_000,
        'Sending verification email timed out',
      );
      return { success: true };
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      return {
        success: false,
        error: verificationEmailError(error),
      };
    }
  }

  /**
   * OTP Request Stub
   */
  async requestOtp(identifier: string | { identifier: string; purpose?: string }): Promise<AuthResponse> {
    return {
      success: true,
    };
  }

  /**
   * OTP Verification Stub
   */
  async verifyOtp(
    identifierOrParams: string | { identifier: string; otp: string; purpose?: string },
    otpCode?: string,
  ): Promise<AuthResponse> {
    return {
      success: true,
    };
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await signOut(firebaseAuth);
    await signOutGoogleNative();
  }

  /**
   * Get Firestore user document by UID
   */
  async getUserProfile(uid: string): Promise<Record<string, any> | null> {
    try {
      const userDocRef = doc(firestore, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        return userDocSnap.data();
      }
      return null;
    } catch (error) {
      console.warn('Error fetching Firestore user profile:', error);
      return null;
    }
  }
}

export const authService = new FirebaseAuthService();
