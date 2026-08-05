# Firebase–Supabase Live JWT and RLS Test Specification

## Environment Details

- Firebase Project ID: `urbarber-f97ae`
- Supabase Project Ref: Local / Hosted Instance
- App build: Expo v57 (`fix/storage-live-validation` branch)
- Test date: 2026-08-05
- Tester: Development Team

---

## 1. MA-05 — Third-Party Auth Configuration

- Firebase integration configured: Yes
- Configuration method: Supabase Dashboard / `config.toml` (`[auth.third_party.firebase]`)
- Registered Firebase Project ID: `urbarber-f97ae`

---

## 2. MA-06 — Firebase Claims Assignment Script

Run trusted claims assignment script:
```bash
node scripts/assign-firebase-custom-claims.js --uid=<FIREBASE_UID> --app_role=<customer|barber|admin>
```
Or for all users:
```bash
npm run set-custom-claims -- --all
```

| Account | Firebase UID | Claim `role` | Claim `app_role` | Force Token Refresh Verified |
|---|---|---|---|---|
| Customer A | `<customer_uid>` | `authenticated` | `customer` | Verified |
| Barber A | `<barber_uid>` | `authenticated` | `barber` | Verified |
| Admin A | `<admin_uid>` | `authenticated` | `admin` | Verified |

---

## 3. MA-07 — Live Storage RLS Test Matrix

| ID | Scenario | Target Path | Expected Result | Verified Status |
|---|---|---|---|---|
| JWT-01 | Upload PNG image to own public folder | `public-media/{user_uid}/avatars/avatar.png` | Allowed | PENDING LIVE EXECUTION |
| JWT-02 | Upload PNG image to another user's folder | `public-media/{other_uid}/avatars/avatar.png` | Denied (`42501` / RLS Policy Error) | PENDING LIVE EXECUTION |
| JWT-03 | Upload image while unauthenticated | `public-media/{any_uid}/avatars/avatar.png` | Denied | PENDING LIVE EXECUTION |
| JWT-04 | Upload document to own private folder | `private-documents/{user_uid}/verifications/doc.pdf` | Allowed | PENDING LIVE EXECUTION |
| JWT-05 | Read another user's private document | `private-documents/{other_uid}/verifications/doc.pdf` | Denied | PENDING LIVE EXECUTION |
| JWT-06 | Admin reads another user's private document | `private-documents/{customer_uid}/verifications/doc.pdf` | Allowed (`app_role = 'admin'`) | PENDING LIVE EXECUTION |
| JWT-07 | Generate signed URL before expiry | `private-documents/{user_uid}/verifications/doc.pdf` | Allowed | PENDING LIVE EXECUTION |
| JWT-08 | Use signed URL after expiration | `private-documents/{user_uid}/verifications/doc.pdf` | Denied | PENDING LIVE EXECUTION |

---

## 4. Development Diagnostic Tool (`runStorageDiagnostic`)

Run the development diagnostic in dev environment (`__DEV__ = true`):
```typescript
import { runStorageDiagnostic } from '@/features/storage/services/storage-diagnostic.service';

const result = await runStorageDiagnostic();
console.log('Diagnostic Result:', result);
```

Expected output structure:
```json
{
  "uid": "<user_uid>",
  "role": "authenticated",
  "appRole": "customer",
  "ownUploadPath": "<user_uid>/diagnostics/test-1754412345.png",
  "ownUploadSucceeded": true,
  "unauthorizedUploadDenied": true,
  "cleanupSucceeded": true
}
```

---

## 5. Metadata Persistence Audit

Verify Firestore `customers/{user_uid}` document contains both avatar fields:
- `profileImageUrl`: `https://<supabase-url>/storage/v1/object/public/public-media/<uid>/avatars/avatar-<timestamp>.png`
- `profileImagePath`: `<uid>/avatars/avatar-<timestamp>.png`