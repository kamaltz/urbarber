/**
 * Native Google Sign-In integration (Batch 10B-5H-B).
 *
 * Scope is deliberately narrow: obtain a Google ID token from the device's
 * account chooser via @react-native-google-signin/google-signin, exchange it
 * for a Firebase credential, and translate the small set of outcomes callers
 * need to distinguish (new vs existing account, cancelled, Firebase
 * account-exists-with-different-credential, suspended). Firebase remains the
 * sole session/authority provider -- this module never introduces a second
 * auth system, and role bootstrap always goes through the existing trusted
 * accountBootstrapService (POST /api/auth/initialize-account), never a new
 * endpoint. signInWithPopup is intentionally not used anywhere here -- it is
 * not the correct native Android flow.
 */
import { firebaseAuth, firestore } from '@/lib/firebase';
import type { PublicRegistrationRole } from '@/types/domain';
import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  AuthError as FirebaseAuthError,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  type User as FirebaseUser,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { accountBootstrapService } from './account-bootstrap.service';

let configured = false;

/**
 * Resolves the public Web OAuth client ID GoogleSignin.configure() needs.
 * google-services.json is a native-build-time input, never read by JS at
 * runtime -- the only client-side signal for "is Google Auth configured" is
 * this env var, which babel-preset-expo inlines at bundle time same as every
 * other EXPO_PUBLIC_* var already used throughout this app.
 */
function getWebClientId(): string | undefined {
  const raw = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Idempotent -- safe to call before every sign-in attempt. */
export function configureGoogleSignIn(): void {
  if (configured) return;
  const webClientId = getWebClientId();
  if (!webClientId) return;
  GoogleSignin.configure({ webClientId, offlineAccess: false });
  configured = true;
}

/**
 * Login/Register screens hide the Google option entirely when this is false.
 * Represents ONLY whether this build has the client-side config to start a
 * Google Auth attempt -- never network status, sign-in state, Play Services
 * availability, or anything else that only affects execution, not visibility.
 */
export function isGoogleAuthConfigured(): boolean {
  return Boolean(getWebClientId());
}

export interface GoogleAuthError {
  code: string;
  message: string;
}

export interface GoogleAuthSuccess {
  success: true;
  isNewAccount: boolean;
  user: FirebaseUser;
}

export interface GoogleAuthFailure {
  success: false;
  error: GoogleAuthError;
}

export type GoogleAuthResult = GoogleAuthSuccess | GoogleAuthFailure;

/**
 * Runs the native Google account chooser and exchanges the resulting ID
 * token for a Firebase credential. Does not touch Firestore or account
 * bootstrap -- callers layer login vs registration semantics on top.
 */
async function authenticateWithGoogle(): Promise<
  { success: true; userCredential: UserCredential } | GoogleAuthFailure
> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (isCancelledResponse(response)) {
      return { success: false, error: { code: 'USER_CANCELLED', message: 'Pemilihan akun Google dibatalkan.' } };
    }
    if (!isSuccessResponse(response)) {
      return {
        success: false,
        error: { code: 'GOOGLE_SIGN_IN_FAILED', message: 'Gagal mendapatkan akun Google.' },
      };
    }

    const idToken = response.data.idToken;
    if (!idToken) {
      return {
        success: false,
        error: { code: 'GOOGLE_ID_TOKEN_MISSING', message: 'Gagal mendapatkan token identitas Google.' },
      };
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(firebaseAuth, credential);
    return { success: true, userCredential };
  } catch (err: any) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: { code: 'USER_CANCELLED', message: 'Pemilihan akun Google dibatalkan.' } };
      }
      if (err.code === statusCodes.IN_PROGRESS) {
        return {
          success: false,
          error: { code: 'GOOGLE_SIGN_IN_IN_PROGRESS', message: 'Proses masuk Google sedang berlangsung.' },
        };
      }
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          success: false,
          error: {
            code: 'PLAY_SERVICES_UNAVAILABLE',
            message: 'Google Play Services tidak tersedia di perangkat ini.',
          },
        };
      }
    }

    const firebaseError = err as FirebaseAuthError;
    if (firebaseError?.code === 'auth/account-exists-with-different-credential') {
      return {
        success: false,
        error: {
          code: 'ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL',
          message:
            'Email ini sudah terdaftar dengan metode masuk lain. Silakan masuk menggunakan metode sebelumnya.',
        },
      };
    }

    return {
      success: false,
      error: {
        code: firebaseError?.code || 'GOOGLE_LOGIN_FAILED',
        message: firebaseError?.message || 'Gagal masuk dengan Akun Google.',
      },
    };
  }
}

async function getFirestoreUserState(uid: string): Promise<{ exists: boolean; status?: string }> {
  const snap = await getDoc(doc(firestore, 'users', uid));
  if (!snap.exists()) return { exists: false };
  return { exists: true, status: snap.data().status };
}

/**
 * Login screen entry point. Must never silently bootstrap an account -- an
 * unregistered Google account is reported back as ACCOUNT_NOT_REGISTERED so
 * the screen can direct the user to registration, preserving role selection
 * and terms acceptance instead of skipping them.
 */
export async function loginExistingGoogleAccount(): Promise<GoogleAuthResult> {
  const auth = await authenticateWithGoogle();
  if (!auth.success) return auth;

  const { user } = auth.userCredential;
  const record = await getFirestoreUserState(user.uid);

  if (!record.exists) {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_NOT_REGISTERED',
        message: 'Akun Google ini belum terdaftar. Silakan daftar terlebih dahulu.',
      },
    };
  }

  if (record.status === 'suspended') {
    await signOut(firebaseAuth);
    return {
      success: false,
      error: { code: 'USER_SUSPENDED', message: 'Akun Anda telah ditangguhkan. Silakan hubungi admin.' },
    };
  }

  return { success: true, isNewAccount: false, user };
}

/**
 * Registration screen entry point. Caller must have already validated
 * acceptedTerms === true before invoking this. A pre-existing account keeps
 * its stored role -- requestedRole only applies to genuinely new accounts,
 * mirroring the backend's own self-heal clamp (batch 10B-5B).
 */
export async function registerGoogleAccount(requestedRole: PublicRegistrationRole): Promise<GoogleAuthResult> {
  const auth = await authenticateWithGoogle();
  if (!auth.success) return auth;

  const { user } = auth.userCredential;
  const record = await getFirestoreUserState(user.uid);

  if (record.status === 'suspended') {
    await signOut(firebaseAuth);
    return {
      success: false,
      error: { code: 'USER_SUSPENDED', message: 'Akun Anda telah ditangguhkan. Silakan hubungi admin.' },
    };
  }

  if (!record.exists) {
    const bootstrap = await accountBootstrapService.initializeAccount({
      requestedRole,
      name: user.displayName || user.email?.split('@')[0] || 'Pengguna Google',
    });

    if (!bootstrap.success) {
      return {
        success: false,
        error: bootstrap.error || { code: 'INIT_FAILED', message: 'Gagal inisialisasi akun backend.' },
      };
    }

    // Custom claims were just provisioned server-side -- never assume the
    // client's cached token already reflects them.
    await user.getIdToken(true);
    return { success: true, isNewAccount: true, user };
  }

  return { success: true, isNewAccount: false, user };
}
