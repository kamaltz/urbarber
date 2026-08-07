import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from '../../../src/lib/firebase-admin.js';
import { handleCors } from '../../../src/lib/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method tidak diizinkan.' } });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Header Authorization Bearer token tidak ditemukan.' },
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token terautentikasi tidak valid.' },
    });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (err: any) {
    return res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Token Firebase tidak valid atau kadaluwarsa.' },
    });
  }

  const uid = decodedToken.uid;
  const appRole = decodedToken.app_role;

  if (appRole !== 'barber') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Hanya akun Mitra Barber yang dapat mengajukan pendaftaran.' },
    });
  }

  try {
    // 1. Verify emailVerified via Firebase Admin user record
    const userRecord = await adminAuth.getUser(uid);
    if (!userRecord.emailVerified) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email Anda belum terverifikasi. Verifikasi email sebelum mengirim pendaftaran.',
        },
      });
    }

    // 2. Load Firestore documents
    const userDocRef = db.collection('users').doc(uid);
    const barberDocRef = db.collection('barbers').doc(uid);
    const regDocRef = db.collection('barberRegistrations').doc(uid);

    const [userSnap, barberSnap, regSnap] = await Promise.all([
      userDocRef.get(),
      barberDocRef.get(),
      regDocRef.get(),
    ]);

    if (!userSnap.exists || userSnap.data()?.role !== 'barber') {
      return res.status(400).json({
        error: { code: 'INVALID_USER_ROLE', message: 'Data pengguna barber tidak valid.' },
      });
    }

    if (!regSnap.exists) {
      return res.status(400).json({
        error: { code: 'REGISTRATION_NOT_FOUND', message: 'Dokumen pendaftaran barber tidak ditemukan.' },
      });
    }

    const regData = regSnap.data() || {};
    const currentVerifStatus = regData.verificationStatus || 'draft';

    if (currentVerifStatus === 'pending') {
      return res.status(400).json({
        error: { code: 'ALREADY_PENDING', message: 'Pendaftaran Anda sedang dalam proses peninjauan.' },
      });
    }

    if (currentVerifStatus === 'approved') {
      return res.status(400).json({
        error: { code: 'ALREADY_APPROVED', message: 'Pendaftaran Anda sudah disetujui.' },
      });
    }

    // 3. Verify onboarding profile & document paths
    const docPaths: Record<string, string> = regData.documentPaths || {};
    const requiredTypes = ['ktp']; // KTP is mandatory identity document

    for (const reqType of requiredTypes) {
      if (!docPaths[reqType] || typeof docPaths[reqType] !== 'string') {
        return res.status(400).json({
          error: { code: 'MISSING_DOCUMENTS', message: `Dokumen wajib (${reqType.toUpperCase()}) belum diunggah.` },
        });
      }
    }

    // Validate path prefix ownership
    const expectedPrefix = `${uid}/`;
    for (const [docKey, pathVal] of Object.entries(docPaths)) {
      if (typeof pathVal === 'string' && !pathVal.startsWith(expectedPrefix)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_DOCUMENT_PATH',
            message: `Jalur dokumen ${docKey} tidak valid atau tidak dimiliki oleh UID Anda.`,
          },
        });
      }
    }

    // 4. Update status atomically
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();

    batch.update(regDocRef, {
      verificationStatus: 'pending',
      onboardingStatus: 'submitted',
      submittedAt: now,
      updatedAt: now,
    });

    batch.update(barberDocRef, {
      verificationStatus: 'pending',
      onboardingStatus: 'submitted',
      listingStatus: 'inactive',
      updatedAt: now,
    });

    batch.update(userDocRef, {
      status: 'pending_verification',
      updatedAt: now,
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      verificationStatus: 'pending',
      onboardingStatus: 'submitted',
      nextRoute: '/(barber-onboarding)/status',
    });
  } catch (err: any) {
    console.error('[barber registration submit error]:', err);
    return res.status(500).json({
      error: { code: 'SUBMIT_FAILED', message: 'Gagal mengirimkan pendaftaran barber.' },
    });
  }
}
