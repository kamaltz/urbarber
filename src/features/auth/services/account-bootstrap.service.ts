import { firebaseAuth, firestore } from '@/lib/firebase';
import type { PublicRegistrationRole } from '@/types/domain';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

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
  /**
   * Client-side fallback initialization in Firestore
   * Ensures account setup completes cleanly even when backend server is unreachable
   */
  private async fallbackClientInitialize(
    uid: string,
    email: string | null,
    payload: InitializeAccountPayload
  ): Promise<InitializeAccountResponse> {
    try {
      const now = Timestamp.now();
      const role = payload.requestedRole || 'customer';
      const name = payload.name.trim();

      // 1. Ensure user document in Firestore users/{uid}
      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid,
          email: email || '',
          displayName: name,
          role,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
      }

      // 2. Create customer or barber document in Firestore
      if (role === 'customer') {
        const customerRef = doc(firestore, 'customers', uid);
        const customerSnap = await getDoc(customerRef);
        if (!customerSnap.exists()) {
          await setDoc(customerRef, {
            userId: uid,
            uid,
            name,
            email: email || '',
            phoneNumber: payload.phoneNumber || '',
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (role === 'barber') {
        const barberRef = doc(firestore, 'barbers', uid);
        const barberSnap = await getDoc(barberRef);
        if (!barberSnap.exists()) {
          await setDoc(barberRef, {
            userId: uid,
            uid,
            name,
            displayName: name,
            shopName: `${name} Barbershop`,
            email: email || '',
            phoneNumber: payload.phoneNumber || '',
            verificationStatus: 'draft',
            status: 'active',
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      return {
        success: true,
        uid,
        appRole: role,
        userStatus: 'active',
        onboardingStatus: role === 'barber' ? 'draft' : 'completed',
        nextRoute: role === 'barber' ? '/(barber-onboarding)/profile' : '/(customer)/home',
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        error: {
          code: 'INITIALIZATION_FAILED',
          message: fallbackErr?.message || 'Gagal menyimpan profil pengguna ke Firestore.',
        },
      };
    }
  }

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
        return await this.fallbackClientInitialize(currentUser.uid, currentUser.email, payload);
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
      return await this.fallbackClientInitialize(currentUser.uid, currentUser.email, payload);
    }
  }
}

export const accountBootstrapService = new AccountBootstrapService();
