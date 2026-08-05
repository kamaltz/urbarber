import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFile } from "node:fs/promises";
import process from "node:process";

const [uid, appRole] = process.argv.slice(2);
const allowedRoles = new Set(["customer", "barber", "admin"]);

if (!uid || !allowedRoles.has(appRole)) {
    console.error(
        "Usage: node scripts/set-user-claims.mjs <uid> <customer|barber|admin>",
    );
    process.exit(1);
}

const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    "./secrets/firebase-service-account.json";

const raw = await readFile(serviceAccountPath, "utf8");
const serviceAccount = JSON.parse(raw);

if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const auth = getAuth();
const user = await auth.getUser(uid);

await auth.setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    role: "authenticated",
    app_role: appRole,
});

const updated = await auth.getUser(uid);

console.log("Claims updated:", {
    uid: updated.uid,
    role: updated.customClaims?.role,
    app_role: updated.customClaims?.app_role,
});