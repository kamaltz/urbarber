/**
 * Regression test for approveBarber's required-field validation.
 *
 * barberRegistrations/{uid} docs are written with `shopName`
 * (barber-registration.service.ts saveProfileDraft) -- `businessName` is
 * never written anywhere in this codebase. approveBarber's validation
 * previously checked `regData.businessName?.trim()`, which was always
 * undefined for every real registration, so the check unconditionally threw
 * REGISTRATION_MISSING_BUSINESS_NAME -- no barber could ever be approved
 * through the admin panel. No existing test exercised approveBarber at all,
 * which is why this went undetected.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { approveBarber } from '../src/admin/admin.service.js';
import { db } from '../src/lib/firebase-admin.js';

const BARBER_ID = 'barber-approve-regression';
const ADMIN_UID = 'admin-approve-regression';

async function cleanup() {
  await Promise.all([
    db.collection('users').doc(BARBER_ID).delete(),
    db.collection('barbers').doc(BARBER_ID).delete(),
    db.collection('barberRegistrations').doc(BARBER_ID).delete(),
  ]);
}

async function seed(omitFields: string[] = []) {
  await db.collection('users').doc(BARBER_ID).set({
    role: 'barber',
    status: 'pending_verification',
  });
  await db.collection('barbers').doc(BARBER_ID).set({
    verificationStatus: 'pending',
  });

  const registration: Record<string, any> = {
    ownerName: 'Budi Santoso',
    shopName: 'Budi Barbershop',
    phoneNumber: '081234567890',
    verificationStatus: 'pending',
    submittedAt: new Date().toISOString(),
  };
  for (const field of omitFields) delete registration[field];

  await db.collection('barberRegistrations').doc(BARBER_ID).set(registration);
}

describe('approveBarber required-field validation (regression)', () => {
  beforeEach(cleanup);

  it('approves a real registration that has shopName but no businessName field', async () => {
    await seed();

    const result = await approveBarber(BARBER_ID, ADMIN_UID);
    expect(result.alreadyApproved).toBe(false);

    const [userSnap, barberSnap] = await Promise.all([
      db.collection('users').doc(BARBER_ID).get(),
      db.collection('barbers').doc(BARBER_ID).get(),
    ]);
    expect(userSnap.data()?.status).toBe('active');
    expect(barberSnap.data()?.verificationStatus).toBe('approved');
  });

  it('still rejects a registration missing both shopName and businessName', async () => {
    await seed(['shopName']);

    await expect(approveBarber(BARBER_ID, ADMIN_UID)).rejects.toThrow('REGISTRATION_MISSING_BUSINESS_NAME');
  });

  it('rejects a registration missing ownerName', async () => {
    await seed(['ownerName']);

    await expect(approveBarber(BARBER_ID, ADMIN_UID)).rejects.toThrow('REGISTRATION_MISSING_OWNER_NAME');
  });
});
