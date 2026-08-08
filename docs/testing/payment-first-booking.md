# Payment-First Booking Test Plan

**Batch**: Batch 08  
**Date**: 2026-08-08  
**Status**: Test Design (Implementation Pending)

---

## Overview

Batch 08 requires 45 automated test cases verifying payment-first slot ownership principle:
> "A customer does NOT own a final booking slot until payment has been authoritatively confirmed as `paymentStatus = 'paid'`"

All tests run locally against Firestore Emulator + Midtrans Mock.

---

## Test Categories

### Category 1: Slot Hold Creation (5 tests)

#### Test 1.1: Available Slot → Hold Created
- **Setup**: Barber exists, schedule available, no existing hold
- **Action**: POST /api/payments/create with valid barberId, date, startTime
- **Expected**:
  - Status: 201
  - Response contains holdId
  - slotLocks/{holdId} document created with customerId, expiresAt
  - Hold status: `created`
- **Assertion**: Hold owner = authenticated customer

#### Test 1.2: Final Locked Slot → Hold Denied
- **Setup**: Barber exists, final booking already accepted
- **Action**: POST /api/payments/create for same slot
- **Expected**:
  - Status: 409
  - Error code: `SLOT_NOT_AVAILABLE`
  - No new hold created
- **Assertion**: Final lock prevents new holds

#### Test 1.3: Concurrent Customers → Only One Hold
- **Setup**: Same slot, two customers make simultaneous requests
- **Action**: Both call POST /api/payments/create concurrently
- **Expected**:
  - One succeeds (201, holdId)
  - Other fails (409, `SLOT_TEMPORARILY_HELD`)
  - Only one slotLocks document exists
- **Assertion**: Transactional atomicity enforced

#### Test 1.4: Second Customer Gets SLOT_TEMPORARILY_HELD
- **Setup**: Customer A holds slot, Customer B requests same
- **Action**: POST /api/payments/create by B
- **Expected**:
  - Status: 409
  - Error code: `SLOT_TEMPORARILY_HELD`
  - Message includes retry guidance
- **Assertion**: Clear error messaging for UX

#### Test 1.5: Hold Belongs to Authenticated Customer
- **Setup**: Hold created by customer A
- **Action**: Customer A queries payment status
- **Expected**:
  - Can read own payment/hold
  - customerId matches authenticated user
- **Assertion**: Access control enforced

---

### Category 2: Payment Flow (11 tests)

#### Test 2.1: Cannot Create Payment Without Valid Hold
- **Setup**: No hold exists for requested slot
- **Action**: POST /api/payments/create
- **Expected**:
  - Status: 400 or 409
  - Error: `SLOT_NOT_AVAILABLE` or hold-related error
- **Assertion**: Hold creation is prerequisite

#### Test 2.2: Amount Calculated Server-Side
- **Setup**: Service price = 100,000 IDR, travel fee = 25,000
- **Action**: POST /api/payments/create with client-provided amount (wrong: 99,999)
- **Expected**:
  - Midtrans transaction created with server-calculated amount (125,000)
  - Payment record: amount = 125,000 (not client value)
- **Assertion**: Server-side authority on pricing

#### Test 2.3: Duplicate Request ID Is Idempotent
- **Setup**: First call succeeds with requestId = "checkout_001"
- **Action**: Retry with same requestId
- **Expected**:
  - Status: 200
  - Returns same payment/hold ID
  - No duplicate Midtrans transaction
  - No duplicate hold
- **Assertion**: Idempotency key prevents duplicates

#### Test 2.4: Pending Provider Remains Pending
- **Setup**: Midtrans status = `pending` (customer still on payment page)
- **Action**: Webhook notification with status_code = 201 (pending)
- **Expected**:
  - payment.status = `pending`
  - Booking NOT created
  - Hold remains valid
- **Assertion**: Pending ≠ paid

#### Test 2.5: Settlement Status → Paid
- **Setup**: Midtrans status = `settlement` (successful capture)
- **Action**: Webhook notification with status_code = 200, transaction_status = settlement
- **Expected**:
  - payment.status = `paid`
  - Booking created with status = `pending`
  - Final slot lock created
