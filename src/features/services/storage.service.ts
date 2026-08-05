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
    throw new Error("Izin galeri diperlukan untuk memilih gambar.");
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
 * Storage Service implementation for public & private Supabase buckets
 */
export const storageService: StorageServiceContract = {
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
        `Tipe file "${contentType}" tidak diizinkan untuk media publik. Tipe yang diizinkan: ${allowedMimeTypes.join(", ")}.`,
      );
    }

    // Force refresh Firebase ID Token to ensure custom claim { role: 'authenticated' } is active
    await user.getIdToken(true);

    // For avatar folder, delete any existing files (e.g. avatar.png, avatar.webp, old timestamp files) to prevent redundancy
    if (folder === "avatars") {
      try {
        const { data: existingFiles } = await supabase.storage
          .from(PUBLIC_MEDIA_BUCKET)
          .list(`${user.uid}/${folder}`);

        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map((f) => `${user.uid}/${folder}/${f.name}`);
          await supabase.storage.from(PUBLIC_MEDIA_BUCKET).remove(filesToDelete);
        }
      } catch (cleanErr) {
        console.warn("Cleanup of previous avatar files failed:", cleanErr);
      }
    }

    // Standardize filename and extension for avatars to fixed avatar.jpg
    const filename = folder === "avatars" ? "avatar" : (options?.filename ?? `file-${Date.now()}`);
    const extension = folder === "avatars" ? "jpg" : (contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1] ?? "jpg");
    const path = `${user.uid}/${folder}/${filename}.${extension}`;

    let body: ArrayBuffer;
    if (typeof fileUriOrBuffer === "string") {
      const response = await fetch(fileUriOrBuffer);
      body = await response.arrayBuffer();
    } else {
      body = fileUriOrBuffer;
    }

    if (body.byteLength > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Ukuran file melebihi batas maksimum ${STORAGE_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
      );
    }

    const { data, error } = await supabase.storage
      .from(PUBLIC_MEDIA_BUCKET)
      .upload(path, body, {
        contentType: folder === "avatars" ? "image/jpeg" : contentType,
        upsert: folder === "avatars" ? true : (options?.upsert ?? true),
        cacheControl: options?.cacheControl ?? STORAGE_CONFIG.DEFAULT_CACHE_CONTROL,
      });

    if (error) {
      throw new Error(`Upload file publik gagal: ${error.message}`);
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
      const response = await fetch(fileUriOrBuffer);
      body = await response.arrayBuffer();
    } else {
      body = fileUriOrBuffer;
    }

    if (body.byteLength > STORAGE_CONFIG.MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Ukuran file melebihi batas maksimum ${STORAGE_CONFIG.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
      );
    }

    const filename = options?.filename ?? `doc-${Date.now()}`;
    const extension = contentType.split("/")[1] ?? "pdf";
    const path = `${user.uid}/${folder}/${filename}.${extension}`;

    const { data, error } = await supabase.storage
      .from(PRIVATE_DOCUMENTS_BUCKET)
      .upload(path, body, {
        contentType,
        upsert: options?.upsert ?? false,
        cacheControl: options?.cacheControl ?? STORAGE_CONFIG.DEFAULT_CACHE_CONTROL,
      });

    if (error) {
      throw new Error(`Upload file privat gagal: ${error.message}`);
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
      throw new Error(`Penggantian file gagal: ${error.message}`);
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
      throw new Error(`Hapus file gagal: ${error.message}`);
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
      throw new Error(`Pembuatan URL privat gagal: ${error?.message ?? "URL tidak tersedia"}`);
    }

    return {
      path,
      signedUrl: data.signedUrl,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    };
  },
};

/**
 * Backward-compatible wrapper function for ImagePicker upload
 */
export async function uploadPublicImage(
  image: ImagePicker.ImagePickerAsset,
  folder: PublicMediaFolder,
  filename = `avatar-${Date.now()}`,
): Promise<{ path: string; publicUrl: string }> {
  const result = await storageService.uploadPublicFile(image.uri, folder, {
    filename,
    contentType: image.mimeType ?? "image/jpeg",
    upsert: true,
  });

  return {
    path: result.path,
    publicUrl: result.publicUrl,
  };
}