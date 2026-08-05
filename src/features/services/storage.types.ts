/**
 * Supabase Storage Types and Interfaces
 */

import type { PUBLIC_MEDIA_BUCKET, PRIVATE_DOCUMENTS_BUCKET } from "./storage.config";

export type PublicMediaFolder = "avatars" | "barber" | "services";
export type PrivateDocumentFolder = "verifications" | "documents";

export type StorageBucket =
  | typeof PUBLIC_MEDIA_BUCKET
  | typeof PRIVATE_DOCUMENTS_BUCKET;

export interface UploadOptions {
  filename?: string;
  contentType?: string;
  cacheControl?: string;
  upsert?: boolean;
}

export interface UploadedFileResult {
  path: string;
  fullPath: string;
}

export interface UploadedPublicFileResult extends UploadedFileResult {
  publicUrl: string;
}

export interface SignedUrlResult {
  path: string;
  signedUrl: string;
  expiresAt: number;
}

export interface StorageServiceContract {
  /**
   * Upload file to public storage bucket
   */
  uploadPublicFile(
    fileUriOrBuffer: string | ArrayBuffer,
    folder: PublicMediaFolder,
    options?: UploadOptions,
  ): Promise<UploadedPublicFileResult>;

  /**
   * Upload file to private storage bucket
   */
  uploadPrivateFile(
    fileUriOrBuffer: string | ArrayBuffer,
    folder: PrivateDocumentFolder,
    options?: UploadOptions,
  ): Promise<UploadedFileResult>;

  /**
   * Replace existing file in a bucket (with upsert enabled)
   */
  replaceFile(
    bucket: StorageBucket,
    path: string,
    fileUriOrBuffer: string | ArrayBuffer,
    options?: UploadOptions,
  ): Promise<UploadedFileResult>;

  /**
   * Delete file from a storage bucket by path
   */
  deleteFile(bucket: StorageBucket, path: string): Promise<void>;

  /**
   * Get public URL for an asset in a public bucket
   */
  getPublicUrl(bucket: StorageBucket, path: string): string;

  /**
   * Generate temporary signed URL for a file in a private bucket
   */
  getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresInSeconds?: number,
  ): Promise<SignedUrlResult>;
}
