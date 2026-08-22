/**
 * Route-level HTTP status tests for POST /api/admin/barber-registrations/document-url
 * (thesis v1.1 final stabilization -- Admin document preview 503 investigation).
 *
 * admin-document-signed-url.test.ts already thoroughly covers the *service* layer
 * (getSignedDocumentUrl's thrown error messages) and requireAdmin in isolation, but
 * nothing previously exercised admin.ts's actual router -- the layer that maps each
 * thrown error message to the HTTP status code a real client (the Admin web app)
 * receives. That mapping is exactly what the live "everything comes back 503" bug
 * report is about, so it needs its own direct test via the real default-exported
 * Vercel handler (CORS -> requireAdmin -> handleGetDocumentUrl), not just the
 * service function underneath it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/supabase-admin.js', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import handler from '../api/admin.js';
import { adminAuth, db } from '../src/lib/firebase-admin.js';
import { getSupabaseAdminClient } from '../src/lib/supabase-admin.js';

const mockedGetSupabaseAdminClient = vi.mocked(getSupabaseAdminClient);

function fakeRequest(opts: { authorization?: string; body?: unknown }) {
  return {
    method: 'POST',
    url: '/api/admin/barber-registrations/document-url',
    headers: opts.authorization ? { authorization: opts.authorization } : {},
    body: opts.body,
  } as any;
}

function fakeResponse() {
  const json = vi.fn();
  const end = vi.fn();
  const setHeader = vi.fn();
  const status = vi.fn(() => ({ json, end }));
  return { status, json, end, setHeader } as any;
}

function fakeSupabaseClient(signResult: { data: { signedUrl: string } | null; error: { message: string } | null }) {
  const createSignedUrl = vi.fn().mockResolvedValue(signResult);
  return { storage: { from: vi.fn(() => ({ createSignedUrl })) } } as any;
}

async function seedRegistration(barberId: string, documentPaths: Record<string, string>) {
  await db.collection('barberRegistrations').doc(barberId).set({ documentPaths });
}

async function cleanup(barberIds: string[]) {
  await Promise.all(barberIds.map((id) => db.collection('barberRegistrations').doc(id).delete()));
}

describe('POST /api/admin/barber-registrations/document-url (route-level HTTP status)', () => {
  beforeEach(() => {
    mockedGetSupabaseAdminClient.mockReset();
  });

  it('401 when no Authorization header is sent (customer/barber/admin apps all use the same authenticated client pattern)', async () => {
    const req = fakeRequest({ body: { barberId: 'x', documentType: 'ktp' } });
    const res = fakeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHENTICATED' }) }));
  });

  it('403 when the caller is authenticated but not an admin (customer token)', async () => {
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'cust-route-1', app_role: 'customer' } as any);
    const req = fakeRequest({ authorization: 'Bearer fake-customer-token', body: { barberId: 'x', documentType: 'ktp' } });
    const res = fakeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }));
  });

  it('403 when the caller is authenticated but not an admin (barber token)', async () => {
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'barb-route-1', app_role: 'barber' } as any);
    const req = fakeRequest({ authorization: 'Bearer fake-barber-token', body: { barberId: 'x', documentType: 'ktp' } });
    const res = fakeResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }));
  });

  it('400 when barberId or documentType is missing from the request body', async () => {
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValue({ uid: 'admin-route-1', app_role: 'admin' } as any);
    const res1 = fakeResponse();
    await handler(fakeRequest({ authorization: 'Bearer fake-admin-token', body: { documentType: 'ktp' } }), res1);
    expect(res1.status).toHaveBeenCalledWith(400);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'INVALID_REQUEST' }) }));

    const res2 = fakeResponse();
    await handler(fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberX' } }), res2);
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'INVALID_REQUEST' }) }));
  });

  it('400 when documentType is not one of the allowed values', async () => {
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-2', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberX', documentType: 'passport' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'INVALID_DOCUMENT_TYPE' }) }));
  });

  it('404 when the registration does not exist', async () => {
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-3', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barber-does-not-exist', documentType: 'ktp' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'NOT_FOUND' }) }));
  });

  it('404 (safe result, not a crash) when the registration exists but never uploaded the requested document type', async () => {
    await seedRegistration('route-barberB', { certificate: 'route-barberB/verifications/cert.jpg' });
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-4', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberB', documentType: 'ktp' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    await cleanup(['route-barberB']);
  });

  it('404 when the resolved storage path falls outside the requested barber\'s own namespace (cannot sign an arbitrary/unowned path)', async () => {
    await seedRegistration('route-barberC', { ktp: 'someOtherBarber/verifications/stolen.jpg' });
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-5', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberC', documentType: 'ktp' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedGetSupabaseAdminClient).not.toHaveBeenCalled();
    await cleanup(['route-barberC']);
  });

  it('503 SERVER_CONFIGURATION_ERROR when the server storage client is not configured (missing SUPABASE_URL/SUPABASE_SECRET_KEY) -- this is the exact live bug report', async () => {
    await seedRegistration('route-barberD', { ktp: 'route-barberD/verifications/1.jpg' });
    mockedGetSupabaseAdminClient.mockImplementation(() => {
      throw new Error('SUPABASE_NOT_CONFIGURED');
    });
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-6', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberD', documentType: 'ktp' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'SERVER_CONFIGURATION_ERROR' }) }));
    await cleanup(['route-barberD']);
  });

  it('502 STORAGE_ERROR when Supabase itself fails to create the signed URL', async () => {
    await seedRegistration('route-barberE', { ktp: 'route-barberE/verifications/1.jpg' });
    mockedGetSupabaseAdminClient.mockReturnValue(
      fakeSupabaseClient({ data: null, error: { message: 'internal supabase detail' } })
    );
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-7', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberE', documentType: 'ktp' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.objectContaining({ code: 'STORAGE_ERROR' }) }));
    await cleanup(['route-barberE']);
  });

  it('200 with {url, expiresIn-shaped expiresAt} on a fully valid request', async () => {
    await seedRegistration('route-barberF', { ktp: 'route-barberF/verifications/1.jpg' });
    mockedGetSupabaseAdminClient.mockReturnValue(
      fakeSupabaseClient({ data: { signedUrl: 'https://fake.supabase.co/signed/ok' }, error: null })
    );
    vi.spyOn(adminAuth, 'verifyIdToken').mockResolvedValueOnce({ uid: 'admin-route-8', app_role: 'admin' } as any);
    const res = fakeResponse();

    await handler(
      fakeRequest({ authorization: 'Bearer fake-admin-token', body: { barberId: 'route-barberF', documentType: 'ktp' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ url: 'https://fake.supabase.co/signed/ok', expiresAt: expect.any(String) }) })
    );
    await cleanup(['route-barberF']);
  });
});
