import * as ImagePicker from "expo-image-picker";

import { firebaseAuth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import {
  PRIVATE_DOCUMENTS_BUCKET,
  PUBLIC_MEDIA_BUCKET,
  STORAGE_CONFIG,
} from "./storage.config";
import type {
  PrivateDocumentFolder,
  PublicMediaFolder,
  SignedUrlResult,
  StorageBucket,
  StorageServiceContract,
  UploadAvatarResult,
  UploadedFileResult,
  UploadedPublicFileResult,
  UploadOptions,
} from "./storage.types";

/**
 * Image picker helper using Expo ImagePicker
 */
export async function pickImage(): Promise<
  ImagePicker.ImagePickerAsset | null
> {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Izin galeri diperlukan untuk memilih foto.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0];
}

/**
 * Map raw Supabase / Storage errors into safe, user-friendly messages
 */
function handleStorageError(error: any, context: string): Error {
  if (!error) return new Error(`${context} failed with unknown error.`);

  const message = (error.message || "").toLowerCase();
  const statusCode = String(error.statusCode || error.status || "");

  if (message.includes("row-level security") || message.includes("rls") || statusCode === "403") {
    return new Error("Akses penyimpanan ditolak oleh kebijakan RLS. Harap pastikan klaim token telah diperbarui.");
  }

  if (message.includes("already exists") || statusCode === "409" || message.includes("duplicate")) {
    return new Error("Objek sudah ada di penyimpanan. Diperlukan nama file yang unik.");
  }

  if (message.includes("network") || message.includes("failed to fetch") || message.includes("fetch failed")) {
    return new Error("Gagal terhubung ke server penyimpanan. Periksa koneksi jaringan Anda.");
  }

  if (message.includes("bucket not found") || message.includes("invalid bucket")) {
    return new Error("Gagal konfigurasi penyimpanan Supabase. Bucket tidak ditemukan.");
  }

  return new Error(`${context}: ${error.message || "Kesalahan penyimpanan"}`);
}

/**
 * Storage Service implementation for public & private Supabase buckets
 */
