/**
 * POST /api/admin/users/list
 * Lists users with optional role and status filters.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { listUsers } from '../../../src/admin/admin.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { role, status, limit } = (req.body ?? {}) as {
      role?: string;
      status?: string;
      limit?: number;
    };

    const allowedRoles    = ['customer', 'barber', 'admin'];
    const allowedStatuses = ['active', 'pending_verification', 'suspended'];

    const safeRole   = allowedRoles.includes(role ?? '')     ? role    : undefined;
    const safeStatus = allowedStatuses.includes(status ?? '') ? status  : undefined;
    const safeLimit  = typeof limit === 'number' && limit > 0 && limit <= 100 ? limit : 50;

    const users = await listUsers(safeRole, safeStatus, safeLimit);
    res.status(200).json({ data: users });
  } catch (err) {
    console.error('[admin/users/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat daftar pengguna.' } });
  }
}
