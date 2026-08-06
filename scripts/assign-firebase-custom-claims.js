/**
 * Trusted Node.js Script: Assign Firebase Custom Claims for Supabase RLS
 *
 * This script runs outside the Expo mobile app bundle using `firebase-admin`.
 * It assigns custom user claims:
 *   - role: "authenticated" (Required by Supabase Storage JWT validator)
 *   - app_role: "customer" | "barber" | "admin" (Used by Supabase Storage RLS policies for admin overrides)
 *
 * Usage:
 *   node ./scripts/assign-firebase-custom-claims.js --uid=<USER_UID> [--app_role=customer|barber|admin]
 *   node ./scripts/assign-firebase-custom-claims.js --all
 *
 * Environment variables required:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   (or EXPO_PUBLIC_FIREBASE_PROJECT_ID if using default credentials)
 */

const fs = require("fs");
const path = require("path");

let initializeApp, cert, getApps, applicationDefault, getAuth, getFirestore;

try {
  const adminApp = require("firebase-admin/app");
  const adminAuth = require("firebase-admin/auth");
  const adminFirestore = require("firebase-admin/firestore");
  initializeApp = adminApp.initializeApp;
  cert = adminApp.cert;
  getApps = adminApp.getApps;
  applicationDefault = adminApp.applicationDefault;
  getAuth = adminAuth.getAuth;
  getFirestore = adminFirestore.getFirestore;
} catch (e) {
  const admin = require("firebase-admin");
  const base = admin.default || admin;
  initializeApp = base.initializeApp ? base.initializeApp.bind(base) : admin.initializeApp;
  cert = base.credential?.cert ? base.credential.cert.bind(base.credential) : admin.cert;
  getApps = () => base.apps || admin.getApps?.() || [];
  applicationDefault = base.credential?.applicationDefault
    ? base.credential.applicationDefault.bind(base.credential)
    : admin.applicationDefault;
  getAuth = (app) => (base.auth ? base.auth(app) : admin.getAuth(app));
  getFirestore = (app) => (base.firestore ? base.firestore(app) : admin.getFirestore(app));
}

let appInstance = null;

function initializeFirebaseAdmin() {
  const apps = getApps();
  if (apps && apps.length > 0) {
    appInstance = apps[0];
    return appInstance;
  }

  const explicitPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  const defaultSecretPath = path.resolve("secrets/firebase-service-account.json");
  const altSecretPath = path.resolve("secrets/.service-account.json");

  let serviceAccountPath = null;
  if (explicitPath) {
    serviceAccountPath = path.resolve(explicitPath);
  } else if (fs.existsSync(defaultSecretPath)) {
    serviceAccountPath = defaultSecretPath;
  } else if (fs.existsSync(altSecretPath)) {
    serviceAccountPath = altSecretPath;
  }

  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    appInstance = initializeApp({
      credential: cert(serviceAccount),
    });
    return appInstance;
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("ERROR: No Firebase Admin service account or project ID configured.");
    console.error("Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json or EXPO_PUBLIC_FIREBASE_PROJECT_ID.");
    process.exit(1);
  }

  appInstance = initializeApp({
    credential: applicationDefault(),
    projectId,
  });
  return appInstance;
}

async function getUserAppRoleFromFirestore(uid) {
  try {
    const firestore = getFirestore(appInstance);
    const userDoc = await firestore.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data().role) {
      return userDoc.data().role;
    }
  } catch (err) {
    console.warn(`[WARN] Could not fetch Firestore user role for ${uid}, defaulting to 'customer'.`);
  }
  return "customer";
}

async function setClaimsForUser(uid, specifiedAppRole = null) {
  try {
    const auth = getAuth(appInstance);
    const user = await auth.getUser(uid);
    const appRole = specifiedAppRole || (await getUserAppRoleFromFirestore(uid));
    const existingClaims = user.customClaims || {};

    const updatedClaims = {
      ...existingClaims,
      role: "authenticated",
      app_role: appRole,
    };

    await auth.setCustomUserClaims(uid, updatedClaims);
    console.log(
      `[SUCCESS] Assigned claims { role: 'authenticated', app_role: '${appRole}' } to user ${uid} (${user.email || "no-email"})`,
    );
  } catch (error) {
    console.error(`[ERROR] Failed to set claims for user ${uid}:`, error.message);
  }
}

async function setClaimsForAllUsers() {
  try {
    const auth = getAuth(appInstance);
    let nextPageToken;
    let count = 0;

    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);

      for (const userRecord of listUsersResult.users) {
        await setClaimsForUser(userRecord.uid);
        count++;
      }

      nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`\n[COMPLETE] Successfully processed ${count} user(s).`);
  } catch (error) {
    console.error("[ERROR] Failed listing users from Firebase Auth:", error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const uidArg = args.find((arg) => arg.startsWith("--uid="));
  const appRoleArg = args.find((arg) => arg.startsWith("--app_role="));
  const allArg = args.includes("--all");

  if (!uidArg && !allArg) {
    console.log(`
========================================================================
 URBarber - Firebase Custom Claim Assignment Script
========================================================================
 Purpose: Assigns custom claims { role: 'authenticated', app_role: 'customer|barber|admin' }
          to Firebase Auth users so Supabase Storage RLS policies validate JWT tokens.

 Usage:
   node ./scripts/assign-firebase-custom-claims.js --uid=<USER_UID> [--app_role=customer|barber|admin]
   node ./scripts/assign-firebase-custom-claims.js --all

 Environment Variable:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
========================================================================
`);
    process.exit(0);
  }

  initializeFirebaseAdmin();

  const specifiedAppRole = appRoleArg ? appRoleArg.split("=")[1] : null;

  if (uidArg) {
    const uid = uidArg.split("=")[1];
    if (!uid) {
      console.error("ERROR: --uid flag requires a user ID value (e.g. --uid=abc12345)");
      process.exit(1);
    }
    await setClaimsForUser(uid, specifiedAppRole);
  } else if (allArg) {
    await setClaimsForAllUsers();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected failure:", err);
  process.exit(1);
});
