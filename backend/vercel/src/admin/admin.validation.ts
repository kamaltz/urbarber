/**
 * Admin Validation Helpers
 */

export const MAX_REJECTION_REASON_LENGTH = 1000;
export const ALLOWED_DOC_TYPES = new Set(['ktp', 'selfie_with_ktp', 'business_permit']);
export const ALLOWED_TARGET_STATUSES = new Set(['active', 'suspended']);

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

export function validateTargetStatus(status: unknown): { valid: boolean; message?: string } {
  if (!ALLOWED_TARGET_STATUSES.has(status as string)) {
    return {
      valid: false,
      message: `Status tidak valid. Hanya diperbolehkan: ${[...ALLOWED_TARGET_STATUSES].join(', ')}.`,
    };
  }
  return { valid: true };
}

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
 * Reject raw storage paths supplied directly by the client.
 * The path MUST be retrieved from Firestore, not from the request body.
 */
export function assertPathFromFirestore(
  clientPath: string | undefined,
  firestorePath: string | undefined,
): boolean {
  if (!firestorePath) return false;
  // No comparison to client path needed since we always derive from Firestore.
  // This function exists to document the security contract.
  return typeof firestorePath === 'string' && firestorePath.length > 0;
}
