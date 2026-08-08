/**
 * Consolidated Admin API Router
 * 
 * Consolidates all admin-specific endpoints under a single Vercel Serverless Function.
 * Uses lightweight typed routing without heavy framework dependencies.
 * 
 * Routes:
 * - GET /api/admin/me
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../src/lib/cors.js';
import { requireAdmin } from '../src/admin/admin-auth.js';
import { db } from '../src/lib/firebase-admin.js';

interface RouteContext {
  req: VercelRequest;
  res: VercelResponse;
  method: string;
  pathname: string;
}

type RouteHandler = (ctx: RouteContext) => Promise<void>;

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/admin/me
 * Admin authentication bootstrap endpoint
 * Verifies Firebase token and admin claims, validates account status
 * Returns safe admin identity for the Admin Web dashboard
 */
async function handleGetAdminMe(ctx: RouteContext): Promise<void> {
  const { req, res } = ctx;

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
        displayName: userData.displayName || undefined,
      },
    });
  } catch (err: any) {
    console.error('[Admin/me] Error:', err.message);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan internal pada server.',
      },
    });
  }
}

// ============================================================================
// Router
// ============================================================================

const routes: Record<string, Record<string, RouteHandler>> = {
  'GET': {
    '/api/admin/me': handleGetAdminMe,
  },
};

async function router(ctx: RouteContext): Promise<void> {
  const { res, method, pathname } = ctx;
  const handler = routes[method]?.[pathname];

  if (!handler) {
    // Check if OPTIONS is requested (CORS preflight)
    if (method === 'OPTIONS') {
      if (!handleCors(ctx.req, res, ['GET', 'OPTIONS'])) return;
      res.status(204).end();
      return;
    }

    // 404 Unknown route
    if (!routes[method] || !routes[method][pathname]) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Rute ${method} ${pathname} tidak ditemukan.`,
        },
      });
      return;
    }
  }

  await handler(ctx);
}

// ============================================================================
// Vercel Handler
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathname = req.url?.split('?')[0] || '/';
  const method = req.method || 'GET';

  const ctx: RouteContext = {
    req,
    res,
    method,
    pathname,
  };

  await router(ctx);
}
