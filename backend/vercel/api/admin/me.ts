/**
 * GET /api/admin/me
 * Admin authentication bootstrap endpoint
 * Verifies Firebase token and admin claims, validates account status
 * Returns safe admin identity for the Admin Web dashboard
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../src/lib/cors.js';
import { requireAdmin } from '../../src/admin/admin-auth.js';
import { db } from '../../src/lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    // Load user document from Firestore to verify status
    const userSnap = await db.collection('users').doc(admin.uid).get();
    if (!userSnap.exists) {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Admin user profile tidak ditemukan.',
        },
      });
      return;
    }

    const userData = userSnap.data()!;

    // Verify admin is active
    if (userData.status !== 'active') {
      res.status(403).json({
        error: {
          code: 'ADMIN_INACTIVE',
          message: `Admin status is ${userData.status}. Access denied.`,
        },
      });
      return;
    }

    // Return safe admin identity (no sensitive fields)
    res.status(200).json({
      data: {
        uid: admin.uid,
        email: admin.email || '',
        appRole: 'admin',
        status: 'active',
        displayName: userData.displayName || userData.name || undefined,
      },
    });
  } catch (err) {
    console.error('[admin/me]', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Server error. Please try again later.',
      },
    });
  }
}
