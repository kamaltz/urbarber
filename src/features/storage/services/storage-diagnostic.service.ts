import { firebaseAuth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export interface StorageDiagnosticResult {
  uid: string;
  role: unknown;
  appRole: unknown;
  ownUploadPath: string;
  ownUploadSucceeded: boolean;
  crossUidDenied: boolean;
  cleanupSucceeded: boolean;
  overallSuccess: boolean;
}

// 1x1 transparent PNG binary payload for diagnostic testing
const DIAGNOSTIC_PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120,
  156, 99, 96, 248, 15, 0, 1, 5, 1, 2, 26, 165, 172, 222, 0, 0, 0, 0, 73, 69,
  78, 68, 174, 66, 96, 130,
]);

/**
 * Development-only diagnostic utility to verify Supabase Storage RLS policies
 * against Firebase Auth custom JWT claims.
 */
export async function runStorageDiagnostic(): Promise<StorageDiagnosticResult> {
  if (!__DEV__) {
    throw new Error("Diagnostic penyimpanan hanya tersedia pada mode development.");
  }

  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error("Pengguna harus terautentikasi sebelum menjalankan diagnostic.");
  }

  await user.getIdToken(true);
  const tokenResult = await user.getIdTokenResult(false);

  const role = tokenResult.claims.role;
  const appRole = tokenResult.claims.app_role;

  if (role !== "authenticated") {
    throw new Error(
      `Claim Firebase tidak valid. Role saat ini: ${String(role)}. Diperlukan: 'authenticated'.`,
    );
  }

  const timestamp = Date.now();
  const ownPath = `${user.uid}/avatar/diag-${timestamp}.png`;
  const fakeForeignPath = `fake-foreign-uid-99999/avatar/diag-${timestamp}.png`;

  // Test A: Upload to current user's own UID folder (Expected: Success)
  const ownUpload = await supabase.storage
    .from("public-media")
    .upload(ownPath, DIAGNOSTIC_PNG_BYTES.buffer, {
      contentType: "image/png",
      upsert: false,
    });

  const ownUploadSucceeded = !ownUpload.error;

  if (ownUpload.error && __DEV__) {
    console.warn("[DIAGNOSTIC] Upload folder sendiri gagal:", ownUpload.error.message);
  }

  // Test B: Upload to fake different UID folder (Expected: Rejected by RLS)
  const foreignUpload = await supabase.storage
    .from("public-media")
    .upload(fakeForeignPath, DIAGNOSTIC_PNG_BYTES.buffer, {
      contentType: "image/png",
      upsert: false,
    });

  const crossUidDenied = !!foreignUpload.error;

  // Test C: Cleanup test object if upload succeeded
  let cleanupSucceeded = false;
  if (ownUploadSucceeded) {
    const removal = await supabase.storage
      .from("public-media")
      .remove([ownPath]);

    cleanupSucceeded = !removal.error;
  } else {
    cleanupSucceeded = true; // No file to clean up
  }

  const overallSuccess = ownUploadSucceeded && crossUidDenied && cleanupSucceeded;

  return {
    uid: user.uid,
    role,
    appRole,
    ownUploadPath: ownPath,
    ownUploadSucceeded,
    crossUidDenied,
    cleanupSucceeded,
    overallSuccess,
  };
}