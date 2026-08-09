/**
 * Batch 09F-3: P2_ADMIN_RAW_DOCUMENT_PATHS
 *
 * getBarberRegistrationDetail already stripped raw Supabase documentPaths (Batch
 * 09D-2B), but getBarberRegistrations (list) and getDashboardMetrics's
 * recentBarberRegistrations both spread `...d.data()` directly, leaking raw private
 * storage object paths to the Admin browser in responses that never render them.
 *
 * Exercises the actual production functions (admin.service.ts) against the
 * Firestore emulator directly -- no HTTP layer involved, matching the convention in
 * payment-sync-reconciliation.test.ts.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getBarberRegistrationDetail, getBarberRegistrations, getDashboardMetrics } from '../src/admin/admin.service.js';
import { db } from '../src/lib/firebase-admin.js';

const BARBER_ID = 'barber-09f-3-privacy';

function baseRegistration(overrides: Record<string, any> = {}) {
  return {
    ownerName: 'Budi Santoso',
    businessName: 'Budi Barbershop',
    phoneNumber: '081234567890',
    businessAddress: 'Jl. Merdeka No. 1',
    serviceArea: 'Jakarta Pusat',
    verificationStatus: 'pending',
    submittedAt: new Date().toISOString(),
    documentPaths: {
      ktp: `${BARBER_ID}/ktp.jpg`,
      business_license: `${BARBER_ID}/business_license.pdf`,
      // certificate intentionally omitted -- not every registration uploads one
    },
    ...overrides,
  };
}

async function cleanup() {
  await db.collection('barberRegistrations').doc(BARBER_ID).delete();
}

describe('Admin registration responses never leak raw documentPaths (Batch 09F-3)', () => {
  beforeEach(cleanup);

  it('registration list response contains no documentPaths, but retains other fields', async () => {
    await db.collection('barberRegistrations').doc(BARBER_ID).set(baseRegistration());

    const result = await getBarberRegistrations('pending', { pageSize: 100 });
    const found = result.items.find((r) => r.barberId === BARBER_ID);

    expect(found).toBeDefined();
    expect(found).not.toHaveProperty('documentPaths');
    expect(JSON.stringify(found)).not.toContain('documentPaths');
    // Other fields the list UI actually renders must survive.
    expect(found?.businessName).toBe('Budi Barbershop');
    expect(found?.ownerName).toBe('Budi Santoso');
    expect(found?.verificationStatus).toBe('pending');
  });

  it('dashboard recentBarberRegistrations contains no documentPaths, but retains other fields', async () => {
    await db.collection('barberRegistrations').doc(BARBER_ID).set(baseRegistration());

    const metrics = await getDashboardMetrics();
    const found = metrics.recentBarberRegistrations.find((r) => r.barberId === BARBER_ID);

    expect(found).toBeDefined();
    expect(found).not.toHaveProperty('documentPaths');
    expect(JSON.stringify(found)).not.toContain('documentPaths');
    expect(found?.businessName).toBe('Budi Barbershop');
    expect(found?.ownerName).toBe('Budi Santoso');
  });

  it('registration detail response contains no documentPaths (pre-existing 09D-2B guarantee, reconfirmed)', async () => {
    await db.collection('barberRegistrations').doc(BARBER_ID).set(baseRegistration());

    const detail = await getBarberRegistrationDetail(BARBER_ID);

    expect(detail).not.toBeNull();
    expect(detail).not.toHaveProperty('documentPaths');
    expect(JSON.stringify(detail)).not.toContain('documentPaths');
    expect(JSON.stringify(detail)).not.toContain('.jpg');
    expect(JSON.stringify(detail)).not.toContain('.pdf');
  });

  it('registration detail documentsAvailable correctly reflects which document types were actually uploaded', async () => {
    await db.collection('barberRegistrations').doc(BARBER_ID).set(baseRegistration());

    const detail = await getBarberRegistrationDetail(BARBER_ID);

    expect(detail?.documentsAvailable).toEqual({
      ktp: true,
      business_license: true,
      certificate: false, // never uploaded in this fixture
    });
  });

  it('registration detail documentsAvailable is all-false when no documents were uploaded at all', async () => {
    const registration = baseRegistration();
    delete (registration as Record<string, any>).documentPaths;
    await db.collection('barberRegistrations').doc(BARBER_ID).set(registration);

    const detail = await getBarberRegistrationDetail(BARBER_ID);

    expect(detail?.documentsAvailable).toEqual({
      ktp: false,
      business_license: false,
      certificate: false,
    });
  });
});
