/**
 * Unit tests for galleryRepository.addImage -- covers the max-8 image cap
 * and the orphaned-storage cleanup added while auditing the reported
 * gallery upload permission failure (item L): addImage previously uploaded
 * to Supabase THEN wrote the Firestore doc with no rollback, so a Firestore
 * write failure after a successful upload left an orphaned object in
 * storage the Barber could never see or delete through the app.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addDocMock, deleteFileMock, uploadPublicFileMock, MockTimestamp } = vi.hoisted(() => {
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
    MockTimestamp,
  };
});

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  where: vi.fn(),
  Timestamp: MockTimestamp,
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));

vi.mock('@/features/services/storage.service', () => ({
  storageService: {
    uploadPublicFile: (...args: unknown[]) => uploadPublicFileMock(...args),
    deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  },
}));

import { getDocs } from 'firebase/firestore';
import { galleryRepository } from '../gallery.repository';

const getDocsMock = vi.mocked(getDocs);

describe('galleryRepository.addImage', () => {
  beforeEach(() => {
    addDocMock.mockReset();
    deleteFileMock.mockReset();
    uploadPublicFileMock.mockReset();
    getDocsMock.mockReset();
    getDocsMock.mockResolvedValue({ docs: [] } as any);
    uploadPublicFileMock.mockResolvedValue({ path: 'barber-1/barber/gallery/photo.jpg', publicUrl: 'https://example.com/photo.jpg' });
    deleteFileMock.mockResolvedValue(undefined);
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

  it('still reports success even if the orphan-cleanup delete itself fails -- the original Firestore error is what the caller sees', async () => {
    addDocMock.mockRejectedValue(new Error('PERMISSION_DENIED'));
    deleteFileMock.mockRejectedValue(new Error('cleanup also failed'));

    const result = await galleryRepository.addImage('barber-1', 'file:///local/photo.jpg');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('PERMISSION_DENIED');
  });
});
