import { firebaseAuth } from '@/lib/firebase';
import type { PublicRegistrationRole } from '@/types/domain';

const BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

export interface InitializeAccountPayload {
  requestedRole: PublicRegistrationRole;
  name: string;
  phoneNumber?: string;
}

export interface InitializeAccountResponse {
  success: boolean;
  uid?: string;
  appRole?: PublicRegistrationRole;
  userStatus?: string;
  onboardingStatus?: string;
  nextRoute?: string;
  error?: {
    code: string;
    message: string;
  };
}

const BACKEND_UNAVAILABLE_ERROR = {
  code: 'BACKEND_UNAVAILABLE',
  message: 'Tidak dapat terhubung ke server. Periksa koneksi Anda dan coba lagi.',
};

class AccountBootstrapService {
  async initializeAccount(payload: InitializeAccountPayload): Promise<InitializeAccountResponse> {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      return {
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Sesi pengguna tidak ditemukan. Silakan login kembali.' },
      };
    }

    try {
      const idToken = await currentUser.getIdToken();
      const url = `${BASE_URL.replace(/\/$/, '')}/api/auth/initialize-account`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: json?.error?.code && json?.error?.message ? json.error : BACKEND_UNAVAILABLE_ERROR,
        };
      }

      return {
        success: true,
        uid: json.uid,
        appRole: json.appRole,
        userStatus: json.userStatus,
        onboardingStatus: json.onboardingStatus,
        nextRoute: json.nextRoute,
      };
    } catch (err: any) {
      // Network error, timeout/abort, or a non-JSON platform response.
      // The backend is the only trusted writer of users/{uid} (Firestore rules deny
      // client create), so there is no safe client-side fallback here -- surface a
      // controlled, retryable error instead of a raw network/Firestore message.
      return {
        success: false,
        error: BACKEND_UNAVAILABLE_ERROR,
      };
    }
  }
}

export const accountBootstrapService = new AccountBootstrapService();
