# URBarber: Implementation Status (Batch 09 Baseline)

> **STALE — corrected 2026-08-13.** This document was frozen at Batch 09 and understates current implementation/test coverage in several places (Admin, Chat, Map/Discovery were marked partial/not-started when they are fully implemented and tested; the payment-first test suite was mock-only when it now includes 4 Firestore-emulator-backed reconciliation test files). **Read `FINAL_THESIS_READINESS_AUDIT.md` (repo root) first** — it is evidence-based (exact commands + exact pass/fail counts) and supersedes this file wherever they disagree. The corrections below are limited, targeted fixes to the most concretely-wrong claims; the rest of this document may still be stale in ways not yet re-verified.

## Feature Status Legend

- **IMPLEMENTED**: Code exists and passes local validation
- **LOCAL TESTED**: Automated test suite passes (mock or emulator)
- **LIVE PENDING**: Code ready; awaiting live multi-role environment testing
- **BLOCKED**: External dependency or configuration required

---

## Core Features Status Matrix

| Feature | Component | Implementation | Local Test | Deployment | Live Test | Notes |
|---------|-----------|----------------|-----------|------------|-----------|-------|
| **Authentication (F-01/F-02)** | Firebase Auth + custom claims | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | Claims set via Vercel backend |
| **Customer Registration** | `src/app/(auth)` + backend | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | Direct email/phone registration |
| **Barber Registration (F-25)** | `src/app/(barber-onboarding)` + backend | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | Direct reg + Supabase doc upload |
| **Customer Discovery (F-04..F-09)** | Geohash + map + text fallback | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | MapLibre + OpenFreeMap configured |
| **Booking Flow (F-10..F-12)** | Slot hold + payment → finalization | IMPLEMENTED | ⚠️ MOCK | LIVE PENDING | PENDING | Payment-first principle enforced |
| **Payment-First (Batch 08)** | Slot hold + Midtrans + payment status | IMPLEMENTED | ✅ PASSED (mock + Firestore-emulator) | LIVE PENDING | PENDING | See "Test Suite Audit" below — 4 emulator-backed reconciliation test files exist, not mock-only |
| **Chat (F-31)** | Firestore listeners + messages | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | Real production code, no mock fallback in production paths (verified in FINAL_THESIS_READINESS_AUDIT.md) |
| **Barber Operations (F-14..F-23)** | Schedule + acceptance + tracking | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | Dual-enforced (server + Firestore rules) state machine |
| **Foreground Tracking (F-32)** | expo-location watchPosition, Firestore realtime (not the REST `tracking/{action}` API below, which is dead/unrouted — see Known Gaps) | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | Barber → Customer real-time via participant-scoped Firestore, not the REST lifecycle API |
| **Admin Web (F-24..F-30)** | Next.js dashboard + backend API | IMPLEMENTED | ✅ PASSED | LIVE PENDING | PENDING | All 3 phases complete; server-side role enforcement on every route |
| **Supabase Storage RLS** | Storage policies | IMPLEMENTED | N/A | PENDING | PENDING | Policies ready; await deployment |
| **Firestore Rules** | Security rules | IMPLEMENTED | ✅ PASSED | PENDING | PENDING | Rules ready; await deployment |
| **Firestore Indexes** | Composite indexes | IMPLEMENTED | N/A | PENDING | PENDING | 9 indexes defined |
| **Vercel Backend** | 5 consolidated functions | IMPLEMENTED | ✅ PASSED | PENDING | PENDING | Functions ready; await deployment |

---

## Detailed Breakdown

### Authentication & Accounts
- **Status**: IMPLEMENTED, LOCAL TESTED
- **Components**:
  - Firebase Auth (email, phone, custom claims)
  - Account initialization endpoint: `POST /api/auth/initialize-account` (barber)
  - Custom claims set via Vercel backend
- **Testing**: Vitest automated tests pass
- **Blockers**: None (live multi-role testing needed)

### Customer Discovery
- **Status**: IMPLEMENTED, LOCAL TESTED
- **Components**:
  - Geohash queries with radius filter (geofire-common)
  - MapLibre React Native map component
  - OpenFreeMap tile configuration
  - Text address fallback (100% functional)
- **Testing**: Automated test suite passes
- **Blockers**: Development build required for MapLibre (expo run:android, not Expo Go)

