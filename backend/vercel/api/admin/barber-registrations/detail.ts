/**
 * POST /api/admin/barber-registrations/detail
 * Returns full registration detail for a specific barber.
 * Excludes raw document storage paths from the response.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../../../src/lib/cors.js';
import { requireAdmin } from '../../../src/admin/admin-auth.js';
import { db } from '../../../src/lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['POST', 'OPTIONS'])) return;

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { barberId } = (req.body ?? {}) as { barberId?: string };
  if (!barberId || typeof barberId !== 'string' || !barberId.trim()) {
    return res.status(400).json({ error: { code: 'MISSING_BARBER_ID', message: 'barberId wajib diisi.' } });
  }

  try {
    const [regSnap, barberSnap, userSnap] = await Promise.all([
      db.collection('barberRegistrations').doc(barberId).get(),
      db.collection('barbers').doc(barberId).get(),
      db.collection('users').doc(barberId).get(),
    ]);

    if (!regSnap.exists) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Data registrasi tidak ditemukan.' } });
    }

    const reg = regSnap.data()!;
    const barber = barberSnap.data() ?? {};
    const user   = userSnap.data() ?? {};

    // Determine which document types are available (without exposing actual paths)
    const documents: Record<string, boolean> = {};
    if (reg.documents && typeof reg.documents === 'object') {
      for (const [key, val] of Object.entries(reg.documents)) {
        documents[key] = typeof val === 'string' && val.trim().length > 0;
      }
    }

    res.status(200).json({
      data: {
        barberId,
        ownerName: reg.ownerName ?? '',
        businessName: reg.businessName ?? '',
        phoneNumber: reg.phoneNumber ?? null,
        businessAddress: reg.businessAddress ?? null,
        serviceArea: reg.serviceArea ?? null,
        verificationStatus: reg.verificationStatus,
        onboardingStatus: reg.onboardingStatus ?? null,
        rejectionReason: reg.rejectionReason ?? null,
        submittedAt: reg.submittedAt ?? null,
        reviewedAt: reg.reviewedAt ?? null,
        reviewedBy: reg.reviewedBy ?? null,
        // Document availability flags (not paths)
        availableDocuments: documents,
        // Public barber profile fields
        displayName: barber.displayName ?? barber.ownerName ?? '',
        profileImageUrl: barber.profileImageUrl ?? null,
        ratingAverage: barber.ratingAverage ?? 0,
        reviewCount: barber.reviewCount ?? 0,
        listingStatus: barber.listingStatus ?? null,
        // User account
        email: user.email ?? '',
        userStatus: user.status ?? 'pending_verification',
      },
    });
  } catch (err) {
    console.error('[admin/barber-registrations/detail]', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Gagal memuat detail registrasi.' } });
  }
}
