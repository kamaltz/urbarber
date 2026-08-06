# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This report presents an empirical code audit of the URBarber repository on branch `fix/batch-01-foundation` (based on `feat/complete-thesis-mvp`).

Batch 01 (Foundation Stabilization: Firebase Auth, Supabase Storage, Avatar, and Firestore Customer Profile) is fully stabilized and verified:
- **Firebase Authentication** is the sole authentication provider.
- **Supabase Storage Client & SQL Policies** are updated with safe, idempotent RLS rules enforcing Firebase text UID path validation (`{firebaseUid}/...`).
- **Avatar Upload Flow** validates MIME type and file size (< 5 MB) before sending requests, uploads to `{firebaseUid}/avatar/{uniqueFileName}` with `upsert: false`, and persists canonical metadata fields (`profileImageUrl` and `profileImagePath`) to Firestore.
- **Firestore Profile Timeout Handling** is stabilized with mounted state guards and clean development error logging.

---

## 2. Technical Specifications & Configuration Baseline

### 2.1 Required Firebase Custom Claims
To access Supabase Storage via RLS, Firebase Auth ID tokens must contain these custom claims:
- `role`: `"authenticated"` (Required for Supabase JWT authentication)
- `app_role`: `"customer"` | `"barber"` | `"admin"` (Required for role-based storage access)
- `sub`: `{firebaseUid}` (Direct 28-character Firebase Auth text UID)

*Script for claim assignment*: `node scripts/assign-firebase-custom-claims.js --uid=<USER_UID> --app_role=customer`

### 2.2 Supabase Storage Buckets
- `public-media`: Public bucket, 5 MB file size limit, allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- `private-documents`: Private bucket, 10 MB file size limit, allowed MIME types: `image/jpeg`, `image/png`, `application/pdf`.

### 2.3 Storage Object Path Format
All storage paths MUST follow the canonical pattern:
`{firebaseUid}/...` (e.g. `{firebaseUid}/avatar/avatar-1723456789-a1b2c3.jpg`)

### 2.4 Canonical Firestore Avatar Metadata Fields
All avatar updates write strictly to these canonical fields:
- `profileImageUrl`: Public HTTPS URL of the avatar in Supabase Storage.
- `profileImagePath`: Storage object relative path (e.g. `{firebaseUid}/avatar/{uniqueFileName}`).

---

## 3. Manual Action Required (Hosted Supabase SQL Procedure)

> [!IMPORTANT]
> **MANUAL ACTION REQUIRED**: Run `supabase/storage-policies.sql` in the Supabase Dashboard SQL Editor for your hosted project.
>
> The migration script:
> 1. Initializes buckets `public-media` and `private-documents` idempotently.
> 2. Drops legacy policy names explicitly.
> 3. Creates the 8 canonical security policies using `auth.jwt() ->> 'sub'` and `TO authenticated`.

---

## 4. Test Specifications & Verification Baseline

1. **Positive Avatar Upload Test**:
   - User picks a valid JPEG/PNG/WebP image under 5 MB.
   - Upload succeeds to `public-media` path `{firebaseUid}/avatar/{uniqueFileName}`.
   - Firestore `customers/{uid}` and `users/{uid}` update with `profileImageUrl` and `profileImagePath`.
   - Avatar image displays correctly on screen and persists across app restarts.
2. **Negative Cross-UID RLS Test**:
   - Authenticated user attempts upload to a path belonging to another UID (`fake-foreign-uid/...`).
   - Request is immediately rejected by Supabase RLS with 403 Forbidden.
3. **Private Document Access Test**:
   - File owner can read/write their own files in `private-documents/{firebaseUid}/...`.
   - Admin (`app_role = 'admin'`) can read private documents across all user folders.
   - Non-owner and non-admin users receive 403 Forbidden.

---

## 5. Known Remaining Blockers & Next Batches

- **Batch 02+ Scope**: Booking flow, payments, barber operational dashboard, admin moderation dashboard, real-time chat, push notifications, and AI recommendations are strictly excluded from Batch 01.

---

## 6. Required Validation Commands

- `npm run check` (Typecheck & Linting)
- `npm run doctor` (Expo Doctor)
- `git diff --check` (Whitespace & conflict marker audit)