- **Assertion**: Settlement maps to paid

#### Test 2.6: Capture + Accept Fraud → Paid
- **Setup**: Midtrans status = `capture`, fraud_status = `accept`
- **Action**: Webhook notification
- **Expected**:
  - payment.status = `paid`
  - Booking + slot lock created
- **Assertion**: Fraud acceptance accepted

#### Test 2.7: Denied Status → Failed
- **Setup**: Midtrans status = `deny`
- **Action**: Webhook notification
- **Expected**:
  - payment.status = `failed`
  - Hold released (deleted)
  - No booking created
  - Slot available again
- **Assertion**: Failed payment releases hold

#### Test 2.8: Expired Status → Expired
- **Setup**: Midtrans status = `expire`
- **Action**: Webhook notification
- **Expected**:
  - payment.status = `expired`
  - Hold released
  - No booking created
- **Assertion**: Expired releases hold

#### Test 2.9: Cancelled Status → Cancelled
- **Setup**: Midtrans status = `cancel`
- **Action**: Webhook notification
- **Expected**:
  - payment.status = `cancelled`
  - Hold released
- **Assertion**: Cancelled releases hold

#### Test 2.10: Client Callback Cannot Mark Paid
- **Setup**: Client app receives Snap redirect_url completion
- **Action**: Client calls local state change to `paymentStatus = paid`
- **Expected**:
  - State change local only (does NOT persist)
  - Backend payment status unchanged (pending)
  - Booking NOT created until webhook/sync
- **Assertion**: Client cannot affect server state

#### Test 2.11: Customer Cannot Mark Own Payment Paid
- **Setup**: Authenticated customer with payment record
- **Action**: PUT /api/payments/{paymentId} with `status: paid`
- **Expected**:
  - Status: 403 or Firestore rule blocks
  - Payment status unchanged
- **Assertion**: Firestore rules deny client writes

---

### Category 3: Finalization Transaction (9 tests)

#### Test 3.1: Paid Payment Creates Exactly One Booking
- **Setup**: Payment in `pending` state
- **Action**: Webhook transitions to `paid`
- **Expected**:
  - Exactly one booking document created
  - status = `pending`
  - paymentStatus = `paid`
  - paidAt = now()
- **Assertion**: Transactional atomicity

#### Test 3.2: Paid Payment Creates Exactly One Final Slot Lock
- **Setup**: Hold exists, payment becomes paid
- **Action**: Webhook finalization
- **Expected**:
  - Exactly one slotLocks/{slotId} with bookingId reference
  - status field (if present) = `finalized`
- **Assertion**: One final lock per booking

#### Test 3.3: Repeated Webhook Creates No Duplicate
- **Setup**: Webhook received, processed (payment.status = paid, booking created)
- **Action**: Same webhook received again (network retry)
- **Expected**:
  - Status: 200 (idempotent)
  - Same booking document
  - No duplicate payment updates
  - No new booking created
- **Assertion**: Webhook idempotency

#### Test 3.4: Repeated Sync Creates No Duplicate
- **Setup**: Sync completed (payment transitioned to paid, booking created)
- **Action**: Same customer calls sync again
- **Expected**:
  - Status: 200
  - Same booking returned
  - No new booking created
- **Assertion**: Sync idempotency

#### Test 3.5: Webhook + Sync Race Creates No Duplicate
- **Setup**: Webhook and sync both triggered before first completes
- **Action**: Both operations race to finalize payment
- **Expected**:
  - Exactly one booking created
  - Exactly one final slot lock
  - Both return success (idempotent)
- **Assertion**: Distributed idempotency

#### Test 3.6: Wrong Customer Cannot Finalize
- **Setup**: Payment created by customer A, customer B attempts sync
- **Action**: Customer B: POST /api/payments/sync
- **Expected**:
  - Status: 403 or payment not found for B
  - No finalization
- **Assertion**: Customer isolation

