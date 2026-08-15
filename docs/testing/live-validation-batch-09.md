# Batch 09 Live Validation Test Matrix

> **Evidentiary note (added 2026-08-13):** this document cannot be independently verified from the repository — there is no accompanying CI log, deployment record, or screenshot to corroborate the hosted/live claims below. Its own test-count footers (e.g. "backend tests 105/105 · rules 42/42") are now stale relative to the current repository state (as of 2026-08-13: 22 backend test files / 207 backend tests / 95 rules scenarios) — those specific numbers were accurate for the point in time this log records, but do not reflect current state and should not be cited as such. `docs/agent/batches/batch-09.md` separately marks only Phase A complete, which this document's own "Phases 09D-3/09D-3A/09D-4/09E-P0 executed" claim contradicts — treat the two documents as disagreeing, not as jointly authoritative. For current, evidence-based status (exact commands + exact pass/fail counts, all reproducible), see `FINAL_THESIS_READINESS_AUDIT.md`. Do not cite this document alone as proof of live/hosted testing for a thesis defense.

**Status**: Phase 09D-3, 09D-3A (Supabase remediation), 09D-4 (Midtrans sandbox pre-payment), and 09E-P0 (payment sync corruption fix + live recovery) executed 2026-08-09. Phase 09E (barber acceptance, chat, realtime, authorization negatives) remains PENDING.
**Phase**: Phase E (Multi-Device, Multi-Role Validation)
**Precondition**: Phase D infrastructure deployed (Vercel, Firebase, Supabase, Midtrans)

---

## Batch 09D-3: Live Test Actors + Authenticated Hosted Validation (2026-08-09)

**Project**: `urbarber-f97ae`. Backend Preview: `urbarber-payment-c3cen0su1-kamaltzs-projects.vercel.app`. Admin Preview: `urbarber-admin-1cw2q63nh-kamaltzs-projects.vercel.app`.

**Actors created** (dedicated test identities, retained for 09D-4/09E): `customer-a@urbarber.test`, `customer-b@urbarber.test`, `barber-pending@urbarber.test` (now BARBER_APPROVED). ADMIN_TEST reused existing `camvr35@gmail.com` (already `app_role=admin`).

### Bugs found live and fixed (all redeployed, all regression gates passing)
1. **PASS (fixed)** — `handleInitializeAccount`/`handleBarberRegistrationSubmit` in `backend/vercel/api/app.ts` had inverted CORS-guard logic (`if (handleCors(...)) return;` instead of `if (!handleCors(...)) return;`), causing every legitimate request to silently hang with no HTTP response until Vercel's 300s platform timeout. Pre-existing on both the old and newly-deployed Preview; not caused by this session's other edits. Fixed and redeployed.
2. **PASS (fixed)** — `handleBarberRegistrationSubmit` required a `{legalName, businessName, license, categories}` body the real mobile client never sends (it sends no body), never set `users/{uid}.status = 'pending_verification'`, and used a field schema (`legalName`/`businessName`/`license`) the real onboarding draft never populates. Rewritten to promote the existing `barberRegistrations/{uid}` draft instead of requiring a fresh payload.
3. **PASS (fixed)** — `firestore.rules` barberRegistrations update rule compared `resource.data.verificationStatus` directly, which errors/denies when the field was never set (the real client never sets it on create). Barber's own document-upload step was denied live. Fixed with `.get(key, null)` on both sides; added rules test #37.
4. **PASS (fixed)** — same pattern on `firestore.rules` barbers update rule for `verified`/`ratingAverage`/etc: guard only applied if the field already existed, so a barber's *first* write introducing `verified`/`ratingAverage` was completely unguarded. Proved live (BARBER_PENDING self-set `verified=true`, `ratingAverage=5`). Fixed with the same `.get(key, null)` pattern; added rules test #38.
5. **PASS (fixed)** — `src/features/location/services/discovery.service.ts` and `src/features/customer/repository/customer.repository.ts` queried `barbers.status == 'active'`, but `approveBarber` (and every admin-side read) uses `listingStatus`. An admin-approved barber was structurally invisible to customer search. Fixed both files to query `listingStatus`.

### Confirmed live blockers NOT fixed (require user/dashboard action, outside code)
- ~~**BLOCKED** — `SUPABASE_SERVICE_ROLE_KEY` in the `urbarber-payment-api` Vercel Preview environment is invalid (`"Invalid API key"` ...)~~ **SUPERSEDED — this diagnosis was WRONG.** See Batch 09D-3A below. `vercel env pull` substitutes the literal string `[SENSITIVE]` for Sensitive-typed variables, so the local diagnostic that produced `"Invalid API key"` was testing that placeholder, not the real key. The genuine root cause was a malformed `SUPABASE_URL`.
- ~~**P1 — CONFIRMED LIVE** — the Supabase Storage admin RLS bypass was never removed on the hosted project~~ **RESOLVED** — the hardened owner-only policy is now applied and verified live (see 09D-3A section A/C).
- **P1_SECRET_SPRAWL — CONFIRMED** — `urbarber-admin` Vercel project (Preview+Production) carries `MIDTRANS_SERVER_KEY`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`, none of which the Next.js admin frontend needs. Audited by name only; not modified.

### Scenario results

| Item | Result |
|---|---|
| Customer A / B init (`users/{uid}`, claims) | PASS |
| Barber Pending init + draft + document upload (`private-documents`) + submit | PASS |
| Admin Test claims/status verification | PASS |
| Customer/Barber → Admin API DENY, Admin → Admin API ALLOW | PASS |
| Real Admin signed-URL (200, real Supabase URL, 600s TTL, not persisted) | BLOCKED (invalid Supabase service-role key) |
| Signed-URL negative tests (non-admin DENY, bad documentType 400, unknown barber 404, override fields ignored) | PASS |
| Supabase Storage RLS: public-media owner-write / cross-user read-allow-write-deny | PASS |
| Supabase Storage RLS: private-documents owner upload/read, cross-customer DENY | PASS |
| Supabase Storage RLS: Admin direct client read of private document | FAIL — admin bypass still live (see P1 above) |
| Barber approval via trusted admin endpoint | PASS |
| Barber self-approval / self-verify / self-rate negative tests | PASS (after fix #4) |
| Discovery: approved barber appears via canonical query | PASS (after fix #5) |
| Unpaid booking visibility invariant | PENDING_PHASE_09D_4 (requires payment-intent creation flow; Midtrans explicitly out of scope this phase) |
| Pre-payment chat denial | PENDING_PHASE_09D_4 (same dependency) |

---

## Batch 09D-3A: Supabase Hosted Blocker Remediation (2026-08-09)

**Backend Preview**: `urbarber-payment-bnmswwx8m-kamaltzs-projects.vercel.app`. Production untouched.

### Env migration
- `SUPABASE_SERVICE_ROLE_KEY` → **`SUPABASE_SECRET_KEY`** (Supabase's current server Secret Key model). Zero production-source references to the old name remain; only `BATCH_09A_PRE_DEPLOYMENT_REPORT.md` (historical) and this file's superseded note mention it.
- Backend-only. No `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` variant exists; zero references in `src/` or `apps/admin/`.
- Lazy config preserved — Supabase vars are still read only inside `getSupabaseServerConfig()`, never in the eager `envSchema`, so `/api/health`, payments, availability and unrelated admin routes keep working when Supabase is unconfigured (verified live: health 200, availability 200).

### Root cause of the signed-URL failure (corrects the 09D-3 diagnosis)
`SUPABASE_URL` in Preview was set to **`https://hggwgqhrsgllhnqdbfyp.supabase.co/rest/v1/`** — the PostgREST endpoint, not the project base URL. supabase-js appends its own `/storage/v1/object/sign/...` path, so every signed-URL call hit a nonsense route and returned an opaque `Invalid path specified in request URL` (404), surfaced as a 502 `STORAGE_ERROR`. Isolation proof: the identical path/bucket/client version succeeded with the owner's JWT, so only the server URL config differed. The secret key was never the problem. `SUPABASE_URL` corrected to the base origin.

