# Midtrans Snap Sandbox Integration & Testing Guide

This guide details the architecture, security model, configuration, and manual testing procedures for the URBarber Midtrans Snap Sandbox payment integration.

---

## 1. Architecture & Trusted Backend Flow

All payment creation and status updates are managed by trusted **Firebase Cloud Functions v2** (Node.js 20 / TypeScript). Client Expo applications never touch secret keys or alter payment statuses directly.

```
Expo App (Invoice UI) 
  ──> createBookingPayment (Callable Function)
      ├── Validates Customer, Barber, Service, and Slot Availability
      ├── Atomic Firestore Transaction: Creates Booking, Slot Lock, and Payment Record
      └── Calls Midtrans Snap API with Authoritative Service Amount
  <── Returns Snap Redirect URL & Token
  
User completes payment in WebBrowser / Snap Redirect
  ──> Midtrans Webhook (HTTPS Function: midtransWebhook)
      ├── Validates SHA512 Signature (order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
      ├── Queries Midtrans Get Status API server-side
      ├── Idempotent Update: Updates payments/{bookingId} & bookings/{bookingId}
      └── Releases Slot Lock if payment failed, cancelled, or expired
```

---

## 2. Firebase Blaze & Secret Manager Setup

### 2.1 Firebase Blaze Plan
- **Requirement**: Deploying Cloud Functions v2 and using Google Secret Manager requires your Firebase project (`urbarber-f97ae`) to be on the **Firebase Blaze (pay-as-you-go)** plan.
- **Local Emulation**: Firebase Local Emulator Suite works without a paid plan.

### 2.2 Configuring Secret Manager
Store your Midtrans Server Key securely in Firebase Secret Manager:

```bash
# Set secret value in Firebase Secret Manager
firebase secrets:set MIDTRANS_SERVER_KEY
# Enter your Midtrans Sandbox Server Key when prompted (e.g., SB-Mid-server-xxx)
```

---

## 3. Midtrans Dashboard Configuration

Log in to [Midtrans MAP Sandbox Dashboard](https://dashboard.sandbox.midtrans.com/):

1. **Access Keys**:
   - Go to **Settings > Access Keys**.
   - Copy **Server Key** (`SB-Mid-server-...`) and **Client Key** (`SB-Mid-client-...`).
2. **Notification URL Setup**:
   - Go to **Settings > Configuration**.
   - Set **Payment Notification URL**:
     `https://<region>-<project-id>.cloudfunctions.net/midtransWebhook`
   - (For local testing with emulator, use ngrok or webhook relay tool: `https://<ngrok-id>.ngrok-free.app/urbarber-f97ae/us-central1/midtransWebhook`).
3. **Finish / Unfinish Redirect URL**:
   - Set **Finish Redirect URL**: `urbarber://booking/history`
   - Set **Unfinish Redirect URL**: `urbarber://booking/invoice`
   - Set **Error Redirect URL**: `urbarber://booking/invoice`

---

## 4. Status Mapping Reference

| Midtrans `transaction_status` | `fraud_status` | Canonical `PaymentStatus` | `BookingStatus` | Slot Lock Action |
|---|---|---|---|---|
| `pending` | - | `pending` | `pending` | Retained |
| `settlement` | - | `paid` | `pending` | Retained |
| `capture` | `accept` | `paid` | `pending` | Retained |
| `capture` | `challenge` / non-accept | `failed` | `pending` | **Released** |
| `deny` | - | `failed` | `pending` | **Released** |
| `cancel` | - | `cancelled` | `pending` | **Released** |
| `expire` | - | `expired` | `pending` | **Released** |
| `refund` | - | `refunded` | `pending` | **Released** |
| `partial_refund` | - | `partially_refunded` | `pending` | Retained |

---

## 5. Security Model & Rules Rules Summary

1. **Firestore Client Rules**:
   - `payments/{bookingId}` is **read-only** for the customer, assigned barber, and admin.
   - Client attempts to `create`, `update`, or `delete` payment records are strictly **DENIED**.
   - Clients cannot alter `paymentStatus` or `paidAt` fields on `bookings/{bookingId}` documents directly.
   - Barber update restriction: barber can process/accept a booking ONLY when `paymentStatus == 'paid'`.
2. **Server-Side Validation**:
   - Webhook validates SHA512 signature key (`order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY`).
   - Webhook checks stored `grossAmount` against notification amount before state transition.
   - Webhook calls Midtrans Get Status API server-side to confirm status.

---

## 6. Manual Testing Scenarios (Sandbox Simulator)

Use [Midtrans Payment Simulator](https://simulator.sandbox.midtrans.com/):

### Scenario 1: Successful Payment (Settlement)
1. Open Expo app, navigate to barber detail, choose service and slot, tap **Pesan & Bayar**.
2. Invoice screen opens, calling `createBookingPayment`. Snap redirect URL is loaded.
3. Open simulator, choose **BCA Virtual Account / QRIS**, enter test VA number, click **Pay**.
4. Midtrans sends `settlement` webhook -> `payments/{bookingId}` updates to `paid` in real-time -> Invoice screen automatically navigates to `/(customer)/booking/detail/[bookingId]`.

### Scenario 2: Expired Payment
1. Create a booking payment transaction in sandbox.
2. In simulator, let 15-minute expiry pass or trigger **Expire** in sandbox dashboard.
3. Webhook sets `paymentStatus = 'expired'` -> Slot lock is automatically released in Firestore.

### Scenario 3: Cancelled Payment
1. Create a booking payment transaction.
2. User cancels payment flow in Snap browser or clicks Cancel in simulator.
3. Webhook sets `paymentStatus = 'cancelled'` -> Slot lock is automatically released.

---

## 7. Production Migration Checklist

- [ ] Upgrade Firebase project to Blaze plan.
- [ ] Set production `MIDTRANS_SERVER_KEY` in Secret Manager (`firebase secrets:set MIDTRANS_SERVER_KEY`).
- [ ] Set `MIDTRANS_IS_PRODUCTION=true` parameter in Cloud Functions.
- [ ] Update Midtrans Production Dashboard notification URL to production HTTPS function URL.
- [ ] Test production webhook signature verification with 1 live test transaction.
