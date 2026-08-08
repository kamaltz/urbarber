/**
 * POST /api/admin/barber-registrations/approve
 * Approves a pending barber registration (atomic, idempotent).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { approveBarber } from '../../../src/admin/admin.service.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { barberId } = (req.body ?? {}) as { barberId?: string };
  if (!barberId || typeof barberId !== 'string' || !barberId.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_BARBER_ID', message: 'barberId wajib diisi.' } });
  }

  try {
    const result = await approveBarber(barberId.trim(), admin.uid);
    res.status(200).json({
      success: true,
      alreadyApproved: result.alreadyApproved,
      message: result.alreadyApproved
        ? 'Barber sudah dalam status approved.'
        : 'Barber berhasil disetujui.',
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    const errorMap: Record<string, [number, string]> = {
      USER_NOT_FOUND:          [404, 'Akun barber tidak ditemukan.'],
      USER_NOT_BARBER:         [400, 'Pengguna ini bukan barber.'],
      USER_NOT_PENDING:        [409, 'Status akun tidak dalam pending_verification.'],
      REGISTRATION_NOT_FOUND:  [404, 'Data registrasi tidak ditemukan.'],
      REGISTRATION_NOT_PENDING:[409, 'Registrasi sudah diproses atau tidak dalam status pending.'],
      REGISTRATION_MISSING_OWNER_NAME: [400, 'Data registrasi tidak lengkap (ownerName).'],
    };
    const [status, message] = errorMap[msg] ?? [500, 'Gagal memproses persetujuan.'];
    console.error('[admin/barber-registrations/approve]', err);
    res.status(status).json({ error: { code: msg || 'INTERNAL_ERROR', message } });
  }
}
