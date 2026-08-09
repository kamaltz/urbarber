/**
 * Admin Private Document Signed-URL Tests (Batch 09D-2A)
 *
 * Exercises the actual production logic:
 * - requireAdmin() (real, against a mocked Firebase Auth boundary only)
 * - getSignedDocumentUrl() (real, against the Firestore emulator; only the Supabase
 *   Storage client is mocked -- these tests never call real hosted Supabase)
 * - getSupabaseServerConfig() (real, unmocked -- verifies the lazy config contract)
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase-admin.js', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { requireAdmin } from '../src/admin/admin-auth.js';
import { getSignedDocumentUrl } from '../src/admin/admin.service.js';
import { getSupabaseServerConfig, SupabaseNotConfiguredError } from '../src/config/index.js';
import { adminAuth, db } from '../src/lib/firebase-admin.js';
import { getSupabaseAdminClient } from '../src/lib/supabase-admin.js';

const mockedGetSupabaseAdminClient = vi.mocked(getSupabaseAdminClient);

function makeFakeRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json } as any;
}

function fakeSupabaseClient(signResult: { data: { signedUrl: string } | null; error: { message: string } | null }) {
  const createSignedUrl = vi.fn().mockResolvedValue(signResult);
  return {
    storage: {
      from: vi.fn(() => ({ createSignedUrl })),
    },
    _createSignedUrl: createSignedUrl,
  } as any;
}

async function clearRegistrations() {
  const snap = await db.collection('barberRegistrations').get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}

describe('requireAdmin (route authorization)', () => {
  it('1. rejects a non-admin token with 403 and returns null', async () => {
    const fakeReq: any = { headers: { authorization: 'Bearer some-token' } };
    const fakeRes = makeFakeRes();

    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'cust1',
      app_role: 'customer',
    } as any);

    const result = await requireAdmin(fakeReq, fakeRes);

    expect(result).toBeNull();
    expect(fakeRes.status).toHaveBeenCalledWith(403);
  });

  it('admin token passes through', async () => {
    const fakeReq: any = { headers: { authorization: 'Bearer some-token' } };
    const fakeRes = makeFakeRes();

    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({
      uid: 'admin1',
      app_role: 'admin',
    } as any);

    const result = await requireAdmin(fakeReq, fakeRes);

    expect(result?.uid).toBe('admin1');
    expect(fakeRes.status).not.toHaveBeenCalled();
  });
});

describe('getSupabaseServerConfig (lazy server config)', () => {
  const originalUrl = process.env.SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SECRET_KEY;

  it('throws SupabaseNotConfiguredError when env vars are absent', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;

    expect(() => getSupabaseServerConfig()).toThrow(SupabaseNotConfiguredError);

    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SECRET_KEY = originalKey;
  });

  it('throws SupabaseNotConfiguredError when only the URL is present', () => {
    process.env.SUPABASE_URL = 'https://fake-project.supabase.co';
    delete process.env.SUPABASE_SECRET_KEY;

    expect(() => getSupabaseServerConfig()).toThrow(SupabaseNotConfiguredError);

    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SECRET_KEY = originalKey;
  });

  it('returns config when env vars are present', () => {
    process.env.SUPABASE_URL = 'https://fake-project.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_fake-test-value';

    const cfg = getSupabaseServerConfig();
    expect(cfg.url).toBe('https://fake-project.supabase.co');
    expect(cfg.secretKey).toBe('sb_secret_fake-test-value');

    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SECRET_KEY = originalKey;
  });

  it('normalizes a trailing slash on the project url', () => {
    process.env.SUPABASE_URL = 'https://fake-project.supabase.co/';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_fake-test-value';

    expect(getSupabaseServerConfig().url).toBe('https://fake-project.supabase.co');

    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SECRET_KEY = originalKey;
  });

  // Regression: Batch 09D-3A. A SUPABASE_URL pointing at the PostgREST endpoint
  // rather than the project base url made supabase-js build an invalid storage
  // route, surfacing only as an opaque "Invalid path specified in request URL"
  // 404 at signed-url time. It must be rejected as a configuration error instead.
  it('rejects a url carrying a path suffix such as /rest/v1', () => {
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_fake-test-value';

    for (const bad of [
      'https://fake-project.supabase.co/rest/v1/',
      'https://fake-project.supabase.co/rest/v1',
      'https://fake-project.supabase.co/storage/v1',
      'not-a-url',
    ]) {
      process.env.SUPABASE_URL = bad;
      expect(() => getSupabaseServerConfig(), bad).toThrow(SupabaseNotConfiguredError);
    }

    process.env.SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SECRET_KEY = originalKey;
  });
});

describe('getSignedDocumentUrl (real Firestore emulator + mocked Supabase client)', () => {
  beforeEach(async () => {
    await clearRegistrations();
    mockedGetSupabaseAdminClient.mockReset();
  });

  it('4. invalid documentType is rejected before any Firestore/Supabase access', async () => {
    await expect(getSignedDocumentUrl('barberA', 'not_a_real_type')).rejects.toThrow(
      'INVALID_DOCUMENT_TYPE'
    );
    expect(mockedGetSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('5. missing registration document is rejected', async () => {
    await expect(getSignedDocumentUrl('barber-does-not-exist', 'ktp')).rejects.toThrow(
      'REGISTRATION_NOT_FOUND'
    );
  });

  it('6. missing document path within an existing registration is rejected', async () => {
    await db.collection('barberRegistrations').doc('barberB').set({
      documentPaths: { certificate: 'barberB/verifications/cert.jpg' },
      // no 'ktp' key
    });

    await expect(getSignedDocumentUrl('barberB', 'ktp')).rejects.toThrow('DOCUMENT_NOT_FOUND');
  });

  it('7. a documentPaths entry outside the barber\'s own namespace is rejected', async () => {
    await db.collection('barberRegistrations').doc('barberC').set({
      documentPaths: { ktp: 'someOtherBarberId/verifications/123.jpg' },
    });

    await expect(getSignedDocumentUrl('barberC', 'ktp')).rejects.toThrow('DOCUMENT_PATH_INVALID');
  });

  it('rejects a malformed/traversal-like path even inside the right prefix', async () => {
    await db.collection('barberRegistrations').doc('barberT').set({
      documentPaths: { ktp: 'barberT/../other/secret.jpg' },
    });

    await expect(getSignedDocumentUrl('barberT', 'ktp')).rejects.toThrow('DOCUMENT_PATH_INVALID');
  });

  it('3. an unrelated/decoy field cannot override the authoritative documentPaths value', async () => {
    const fakeClient = fakeSupabaseClient({
      data: { signedUrl: 'https://fake.supabase.co/signed/legit' },
      error: null,
    });
    mockedGetSupabaseAdminClient.mockReturnValue(fakeClient);

    await db.collection('barberRegistrations').doc('barberD').set({
      documentPaths: { ktp: 'barberD/verifications/legit.jpg' },
      // Decoy fields an attacker-controlled write (or legacy data) might contain --
      // must never be consulted for path resolution.
      storagePath: 'attacker/evil.jpg',
      documents: { ktp: 'attacker/evil.jpg' },
    });

    await getSignedDocumentUrl('barberD', 'ktp');

    expect(fakeClient._createSignedUrl).toHaveBeenCalledWith('barberD/verifications/legit.jpg', 600);
  });

  it('2 & 9. valid admin request resolves the authoritative path and returns a signed URL + expiry', async () => {
    const fakeClient = fakeSupabaseClient({
      data: { signedUrl: 'https://fake.supabase.co/signed/abc123' },
      error: null,
    });
    mockedGetSupabaseAdminClient.mockReturnValue(fakeClient);

    await db.collection('barberRegistrations').doc('barberE').set({
      documentPaths: { certificate: 'barberE/verifications/456.jpg' },
    });

    const result = await getSignedDocumentUrl('barberE', 'certificate');

    expect(result.url).toBe('https://fake.supabase.co/signed/abc123');
    expect(fakeClient.storage.from).toHaveBeenCalledWith('private-documents');
    expect(fakeClient._createSignedUrl).toHaveBeenCalledWith('barberE/verifications/456.jpg', 600);

    const expiresAtMs = new Date(result.expiresAt).getTime();
    const nowMs = Date.now();
    expect(expiresAtMs).toBeGreaterThan(nowMs);
    expect(expiresAtMs).toBeLessThanOrEqual(nowMs + 600 * 1000 + 5000); // small test-runtime tolerance
  });

  it('8. a Supabase signing failure is handled safely (sanitized, no raw error leak)', async () => {
    const fakeClient = fakeSupabaseClient({
      data: null,
      error: { message: 'some internal Supabase storage detail that must not leak' },
    });
    mockedGetSupabaseAdminClient.mockReturnValue(fakeClient);

    await db.collection('barberRegistrations').doc('barberF').set({
      documentPaths: { ktp: 'barberF/verifications/789.jpg' },
    });

    await expect(getSignedDocumentUrl('barberF', 'ktp')).rejects.toThrow('SIGNED_URL_FAILED');
  });

  it('config-missing: fails with a controlled SUPABASE_NOT_CONFIGURED error, not a crash', async () => {
    mockedGetSupabaseAdminClient.mockImplementation(() => {
      throw new SupabaseNotConfiguredError();
    });

    await db.collection('barberRegistrations').doc('barberG').set({
      documentPaths: { ktp: 'barberG/verifications/1.jpg' },
    });

    await expect(getSignedDocumentUrl('barberG', 'ktp')).rejects.toThrow('SUPABASE_NOT_CONFIGURED');
  });

  it('10. the signed URL is never persisted back to Firestore', async () => {
    const fakeClient = fakeSupabaseClient({
      data: { signedUrl: 'https://fake.supabase.co/signed/should-not-persist' },
      error: null,
    });
    mockedGetSupabaseAdminClient.mockReturnValue(fakeClient);

    await db.collection('barberRegistrations').doc('barberH').set({
      documentPaths: { ktp: 'barberH/verifications/1.jpg' },
    });

    await getSignedDocumentUrl('barberH', 'ktp');

    const after = await db.collection('barberRegistrations').doc('barberH').get();
    const serialized = JSON.stringify(after.data());
    expect(serialized).not.toContain('should-not-persist');
    expect(serialized).not.toContain('signedUrl');
  });
});
