# Midtrans Snap Sandbox Integration & Vercel Backend Guide

This guide details the architecture, configuration, deployment procedure, and manual testing for the URBarber Midtrans Snap Sandbox payment integration using a **standalone Vercel Node.js backend** (`backend/vercel/`).

---

## 1. Vercel Backend Architecture

All payment transactions, slot reservations, status synchronizations, and webhooks are processed by a standalone **Vercel Node.js backend** (Node 22.x / TypeScript). The client application never touches secret keys or updates payment statuses directly.

- **No Firebase Blaze Plan Required**: The backend runs serverless on Vercel Node.js runtime.
- **Firebase Authentication**: Client sends `Authorization: Bearer <Firebase_ID_Token>`. The backend verifies tokens using `firebase-admin`.
- **Cloud Firestore**: Data storage for bookings, payment records, slot locks, and idempotency tracking (`paymentRequests/{customerId_requestId}`).

```
Expo Client Application
  ──> Firebase Auth (Obtains ID Token)
  ──> POST /api/payments/create (Bearer <Token>)
      ├── Validates Customer, Barber, Service, and Slot Availability
      ├── Atomic Firestore Transaction: Booking, Slot Lock, Payment, Payment Request
      └── Calls Midtrans Snap Sandbox API
  <── Returns Snap Redirect URL, Token, Order ID, Booking ID

User completes payment in WebBrowser / Snap Redirect
  ──> Midtrans Webhook: POST /api/payments/webhook
      ├── Validates SHA-512 Signature (order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
      ├── Queries Midtrans Get Status API server-side
      ├── Idempotent Update: Updates payments/{bookingId} & bookings/{bookingId}
      └── Releases Slot Lock if payment failed, cancelled, or expired
```

---

## 2. Server-Only Environment Variables (Vercel)

Configure the following environment variables in your Vercel Project Settings (**Settings > Environment Variables**):

| Variable Name | Description | Example / Required |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | Midtrans Sandbox Server Key | `SB-Mid-server-...` |
| `MIDTRANS_IS_PRODUCTION` | Production flag (`false` for sandbox) | `false` |
| `FIREBASE_PROJECT_ID` | Firebase Project ID | `urbarber-f97ae` |
| `FIREBASE_CLIENT_EMAIL` | Firebase Admin Service Account Email | `firebase-adminsdk-xxx@...` |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin Service Account Private Key | `"-----BEGIN PRIVATE KEY-----\n..."` |
| `ALLOWED_ORIGINS` | Allowed CORS Origins | `http://localhost:8081,http://localhost:19006` |
| `APP_DEEP_LINK_SCHEME` | Mobile App Deep Link Scheme | `urbarber` |
| `PAYMENT_RETURN_BASE_URL` | Vercel Backend Public Base URL | `https://your-vercel-backend.vercel.app` |

---

## 3. Expo Client Environment Variable

In `e:\app\urbarber\.env` or `.env.local`:

```env
EXPO_PUBLIC_PAYMENT_API_BASE_URL=https://your-vercel-backend.vercel.app
```

---

## 4. Vercel Backend Folder Structure

```
backend/vercel/
├── api/
│   ├── health.ts             # GET /api/health
│   ├── payments/
│   │   ├── create.ts         # POST /api/payments/create
│   │   ├── webhook.ts        # POST /api/payments/webhook
│   │   ├── sync.ts           # POST /api/payments/sync
│   │   └── return.ts         # GET /api/payments/return
│   └── bookings/
│       └── cancel.ts         # POST /api/bookings/cancel
├── src/
│   ├── config/index.ts       # Server config & Zod validation
│   ├── lib/
│   │   ├── firebase-admin.ts # Firebase Admin Auth & Firestore singleton
│   │   ├── cors.ts           # Origin & preflight CORS handler
│   │   └── auth-middleware.ts# Firebase ID token verification
│   ├── payments/
│   │   ├── signature.ts      # SHA-512 signature utilities
│   │   └── status-mapper.ts  # Midtrans status mapping & slot release rules
│   └── bookings/
│       └── slot-lock.ts      # Deterministic slot lock key generator
├── tests/
│   └── backend.test.ts       # Vitest backend unit test suite
├── package.json
├── tsconfig.json
└── vercel.json
```

---

## 5. Local Development Procedure

1. **Install Backend Dependencies**:
   ```bash
   npm --prefix backend/vercel install
   ```

2. **Run Backend Unit Tests**:
   ```bash
   npm --prefix backend/vercel run test
   ```

3. **Run Backend Typecheck**:
   ```bash
   npm --prefix backend/vercel run typecheck
   ```

4. **Run Local Vercel Dev Server**:
   ```bash
   cd backend/vercel
   vercel dev
   ```

---

## 6. Vercel Deployment Procedure

1. Push your changes to repository.
2. Import `backend/vercel` into Vercel as a new project or set **Root Directory** to `backend/vercel`.
3. Add required Environment Variables in Vercel Dashboard.
4. Deploy project to Vercel.

---

## 7. Midtrans Dashboard Configuration

Log in to [Midtrans MAP Sandbox Dashboard](https://dashboard.sandbox.midtrans.com/):

1. **Payment Notification URL**:
   Set to `https://<your-vercel-app>.vercel.app/api/payments/webhook`.
2. **Finish / Unfinish Redirect URL**:
   Set to `https://<your-vercel-app>.vercel.app/api/payments/return`.

---

## 8. Manual Testing Scenarios (Midtrans Sandbox Simulator)

Use [Midtrans Payment Simulator](https://simulator.sandbox.midtrans.com/):

### Scenario 1: Settlement Flow (BCA VA / QRIS / GoPay)
1. Select barber and service in Expo app, tap **Pesan & Bayar**.
2. App sends `POST /api/payments/create` to Vercel backend with Firebase ID token.
3. Midtrans Snap redirect URL opens in WebBrowser.
4. Pay in Midtrans Simulator ➔ Webhook (`POST /api/payments/webhook`) updates status to `paid` ➔ App real-time listener auto-navigates to booking detail screen.

### Scenario 2: Expired Payment Flow
1. Create payment ➔ Let 15-minute expiry pass ➔ Webhook sets status `expired` ➔ Slot lock is automatically deleted in Firestore.

### Scenario 3: Cancelled Payment Flow
1. Create payment ➔ User cancels in Snap browser or taps cancel ➔ Webhook/Sync sets status `cancelled` ➔ Slot lock is released.

---

## 9. Production Migration Checklist

- [ ] Add production Midtrans credentials to Vercel Environment Variables (`MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION=true`).
- [ ] Add production Firebase Service Account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
- [ ] Configure production Payment Notification URL in Midtrans Production MAP Dashboard.
- [ ] Run 1 live test transaction.
