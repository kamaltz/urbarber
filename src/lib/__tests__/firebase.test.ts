/**
 * Unit Tests for Firebase Auth Persistence Initialization (Batch 10B-2)
 * On native, Firebase Auth previously defaulted to memory-only persistence (no
 * AsyncStorage wired in), silently signing users out on every reload. These tests
 * exercise the actual module IIFE against mocked SDKs to confirm: native uses
 * AsyncStorage-backed persistence, and a second initialization attempt (Fast Refresh
 * re-evaluating this module) falls back to getAuth() instead of creating a duplicate
 * Auth instance.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const initializeAuthMock = vi.fn();
const getAuthMock = vi.fn(() => ({ __kind: 'existing-auth-instance' }));
const getReactNativePersistenceMock = vi.fn((storage: unknown) => ({ __kind: 'rn-persistence', storage }));

vi.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { __kind: 'async-storage' },
}));

vi.mock('firebase/app', () => ({
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
  initializeApp: vi.fn(() => ({ __kind: 'firebase-app' })),
}));

vi.mock('firebase/auth', () => ({
  initializeAuth: initializeAuthMock,
  getAuth: getAuthMock,
  getReactNativePersistence: getReactNativePersistenceMock,
  browserLocalPersistence: 'browserLocalPersistence',
  browserSessionPersistence: 'browserSessionPersistence',
  indexedDBLocalPersistence: 'indexedDBLocalPersistence',
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
}));

const REQUIRED_ENV = {
  EXPO_PUBLIC_FIREBASE_API_KEY: 'test-api-key',
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'test-project',
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456',
  EXPO_PUBLIC_FIREBASE_APP_ID: '1:123456:web:abc',
};

describe('Firebase Auth native persistence', () => {
  beforeEach(() => {
    vi.resetModules();
    initializeAuthMock.mockReset();
    getAuthMock.mockClear();
    getReactNativePersistenceMock.mockClear();
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      vi.stubEnv(key, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('E1. native platform initializes Auth with AsyncStorage-backed persistence', async () => {
    initializeAuthMock.mockReturnValue({ __kind: 'new-auth-instance' });

    const { firebaseAuth } = await import('../firebase');

    expect(initializeAuthMock).toHaveBeenCalledTimes(1);
    expect(getReactNativePersistenceMock).toHaveBeenCalledWith({ __kind: 'async-storage' });
    expect(initializeAuthMock.mock.calls[0][1]).toEqual({
      persistence: { __kind: 'rn-persistence', storage: { __kind: 'async-storage' } },
    });
    expect(firebaseAuth).toEqual({ __kind: 'new-auth-instance' });
    expect(getAuthMock).not.toHaveBeenCalled();
  });

  it('E2. a second initialization on an already-initialized app instance (Fast Refresh) falls back to getAuth without creating a duplicate', async () => {
    initializeAuthMock.mockImplementation(() => {
      throw new Error('Firebase: Auth instance already initialized for this app.');
    });

    const { firebaseAuth } = await import('../firebase');

    expect(initializeAuthMock).toHaveBeenCalledTimes(1);
    expect(getAuthMock).toHaveBeenCalledTimes(1);
    expect(firebaseAuth).toEqual({ __kind: 'existing-auth-instance' });
  });
});
