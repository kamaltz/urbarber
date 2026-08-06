import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from './firebase-admin.js';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  appRole: 'customer' | 'barber' | 'admin';
  decodedToken: DecodedIdToken;
}

export async function authenticateRequest(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Header Authorization Bearer token tidak ditemukan.',
      },
    });
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Format token terautentikasi tidak valid.',
      },
    });
    return null;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token, true);
    const appRole = (decodedToken.app_role || 'customer') as 'customer' | 'barber' | 'admin';

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      appRole,
      decodedToken,
    };
  } catch (err: any) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Token terautentikasi kadaluwarsa atau tidak valid.',
      },
    });
    return null;
  }
}
