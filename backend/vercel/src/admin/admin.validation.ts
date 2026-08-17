/**
 * Admin Validation Helpers
 * Input validation for admin operations.
 */

export const MAX_REJECTION_REASON_LENGTH = 1000;
export const MAX_CATEGORY_NAME_LENGTH = 100;
export const MAX_CATEGORY_DESCRIPTION_LENGTH = 500;
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

// Must match the document types actually written by the mobile upload flow
// (src/app/(barber-onboarding)/documents.tsx + barber-registration.service.ts),
// which are the only real keys that ever exist under barberRegistrations/{uid}.documentPaths.
export const ALLOWED_DOC_TYPES = new Set(['ktp', 'business_license', 'certificate']);
export const ALLOWED_TARGET_STATUSES = new Set(['active', 'suspended']);

/**
 * Validate rejection reason for barber registration rejection.
 */
export function validateRejectionReason(reason: unknown): { valid: boolean; message?: string } {
  if (typeof reason !== 'string') {
    return { valid: false, message: 'Alasan penolakan harus berupa teks.' };
  }
  const trimmed = reason.trim();
  if (!trimmed) {
    return { valid: false, message: 'Alasan penolakan tidak boleh kosong.' };
  }
  if (trimmed.length > MAX_REJECTION_REASON_LENGTH) {
    return {
      valid: false,
      message: `Alasan penolakan maksimal ${MAX_REJECTION_REASON_LENGTH} karakter.`,
    };
  }
  return { valid: true };
}

/**
 * Validate target status for user suspension/reactivation.
 */
export function validateTargetStatus(status: unknown): { valid: boolean; message?: string } {
  if (!ALLOWED_TARGET_STATUSES.has(status as string)) {
    return {
      valid: false,
      message: `Status tidak valid. Hanya diperbolehkan: ${[...ALLOWED_TARGET_STATUSES].join(', ')}.`,
    };
  }
  return { valid: true };
}

/**
 * Validate document type for private document access.
 */
export function validateDocumentType(docType: unknown): { valid: boolean; message?: string } {
  if (!ALLOWED_DOC_TYPES.has(docType as string)) {
    return {
      valid: false,
      message: `Jenis dokumen tidak valid. Hanya diperbolehkan: ${[...ALLOWED_DOC_TYPES].join(', ')}.`,
    };
  }
  return { valid: true };
}

/**
 * Verify that a storage path comes from Firestore, not from request body.
 * Security contract: Admin browser never supplies raw paths.
 */
export function assertPathFromFirestore(firestorePath: string | undefined): boolean {
  return typeof firestorePath === 'string' && firestorePath.length > 0;
}

/**
 * Verify an authoritative Firestore-resolved storage path is well-formed and belongs
 * to the expected barber's own UID namespace, even though it originates server-side.
 * Firestore data is not trusted blindly -- this guards against a corrupted/malicious
 * documentPaths entry pointing outside the barber's own folder.
 */
export function validateStoragePathNamespace(storagePath: string, barberId: string): boolean {
  if (!storagePath || storagePath.trim() !== storagePath) return false;
  if (storagePath.includes('..') || storagePath.startsWith('/')) return false;
  const firstSegment = storagePath.split('/')[0];
  return firstSegment === barberId;
}

/**
 * Validate category name.
 */
export function validateCategoryName(name: unknown): { valid: boolean; message?: string } {
  if (typeof name !== 'string') {
    return { valid: false, message: 'Nama kategori harus berupa teks.' };
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return { valid: false, message: 'Nama kategori tidak boleh kosong.' };
  }
  if (trimmed.length > MAX_CATEGORY_NAME_LENGTH) {
    return {
      valid: false,
      message: `Nama kategori maksimal ${MAX_CATEGORY_NAME_LENGTH} karakter.`,
    };
  }
  return { valid: true };
}

/**
 * Validate pagination page size.
 */
export function validatePageSize(pageSize: unknown): { valid: boolean; message?: string; normalizedSize: number } {
  if (!pageSize) {
    return { valid: true, normalizedSize: DEFAULT_PAGE_SIZE };
  }
  const size = typeof pageSize === 'number' ? pageSize : parseInt(pageSize as string, 10);
  if (isNaN(size) || size < 1) {
    return { valid: false, message: 'Ukuran halaman harus berupa angka positif.', normalizedSize: DEFAULT_PAGE_SIZE };
  }
  if (size > MAX_PAGE_SIZE) {
    return { valid: false, message: `Ukuran halaman maksimal ${MAX_PAGE_SIZE}.`, normalizedSize: MAX_PAGE_SIZE };
  }
  return { valid: true, normalizedSize: size };
}

/**
 * Reject client-supplied paths for security.
 */
export function rejectClientPath(clientPath: string | undefined): boolean {
  return !clientPath || clientPath.trim().length === 0;
}

// ============================================================================
// Pricing Settings Validation
// ============================================================================

export const MAX_SERVICE_DISTANCE_KM_CEILING = 50; // matches barbers.serviceRadiusKm bound (firestore.rules)

function isNonNegativeFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isFiniteNumberInRange(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}