export const storageService: StorageServiceContract = {
  async uploadAvatar(
    fileUriOrBuffer: string | ArrayBuffer,
    contentType = "image/jpeg",
  ): Promise<UploadAvatarResult> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error("Pengguna belum login. Silakan login terlebih dahulu.");
    }

    const allowedMimeTypes = STORAGE_CONFIG.ALLOWED_IMAGE_MIME_TYPES as readonly string[];
    if (!allowedMimeTypes.includes(contentType)) {
      throw new Error(
        `Tipe file "${contentType}" tidak valid. Hanya JPEG, PNG, dan WebP yang diizinkan.`,
      );
    }

    let body: ArrayBuffer;
    if (typeof fileUriOrBuffer === "string") {
      try {
        const response = await fetch(fileUriOrBuffer);
        body = await response.arrayBuffer();
      } catch {
        throw new Error("Gagal membaca berkas gambar lokal.");
      }
    } else {
      body = fileUriOrBuffer;
    }

    // Pre-flight file size check before network request
    if (body.byteLength > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error("Ukuran berkas melebihi batas maksimum 5 MB.");
    }

    // Ensure Firebase custom claims are refreshed
    await user.getIdToken(true);

    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const uniqueFileName = `avatar-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const objectPath = `${user.uid}/avatar/${uniqueFileName}`;

    const { data, error } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(objectPath, body, {
        contentType,
        upsert: false,
        cacheControl: STORAGE_CONFIG.DEFAULT_CACHE_CONTROL,
      });

    if (error) {
      throw handleStorageError(error, "Upload avatar");
    }

    const { data: publicUrlData } = supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .getPublicUrl(data.path);

    return {
      profileImageUrl: publicUrlData.publicUrl,
      profileImagePath: data.path,
    };
  },

  async uploadPublicFile(
    fileUriOrBuffer: string | ArrayBuffer,
    folder: PublicMediaFolder,
    options?: UploadOptions,
  ): Promise<UploadedPublicFileResult> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error("Pengguna belum login.");
    }

    const contentType = options?.contentType ?? "image/jpeg";
    const allowedMimeTypes = STORAGE_CONFIG.ALLOWED_IMAGE_MIME_TYPES as readonly string[];
    if (!allowedMimeTypes.includes(contentType)) {
      throw new Error(
        `Tipe file "${contentType}" tidak diizinkan. Tipe yang diizinkan: ${allowedMimeTypes.join(", ")}.`,
      );
    }

    let body: ArrayBuffer;
    if (typeof fileUriOrBuffer === "string") {
      try {
        const response = await fetch(fileUriOrBuffer);
        body = await response.arrayBuffer();
      } catch {
        throw new Error("Gagal membaca berkas media publik.");
      }
    } else {
      body = fileUriOrBuffer;
    }

    if (body.byteLength > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error("Ukuran berkas melebihi batas 5 MB.");
    }

    await user.getIdToken(true);

    const filename = options?.filename ?? `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1] ?? "jpg";
    const path = `${user.uid}/${folder}/${filename}.${ext}`;

    const { data, error } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(path, body, {
        contentType,
        upsert: options?.upsert ?? false,
        cacheControl: options?.cacheControl ?? STORAGE_CONFIG.DEFAULT_CACHE_CONTROL,
      });

    if (error) {
      throw handleStorageError(error, "Upload media publik");
    }

    const { data: publicUrlData } = supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .getPublicUrl(data.path);

    return {
      path: data.path,
      fullPath: `${PUBLIC_MEDIA_BUCKET}/${data.path}`,
      publicUrl: publicUrlData.publicUrl,
    };
  },

  async uploadPrivateFile(
    fileUriOrBuffer: string | ArrayBuffer,
    folder: PrivateDocumentFolder,
    options?: UploadOptions,
  ): Promise<UploadedFileResult> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error("Pengguna belum login.");
    }

    const contentType = options?.contentType ?? "application/pdf";
    const allowedDocTypes = STORAGE_CONFIG.ALLOWED_DOCUMENT_MIME_TYPES as readonly string[];
    if (!allowedDocTypes.includes(contentType)) {
      throw new Error(
        `Tipe file "${contentType}" tidak diizinkan untuk dokumen privat. Tipe yang diizinkan: ${allowedDocTypes.join(", ")}.`,
      );
    }

    let body: ArrayBuffer;
    if (typeof fileUriOrBuffer === "string") {
      try {
        const response = await fetch(fileUriOrBuffer);
        body = await response.arrayBuffer();
      } catch {
        throw new Error("Gagal membaca berkas dokumen privat.");
      }
    } else {
      body = fileUriOrBuffer;
    }

    if (body.byteLength > STORAGE_CONFIG.MAX_PRIVATE_FILE_SIZE_BYTES) {
      throw new Error("Ukuran berkas dokumen melebihi batas 10 MB.");
    }

    await user.getIdToken(true);

    const filename = options?.filename ?? `doc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const ext = contentType.split("/")[1] ?? "pdf";
    const path = `${user.uid}/${folder}/${filename}.${ext}`;

    const { data, error } = await supabase.storage
      .from(PRIVATE_DOCUMENTS_BUCKET)
      .upload(path, body, {
        contentType,
        upsert: options?.upsert ?? false,
        cacheControl: options?.cacheControl ?? STORAGE_CONFIG.DEFAULT_CACHE_CONTROL,
      });

    if (error) {
      throw handleStorageError(error, "Upload dokumen privat");
    }

    return {
      path: data.path,
      fullPath: `${PRIVATE_DOCUMENTS_BUCKET}/${data.path}`,
    };
  },

  async replaceFile(
    bucket: StorageBucket,
    path: string,
    fileUriOrBuffer: string | ArrayBuffer,
    options?: UploadOptions,
  ): Promise<UploadedFileResult> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error("Pengguna belum login.");
    }

    let body: ArrayBuffer;
    if (typeof fileUriOrBuffer === "string") {
      const response = await fetch(fileUriOrBuffer);
      body = await response.arrayBuffer();
    } else {
      body = fileUriOrBuffer;
    }

    const contentType = options?.contentType ?? "application/octet-stream";

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, body, {
        contentType,
        upsert: true,
        cacheControl: options?.cacheControl ?? STORAGE_CONFIG.DEFAULT_CACHE_CONTROL,
      });

    if (error) {
      throw handleStorageError(error, "Penggantian file");
    }

    return {
      path: data.path,
      fullPath: `${bucket}/${data.path}`,
    };
  },

  async deleteFile(bucket: StorageBucket, path: string): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error("Pengguna belum login.");
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw handleStorageError(error, "Hapus file");
    }
  },

  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  async getSignedUrl(
    bucket: StorageBucket,
    path: string,
    expiresInSeconds = STORAGE_CONFIG.DEFAULT_SIGNED_URL_EXPIRES_IN,
  ): Promise<SignedUrlResult> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error("Pengguna belum login.");
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw handleStorageError(error ?? new Error("URL tidak tersedia"), "Pembuatan URL privat");
    }

    return {
      path,
      signedUrl: data.signedUrl,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
  },
};

/**
 * Backward-compatible wrapper function for ImagePicker avatar upload
 */
export async function uploadPublicImage(
  image: ImagePicker.ImagePickerAsset,
  folder: PublicMediaFolder,
  filename?: string,
): Promise<{ path: string; publicUrl: string }> {
  if (folder === "avatar" || folder === "avatars") {
    const result = await storageService.uploadAvatar(
      image.uri,
      image.mimeType ?? "image/jpeg",
    );
    return {
      path: result.profileImagePath,
      publicUrl: result.profileImageUrl,
    };
  }

  const result = await storageService.uploadPublicFile(image.uri, folder, {
    filename,
    contentType: image.mimeType ?? "image/jpeg",
    upsert: false,
  });

  return {
    path: result.path,
    publicUrl: result.publicUrl,
  };
}