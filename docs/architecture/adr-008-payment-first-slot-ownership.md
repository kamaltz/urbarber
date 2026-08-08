# ADR-008: Payment-First Slot Ownership

**Date**: 2026-08-08  
**Status**: Accepted  
**Context**: Batch 08 - Payment-First Booking and Transactional Slot Ownership

---

## Problem Statement

Previous architecture allowed:
- Booking creation before payment confirmation
- Multiple payment states without clear ownership semantics
- Client-side payment success (browser redirect) treated as authoritative
- Webhook as optional confirmation path

This creates risk:
- Customer A pays via Midtrans
- Webhook delayed
- System expires hold, offers slot to Customer B
- Webhook arrives late → double-booking or state confusion
- "Payment pending" treated same as "paid" in some code paths

**Principle**: A customer does NOT own a final booking slot until payment has been authoritatively confirmed as `paymentStatus = "paid"` by trusted backend verification.

---

## Decision

Implement **strict payment-first reservation** where:

1. **Payment-First**: Only trusted backend payment verification may create final booking and final slot lock
2. **Separate Concepts**: Clearly distinguish:
   - Temporary checkout hold (prevents concurrency, expires on payment failure)
   - Payment state machine (initiated → pending → paid)
   - Final booking (only after paid state confirmed)
   - Final slot ownership (locked after booking finalized)
3. **Authoritative Backend**: Only Midtrans webhook (verified) or sync endpoint (authenticated + verified) may transition payment to `paid`
4. **Idempotency**: Repeated webhook/sync produce exactly one booking + one final slot lock
5. **Delayed Webhook Protection**: Before releasing apparently expired hold, verify payment status server-side

---

## Consequences

### Positive
- ✅ Clear ownership semantics: "paid → slot owner"
- ✅ No double-booking race conditions (transactional slot lock)
- ✅ Delayed webhook protection: payment paid = slot preserved
- ✅ Audit trail: payment audit separate from slot availability
- ✅ Refund accountability: paid booking cancellation tracked explicitly

### Negative / Tradeoffs
- ❌ Batch 08 does NOT implement automated refunds (manual reconciliation required)
- ❌ Barber rejection of paid booking leaves payment in `paid` state (requires admin action)
- ❌ Slot release on paid cancellation/rejection is explicit, not automatic
- ⚠️ Admin dashboard must support manual refund operations (Batch 09+)

### Implementation Scope (Batch 08)

**IN SCOPE**:
- Payment-first principle enforcement
- Hold ≠ Booking conceptually clear
- Atomic paid-finalization transaction
- Webhook/sync convergence on same logic
- Delayed webhook protection
- Refund tracking (mark `refundRequired: true`)

**OUT OF SCOPE (Batch 09+)**:
- Automated refund via Midtrans API
- Admin refund UI
- Payment status notifications
- Production Midtrans integration

---

## Architecture

### State Machine: Payment

```
initiated → pending → paid
                  ↓
                failed → (release hold)
                  ↓
              cancelled → (release hold)
                  ↓
                expired → (release hold)
```

Only `paid` state creates final booking.

### State Machine: Booking

```
pending (paid) → accepted → in_progress → completed
        ↓
      rejected → mark refundRequired: true
        ↓
      cancelled → mark refundRequired: true
```

Initial status is `pending` only after payment is `paid`.

### Slot Lifecycle

1. **Temporary Hold** (checkout attempt):
   - Created: before payment initiated
   - Expires: on payment failure/expiry/timeout
   - Released: when hold expires + payment NOT paid
   - Scope: prevents concurrent customers from paying same slot

2. **Final Slot Lock** (after paid):
   - Created: atomically with booking finalization when payment → paid
   - Preserved: until booking completed or rejected/cancelled
   - Released: when booking rejected/cancelled (slot returns to calendar)
   - Scope: represents Barber unavailability during booking lifecycle

### Key Transactions

**1. Create Temporary Hold**
```typescript
// Must be atomic
await db.runTransaction(async (t) => {
  // 1. Verify Barber & service
  // 2. Verify schedule available
  // 3. Verify no final slot lock exists
  // 4. Verify no other valid hold exists
  // 5. Create hold with status: 'created'
})
```

**2. Finalize Payment → Create Booking**
```typescript
// Must be atomic
await db.runTransaction(async (t) => {
  // 1. Verify payment exists & belongs to customer
  // 2. Verify payment.status === 'paid'
  // 3. Verify amount matches stored
  // 4. Verify hold belongs to payment/customer
  // 5. Verify no final slot lock exists
  // 6. Mark payment finalized
  // 7. Create booking with status: 'pending'
  // 8. Create final slot lock
  // 9. Mark hold converted
})
```

