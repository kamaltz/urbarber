# URBarber Repository Status & Implementation Reconciliation Report

> **STALE — corrected 2026-08-13.** This report is frozen at branch `docs/batch-01-scope-roadmap`, an early scope snapshot. Chat (F-31) is fully implemented with real Firestore listeners (not "in-memory mock state" / "planned"); Admin Operations (F-24..F-30) has automated test coverage (not "automated test pending"); Batch 08 Payment-First is fully implemented and test-passing (not "~20% complete, 45 test cases pending"). See `FINAL_THESIS_READINESS_AUDIT.md` for current, evidence-based status. Targeted corrections are marked inline below; the rest of this document has not been re-verified and may still be stale.

## 1. Executive Summary

This report presents an empirical reconciliation of the URBarber repository status on branch `docs/batch-01-scope-roadmap`.

All features across the application are categorized according to their explicit verification state:
- **`code implemented`**: Code exists in codebase.
- **`automated test passed`**: Verified via local Vitest / Node test runner.
- **`emulator test passed`**: Verified via local Firebase / Firestore emulator.
- **`deployment pending`**: Code ready, awaiting production deployment (e.g. Vercel, Firebase rules).
- **`live test pending`**: Requires live multi-role environment testing.
- **`documentation only`**: Architecture or specification defined in docs.
- **`planned`**: Scheduled for future implementation batch.

---

## 2. Feature & Architecture Status Matrix