**Hardening added**: `getSupabaseServerConfig()` now trims input, strips trailing slashes, and rejects a `SUPABASE_URL` carrying any path suffix (or a non-http(s)/unparseable value) with `SupabaseNotConfiguredError`, so this misconfiguration fails loudly as a config error instead of an opaque storage 502. Covered by 3 new backend tests.

### Re-test results (actors reused, none recreated)

| # | Scenario | Result |
|---|---|---|
| A | ADMIN_TEST direct Supabase private-document read | **PASS — DENY** |
| B | CUSTOMER_A direct barber private-document read | **PASS — DENY** |
| C | BARBER_APPROVED own private-document read | **PASS — ALLOW** (416 bytes) |
| D | ADMIN_TEST signed-document API | **PASS — 200**, real `hggwgqhrsgllhnqdbfyp.supabase.co` signed URL, token present, not placeholder, TTL ~600s |
| E | Signed URL fetch | **PASS — HTTP 200, 416 bytes**, `%PDF-1.4`, contains the `TEST DOCUMENT` marker |
| F | CUSTOMER_A signed-document API | **PASS — 403** |
| G | BARBER signed-document API | **PASS — 403** |

Hosted owner-only RLS confirmed applied by an owner-control test (owner lists+downloads the object while admin is denied), which distinguishes genuine RLS denial from Supabase's identical "Object not found" masking for a deleted object.

### Regression
backend typecheck PASS · backend tests **105/105** · rules **42/42** · unit 11/11 · `npm run check` 0 errors (47 pre-existing warnings) · admin build PASS · `git diff --check` clean · Vercel function count **5**.

---

## Test Roles & Accounts

**Account Setup Required Before Testing**:

### Customer A
- Email: `customer-a@urbarber.test`
- Phone: +62 812-0000-0001
- Status: active
- app_role: customer
- Device: Mobile #1 (Expo/Development Build)

### Customer B
- Email: `customer-b@urbarber.test`
- Phone: +62 812-0000-0002
- Status: active
- app_role: customer
- Device: Mobile #2 (Separate device for concurrency tests)

### Barber Pending
- Email: `barber-pending@urbarber.test`
- Phone: +62 822-0000-0001
- Status: active (not yet verified)
- verificationStatus: pending
- app_role: barber
- Device: Mobile #3

### Barber Approved
- Email: `barber-approved@urbarber.test`
- Phone: +62 822-0000-0002
- Status: active
- verificationStatus: approved
- app_role: barber
- Device: Mobile #4

### Admin
- Email: `admin@urbarber.test`
- Phone: +62 899-0000-0001
- Status: active
- app_role: admin
- Device: Browser (Vercel Admin Web)

---

## Test Scenario E1: Authentication & Account Setup

**Objective**: Verify user registration, account creation, and role-based access

### E1.1: Customer Registration

**Actors**: Customer A  
**Entry**: Mobile app → Auth tab → Register

**Steps**:
1. Tap "Register as Customer"
2. Enter email: `customer-a@urbarber.test`
3. Enter phone: +62 812-0000-0001
4. Tap "Send OTP"
5. Receive OTP via SMS (or app notification)
6. Enter OTP
7. Tap "Verify"
8. Set password
9. Tap "Complete Signup"

**Expected Result**: 
- [ ] Account created in Firebase Auth
- [ ] Custom claim `app_role: 'customer'` set
- [ ] Customer document created in Firestore
- [ ] User redirected to home screen

**Data Verification**:
- Firestore: `/users/{uid}` exists with role=customer
- Firestore: `/customers/{uid}` exists with userId={uid}
- Firebase Auth: app_role claim present

**Status**: ⏳ PENDING

---

### E1.2: Barber Registration & Verification

**Actors**: Barber Pending  
**Entry**: Mobile app → Auth tab → Register as Barber

**Steps**:
1. Tap "Register as Barber"
2. Enter email: `barber-pending@urbarber.test`
3. Enter phone: +62 822-0000-0001
4. Verify OTP
5. Set password
6. Complete onboarding wizard:
   - [ ] Profile photo upload
   - [ ] Business hours setup
   - [ ] Verification documents upload
7. Submit for verification

**Expected Result**:
- [ ] Barber account created in Firestore
- [ ] app_role: 'barber' set
- [ ] verificationStatus: 'pending'
- [ ] Documents stored in Supabase (private-documents bucket)
- [ ] Admin notification triggered

**Data Verification**:
- Firestore: `/barbers/{uid}` exists
- Firestore: `/barberRegistrations/{uid}` exists with status=pending
- Supabase: `/private-documents/{uid}/...` contains uploaded files
- Firebase Auth: app_role claim = 'barber'

**Status**: ⏳ PENDING

---

### E1.3: Admin Account & Verification

**Actors**: Admin  
**Entry**: Web browser → admin URL → Login

**Steps**:
1. Navigate to admin web URL
2. Enter email: `admin@urbarber.test`
3. Enter password
4. Tap "Sign In"

**Expected Result**:
- [ ] Admin authenticated
- [ ] Redirected to admin dashboard
- [ ] Can see admin navigation menu
- [ ] API calls to `/api/admin/*` succeed

**Data Verification**:
- Firebase Auth: user has app_role: 'admin'
- Vercel backend: requireAdmin() middleware succeeds

**Status**: ⏳ PENDING

---

### E1.4: Multi-Device Session Isolation

**Actors**: Customer A (Device 1 & Device 2)  
**Entry**: Mobile app on two separate devices

**Steps**:
1. Register Customer A on Device 1
2. Login to same Customer A account on Device 2
3. On Device 1: Open profile → Verify account details
4. On Device 2: Update profile (e.g., change phone number)
5. On Device 1: Refresh profile → Verify update synced

**Expected Result**:
- [ ] Both devices can authenticate independently
- [ ] Firebase ID tokens valid on both devices
- [ ] Profile updates sync via Firestore listeners
- [ ] No session conflicts or cross-contamination

**Data Verification**:
- Both devices maintain independent Firebase Auth sessions
- Firestore listeners detect updates in real-time

**Status**: ⏳ PENDING

---

## Test Scenario E2: Customer Discovery & Booking

**Objective**: Verify barber discovery, profile viewing, and booking slot selection

### E2.1: Search & Filter by Location

**Actors**: Customer A  
**Entry**: Mobile app → Home tab → Search

**Steps**:
1. Tap "Search Barbers"
2. Enable location permissions (GPS)
3. Verify map loads with OpenFreeMap tiles
4. Select radius: 5 km
5. Tap "Search"

**Expected Result**:
- [ ] Map displays current location
- [ ] Barber markers appear within radius
- [ ] Geohash queries execute successfully
- [ ] Results include Barber Approved (if within radius)

**Data Verification**:
- Firestore Index 5 & 6 support query
- Geohashing algorithm works (geofire-common)
- No query timeout errors

**Status**: ⏳ PENDING

---

### E2.2: View Barber Profile

