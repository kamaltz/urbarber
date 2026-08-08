/**
 * POST /api/admin/categories/update
 * Updates a service category (name, description, icon, active, order).
 * Uses soft-deactivation instead of hard delete.
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

  const { categoryId, name, description, icon, active, order } = (req.body ?? {}) as {
    categoryId?: string;
    name?: string;
    description?: string;
    icon?: string;
    active?: boolean;
    order?: number;
  };

  if (!categoryId || typeof categoryId !== 'string' || !categoryId.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_CATEGORY_ID', message: 'categoryId wajib diisi.' } });
  }

  try {
    const docRef  = db.collection('categories').doc(categoryId.trim());
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Kategori tidak ditemukan.' } });
    }

    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp(), updatedBy: admin.uid };

    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ error: { code: 'INVALID_NAME', message: 'Nama kategori tidak boleh kosong.' } });
      if (trimmed.length > 100) return res.status(400).json({ error: { code: 'NAME_TOO_LONG', message: 'Nama kategori maksimal 100 karakter.' } });
      updates.name = trimmed;
    }
    if (typeof description === 'string') updates.description = description.trim() || null;
    if (typeof icon        === 'string') updates.icon = icon.trim() || null;
    if (typeof active      === 'boolean') updates.active = active;
    if (typeof order       === 'number' && Number.isFinite(order)) updates.order = Math.floor(order);

    await docRef.update(updates);
    res.status(200).json({ success: true, message: 'Kategori berhasil diperbarui.' });
  } catch (err) {
    console.error('[admin/categories/update]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memperbarui kategori.' } });
  }
}
