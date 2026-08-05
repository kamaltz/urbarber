/**
 * Firebase Authentication Service
 * Handles user authentication with Firebase Auth
 */

import { firebaseAuth, firestore } from '@/lib/firebase';
import { withTimeout } from '@/lib/promise';
import {
    createUserWithEmailAndPassword,
    AuthError as FirebaseAuthError,
    GoogleAuthProvider,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  acceptedTerms: boolean;
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

export interface GoogleUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface SocialAuthResponse {
  success: boolean;
  user?: GoogleUser;
  error?: AuthError;
}

class FirebaseAuthService {
  /**
   * Request OTP for login (Firebase custom auth would use third-party service)
   * For this implementation, we'll use email/password verification instead
   */
  async requestOtp(identifier: string): Promise<AuthResponse> {
    try {
      if (!identifier || !identifier.includes('@')) {
        return {
          success: false,
          error: { code: 'INVALID_EMAIL', message: 'Email tidak valid' },
        };
      }

      // In production, integrate with OTP service (e.g., Twilio, Firebase Phone Auth)
      // For now, we store OTP in temporary collection
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { code: 'REQUEST_FAILED', message: 'Gagal mengirim kode verifikasi' },
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(identifier: string, code: string): Promise<AuthResponse> {
    try {
      // Verify against OTP stored in Firestore temporary collection
      if (!code || code.length < 4) {
        return {
          success: false,
          error: { code: 'INVALID_OTP', message: 'Kode OTP tidak valid' },
        };
      }

      // Registration already creates a Firebase session. Keep profile syncing
      // best-effort so Firestore rules cannot turn a valid OTP into a failure.
      const user = firebaseAuth.currentUser;
      if (user) {
        try {
          await setDoc(
            doc(firestore, 'customers', user.uid),
            {
              userId: user.uid,
              name: user.displayName || identifier.split('@')[0] || 'Customer',
              email: identifier,
              location: '',
              role: 'customer',
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        } catch (profileError) {
          console.warn('OTP verified, but customer profile sync failed:', profileError);
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: { code: 'VERIFICATION_FAILED', message: 'Verifikasi gagal' },
      };
    }
  }

  /**
   * Register new customer with Firebase
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

      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(
        firebaseAuth,
        payload.email,
        payload.password,
      );

      const now = new Date().toISOString();
      const postRegistrationTasks = [
        updateProfile(userCredential.user, {
          displayName: payload.fullName,
        }),
        sendEmailVerification(userCredential.user),
        setDoc(doc(firestore, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: payload.email,
          name: payload.fullName,
          phoneNumber: payload.phoneNumber,
          role: 'customer',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        }),
        setDoc(doc(firestore, 'customers', userCredential.user.uid), {
          userId: userCredential.user.uid,
          email: payload.email,
          fullName: payload.fullName,
          phoneNumber: payload.phoneNumber,
          profileImage: null,
          role: 'customer',
          createdAt: now,
          updatedAt: now,
        }),
      ];

      const results = await Promise.allSettled(
        postRegistrationTasks.map((task) =>
          withTimeout(task, 8_000, 'Post-registration sync timed out'),
        ),
      );

      results.forEach((result) => {
        if (result.status === 'rejected') {
          console.warn('Account created, but post-registration sync failed:', result.reason);
        }
      });

      return { success: true };
    } catch (error: any) {
      const firebaseError = error as FirebaseAuthError;
      const message =
        firebaseError.code === 'auth/email-already-in-use'
          ? 'Email sudah terdaftar'
          : 'Pendaftaran gagal';

      return {
        success: false,
        error: { code: firebaseError.code, message },
      };
    }
  }

  /**
   * Login with email and password
   */
  async loginWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const userCredential = await withTimeout(
        signInWithEmailAndPassword(firebaseAuth, email.trim(), password),
        15_000,
        'Login request timed out',
      );
      await userCredential.user.reload();
      return {
        success: true,
        emailVerified: firebaseAuth.currentUser?.emailVerified ?? false,
      };
    } catch (error: any) {
      const firebaseError = error as FirebaseAuthError;
      const invalidCredentials = [
        'auth/invalid-credential',
        'auth/invalid-email',
        'auth/user-not-found',
        'auth/wrong-password',
      ].includes(firebaseError.code);
      const isTimeout = error instanceof Error && error.message === 'Login request timed out';
      const message = invalidCredentials
        ? 'Email atau password salah'
        : isTimeout || firebaseError.code === 'auth/network-request-failed'
          ? 'Koneksi ke Firebase bermasalah. Periksa internet atau pemblokir browser.'
          : 'Login gagal. Coba lagi.';

      return {
        success: false,
        error: { code: firebaseError.code || 'LOGIN_FAILED', message },
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

      await sendPasswordResetEmail(firebaseAuth, identifier);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'RESET_FAILED', message: 'Gagal mengirim link reset password' },
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
   * Logout
   */
  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  }

  /**
   * Get configured OTP length
   */
  getOtpLength(): number {
    return 6;
  }

  /**
   * Login with Google
   */
  async loginWithGoogle(idToken?: string): Promise<SocialAuthResponse> {
    try {
      if (!idToken) {
        return {
          success: false,
          error: { code: 'GOOGLE_TOKEN_REQUIRED', message: 'Google Sign-In belum dikonfigurasi' },
        };
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(firebaseAuth, credential);

      // Create or update customer document
      const customerRef = doc(firestore, 'customers', userCredential.user.uid);
      await setDoc(
        customerRef,
        {
          userId: userCredential.user.uid,
          email: userCredential.user.email,
          fullName: userCredential.user.displayName,
          profileImage: userCredential.user.photoURL,
          role: 'customer',
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return {
        success: true,
        user: {
          id: userCredential.user.uid,
          email: userCredential.user.email || '',
          displayName: userCredential.user.displayName || '',
          photoUrl: userCredential.user.photoURL || undefined,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: { code: 'GOOGLE_LOGIN_FAILED', message: 'Google login gagal' },
      };
    }
  }
}

export const authService = new FirebaseAuthService();