**Actors**: Customer A  
**Entry**: Mobile app → Search results → Select Barber Approved

**Steps**:
1. Tap Barber Approved from search results
2. View profile page
3. Scroll down to see:
   - [ ] Barber avatar
   - [ ] Services list
   - [ ] Business hours
   - [ ] Average rating & reviews
   - [ ] Booking button

**Expected Result**:
- [ ] Profile loads successfully
- [ ] All data displays correctly
- [ ] "Book Now" button is available & active

**Data Verification**:
- Firestore: barber document readable by customer
- Services: barberServices subcollection populated
- Reviews: Review documents exist

**Status**: ⏳ PENDING

---

### E2.3: Service Selection & Date/Time Picker

**Actors**: Customer A  
**Entry**: Barber profile → Tap "Book Now"

**Steps**:
1. Tap "Book Now"
2. Select service: "Hair Cut" (or available service)
3. Tap "Next"
4. Select date: Tomorrow
5. Select time: 14:00
6. View total price (service price + tax)
7. Tap "Proceed to Payment"

**Expected Result**:
- [ ] Service selection screen appears
- [ ] Date/time picker functional
- [ ] Availability shown (not booked slots)
- [ ] Total price calculated correctly
- [ ] Slot availability verified

**Data Verification**:
- Firestore: Service document readable
- Firestore: Slot lock NOT created yet
- Price = service.price + tax calculation

**Status**: ⏳ PENDING

---

## Test Scenario E3: Payment & Slot Finalization

**Objective**: Verify payment-first principle, slot hold, and booking finalization

### E3.1: Payment Creation & Slot Hold

**Actors**: Customer A  
**Entry**: Mobile app → Checkout screen

**Steps**:
1. Review booking summary
2. Tap "Pay Now"
3. Verify Midtrans Snap payment modal opens
4. Note: Slot hold begins (15-min expiry)

**Expected Result**:
- [ ] Slot hold created in Firestore (slotLocks collection)
- [ ] Midtrans snap token generated
- [ ] Payment record created with status=initiated
- [ ] Slot marked as temporarily held

**Data Verification**:
- Firestore: `/slotLocks/{slotId}` with status=hold, expiresAt set
- Firestore: `/payments/{bookingId}` with status=initiated
- Firestore: `/bookings/{bookingId}` with paymentStatus=initiated

**Status**: ⏳ PENDING

---

### E3.2: Concurrent Slot Hold Conflict

**Actors**: Customer A (Device 1), Customer B (Device 2)  
**Entry**: Both selecting same barber/time slot

**Steps**:
1. Customer A: Tap "Book Now", select same service/date/time as E3.1
2. Customer A: Tap "Proceed to Payment"
3. (Slot hold now active for Customer A)
4. Customer B: Simultaneously tap "Book Now", select same service/date/time
5. Customer B: Tap "Proceed to Payment"

