# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This report presents an empirical code audit of the URBarber repository on branch `feat/batch-02-data-model-security` (based on `feat/complete-thesis-mvp`).

**Batch 01 (Foundation Stabilization)** and **Batch 02 (Data Model Harmonization & Firestore Security Rules)** are fully stabilized and verified:
- **Firebase Authentication** is the sole authentication provider.
- **Canonical Domain Models & Enums**: Defined in `src/types/domain.ts`:
  - `UserRole`: `"customer"` | `"barber"` | `"admin"`
  - `UserStatus`: `"active"` | `"pending_verification"` | `"suspended"`
  - `BookingStatus`: `"pending"` | `"accepted"` | `"rejected"` | `"in_progress"` | `"completed"` | `"cancelled"`
- **Purged Mock Fallbacks**: Production repository paths no longer return hardcoded mock data or fake payment simulations (`Math.random() > 0.1` purged).
- **Cloud Firestore Security Rules**: Production-grade `firestore.rules` (v2) implemented with default deny, RBAC helpers (`isSignedIn()`, `uid()`, `appRole()`, `isAdmin()`, `isBarber()`, `isCustomer()`, `isOwner(userId)`), and booking transition enforcement.
- **Firestore Configuration**: `firebase.json` and `firestore.indexes.json` configured for compound query indexes.
- **Rules Test Suite**: 18 automated rules unit tests added in `scripts/test-firestore-rules.js`.

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

---

## 4. Test Specifications & Verification Baseline

1. **Automated Rules Unit Tests**: Run `npm run test:rules` (tests 18 authorization and transition rules).
2. **Typecheck & Lint**: Run `npm run check` (`tsc --noEmit` and `expo lint`).
3. **Expo Doctor**: Run `npm run doctor` (`npx expo-doctor`).
4. **Git Diff Audit**: Run `git diff --check`.

---

## 5. Known Remaining Blockers & Next Batches

- **Next Batches**: Customer discovery UI, booking screens, barber operational dashboard, admin moderation dashboard.