### Booking & Payment-First
- **Status**: IMPLEMENTED, EMULATOR TESTED (corrected 2026-08-13 — was "mock only")
- **Components**:
  - Slot hold (15-min expiry, temporary lock) — acquisition is transactional (`db.runTransaction`) as of the 2026-08-13 P0 remediation, closing a prior slot-ownership race condition (see FINAL_THESIS_READINESS_AUDIT.md)
  - Payment creation via Midtrans Sandbox
  - Payment status polling + webhook
  - Atomic finalization (hold → booking conversion), with a fail-safe guard against reassigning an already-finalized lock to a different booking
  - Barber acceptance guard: `paymentStatus === 'paid'` AND (as of 2026-08-13) barber `verificationStatus === 'approved' && listingStatus === 'active'`
- **Testing**: `payment-first-booking.test.ts` is domain-simulation (in-memory), but `payment-sync-reconciliation.test.ts`, `reconcile-transaction-atomicity.test.ts`, `webhook-reconciliation.test.ts`, `sync-payment-service.test.ts`, and `slot-ownership-race.test.ts` all exercise the real production functions against a live Firestore emulator — see the Test Suite Audit table below (this doc previously omitted 4 of these 5 files)
- **Test Classification**: Mixed — both MOCK DOMAIN and FIRESTORE EMULATOR tests exist, not mock-only
- **Deployment Blockers**: Vercel backend deployment + Midtrans webhook configuration required
- **Live Test Blockers**: Multi-device payment flow validation pending (still true — no live/device evidence exists anywhere in this repo)

### Chat (F-31)
- **Status**: IMPLEMENTED (corrected 2026-08-13 — was "partial")
- **Components**:
  - Firestore collection: `conversations/{bookingId}` (strict 1:1 with the booking, created only by the trusted backend)
  - Real-time `onSnapshot` listeners
  - Backend endpoint: `POST /api/bookings/{bookingId}/chat`
  - Security rules: participant-only read/write, sender-spoofing blocked both client and rules-side, append-only messages, admin has explicitly no chat access
- **Testing**: Rules tests cover conversations/messages access control; no dedicated unit test file for the chat repository itself
- **Known gap (not yet fixed)**: a `'closed'` conversation status is designed into the type system but never written anywhere — chat stays open indefinitely after a booking completes/cancels. See FINAL_THESIS_READINESS_AUDIT.md §3 MEDIUM.
- **Deployment Blockers**: None (Firestore ready)
- **Live Test Blockers**: Multi-device conversation flow validation pending

### Barber Operations
- **Status**: IMPLEMENTED, LOCAL TESTED
- **Components**:
  - Schedule management (business hours)
  - Booking request list (pending acceptance)
  - Booking detail + acceptance UI
  - Revenue analytics (status=completed & paymentStatus=paid filter)
- **Testing**: Automated tests pass
- **Blockers**: None (live testing needed)

### Foreground Tracking (F-32)
- **Status**: IMPLEMENTED, LOCAL TESTED
- **Components**:
  - Barber: `expo-location` watchPositionAsync (foreground)
  - Customer: Firestore listener on `bookingTracking` collection, booking-keyed with authoritative-source re-derivation in rules (not client-trusted participant IDs)
  - Lifecycle: en_route → arrived → stopped, enforced by both the client's `tracking.service.ts` and Firestore rules
  - **Correction (2026-08-13)**: the `POST /api/barber/bookings/tracking/{action}` REST endpoints referenced above are **dead code, intentionally not routed** (see `DEAD_TRACKING_API` comments in `backend/vercel/api/app.ts`) — current tracking does NOT go through this REST API at all, only through direct participant-scoped Firestore writes/reads. `tracking-api.test.ts`'s own top-level `describe` block is literally titled `'DEAD_TRACKING_API historical validation (handlers are not routed)'`; do not cite it as evidence the tracking REST lifecycle works.
