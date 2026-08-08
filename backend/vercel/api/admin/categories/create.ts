/**
 * POST /api/admin/categories/create
 * Creates a new service category (admin-only).
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { db } from '../../../src/lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { name, description, icon, order } = (req.body ?? {}) as {
    name?: string;
    description?: string;
    icon?: string;
    order?: number;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_NAME', message: 'Nama kategori wajib diisi.' } });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: { code: 'NAME_TOO_LONG', message: 'Nama kategori maksimal 100 karakter.' } });
  }

  try {
    const safeOrder = typeof order === 'number' && Number.isFinite(order) ? Math.floor(order) : 0;
    const now = FieldValue.serverTimestamp();

    const docRef = await db.collection('categories').add({
      name: name.trim(),
      description: typeof description === 'string' ? description.trim() : null,
      icon: typeof icon === 'string' ? icon.trim() : null,
      active: true,
      order: safeOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.uid,
    });

    res.status(201).json({ success: true, id: docRef.id, message: 'Kategori berhasil dibuat.' });
  } catch (err) {
    console.error('[admin/categories/create]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal membuat kategori.' } });
  }
}
