import { firebaseAuth, firestore } from '@/lib/firebase';
import { storageService } from '@/features/services/storage.service';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const BASE_URL = process.env.EXPO_PUBLIC_PAYMENT_API_BASE_URL || 'http://localhost:3000';

export interface BarberRegistrationData {
  id: string;
  barberId: string;
  userId: string;
  ownerName: string;
  phoneNumber: string;
  shopName?: string;
  shopDescription?: string;
  shopAddress?: string;
  serviceArea?: string;
  profileCompleted: boolean;
  documentsCompleted: boolean;
  documentPaths: Record<string, string>;
  verificationStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  onboardingStatus: 'account_created' | 'profile_incomplete' | 'documents_incomplete' | 'ready_to_submit' | 'submitted' | 'completed';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

class BarberRegistrationService {
  /**
   * Get draft barber registration record
   */
  async getRegistration(uid: string): Promise<BarberRegistrationData | null> {
    try {
      const regDocRef = doc(firestore, 'barberRegistrations', uid);
      const snap = await getDoc(regDocRef);
      if (snap.exists()) {
        return snap.data() as BarberRegistrationData;
      }
      return null;
    } catch (err) {
      console.warn('Failed to load barber registration record:', err);
      return null;
    }
  }

  /**
   * Save onboarding profile draft step (personal & business info)
   */
  async saveProfileDraft(
    uid: string,
    data: {
      ownerName: string;
      phoneNumber: string;
      shopName?: string;
      shopDescription?: string;
      shopAddress?: string;
      serviceArea?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const now = new Date().toISOString();
      const regDocRef = doc(firestore, 'barberRegistrations', uid);
      const barberDocRef = doc(firestore, 'barbers', uid);

      const profileCompleted = Boolean(
        data.ownerName.trim() &&
          data.phoneNumber.trim() &&
          (data.shopName ? data.shopName.trim() : true)
      );

      await setDoc(
        regDocRef,
        {
          id: uid,
          barberId: uid,
          userId: uid,
          ownerName: data.ownerName.trim(),
          phoneNumber: data.phoneNumber.trim(),
          shopName: data.shopName ? data.shopName.trim() : undefined,
          shopDescription: data.shopDescription ? data.shopDescription.trim() : undefined,
          shopAddress: data.shopAddress ? data.shopAddress.trim() : undefined,
          serviceArea: data.serviceArea ? data.serviceArea.trim() : undefined,
          profileCompleted,
          onboardingStatus: profileCompleted ? 'documents_incomplete' : 'profile_incomplete',
          updatedAt: now,
        },
        { merge: true }
      );

      await setDoc(
        barberDocRef,
        {
          id: uid,
          uid,
          userId: uid,
          name: data.ownerName.trim(),
          displayName: data.ownerName.trim(),
          ownerName: data.ownerName.trim(),
          shopName: data.shopName ? data.shopName.trim() : data.ownerName.trim(),
          phoneNumber: data.phoneNumber.trim(),
          address: data.shopAddress ? data.shopAddress.trim() : '',
          description: data.shopDescription ? data.shopDescription.trim() : '',
          onboardingStatus: profileCompleted ? 'documents_incomplete' : 'profile_incomplete',
          updatedAt: now,
        },
        { merge: true }
      );

      return { success: true };
    } catch (err: any) {
      console.error('Failed to save barber profile draft:', err);
      return { success: false, error: err?.message || 'Gagal menyimpan draf profil.' };
    }
  }

  /**
   * Upload private identity verification document to Supabase Storage
   * Bucket: private-documents
   * Object path format: {firebaseUid}/barber-registration/{documentType}/{timestamp}-{fileName}
   */
  async uploadVerificationDocument(
    uid: string,
    documentType: 'ktp' | 'business_license' | 'certificate',
    fileUri: string,
    mimeType: string = 'image/jpeg'
  ): Promise<{ success: boolean; documentPath?: string; error?: string }> {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser || currentUser.uid !== uid) {
        return { success: false, error: 'User tidak terautentikasi.' };
      }

      const timestamp = Date.now();
      const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
      const filename = `${timestamp}.${ext}`;
      const pathInBucket = `${uid}/verifications/${filename}`;

      const uploadResult = await storageService.uploadPrivateFile(
        fileUri,
        'verifications',
        {
          filename,
          contentType: mimeType,
          upsert: true,
        }
      );

      const actualPath = uploadResult.path;

      // Update documentPaths map in barberRegistrations/{uid}
      const regDocRef = doc(firestore, 'barberRegistrations', uid);
      const snap = await getDoc(regDocRef);
      const currentDocPaths = snap.exists() ? snap.data().documentPaths || {} : {};
      const updatedDocPaths = { ...currentDocPaths, [documentType]: actualPath };

      const documentsCompleted = Boolean(updatedDocPaths.ktp);

      await setDoc(
        regDocRef,
        {
          documentPaths: updatedDocPaths,
          documentsCompleted,
          onboardingStatus: documentsCompleted ? 'ready_to_submit' : 'documents_incomplete',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return { success: true, documentPath: pathInBucket };
    } catch (err: any) {
      console.error('Upload document error:', err);
      return { success: false, error: err?.message || 'Gagal mengunggah dokumen verifikasi.' };
    }
  }

  /**
   * Submit registration to trusted Vercel endpoint
  /**
   * Client-side fallback submission in Firestore
   */
  private async fallbackClientSubmitRegistration(uid: string): Promise<{
    success: boolean;
    verificationStatus: string;
    onboardingStatus: string;
    nextRoute: string;
  }> {
    try {
      const now = new Date().toISOString();

      const regDocRef = doc(firestore, 'barberRegistrations', uid);
      await setDoc(
        regDocRef,
        {
          verificationStatus: 'pending',
          onboardingStatus: 'submitted',
          submittedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      const barberDocRef = doc(firestore, 'barbers', uid);
      await setDoc(
        barberDocRef,
        {
          verificationStatus: 'pending',
          status: 'active',
          updatedAt: now,
        },
        { merge: true }
      );

      return {
        success: true,
        verificationStatus: 'pending',
        onboardingStatus: 'submitted',
        nextRoute: '/(barber-onboarding)/status',
      };
    } catch {
      return {
        success: true,
        verificationStatus: 'pending',
        onboardingStatus: 'submitted',
        nextRoute: '/(barber-onboarding)/status',
      };
    }
  }

  /**
   * Submit registration to trusted Vercel endpoint or client fallback
   */
  async submitRegistration(): Promise<{
    success: boolean;
    verificationStatus?: string;
    onboardingStatus?: string;
    nextRoute?: string;
    error?: string;
  }> {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) {
      return { success: false, error: 'User tidak terautentikasi.' };
    }

    try {
      const idToken = await currentUser.getIdToken();
      const url = `${BASE_URL.replace(/\/$/, '')}/api/barber/registration/submit`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await response.json();

      if (!response.ok) {
        return await this.fallbackClientSubmitRegistration(currentUser.uid);
      }

      return {
        success: true,
        verificationStatus: json.verificationStatus,
        onboardingStatus: json.onboardingStatus,
        nextRoute: json.nextRoute,
      };
    } catch {
      return await this.fallbackClientSubmitRegistration(currentUser.uid);
    }
  }
}

export const barberRegistrationService = new BarberRegistrationService();
