/**
 * Backend-only Supabase Admin client.
 *
 * Server-side, elevated access for trusted operations (private-document signed
 * URL generation). NEVER import this from anything that ships to a browser or the
 * mobile bundle -- it holds SUPABASE_SECRET_KEY (Supabase server Secret Key,
 * sb_secret_...), which bypasses Storage RLS.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServerConfig } from '../config/index.js';

let cachedClient: SupabaseClient | null = null;

/**
 * Lazily creates (and caches) the Supabase Admin client. Throws
 * SupabaseNotConfiguredError (via getSupabaseServerConfig) if the required env vars
 * are absent -- callers should catch this and return a clean server-configuration
 * error rather than crashing the whole function.
 */
export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const { url, secretKey } = getSupabaseServerConfig();

  cachedClient = createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}
