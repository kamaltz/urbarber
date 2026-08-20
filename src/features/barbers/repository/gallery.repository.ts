/**
 * Barber Gallery Repository
 *
 * Data access for the barberGallery collection -- a top-level collection with
 * a `barberId` field (mirroring the existing barberServices convention in
 * this codebase, rather than a barbers/{id}/gallery/{imageId} subcollection),
 * since firestore.rules already establishes exactly this pattern for
 * barber-owned, publicly-readable data. Shared by both the barber's own
 * gallery management screen and the customer-facing Barber Detail screen --
 * the read query is identical for both, gated by ownership only on writes.
 *
 * Root-cause trace for the reported live "Missing or insufficient
 * permissions" failure (a Firestore-SDK-specific message, not Supabase --
 * Supabase Storage errors go through handleStorageError in storage.service.ts
 * and never produce this exact string):
 *
 *   1. firestore.rules' barberGallery create/delete both check
 *      request.auth.token.app_role == 'barber' (via isBarber()) -- the
 *      Firebase custom claim on the ID token.
 *   2. The rest of the app (AuthProvider/auth-context.tsx, (barber)/_layout.tsx's
 *      navigation gating) treats a signed-in user as "a barber" based on the
 *      Firestore users/{uid}.role field, NOT the token claim.
 *   3. claims-self-heal.service.ts repairs a stale/missing claim once per
 *      auth-state-change, but if that repair attempt itself fails (e.g. a
 *      transient network error hitting POST /api/auth/initialize-account),
 *      the result is recorded as bootstrapError:'ACCOUNT_CLAIMS_REPAIR_FAILED'
 *      -- which nothing in the navigation layer currently checks or acts on.
 *   4. A barber in that state sails through every Firestore-role-gated
 *      screen (their role reads fine from Firestore) right up until a
 *      Firestore-RULES-role-gated WRITE -- barberGallery create/delete is
 *      exactly that -- which then fails with permission-denied and gives no
 *      indication why, since every other barber write path in this app goes
 *      through the backend (Admin SDK, bypasses rules entirely) rather than
 *      a direct client Firestore write gated by isBarber().
 *
 * ensureBarberClaims() below closes this gap: before either Firestore
 * mutation, it re-checks the current (cached, no network round-trip in the
 * common case) token claims and, only if they're actually wrong, runs one
 * on-demand repair + verified refresh -- reusing the exact same, already
 * -tested claims-self-heal.service.ts logic AuthProvider uses, rather than
 * duplicating it. barberId/Firebase-UID identity was independently confirmed
 * to match: barbers/{uid} documents are created with uid as the doc id
 * (backend/vercel/api/app.ts), so `barberId` here and `request.auth.uid` are
 * the same value in every normal call site.
 */
import { claimsNeedRepair, selfHealClaimsIfNeeded } from '@/features/auth/services/claims-self-heal.service';
import { storageService } from '@/features/services/storage.service';
import { PUBLIC_MEDIA_BUCKET } from '@/features/services/storage.config';
import { firebaseAuth, firestore } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { MAX_BARBER_GALLERY_IMAGES, type BarberGalleryImage } from '../types/barber';

const COLLECTION_NAME = 'barberGallery';

/** Distinct internal stage identifiers (never shown to users) so dev logs
 * and error paths can tell exactly which layer failed without guessing from
 * a generic message. Kept out of the user-facing error, which always stays
 * a short, readable Indonesian sentence. */
type GalleryFailureStage =
  | 'GALLERY_AUTH_MISSING'
  | 'GALLERY_CLAIMS_REPAIR_FAILED'
  | 'GALLERY_STORAGE_UPLOAD_FAILED'
  | 'GALLERY_METADATA_PERMISSION_DENIED'
  | 'GALLERY_METADATA_WRITE_FAILED';

/**
 * Structured, non-secret diagnostic logging for each stage of the gallery
 * upload/delete pipeline. Never logs the ID token, Supabase key, or any
 * other credential -- only ids, booleans, and error codes.
 */
function logStage(stage: string, detail: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.log(`[GALLERY][${stage}]`, JSON.stringify(detail));
}

/**
 * Defense-in-depth against the exact permission-denied failure mode traced
 * in this file's header comment. Cheap in the common case: getIdTokenResult
 * (false) reads the already-cached token with no network round-trip, so
 * this only escalates to an actual self-heal call (and the accompanying
 * network round-trip) when the claims genuinely need repair -- never on
 * every render, only once per mutation attempt.
 */
