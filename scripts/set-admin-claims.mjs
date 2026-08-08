#!/usr/bin/env node

/**
 * Secure Admin Provisioning Script
 *
 * Elevates an existing Firebase Auth user to platform Admin.
 * This is the ONLY authoritative mechanism to create admin accounts.
 * Public registration does NOT support the admin role.
 *
 * Usage:
 *   node scripts/set-admin-claims.mjs --uid=<FIREBASE_UID>
 *   node scripts/set-admin-claims.mjs --email=<EMAIL>
 *
 * Requirements:
 *   - secrets/firebase-service-account.json  OR
 *   - GOOGLE_APPLICATION_CREDENTIALS env variable pointing to service account
 *
 * After running, the target user MUST re-login (or force token refresh) for
 * the new custom claims to take effect in the mobile app.
 *
 * DO NOT commit service-account credentials.
 * DO NOT expose this script via a public HTTP endpoint.
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

// ─── Argument Parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const uidArg = args.find(a => a.startsWith('--uid='))?.split('=')[1]?.trim();
const emailArg = args.find(a => a.startsWith('--email='))?.split('=')[1]?.trim();
const yesFlag = args.includes('--yes') || args.includes('-y');

if (!uidArg && !emailArg) {
  console.error(`
========================================================================
 URBarber - Secure Admin Provisioning Script
========================================================================
 Usage:
   node scripts/set-admin-claims.mjs --uid=<FIREBASE_UID>
   node scripts/set-admin-claims.mjs --email=<EMAIL_ADDRESS>

 Options:
   --yes / -y    Skip confirmation prompt (use with caution)

 This sets custom claims { role: "authenticated", app_role: "admin" }
 and updates users/{uid} to { role: "admin", status: "active" }.

 DO NOT run in production without operator review.
========================================================================
`);
  process.exit(1);
}

// ─── Firebase Admin Initialisation ───────────────────────────────────────────

async function initFirebase() {
  if (getApps().length > 0) return;

  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const defaultPaths = [
    resolve('secrets/firebase-service-account.json'),
    resolve('secrets/.service-account.json'),
  ];

  let serviceAccountPath = null;
  if (explicitPath && existsSync(explicitPath)) {
    serviceAccountPath = resolve(explicitPath);
  } else {
    for (const p of defaultPaths) {
      if (existsSync(p)) { serviceAccountPath = p; break; }
    }
  }

  if (!serviceAccountPath) {
    console.error('[ERROR] No Firebase service account found.');
    console.error('  Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json');
    console.error('  Or place the file at secrets/firebase-service-account.json');
    process.exit(1);
  }

  const raw = await readFile(serviceAccountPath, 'utf8');
  const sa = JSON.parse(raw);
  initializeApp({ credential: cert(sa) });
  console.log(`[INFO] Firebase Admin initialised using: ${serviceAccountPath}`);
}

// ─── Operator Confirmation ────────────────────────────────────────────────────

function confirm(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── Main Provisioning Logic ──────────────────────────────────────────────────

async function provision() {
  await initFirebase();

  const auth = getAuth();
  const db = getFirestore();

  // Resolve Firebase Auth user
  let userRecord;
  try {
    if (uidArg) {
      userRecord = await auth.getUser(uidArg);
    } else {
      userRecord = await auth.getUserByEmail(emailArg);
    }
  } catch (err) {
    console.error(`[ERROR] Firebase Auth user not found: ${err.message}`);
    process.exit(1);
  }

  const { uid, email, displayName } = userRecord;
  const existingClaims = userRecord.customClaims ?? {};

  console.log('\n========================================================================');
  console.log(' URBarber - Admin Provisioning');
  console.log('========================================================================');
  console.log(`  UID:          ${uid}`);
  console.log(`  Email:        ${email ?? '(none)'}`);
  console.log(`  Display Name: ${displayName ?? '(none)'}`);
  console.log(`  Current role: ${existingClaims.app_role ?? '(not set)'}`);
  console.log(`  New claims:   { role: "authenticated", app_role: "admin" }`);
  console.log('========================================================================\n');

  if (existingClaims.app_role === 'admin') {
    console.log('[INFO] User already has app_role=admin. Re-applying claims for consistency.');
  }

  if (!yesFlag) {
    const answer = await confirm('Proceed with admin provisioning? [yes/no]: ');
    if (answer !== 'yes' && answer !== 'y') {
      console.log('[ABORTED] No changes made.');
      process.exit(0);
    }
  }

  // Set Firebase Custom Claims
  // Only preserve server-controlled claims; strip any client-supplied role escalations.
  const newClaims = {
    ...existingClaims,
    role: 'authenticated',
    app_role: 'admin',
  };

  await auth.setCustomUserClaims(uid, newClaims);
  console.log('[OK] Firebase custom claims updated.');

  // Update users/{uid} in Firestore
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    await userRef.update({
      role: 'admin',
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('[OK] Firestore users document updated (role=admin, status=active).');
  } else {
    // Create minimal admin profile if not present
    await userRef.set({
      uid,
      email: email ?? '',
      name: displayName ?? email ?? uid,
      role: 'admin',
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log('[OK] Firestore users document CREATED (role=admin, status=active).');
  }

  // Verify updated claims
  const updated = await auth.getUser(uid);
  console.log('\n[VERIFICATION] Updated custom claims:');
  console.log(`  role:     ${updated.customClaims?.role}`);
  console.log(`  app_role: ${updated.customClaims?.app_role}`);

  console.log(`
========================================================================
 IMPORTANT: Token Refresh Required
========================================================================
 The user must perform ONE of the following for new claims to take effect:

   1. Log out and log back in to the URBarber app.
   2. Or the app calls: await getIdToken(user, /* forceRefresh= */ true)

 Until the token is refreshed, the old claims remain in cached JWT tokens.
========================================================================
`);
}

provision().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
