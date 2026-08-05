# Batch 02: Supabase Storage Foundation

## 1. Scope
Establishing Supabase Storage integration foundation (`public-media` and `private-documents` buckets) for media asset management (user avatars, barber photos, service images, verification documents). Uses Firebase Auth ID tokens for storage request authorization without creating Supabase Auth sessions. UI remains unconnected in this batch.

---

## 2. Affected Files

- `[MODIFY]` [.env.example](file:///e:/app/urbarber/.env.example) (Standardize variable name `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `[MODIFY]` [supabase.ts](file:///e:/app/urbarber/src/lib/supabase.ts) (Harden Supabase client init, disable auth session persistence, ensure `accessToken` getter retrieves fresh Firebase Auth ID token)
- `[NEW]` [storage.config.ts](file:///e:/app/urbarber/src/features/services/storage.config.ts) (Typed bucket constants and storage limits)
- `[NEW]` [storage.types.ts](file:///e:/app/urbarber/src/features/services/storage.types.ts) (Define interfaces for upload, replace, delete, public URL, private upload, and signed URL)
- `[MODIFY]` [storage.service.ts](file:///e:/app/urbarber/src/features/services/storage.service.ts) (Implement storage service functions fulfilling contract)
- `[NEW]` [assign-firebase-custom-claims.js](file:///e:/app/urbarber/scripts/assign-firebase-custom-claims.js) (Node.js admin script to assign `role=authenticated` custom claim to Firebase Auth users)
- `[MODIFY]` [package.json](file:///e:/app/urbarber/package.json) (Add `set-custom-claims` npm script entry)
- `[NEW]` [storage-policies.sql](file:///e:/app/urbarber/supabase/storage-policies.sql) (SQL script creating buckets and RLS security policies on `storage.objects`)

---

## 3. Acceptance Criteria

1. Supabase client in `src/lib/supabase.ts` uses `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and initializes cleanly without throwing errors when variables are set.
2. Firebase Authentication remains the sole authentication provider. No Supabase Auth sessions are created (`auth.persistSession: false`).
3. Typed storage configuration `storage.config.ts` defines constants for `PUBLIC_MEDIA_BUCKET` (`public-media`) and `PRIVATE_DOCUMENTS_BUCKET` (`private-documents`).
4. `storageService` implements clean methods for `uploadPublicFile`, `uploadPrivateFile`, `replaceFile`, `deleteFile`, `getPublicUrl`, and `getSignedUrl`.
5. Trusted Node script `scripts/assign-firebase-custom-claims.js` uses `firebase-admin` outside the mobile bundle to assign `{ role: "authenticated" }` custom claim.
6. `supabase/storage-policies.sql` provides production RLS policies for `public-media` and `private-documents` buckets.
7. UI components remain unconnected in this batch.

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npx tsc --noEmit
npm run doctor
git diff --check
```

---

## 5. Manual User Actions

- MANUAL ACTION REQUIRED: Complete MA-05 (Configure Supabase JWT settings to verify Firebase Auth tokens).
- MANUAL ACTION REQUIRED: Complete MA-06 (Execute `supabase/storage-policies.sql` in Supabase SQL Editor).
- MANUAL ACTION REQUIRED: Complete MA-07 (Run `npm run set-custom-claims --all` with Firebase service account).
- MANUAL ACTION REQUIRED: Complete MA-08 (Set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`).

---

## 6. Rollback Notes

If Supabase Storage integration fails:
1. Revert `src/lib/supabase.ts`, `src/features/services/storage.service.ts`, `.env.example`, and `package.json`.
2. Delete `src/features/services/storage.config.ts`, `src/features/services/storage.types.ts`, `scripts/assign-firebase-custom-claims.js`, and `supabase/storage-policies.sql`.
