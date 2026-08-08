/**
 * POST /api/admin/barber-registrations/reject
 * Rejects a pending barber registration with a mandatory reason.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { rejectBarber } from '../../../src/admin/admin.service.js';
import { validateRejectionReason } from '../../../src/admin/admin.validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { barberId, reason } = (req.body ?? {}) as { barberId?: string; reason?: string };

  if (!barberId || typeof barberId !== 'string' || !barberId.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_BARBER_ID', message: 'barberId wajib diisi.' } });
  }

  const reasonValidation = validateRejectionReason(reason);
  if (!reasonValidation.valid) {
    return res.status(400).json({ error: { code: 'INVALID_REASON', message: reasonValidation.message } });
  }

  try {
    const result = await rejectBarber(barberId.trim(), reason as string, admin.uid);
    res.status(200).json({
      success: true,
      alreadyRejected: result.alreadyRejected,
      message: result.alreadyRejected
        ? 'Registrasi barber sudah dalam status rejected.'
        : 'Registrasi barber berhasil ditolak.',
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    const errorMap: Record<string, [number, string]> = {
      REGISTRATION_NOT_FOUND:   [404, 'Data registrasi tidak ditemukan.'],
      REGISTRATION_NOT_PENDING: [409, 'Registrasi tidak dalam status pending.'],
    };
    const [status, message] = errorMap[msg] ?? [500, 'Gagal memproses penolakan.'];
    console.error('[admin/barber-registrations/reject]', err);
    res.status(status).json({ error: { code: msg || 'INTERNAL_ERROR', message } });
  }
}
