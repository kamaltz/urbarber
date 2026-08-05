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

const admin = require("firebase-admin");

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (serviceAccountPath) {
    const serviceAccount = require(require("path").resolve(serviceAccountPath));
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    console.error("ERROR: No Firebase Admin service account or project ID configured.");
    console.error("Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json or EXPO_PUBLIC_FIREBASE_PROJECT_ID.");
    process.exit(1);
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });
}

async function getUserAppRoleFromFirestore(uid) {
  try {
    const userDoc = await admin.firestore().collection("users").doc(uid).get();
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
    const user = await admin.auth().getUser(uid);
    const appRole = specifiedAppRole || (await getUserAppRoleFromFirestore(uid));
    const existingClaims = user.customClaims || {};

    const updatedClaims = {
      ...existingClaims,
      role: "authenticated",
      app_role: appRole,
    };

    await admin.auth().setCustomUserClaims(uid, updatedClaims);
    console.log(
      `[SUCCESS] Assigned claims { role: 'authenticated', app_role: '${appRole}' } to user ${uid} (${user.email || "no-email"})`,
    );
  } catch (error) {
    console.error(`[ERROR] Failed to set claims for user ${uid}:`, error.message);
  }
}

async function setClaimsForAllUsers() {
  try {
    let nextPageToken;
    let count = 0;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);

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
