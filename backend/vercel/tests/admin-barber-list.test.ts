/**
 * P1-3 (FINAL_THESIS_READINESS_AUDIT.md MEDIUM finding, promoted to P1): admin's
 * barber-list "active"/"suspended" filters query
 * barbers.where('listingStatus','==',filter).orderBy('createdAt','desc')
 * (admin.service.ts getBarberList), which has no matching composite index in
 * firestore.indexes.json -- only verificationStatus-based indexes existed. In real
 * (non-emulator) Firestore this throws FAILED_PRECONDITION. Exercises the actual
 * production function against the Firestore emulator, matching the convention in
 * admin-dashboard-recent-bookings.test.ts.
 */
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getBarberList } from '../src/admin/admin.service.js';
import { db } from '../src/lib/firebase-admin.js';

const ACTIVE_BARBER_ID = 'barber-p1-3-active';
const SUSPENDED_BARBER_ID = 'barber-p1-3-suspended';

function baseBarber(overrides: Record<string, any> = {}) {
  return {
    displayName: 'P1-3 Test Barber',
    verificationStatus: 'approved',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function cleanup() {
  await Promise.all([
    db.collection('barbers').doc(ACTIVE_BARBER_ID).delete(),
    db.collection('barbers').doc(SUSPENDED_BARBER_ID).delete(),
  ]);
}

describe('admin.service.getBarberList listingStatus filter (P1-3)', () => {
  beforeEach(cleanup);
  afterAll(cleanup);

  it('filter=active queries by listingStatus without throwing FAILED_PRECONDITION, and returns only active-listed barbers', async () => {
    await db.collection('barbers').doc(ACTIVE_BARBER_ID).set(baseBarber({ listingStatus: 'active' }));
    await db.collection('barbers').doc(SUSPENDED_BARBER_ID).set(baseBarber({ listingStatus: 'suspended' }));

    const result = await getBarberList('active', {});

    expect(result.items.some((b) => b.uid === ACTIVE_BARBER_ID)).toBe(true);
    expect(result.items.some((b) => b.uid === SUSPENDED_BARBER_ID)).toBe(false);
  });

  it('filter=suspended queries by listingStatus without throwing, and returns only suspended-listed barbers', async () => {
    await db.collection('barbers').doc(ACTIVE_BARBER_ID).set(baseBarber({ listingStatus: 'active' }));
    await db.collection('barbers').doc(SUSPENDED_BARBER_ID).set(baseBarber({ listingStatus: 'suspended' }));

    const result = await getBarberList('suspended', {});

    expect(result.items.some((b) => b.uid === SUSPENDED_BARBER_ID)).toBe(true);
    expect(result.items.some((b) => b.uid === ACTIVE_BARBER_ID)).toBe(false);
  });
});