#### Test 3.7: Wrong Amount Rejected
- **Setup**: Payment record has amount = 100,000, webhook contains 99,999
- **Action**: Webhook received
- **Expected**:
  - Status: 400
  - Error code: `AMOUNT_MISMATCH`
  - No finalization
- **Assertion**: Amount verification

#### Test 3.8: Unrelated Hold Rejected
- **Setup**: Payment references holdId A, but queried hold is B
- **Action**: Webhook finalization
- **Expected**:
  - Status: 400 or transaction fails
  - No booking created
- **Assertion**: Hold verification

#### Test 3.9: Paid Booking Initial Status = Pending
- **Setup**: Payment finalized
- **Action**: Query created booking
- **Expected**:
  - booking.status = `pending` (not `accepted`)
  - booking.paymentStatus = `paid`
- **Assertion**: Clear state semantics (paid ≠ accepted)

---

### Category 4: Slot Rights (1 test)

#### Test 4.1: A Pays → B Cannot Receive A's Slot
- **Setup**:
  - Slot: barber X, date Y, time Z
  - Customer A holds slot, payment initiated
  - Webhook delayed (simulated)
  - Hold appears expired (15min)
  - Customer B requests same slot
- **Action**:
  1. B: POST /api/payments/create (B requests slot)
  2. A's webhook arrives with `paid`
  3. Check who owns slot
- **Expected**:
  - B's create fails (404 or hold expired + A's payment paid)
  - A's webhook succeeds (booking created)
  - Final slot lock belongs to A
  - B must select different slot
- **Assertion**: Delayed webhook protection

---

### Category 5: Barber Operations (4 tests)

#### Test 5.1: Cannot Accept Unpaid Booking
- **Setup**: Booking with paymentStatus = `pending`
- **Action**: Barber: POST /api/barber/bookings/respond {action: accept}
- **Expected**:
  - Status: 400
  - Error code: `PAYMENT_REQUIRED`
  - Booking status unchanged
- **Assertion**: Payment guard enforced

#### Test 5.2: Can Accept Paid Finalized Booking
- **Setup**: Booking with paymentStatus = `paid`, status = `pending`
- **Action**: Barber: POST /api/barber/bookings/respond {action: accept}
- **Expected**:
  - Status: 200
  - Booking status: `accepted`
- **Assertion**: Happy path

#### Test 5.3: Reject Paid Booking Marks Refund Required
- **Setup**: Booking with paymentStatus = `paid`, status = `pending`
- **Action**: Barber: POST /api/barber/bookings/respond {action: reject, reason: "..."}
- **Expected**:
  - Status: 200
  - Booking status: `rejected`
  - Booking.refundRequired = true
  - Payment status unchanged (`paid`)
  - Slot lock released
- **Assertion**: Refund preservation

#### Test 5.4: Rejection Preserves Payment Audit Trail
- **Setup**: Booking paid + rejected with refundRequired = true
- **Action**: Admin queries payment history
- **Expected**:
  - Payment still shows status = `paid`
  - Booking shows refundRequired = true
  - Can trace: customer paid → barber rejected → manual reconciliation needed
- **Assertion**: Audit trail intact

---

### Category 6: Legacy Cash Bookings (4 tests)

#### Test 6.1: Historical Cash Record Readable
- **Setup**: Legacy booking with paymentMethod = `cash_on_service`, paymentStatus = `not_required`
- **Action**: Admin UI queries booking list
- **Expected**:
  - Booking displays (read-only)
  - paymentMethod shown as "Kas"
  - Can filter by cash_on_service
- **Assertion**: Backwards compatibility

#### Test 6.2: New Cannot Select Cash-On-Service
- **Setup**: Customer app at payment method selection
- **Action**: Try to select "Bayar di Tempat" (cash-on-service)
- **Expected**:
  - Option disabled or removed
  - Only "Midtrans" available
- **Assertion**: New bookings forced to payment-first

#### Test 6.3: New Never Writes Not-Required
- **Setup**: Create new booking
- **Action**: Inspect booking.paymentStatus in database
- **Expected**:
  - paymentStatus = `initiated` or `pending`
  - Never `not_required`