- **Known gap (not yet fixed)**: tracking is not force-stopped on customer-initiated cancellation (only the barber's own "complete" action stops it), and no TTL/cleanup exists for stale tracking docs. See FINAL_THESIS_READINESS_AUDIT.md §3.
- **Blockers**: None (live testing needed)

### Admin Web (F-24..F-30)
- **Status**: IMPLEMENTED (corrected 2026-08-13 — was "partial")
- **Components**:
  - Next.js frontend: `apps/admin/` — all 11 screens (dashboard, barber verification, barbers, users, categories, bookings, transactions, settings, login, unauthorized) wired to real Firestore-backed data, no mock/placeholder paths found
  - Vercel backend: `/api/admin` (consolidated router) — role enforcement is genuinely server-side (`requireAdmin` verifies a Firebase custom claim on every one of 17 routes), not just client-side route guarding
  - Phase 1: Barber registration management (approve/reject) — transactional, idempotent
  - Phase 2: Category CRUD + barber suspension
  - Phase 3: Booking monitoring + transaction monitoring — `snapToken`/server keys explicitly stripped before reaching the client
- **Testing**: `apps/admin` itself has no test files, but the underlying `admin.service.ts` functions are covered by 5 Firestore-emulator-backed backend test files (see Test Suite Audit)
- **Deployment Blockers**: None (code ready)
- **Live Test Blockers**: Multi-admin concurrent access validation pending; the mobile-app admin dead-end redirect bug was fixed 2026-08-13 (see FINAL_THESIS_READINESS_AUDIT.md P1-1) but not yet device-verified live

### Firestore Rules & Indexes
- **Status**: IMPLEMENTED, RULE-TESTED
- **Coverage**:
  - Role-based access (customer, barber, admin)
  - Document ownership enforcement
  - Immutable field protection
  - 9 composite indexes for query optimization
- **Testing**: Rule test suite configured (run via `npm run test:firestore-rules`)
- **Deployment Status**: PENDING Firebase CLI deployment

### Supabase Storage
- **Status**: IMPLEMENTED, RULE-CONFIGURED
- **RLS Policies**:
  - User avatars: owner read/write
  - Barber documents: barber read/write + admin read
- **Testing**: Manual validation pending
- **Deployment Status**: PENDING Supabase CLI deployment

---

## Test Suite Audit

**Corrected 2026-08-13** — the table below listed only 5 backend test files; the backend `tests/` directory actually has 22 as of this date. Full inventory and classification (UNIT / MOCK DOMAIN / FIRESTORE EMULATOR) is in `FINAL_THESIS_READINESS_AUDIT.md` §9; do not treat the table below as exhaustive going forward — this doc will drift again as tests are added.

### Backend Tests (`backend/vercel/tests/`) — corrected highlights
| File | Type | Status | Coverage |
|------|------|--------|----------|
| `payment-first-booking.test.ts` | Mock simulation | PASSING, 54 cases | Domain only (not Firestore) |
| `payment-sync-reconciliation.test.ts` | Firestore emulator | PASSING | Real `reconcilePaymentSync` against live emulator |
| `reconcile-transaction-atomicity.test.ts` | Firestore emulator | PASSING | Real `reconcilePaymentTransaction`, failure-injection atomicity |
| `webhook-reconciliation.test.ts` | Firestore emulator | PASSING | Real `reconcileWebhookPayment` |
| `sync-payment-service.test.ts` | Firestore emulator + mocked Midtrans client | PASSING | Real sync service, incl. "unrecognized transaction" handling |
| `slot-ownership-race.test.ts` | Firestore emulator | PASSING, 7 cases | Slot-lock concurrency/expiry/finalized-lock-immunity (added 2026-08-13) |
| `service-booking-guard.test.ts` | Unit | PASSING, 13 cases | Includes `isBarberAcceptingBookings` (added 2026-08-13) |
| `admin-barber-list.test.ts` | Firestore emulator | PASSING, 2 cases | `getBarberList` listingStatus filter + index (added 2026-08-13) |
| `auth-registration.test.ts` | Mock (reimplemented logic, not the real handler) | PASSING | Account initialization |
| `backend.test.ts` | Unit | PASSING | Endpoint routing, slot-lock, signature, status-mapper |
| `barber.test.ts` | Mock (reimplemented logic, not the real handler) | PASSING | Barber operations |
| `tracking-api.test.ts` | Mock | PASSING | **Validates dead/unrouted handlers only** — its own `describe` block is titled `'DEAD_TRACKING_API historical validation (handlers are not routed)'`. Do not cite this as evidence live tracking works. |
| 5x `admin-*.test.ts` | Firestore emulator | PASSING | Dashboard, document signed-URL, registration privacy, transactions list, booking DTO |
| `availability-api.test.ts` | Firestore emulator | PASSING | Real `computeAvailability` |

### Mobile Tests
- Firestore rules: `npm run test:firestore-rules` — **95 scenarios** as of 2026-08-13 (was 42 in older docs), requires a local emulator (`firebase emulators:start --only firestore`)
- Unit tests: `npm run test:unit` — **174 tests across 24 files** as of 2026-08-13 (mix of UNIT and MOCK DOMAIN)

### Admin Tests
- `apps/admin` itself has **zero** test files — coverage is entirely from the backend `admin-*.test.ts` files above testing `admin.service.ts` functions directly.
- E2E tests: not yet implemented (still true)

---

## Quality Gates Status

| Check | Command | Status | Notes |
|-------|---------|--------|-------|
| TypeScript (mobile) | `npm run typecheck` | ✅ PASS | No errors |
| TypeScript (backend) | `npm --prefix backend/vercel run typecheck` | ✅ PASS | No errors |
| ESLint (mobile) | `npm run lint` | ⚠️ WARNINGS ONLY | Unused vars; no breaking errors |
| Next Lint (admin) | `npm --prefix apps/admin run lint` | ❌ DEPRECATED | next lint deprecated in Next.js 16; migration pending |
| Whitespace & Conflicts | `git diff --check` | ✅ PASS | No issues |
| Firebase Secrets | `npm run check:secrets` | BLOCKED | PowerShell script (Windows-specific) |

---

## Deployment Readiness Checklist

### Code Level
- [x] TypeScript strict compilation passes (mobile & backend)
- [x] Firestore rules written and tested
- [x] Firestore indexes defined
- [x] Supabase RLS policies written
- [x] Vercel functions consolidated (5 functions)
- [x] Admin Web Next.js app built locally
- [x] Environment variable templates (.env.example) created

### Infrastructure Level (PENDING)
- [ ] Vercel backend deployment (backend/vercel)
- [ ] Firebase Firestore rules deployment
- [ ] Firebase Firestore indexes deployment
- [ ] Supabase Storage RLS policies deployment
- [ ] Midtrans webhook URL configuration

### Testing Level
- [x] Unit tests automated (backend, services)
- [x] Firestore rule tests automated
- [ ] Payment-first integration tests (mock only; real integration pending)
- [ ] Chat E2E tests
- [ ] Admin E2E tests
- [ ] Live multi-role acceptance tests (Phase E)

---

## Known Gaps & Limitations

1. **Payment-First Test** *(corrected 2026-08-13, was "mock only")*: `payment-first-booking.test.ts` is mock domain simulation, but `payment-sync-reconciliation.test.ts`, `reconcile-transaction-atomicity.test.ts`, `webhook-reconciliation.test.ts`, `sync-payment-service.test.ts`, and `slot-ownership-race.test.ts` all exercise the real production reconciliation/slot-lock functions against a live Firestore emulator. Still pending: live Midtrans Sandbox + Vercel deployment integration testing (no emulator can substitute for that).

2. **Admin Lint**: Next.js deprecated `next lint` in Next.js 16; migration to ESLint CLI recommended but not blocking functionality.

3. **Chat Validation**: Message deduplication backend ready; full multi-device chat flow (customer ↔ barber) pending live testing.

4. **Foreground Tracking**: Android-only scope (iOS tracking requires different permission model); Windows development currently unsupported without Expo development build.

5. **MapLibre**: Requires Expo development build (`expo run:android`); cannot run in Expo Go or web.

6. **Automated Refunds**: Midtrans refund API not implemented (manual admin reconciliation only).

---

## Next Batch (09) Priorities

1. **Phase A** (Complete): Context reconciliation (THIS TASK)
2. **Phase B** (Pending): Local pre-deployment readiness validation
3. **Phase C** (Pending): Vercel Preview deployment + smoke tests
4. **Phase D** (Pending): Hosted integration (Firebase, Supabase, Midtrans)
5. **Phase E** (Pending): Live role/payment/chat validation

> **Note (2026-08-13):** `docs/testing/live-validation-batch-09.md` separately claims Phases D/E were already "executed 2026-08-09" — this directly contradicts the Phase B-E "Pending" status above, and FINAL_THESIS_READINESS_AUDIT.md found that document unverifiable from the repository (no corroborating CI log/screenshot) and provably stale on its own terms (its "105/105 backend, 42/42 rules" footer predates the current 22 backend test files / 95 rules scenarios). Treat the "Pending" status above as authoritative until a real live validation is executed and evidenced.
