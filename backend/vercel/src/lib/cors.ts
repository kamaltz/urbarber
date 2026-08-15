import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../config/index.js';

/** Loose localhost matching (any port, http or https), used only when the active
 *  policy opts in. Anchored so `http://localhost.attacker.com` cannot match. */
const LOCALHOST_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

export interface OriginPolicy {
  /** Exact origins that are trusted, from ALLOWED_ORIGINS + ADMIN_APP_ORIGIN. */
  allowedOrigins: string[];
  /** Whether any localhost/127.0.0.1 port is trusted (local dev only). */
  allowLocalhostOrigins: boolean;
}

/** The policy in force for this deployment. Read per call rather than captured at
 *  module load so tests can exercise `isAllowedOrigin` against explicit policies. */
export function getOriginPolicy(): OriginPolicy {
  return {
    allowedOrigins: config.allowedOrigins,
    allowLocalhostOrigins: config.allowLocalhostOrigins,
  };
}

/**
 * Canonical form for comparison: an HTTP Origin is scheme + host + optional port,
 * case-insensitive, with no path. Lowercasing and stripping a stray trailing slash
 * means a configured `https://Admin.Example.com/` still matches the browser's
 * `https://admin.example.com`, without loosening what actually counts as a match.
 */
export function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, '');
}

/**
 * Validates whether an incoming HTTP Origin is permitted.
 *
 * EXACT MATCHES ONLY, against origins this deployment was explicitly configured
 * with (ALLOWED_ORIGINS + ADMIN_APP_ORIGIN, both comma-separated).
 *
 * There is deliberately NO hostname pattern for `*.vercel.app` here. A previous
 * revision matched `^https://urbarber-admin(-[a-z0-9]+)*(-kamaltzs-projects)?\.vercel\.app$`
 * to auto-trust the admin app's preview deployments. That is not safe: names under
 * `vercel.app` are a public, first-come namespace, so ANY outsider can create a
 * project called e.g. `urbarber-admin-x` (or even `urbarber-admin-abc-kamaltzs-projects`)
 * and obtain a hostname that satisfies the pattern -- gaining credentialed
 * cross-origin access to the admin API from a host we do not control. No regex over
 * that namespace can distinguish our deployments from a lookalike, so preview URLs
 * that genuinely need API access must be added to ADMIN_APP_ORIGIN by hand.
 *
 * Localhost is matched loosely (any port) only when the policy opts in --
 * ALLOW_LOCALHOST_ORIGINS=true, or any non-production NODE_ENV. In production, the
 * only localhost origins accepted are ones listed verbatim in ALLOWED_ORIGINS.
 */
export function isAllowedOrigin(origin: string, policy: OriginPolicy = getOriginPolicy()): boolean {
  if (!origin) return false;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  if (policy.allowedOrigins.some((allowed) => normalizeOrigin(allowed) === normalized)) {
    return true;
  }

  if (policy.allowLocalhostOrigins && LOCALHOST_ORIGIN_PATTERN.test(normalized)) {
    return true;
  }

  return false;
}

export function handleCors(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
): boolean {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Vary', 'Origin');
  }

  const allowed = origin ? isAllowedOrigin(origin) : false;

  if (origin) {
    // Echo the exact requesting origin -- never '*' -- so the browser surfaces the
    // 403 below as a readable API error instead of an opaque CORS failure. For a
    // DISALLOWED origin this grants read access to nothing but the constant
    // CORS_FORBIDDEN error body, and Access-Control-Allow-Credentials is
    // deliberately withheld, so no authenticated response is ever readable
    // cross-origin by an untrusted host.
    res.setHeader('Access-Control-Allow-Origin', origin);
    if (allowed) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With, Accept, Origin'
  );
  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));

  if (origin && !allowed) {
    res.status(403).json({ error: { code: 'CORS_FORBIDDEN', message: 'Origin tidak diizinkan.' } });
    return false;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  if (req.method && !allowedMethods.includes(req.method)) {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Metode ${req.method} tidak didukung pada endpoint ini.`,
      },
    });
    return false;
  }

  return true;
}
