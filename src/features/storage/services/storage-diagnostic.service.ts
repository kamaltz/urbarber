import { firebaseAuth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export interface StorageDiagnosticResult {
  uid: string;
  role: unknown;
  appRole: unknown;
  ownUploadPath: string;
  ownUploadSucceeded: boolean;
  unauthorizedUploadDenied: boolean;
  cleanupSucceeded: boolean;
}

// 1x1 transparent PNG image buffer for diagnostic test
const TINY_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);

export async function runStorageDiagnostic(): Promise<StorageDiagnosticResult> {
  if (!__DEV__) {
    throw new Error("Storage diagnostic hanya tersedia dalam mode development.");
  }

  const user = firebaseAuth.currentUser;

  if (!user) {
    throw new Error("Login diperlukan sebelum menjalankan diagnostic.");
  }

  await user.getIdToken(true);
  const tokenResult = await user.getIdTokenResult(false);

  const role = tokenResult.claims.role;
  const appRole = tokenResult.claims.app_role;

  if (role !== "authenticated") {
    throw new Error(
      `Claim Firebase tidak valid. Ditemukan role=${String(role)}. Diperlukan { role: 'authenticated' }.`,
    );
  }

  const timestamp = Date.now();

  // Test A: Upload to authenticated user's UID folder (must succeed)
  const ownPath = `${user.uid}/diagnostics/test-${timestamp}.png`;
  const ownUploadResult = await supabase.storage
    .from("public-media")
    .upload(ownPath, TINY_PNG_BYTES.buffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (ownUploadResult.error) {
    throw new Error(
      `Upload diagnostic ke folder UID sendiri gagal: ${ownUploadResult.error.message}`,
    );
  }

  // Test B: Upload to a fake different UID folder (must be denied by RLS)
  const fakePath = `fake-different-uid-999999/diagnostics/test-${timestamp}.png`;
  const fakeUploadResult = await supabase.storage
    .from("public-media")
    .upload(fakePath, TINY_PNG_BYTES.buffer, {
      contentType: "image/png",
      upsert: false,
    });

  const unauthorizedUploadDenied = !!fakeUploadResult.error;

  if (!unauthorizedUploadDenied) {
    await supabase.storage.from("public-media").remove([fakePath]);
    throw new Error(
      "Uji keamanan RLS gagal: Upload ke folder UID pengguna lain berhasil diizinkan!",
    );
  }

  // Test C: Cleanup of authorized test file (must succeed)
  const removeResult = await supabase.storage
    .from("public-media")
    .remove([ownPath]);

  if (removeResult.error) {
    throw new Error(
      `Cleanup diagnostic gagal: ${removeResult.error.message}`,
    );
  }

  return {
    uid: user.uid,
    role,
    appRole,
    ownUploadPath: ownPath,
    ownUploadSucceeded: true,
    unauthorizedUploadDenied: true,
    cleanupSucceeded: true,
  };
}