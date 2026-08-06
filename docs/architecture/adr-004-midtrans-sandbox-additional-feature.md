# ADR-004: Midtrans Snap Sandbox Payment Integration as Additional Feature (A-01)

## Context
Midtrans Snap Sandbox was integrated into a standalone Node 22.x Vercel backend (`backend/vercel/`) during Batch 04 to demonstrate payment processing capabilities. However, external payment gateway dependencies and third-party sandbox availability should not block core thesis MVP acceptance.

## Decision
We classify **Midtrans Snap Sandbox Payment (A-01)** as an **Additional Demonstration Feature**.

### Architecture Specifications
1. **Scope Boundary**: Midtrans Sandbox environment only (`environment: "sandbox"`). Midtrans Production, real-money transactions, and automated bank refunds are strictly out of scope.
2. **Backend Isolation**: Standalone Vercel Node.js backend handles Snap token creation, SHA-512 signature validation, and webhook processing. `MIDTRANS_SERVER_KEY` remains strictly in Vercel environment variables.
3. **Status Decoupling**: `paymentStatus` remains separate from canonical booking `status`. Webhook or GET Status server API is authoritative; client redirect parameters never prove successful payment.
4. **Future Payment-Mode Architecture**:
   - `paymentMethod`: `"cash_on_service"` | `"midtrans_sandbox"`
   - `paymentStatus`: `"not_required"` (for `cash_on_service`)
5. **Decoupling Blocker Note**: Current backend checks require `paymentStatus == 'paid'` before barber acceptance. Updating the backend to allow barber acceptance when `paymentMethod == 'cash_on_service'` and `paymentStatus == 'not_required'` is recorded as a blocker to be completed in Batch 07 before Midtrans Sandbox can be considered optional.

## Alternatives Considered
- **Mandatory Midtrans Prepayment for All Bookings**: Rejected because Sandbox API downtime would make the entire application unusable during testing or presentation.
- **In-App Mock Payment Engine (`Math.random() > 0.1`)**: Rejected to uphold production path integrity and prevent fake payment code in production repositories.

## Consequences
- Core booking flows remain functional even if Midtrans Sandbox is unreachable.
- `backend/vercel` Vitest unit tests validate payment creation, signature verification, and webhook processing independently.

## Security Considerations
- Client screens cannot write to `payments` or `paymentRequests` Firestore collections.
- Midtrans Server Key is never included in Expo mobile client bundles.
- Webhook endpoint validates SHA-512 signature (`order_id + status_code + gross_amount + ServerKey`) before updating Firestore payment state.

## Validation Gate
- Vitest unit test suite in `backend/vercel/tests/` and Midtrans payment test suite (`npm run test`) passing with 100% success.

## Current Status
- **Accepted & Implemented** (Backend implemented; deployment and payment-mode decoupling scheduled for Batches 02 & 07).