---

## Canonical Statuses

### PaymentStatus (Canonical)
- `initiated`: Payment record created
- `pending`: Midtrans processing (waiting for capture/settlement)
- `paid`: Payment confirmed by Midtrans webhook or sync (→ booking created)
- `failed`: Payment rejected by provider
- `expired`: Payment validity window passed
- `cancelled`: Payment explicitly cancelled
- `refunded`: Refund issued to customer
- `partially_refunded`: Partial refund issued

**Legacy Only** (read compatibility):
- `not_required`: Historical cash-on-service bookings (never create new)
- `completed`: Alias for `paid` in legacy data (map to `paid` in queries)

### PaymentMethod (New Writes Only)
- `"midtrans_sandbox"`: Required for all new scheduled bookings (Batch 08-09)

**Legacy Only** (read compatibility):
- `"cash_on_service"`: Historical bookings (never create new)
- `"midtrans"`: Wrong value, migrate existing to `"midtrans_sandbox"`

### BookingStatus (Canonical)
- `pending`: Paid booking, awaiting Barber decision
- `accepted`: Barber confirmed
- `rejected`: Barber declined (→ mark `refundRequired: true`)
- `in_progress`: Service underway
- `completed`: Service finished
- `cancelled`: Customer cancelled (→ mark `refundRequired: true`)

---

## Security

- ✅ Clients cannot write `paymentStatus` (Firestore rules)
- ✅ Clients cannot write final slot locks (Firestore rules)
- ✅ MIDTRANS_SERVER_KEY isolated to backend environment variables
- ✅ Snap token created server-side, not exposed to client
- ✅ Webhook signature verified (SHA-512)
- ✅ Webhook amount verified against stored booking amount
- ✅ No `Math.random()` payment mocking in production paths

---

## Testing

Batch 08 requires 45 automated tests covering:

1. **Slot Hold** (5 tests):
   - Available slot → hold created ✓
   - Final locked slot → hold denied ✓
   - Concurrent customers → only one hold ✓
   - Second customer gets SLOT_TEMPORARILY_HELD ✓
   - Hold belongs to authenticated customer ✓

2. **Payment Flow** (11 tests):
   - Cannot create without valid hold
   - Amount calculated server-side
   - Duplicate request ID is idempotent
   - Pending provider remains pending
   - Settlement/valid paid state → paid
   - Failed → failed
   - Expired → expired
   - Cancelled → cancelled
   - Client callback cannot mark paid
   - Customer cannot mark paid
   - Barber cannot mark paid

3. **Finalization** (9 tests):
   - Paid payment creates exactly one booking
   - Paid payment creates exactly one final slot lock
   - Repeated webhook creates no duplicate
   - Repeated sync creates no duplicate
   - Webhook + sync race creates no duplicate
   - Wrong customer cannot finalize
   - Wrong amount rejected
   - Unrelated hold rejected
   - Paid booking initial status = pending

4. **Slot Rights** (1 test):
   - A pays → B cannot receive A's slot (even if webhook delayed)

5. **Barber Operations** (4 tests):
   - Cannot accept unpaid booking
   - Can accept paid finalized booking
   - Reject paid booking marks refundRequired
   - Rejection preserves payment audit

6. **Legacy Cash** (4 tests):
   - Historical cash record readable
   - New cannot select cash_on_service
   - New never writes not_required
   - New uses midtrans_sandbox

7. **Chat Regression** (4 tests):
   - Unpaid payment → no active chat
   - Paid finalized booking → chat eligible
   - Temporary hold → no chat
   - Failed payment → no chat

---

## Future Work (Batch 09+)

- [ ] Automated refund via Midtrans API
- [ ] Admin dashboard refund UI
- [ ] Payment status notifications
- [ ] Production Midtrans integration
- [ ] Refund webhook handling
- [ ] Partial refund support
- [ ] Customer refund status UI
- [ ] Audit log for all payment transitions

---

## References

- **Batch 08 Requirements**: Batch 08 Specification (payment-first-booking)
- **ADR-004**: Midtrans Sandbox Integration
- **Firestore Rules**: `firestore.rules` (payment guard)
- **Status Mapper**: `backend/vercel/src/payments/status-mapper.ts`
- **Webhook**: `backend/vercel/api/webhook.ts`
- **Payment Creation**: `backend/vercel/api/payments.ts`

