# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This report presents an empirical code audit of the URBarber repository on branch `feat/batch-03-customer-discovery-profile` (based on `feat/batch-02-data-model-security`).

**Batch 01 (Foundation Stabilization)**, **Batch 02 (Data Model Harmonization & Security Rules)**, and **Batch 03 (Customer Discovery & Profile Sub-System)** are fully stabilized and verified:
- **Firebase Authentication** is the sole authentication provider.
- **Canonical Domain Models & Enums**: Defined in `src/types/domain.ts` and `src/features/customer/types/customer.ts`.
- **Live Customer Discovery & Profile Sub-System**:
  - `/(customer)/home`: Displays live active & verified barbers and categories.
  - `/(customer)/explore`: Debounced search query and category filtering against Firestore `barbers` (`status == 'active'`, `verified == true`).
  - `/(customer)/favorites`: Favorite barbers using deterministic document identity (`favorites/{customerId}_{barberId}`).
  - `/(customer)/barber/[barberId]`: Detail view of active barber profile and services with IDR price and minute duration formatting.
  - `/(customer)/profile/account`: Edit customer profile fields (`name`, `phone`, `location`) with merge-safe Firestore updates and Supabase Storage avatar upload.
  - `/(customer)/profile/change-password`: Update password using Firebase Auth reauthentication and Indonesian error messages.
  - `/(customer)/profile/help` & `about`: FAQ and thesis application information.
  - Deleted orphaned root template `src/app/explore.tsx`.
- **Unit & Rules Test Suite**:
  - 18 automated rules unit tests in `scripts/test-firestore-rules.js`.
  - 8 automated customer discovery & profile unit tests in `scripts/test-customer-discovery.js`.

---

## 2. Technical Specifications & Configuration Baseline

### 2.1 Required Firebase Custom Claims
To access Cloud Firestore & Supabase Storage via RLS, Firebase Auth ID tokens must contain these custom claims:
- `role`: `"authenticated"` (Required for Supabase JWT authentication)
- `app_role`: `"customer"` | `"barber"` | `"admin"` (Required for role-based access control)
- `sub`: `{firebaseUid}` (Direct 28-character Firebase Auth text UID)

*Script for claim assignment*: `node scripts/assign-firebase-custom-claims.js --uid=<USER_UID> --app_role=customer`

### 2.2 Canonical Firestore Collections & Models
1. `users/{userId}`: Core identity and role mapping (`uid`, `email`, `name`, `phoneNumber`, `role`, `status`, `profileImageUrl`, `profileImagePath`, `createdAt`, `updatedAt`).
2. `customers/{customerId}`: Customer specific profile details.
3. `barbers/{barberId}`: Barber public listing, rating aggregate, and verification state.
4. `barberServices/{serviceId}`: Offered grooming services with price and duration.
5. `barberSchedules/{barberId}`: Operating schedule and unavailable dates.
6. `categories/{categoryId}`: Service category taxonomy.
7. `bookings/{bookingId}`: Booking transactions tracking canonical `status`.
8. `reviews/{reviewId}`: Customer reviews for completed bookings (1–5 rating).
9. `favorites/{favoriteId}`: Customer favorite barber bookmarks.
10. `supportTickets/{ticketId}`: Support tickets and replies.

---

## 3. Manual Actions Required

> [!IMPORTANT]
> **MANUAL ACTION REQUIRED**:
> 1. Run `supabase/storage-policies.sql` in the Supabase Dashboard SQL Editor for hosted Supabase storage.
> 2. Deploy `firestore.rules` and `firestore.indexes.json` to Firebase via Firebase Console or CLI (`firebase deploy --only firestore`).
> 3. Seed test barber data in development environment: `npm run seed:discovery`.

---

## 4. Test Specifications & Verification Baseline

1. **Automated Discovery Unit Tests**: Run `npm run test:discovery` (tests 8 search, filtering, favorite ID, and validation rules).
2. **Automated Rules Unit Tests**: Run `firebase emulators:exec --only firestore "npm run test:rules"` (tests 18 authorization and transition rules).
3. **Typecheck & Lint**: Run `npm run check` (`tsc --noEmit` and `expo lint`).
4. **Expo Doctor**: Run `npm run doctor` (`npx expo-doctor`).
5. **Git Diff Audit**: Run `git diff --check`.

---

## 5. Known Remaining Blockers & Next Batches

- **Next Batches**: Booking creation & schedule reservation screens, barber operational dashboard, admin moderation dashboard.