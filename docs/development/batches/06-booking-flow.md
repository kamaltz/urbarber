# Batch 06: Customer Booking Flow & Midtrans Sandbox Payment Integration (Vercel Backend)

## 1. Scope
Implementing full end-to-end customer booking flow and trusted Midtrans Snap Sandbox payment processing via a standalone **Vercel Node.js backend** (`backend/vercel/`). Fulfills thesis requirements F-07 (Select Service), F-08 (Select Date & Schedule), F-09 (Enter Location), F-10 (Create Booking & Payment), F-11 (View Booking Status & Real-time Payment Status), F-12 (View Booking History), and F-13 (Submit Rating and Review).

---

## 2. Affected Files

- `[NEW]` [backend/vercel/package.json](file:///e:/app/urbarber/backend/vercel/package.json) (Vercel backend Node 22 project definition)
- `[NEW]` [backend/vercel/api/payments/create.ts](file:///e:/app/urbarber/backend/vercel/api/payments/create.ts) (Authenticated payment creation endpoint)
- `[NEW]` [backend/vercel/api/payments/webhook.ts](file:///e:/app/urbarber/backend/vercel/api/payments/webhook.ts) (HTTPS Webhook endpoint with SHA-512 signature verification)
- `[NEW]` [backend/vercel/api/payments/sync.ts](file:///e:/app/urbarber/backend/vercel/api/payments/sync.ts) (Authenticated payment status sync endpoint)
- `[NEW]` [backend/vercel/api/payments/return.ts](file:///e:/app/urbarber/backend/vercel/api/payments/return.ts) (HTML landing page with app deep link)
- `[NEW]` [backend/vercel/api/bookings/cancel.ts](file:///e:/app/urbarber/backend/vercel/api/bookings/cancel.ts) (Customer booking cancellation endpoint)
- `[NEW]` [backend/vercel/api/health.ts](file:///e:/app/urbarber/backend/vercel/api/health.ts) (Healthcheck endpoint)
- `[NEW]` [payment-api.service.ts](file:///e:/app/urbarber/src/features/payments/services/payment-api.service.ts) (Expo client Payment API service)
- `[MODIFY]` [payment.repository.ts](file:///e:/app/urbarber/src/features/payments/repository/payment.repository.ts) (Wired client repository to Vercel API and Firestore real-time listener)
- `[MODIFY]` [invoice.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/invoice.tsx) (Wired to `paymentApiService`, unique `requestId` idempotency key, WebBrowser Snap redirect)
- `[MODIFY]` [firestore.rules](file:///e:/app/urbarber/firestore.rules) (Restricted `payments` and `paymentRequests` write access to Admin SDK)

---

## 3. Acceptance Criteria

1. Customer submits booking payment with a unique `requestId` to Vercel backend (`POST /api/payments/create`).
2. Trusted Vercel backend verifies Firebase ID token, checks schedule availability, calculates authoritative service price, creates booking (`status: 'pending'`, `paymentStatus: 'initiated'`), slot lock, payment record, and `paymentRequests` document in an atomic Firestore transaction.
3. Vercel backend calls Midtrans Snap Sandbox API server-side and returns Snap `redirectUrl` & `snapToken`.
4. Expo WebBrowser loads Midtrans Snap Sandbox payment flow.
5. Midtrans Webhook (`/api/payments/webhook`) verifies SHA-512 signature, queries status via Midtrans Get Status API server-side, updates `payments` & `bookings` idempotently, and releases slot lock for failed/expired/cancelled transactions.
6. Invoice screen listens to `payments/{bookingId}` in real-time and navigates to `/(customer)/booking/detail/[bookingId]` automatically upon `paymentStatus === 'paid'`.
7. Barber cannot process/accept a booking unless `paymentStatus == 'paid'`.

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npm --prefix backend/vercel run test
npm --prefix backend/vercel run typecheck
npm run test
firebase emulators:exec --only firestore "npm run test:rules"
npm run typecheck
npm run check
git diff --check
```

---

## 5. Manual User Actions

- MANUAL ACTION REQUIRED: Set Vercel environment variables (`MIDTRANS_SERVER_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `ALLOWED_ORIGINS`, `APP_DEEP_LINK_SCHEME`).
- MANUAL ACTION REQUIRED: Deploy Vercel backend (`cd backend/vercel && vercel`).
- MANUAL ACTION REQUIRED: Configure Payment Notification URL in Midtrans Sandbox Dashboard (`https://<your-vercel-app>.vercel.app/api/payments/webhook`).

---

## 6. Rollback Notes

If payment creation or webhook fails:
1. Revert `backend/vercel` directory or inspect Vercel Deployment Function logs in Vercel Dashboard.
2. Verify environment variables in Vercel Project Settings.