export function validatePricingSettings(input: unknown): { valid: boolean; message?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, message: 'Pengaturan biaya tidak valid.' };
  }
  const settings = input as Record<string, any>;

  const appFee = settings.applicationFee;
  if (!appFee || typeof appFee !== 'object') {
    return { valid: false, message: 'Konfigurasi biaya aplikasi tidak valid.' };
  }
  if (typeof appFee.enabled !== 'boolean') {
    return { valid: false, message: 'Status aktif biaya aplikasi harus boolean.' };
  }
  if (appFee.mode !== 'fixed' && appFee.mode !== 'percentage') {
    return { valid: false, message: 'Mode biaya aplikasi harus fixed atau percentage.' };
  }
  if (appFee.mode === 'fixed') {
    if (!isNonNegativeFiniteNumber(appFee.fixedAmount)) {
      return { valid: false, message: 'Nominal biaya aplikasi tetap harus berupa angka >= 0.' };
    }
  } else if (!isFiniteNumberInRange(appFee.percentage, 0, 100)) {
    return { valid: false, message: 'Persentase biaya aplikasi harus antara 0 dan 100.' };
  }
  if (appFee.minimumAmount !== undefined && !isNonNegativeFiniteNumber(appFee.minimumAmount)) {
    return { valid: false, message: 'Nominal minimum biaya aplikasi harus berupa angka >= 0.' };
  }
  if (appFee.maximumAmount !== undefined && !isNonNegativeFiniteNumber(appFee.maximumAmount)) {
    return { valid: false, message: 'Nominal maksimum biaya aplikasi harus berupa angka >= 0.' };
  }
  if (
    appFee.minimumAmount !== undefined &&
    appFee.maximumAmount !== undefined &&
    appFee.minimumAmount > appFee.maximumAmount
  ) {
    return { valid: false, message: 'Nominal minimum tidak boleh lebih besar dari nominal maksimum.' };
  }

  const homeFee = settings.homeServiceFee;
  if (!homeFee || typeof homeFee !== 'object') {
    return { valid: false, message: 'Konfigurasi biaya layanan ke rumah tidak valid.' };
  }
  if (typeof homeFee.enabled !== 'boolean') {
    return { valid: false, message: 'Status aktif biaya layanan ke rumah harus boolean.' };
  }
  if (homeFee.mode !== 'fixed' && homeFee.mode !== 'distance') {
    return { valid: false, message: 'Mode biaya layanan ke rumah harus fixed atau distance.' };
  }
  if (homeFee.mode === 'fixed') {
    if (!isNonNegativeFiniteNumber(homeFee.fixedAmount)) {
      return { valid: false, message: 'Nominal biaya layanan ke rumah tetap harus berupa angka >= 0.' };
    }
  } else {
    if (!isNonNegativeFiniteNumber(homeFee.baseAmount)) {
      return { valid: false, message: 'Nominal dasar biaya jarak harus berupa angka >= 0.' };
    }
    if (!isNonNegativeFiniteNumber(homeFee.includedDistanceKm)) {
      return { valid: false, message: 'Jarak termasuk harus berupa angka >= 0.' };
    }
    if (!isNonNegativeFiniteNumber(homeFee.perKmAmount)) {
      return { valid: false, message: 'Nominal per km harus berupa angka >= 0.' };
    }
  }
  if (
    homeFee.maxServiceDistanceKm !== undefined &&
    !isFiniteNumberInRange(homeFee.maxServiceDistanceKm, 1, MAX_SERVICE_DISTANCE_KM_CEILING)
  ) {
    return {
      valid: false,
      message: `Radius maksimum layanan harus antara 1 dan ${MAX_SERVICE_DISTANCE_KM_CEILING} km.`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Voucher Validation
// ============================================================================

export const MAX_VOUCHER_CODE_LENGTH = 30;
export const MIN_VOUCHER_CODE_LENGTH = 3;
export const MAX_VOUCHER_NAME_LENGTH = 100;

/** Uppercase, trimmed, internal whitespace collapsed -- mirrors voucher-service.ts's normalizeVoucherCode. */
export function normalizeVoucherCodeInput(rawCode: unknown): string {
  return typeof rawCode === 'string' ? rawCode.trim().toUpperCase().replace(/\s+/g, '') : '';
}

export function validateVoucherCreate(input: unknown): { valid: boolean; message?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, message: 'Data voucher tidak valid.' };
  }
  const v = input as Record<string, any>;

  const code = normalizeVoucherCodeInput(v.code);
  if (code.length < MIN_VOUCHER_CODE_LENGTH || code.length > MAX_VOUCHER_CODE_LENGTH) {
    return {
      valid: false,
      message: `Kode voucher harus ${MIN_VOUCHER_CODE_LENGTH}-${MAX_VOUCHER_CODE_LENGTH} karakter (huruf/angka).`,
    };
  }
  if (!/^[A-Z0-9]+$/.test(code)) {
    return { valid: false, message: 'Kode voucher hanya boleh berisi huruf dan angka.' };
  }

  if (typeof v.name !== 'string' || !v.name.trim()) {
    return { valid: false, message: 'Nama voucher tidak boleh kosong.' };
  }
  if (v.name.trim().length > MAX_VOUCHER_NAME_LENGTH) {
    return { valid: false, message: `Nama voucher maksimal ${MAX_VOUCHER_NAME_LENGTH} karakter.` };
  }

  const discountValidation = validateVoucherDiscountFields(v);
  if (!discountValidation.valid) return discountValidation;

  const dateValidation = validateVoucherDateFields(v.validFrom, v.validUntil);
  if (!dateValidation.valid) return dateValidation;

  const limitValidation = validateVoucherLimitFields(v);
  if (!limitValidation.valid) return limitValidation;

  return { valid: true };
}