### 2.1 Core Subsystems Status
| Subsystem | Scope Classification | Implementation Status | Automated Test | Deployment Status | Live Test Status | Blockers / Notes |
|---|---|---|---|---|---|---|
| **Batch 00 Consolidation** | Infrastructure | `code implemented` | `automated test passed` | N/A | `live test pending` | Consolidated in history (Commit `ea3e50a`) |
| **Auth & Claims** | Core (F-01, F-02) | `code implemented` | `automated test passed` | N/A | `live test pending` | Web persistence fallbacks & claims set |
| **Storage RLS & Avatars** | Core (F-03) | `code implemented` | N/A | `deployment pending` | `live test pending` | `storage-policies.sql` pending Supabase deployment |
| **Geospatial Customer Discovery** | Core (F-04..F-09) | `code implemented` | `automated test passed` | N/A | `live test pending` | Geohash bounds, radius filter & OpenFreeMap integrated (Batch 04) |
| **Booking & Slot-Lock** | Core (F-10..F-12) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | Pure slot engine & transaction guard implemented (Batch 04) |
| **Foreground Order Tracking** | Core (F-32) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | `bookingTracking` Firestore rules & Vercel lifecycle API ready (Batch 04) |
| **Real-Time Text Chat** | Core (F-31) | `code implemented` *(corrected 2026-08-13: full implementation, not UI shell)* | `automated test passed` (Firestore rules tests #39-41) | N/A | `live test pending` | Firestore `onSnapshot` listeners & rules fully implemented and rules-tested; known gap: conversations never auto-close after booking completes |
| **Barber Operations & Schedule** | Core (F-14..F-23) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | Explicit schedule confirmation required (`SCHEDULE_NOT_CONFIGURED` guard) |
| **Barber Verification** | Core (F-14, F-25) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | Direct barber registration & onboarding wizard implemented (Batch 03) |
| **Admin Operations** | Core (F-24..F-30) | `code implemented` | `automated test passed` *(corrected 2026-08-13: 5 Firestore-emulator-backed backend tests exist, not pending)* | `deployment pending` | `live test pending` | Global booking monitoring, transaction monitoring, minimal settings page implemented (Batch 06 Phase 3); server-side role enforcement (`requireAdmin`) on every route |
| **Location Map Picker** | Preferred Enhancement (E-01) | `code implemented` | `automated test passed` | N/A | `live test pending` | MapLibre + OpenFreeMap tiles configured with text fallback |
| **Midtrans Sandbox Payment** | Additional Feature (A-01) | `code implemented` (Vercel backend) | `automated test passed` | `deployment pending` | `live test pending` | Vercel deployment & Midtrans webhook setup required |

---

## 3. Detailed Component Breakdown

### 3.1 Midtrans Sandbox Backend (`backend/vercel/`)
- **Code Status**: `code implemented`
- **Testing Status**: `automated test passed` (10 Vitest tests passed, 6 payment unit tests passed)
- **Deployment Status**: `deployment pending` (Awaiting Vercel production deployment)
- **Scope Note**: Classified as **Additional Demonstration Feature (A-01)**. Payment processing is NOT a mandatory gate for Core MVP acceptance.

### 3.2 Real-Time Customer-Barber Text Chat (F-31)
- **Code Status** *(corrected 2026-08-13)*: `code implemented` — fully implemented, not a UI shell. `chat.repository.ts` uses real Firestore `onSnapshot` listeners on `conversations/{bookingId}` and `messages`, not in-memory mock state. Conversations are created only by the trusted backend (`POST /api/bookings/{bookingId}/chat`) after verifying `paymentStatus=='paid'`, and are strictly 1:1 with the booking.
- **Backend Status** *(corrected 2026-08-13)*: `implemented` — not planned. Security rules enforce participant-only read/write, block sender-ID spoofing, and give admin explicitly no chat access.
- **Known gap**: conversations never transition to a `'closed'` state after the booking completes/cancels — chat stays open indefinitely (see FINAL_THESIS_READINESS_AUDIT.md §3 MEDIUM).
- **Scope Note**: Classified as **Core Thesis MVP (F-31)**. Text chat between customer and assigned barber for a specific booking is required for thesis completion — this requirement is met.

### 3.3 Admin Operations (F-24..F-30)
- **Code Status**: `code implemented` (Batch 06 Phase 3 - Complete)
- **Testing Status**: `automated test pending` (Unit tests for booking/transaction services scheduled)
- **Deployment Status**: `deployment pending` (Awaiting Vercel + Firebase deployment)
- **Live Test Status**: `live test pending` (Requires live multi-role validation)
- **Scope Note**: Classified as **Core Admin MVP (F-24..F-30)**. Includes:
  - Global booking monitoring with filters (status, date range, payment method/status)
  - Transaction monitoring (cash and Midtrans Sandbox transactions combined)
  - Minimal admin account settings page
  - Safe operational fields only (no tracking data, snapToken, server keys exposed)
  - Pagination support with cursor-based navigation
  - Frontend: Next.js 15 with TypeScript, `apps/admin/` at `http://localhost:3001`
  - Backend: Vercel serverless function (`backend/vercel/api/admin.ts`) with 3 new handlers

### 3.4 Interactive Booking Location Picker (E-01)
- **Code Status**: `code implemented` (Manual text address fallback in `src/app/(customer)/booking/location.tsx` active)
- **Map Component**: `planned` (Scheduled for Batch 06)
- **Scope Note**: Classified as **Preferred Core Enhancement (E-01)**. MapLibre React Native + OpenFreeMap stack requires an Expo development build (`npx expo run:android` / `eas build`).

### 3.5 Batch 08: Payment-First Slot Ownership
- **Status** *(corrected 2026-08-13)*: `code implemented` — fully implemented and hardened, not "core fixes applied" only.
- **Testing Status** *(corrected 2026-08-13)*: `automated test passed` — the 45+ planned test cases are implemented (`payment-first-booking.test.ts`), plus 4 additional Firestore-emulator-backed reconciliation test files (`payment-sync-reconciliation`, `reconcile-transaction-atomicity`, `webhook-reconciliation`, `sync-payment-service`) and a new `slot-ownership-race.test.ts` (added 2026-08-13, 7 cases) that specifically covers a slot-ownership race condition found and fixed on this date — see FINAL_THESIS_READINESS_AUDIT.md.
- **Deployment Status**: `deployment pending` (Vercel + Firebase rules ready for deployment)
- **Completion** *(corrected 2026-08-13)*: core guards implemented AND test suite implemented AND a critical concurrency bug (two customers able to obtain a final booking for the same slot) found and fixed with regression tests. Remaining before defense: live Midtrans Sandbox + multi-device validation only (no emulator/local test can substitute for that).
- **Core Principle**: A customer does NOT own a final booking slot until payment has been authoritatively confirmed as `paymentStatus = 'paid'`

#### Changes Completed
- ✅ Payment method canonical: `'midtrans_sandbox'` enforced in payment creation
- ✅ Barber acceptance guarded: requires `paymentStatus === 'paid'` (explicit + Firestore rules)
- ✅ Paid rejection tracked: marks `refundRequired: true` (audit preservation)
- ✅ Paid cancellation tracked: marks `refundRequired: true` (audit preservation)
- ✅ Barber dashboard alignment: all paymentStatus checks use canonical `'paid'`
- ✅ Firestore index added: customerId + paymentStatus + createdAt (for query optimization)
- ✅ Documentation: ADR-008 created, test plan designed (45 test cases)

#### Remaining Work (In Priority Order)
1. ✅ **Test Suite Implementation** (Batch 08) *(corrected 2026-08-13, was listed pending)*: implemented — `payment-first-booking.test.ts` (54 cases) plus emulator-backed reconciliation/slot-ownership tests noted above.
2. ⚠️ **Backend Test Data Migration**: Update existing test fixtures from legacy values (`cash_on_service`, `completed`, `not_required`) to canonical (`midtrans_sandbox`, `paid`, `initiated`/`pending`)
3. ⚠️ **Barber Cancellation Audit**: Handle barber cancellation of accepted/in_progress bookings with same refund tracking logic
4. ⚠️ **Admin Validation**: Verify admin web dashboard cannot modify `paymentStatus` field
5. ❌ **Quality Gates**:
   - `npm run check` (typecheck + lint) - all pass
   - Backend test suite - all pass
   - `git diff --check` - no whitespace issues
   - Vercel function count remains = 5
6. ❌ **Final Documentation**: Update `current-status.md` and `roadmap.md` post-implementation

#### Blockers / Notes
- Manual refund reconciliation only (automated Midtrans refund API out of scope for Batch 08)
- Paid booking rejection/cancellation leaves payment in `'paid'` state (requires admin reconciliation in Batch 09+)
- No fake payment simulation in production paths (Midtrans Sandbox mock only)
- Delayed webhook protection: payment status verified before releasing apparently expired holds

---

## 4. Summary of Current Blockers

The following items are current project blockers that must be addressed in their respective upcoming batches:

1. ~~**Chat Real-Time Implementation**~~ *(RESOLVED, corrected 2026-08-13)*: Firestore `conversations/{bookingId}` and `messages` listeners (`onSnapshot`) are implemented, not absent.
2. ~~**Chat Security Rules & Indexes**~~ *(RESOLVED, corrected 2026-08-13)*: Firestore rules for `conversations` and `messages` exist and are rules-tested; no longer absent.
3. **Map Development Build**: MapLibre React Native requires an Expo development build (`npx expo run:android`) and cannot run in Expo Go (Scheduled: Batch 06).
4. **Map Fallback Validation**: Verification that text address entry remains 100% functional when location permission or map tiles fail (Scheduled: Batch 06).
5. **Optional Payment-Mode Decoupling**: Backend currently requires `paymentStatus == 'paid'` before barber acceptance. Decoupling `paymentMethod == 'cash_on_service'` with `paymentStatus == 'not_required'` is required before Midtrans Sandbox can truthfully be optional (Scheduled: Batch 07).
6. **Vercel Backend Deployment**: `backend/vercel` needs deployment to Vercel with environment variables (`MIDTRANS_SERVER_KEY`, Firebase service account) configured (Scheduled: Batch 02).
7. **Midtrans Webhook Configuration**: Midtrans Sandbox Dashboard notification URL must be set to `https://<vercel-app>.vercel.app/api/payments/webhook` (Scheduled: Batch 02).
8. **Firestore Rules & Indexes Deployment**: Production deployment of `firestore.rules` and `firestore.indexes.json` via Firebase CLI (Scheduled: Batch 02).
9. **Admin Backend Tests**: Unit tests for admin booking monitoring, transaction monitoring, and route handlers (Scheduled: Batch 06).
10. **Live Three-Role Testing**: End-to-end live testing across Customer, Barber, and Admin roles in staged environment (Scheduled: Batch 09).