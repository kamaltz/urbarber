import { z } from 'zod';

const envSchema = z.object({
  MIDTRANS_SERVER_KEY: z.string({
    required_error: 'MIDTRANS_SERVER_KEY wajib diisi.',
  }).min(1, 'MIDTRANS_SERVER_KEY tidak boleh kosong.'),
  MIDTRANS_IS_PRODUCTION: z.string().optional().transform((val) => val === 'true'),
  FIREBASE_PROJECT_ID: z.string({
    required_error: 'FIREBASE_PROJECT_ID wajib diisi.',
  }).min(1, 'FIREBASE_PROJECT_ID tidak boleh kosong.'),
  FIREBASE_CLIENT_EMAIL: z.string({
    required_error: 'FIREBASE_CLIENT_EMAIL wajib diisi.',
  }).min(1, 'FIREBASE_CLIENT_EMAIL tidak boleh kosong.'),
  FIREBASE_PRIVATE_KEY: z.string({
    required_error: 'FIREBASE_PRIVATE_KEY wajib diisi.',
  }).min(1, 'FIREBASE_PRIVATE_KEY tidak boleh kosong.'),
  ALLOWED_ORIGINS: z.string().optional().default('http://localhost:8081,http://localhost:19006'),
  // Comma-separated so the admin app's production alias AND any preview deployment
  // that genuinely needs API access can each be listed EXPLICITLY. There is
  // deliberately no hostname pattern for *.vercel.app -- see src/lib/cors.ts.
  ADMIN_APP_ORIGIN: z.string().optional(),
  // Opt-in loose localhost matching (any port). Off unless explicitly enabled or
  // running outside production, so a deployed environment only ever trusts the
  // origins it was configured with.
  ALLOW_LOCALHOST_ORIGINS: z.string().optional(),
  NODE_ENV: z.string().optional(),
  APP_DEEP_LINK_SCHEME: z.string().optional().default('urbarber'),
  PAYMENT_RETURN_BASE_URL: z.string().optional().default('https://urbarber.vercel.app'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Konfigurasi server tidak valid. Variabel hilang: ${missingKeys}`);
  }

  const rawKey = result.data.FIREBASE_PRIVATE_KEY;
  // Safely normalize escaped newline characters
  const normalizedPrivateKey = rawKey.replace(/\\n/g, '\n');

  const baseOrigins = result.data.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  if (result.data.ADMIN_APP_ORIGIN) {
    for (const adminOrigin of result.data.ADMIN_APP_ORIGIN.split(',')) {
      const trimmed = adminOrigin.trim();
      if (trimmed) baseOrigins.push(trimmed);
    }
  }

  const isProduction = result.data.NODE_ENV === 'production';
  const allowLocalhostOrigins = result.data.ALLOW_LOCALHOST_ORIGINS
    ? result.data.ALLOW_LOCALHOST_ORIGINS === 'true'
    : !isProduction;

  return {
    midtransServerKey: result.data.MIDTRANS_SERVER_KEY,
    midtransIsProduction: result.data.MIDTRANS_IS_PRODUCTION,
    firebaseProjectId: result.data.FIREBASE_PROJECT_ID,
    firebaseClientEmail: result.data.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: normalizedPrivateKey,
    allowedOrigins: baseOrigins,
    adminAppOrigin: result.data.ADMIN_APP_ORIGIN,
    allowLocalhostOrigins,
    appDeepLinkScheme: result.data.APP_DEEP_LINK_SCHEME,
    paymentReturnBaseUrl: result.data.PAYMENT_RETURN_BASE_URL,
  };
}

export const config = loadConfig();

// ============================================================================
// Supabase (lazy, server-only) -- private-document signed URL access
// ============================================================================
//
// Deliberately NOT part of envSchema/loadConfig() above: those run eagerly at
// module import time, so adding a required field there would crash EVERY route
// (health, payments, unrelated admin endpoints) the moment this module is
// imported, if the Vercel environment hasn't been updated with these variables
// yet. Instead, this is read lazily -- only when a caller that actually needs
// Supabase (the private-document signed-URL handler) invokes it -- so the rest
// of the API keeps working while Supabase configuration is rolled out.

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('SUPABASE_NOT_CONFIGURED');
    this.name = 'SupabaseNotConfiguredError';
  }
}

export interface SupabaseServerConfig {
  url: string;
  secretKey: string;
}

// Supabase's current API-key model: server-side callers use a Secret Key
// (sb_secret_...), which replaces the legacy service_role key. Server-only --
// must never be exposed via NEXT_PUBLIC_* / EXPO_PUBLIC_*.
//
// SUPABASE_URL must be the PROJECT BASE url (https://<ref>.supabase.co) with no
// path. supabase-js appends its own service paths (/storage/v1/..., /rest/v1/...),
// so a url carrying a path suffix such as `/rest/v1/` silently produces malformed
// request routes and an opaque "Invalid path specified in request URL" 404 at call
// time. Reject that here instead, so the misconfiguration surfaces as a clear
// configuration error rather than a confusing downstream storage failure.
export function getSupabaseServerConfig(): SupabaseServerConfig {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!rawUrl || !secretKey) {
    throw new SupabaseNotConfiguredError();
  }

  const url = rawUrl.replace(/\/+$/, '');

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SupabaseNotConfiguredError();
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new SupabaseNotConfiguredError();
  }

  // Anything beyond the origin (e.g. "/rest/v1") means the wrong url was supplied.
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new SupabaseNotConfiguredError();
  }

  return { url, secretKey };
}
