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

class AccountBootstrapService {
  async initializeAccount(payload: InitializeAccountPayload): Promise<InitializeAccountResponse> {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        return {
          success: false,
          error: { code: 'UNAUTHENTICATED', message: 'Sesi pengguna tidak ditemukan. Silakan login kembali.' },
        };
      }

      const idToken = await currentUser.getIdToken();
      const url = `${BASE_URL.replace(/\/$/, '')}/api/auth/initialize-account`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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
          error: {
            code: json?.error?.code || 'INITIALIZATION_FAILED',
            message: json?.error?.message || 'Gagal melakukan inisialisasi akun backend.',
          },
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
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: { code: 'TIMEOUT', message: 'Koneksi ke backend inisialisasi batas waktu (timeout).' },
        };
      }
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err?.message || 'Gagal terhubung ke layanan backend inisialisasi.',
        },
      };
    }
  }
}

export const accountBootstrapService = new AccountBootstrapService();
