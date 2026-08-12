/**
 * Unit Tests for Google Auth decision logic (Batch 10B-5H-B)
 * Covers the business rules layered on top of the native Google Sign-In +
 * Firebase credential exchange: login must never silently bootstrap an
 * unregistered account, registration must never switch an existing account's
 * role, suspended accounts are rejected the same way for Google as for
 * email/password, and cancelled/linked-credential errors are translated into
 * controlled, typed outcomes instead of generic failures.
 *
 * Terms-checkbox enforcement (button `disabled`, separate from visibility)
 * and the Google-verified-email skip (Firebase's own `emailVerified` flag
 * flowing through the existing, untouched auth-context) are UI/design level
 * with no new logic backing them -- verified by code inspection, not
 * re-tested here. isGoogleAuthConfigured() below IS the visibility signal
 * both screens render on, so it is covered directly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  hasPlayServicesMock,
  signInMock,
  signInWithCredentialMock,
  signOutMock,
  getDocMock,
  initializeAccountMock,
} = vi.hoisted(() => ({
  hasPlayServicesMock: vi.fn().mockResolvedValue(true),
  signInMock: vi.fn(),
  signInWithCredentialMock: vi.fn(),
  signOutMock: vi.fn(),
  getDocMock: vi.fn(),
  initializeAccountMock: vi.fn(),
}));

vi.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: vi.fn(),
    hasPlayServices: hasPlayServicesMock,
    signIn: signInMock,
  },
  isCancelledResponse: (r: any) => r?.type === 'cancelled',
  isSuccessResponse: (r: any) => r?.type === 'success',
  isErrorWithCode: (e: any) => Boolean(e && typeof e.code === 'string'),
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn((idToken: string) => ({ idToken })) },
  signInWithCredential: signInWithCredentialMock,
  signOut: signOutMock,
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, collection: string, uid: string) => ({ collection, uid })),
  getDoc: getDocMock,
}));

vi.mock('@/lib/firebase', () => ({ firebaseAuth: {}, firestore: {} }));

vi.mock('../account-bootstrap.service', () => ({
  accountBootstrapService: { initializeAccount: initializeAccountMock },
}));

import { isGoogleAuthConfigured, loginExistingGoogleAccount, registerGoogleAccount } from '../google-auth.service';

function mockUser(overrides: Partial<{ uid: string; displayName: string | null; email: string | null }> = {}) {
  return {
    uid: overrides.uid ?? 'google-uid-1',
    displayName: overrides.displayName ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('fake-token'),
  };
}

function mockSuccessfulGoogleSignIn(user = mockUser()) {
  signInMock.mockResolvedValue({ type: 'success', data: { idToken: 'fake-google-id-token' } });
  signInWithCredentialMock.mockResolvedValue({ user });
  return user;
}

function mockFirestoreUser(exists: boolean, data: Record<string, unknown> = {}) {
  getDocMock.mockResolvedValue({ exists: () => exists, data: () => data });
}

describe('loginExistingGoogleAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPlayServicesMock.mockResolvedValue(true);
  });

  it('1. existing account login succeeds without touching account bootstrap', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(true, { status: 'active', role: 'customer' });

    const result = await loginExistingGoogleAccount();

    expect(result.success).toBe(true);
    expect(initializeAccountMock).not.toHaveBeenCalled();
  });

  it('2. existing Barber account login succeeds the same way (role is resolved later via reloadUser, not here)', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(true, { status: 'active', role: 'barber' });

    const result = await loginExistingGoogleAccount();

    expect(result.success).toBe(true);
  });

  it('3. an unregistered Google account is never silently bootstrapped -- returns ACCOUNT_NOT_REGISTERED', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(false);

    const result = await loginExistingGoogleAccount();

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ACCOUNT_NOT_REGISTERED');
    expect(initializeAccountMock).not.toHaveBeenCalled();
  });

  it('8a. a suspended account is signed out and rejected on login', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(true, { status: 'suspended', role: 'customer' });

    const result = await loginExistingGoogleAccount();

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('USER_SUSPENDED');
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it('10. a cancelled Google account chooser is reported as USER_CANCELLED without ever calling Firebase', async () => {
    signInMock.mockResolvedValue({ type: 'cancelled', data: null });

    const result = await loginExistingGoogleAccount();

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('USER_CANCELLED');
    expect(signInWithCredentialMock).not.toHaveBeenCalled();
    expect(getDocMock).not.toHaveBeenCalled();
  });

  it('11. account-exists-with-different-credential is translated into a clear, controlled message', async () => {
    signInMock.mockResolvedValue({ type: 'success', data: { idToken: 'fake-google-id-token' } });
    signInWithCredentialMock.mockRejectedValue({ code: 'auth/account-exists-with-different-credential' });

    const result = await loginExistingGoogleAccount();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('ACCOUNT_EXISTS_DIFFERENT_CREDENTIAL');
      expect(result.error.message).toMatch(/metode masuk lain/);
    }
  });
});

describe('registerGoogleAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPlayServicesMock.mockResolvedValue(true);
  });

  it('4. a new Customer registers via the existing trusted bootstrap endpoint and force-refreshes the token', async () => {
    const user = mockSuccessfulGoogleSignIn();
    mockFirestoreUser(false);
    initializeAccountMock.mockResolvedValue({ success: true });

    const result = await registerGoogleAccount('customer');

    expect(initializeAccountMock).toHaveBeenCalledWith({ requestedRole: 'customer', name: 'Test User' });
    expect(user.getIdToken).toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true, isNewAccount: true, user });
  });

  it('5. a new Barber registers with requestedRole barber', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(false);
    initializeAccountMock.mockResolvedValue({ success: true });

    await registerGoogleAccount('barber');

    expect(initializeAccountMock).toHaveBeenCalledWith({ requestedRole: 'barber', name: 'Test User' });
  });

  it('7. an existing account keeps its stored role -- the Register screen role selector cannot switch it', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(true, { status: 'active', role: 'customer' });

    const result = await registerGoogleAccount('barber');

    expect(initializeAccountMock).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, isNewAccount: false, user: expect.anything() });
  });

  it('8b. a suspended account is signed out and rejected on registration too', async () => {
    mockSuccessfulGoogleSignIn();
    mockFirestoreUser(true, { status: 'suspended', role: 'customer' });

    const result = await registerGoogleAccount('customer');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('USER_SUSPENDED');
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(initializeAccountMock).not.toHaveBeenCalled();
  });

  it('12. a bootstrap failure does not claim success and does not force-refresh the token', async () => {
    const user = mockSuccessfulGoogleSignIn();
    mockFirestoreUser(false);
    initializeAccountMock.mockResolvedValue({
      success: false,
      error: { code: 'INVALID_ROLE', message: 'Role tidak valid.' },
    });

    const result = await registerGoogleAccount('customer');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toEqual({ code: 'INVALID_ROLE', message: 'Role tidak valid.' });
    expect(user.getIdToken).not.toHaveBeenCalled();
  });
});

/**
 * Batch 10B-5H-B-R2: isGoogleAuthConfigured() is the sole signal Login and
 * Register use to decide whether the Google option renders at all. It must
 * represent only "does this build have the client-side webClientId" -- never
 * server-only files (google-services.json), network state, or sign-in state.
 */
describe('isGoogleAuthConfigured', () => {
  const ORIGINAL_ENV = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    } else {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = ORIGINAL_ENV;
    }
  });

  it('1. a real web client id present -> configured true', () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'abc-123.apps.googleusercontent.com';
    expect(isGoogleAuthConfigured()).toBe(true);
  });

  it('2. missing web client id -> configured false', () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    expect(isGoogleAuthConfigured()).toBe(false);
  });

  it('3. a whitespace-only web client id -> configured false', () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = '   ';
    expect(isGoogleAuthConfigured()).toBe(false);
  });
});
