# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This report presents an empirical code audit of the URBarber repository on branch `chore/batch-00-branch-consolidation`.

**Batch 00 (Branch Audit & Consolidation)**, **Batch 01 (Foundation Stabilization)**, **Batch 02 (Data Model Harmonization & Security Rules)**, **Batch 03 (Customer Discovery & Profile Sub-System)**, **Batch 04 (Midtrans Sandbox Integration via Standalone Vercel Node.js Backend)**, and **Batch 05 (Barber Operations and Management Flow)** are fully audited, consolidated, stabilized, and verified:
- **Baseline Branch**: `origin/feat/batch-05-barber-operations` (HEAD: `fa4bbf1`).
- **All Remote Branches Audited**: 5 remote branches (`master`, `develop`, `feat/complete-thesis-mvp`, `fix/batch-01-foundation`, `fix/storage-live-validation`) dynamically audited with zero overwrite of newer architecture.
- **Firebase Authentication** is the sole authentication provider with `app_role` custom claims and web IndexedDB fallback persistence.
- **Standalone Vercel Node.js Backend (`backend/vercel/`)**:
  - `POST /api/payments/create`: Authenticated payment creation, idempotency via `paymentRequests/{customerId_requestId}`, atomic Firestore transactions.
  - `POST /api/payments/webhook`: Public webhook endpoint with SHA-512 signature validation and Midtrans status queries.
  - `POST /api/payments/sync`: Authenticated payment status synchronization.
  - `GET /api/payments/return`: Safe HTML redirect landing page with app deep link.
  - `POST /api/bookings/cancel`: Customer booking cancellation endpoint.
  - `POST /api/barber/bookings/respond`: Authenticated barber endpoint to accept/reject pending bookings (Accept allowed only when `paymentStatus == 'paid'`; Reject on paid returns `PAYMENT_REFUND_REQUIRED`).
  - `POST /api/barber/bookings/status`: Authenticated barber status transition endpoint (`accepted` ➔ `in_progress` ➔ `completed`).
  - `GET /api/health`: Healthcheck endpoint.
- **No Firebase Blaze Plan Required**: Serverless Node 22.x execution on Vercel.
- **Security Rules**: `payments` and `paymentRequests` collections are read-only for customer/barber/admin with zero client write access. Barber can process/accept a booking ONLY when `paymentStatus == 'paid'`.
- **Automated Test Suites**:
  - 10 Vitest unit tests in `backend/vercel/tests/` (5 payment backend tests + 5 barber operations transition tests).
  - 6 payment unit tests in `scripts/test-midtrans-payment.js` (`npm run test`).
  - 32 automated security rules integration tests in `scripts/test-firestore-rules.js` (`npm run test:rules`).
  - Root project typecheck (`npm run typecheck`) and backend typecheck (`npm --prefix backend/vercel run typecheck`).

---

## 2. Technical Specifications & Configuration Baseline

### 2.1 Required Vercel Environment Variables
- `MIDTRANS_SERVER_KEY`: Midtrans Sandbox Server Key.
- `MIDTRANS_IS_PRODUCTION`: `false` for sandbox.
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`: Firebase Admin SDK service account credentials.
- `ALLOWED_ORIGINS`: Allowed browser origins.
- `APP_DEEP_LINK_SCHEME`: Deep link scheme (`urbarber`).

### 2.2 Canonical Firestore Collections & Models
1. `users/{userId}`: Core identity and role mapping.
2. `customers/{customerId}`: Customer profile details.
3. `barbers/{barberId}`: Barber public profile and rating aggregates.
4. `barberServices/{serviceId}`: Offered grooming services.
5. `barberSchedules/{barberId}`: Operating schedule and unavailable dates.
6. `categories/{categoryId}`: Service categories.
7. `bookings/{bookingId}`: Booking transactions tracking `status` and `paymentStatus`.
8. `payments/{bookingId}`: Midtrans Snap payment records.
9. `paymentRequests/{customerId_requestId}`: Idempotency request tracking.
10. `reviews/{reviewId}`: Customer reviews for completed bookings.
11. `favorites/{favoriteId}`: Customer favorite barbers.

---

## 3. Manual Actions Required

> [!IMPORTANT]
> **MANUAL ACTION REQUIRED**:
> 1. Set environment variables in Vercel Project Settings.
> 2. Deploy `backend/vercel` to Vercel (`cd backend/vercel && vercel --prod`).
> 3. Set Payment Notification URL in Midtrans Dashboard: `https://<your-vercel-app>.vercel.app/api/payments/webhook`.
> 4. Deploy `firestore.rules` (`firebase deploy --only firestore:rules`).