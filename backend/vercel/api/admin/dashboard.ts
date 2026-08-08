/**
 * POST /api/admin/dashboard
 * Returns real aggregated platform metrics for the admin dashboard.
 * Uses Firestore aggregation queries (count()) for efficiency.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../src/lib/cors.js';
import { requireAdmin } from '../../src/admin/admin-auth.js';
import { getDashboardMetrics } from '../../src/admin/admin.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const metrics = await getDashboardMetrics();
    res.status(200).json({ data: metrics });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat metrik dashboard.' } });
  }
}
