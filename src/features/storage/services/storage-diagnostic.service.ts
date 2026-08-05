import { firebaseAuth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export interface StorageDiagnosticResult {
    uid: string;
    role: unknown;
    appRole: unknown;
    uploadPath: string;
    uploadSucceeded: boolean;
    cleanupSucceeded: boolean;
}

export async function runStorageDiagnostic(): Promise<StorageDiagnosticResult> {
    if (!__DEV__) {
        throw new Error("Storage diagnostic hanya tersedia dalam development.");
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
            `Claim Firebase tidak valid. Ditemukan role=${String(role)}.`,
        );
    }

    const path = `${user.uid}/diagnostics/jwt-rls-${Date.now()}.txt`;
    const body = new TextEncoder().encode("URBarber Firebase JWT RLS test");

    const uploadResult = await supabase.storage
        .from("public-media")
        .upload(path, body.buffer, {
            contentType: "text/plain",
            upsert: false,
        });

    if (uploadResult.error) {
        throw new Error(
            `Upload diagnostic gagal: ${uploadResult.error.message}`,
        );
    }

    const removeResult = await supabase.storage
        .from("public-media")
        .remove([path]);

    if (removeResult.error) {
        throw new Error(
            `Cleanup diagnostic gagal: ${removeResult.error.message}`,
        );
    }

    return {
        uid: user.uid,
        role,
        appRole,
        uploadPath: path,
        uploadSucceeded: true,
        cleanupSucceeded: true,
    };
}