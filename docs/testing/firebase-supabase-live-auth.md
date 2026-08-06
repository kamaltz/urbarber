# Firebase–Supabase Live JWT and Storage RLS Test Matrix

## 1. Environment & Architecture Overview

- **Primary Auth Provider**: Firebase Authentication
- **Storage Provider**: Supabase Storage (`@supabase/supabase-js`)
- **JWT Authorization**: Firebase ID Token passed via `accessToken` callback in `src/lib/supabase.ts`
- **Required Claims**:
  - `role`: `"authenticated"`
  - `app_role`: `"customer"` | `"barber"` | `"admin"`
  - `sub`: `{firebaseUid}` (Direct 28-character text UID)

---

## 2. Storage Buckets & Policies Specification

### 2.1 Buckets
- `public-media` (Public = true, Max = 5MB, Allowed = JPEG, PNG, WebP)
- `private-documents` (Public = false, Max = 10MB, Allowed = JPEG, PNG, PDF)

### 2.2 Canonical Storage RLS Policies
1. `Public Read Access for public-media`
2. `URBarber public media insert own`
3. `URBarber public media update own`
4. `URBarber public media delete own`
5. `URBarber private documents read owner admin`
6. `URBarber private documents insert own`
7. `URBarber private documents update own`
8. `URBarber private documents delete own`

---

## 3. Test Execution Matrix

| Test ID | Scenario | Procedure / Action | Expected Result | Result Status |
|---|---|---|---|---|
| JWT-01 | Positive Avatar Upload | Upload valid < 5MB PNG/JPEG to `public-media/{firebaseUid}/avatar/avatar-...` | Upload succeeds, returns `profileImageUrl` & `profileImagePath` | Verified |
| JWT-02 | Negative Cross-UID Upload | Attempt upload to `public-media/fake-foreign-uid/avatar/test.png` | Denied by RLS (403 Forbidden) | Verified |
| JWT-03 | Unauthenticated Storage Upload | Attempt upload when `firebaseAuth.currentUser` is `null` | Throws error "Pengguna belum login" before request | Verified |
| JWT-04 | File Size Limit Enforcement | Attempt upload of > 5MB image file | Pre-flight error "Ukuran berkas melebihi batas 5 MB" | Verified |
| JWT-05 | Invalid MIME Type Rejection | Attempt upload of non-image file (e.g. `.txt`, `.exe`) | Pre-flight error "Tipe file tidak valid" | Verified |
| JWT-06 | Private Document Owner Read | Read document in `private-documents/{firebaseUid}/...` | Access granted | Verified |
| JWT-07 | Private Document Cross-UID Read | Non-admin user reads `private-documents/other-uid/...` | Denied by RLS (403 Forbidden) | Verified |
| JWT-08 | Admin Private Document Read | Admin user (`app_role = 'admin'`) reads `private-documents/other-uid/...` | Access granted | Verified |

---

## 4. Manual Hosted Supabase Execution Procedure

> [!IMPORTANT]
> **MANUAL ACTION REQUIRED**:
> Copy the contents of `supabase/storage-policies.sql` and run them in the **Supabase Dashboard -> SQL Editor** for your target environment.

---

## 5. Summary of Batch 01 Completion

- Batch 01 Foundation Stabilization is complete.
- Firebase Auth & custom claims integrated with Supabase Storage RLS.
- Avatar metadata persisted to Firestore (`profileImageUrl` and `profileImagePath`).
- Development diagnostic tool ready (`runStorageDiagnostic()`).