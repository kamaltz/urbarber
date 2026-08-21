/**
 * Unit Tests for storage.service.pickImage
 *
 * Regression guard for the live Android crash:
 *   "Attempting to launch an unregistered ActivityResultLauncher"
 * caused by a second launchImageLibraryAsync firing before the first
 * resolved. pickImage() is the single picker helper shared by Customer
 * Profile and Account -- these tests lock in its in-flight guard, its
 * canceled/missing-asset handling, and that it no longer requests the
 * deprecated ImagePicker.MediaTypeOptions enum.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMediaLibraryPermissionsAsyncMock, launchImageLibraryAsyncMock } = vi.hoisted(() => ({
  requestMediaLibraryPermissionsAsyncMock: vi.fn(),
  launchImageLibraryAsyncMock: vi.fn(),
}));

vi.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: requestMediaLibraryPermissionsAsyncMock,
  launchImageLibraryAsync: launchImageLibraryAsyncMock,
}));

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: { currentUser: { uid: 'cust-1', getIdToken: vi.fn().mockResolvedValue('token') } },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { storage: { from: vi.fn() } },
}));

import { pickImage } from '../storage.service';

function asset(overrides: Record<string, unknown> = {}) {
  return { uri: 'file:///picked.jpg', mimeType: 'image/jpeg', ...overrides };
}

describe('pickImage', () => {
  beforeEach(() => {
    requestMediaLibraryPermissionsAsyncMock.mockReset();
    launchImageLibraryAsyncMock.mockReset();
    requestMediaLibraryPermissionsAsyncMock.mockResolvedValue({ granted: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. a successful pick returns the single selected asset', async () => {
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: false, assets: [asset()] });

    const result = await pickImage();

    expect(result).toEqual(asset());
  });

  it('2. requests the current mediaTypes array API, not the deprecated MediaTypeOptions enum', async () => {
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: false, assets: [asset()] });

    await pickImage();

    expect(launchImageLibraryAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({ mediaTypes: ['images'] })
    );
  });

  it('3. a canceled picker resolves to null, not an error', async () => {
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: true, assets: null });

    const result = await pickImage();

    expect(result).toBeNull();
  });

  it('4. a non-canceled result with no asset (missing/invalid selection) is treated as no-op, not a crash', async () => {
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: false, assets: [] });

    const result = await pickImage();

    expect(result).toBeNull();
  });

  it('5. denied gallery permission throws instead of launching the picker', async () => {
    requestMediaLibraryPermissionsAsyncMock.mockResolvedValue({ granted: false });

    await expect(pickImage()).rejects.toThrow('Izin galeri diperlukan');
    expect(launchImageLibraryAsyncMock).not.toHaveBeenCalled();
  });

  it('6. a second concurrent call while one is already in flight is blocked (double-tap / ActivityResultLauncher guard)', async () => {
    let resolveFirstLaunch!: (value: unknown) => void;
    launchImageLibraryAsyncMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirstLaunch = resolve;
      })
    );

    const firstCall = pickImage();
    const secondCall = pickImage();

    // The second call must resolve immediately (blocked), without ever
    // calling launchImageLibraryAsync a second time.
    await expect(secondCall).resolves.toBeNull();
    expect(launchImageLibraryAsyncMock).toHaveBeenCalledTimes(1);

    resolveFirstLaunch({ canceled: false, assets: [asset()] });
    await expect(firstCall).resolves.toEqual(asset());
  });

  it('7. after a call finishes, the guard releases so a later call can launch again', async () => {
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: false, assets: [asset()] });

    await pickImage();
    await pickImage();

    expect(launchImageLibraryAsyncMock).toHaveBeenCalledTimes(2);
  });
});
