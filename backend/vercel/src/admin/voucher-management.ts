/**
 * Admin-facing voucher CRUD. Backend-authoritative: the browser never writes
 * vouchers/{code} directly (Firestore rules are default-deny for this
 * collection -- see voucher-service.ts). Eligibility/redemption logic lives
 * in voucher-service.ts / reconcile-transaction.ts; this module only owns
 * the admin management surface (create/edit/activate/deactivate/list).
 */
import { db } from '../lib/firebase-admin.js';
import { normalizeVoucherCode } from '../payments/voucher-service.js';
import type { AdminVoucher, VoucherCreateRequest, VoucherListFilters, VoucherUpdateRequest } from './admin.types.js';
import { logAdminEvent } from './audit-log.js';

const VOUCHER_LIST_FETCH_CAP = 200;

export class VoucherAlreadyExistsError extends Error {
  constructor() {
    super('VOUCHER_ALREADY_EXISTS');
    this.name = 'VoucherAlreadyExistsError';
  }
}

export class VoucherNotFoundError extends Error {
  constructor() {
    super('VOUCHER_NOT_FOUND');
    this.name = 'VoucherNotFoundError';
  }
}

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return undefined;
}

function normalizeVoucherDoc(code: string, data: FirebaseFirestore.DocumentData): AdminVoucher {
  return {
    code,
    name: data.name,
    description: data.description,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxDiscountAmount: data.maxDiscountAmount,
    minimumBaseAmount: data.minimumBaseAmount,
    validFrom: toIso(data.validFrom) || data.validFrom,
    validUntil: toIso(data.validUntil) || data.validUntil,
    usageLimit: data.usageLimit,
    usageCount: data.usageCount ?? 0,
    perUserLimit: data.perUserLimit,
    status: data.status,
    createdAt: toIso(data.createdAt) || data.createdAt,
    updatedAt: toIso(data.updatedAt) || data.updatedAt,
    createdBy: data.createdBy,
  };
}

/**
 * Small, admin-managed collection -- fetched in full (bounded by
 * VOUCHER_LIST_FETCH_CAP) and filtered/searched in-memory rather than
 * building composite Firestore indexes for every status+search combination.
 */
export async function getVouchersList(filters: VoucherListFilters = {}): Promise<AdminVoucher[]> {
  const snap = await db.collection('vouchers').orderBy('createdAt', 'desc').limit(VOUCHER_LIST_FETCH_CAP).get();
  let vouchers = snap.docs.map((d) => normalizeVoucherDoc(d.id, d.data()));

  if (filters.status && filters.status !== 'all') {
    vouchers = vouchers.filter((v) => v.status === filters.status);
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim().toUpperCase();
    vouchers = vouchers.filter(
      (v) => v.code.includes(term) || v.name?.toUpperCase().includes(term)
    );
  }

  return vouchers;
}

export async function getVoucherDetail(rawCode: string): Promise<AdminVoucher | null> {
  const code = normalizeVoucherCode(rawCode);
  const snap = await db.collection('vouchers').doc(code).get();
  if (!snap.exists) return null;
  return normalizeVoucherDoc(code, snap.data()!);
}

export async function createVoucherForAdmin(
  req: VoucherCreateRequest,
  adminUid: string
): Promise<AdminVoucher> {
  const code = normalizeVoucherCode(req.code);
  const ref = db.collection('vouchers').doc(code);

  const existing = await ref.get();
  if (existing.exists) {
    throw new VoucherAlreadyExistsError();
  }

  const now = new Date().toISOString();
  const doc: Record<string, unknown> = {
    code,
    name: req.name.trim(),
    description: req.description?.trim() || '',
    discountType: req.discountType,
    discountValue: req.discountValue,
    validFrom: req.validFrom,
    validUntil: req.validUntil,
    usageCount: 0,
    status: req.status === 'inactive' ? 'inactive' : 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: adminUid,
  };
  if (req.maxDiscountAmount !== undefined) doc.maxDiscountAmount = req.maxDiscountAmount;
  if (req.minimumBaseAmount !== undefined) doc.minimumBaseAmount = req.minimumBaseAmount;
  if (req.usageLimit !== undefined) doc.usageLimit = req.usageLimit;
  if (req.perUserLimit !== undefined) doc.perUserLimit = req.perUserLimit;

  await ref.set(doc);
  await logAdminEvent(adminUid, 'VOUCHER_CREATED', code, {
    discountType: req.discountType,
    discountValue: req.discountValue,
  });

  return normalizeVoucherDoc(code, doc);
}

export async function updateVoucherForAdmin(
  rawCode: string,
  req: VoucherUpdateRequest,
  adminUid: string
): Promise<AdminVoucher> {
  const code = normalizeVoucherCode(rawCode);
  const ref = db.collection('vouchers').doc(code);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new VoucherNotFoundError();
  }

  const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: adminUid };
  if (req.name !== undefined) update.name = req.name.trim();
  if (req.description !== undefined) update.description = req.description?.trim() || '';
  if (req.discountType !== undefined) update.discountType = req.discountType;
  if (req.discountValue !== undefined) update.discountValue = req.discountValue;
  if (req.maxDiscountAmount !== undefined) update.maxDiscountAmount = req.maxDiscountAmount;
  if (req.minimumBaseAmount !== undefined) update.minimumBaseAmount = req.minimumBaseAmount;
  if (req.validFrom !== undefined) update.validFrom = req.validFrom;
  if (req.validUntil !== undefined) update.validUntil = req.validUntil;
  if (req.usageLimit !== undefined) update.usageLimit = req.usageLimit;
  if (req.perUserLimit !== undefined) update.perUserLimit = req.perUserLimit;

  await ref.update(update);
  await logAdminEvent(adminUid, 'VOUCHER_UPDATED', code, update);

  const updated = await ref.get();
  return normalizeVoucherDoc(code, updated.data()!);
}

export async function setVoucherStatusForAdmin(
  rawCode: string,
  status: 'active' | 'inactive',
  adminUid: string
): Promise<AdminVoucher> {
  const code = normalizeVoucherCode(rawCode);
  const ref = db.collection('vouchers').doc(code);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new VoucherNotFoundError();
  }

  const now = new Date().toISOString();
  await ref.update({ status, updatedAt: now, updatedBy: adminUid });
  await logAdminEvent(adminUid, status === 'active' ? 'VOUCHER_ACTIVATED' : 'VOUCHER_DISABLED', code);

  const updated = await ref.get();
  return normalizeVoucherDoc(code, updated.data()!);
}
