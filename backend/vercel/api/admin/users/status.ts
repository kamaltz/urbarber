/**
 * POST /api/admin/users/status
 * Suspend or reactivate a user account (atomic, idempotent).
 * Admin cannot suspend themselves through this endpoint.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { updateUserStatus } from '../../../src/admin/admin.service.js';
import { validateTargetStatus } from '../../../src/admin/admin.validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { userId, targetStatus, reason } = (req.body ?? {}) as {
    userId?: string;
    targetStatus?: string;
    reason?: string;
  };

  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_USER_ID', message: 'userId wajib diisi.' } });
  }

  // Admin cannot suspend themselves
  if (userId.trim() === admin.uid) {
    return res.status(400).json({
      error: { code: 'SELF_SUSPEND_DENIED', message: 'Admin tidak dapat menangguhkan akun sendiri melalui endpoint ini.' },
    });
  }

  const statusValidation = validateTargetStatus(targetStatus);
  if (!statusValidation.valid) {
    return res.status(400).json({ error: { code: 'INVALID_STATUS', message: statusValidation.message } });
  }

  try {
    const result = await updateUserStatus(
      userId.trim(),
      targetStatus as 'active' | 'suspended',
      typeof reason === 'string' ? reason : '',
      admin.uid,
    );

    res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      message: result.idempotent
        ? `Pengguna sudah dalam status ${targetStatus}.`
        : `Status pengguna berhasil diubah ke ${targetStatus}.`,
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    if (msg === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Pengguna tidak ditemukan.' } });
    }
    console.error('[admin/users/status]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memperbarui status pengguna.' } });
  }
}
