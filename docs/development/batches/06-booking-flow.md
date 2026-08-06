# Batch 06: Customer Booking Flow & Midtrans Sandbox Payment Integration

## 1. Scope
Implementing full end-to-end customer booking flow and trusted Midtrans Snap Sandbox payment processing via Firebase Cloud Functions v2. Fulfills thesis requirements F-07 (Select Service), F-08 (Select Date & Schedule), F-09 (Enter Location), F-10 (Create Booking & Payment), F-11 (View Booking Status & Real-time Payment Status), F-12 (View Booking History), and F-13 (Submit Rating and Review).

---

## 2. Affected Files

- `[NEW]` [create-booking-payment.ts](file:///e:/app/urbarber/functions/src/create-booking-payment.ts) (Authenticated callable Cloud Function for slot reservation & Midtrans Snap creation)
- `[NEW]` [midtrans-webhook.ts](file:///e:/app/urbarber/functions/src/midtrans-webhook.ts) (HTTPS Cloud Function validating SHA512 signature and handling webhook notifications)
- `[NEW]` [sync-booking-payment-status.ts](file:///e:/app/urbarber/functions/src/sync-booking-payment-status.ts) (Authenticated callable Cloud Function syncing payment status server-side)
- `[NEW]` [payment.repository.ts](file:///e:/app/urbarber/src/features/payments/repository/payment.repository.ts) (Data access layer for payment callables and real-time payment listener)
- `[MODIFY]` [invoice.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/invoice.tsx) (Wired to `createBookingPayment`, WebBrowser Snap redirect, and real-time payment status)
- `[MODIFY]` [detail/[bookingId].tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/detail/\[bookingId\].tsx) (Added payment status banner and retry payment button)
- `[MODIFY]` [firestore.rules](file:///e:/app/urbarber/firestore.rules) (Restricted `payments` write access to Admin SDK and enforced payment requirement for barber processing)
- `[NEW]` [test-midtrans-payment.js](file:///e:/app/urbarber/scripts/test-midtrans-payment.js) (Unit test suite for status mapping, SHA512 signature, and slot release decisions)

---

## 3. Acceptance Criteria

1. Choosing service, date, time slot, and location creates a booking document in Firestore `bookings` collection with `status: 'pending'`, `paymentStatus: 'initiated'`, and initial `payments/{bookingId}` record.
2. Trusted Cloud Function `createBookingPayment` invokes Midtrans Snap Sandbox API using authoritative Firestore service prices and returns Snap `redirectUrl`.
3. Expo WebBrowser loads Midtrans Snap Sandbox payment flow.
4. Midtrans Webhook (`midtransWebhook`) verifies SHA512 signature, queries Midtrans Get Status API server-side, updates `payments/{bookingId}` and `bookings/{bookingId}` idempotently, and releases slot lock for failed/expired/cancelled transactions.
5. Invoice screen listens to `payments/{bookingId}` in real-time and navigates to `/(customer)/booking/detail/[bookingId]` automatically upon `paymentStatus === 'paid'`.
6. Barber cannot process/accept a booking unless `paymentStatus == 'paid'`.

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npm run test
firebase emulators:exec --only firestore "npm run test:rules"
npm --prefix functions run build
npm run check
npm run doctor
git diff --check
```

---

## 5. Manual User Actions

- MANUAL ACTION REQUIRED: Set secret in Secret Manager (`firebase secrets:set MIDTRANS_SERVER_KEY`).
- MANUAL ACTION REQUIRED: Configure Payment Notification URL in Midtrans Sandbox Dashboard (`https://<region>-<project-id>.cloudfunctions.net/midtransWebhook`).
- MANUAL ACTION REQUIRED: Deploy functions (`firebase deploy --only functions`).

---

## 6. Rollback Notes

If payment creation or webhook fails:
1. Revert `functions/` directory or inspect Cloud Functions logs (`firebase functions:log`).
2. Verify `MIDTRANS_SERVER_KEY` secret is properly set in Google Secret Manager.