- **Assertion**: Canonical statuses only

#### Test 6.4: New Uses Midtrans-Sandbox
- **Setup**: Create new scheduled booking
- **Action**: Inspect payment.method in database
- **Expected**:
  - method = `midtrans_sandbox`
  - Never `cash_on_service`
  - Never `midtrans` (use explicit `_sandbox`)
- **Assertion**: Canonical method only

---

### Category 7: Chat Regression (4 tests)

#### Test 7.1: Unpaid Payment → No Active Chat
- **Setup**: Booking with paymentStatus = `pending`
- **Action**: Try to create conversation via POST /api/bookings/{bookingId}/chat
- **Expected**:
  - Status: 400 or 403
  - Error: chat not available or payment required
  - No conversation created
- **Assertion**: Batch 07 chat gating preserved

#### Test 7.2: Paid Finalized Booking → Chat Eligible
- **Setup**: Booking with paymentStatus = `paid`, status = `pending`
- **Action**: POST /api/bookings/{bookingId}/chat
- **Expected**:
  - Status: 200 or 201
  - Conversation created/returned
  - participants include customer + barber
- **Assertion**: Chat enabled after paid

#### Test 7.3: Temporary Hold → No Chat
- **Setup**: Hold created, payment pending
- **Action**: Try to create conversation
- **Expected**:
  - Fails (hold is not a booking)
  - No chat eligibility
- **Assertion**: Hold ≠ Booking

#### Test 7.4: Failed Payment → No Chat
- **Setup**: Payment failed, booking not created, hold released
- **Action**: Try to create conversation
- **Expected**:
  - Booking doesn't exist → 404
  - No chat possible
- **Assertion**: Failed payment blocks chat

---

## Test Execution Environment

### Local Emulation
- **Firestore**: Emulator (port 8080)
- **Midtrans**: Mock client (no real API calls)
- **Firebase Auth**: Emulator (port 9099)
- **Execution**: `npm --prefix backend/vercel run test`

### Concurrency Simulation
Tests 1.3, 3.5, 4.1 use:
- `Promise.all()` to simulate simultaneous requests
- Firestore transaction rollback on conflict
- Assert only one succeeds

### Webhook Simulation
Tests with webhook logic use:
- Mock notification payload (order_id, status_code, gross_amount, signature_key)
- Signature verification with test keys
- Assert atomic transaction results

---

## Test Data

### Fixtures

**Barber**:
```json
{
  "uid": "barber_test_001",
  "name": "Test Barber",
  "acceptingNewBookings": true,
  "schedule": {
    "monday": { "startTime": "09:00", "endTime": "20:00" },
    "tuesday": { "startTime": "09:00", "endTime": "20:00" }
  }
}
```

**Customer**:
```json
{
  "uid": "customer_test_001",
  "email": "customer@test.local"
}
```

**Service**:
```json
{
  "id": "service_haircut",
  "barberId": "barber_test_001",
  "name": "Potongan Rambut",
  "price": 100000,
  "duration": 30
}
```

**Slot**: 2026-08-15 14:00 (available)

---

## Pass Criteria

- ✅ All 45 tests execute
- ✅ No timeouts (default 10s per test)
- ✅ Zero test failures
- ✅ Concurrency tests use Firestore emulator (real transaction isolation)
- ✅ All assertions include descriptive failure messages

---

## Regression Testing (Post-Implementation)

After Batch 08 code complete:
1. Run full test suite
2. Verify: 45/45 pass
3. Check coverage: >90% on payments.ts, webhook.ts
4. Verify: no new `Math.random()` payment mocking
5. Verify: no client-side paymentStatus writes possible
6. Verify: Vercel functions still = 5 (no new endpoints)

---

## Known Limitations

- **No Live Midtrans**: Uses mock, not real Sandbox environment
- **No Live Webhooks**: Simulated via function call, not HTTP POST
- **No Two-Device Concurrency**: Local test concurrency only
- **No Payment Notifications**: Status notifications out of scope (Batch 09+)
- **No Refund Verification**: Midtrans refund not tested (manual reconciliation only)

---

