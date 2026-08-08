/**
 * Admin Authentication Middleware
 * Verifies Firebase ID token and enforces app_role=admin.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.js';

export interface AdminAuthContext {
  uid: string;
  email?: string;
  decodedToken: DecodedIdToken;
}

/**
 * Authenticate the request and verify app_role=admin.
 * Returns AdminAuthContext on success or writes 401/403 and returns null.
 */
export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AdminAuthContext | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Bearer token tidak ditemukan.' },
    });
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Format token tidak valid.' },
    });
    return null;
  }

  let decoded: DecodedIdToken;
  try {
    decoded = await adminAuth.verifyIdToken(token, /* checkRevoked= */ true);
  } catch {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token kadaluwarsa atau tidak valid.' },
    });
    return null;
  }

  const appRole = decoded.app_role as string | undefined;
  if (appRole !== 'admin') {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Akses ditolak. Diperlukan peran admin.' },
    });
    return null;
  }

  return { uid: decoded.uid, email: decoded.email, decodedToken: decoded };
}
