import { firebaseAuth } from "@/lib/firebase";

export interface FirebaseAccessClaims {
    role?: string;
    app_role?: "customer" | "barber" | "admin";
    sub?: string;
}

export async function refreshFirebaseClaims(): Promise<FirebaseAccessClaims> {
    const user = firebaseAuth.currentUser;

    if (!user) {
        throw new Error("Pengguna belum login.");
    }

    await user.getIdToken(true);

    const tokenResult = await user.getIdTokenResult(false);

    return {
        role:
            typeof tokenResult.claims.role === "string"
                ? tokenResult.claims.role
                : undefined,
        app_role:
            tokenResult.claims.app_role === "customer" ||
                tokenResult.claims.app_role === "barber" ||
                tokenResult.claims.app_role === "admin"
                ? tokenResult.claims.app_role
                : undefined,
        sub:
            typeof tokenResult.claims.sub === "string"
                ? tokenResult.claims.sub
                : user.uid,
    };
}