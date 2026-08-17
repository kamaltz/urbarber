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
 */
import { storageService } from '@/features/services/storage.service';
import { PUBLIC_MEDIA_BUCKET } from '@/features/services/storage.config';
import { firestore } from '@/lib/firebase';
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
  ): Promise<{ success: boolean; image?: BarberGalleryImage; error?: { message: string } }> {
    try {
      if (!barberId || !localUri) {
        return { success: false, error: { message: 'Parameter tidak lengkap.' } };
      }

      const existing = await this.getGallery(barberId);
      if (existing.length >= MAX_BARBER_GALLERY_IMAGES) {
        return {
          success: false,
          error: { message: `Galeri maksimal ${MAX_BARBER_GALLERY_IMAGES} foto. Hapus foto lain terlebih dahulu.` },
        };
      }

      const filename = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const uploadRes = await storageService.uploadPublicFile(localUri, 'barber', {
        filename: `gallery/${filename}`,
        contentType: options?.contentType || 'image/jpeg',
      });

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

      const docRef = await addDoc(collection(firestore, COLLECTION_NAME), docData);

      return {
        success: true,
        image: mapGalleryDoc(docRef.id, docData),
      };
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[GalleryRepository addImage Error]', error?.code, error?.message || error);
      }
      return { success: false, error: { message: error?.message || 'Gagal mengunggah foto galeri.' } };
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
  async deleteImage(barberId: string, imageId: string): Promise<{ success: boolean; error?: { message: string } }> {
    try {
      if (!barberId || !imageId) {
        return { success: false, error: { message: 'Parameter tidak lengkap.' } };
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

      await deleteDoc(docRef);

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
      return { success: false, error: { message: error?.message || 'Gagal menghapus foto galeri.' } };
    }
  },
};
