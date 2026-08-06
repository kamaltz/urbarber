# Branch Consolidation Audit & Strategy Report

**Baseline Branch**: `origin/feat/batch-05-barber-operations` (HEAD SHA: `fa4bbf1`)  
**Audit Date**: 2026-08-07  
**Working Branch**: `chore/batch-00-branch-consolidation`

---

## 1. Executive Summary

This report documents the exhaustive audit of every remote branch in the `kamaltz/urbarber` repository relative to the comparison baseline `origin/feat/batch-05-barber-operations`.

All unique commits across all remote branches were inspected to determine whether their changes:
- Already exist semantically in the baseline;
- Are obsolete or superseded by newer architecture;
- Require manual semantic integration;
- Represent breaking regressions that must be excluded.

---

## 2. Branch Audit Matrix

| Branch | HEAD SHA | Ahead of baseline | Behind baseline | Unique commits | Unique files | Relevant changes | Already integrated | Action required | Final classification |
|---|---|---|---|---|---|---|---|---|---|
| `origin/master` | `54a06f5` | 0 | 13 | 0 | 0 | None | Yes | None | `fully-contained` |
| `origin/develop` | `0e007d0` | 0 | 9 | 0 | 0 | None | Yes | None | `fully-contained` |
| `origin/feat/complete-thesis-mvp` | `c01692c` | 0 | 6 | 0 | 0 | None | Yes | None | `fully-contained` |
| `origin/fix/batch-01-foundation` | `5d9c6c7` | 0 | 5 | 0 | 0 | None | Yes | None | `fully-contained` |
| `origin/fix/storage-live-validation` | `e880fb5` | 3 | 7 | 3 | 16 | Storage RLS & Avatar persistence | Semantically integrated | Integrated missing token claim checks & web fallbacks | `requires-integration` |

---

## 3. Detailed Decision Records for Unique Commits

### Branch: `origin/fix/storage-live-validation`

#### Commit 1: `950d83a` — `fix: validate Firebase JWT storage RLS and avatar persistence`
- **Author**: kamaltz
- **Date**: 2026-08-06
- **Affected Files**:
  - `docs/development/current-status.md`
  - `docs/testing/firebase-supabase-live-auth.md`
  - `scripts/assign-firebase-custom-claims.js`
  - `src/app/(customer)/home.tsx` (REJECTED REGRESSION)
  - `src/app/(customer)/profile.tsx`
  - `src/features/auth/context/auth-context.tsx`
  - `src/features/auth/services/auth.service.ts`
  - `src/features/auth/types/auth.ts`
  - `src/features/customer/hooks/use-customer-profile.ts`
  - `src/features/customer/repository/customer.repository.ts`
  - `src/features/customer/types/customer.ts`
  - `src/features/services/storage.service.ts`
  - `src/features/storage/services/storage-diagnostic.service.ts`
  - `supabase/storage-policies.sql`
- **Analysis & Decision**:
  - **Firebase Token Claim Validation & Error Messages**: Integrated into `src/app/(customer)/profile.tsx`.
  - **AuthUser profileImagePath field**: Integrated into `src/features/auth/types/auth.ts` and `auth-context.tsx`.
  - **Removal of MOCK_CUSTOMER_PROFILE fallback**: Integrated into `src/features/customer/hooks/use-customer-profile.ts`.
  - **Home Screen Reversion (`src/app/(customer)/home.tsx`)**: **REJECTED**. The diff in `home.tsx` reverted the modern Indonesian customer discovery UI back to an old English draft without the Avatar component or Garut discovery items. The baseline implementation was preserved.
  - **Custom Claim Script (`scripts/assign-firebase-custom-claims.js`)**: Updated to support modular Firebase Admin SDK and secret auto-detection.
  - **Storage SQL Policies (`supabase/storage-policies.sql`)**: Updated to use idempotent policy drops and standardized names while adhering strictly to all Section G security rules.
- **Classification**: `partially-required` (Integrated non-regressive fixes, rejected UI regression).

#### Commit 2: `cdfd3bc` — `fix warning hidden`
- **Author**: kamaltz
- **Date**: 2026-08-06
- **Affected Files**:
  - `src/lib/firebase.ts`
- **Analysis & Decision**:
  - Implements `initializeAuth` with `[indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]` under a `Platform.OS === 'web'` try-catch block to prevent browser tab switching IndexedDB crashes ("Database is closing/hidden").
  - **Decision**: **INTEGRATED**. Added to `src/lib/firebase.ts`.
- **Classification**: `requires-integration` (Fully integrated).

#### Commit 3: `e880fb5` — `fix profile`
- **Author**: kamaltz
- **Date**: 2026-08-06
- **Affected Files**:
  - `src/app/(customer)/profile.tsx`
- **Analysis & Decision**:
  - Refined avatar upload status messages and photoURL/profileImageUrl persistence.
  - **Decision**: **INTEGRATED**. Incorporated into `src/app/(customer)/profile.tsx`.
- **Classification**: `requires-integration` (Fully integrated).

---

## 4. Storage & Secret Safety Verification

- **Supabase Policy SQL Safety**:
  - `storage.objects` table structure is unchanged.
  - `owner` / `owner_id` columns are untouched.
  - `auth.uid()` is NOT overridden.
  - Text matching uses `(storage.foldername(name))[1] = (auth.jwt() ->> 'sub')` without `::uuid` casting.
  - `app_role = 'admin'` checked for administrative access.
  - `UPDATE` policies retain both `USING` and `WITH CHECK`.
  - Policy script is idempotent.
- **Secrets Audit**:
  - Secrets files (`.env.local`, `service-account*.json`) remain gitignored.
  - No secret tokens, private keys, or Midtrans keys exposed.

---

## 5. Deletion & Cleanup Recommendations

The following branches are **fully contained** in the baseline and are safe to be deleted from remote in a future maintenance task (outside Batch 00):
1. `origin/master`
2. `origin/develop`
3. `origin/feat/complete-thesis-mvp`
4. `origin/fix/batch-01-foundation`
5. `origin/fix/storage-live-validation` (now that all valid changes have been semantically integrated into `chore/batch-00-branch-consolidation`).
