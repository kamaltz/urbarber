/**
 * POST /api/admin/barber-registrations/list
 * Returns paginated barber registration records for admin review.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { listBarberRegistrations } from '../../../src/admin/admin.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { verificationStatus, limit } = (req.body ?? {}) as {
      verificationStatus?: string;
      limit?: number;
    };

    const allowed = ['pending', 'approved', 'rejected'];
    const safeStatus = allowed.includes(verificationStatus ?? '')
      ? verificationStatus
      : undefined;

    const safeLimit = typeof limit === 'number' && limit > 0 && limit <= 100
      ? limit
      : 50;

    const registrations = await listBarberRegistrations(safeStatus, safeLimit);

    res.status(200).json({ data: registrations });
  } catch (err) {
    console.error('[admin/barber-registrations/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat daftar registrasi.' } });
  }
}
