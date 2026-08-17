/**
 * Voucher eligibility resolution -- single source of truth used by both the
 * checkout-preview endpoint (POST /api/payments/voucher/validate) and payment
 * creation (POST /api/payments/create), so they can never disagree about
 * whether a code is valid. This is eligibility-only: it never mutates usage
 * counters. Counter increments happen exactly once, at the payment-paid
 * transition inside reconcile-transaction.ts -- see that file for why.
 */
import { db } from '../lib/firebase-admin.js';
import type { ResolvedVoucherForPricing } from './pricing-calculator.js';

export type VoucherInvalidReason =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MINIMUM_NOT_MET'
  | 'USAGE_LIMIT_REACHED'
  | 'PER_USER_LIMIT_REACHED';

export interface VoucherRecord {
  code: string;
  name: string;
  description?: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number;
  minimumBaseAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ResolveVoucherResult =
  | { valid: true; voucher: ResolvedVoucherForPricing }
  | { valid: false; reason: VoucherInvalidReason };

/** Normalizes a customer-entered code: uppercase, trimmed, internal whitespace collapsed. */
export function normalizeVoucherCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/\s+/g, '');
}

export function voucherUserRedemptionDocId(code: string, customerId: string): string {
  return `${code}_${customerId}`;
}

export async function resolveVoucherForBooking(
  rawCode: string,
  customerId: string,
  baseAmount: number
): Promise<ResolveVoucherResult> {
  const code = normalizeVoucherCode(rawCode);

  const voucherSnap = await db.collection('vouchers').doc(code).get();
  if (!voucherSnap.exists) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  const voucher = voucherSnap.data() as VoucherRecord;

  if (voucher.status !== 'active') {
    return { valid: false, reason: 'INACTIVE' };
  }

  const now = new Date();
  if (voucher.validFrom && now < new Date(voucher.validFrom)) {
    return { valid: false, reason: 'NOT_STARTED' };
  }
  if (voucher.validUntil && now > new Date(voucher.validUntil)) {
    return { valid: false, reason: 'EXPIRED' };
  }

  if (voucher.minimumBaseAmount !== undefined && baseAmount < voucher.minimumBaseAmount) {
    return { valid: false, reason: 'MINIMUM_NOT_MET' };
  }

  if (voucher.usageLimit !== undefined && voucher.usageCount >= voucher.usageLimit) {
    return { valid: false, reason: 'USAGE_LIMIT_REACHED' };
  }

  if (voucher.perUserLimit !== undefined) {
    const userRedemptionSnap = await db
      .collection('voucherUserRedemptions')
      .doc(voucherUserRedemptionDocId(code, customerId))
      .get();
    const userCount = userRedemptionSnap.exists ? (userRedemptionSnap.data()?.count ?? 0) : 0;
    if (userCount >= voucher.perUserLimit) {
      return { valid: false, reason: 'PER_USER_LIMIT_REACHED' };
    }
  }

  return {
    valid: true,
    voucher: {
      code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscountAmount: voucher.maxDiscountAmount,
    },
  };
}

export function voucherInvalidMessage(reason: VoucherInvalidReason): string {
  switch (reason) {
    case 'NOT_FOUND':
      return 'Kode voucher tidak ditemukan.';
    case 'INACTIVE':
      return 'Voucher ini sedang tidak aktif.';
    case 'NOT_STARTED':
      return 'Voucher ini belum berlaku.';
    case 'EXPIRED':
      return 'Voucher ini sudah kedaluwarsa.';
    case 'MINIMUM_NOT_MET':
      return 'Total belanja belum memenuhi syarat minimum voucher ini.';
    case 'USAGE_LIMIT_REACHED':
      return 'Voucher ini sudah mencapai batas penggunaan.';
    case 'PER_USER_LIMIT_REACHED':
      return 'Anda sudah mencapai batas penggunaan voucher ini.';
    default:
      return 'Voucher tidak valid.';
  }
}