export function validateVoucherUpdate(input: unknown): { valid: boolean; message?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, message: 'Data voucher tidak valid.' };
  }
  const v = input as Record<string, any>;

  if (v.name !== undefined) {
    if (typeof v.name !== 'string' || !v.name.trim()) {
      return { valid: false, message: 'Nama voucher tidak boleh kosong.' };
    }
    if (v.name.trim().length > MAX_VOUCHER_NAME_LENGTH) {
      return { valid: false, message: `Nama voucher maksimal ${MAX_VOUCHER_NAME_LENGTH} karakter.` };
    }
  }

  if (v.discountType !== undefined || v.discountValue !== undefined) {
    const discountValidation = validateVoucherDiscountFields(v, true);
    if (!discountValidation.valid) return discountValidation;
  }

  if (v.validFrom !== undefined || v.validUntil !== undefined) {
    const dateValidation = validateVoucherDateFields(v.validFrom, v.validUntil, true);
    if (!dateValidation.valid) return dateValidation;
  }

  const limitValidation = validateVoucherLimitFields(v, true);
  if (!limitValidation.valid) return limitValidation;

  return { valid: true };
}

function validateVoucherDiscountFields(
  v: Record<string, any>,
  partial = false
): { valid: boolean; message?: string } {
  if (!partial || v.discountType !== undefined) {
    if (v.discountType !== 'fixed' && v.discountType !== 'percentage') {
      return { valid: false, message: 'Tipe diskon harus fixed atau percentage.' };
    }
  }
  if (!partial || v.discountValue !== undefined) {
    if (v.discountType === 'percentage') {
      if (!isFiniteNumberInRange(v.discountValue, 0.01, 100)) {
        return { valid: false, message: 'Persentase diskon harus antara 0 dan 100.' };
      }
    } else if (!isNonNegativeFiniteNumber(v.discountValue) || v.discountValue <= 0) {
      return { valid: false, message: 'Nominal diskon harus berupa angka lebih besar dari 0.' };
    }
  }
  if (v.maxDiscountAmount !== undefined && v.maxDiscountAmount !== null) {
    if (!isNonNegativeFiniteNumber(v.maxDiscountAmount)) {
      return { valid: false, message: 'Diskon maksimum harus berupa angka >= 0.' };
    }
  }
  if (v.minimumBaseAmount !== undefined && v.minimumBaseAmount !== null) {
    if (!isNonNegativeFiniteNumber(v.minimumBaseAmount)) {
      return { valid: false, message: 'Minimum belanja harus berupa angka >= 0.' };
    }
  }
  return { valid: true };
}

function validateVoucherDateFields(
  validFrom: unknown,
  validUntil: unknown,
  partial = false
): { valid: boolean; message?: string } {
  if (!partial && (!validFrom || !validUntil)) {
    return { valid: false, message: 'Tanggal mulai dan berakhir wajib diisi.' };
  }
  if (validFrom !== undefined) {
    if (typeof validFrom !== 'string' || Number.isNaN(new Date(validFrom).getTime())) {
      return { valid: false, message: 'Tanggal mulai tidak valid.' };
    }
  }
  if (validUntil !== undefined) {
    if (typeof validUntil !== 'string' || Number.isNaN(new Date(validUntil).getTime())) {
      return { valid: false, message: 'Tanggal berakhir tidak valid.' };
    }
  }
  if (typeof validFrom === 'string' && typeof validUntil === 'string') {
    if (new Date(validFrom).getTime() >= new Date(validUntil).getTime()) {
      return { valid: false, message: 'Tanggal berakhir harus setelah tanggal mulai.' };
    }
  }
  return { valid: true };
}

function validateVoucherLimitFields(
  v: Record<string, any>,
  _partial = false
): { valid: boolean; message?: string } {
  if (v.usageLimit !== undefined && v.usageLimit !== null) {
    if (!Number.isInteger(v.usageLimit) || v.usageLimit < 1) {
      return { valid: false, message: 'Batas penggunaan harus berupa bilangan bulat >= 1.' };
    }
  }
  if (v.perUserLimit !== undefined && v.perUserLimit !== null) {
    if (!Number.isInteger(v.perUserLimit) || v.perUserLimit < 1) {
      return { valid: false, message: 'Batas penggunaan per pengguna harus berupa bilangan bulat >= 1.' };
    }
  }
  return { valid: true };
}
