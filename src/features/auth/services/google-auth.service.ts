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
  // Never let the native module run unconfigured -- that produces its own
  // cryptic native error (often indistinguishable from a real config
  // mismatch) instead of this clear, actionable one.
  if (!configured) {
    return {
      success: false,
      error: {
        code: 'GOOGLE_SIGN_IN_NOT_CONFIGURED',
        message: 'Masuk dengan Google belum tersedia di aplikasi ini. Silakan gunakan email dan kata sandi.',
      },
    };
  }

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

    if (__DEV__) {
      console.log('[GOOGLE_REGISTER]', { stage: 'CHOOSER_SUCCESS' });
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

    // Native Android SDK status code 10 (CommonStatusCodes.DEVELOPER_ERROR) --
    // always a build/console misconfiguration (SHA-1 fingerprint, package
    // name, or OAuth client mismatch between Google Cloud Console, Firebase,
    // and the signing certificate of this exact build), never something the
    // end user caused or can fix. The native module's raw rejection message
    // ("DEVELOPER_ERROR: Follow troubleshooting instructions at...") must
    // never reach the user directly -- log it for diagnosis, surface a
    // friendly message instead.
    const rawMessage = typeof err?.message === 'string' ? err.message : '';
    if (rawMessage.startsWith('DEVELOPER_ERROR') || String(err?.code) === '10') {
      if (__DEV__) {
        console.warn('[GoogleAuth] DEVELOPER_ERROR -- check SHA-1/package/OAuth client config.', rawMessage);
      }
      return {
        success: false,
        error: {
          code: 'GOOGLE_SIGN_IN_MISCONFIGURED',
          message: 'Masuk dengan Google sedang bermasalah. Silakan gunakan email dan kata sandi, atau coba lagi nanti.',
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

/** Safely disconnects native Google SDK session during explicit logout so account chooser re-runs on next login attempt. */
export async function signOutGoogleNative(): Promise<void> {
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch (_err) {
    // Ignore errors (e.g. user was signed in via email/password or GoogleSignin was not initialized)
  }
}

async function getFirestoreUserState(uid: string): Promise<{ exists: boolean; status?: string; role?: string }> {
  const snap = await getDoc(doc(firestore, 'users', uid));
  if (!snap.exists()) return { exists: false };
  const data = snap.data();
  return { exists: true, status: data.status, role: data.role || data.app_role };
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
 * Registration screen entry point. Caller must validate acceptedTerms === true.
 * If Firestore profile users/{uid} is missing (e.g. fresh registration or partial
 * registration retry), it calls the trusted account bootstrap endpoint idempotently.
 * A pre-existing account preserves its stored role -- requestedRole only applies to
 * new accounts, mirroring the backend's self-heal clamp.
 */
export async function registerGoogleAccount(
  requestedRole: PublicRegistrationRole,
  acceptedTerms: boolean = true
): Promise<GoogleAuthResult> {
  if (!acceptedTerms) {
    return {
      success: false,
      error: {
        code: 'TERMS_NOT_ACCEPTED',
        message: 'Anda harus menyetujui syarat dan ketentuan sebelum mendaftar.',
      },
    };
  }

  if (__DEV__) {
    console.log('[GOOGLE_REGISTER]', { stage: 'START', requestedRole });
  }

  const auth = await authenticateWithGoogle();
  if (!auth.success) {
    if (__DEV__) {
      console.log('[GOOGLE_REGISTER]', { stage: 'CHOOSER_FAILED', errorCode: auth.error.code });
    }
    return auth;
  }

  const { user } = auth.userCredential;
  if (__DEV__) {
    console.log('[GOOGLE_REGISTER]', {
      stage: 'FIREBASE_CREDENTIAL_SUCCESS',
      firebaseUidPresent: Boolean(user.uid),
      requestedRole,
    });
    console.log('[GOOGLE_REGISTER]', { stage: 'APP_PROFILE_LOOKUP', firebaseUidPresent: Boolean(user.uid) });
  }

  const record = await getFirestoreUserState(user.uid);

  if (__DEV__) {
    console.log('[GOOGLE_REGISTER]', {
      stage: record.exists ? 'APP_PROFILE_EXISTS' : 'APP_PROFILE_MISSING',
      firestoreProfileExists: record.exists,
    });
  }

  if (record.status === 'suspended') {
    await signOut(firebaseAuth);
    return {
      success: false,
      error: { code: 'USER_SUSPENDED', message: 'Akun Anda telah ditangguhkan. Silakan hubungi admin.' },
    };
  }

  // STATE B: Application profile missing (fresh registration or partial registration self-heal retry)
  if (!record.exists) {
    if (__DEV__) {
      console.log('[GOOGLE_REGISTER]', { stage: 'BOOTSTRAP_START', requestedRole });
    }

    const bootstrap = await accountBootstrapService.initializeAccount({
      requestedRole,
      name: user.displayName || user.email?.split('@')[0] || 'Pengguna Google',
    });

    if (!bootstrap.success) {
      if (__DEV__) {
        console.log('[GOOGLE_REGISTER]', {
          stage: 'BOOTSTRAP_FAILED',
          errorCode: bootstrap.error?.code,
          message: bootstrap.error?.message,
        });
      }
      return {
        success: false,
        error: bootstrap.error || { code: 'INIT_FAILED', message: 'Gagal inisialisasi akun backend.' },
      };
    }

    if (__DEV__) {
      console.log('[GOOGLE_REGISTER]', { stage: 'BOOTSTRAP_SUCCESS' });
      console.log('[GOOGLE_REGISTER]', { stage: 'CLAIMS_REFRESH_START' });
    }

    await user.getIdToken(true);

    if (__DEV__) {
      console.log('[GOOGLE_REGISTER]', { stage: 'CLAIMS_REFRESH_SUCCESS' });
      console.log('[GOOGLE_REGISTER]', { stage: 'ROUTE_START' });
      console.log('[GOOGLE_REGISTER]', { stage: 'COMPLETE', isNewAccount: true });
    }

    return { success: true, isNewAccount: true, user };
  }

  // STATE A / C: Application profile ALREADY exists -> Check existing role safety!
  const storedRole = record.role;
  if (storedRole && storedRole !== requestedRole) {
    const roleLabel = storedRole === 'customer' ? 'Pelanggan' : 'Barber';
    if (__DEV__) {
      console.log('[GOOGLE_REGISTER]', {
        stage: 'ROLE_MISMATCH',
        storedRole,
        requestedRole,
      });
    }
    return {
      success: false,
      error: {
        code: 'ROLE_MISMATCH',
        message: `Akun Google ini sudah terdaftar sebagai ${roleLabel}. Silakan masuk.`,
      },
    };
  }

  await user.getIdToken(true);
  if (__DEV__) {
    console.log('[GOOGLE_REGISTER]', { stage: 'COMPLETE', isNewAccount: false });
  }

  return { success: true, isNewAccount: false, user };
}
