import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/lib/firebase-admin.js';
import { normalizeVoucherCode, resolveVoucherForBooking, voucherUserRedemptionDocId } from '../src/payments/voucher-service.js';

const CUSTOMER_ID = 'cust-voucher-1';

function baseVoucher(overrides: Record<string, any> = {}) {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  return {
    code: 'HEMAT10',
    name: 'Hemat 10rb',
    discountType: 'fixed',
    discountValue: 10000,
    validFrom: past,
    validUntil: future,
    usageCount: 0,
    status: 'active',
    createdAt: past,
    updatedAt: past,
    createdBy: 'admin-1',
    ...overrides,
  };
}

async function seedVoucher(code: string, overrides: Record<string, any> = {}) {
  await db.collection('vouchers').doc(code).set(baseVoucher({ code, ...overrides }));
}

describe('normalizeVoucherCode', () => {
  it('uppercases, trims, and strips internal whitespace', () => {
    expect(normalizeVoucherCode('  hemat 10 ')).toBe('HEMAT10');
    expect(normalizeVoucherCode('Hemat10')).toBe('HEMAT10');
  });
});

describe('resolveVoucherForBooking', () => {
  beforeEach(async () => {
    const codes = ['HEMAT10', 'INAKTIF', 'BELUMMULAI', 'KADALUWARSA', 'MINSPEND', 'HABISKUOTA', 'HABISUSER'];
    await Promise.all(codes.map((code) => db.collection('vouchers').doc(code).delete()));
    await db.collection('voucherUserRedemptions').doc(voucherUserRedemptionDocId('HABISUSER', CUSTOMER_ID)).delete();
  });

  it('resolves a valid voucher (also accepting lowercase/whitespace input)', async () => {
    await seedVoucher('HEMAT10');
    const result = await resolveVoucherForBooking(' hemat10 ', CUSTOMER_ID, 50000);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.voucher.code).toBe('HEMAT10');
      expect(result.voucher.discountValue).toBe(10000);
    }
  });

  it('rejects a code that does not exist', async () => {
    const result = await resolveVoucherForBooking('TIDAKADA', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'NOT_FOUND' });
  });

  it('rejects an inactive voucher', async () => {
    await seedVoucher('INAKTIF', { status: 'inactive' });
    const result = await resolveVoucherForBooking('INAKTIF', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'INACTIVE' });
  });

  it('rejects a voucher that has not started yet', async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await seedVoucher('BELUMMULAI', { validFrom: future });
    const result = await resolveVoucherForBooking('BELUMMULAI', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'NOT_STARTED' });
  });

  it('rejects an expired voucher', async () => {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const morePast = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    await seedVoucher('KADALUWARSA', { validFrom: morePast, validUntil: past });
    const result = await resolveVoucherForBooking('KADALUWARSA', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'EXPIRED' });
  });

  it('rejects when base amount is below the minimum spend', async () => {
    await seedVoucher('MINSPEND', { minimumBaseAmount: 100000 });
    const result = await resolveVoucherForBooking('MINSPEND', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'MINIMUM_NOT_MET' });
  });

  it('rejects when the global usage limit has been reached', async () => {
    await seedVoucher('HABISKUOTA', { usageLimit: 5, usageCount: 5 });
    const result = await resolveVoucherForBooking('HABISKUOTA', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'USAGE_LIMIT_REACHED' });
  });

  it('rejects when the per-user limit has been reached', async () => {
    await seedVoucher('HABISUSER', { perUserLimit: 1 });
    await db.collection('voucherUserRedemptions').doc(voucherUserRedemptionDocId('HABISUSER', CUSTOMER_ID)).set({ count: 1 });
    const result = await resolveVoucherForBooking('HABISUSER', CUSTOMER_ID, 50000);
    expect(result).toEqual({ valid: false, reason: 'PER_USER_LIMIT_REACHED' });
  });
});
