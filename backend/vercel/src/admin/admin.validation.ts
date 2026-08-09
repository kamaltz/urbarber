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
