/**
 * Typed Supabase Storage Configuration and Constants
 */

export const STORAGE_BUCKETS = {
  PUBLIC_MEDIA: "public-media",
  PRIVATE_DOCUMENTS: "private-documents",
} as const;

export const PUBLIC_MEDIA_BUCKET = STORAGE_BUCKETS.PUBLIC_MEDIA;
export const PRIVATE_DOCUMENTS_BUCKET = STORAGE_BUCKETS.PRIVATE_DOCUMENTS;

export const STORAGE_FOLDERS = {
  PUBLIC: {
    AVATAR: "avatar",
    AVATARS: "avatar",
    BARBER: "barber",
    SERVICES: "services",
  },
  PRIVATE: {
    VERIFICATIONS: "verifications",
    DOCUMENTS: "documents",
  },
} as const;

export function buildPublicObjectPath(
  uid: string,
  folder: keyof typeof STORAGE_FOLDERS.PUBLIC,
  filename: string,
): string {
  return `${uid}/${STORAGE_FOLDERS.PUBLIC[folder]}/${filename}`;
}

export function buildPrivateObjectPath(
  uid: string,
  folder: keyof typeof STORAGE_FOLDERS.PRIVATE,
  filename: string,
): string {
  return `${uid}/${STORAGE_FOLDERS.PRIVATE[folder]}/${filename}`;
}

export const STORAGE_CONFIG = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB limit
  MAX_PRIVATE_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB limit
  DEFAULT_CACHE_CONTROL: "3600",         // 1 hour browser cache
  DEFAULT_SIGNED_URL_EXPIRES_IN: 3600,  // 1 hour link validity
  ALLOWED_IMAGE_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as const,
  ALLOWED_DOCUMENT_MIME_TYPES: [
    "image/jpeg",
    "image/png",
    "application/pdf",
  ] as const,
} as const;
