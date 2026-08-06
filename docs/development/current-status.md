# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This report presents an empirical code audit of the URBarber repository on branch `feat/batch-04-midtrans-sandbox` (based on `feat/batch-03-customer-discovery-profile`).

**Batch 01 (Foundation Stabilization)**, **Batch 02 (Data Model Harmonization & Security Rules)**, **Batch 03 (Customer Discovery & Profile Sub-System)**, and **Batch 04 (Midtrans Sandbox Integration)** are fully stabilized and verified:
- **Firebase Authentication** is the sole authentication provider.
- **Trusted Payment Processing via Cloud Functions v2**:
  - `createBookingPayment`: Authenticated callable function creating bookings, locking slots, creating initial `payments/{bookingId}` records, calling Midtrans Snap API, and returning `redirectUrl`.
  - `midtransWebhook`: HTTPS function validating SHA512 signatures (`order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`), verifying status via Midtrans Get Status API, updating `payments` and `bookings` idempotently, and releasing slot locks for failed/expired/cancelled transactions.
  - `syncBookingPaymentStatus`: Authenticated callable function for server-side status synchronization when the payment browser closes.
- **Canonical Payment Statuses**: `initiated`, `pending`, `paid`, `failed`, `expired`, `cancelled`, `refunded`, `partially_refunded`.
- **Security Rules**: `payments/{bookingId}` collection is read-only for customer/barber/admin with zero client write access. Barber can process/accept a booking ONLY when `paymentStatus == 'paid'`.
- **Automated Test Suites**:
  - 6 unit tests in `scripts/test-midtrans-payment.js` (`npm run test`).
  - 24 automated security rules integration tests in `scripts/test-firestore-rules.js` (`npm run test:rules`).
  - Cloud Functions TypeScript build (`npm --prefix functions run build`).

---

## 2. Technical Specifications & Configuration Baseline

### 2.1 Required Firebase Custom Claims & Secret Manager
- `MIDTRANS_SERVER_KEY`: Bound to Cloud Functions via Firebase Secret Manager (`defineSecret`).
- `MIDTRANS_IS_PRODUCTION`: Parameter/environment setting set to `false`.

### 2.2 Canonical Firestore Collections & Models
1. `users/{userId}`: Core identity and role mapping.
2. `customers/{customerId}`: Customer profile details.
3. `barbers/{barberId}`: Barber public profile and rating aggregates.
4. `barberServices/{serviceId}`: Offered grooming services.
5. `barberSchedules/{barberId}`: Operating schedule and unavailable dates.
6. `categories/{categoryId}`: Service categories.
7. `bookings/{bookingId}`: Booking transactions tracking `status` and `paymentStatus`.
8. `payments/{bookingId}`: Midtrans Snap payment records tracking `status`, `transactionStatus`, `fraudStatus`, `snapToken`, `redirectUrl`.
9. `reviews/{reviewId}`: Customer reviews for completed bookings.
10. `favorites/{favoriteId}`: Customer favorite barbers.

---

## 3. Manual Actions Required

> [!IMPORTANT]
> **MANUAL ACTION REQUIRED**:
> 1. Set secret value in Firebase Secret Manager: `firebase secrets:set MIDTRANS_SERVER_KEY`.
> 2. Deploy Cloud Functions: `firebase deploy --only functions`.
> 3. Set Payment Notification URL in Midtrans Dashboard: `https://<region>-<project-id>.cloudfunctions.net/midtransWebhook`.
> 4. Deploy `firestore.rules` and `firestore.indexes.json` (`firebase deploy --only firestore`).

---

## 4. Test Specifications & Verification Baseline

1. **Automated Midtrans Unit Tests**: Run `npm run test` (tests 6 status mapping, SHA512 signature, gross amount, and slot release rules).
2. **Automated Security Rules Unit Tests**: Run `firebase emulators:exec --only firestore "npm run test:rules"` (tests 24 authorization and payment security rules).
3. **Cloud Functions Build**: Run `npm --prefix functions run build`.
4. **Typecheck & Lint**: Run `npm run check` (`tsc --noEmit` and `expo lint`).
5. **Expo Doctor**: Run `npm run doctor` (`npx expo-doctor`).
6. **Git Diff Audit**: Run `git diff --check`.

---

## 5. Known Remaining Blockers & Next Batches

- **Next Batches**: Barber operational dashboard, admin moderation dashboard.