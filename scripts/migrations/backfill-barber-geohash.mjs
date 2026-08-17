#!/usr/bin/env node

/**
 * Legacy Barber Geohash Backfill
 *
 * Some barbers/{barberId} docs predate the geohash field (added for nearby-
 * search via geofire-common range queries -- see src/features/location/utils/
 * geo.utils.ts getGeohash / discovery.service.ts). A barber doc with a valid
 * `location` but no `geohash` is invisible to every nearby-search query,
 * silently, with no error surfaced anywhere.
 *
 * This script finds exactly those docs and computes the missing geohash --
 * nothing else. It NEVER invents a location: a doc with a missing, partial,
 * or (0,0) location is skipped, not defaulted.
 *
 * SAFE BY DEFAULT: dry-run unless --write is explicitly passed. Targets the
 * local Firestore emulator unless --live is explicitly passed.
 *
 * Usage:
 *   node scripts/migrations/backfill-barber-geohash.mjs                  (dry-run, emulator)
 *   node scripts/migrations/backfill-barber-geohash.mjs --write          (WRITES, emulator)
 *   node scripts/migrations/backfill-barber-geohash.mjs --live           (dry-run, real project)
 *   node scripts/migrations/backfill-barber-geohash.mjs --live --write   (WRITES, real project)
 *
 * Options:
 *   --live    Target the real Firebase project instead of the emulator.
 *             Requires GOOGLE_APPLICATION_CREDENTIALS or
 *             secrets/firebase-service-account.json (same discovery as
 *             scripts/set-admin-claims.mjs).
 *   --write   Actually perform the Firestore updates. Without this flag the
 *             script only reports what it would do.
 *   --yes     Skip the confirmation prompt before writing (--live --write only).
 */

import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { geohashForLocation } from 'geofire-common';
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const liveFlag = args.includes('--live');
const writeFlag = args.includes('--write');
const yesFlag = args.includes('--yes') || args.includes('-y');

/**
 * Mirrors src/features/location/utils/geo.utils.ts validateCoordinates exactly
 * (this script is root-level plain JS with no access to the mobile app's TS
 * source -- backend/vercel/src/bookings/geo-utils.ts already establishes the
 * precedent of a self-contained copy for this exact reason).
 */
function validateCoordinates(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return false;
  if (latitude === 0 && longitude === 0) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

async function initFirebase() {
  if (getApps().length > 0) return;

  if (!liveFlag) {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'urbarber-f97ae';
    initializeApp({ projectId });
    console.log(`[INFO] Firebase Admin initialised against emulator: ${emulatorHost} (project: ${projectId})`);
    return;
  }

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
    console.error('[ERROR] --live requires a Firebase service account.');
    console.error('  Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json');
    console.error('  Or place the file at secrets/firebase-service-account.json');
    process.exit(1);
  }

  const raw = await readFile(serviceAccountPath, 'utf8');
  const sa = JSON.parse(raw);
  initializeApp({ credential: cert(sa) });
  console.log(`[INFO] Firebase Admin initialised against LIVE project using: ${serviceAccountPath}`);
}

function confirm(question) {
  return new Promise((resolvePromise) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolvePromise(answer.trim().toLowerCase());
    });
  });
}

async function run() {
  await initFirebase();
  const db = getFirestore();

  console.log('\n========================================================================');
  console.log(' URBarber - Legacy Barber Geohash Backfill');
  console.log('========================================================================');
  console.log(`  Target:  ${liveFlag ? 'LIVE PROJECT' : 'Firestore emulator'}`);
  console.log(`  Mode:    ${writeFlag ? 'WRITE' : 'DRY-RUN (no writes)'}`);
  console.log('========================================================================\n');

  const snapshot = await db.collection('barbers').get();

  let scanned = 0;
  let skippedInvalid = 0;
  let skippedExisting = 0;
  const eligible = [];

  for (const docSnap of snapshot.docs) {
    scanned++;
    const data = docSnap.data();
    const location = data.location;

    const hasValidLocation =
      !!location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number' &&
      validateCoordinates(location.latitude, location.longitude);

    if (!hasValidLocation) {
      skippedInvalid++;
      continue;
    }

    const hasGeohash = typeof data.geohash === 'string' && data.geohash.length > 0;
    if (hasGeohash) {
      skippedExisting++;
      continue;
    }

    eligible.push({
      id: docSnap.id,
      latitude: location.latitude,
      longitude: location.longitude,
      geohash: geohashForLocation([location.latitude, location.longitude]),
    });
  }

  console.log(`  Scanned:          ${scanned}`);
  console.log(`  Eligible:         ${eligible.length}`);
  console.log(`  Skipped (invalid/missing location): ${skippedInvalid}`);
  console.log(`  Skipped (already has geohash):       ${skippedExisting}`);

  if (eligible.length > 0) {
    console.log('\n  Eligible barbers:');
    for (const item of eligible) {
      console.log(`    - ${item.id}: (${item.latitude}, ${item.longitude}) -> ${item.geohash}`);
    }
  }

  if (!writeFlag) {
    console.log(`\n  Would update:     ${eligible.length}`);
    console.log('\n[DRY-RUN] No changes made. Re-run with --write to apply.\n');
    return;
  }

  if (eligible.length === 0) {
    console.log('\n[OK] Nothing to update.\n');
    return;
  }

  if (liveFlag && !yesFlag) {
    const answer = await confirm(`\nAbout to write geohash to ${eligible.length} barber doc(s) on the LIVE project. Proceed? [yes/no]: `);
    if (answer !== 'yes' && answer !== 'y') {
      console.log('[ABORTED] No changes made.');
      return;
    }
  }

  let updated = 0;
  for (const item of eligible) {
    await db.collection('barbers').doc(item.id).update({
      geohash: item.geohash,
      updatedAt: FieldValue.serverTimestamp(),
    });
    updated++;
  }

  console.log(`\n  Updated:          ${updated}`);
  console.log('\n[OK] Backfill complete.\n');
}

run().catch((err) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
