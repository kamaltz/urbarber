/**
 * Vitest global setup: points the Firebase Admin SDK at the local Firestore emulator
 * instead of production, so any test that imports src/lib/firebase-admin.js (directly
 * or transitively, e.g. via src/bookings/availability.js) never touches real data.
 *
 * Config validation (src/config/index.ts) still requires syntactically-present
 * FIREBASE_* values, so a throwaway RSA keypair is generated purely to satisfy PEM
 * parsing -- it is never used for real signing since emulator Firestore calls bypass
 * credential-based auth entirely.
 */
import { generateKeyPairSync } from 'node:crypto';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'urbarber-vitest-emulator';
process.env.FIREBASE_CLIENT_EMAIL =
  process.env.FIREBASE_CLIENT_EMAIL || 'vitest-emulator@urbarber-vitest-emulator.iam.gserviceaccount.com';

if (!process.env.FIREBASE_PRIVATE_KEY) {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  process.env.FIREBASE_PRIVATE_KEY = privateKey;
}

process.env.MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-test-key-vitest';