async function ensureBarberClaims(): Promise<{ ok: true } | { ok: false; stage: GalleryFailureStage; message: string }> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return { ok: false, stage: 'GALLERY_AUTH_MISSING', message: 'Sesi Anda telah berakhir. Silakan login kembali.' };
  }

  const tokenResult = await user.getIdTokenResult(false);
  logStage('AUTH', {
    uid: user.uid,
    hasRoleClaim: 'role' in tokenResult.claims,
    hasAppRoleClaim: 'app_role' in tokenResult.claims,
    appRole: tokenResult.claims.app_role ?? null,
  });

  if (!claimsNeedRepair(tokenResult.claims, 'barber')) {
    return { ok: true };
  }

  logStage('AUTH', { uid: user.uid, claimsNeedRepair: true, attemptingSelfHeal: true });
  const heal = await selfHealClaimsIfNeeded(user, tokenResult.claims, 'barber');
  logStage('AUTH', { uid: user.uid, selfHealAttempted: heal?.attempted ?? false, selfHealOk: heal?.claimsOk ?? false });

  if (heal?.claimsOk) {
    return { ok: true };
  }

  return {
    ok: false,
    stage: 'GALLERY_CLAIMS_REPAIR_FAILED',
    message: 'Sesi akun Anda perlu diperbarui. Silakan logout lalu login kembali sebelum mencoba lagi.',
  };
}

/**
 * "Missing or insufficient permissions" is Firestore-SDK-specific text
 * (error.code === 'permission-denied') distinct from every other failure
 * mode in this file (native ImagePicker permission, Supabase upload/RLS
 * rejection, network errors). When it's hit, log exactly which values the
 * rule actually compared -- barberId argument vs. the live auth uid, plus
 * whether a fresh ID token was in hand -- so a future reproduction can
 * pinpoint the layer immediately instead of re-auditing rules/client code
 * from scratch.
 */
function logIfPermissionDenied(context: string, barberId: string, error: any): void {
  if (!__DEV__ || error?.code !== 'permission-denied') return;
  console.warn(
    `[GalleryRepository] Firestore permission-denied in ${context}`,
    JSON.stringify({
      barberId,
      authUid: firebaseAuth.currentUser?.uid,
      uidMatchesBarberId: firebaseAuth.currentUser?.uid === barberId,
      hasCurrentUser: !!firebaseAuth.currentUser,
    })
  );
}

function toIso(value: any): string {
  if (!value) return '';
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return '';
}

