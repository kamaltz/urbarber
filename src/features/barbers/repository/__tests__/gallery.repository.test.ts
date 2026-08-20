/**
 * Unit tests for galleryRepository.addImage -- covers the max-8 image cap
 * and the orphaned-storage cleanup added while auditing the reported
 * gallery upload permission failure (item L): addImage previously uploaded
 * to Supabase THEN wrote the Firestore doc with no rollback, so a Firestore
 * write failure after a successful upload left an orphaned object in
 * storage the Barber could never see or delete through the app.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addDocMock, deleteFileMock, uploadPublicFileMock, deleteDocMock, getDocMock, MockTimestamp } = vi.hoisted(() => {
  class MockTimestamp {
    toDate() {
      return new Date('2026-01-01T00:00:00.000Z');
    }
    static now() {
      return new MockTimestamp();
    }
  }
  return {
    addDocMock: vi.fn(),
    deleteFileMock: vi.fn(),
    uploadPublicFileMock: vi.fn(),
    deleteDocMock: vi.fn(),
    getDocMock: vi.fn(),
    MockTimestamp,
  };
});

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: vi.fn((_db: unknown, coll: string, id: string) => ({ coll, id })),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  where: vi.fn(),
  Timestamp: MockTimestamp,
}));

const { getIdTokenResultMock, firebaseAuthMock } = vi.hoisted(() => ({
  getIdTokenResultMock: vi.fn(),
  // Plain mutable object (not a getter) so individual tests can reassign
  // currentUser directly (e.g. to null, to simulate no signed-in user)
  // without fragile property-descriptor gymnastics.
  firebaseAuthMock: { currentUser: null as { uid: string; getIdTokenResult: typeof vi.fn } | null },
}));

// Claims already correct by default (role: authenticated, app_role: barber)
// so ensureBarberClaims() short-circuits to {ok:true} without ever calling
// selfHealClaimsIfNeeded -- existing tests below exercise the
// upload/Firestore-write path, not the claims-repair path itself (that gets
// its own dedicated describe block further down).
vi.mock('@/lib/firebase', () => ({
  firestore: {},
  firebaseAuth: firebaseAuthMock,
}));

vi.mock('@/features/services/storage.service', () => ({
  storageService: {
    uploadPublicFile: (...args: unknown[]) => uploadPublicFileMock(...args),
    deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  },
}));

const { selfHealClaimsIfNeededMock } = vi.hoisted(() => ({
  selfHealClaimsIfNeededMock: vi.fn(),
}));

vi.mock('@/features/auth/services/claims-self-heal.service', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/services/claims-self-heal.service')>(
    '@/features/auth/services/claims-self-heal.service'
  );
  return {
    // claimsNeedRepair is pure (no I/O) -- use the real implementation so
    // these tests exercise the actual comparison logic, not a re-stated copy.
    claimsNeedRepair: actual.claimsNeedRepair,
    selfHealClaimsIfNeeded: (...args: unknown[]) => selfHealClaimsIfNeededMock(...args),
  };
});

import { getDocs } from 'firebase/firestore';
import { galleryRepository } from '../gallery.repository';

const getDocsMock = vi.mocked(getDocs);

describe('galleryRepository.addImage', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    deleteFileMock.mockReset();
    uploadPublicFileMock.mockReset();
    getDocsMock.mockReset();
    getIdTokenResultMock.mockReset();
    selfHealClaimsIfNeededMock.mockReset();
    getDocsMock.mockResolvedValue({ docs: [] } as any);
    uploadPublicFileMock.mockResolvedValue({ path: 'barber-1/barber/gallery/photo.jpg', publicUrl: 'https://example.com/photo.jpg' });
    deleteFileMock.mockResolvedValue(undefined);
    getIdTokenResultMock.mockResolvedValue({ claims: { role: 'authenticated', app_role: 'barber' } });
    firebaseAuthMock.currentUser = { uid: 'barber-1', getIdTokenResult: getIdTokenResultMock as any };
  });

  it('refuses to upload once the gallery already has the maximum 8 images, without touching storage', async () => {
    getDocsMock.mockResolvedValueOnce({
      docs: Array.from({ length: 8 }, (_, i) => ({
        id: `gal-${i}`,
        data: () => ({ barberId: 'barber-1', storagePath: `p${i}`, publicUrl: `u${i}`, sortOrder: i }),
      })),
    } as any);

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('maksimal 8 foto');
    expect(uploadPublicFileMock).not.toHaveBeenCalled();
  });

  it('uploads to storage and records a Firestore doc on success', async () => {
    addDocMock.mockResolvedValue({ id: 'gal-1' });

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(true);
    expect(result.image?.storagePath).toBe('barber-1/barber/gallery/photo.jpg');
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it('cleans up the just-uploaded storage object when the Firestore write fails, rather than leaving it orphaned', async () => {
    addDocMock.mockRejectedValue(new Error('PERMISSION_DENIED'));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(uploadPublicFileMock).toHaveBeenCalledTimes(1);
    expect(deleteFileMock).toHaveBeenCalledWith(expect.any(String), 'barber-1/barber/gallery/photo.jpg');
  });

  it('does not attempt storage cleanup when the upload itself fails (nothing to clean up)', async () => {
    uploadPublicFileMock.mockRejectedValue(new Error('Upload failed'));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(addDocMock).not.toHaveBeenCalled();
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it('still reports failure (not success) even if the orphan-cleanup delete itself also fails -- a friendly message is shown, not the raw Firestore error', async () => {
    addDocMock.mockRejectedValue(new Error('PERMISSION_DENIED'));
    deleteFileMock.mockRejectedValue(new Error('cleanup also failed'));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Gagal mengunggah foto galeri. Silakan coba lagi.');
  });

  it('tags a Firestore permission-denied write failure with the GALLERY_METADATA_PERMISSION_DENIED stage', async () => {
    addDocMock.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'permission-denied' }));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_METADATA_PERMISSION_DENIED');
  });

  it('tags a non-permission Firestore write failure with the GALLERY_METADATA_WRITE_FAILED stage', async () => {
    addDocMock.mockRejectedValue(new Error('unavailable'));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_METADATA_WRITE_FAILED');
  });

  it('tags a Supabase upload failure with the GALLERY_STORAGE_UPLOAD_FAILED stage', async () => {
    uploadPublicFileMock.mockRejectedValue(new Error('Upload failed'));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_STORAGE_UPLOAD_FAILED');
  });
});

describe('galleryRepository -- claims verification (ensureBarberClaims)', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    deleteFileMock.mockReset();
    uploadPublicFileMock.mockReset();
    getDocsMock.mockReset();
    getIdTokenResultMock.mockReset();
    selfHealClaimsIfNeededMock.mockReset();
    getDocsMock.mockResolvedValue({ docs: [] } as any);
    uploadPublicFileMock.mockResolvedValue({ path: 'barber-1/barber/gallery/photo.jpg', publicUrl: 'https://example.com/photo.jpg' });
    addDocMock.mockResolvedValue({ id: 'gal-1' });
    firebaseAuthMock.currentUser = { uid: 'barber-1', getIdTokenResult: getIdTokenResultMock as any };
  });

  it('uploads normally when claims are already correct, without attempting any self-heal call', async () => {
    getIdTokenResultMock.mockResolvedValue({ claims: { role: 'authenticated', app_role: 'barber' } });

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(true);
    expect(selfHealClaimsIfNeededMock).not.toHaveBeenCalled();
  });

  it('transparently repairs a stale/missing app_role claim before writing, when self-heal succeeds', async () => {
    getIdTokenResultMock.mockResolvedValue({ claims: { role: 'authenticated', app_role: 'customer' } });
    selfHealClaimsIfNeededMock.mockResolvedValue({ attempted: true, claimsOk: true, role: 'barber' });

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(selfHealClaimsIfNeededMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(addDocMock).toHaveBeenCalled();
  });

  it('fails with a clear, actionable message (not a raw Firestore error) when self-heal cannot repair the claim, and never attempts the write', async () => {
    getIdTokenResultMock.mockResolvedValue({ claims: {} });
    selfHealClaimsIfNeededMock.mockResolvedValue({ attempted: true, claimsOk: false, role: 'barber' });

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_CLAIMS_REPAIR_FAILED');
    expect(result.error?.message).toMatch(/logout/i);
    expect(uploadPublicFileMock).not.toHaveBeenCalled();
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('fails fast with a clear message when there is no current Firebase user at all', async () => {
    firebaseAuthMock.currentUser = null;

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_AUTH_MISSING');
    expect(uploadPublicFileMock).not.toHaveBeenCalled();
    expect(getIdTokenResultMock).not.toHaveBeenCalled();
  });
});

describe('galleryRepository.deleteImage', () => {
  beforeEach(() => {
    deleteDocMock.mockReset();
    getDocMock.mockReset();
    deleteFileMock.mockReset();
    getIdTokenResultMock.mockReset();
    selfHealClaimsIfNeededMock.mockReset();
    getIdTokenResultMock.mockResolvedValue({ claims: { role: 'authenticated', app_role: 'barber' } });
    firebaseAuthMock.currentUser = { uid: 'barber-1', getIdTokenResult: getIdTokenResultMock as any };
    deleteFileMock.mockResolvedValue(undefined);
  });

  it('deletes the Firestore doc and the underlying storage object for the owning barber', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ barberId: 'barber-1', storagePath: 'barber-1/barber/gallery/photo.jpg' }),
    });
    deleteDocMock.mockResolvedValue(undefined);

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(result.success).toBe(true);
    expect(deleteDocMock).toHaveBeenCalled();
    expect(deleteFileMock).toHaveBeenCalledWith(expect.any(String), 'barber-1/barber/gallery/photo.jpg');
  });

  it('is idempotent when the document is already gone -- reports success without calling deleteDoc', async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined });

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(result.success).toBe(true);
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it('refuses to delete an entry owned by a different barberId, without calling deleteDoc', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ barberId: 'some-other-barber', storagePath: 'x' }),
    });

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(result.success).toBe(false);
    expect(deleteDocMock).not.toHaveBeenCalled();
  });

  it('still reports success even when the Supabase storage cleanup fails after a successful Firestore delete', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ barberId: 'barber-1', storagePath: 'barber-1/barber/gallery/photo.jpg' }),
    });
    deleteDocMock.mockResolvedValue(undefined);
    deleteFileMock.mockRejectedValue(new Error('storage cleanup failed'));

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(result.success).toBe(true);
  });

  it('tags a Firestore permission-denied delete failure with the GALLERY_METADATA_PERMISSION_DENIED stage', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ barberId: 'barber-1', storagePath: 'barber-1/barber/gallery/photo.jpg' }),
    });
    deleteDocMock.mockRejectedValue(Object.assign(new Error('permission denied'), { code: 'permission-denied' }));

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_METADATA_PERMISSION_DENIED');
    expect(deleteFileMock).not.toHaveBeenCalled();
  });

  it('repairs a stale claim before deleting when self-heal succeeds', async () => {
    getIdTokenResultMock.mockResolvedValue({ claims: { role: 'authenticated', app_role: 'customer' } });
    selfHealClaimsIfNeededMock.mockResolvedValue({ attempted: true, claimsOk: true, role: 'barber' });
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ barberId: 'barber-1', storagePath: 'barber-1/barber/gallery/photo.jpg' }),
    });
    deleteDocMock.mockResolvedValue(undefined);

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(selfHealClaimsIfNeededMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('fails fast with GALLERY_AUTH_MISSING when there is no current Firebase user, never touching Firestore', async () => {
    firebaseAuthMock.currentUser = null;

    const result = await galleryRepository.deleteImage('barber-1', 'gal-1');

    expect(result.success).toBe(false);
    expect(result.error?.stage).toBe('GALLERY_AUTH_MISSING');
    expect(getDocMock).not.toHaveBeenCalled();
    expect(deleteDocMock).not.toHaveBeenCalled();
  });
});
