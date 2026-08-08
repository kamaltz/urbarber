/**
 * POST /api/admin/barber-registrations/document-url
 * Generates a short-lived signed URL for a private verification document.
 *
 * SECURITY:
 * - Admin token required.
 * - Object path is ALWAYS retrieved from Firestore, never from request body.
 * - Signed URLs have 5-minute expiry and must not be logged or stored.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { generatePrivateDocUrl } from '../../../src/admin/admin.service.js';
import { validateDocumentType } from '../../../src/admin/admin.validation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { barberId, documentType } = (req.body ?? {}) as {
    barberId?: string;
    documentType?: string;
  };

  if (!barberId || typeof barberId !== 'string' || !barberId.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_BARBER_ID', message: 'barberId wajib diisi.' } });
  }

  const docValidation = validateDocumentType(documentType);
  if (!docValidation.valid) {
    return res.status(400).json({ error: { code: 'INVALID_DOCUMENT_TYPE', message: docValidation.message } });
  }

  try {
    const result = await generatePrivateDocUrl(barberId.trim(), documentType as string);

    // Return only the temporary URL and expiry — never credentials or paths
    res.status(200).json({
      url: result.url,
      expiresAt: result.expiresAt,
    });
  } catch (err: any) {
    const msg = err?.message ?? '';
    const errorMap: Record<string, [number, string]> = {
      REGISTRATION_NOT_FOUND: [404, 'Data registrasi tidak ditemukan.'],
      DOCUMENT_NOT_FOUND:     [404, 'Dokumen tidak tersedia.'],
      DOCUMENT_PATH_INVALID:  [400, 'Path dokumen tidak valid.'],
      SIGNED_URL_FAILED:      [502, 'Gagal membuat tautan dokumen sementara.'],
    };
    const [status, message] = errorMap[msg] ?? [500, 'Gagal memproses permintaan dokumen.'];
    // Do NOT log actual storage paths or URLs
    console.error(`[admin/document-url] Error for barberId=${barberId}: ${msg}`);
    res.status(status).json({ error: { code: msg || 'INTERNAL_ERROR', message } });
  }
}