function mapGalleryDoc(id: string, data: Record<string, any>): BarberGalleryImage {
  return {
    imageId: id,
    barberId: data.barberId,
    storagePath: data.storagePath,
    publicUrl: data.publicUrl,
    caption: data.caption || undefined,
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

export const galleryRepository = {
  /**
   * Public read -- used by both the barber's own management screen and the
   * customer-facing Barber Detail screen. Sorted client-side (sortOrder is
   * currently assigned at upload time, ascending) to avoid a composite index.
   */
  async getGallery(barberId: string): Promise<BarberGalleryImage[]> {
    try {
      if (!barberId) return [];
      const q = query(collection(firestore, COLLECTION_NAME), where('barberId', '==', barberId));
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((docSnap) => mapGalleryDoc(docSnap.id, docSnap.data()))
        .sort((a, b) => a.sortOrder - b.sortOrder);
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[GalleryRepository getGallery Error]', error?.code, error?.message || error);
      }
      logIfPermissionDenied('getGallery', barberId, error);
      return [];
    }
  },

  /**
   * Uploads to the same public-media bucket/uid-prefixed path convention as
   * the barber's profile photo (storageService.uploadPublicFile validates
   * MIME type and 5MB size limit), then records a barberGallery doc. Enforces
   * the max-image cap here since Firestore rules cannot cheaply count
   * per-barberId documents without an extra counter doc -- acceptable for
   * this thesis/demo scope, matching the spec's "sensible limit" framing
   * rather than a hard race-proof server-side constraint.
   */
  async addImage(
    barberId: string,
    localUri: string,
    options?: { caption?: string; contentType?: string }
  ): Promise<{ success: boolean; image?: BarberGalleryImage; error?: { message: string; stage?: string } }> {
    try {
      if (!barberId || !localUri) {
        return { success: false, error: { message: 'Parameter tidak lengkap.' } };
      }

      const claimsCheck = await ensureBarberClaims();
      if (!claimsCheck.ok) {
        logStage(claimsCheck.stage, { barberId });
        return { success: false, error: { message: claimsCheck.message, stage: claimsCheck.stage } };
      }

      const existing = await this.getGallery(barberId);
      if (existing.length >= MAX_BARBER_GALLERY_IMAGES) {
        return {
          success: false,
          error: { message: `Galeri maksimal ${MAX_BARBER_GALLERY_IMAGES} foto. Hapus foto lain terlebih dahulu.` },
        };
      }

      const filename = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      let uploadRes: Awaited<ReturnType<typeof storageService.uploadPublicFile>>;
      try {
        uploadRes = await storageService.uploadPublicFile(localUri, 'barber', {
          filename: `gallery/${filename}`,
          contentType: options?.contentType || 'image/jpeg',
        });
        logStage('SUPABASE_UPLOAD', { bucket: PUBLIC_MEDIA_BUCKET, objectPath: uploadRes.path, success: true });
      } catch (uploadError: any) {
        logStage('SUPABASE_UPLOAD', {
          bucket: PUBLIC_MEDIA_BUCKET,
          success: false,
          errorCode: uploadError?.code ?? uploadError?.statusCode ?? null,
        });
        return {
          success: false,
          error: {
            message: uploadError?.message || 'Gagal mengunggah foto ke penyimpanan.',
            stage: 'GALLERY_STORAGE_UPLOAD_FAILED' satisfies GalleryFailureStage,
          },
        };
      }

      const now = Timestamp.now();
      const docData = {
        barberId,
        storagePath: uploadRes.path,
        publicUrl: uploadRes.publicUrl,
        caption: options?.caption?.trim() || '',
        sortOrder: existing.length,
        createdAt: now,
        updatedAt: now,
      };

      try {
        const docRef = await addDoc(collection(firestore, COLLECTION_NAME), docData);
        logStage('FIRESTORE_WRITE', {
          collection: COLLECTION_NAME,
          documentId: docRef.id,
          uid: firebaseAuth.currentUser?.uid,
          barberId,
          success: true,
        });
        return {
          success: true,
          image: mapGalleryDoc(docRef.id, docData),
        };
      } catch (firestoreError: any) {
        logStage('FIRESTORE_WRITE', {
          collection: COLLECTION_NAME,
          uid: firebaseAuth.currentUser?.uid,
          barberId,
          success: false,
          errorCode: firestoreError?.code ?? null,
        });

        // The object already exists in Supabase but has no Firestore record --
        // clean it up rather than leaving an orphaned, unmanageable file the
        // barber can never see or delete through the app.
        try {
          await storageService.deleteFile(PUBLIC_MEDIA_BUCKET, uploadRes.path);
        } catch (cleanupError: any) {
          if (__DEV__) {
            console.warn('[GalleryRepository addImage] orphaned storage cleanup failed', cleanupError?.message);
          }
        }
        throw firestoreError;
      }
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[GalleryRepository addImage Error]', error?.code, error?.message || error);
      }
      logIfPermissionDenied('addImage', barberId, error);
      const stage: GalleryFailureStage =
        error?.code === 'permission-denied' ? 'GALLERY_METADATA_PERMISSION_DENIED' : 'GALLERY_METADATA_WRITE_FAILED';
      return {
        success: false,
        error: { message: 'Gagal mengunggah foto galeri. Silakan coba lagi.', stage },
      };
    }
  },

  /**
   * Ownership is verified client-side (defense in depth; firestore.rules is
   * the authoritative check) before deleting the Firestore doc, then the
   * underlying storage object is removed. If storage cleanup fails, the
   * Firestore doc is still gone -- surfaced as a warning, not a hard failure,
   * since leaving an orphaned storage object is preferable to a gallery entry
   * the barber can no longer manage.
   */
  async deleteImage(barberId: string, imageId: string): Promise<{ success: boolean; error?: { message: string; stage?: string } }> {
    try {
      if (!barberId || !imageId) {
        return { success: false, error: { message: 'Parameter tidak lengkap.' } };
      }

      const claimsCheck = await ensureBarberClaims();
      if (!claimsCheck.ok) {
        logStage(claimsCheck.stage, { barberId, imageId });
        return { success: false, error: { message: claimsCheck.message, stage: claimsCheck.stage } };
      }

      const docRef = doc(firestore, COLLECTION_NAME, imageId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        return { success: true }; // Already gone -- idempotent.
      }
      const data = snap.data();
      if (data.barberId !== barberId) {
        return { success: false, error: { message: 'Anda tidak memiliki akses untuk menghapus foto ini.' } };
      }

      try {
        await deleteDoc(docRef);
        logStage('FIRESTORE_WRITE', {
          collection: COLLECTION_NAME,
          documentId: imageId,
          uid: firebaseAuth.currentUser?.uid,
          barberId,
          op: 'delete',
          success: true,
        });
      } catch (firestoreError: any) {
        logStage('FIRESTORE_WRITE', {
          collection: COLLECTION_NAME,
          documentId: imageId,
          uid: firebaseAuth.currentUser?.uid,
          barberId,
          op: 'delete',
          success: false,
          errorCode: firestoreError?.code ?? null,
        });
        throw firestoreError;
      }

      try {
        await storageService.deleteFile(PUBLIC_MEDIA_BUCKET, data.storagePath);
      } catch (storageError: any) {
        if (__DEV__) {
          console.warn('[GalleryRepository deleteImage] storage cleanup failed', storageError?.message);
        }
      }

      return { success: true };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[GalleryRepository deleteImage Error]', error?.code, error?.message || error);
      }
      logIfPermissionDenied('deleteImage', barberId, error);
      const stage: GalleryFailureStage =
        error?.code === 'permission-denied' ? 'GALLERY_METADATA_PERMISSION_DENIED' : 'GALLERY_METADATA_WRITE_FAILED';
      return {
        success: false,
        error: { message: 'Gagal menghapus foto galeri. Silakan coba lagi.', stage },
      };
    }
  },
};
