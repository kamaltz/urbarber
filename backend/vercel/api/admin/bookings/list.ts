/**
 * POST /api/admin/bookings/list
 * Lists all bookings globally with optional status filter (read-only).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { listBookings } from '../../../src/admin/admin.service.js';
import type { AdminBookingRecord } from '../../../src/admin/admin.types.js';

const CANONICAL_STATUSES = new Set([
  'pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected',
]);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { status, limit } = (req.body ?? {}) as { status?: string; limit?: number };

    const safeStatus = CANONICAL_STATUSES.has(status ?? '') ? status : undefined;
    const safeLimit  = typeof limit === 'number' && limit > 0 && limit <= 100 ? limit : 50;

    const bookings = await listBookings(safeStatus, safeLimit);

    // Redact sensitive payment fields before returning
    const safeBookings = bookings.map((b: AdminBookingRecord) => ({
      id: b.id,
      customerId: b.customerId,
      barberId: b.barberId,
      status: b.status,
      paymentMethod: b.paymentMethod,
      paymentStatus: b.paymentStatus,
      totalPrice: b.totalPrice,
      date: b.date,
      startTime: b.startTime,
      createdAt: b.createdAt,
      // snapToken, server keys, and webhook headers are never included
    }));

    res.status(200).json({ data: safeBookings });
  } catch (err) {
    console.error('[admin/bookings/list]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat daftar booking.' } });
  }
}
