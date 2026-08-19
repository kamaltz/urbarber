# URBarber Manual Actions Register

## 1. Overview
This document registers all external dashboard, cloud platform, and infrastructure configuration steps required for URBarber. All items in this document represent dashboard-only operations that cannot be performed through local code edits.

---

## 2. Firebase Console Dashboard Actions

### MA-01: Enable Email/Password Provider
- **Location**: Firebase Console -> Authentication -> Sign-in method -> Email/Password
- **Action**: MANUAL ACTION REQUIRED: Enable Email/Password authentication. Ensure "Email link (passwordless sign-in)" is disabled unless specifically requested.

### MA-02: Configure Google OAuth 2.0 Sign-In Client ID
- **Location**: Firebase Console -> Authentication -> Sign-in method -> Google, and Google Cloud Console -> APIs & Services -> Credentials
- **Symptom if skipped/wrong**: native sign-in fails immediately with `DEVELOPER_ERROR` (Android `CommonStatusCodes.DEVELOPER_ERROR`, code 10) -- this is always a config mismatch, never something fixable in app code.
- **Action**: MANUAL ACTION REQUIRED, in order:
  1. **Enable the provider**: Firebase Console -> Authentication -> Sign-in method -> Google -> Enable.
  2. **Get the Web client ID (OAuth client type 3)**: Firebase auto-creates this when the Google provider is enabled -- copy it from the same screen ("Web SDK configuration" -> Web client ID), or from Google Cloud Console -> Credentials -> OAuth 2.0 Client IDs -> the entry of type "Web application". Set it locally as `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env.local`, and as the equivalent EAS environment variable for every build profile in `eas.json` (`development`, `preview`, `preview-v11`, `production`) -- see MA-08.
  3. **Generate the SHA-1 (and SHA-256) fingerprint for each signing keystore actually used**:
     - EAS-managed credentials (used by `preview`/`preview-v11`/`production` unless overridden): run `eas credentials`, select Android -> the relevant build profile -> "Keystore: Manage everything needed to build your project" -> view the keystore, which prints the SHA-1/SHA-256.
     - Local debug keystore (used by `development`/Expo Go/local `expo run:android`): `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`.
     - A production keystore not managed by EAS: `keytool -list -v -keystore <path-to-keystore> -alias <alias>`.
  4. **Register every fingerprint from step 3** as a separate Android OAuth client under the SAME Firebase project: Firebase Console -> Project Settings -> Your apps -> the Android app (package `com.kamaltz.urbarber`, must match `app.json`'s `android.package` exactly) -> Add fingerprint. Each build profile with a different signing key needs its own registered fingerprint -- a fingerprint valid for `production` will not satisfy a `preview` APK signed differently, and vice versa.
  5. **Download the resulting `google-services.json`** (Firebase Console -> Project Settings -> Your apps -> Android app -> download) after every fingerprint change, and supply it at build time via the `GOOGLE_SERVICES_JSON` env var / EAS secret that `app.config.js` reads (`android.googleServicesFile`) -- a stale `google-services.json` from before a fingerprint was added will still fail with `DEVELOPER_ERROR` even after step 4.
  6. **Verify**: the Web client ID inside the downloaded `google-services.json` (an `oauth_client` entry with `client_type: 3`) must match `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` exactly -- a mismatch here also produces `DEVELOPER_ERROR`.

### MA-03: Create Cloud Firestore Instance & Deploy Security Rules
- **Location**: Firebase Console -> Firestore Database -> Rules
- **Action**: MANUAL ACTION REQUIRED: Create Firestore database instance in regional location (e.g., `asia-southeast1`). Deploy production security rules enforcing RBAC (`users` collection role verification) and document write restrictions.

### MA-04: Seed Initial Administrator Account
- **Location**: Firebase Console -> Authentication -> Users & Firestore Database
- **Action**: MANUAL ACTION REQUIRED: Create an initial Admin user account in Firebase Auth. Add matching user document in Firestore `users/{adminUid}` with `role: "admin"` and `status: "active"`.

---

## 3. Supabase Dashboard & Auth Integration Actions

### MA-05: Configure Supabase Third-Party JWT Settings for Firebase Auth
- **Location**: Supabase Dashboard -> Project Settings -> API / Authentication -> JWT Settings
- **Action**: MANUAL ACTION REQUIRED:
  1. Retrieve the Firebase Auth JWT Secret or Public Certificate Keys for issuer `https://securetoken.google.com/<firebase-project-id>`.
  2. In Supabase Dashboard, set the JWT Secret / JWKS URI matching your Firebase project ID so Supabase Storage engine can verify Firebase Auth ID tokens automatically.

### MA-06: Execute Storage Bucket Setup & RLS Policies SQL Script
- **Location**: Supabase Dashboard -> SQL Editor
- **Action**: MANUAL ACTION REQUIRED:
  1. Open `supabase/storage-policies.sql`.
  2. Copy and paste the script into Supabase SQL Editor and click **Run**.
  3. Verify that `public-media` and `private-documents` buckets are initialized and 8 RLS policies are active on `storage.objects`.

### MA-07: Assign Firebase Custom Claims (`role=authenticated` & `app_role`)
- **Location**: Local Admin Terminal
- **Action**: MANUAL ACTION REQUIRED:
  1. Obtain a Firebase Admin Service Account JSON file.
  2. Set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`.
  3. Run `npm run set-custom-claims -- --all` to assign `{ role: 'authenticated', app_role: '<role>' }` custom claims to all existing Firebase Auth users.

---

## 4. Local Environment File Configuration

### MA-08: Configure Environment Variables
- **Location**: Local project root `.env.local`
- **Action**: MANUAL ACTION REQUIRED: Copy `.env.example` to `.env.local` and populate environment variables:
  ```env
  EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
  EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

  EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key

  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_oauth_web_client_id
  ```
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` must also be set as an EAS environment variable for every non-development build profile (see MA-02) -- a value only in `.env.local` never reaches an EAS-built binary.

---

## 5. Development Tooling & Local Environment Fixes

### MA-09: Local Node Dependencies & TypeScript CLI Resolution
- **Location**: Local Terminal / Node environment
- **Action**: MANUAL ACTION REQUIRED: Run `npm install` to ensure `tsc` (TypeScript compiler) and `eslint` CLI binaries are linked properly in `node_modules/.bin` so that `npm run check` and `npm run lint` execute cleanly.