**Expected Result**:
- [ ] Customer B receives error: "SLOT_TEMPORARILY_HELD" or similar
- [ ] Customer B cannot create slot hold (A's hold takes precedence)
- [ ] Error message: "This time slot is being booked. Please try again in a few minutes."

**Data Verification**:
- Firestore: Only one slotLock document for this slot
- Customer B's booking creation rejected

**Status**: ⏳ PENDING

---

### E3.3: Payment Confirmation via Midtrans Sandbox

**Actors**: Customer A  
**Entry**: Midtrans Snap modal open

**Steps**:
1. In Midtrans modal, select payment method: "Sandbox Simulator"
2. Click "Pay"
3. Midtrans Sandbox simulator displays success confirmation
4. Wait for webhook processing (~2-5 sec)
5. Verify booking confirmed on mobile app

**Expected Result**:
- [ ] Midtrans sends webhook to `/api/webhook`
- [ ] Webhook verified & processed
- [ ] `paymentStatus` changed to 'paid'
- [ ] Slot hold finalized into booking
- [ ] Booking visible to barber
- [ ] Customer receives confirmation

**Data Verification**:
- Firestore: `/payments/{bookingId}` with status=paid, paidAt set
- Firestore: `/bookings/{bookingId}` with paymentStatus=paid, status=pending
- Firestore: `/slotLocks/{slotId}` with status=finalized, bookingId assigned
- No `refundRequired` flag

**Status**: ⏳ PENDING

---

### E3.4: Payment Sync (Client Polling)

**Actors**: Customer A  
**Entry**: Mobile app → Payment confirmation screen

**Steps**:
1. If webhook delayed, mobile app polls: `POST /api/payments/sync`
2. App receives updated payment status
3. Automatically confirms booking when status=paid

**Expected Result**:
- [ ] Polling endpoint responds successfully
- [ ] Payment status updated to 'paid'
- [ ] Booking finalized even if webhook delayed

**Data Verification**:
- Endpoint returns: `{ paymentStatus: 'paid' }`

**Status**: ⏳ PENDING

---

## Test Scenario E4: Barber Acceptance & In-Progress

**Objective**: Verify payment-first barber acceptance and foreground tracking

### E4.1: Barber Sees Pending Booking Request

**Actors**: Barber Approved  
**Entry**: Mobile app → Bookings tab

**Steps**:
1. Barber Approved logs in on Mobile #4
2. Tap "Bookings" tab
3. View pending booking requests

**Expected Result**:
- [ ] Booking from E3.3 appears in list
- [ ] Booking shows: Customer A, service, date/time, total price
- [ ] Booking status = 'pending'
- [ ] Payment indicator shows: "PAID ✓"
- [ ] "Accept" & "Reject" buttons available

**Data Verification**:
- Firestore: Barber can read booking with barberId=their UID
- Firestore Rules enforce payment-first: barber CANNOT see/accept unpaid bookings
- paymentStatus correctly displayed

**Status**: ⏳ PENDING

---

### E4.2: Barber Accepts Paid Booking

**Actors**: Barber Approved  
**Entry**: Mobile app → Pending booking → Details screen

**Steps**:
1. Tap on booking from E4.1
2. Tap "Accept Booking"
3. Confirm acceptance

**Expected Result**:
- [ ] Booking status changes to 'accepted'
- [ ] Customer A receives notification
- [ ] Booking now visible in barber's "Accepted" tab

**Data Verification**:
- Firestore: `/bookings/{bookingId}` with status=accepted
- Firestore Rules: Accept only allowed because paymentStatus='paid'

**Status**: ⏳ PENDING

---

### E4.3: Barber Starts Service (Foreground Tracking)

**Actors**: Barber Approved, Customer A  
**Entry**: Barber's accepted booking → Service start time

**Steps**:
1. Barber: At booking time, tap "Start Service"
2. App requests location permission
3. Barber: Tap "Start Tracking"
4. Barber foreground location tracking begins (expo-location watchPositionAsync)
5. Customer A: Simultaneously view booking detail
6. Customer A: Tap "View Live Location"

**Expected Result**:
- [ ] Barber's location appears on customer's map (real-time)
- [ ] Location updates every 5 seconds
- [ ] Map shows barber's position, routing to customer
- [ ] Customer can see barber approaching

**Data Verification**:
- Firestore: `/bookings/{bookingId}` with status=in_progress
- Firestore: `/bookingTracking/{bookingId}` populated with location data
- Real-time listener on customer side receives updates

**Status**: ⏳ PENDING

---

### E4.4: Chat Between Customer & Barber

**Actors**: Customer A, Barber Approved  
**Entry**: Booking detail screen → Chat tab

**Steps**:
1. Customer A: Open booking chat
2. Customer A: Type "Are you on your way?"
3. Customer A: Tap "Send"
4. Barber Approved: Simultaneously open booking chat
5. Barber: See message appear (within 1 sec)
6. Barber: Reply "I'll be there in 5 minutes"

**Expected Result**:
- [ ] Messages appear in real-time (onSnapshot listener)
- [ ] Message sender correctly identified
- [ ] Both participants can read message history
- [ ] Message sync latency < 1 second

**Data Verification**:
- Firestore: `/conversations/{bookingId}` created after payment
- Firestore: `/conversations/{bookingId}/messages` populated
- Message.senderId matches auth.uid of sender
- Both participants can read messages via rules

**Status**: ⏳ PENDING

---

## Test Scenario E5: Service Completion & Chat History

**Objective**: Verify service completion, chat persistence, and review flow

### E5.1: Barber Completes Service

**Actors**: Barber Approved  
**Entry**: Mobile app → Active booking

**Steps**:
1. Barber: After service complete, tap "Complete Service"
2. Barber: Confirm completion

**Expected Result**:
- [ ] Booking status changes to 'completed'
- [ ] Tracking stops (no more location updates)
- [ ] Customer notification sent
- [ ] Chat remains open (history preserved)

**Data Verification**:
- Firestore: `/bookings/{bookingId}` with status=completed
- Firestore: `/bookingTracking/{bookingId}` updates stop

**Status**: ⏳ PENDING

---

### E5.2: Chat History Accessible After Completion

**Actors**: Customer A, Barber Approved  
**Entry**: Mobile app → Completed booking → Chat

**Steps**:
1. Customer A: Open booking detail
2. Tap "Chat History"
3. Scroll through all messages exchanged
4. Barber: Simultaneously view same chat

**Expected Result**:
- [ ] All messages visible
- [ ] Chat remains accessible after completion
- [ ] Both participants can see full conversation
- [ ] No messages deleted or hidden

**Data Verification**:
- Firestore: Messages still readable by both participants

**Status**: ⏳ PENDING

---

### E5.3: Customer Rates Barber

**Actors**: Customer A  
**Entry**: Mobile app → Completed booking → Rate Barber

**Steps**:
1. Tap "Rate & Review"
2. Select stars: 5 stars
3. Write review: "Excellent service!"
4. Tap "Submit"

**Expected Result**:
- [ ] Review created in Firestore
- [ ] Rating counted towards barber's average
- [ ] Review visible on barber's profile
- [ ] Barber can reply to review

**Data Verification**:
- Firestore: `/reviews/{reviewId}` created
- Firestore: Barber's `ratingAverage` updated

**Status**: ⏳ PENDING

---

## Test Scenario E6: Payment Rejection (Paid Booking)

**Objective**: Verify refund flow for already-paid bookings

### E6.1: Barber Rejects Paid Booking

**Actors**: Barber Approved, Customer A (new booking)  
**Entry**: New booking (complete payment flow from E3), barber's pending list

**Steps**:
1. New booking created & paid by Customer A
2. Barber Approved: Receives pending booking request
3. Barber: Opens booking detail
4. Barber: Tap "Reject Booking" with reason
5. Barber: Confirm rejection

**Expected Result**:
- [ ] Booking status changes to 'rejected'
- [ ] `refundRequired` flag set to true (audit trail)
- [ ] Payment remains with paymentStatus='paid'
- [ ] Customer notification sent
- [ ] Admin sees refund required flag

**Data Verification**:
- Firestore: `/bookings/{bookingId}` with status=rejected, refundRequired=true
- Firestore: `/payments/{bookingId}` still has status=paid (unchanged)
- No automatic refund initiated

**Status**: ⏳ PENDING

---

### E6.2: Admin Sees Refund-Required Transaction

**Actors**: Admin  
**Entry**: Web admin → Transactions tab

**Steps**:
1. Admin logs into admin web
2. Navigate to "Transactions"
3. Filter by status: "Requires Refund" or "Pending Action"

**Expected Result**:
- [ ] Transaction from E6.1 appears in list
- [ ] Status clearly marked: "REFUND REQUIRED"
- [ ] Shows customer, amount, booking ID
- [ ] Action button available

**Data Verification**:
- Admin query returns booking with refundRequired=true

**Status**: ⏳ PENDING

---

### E6.3: Manual Refund Processing (Future Batch)

**Note**: Automated refund API not in scope (Batch 09). Admin handles manually via Midtrans dashboard.

**Expected Future**: 
- Admin initiates refund via Midtrans
- `paymentStatus` changes to 'refunded'
- Customer receives refund notification

**Status**: ⏳ DEFERRED (Batch 10+)

---

## Test Scenario E7: Admin Operations

**Objective**: Verify admin dashboard functionality

### E7.1: Barber Registration Approval

**Actors**: Admin  
**Entry**: Web admin → Barber Verification → List

**Steps**:
1. Admin navigates to "Barber Verification"
2. Selects "Barber Pending" registration
3. Reviews uploaded documents (photo, ID, business license)
4. Tap "Approve"
5. Confirm action

**Expected Result**:
- [ ] Barber registration status changes to 'approved'
- [ ] Barber's verificationStatus set to 'approved'
- [ ] Barber Pending can now accept bookings
- [ ] Barber receives notification

**Data Verification**:
- Firestore: `/barbers/{barberId}` with verificationStatus=approved
- Barber can now see bookings (previously hidden)

**Status**: ⏳ PENDING

---

### E7.2: Booking Monitoring & Filters

**Actors**: Admin  
**Entry**: Web admin → Bookings → Filter

**Steps**:
1. Admin navigates to "Bookings"
2. Filter by: Status = "pending", PaymentStatus = "paid"
3. View filtered list

**Expected Result**:
- [ ] List shows all pending bookings with paid status
- [ ] Filters work correctly
- [ ] Booking details accessible
- [ ] Payment transaction visible

**Data Verification**:
- Firestore Index 3 supports query efficiently

**Status**: ⏳ PENDING

---

### E7.3: Transaction Monitoring

**Actors**: Admin  
**Entry**: Web admin → Transactions

**Steps**:
1. Admin navigates to "Transactions"
2. View all payments (Midtrans + future cash)
3. Filter by payment method, status, date range

**Expected Result**:
- [ ] All transactions displayed
- [ ] Filters functional
- [ ] Payment status visible (paid, failed, pending, refunded)
- [ ] Refund-required items highlighted

**Status**: ⏳ PENDING

---

## Test Scenario E8: Chat Multi-Device Sync

**Objective**: Verify chat works across multiple devices simultaneously

### E8.1: Message Sync Across Devices

**Actors**: Customer A (Device 1 & Device 2), Barber Approved (Device 4)  
**Entry**: Active booking with chat open

**Steps**:
1. Customer A Device 1: Open booking chat
2. Customer A Device 2: Simultaneously open same booking chat
3. Barber Device 4: Open same booking chat
4. Customer A Device 1: Send message "Hello"
5. Observe Barber Device 4: Message appears within 1 sec
6. Observe Customer A Device 2: Message appears within 1 sec
7. Barber Device 4: Reply "Hi there"
8. Observe Customer A Device 1 & 2: Reply appears simultaneously

**Expected Result**:
- [ ] Messages sync across all 3 devices within 1 second
- [ ] No duplicate messages
- [ ] Message order consistent
- [ ] All devices see same conversation state

**Data Verification**:
- Firestore: Single messages collection, all listeners receive onSnapshot updates
- No race conditions or conflicts

**Status**: ⏳ PENDING

---

## Test Scenario E9: Concurrent Slot Hold Timeout

**Objective**: Verify slot hold expiration after 15 minutes

### E9.1: Slot Hold Expires

**Actors**: Customer B  
**Entry**: Booking checkout, slot hold active

**Steps**:
1. Customer B: Create new booking, select barber/time
2. Verify slot hold created
3. Wait 15+ minutes (or trigger expiry via backend function)
4. Customer B (after 15 min): Attempt another booking for same slot

**Expected Result**:
- [ ] After 15 min, slot hold automatically released
- [ ] Another customer can book same slot
- [ ] Stale hold prevents orphaned slots

**Data Verification**:
- Firestore: slotLock document deleted or marked expired
- Subsequent booking for same slot succeeds

**Status**: ⏳ PENDING

---

## Test Scenario E10: In-Progress Cancellation Guard

**Objective**: Verify cancellation is blocked for in-progress bookings

### E10.1: Cannot Cancel In-Progress Booking

**Actors**: Customer A  
**Entry**: Mobile app → In-progress booking detail

**Steps**:
1. During active booking (status=in_progress):
2. Customer attempts to find "Cancel" button
3. Try to call support or force cancel

**Expected Result**:
- [ ] "Cancel" button not displayed
- [ ] UI prevents cancellation UI for in_progress status
- [ ] If backend called directly, returns 403 Forbidden

**Data Verification**:
- Firestore Rules: update blocked if current status is 'in_progress'
- Backend validation prevents cancellation

**Status**: ⏳ PENDING

---

### E10.2: Can Cancel After Completion

**Actors**: Customer A  
**Entry**: Mobile app → Completed booking detail

**Steps**:
1. After booking marked completed:
2. Attempt to find "Cancel" button
3. Try to cancel

**Expected Result**:
- [ ] Cancel option not available (service already rendered)
- [ ] Business logic prevents post-completion cancellation

**Status**: ⏳ PENDING

---

## Test Execution Log

| Scenario | Actor(s) | Status | Notes | Date |
|---|---|---|---|---|
| E1.1: Customer Reg | Customer A | ⏳ PENDING | | |
| E1.2: Barber Reg | Barber Pending | ⏳ PENDING | | |
| E1.3: Admin Login | Admin | ⏳ PENDING | | |
| E1.4: Multi-Device | Customer A | ⏳ PENDING | | |
| E2.1: Discovery Search | Customer A | ⏳ PENDING | | |
| E2.2: Barber Profile | Customer A | ⏳ PENDING | | |
| E2.3: Service Selection | Customer A | ⏳ PENDING | | |
| E3.1: Payment & Hold | Customer A | ⏳ PENDING | | |
| E3.2: Slot Conflict | A & B | ⏳ PENDING | | |
| E3.3: Midtrans Payment | Customer A | ⏳ PENDING | | |
| E3.4: Payment Sync | Customer A | ⏳ PENDING | | |
| E4.1: Booking Request | Barber Approved | ⏳ PENDING | | |
| E4.2: Barber Accept | Barber Approved | ⏳ PENDING | | |
| E4.3: Tracking Start | B. Approved & A | ⏳ PENDING | | |
| E4.4: Chat | A & B. Approved | ⏳ PENDING | | |
| E5.1: Completion | Barber Approved | ⏳ PENDING | | |
| E5.2: Chat History | A & B. Approved | ⏳ PENDING | | |
| E5.3: Review | Customer A | ⏳ PENDING | | |
| E6.1: Paid Rejection | B. Approved & A | ⏳ PENDING | | |
| E6.2: Admin Refund Flag | Admin | ⏳ PENDING | | |
| E7.1: Admin Approval | Admin | ⏳ PENDING | | |
| E7.2: Booking Monitor | Admin | ⏳ PENDING | | |
| E7.3: Transaction Monitor | Admin | ⏳ PENDING | | |
| E8.1: Multi-Device Chat | A(2 dev), Barber | ⏳ PENDING | | |
| E9.1: Hold Timeout | Customer B | ⏳ PENDING | | |
| E10.1: No Cancel IP | Customer A | ⏳ PENDING | | |
| E10.2: No Cancel Post | Customer A | ⏳ PENDING | | |

---

## Batch 09D-4: Midtrans Sandbox Hosted Configuration & Pre-Payment Validation (2026-08-09)

**Backend Preview (final)**: `urbarber-payment-45b44d5qd-kamaltzs-projects.vercel.app`, reached via the stable alias **`https://urbarber-payment-api-kamaltz-kamaltzs-projects.vercel.app`** (`MIDTRANS_API_BASE_URL`). Note: `urbarber-payment-api.vercel.app` (the "nice" domain, and what mobile's `.env.local` currently points to) is the **Production** alias -- a different deployment entirely -- and was correctly avoided for all sandbox/webhook configuration this phase.

### Route audit (from current source)
- `POST /api/payments/create` -- 15-min slot lock + `bookings` doc + Midtrans Snap transaction. Idempotent on `requestId`.
- `POST /api/payments/sync` -- pulls Midtrans Get Status, updates `payments`/`bookings`. Not transactional and does not finalize the slot lock on `paid` (diverges from the webhook's atomic finalization) -- flagged, not fixed (out of this phase's scope).
- `GET /api/payments/return` -- pure HTML display page keyed off query params only. Zero Firestore writes; cannot set `paymentStatus=paid` or finalize a slot. Confirmed safe by inspection.
- `POST /api/bookings/cancel` -- sets `refundRequired: true` on cancelling an already-paid booking.
- **Known, unfixed finding**: mobile `payment-api.service.ts` expects `redirectUrl`/`snapToken` in the create-payment response; the backend returns `paymentUrl`. Real client/backend contract mismatch, out of this task's scope.

### Bugs found live and fixed (all redeployed, all regression gates passing)
1. **PASS (fixed)** -- `handleCreatePayment` read `services/{serviceId}`, but real barber services are written exclusively to `barberServices/{serviceId}` ([barber.repository.ts:136](src/features/barbers/repository/barber.repository.ts:136)). The `services` collection had zero documents in the live project -- payment creation was completely broken for any real booking. Fixed to read `barberServices`; also added a `serviceData.barberId === barberId` ownership check (previously price could be sourced from an unrelated barber's service).
2. **PASS (fixed)** -- Snap `createTransaction()` payload was missing its required `transaction_details` wrapper key (fields spread flat at the top level instead of nested), so Midtrans rejected every real request with `transaction_details.gross_amount is required`. Fixed to nest correctly per Midtrans's documented Snap contract.
3. **PASS (fixed)** -- `transactionId: transaction.transaction_id` crashed the Firestore write with "Cannot use undefined as a Firestore value" -- Snap's create response only ever returns `{token, redirect_url}`, never `transaction_id`. Null-coalesced.
4. **PASS (fixed)** -- `handleSyncPayment` required `paymentData.transactionId` to already exist before it would query Get Status, but nothing ever populated it (see #3) -- sync could never work at all. Fixed to query by `orderId` (known from creation), matching the webhook's already-correct pattern; also now persists the real `transaction_id` once Get Status returns it.

### Confirmed live finding NOT fixed (data integrity preserved, optional per this phase)
- `POST /api/payments/sync`, called once against a Snap session the sandbox simulator never opened, returns Midtrans `404 "Transaction doesn't exist"`, which the handler's generic catch-all turns into an HTTP 500 instead of a graceful "still pending" response. Verified live that Firestore state is unaffected (`payment.status` stayed `initiated`, `booking.status` stayed `pending` -- no corruption). Not fixed; flagged for a future pass since step 16 was explicitly optional this phase.

### Webhook security audit (`POST /api/payments/webhook`, safe reachability -- no fabricated signature)
| Check | Result |
|---|---|
| HTTPS public endpoint, no Firebase bearer required | PASS |
| GET request | PASS -- 405, no processing |
| Empty POST body | PASS -- 400 `INVALID_WEBHOOK_PAYLOAD`, no writes |
| Malformed JSON POST | PASS -- 400, no crash |
| Well-formed fields + garbage signature | PASS -- 403 `INVALID_SIGNATURE`, rejected before any Firestore access |
| SHA-512 signature verification | PASS -- correct Midtrans algorithm (`order_id+status_code+gross_amount+ServerKey`), confirmed by source read |
| Authoritative Get Status reconciliation | PASS -- calls `snap.transaction.status(orderId)` after signature verification, confirmed by source read |
| Amount validation | PASS -- stored vs. notified `grossAmount` compared |
| Idempotency | PASS -- no-op 200 when payment/booking status already matches target |
| Shared reconciliation with `/api/payments/sync` | **NOT shared** (see route audit above) -- confirmed finding, not fixed |
| No trust in browser redirect status | PASS -- `/return` is display-only |
| No client ability to mark paid | PASS -- only the signature-gated webhook path ever sets `paymentStatus=paid` |

### Sandbox mode verification
`MIDTRANS_IS_PRODUCTION`'s raw value is Sensitive-typed in Vercel and cannot be read via `vercel env pull` (returns `[SENSITIVE]`, same limitation hit with the Supabase key in 09D-3A). Verified **empirically** instead: the real Midtrans redirect URL returned by the live payment intent resolved to host **`app.sandbox.midtrans.com`** -- authoritative proof of sandbox mode.

### Real sandbox payment intent (CUSTOMER_A, retained for 09E)
`bookingId=nLGvmOnfTBydsEu1PV6N`, `orderId=URB-nLGvmOnfTBydsEu1PV6N`, amount 15000 IDR (synthetic test service, `barberServices/pQKU01mf1mXIPUUQqqPB`, created for this test). **No payment was completed.**

| # | Scenario | Result |
|---|---|---|
| Pre-payment state | `payment.status='initiated'`, `booking.status='pending'`, no `paymentStatus` field set at all | PASS |
| Temporary hold only | `slotLocks` doc exists with `expiresAt`, no `status:'finalized'`, no `bookingId` attached | PASS |
| Customer A own visibility | Can read own booking + payment docs directly | PASS |
| Barber unpaid visibility (real query) | `getBarberBookings`-equivalent query (`paymentStatus=='paid'`) returns 0 results | PASS |
| Barber unpaid visibility (direct read) | Direct `bookings/{id}` read denied by Firestore rules (`permission-denied`), not just filtered | PASS |
| Pre-payment chat | Real `POST /api/bookings/:id/chat` -> 402 `PAYMENT_REQUIRED` | PASS |
| Chat side effect | `conversations/{bookingId}` confirmed NOT created | PASS |
| Customer B availability | Real `GET /api/bookings/availability` shows 14:00 `available:false`, all other slots `true`, zero leakage of Customer A's identity/bookingId/address/notes/amount in the response | PASS |
| Optional sync (once) | HTTP 500 (Midtrans "Transaction doesn't exist" for an unopened Snap session) but Firestore state confirmed unaffected -- see finding above | PARTIAL (safe, not clean) |

### P1 secret sprawl (reconfirmed, names only, not modified)
`urbarber-admin` (Preview **and** Production) still carries `MIDTRANS_SERVER_KEY`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID` -- unneeded by the Next.js frontend.

### Regression
backend typecheck PASS · backend tests **105/105** · rules **42/42** · unit 11/11 · `npm run check` 0 errors (47 pre-existing warnings) · admin build PASS · `git diff --check` clean · Vercel function count **5**.

---

## Batch 09E-P0: Payment Sync Reconciliation Fix + Live Recovery (2026-08-09)

**Incident**: a real Sandbox transaction (`bookingId=wkYn5a6HrgCCU3tYEJA4`, `orderId=URB-wkYn5a6HrgCCU3tYEJA4`) reached Midtrans `transaction_status=capture`, `fraud_status=accept` (genuinely paid) and was correctly finalized once by the webhook. A later call to `POST /api/payments/sync` destructively cancelled it: `booking.status` flipped to `cancelled`, `payment.status` flipped to `failed`, and the finalized `slotLock` was deleted -- while `booking.paymentStatus` stayed `paid` from the earlier correct webhook write, producing a corrupted split state.

### Root cause
`payments.ts` (pre-fix) called `mapMidtransStatus(midtransStatus.transaction_status)` with only one argument -- `fraud_status` was never passed. `mapMidtransStatus`'s `'capture'` branch then fell through to its default (previously `'failed'`) regardless of the true fraud verdict, and the resulting `'failed'` status triggered `shouldReleaseSlot()`, which deleted the slot lock and cancelled the booking. The webhook (`webhook.ts`) already passed `fraud_status` correctly and was never affected.

### Fix
1. **`status-mapper.ts`**: `'capture'` now explicitly branches `accept`->`paid`, `challenge`->`pending`, `deny`->`failed`, and **anything else (missing/unknown fraud_status)**->`pending` (previously the unsafe default `'failed'`). An ambiguous read can never again destructively fail a booking.
2. **New `src/payments/sync-reconciliation.ts`**: `handleSyncPayment`'s reconciliation logic was extracted into an exported, directly-testable `reconcilePaymentSync()` function (matching the codebase's existing convention of separating business logic from thin `api/*.ts` routers, e.g. `admin.service.ts`, `src/bookings/availability.ts`). It now:
   - always passes `fraud_status` into `mapMidtransStatus`;
   - on a confirmed `'paid'` result, finalizes the slot lock if missing or not yet finalized (creates it from `bookingData` if it was deleted);
   - restores `booking.status` from `'cancelled'` back to `'pending'` **only** when there is no evidence of a legitimate cancellation. `handleCancelBooking` (the only real cancel path) always stamps `cancelledAt` + `cancellationReason`, and flags `refundRequired` when the payment was already paid -- absence of all three on a `paid`+`cancelled` booking is conclusive evidence the cancellation was sync-bug-induced, not a real customer/admin action. A genuinely cancelled paid booking (bearing those markers) is left untouched and never resurrected -- its slot stays released and its status stays `cancelled`, matching `handleCancelBooking`'s existing "payment remains paid, admin refunds manually" model.
3. **`api/payments.ts`**: `handleSyncPayment` now delegates to `reconcilePaymentSync`.
4. **Known, related, unfixed finding**: `webhook.ts`'s finalization block is separately guarded by `!paymentData.paidAt`, so it also cannot re-finalize/recover this exact already-paid-once-then-corrupted scenario. Not fixed -- the task's recovery path is explicitly via `sync`, and touching the webhook (the trust boundary for real money) was out of scope here. Flagged for a future pass.
5. **Test infrastructure fix**: `vitest.config.ts` now sets `fileParallelism: false`. Multiple test files share the same Firestore emulator and one (`availability-api.test.ts`) does indiscriminate collection-wide clears on `bookings`/`slotLocks` -- running files in parallel raced those clears against this fix's new tests, causing nondeterministic failures unrelated to the code under test. Confirmed deterministic (113/113, twice) after the change.

### Regression tests added (`payment-sync-reconciliation.test.ts`, `backend.test.ts`)
| Case | Result |
|---|---|
| A. capture + accept | PASS -- `paid`, slot finalized |
| B. capture + deny | PASS -- `failed`, slot released, booking cancelled (legitimate destructive path preserved) |
| C. capture + challenge | PASS -- `pending`, not finalized paid, not destructively failed |
| D. capture + missing fraud_status on an already-paid, finalized booking | PASS -- does not downgrade to `failed`, does not un-finalize the slot |
| **MANDATORY**: paid + finalized booking re-synced with capture+accept | PASS -- byte-for-byte unchanged: `payment.status`, `booking.paymentStatus`, `booking.status`, `slotLock.status` all identical; exactly one booking/payment/slotLock document, no duplicates |
| RECOVERY: exact incident shape (paid but wrongly cancelled, slot deleted, no cancellation markers) | PASS -- `reconcilePaymentSync` restores `paid`/`pending`/`finalized` from this state |
| Legitimate paid+cancelled booking (with `cancelledAt`/`cancellationReason`/`refundRequired`) | PASS -- **not** resurrected; status and released slot left untouched |
| `mapMidtransStatus('capture')` / `(..., undefined/null/'')` / unknown fraud value | PASS -- always `pending`, never `failed`, never in `shouldReleaseSlot`'s destructive set |

### Recovery capability audit
Confirmed via the RECOVERY regression test (exact incident field shape) **before** touching the live specimen: the fixed `reconcilePaymentSync` can fully recover this corruption class using only the authoritative Midtrans Get Status read -- no manual Firestore patch was needed or used.

### Preview deployment
`https://urbarber-payment-41repgjfi-kamaltzs-projects.vercel.app`, reached via the stable alias `https://urbarber-payment-api-kamaltz-kamaltzs-projects.vercel.app`. `GET /api/health` -> 200. Function count: 5.

### Live recovery (`bookingId=wkYn5a6HrgCCU3tYEJA4`, single `POST /api/payments/sync` call)
Authoritative Midtrans state (confirmed by the sync response): `transaction_status=capture`, matching the known `fraud_status=accept` already on file.

| Field | Before | After (1st sync) | After (2nd sync, idempotency) |
|---|---|---|---|
| `payment.status` | `failed` | `paid` | `paid` (unchanged) |
| `booking.paymentStatus` | `paid` | `paid` | `paid` (unchanged) |
| `booking.status` | `cancelled` | `pending` | `pending` (unchanged) |
| `slotLock` | missing | `status=finalized`, `bookingId` attached | unchanged |

Duplicate-resource check after both syncs: exactly 1 booking and exactly 1 `slotLock` document for this barber/date/time. No duplicates, no re-cancellation on the second call.

### Customer B protection (post-recovery)
- `GET /api/bookings/availability` for the same barber/date: the recovered slot (`11:00`) correctly shown `available:false`.
- `POST /api/payments/create` attempt for the same barber/date/time as Customer B: **409 `SLOT_NOT_AVAILABLE`**, rejected before any Midtrans call. Confirmed zero stray booking/payment documents created by the attempt. No second Midtrans payable transaction was created.

### Regression (full suite, post-fix)
backend typecheck PASS · backend tests **113/113** (was 105; +1 in `backend.test.ts`, +7 new in `payment-sync-reconciliation.test.ts`) · rules **42/42** · unit 11/11 · `npm run check` 0 errors (47 pre-existing warnings) · admin build PASS · `git diff --check` clean · Vercel function count **5**.

---

## Batch 09E: Live Core Flow Completion -- Barber Acceptance + Realtime Chat (2026-08-09)

**Specimen**: `bookingId=wkYn5a6HrgCCU3tYEJA4`. Full sequence to this point: pre-payment intent -> real Sandbox capture+accept payment -> webhook finalized it paid -> a later sync call (pre-09E-P0-fix) destructively corrupted it (`booking.status=cancelled`, `payment.status=failed`, slot deleted) -> 09E-P0 fixed the root cause and recovered it live via the trusted `sync` reconciliation path (no manual Firestore edit) -> this phase resumes from that recovered `paid`/`pending`/finalized state through barber acceptance and realtime chat. The incident is kept as part of the record, not hidden -- it is real, useful validation evidence of both a genuine bug and its trusted-path recovery.

### 1. Barber visibility
Real `getBarberBookings`-equivalent query (`barberId==BARBER_APPROVED && paymentStatus=='paid'`) returns exactly the specimen; a direct doc read also succeeds. Confirms the standing before/after invariant: unpaid -> hidden (established in 09D-4), authoritatively paid -> visible (confirmed here).

### 2. Barber acceptance
`POST /api/barber/bookings/respond` (`action=accept`) -> `200`, `status: 'accepted'`. Precondition (`paymentStatus=='paid'`) enforced by the real endpoint.

### 3. Post-acceptance state
| Check | Result |
|---|---|
| `payment.status` | `paid` (unchanged) |
| `booking.paymentStatus` | `paid` (unchanged) |
| `booking.status` | `accepted` |
| `slotLock.status` | `finalized` (unchanged -- ownership does not move) |
| Customer A reads booking | PASS (direct read succeeds) |
| Customer B reads Customer A's booking | PASS -- **DENIED**, `permission-denied` |
| Availability for the same slot | still `available:false` |

### 4-5. Chat initialization + idempotency
`POST /api/bookings/:bookingId/chat` (Customer A) -> `201`, conversation created with `participants=[CUSTOMER_A, BARBER_APPROVED]` exactly, no Admin. A second call (Barber) -> `200` "Conversation retrieved", identical `conversationId` and `createdAt`, no duplicate document (verified: exactly 1 `conversations` doc matching this `bookingId`).

### Live bug found and fixed: chat send was completely non-functional
**Root cause**: `firestore.rules` blocked *all* client updates to `conversations/{conversationId}` (`allow create, update, delete: if false`), but the real `sendMessage()` client ([chat.repository.ts:145](../../src/features/chat/repository/chat.repository.ts)) always bundles a conversation-metadata update (`lastMessage`, `lastMessageAt`, unread counts) into the *same Firestore transaction* as the message write. Firestore transactions are all-or-nothing, so the update-rule violation aborted the entire transaction -- **every real chat message send failed**, confirmed by isolating the two writes: message-only create succeeded on its own, conversation-update-only failed with `permission-denied`.
**Fix**: `conversations/{conversationId}` now allows participant updates, but *only* when every structural/identity field (`customerId`, `barberId`, `bookingId`, `participants`, `status`, `createdAt`) stays exactly equal to its current value -- metadata fields (`lastMessage`, `lastMessageAt`, `lastSenderId`, unread counts, `updatedAt`) are free to change. This simultaneously unblocks real chat sending and enforces this phase's participant-immutability requirement (section 10). Added rules tests 39-40. Redeployed.

### Second live bug found and fixed: Admin had client-level chat read access
**Root cause**: `firestore.rules` read rules on both `conversations/{conversationId}` and `conversations/{conversationId}/messages/{messageId}` included `|| isAdmin()`, contradicting the documented invariant (`docs/agent/business-rules.md`: "Admin: No chat access"). Confirmed live *before* fixing: ADMIN_TEST, using only its ordinary Firebase JWT (no Admin SDK), successfully read the specimen conversation and all 3 messages.
**Fix**: removed `|| isAdmin()` from both read rules -- chat is participant-only, with no client-level admin bypass (there is no existing backend admin-chat-review endpoint to preserve). Added rules test 41. Redeployed. Re-verified live: both reads now `permission-denied`.

### 6-7. Realtime chat, both directions (via actual `onSnapshot`, not admin reads)
Two independently-authenticated Firebase app instances (Customer A's session, Barber's session) in the same process, each with a live `onSnapshot` listener on `conversations/{bookingId}/messages`.

| Direction | Message | Delivery evidence |
|---|---|---|
| Customer A -> Barber | "Pesan uji Customer" | Barber's `onSnapshot` listener fired with `senderId` matching CUSTOMER_A's uid |
| Barber -> Customer A | "Pesan uji Barber" | Customer A's `onSnapshot` listener fired with `senderId` matching BARBER_APPROVED's uid |

Both used the actual production `sendMessage()` transaction shape (message create + conversation metadata update in one transaction), post-fix.

### 8-10. Chat authorization negatives (all against the live specimen, post-fix)
| Test | Result |
|---|---|
| Customer B reads `conversations/{bookingId}` | **DENIED** (`permission-denied`) |
| Customer B creates a message | **DENIED** (`permission-denied`) |
| Customer B reads the messages subcollection | **DENIED** (`permission-denied`) |
| ADMIN_TEST reads conversation (ordinary client JWT, no Admin SDK) | **DENIED** post-fix (was ALLOWED pre-fix -- see above) |
| ADMIN_TEST reads messages (ordinary client JWT) | **DENIED** post-fix |
| Customer A attempts to add Customer B to `participants` | **DENIED** |
| Customer A attempts to add ADMIN_TEST to `participants` | **DENIED** |
| Customer A attempts to add an arbitrary UID to `participants` | **DENIED** |
| Conversation state after all mutation attempts | unchanged: `participants=[CUSTOMER_A, BARBER_APPROVED]` |

### Final state snapshot
Midtrans: `capture`/`accept` (authoritative, paid). `payment.status=paid`. `booking.status=accepted`. `slotLock.status=finalized`. Customer B same-slot: unavailable / `409 SLOT_NOT_AVAILABLE`. Exactly 1 conversation, participants exactly `[CUSTOMER_A, BARBER_APPROVED]`. Realtime chat both directions: PASS via real `onSnapshot`. Customer B: DENIED on all 3 vectors. Admin: not a participant, DENIED on all client-level access. Lifecycle intentionally stopped here -- `in_progress`/`completed`/`rejected`/`cancelled`/`refund`/`partially_refunded` were **not** exercised, per scope.

### P1_WEBHOOK_RECOVERY_ASYMMETRY (confirmed open, not fixed this phase)
`webhook.ts`'s finalization block is gated by `!paymentData.paidAt`, so it lacks the recovery capability now present in `reconcilePaymentSync` (09E-P0) for an already-paid-once-then-corrupted booking. This did **not** break the normal live webhook happy path (confirmed throughout this session's testing). Before Production, webhook and sync reconciliation should be reviewed/refactored to converge through one authoritative payment reconciliation/finalization service where practical. Not resolved.

### P1_SECRET_SPRAWL (confirmed open, not modified)
`urbarber-admin` (Preview and Production) still carries `MIDTRANS_SERVER_KEY`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`.

### Regression (full suite, post-fix)
backend typecheck PASS · backend tests **113/113** (unchanged -- no backend code touched this phase, only `firestore.rules`) · rules **45/45** (was 42; +3 new: 39, 40, 41) · unit 11/11 · `npm run check` 0 errors (47 pre-existing warnings) · admin build PASS · `git diff --check` clean · Vercel function count **5**.

---

## Open Findings Registry (Batch 09 Checkpoint, 2026-08-09)

Confirmed live/by source inspection; **none fixed** -- audit-only, recorded here for traceability before Production. Do not treat any of these as resolved by this checkpoint.

- **`P1_WEBHOOK_RECOVERY_ASYMMETRY`** -- see Batch 09E above. `webhook.ts`'s finalization is gated by `!paymentData.paidAt` and lacks `reconcilePaymentSync`'s recovery capability for an already-paid-once-then-corrupted booking. Happy path unaffected.
- **`P1_SECRET_SPRAWL`** -- see Batch 09D-4/09E above. `urbarber-admin` (Preview + Production) carries `MIDTRANS_SERVER_KEY`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`, none needed by the Next.js frontend.
- **`P1_SYNC_UNOPENED_SNAP_500`** -- see Batch 09D-4 above ("Optional sync (once)"). `POST /api/payments/sync` against a Snap session the sandbox simulator never opened returns Midtrans `404 "Transaction doesn't exist"`, which the handler's generic catch-all turns into an HTTP 500 instead of a graceful "still pending" response. Confirmed Firestore state stays safe/unaffected either way -- this is a response-quality gap, not a data-integrity one. Distinct from the 09E-P0 fraud_status bug (already fixed); still applicable.
- **`P2_ADMIN_RAW_DOCUMENT_PATHS`** -- newly confirmed this checkpoint, by source inspection (not previously recorded). `getBarberRegistrations` (`backend/vercel/src/admin/admin.service.ts`, the **list**/dashboard endpoint backing `GET /api/admin/barber-registrations`) spreads `...d.data()` unfiltered, so raw Supabase storage paths in `documentPaths` reach the Admin browser in list responses. `getBarberRegistrationDetail` (the single-record detail endpoint) already does this correctly -- it explicitly strips `documentPaths` and returns only a `documentsAvailable` presence map (Batch 09D-2B). The list endpoint was missed when that hardening was applied.
- **`P2_SLOT_GENERATOR_DUPLICATION`** -- newly confirmed this checkpoint, by source inspection. Two independently-maintained copies of slot-generation logic exist: `src/features/barbers/utils/slot-generator.ts` (313 lines, client-side, its own callers describe it as the "deprecated client-preview" engine) and `backend/vercel/src/bookings/slot-generator.ts` (284 lines, backend, explicitly self-documented as "Ported from src/features/barbers/utils/slot-generator.ts... to keep the trusted-backend availability endpoint in parity"). Real drift risk: any future change to one will not automatically propagate to the other.
- **`P2_UPLOAD_PATH_ORGANIZATION_DRIFT`** -- newly confirmed this checkpoint, by source inspection (first noted during the 09D-3 source audit, not previously carried into this doc). `barber-registration.service.ts`'s `uploadVerificationDocument` doc comment claims the object path format is `{firebaseUid}/barber-registration/{documentType}/{timestamp}-{fileName}`, but the actual code builds `${uid}/verifications/${filename}` -- a flat structure with no per-document-type subfolder, contradicting its own comment. Cosmetic/organizational only; does not affect the owner-prefix RLS check (`(storage.foldername(name))[1]`), which only depends on the first path segment being the uid.

---

## Pass/Fail Criteria

**PASS**: All test scenarios complete successfully with expected results

**FAIL**: Any scenario fails or expected result not achieved

**Blocker Failures** (Must fix before Batch 10):
- Payment-first principle violated (barber can accept unpaid booking)
- Chat not syncing across devices
- Admin cannot approve barbers
- Slot conflicts allow double-booking

**Non-Blocker Failures** (Can defer to Batch 10):
- Cosmetic UI issues
- Minor notification delays
- Performance > SLA but < 2x SLA

---

## Sign-Off

**Test Executor**: (Name)  
**Date**: (YYYY-MM-DD)  
**Overall Result**: ⏳ PENDING  
**Issues Found**: TBD  
**Recommendation**: TBD (READY_FOR_BATCH_10 or HOLD_FOR_FIXES)
