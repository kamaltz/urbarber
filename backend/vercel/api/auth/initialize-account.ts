import type { VercelRequest, VercelResponse } from '@vercel/node';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, db } from '../../src/lib/firebase-admin.js';
import { handleCors } from '../../src/lib/cors.js';

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
      error: { code: 'UNAUTHENTICATED', message: 'Token Firebase tidak valid atau telah kadaluwarsa.' },
    });
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email || '';

  const { requestedRole, name, phoneNumber } = req.body || {};

  // Validate requestedRole
  if (!requestedRole || (requestedRole !== 'customer' && requestedRole !== 'barber')) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ROLE',
        message: 'Role yang diminta harus "customer" atau "barber". Pendaftaran admin tidak diizinkan.',
      },
    });
  }

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

  if (!cleanName) {
    return res.status(400).json({
      error: { code: 'INVALID_INPUT', message: 'Nama lengkap wajib diisi.' },
    });
  }

  try {
    const bootstrapRef = db.collection('accountBootstraps').doc(uid);
    const bootstrapSnap = await bootstrapRef.get();

    if (bootstrapSnap.exists) {
      const existingData = bootstrapSnap.data();
      if (existingData?.requestedRole && existingData.requestedRole !== requestedRole) {
        return res.status(400).json({
          error: {
            code: 'ROLE_ALREADY_INITIALIZED',
            message: `Akun ini sudah diinisialisasi sebagai ${existingData.requestedRole} dan tidak dapat diubah.`,
          },
        });
      }
    }

    const now = FieldValue.serverTimestamp();
    const userStatus = requestedRole === 'customer' ? 'active' : 'pending_verification';
    const onboardingStatus = requestedRole === 'customer' ? 'completed' : 'account_created';
    const nextRoute =
      requestedRole === 'customer'
        ? '/(customer)/home'
        : '/(barber-onboarding)/profile';

    // Set custom user claims via Firebase Admin SDK
    await adminAuth.setCustomUserClaims(uid, {
      role: 'authenticated',
      app_role: requestedRole,
    });

    const batch = db.batch();

    // 1. Write accountBootstraps/{uid}
    batch.set(
      bootstrapRef,
      {
        uid,
        requestedRole,
        state: 'completed',
        updatedAt: now,
        createdAt: bootstrapSnap.exists ? bootstrapSnap.data()?.createdAt || now : now,
      },
      { merge: true }
    );

    // 2. Write users/{uid}
    const userRef = db.collection('users').doc(uid);
    batch.set(
      userRef,
      {
        uid,
        email,
        name: cleanName,
        phoneNumber: cleanPhone,
        role: requestedRole,
        status: userStatus,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    if (requestedRole === 'customer') {
      // 3a. Write customers/{uid} (Only for Customer)
      const customerRef = db.collection('customers').doc(uid);
      batch.set(
        customerRef,
        {
          uid,
          userId: uid,
          email,
          fullName: cleanName,
          name: cleanName,
          phoneNumber: cleanPhone,
          profileImageUrl: null,
          profileImagePath: null,
          role: 'customer',
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );
    } else if (requestedRole === 'barber') {
      // 3b. Write barbers/{uid} & barberRegistrations/{uid} (Only for Barber)
      const barberRef = db.collection('barbers').doc(uid);
      batch.set(
        barberRef,
        {
          id: uid,
          uid,
          userId: uid,
          name: cleanName,
          displayName: cleanName,
          ownerName: cleanName,
          shopName: cleanName,
          phoneNumber: cleanPhone,
          address: '',
          ratingAverage: 0,
          reviewCount: 0,
          verified: false,
          verificationStatus: 'draft',
          listingStatus: 'inactive',
          onboardingStatus: 'account_created',
          status: 'active',
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );

      const registrationRef = db.collection('barberRegistrations').doc(uid);
      batch.set(
        registrationRef,
        {
          id: uid,
          barberId: uid,
          userId: uid,
          ownerName: cleanName,
          phoneNumber: cleanPhone,
          profileCompleted: false,
          documentsCompleted: false,
          documentPaths: {},
          verificationStatus: 'draft',
          onboardingStatus: 'account_created',
          updatedAt: now,
          createdAt: now,
        },
        { merge: true }
      );
    }

    await batch.commit();

    return res.status(200).json({
      success: true,
      uid,
      appRole: requestedRole,
      userStatus,
      onboardingStatus,
      nextRoute,
    });
  } catch (err: any) {
    console.error('[initialize-account error]:', err);
    return res.status(500).json({
      error: { code: 'INITIALIZATION_FAILED', message: 'Gagal menginisialisasi akun pengguna.' },
    });
  }
}
