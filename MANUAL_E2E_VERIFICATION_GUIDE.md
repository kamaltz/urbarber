# URBarber Thesis v1.1 — Manual E2E Verification Guide

**Companion to**: `FINAL_THESIS_READINESS_AUDIT.md` §6. This guide exists because automated tests cannot verify live Firebase behavior, real Midtrans sandbox settlement, cross-device realtime sync, or actual on-screen rendering — the five areas below are the only remaining gate before deployment/APK build.

**Scope discipline**: this is a *verification* pass, not a feature pass. If a step fails, capture evidence and report it — do not attempt to fix code while executing this guide. Fixes happen in a follow-up session against a specific, evidenced failure.

**HEAD this guide verifies**: `59356c7b68da0ae79816f114c66402d43a83fa93` (branch `feat/thesis-v1.1-final-stabilization`). Safety checkpoint: `backup/thesis-v1.1-pre-manual`.

---

## Before you start: test accounts & data

None of the values below are credentials — they describe *roles and states*, not secrets. Create these yourself; do not ask anyone for existing production accounts.

| # | Account | How to create it | Required state |
|---|---|---|---|
| 1 | **Admin** | Run `node scripts/set-admin-claims.mjs --email=<your-test-admin-email>` against your target project (needs a service account at `secrets/firebase-service-account.json` or `GOOGLE_APPLICATION_CREDENTIALS` — this promotes an *existing* Firebase Auth user, so sign up that email as a customer in the app first, then run the script) | `app_role: admin` custom claim, `users/{uid}.role: admin` |
| 2 | **Barber A** | Register through the app's real barber onboarding flow (signup → business profile → documents → submit) | Start `pending`; you'll approve it yourself in §1 |
| 3 | **Barber B** (optional, for search-radius/mixed-dataset testing) | Same as Barber A, at a *different* location (a different city/district than Barber A) | Approved, active, with `location` set — needed to see more than one marker on the map |
| 4 | **Customer** | Register through the app's real customer signup flow | Standard active account |

Two supplementary scripts exist for bulk/synthetic data (`npm run seed:discovery`, `node scripts/seed-barber-operations.js`) — they write Firestore documents directly and are useful for populating the map with extra markers or generating booking-history fixtures, but the barber/customer *documents* they create have **no matching Firebase Auth account**, so you cannot log in as them. Use the real registration flow (accounts 2–4 above) for anything you need to log into; use the seed scripts only to pad out background data if you want more than 1–2 markers on the discovery map.

**Devices needed**: one Android device or emulator running the built dev client (or Expo Go, if compatible with the installed native modules) for the barber role, and a second physical Android device (a second emulator instance cannot get a real GPS fix, so §5 specifically needs a real phone) for the customer role. A desktop browser is sufficient for the Admin walkthrough.

**Midtrans**: use Midtrans's own published Sandbox test card (this is Midtrans's public developer-documentation value, not a project secret): card number `4811 1111 1111 1114`, any future expiry, CVV `123`, 3DS OTP `112233`. Confirm `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` in the backend's environment are Sandbox keys, not Production, before starting §4.

---

## §1. Admin full walkthrough

**Setup**: sign in to the admin app as the Admin account.

| Step | Action | Expected result |
|---|---|---|
| 1.1 | Load the dashboard | KPI cards render real numbers (0s are fine on a fresh project); no console errors; "Segarkan Data" button works |
| 1.2 | Go to Verifikasi Barber, filter "Menunggu" | Barber A's pending registration appears with business name, owner name, phone |
| 1.3 | Open Barber A's detail, review the submitted KTP document preview | Document image loads via signed URL |
| 1.4 | Approve Barber A (no reason required for approve) | Success message; Barber A disappears from the "Menunggu" filter; re-filter "Disetujui" and confirm it now appears there. **This is the exact flow that was completely broken before Stage 6** — if this fails, it is the highest-priority finding to report |
| 1.5 | Go to Kelola Barber, confirm Barber A shows `accountStatus: active`, `verificationStatus: approved` | Matches |
| 1.6 | Suspend Barber A with a reason | Modal requires the reason (cannot submit blank); barber's status flips to suspended; reason is visible in the barber detail and on the Dashboard's "Barber Ditangguhkan" list |
| 1.7 | Reactivate Barber A | Status returns to active |
| 1.8 | Go to Manajemen Pengguna, suspend the Customer account, then reactivate it | Same reason-required/status-flip behavior as 1.6–1.7 |
| 1.9 | Go to Manajemen Kategori, create a category, then edit it | **Edit must close the modal on success** (this was broken before Stage 10 — confirm the modal actually closes and the form doesn't silently reset to blank create-mode) |
| 1.10 | Deactivate the category you just created | Confirmation prompt appears; category disappears from the active list |
| 1.11 | Go to Monitoring Booking and Monitoring Transaksi (empty is fine pre-§4) | Pages load without error; filters are clickable |
| 1.12 | If you have more than 20 records in any list page (barbers/users/bookings/transactions) by this point, or after seeding extra data | "Muat Lebih Banyak" button appears and appends the next page without duplicating rows |

**Evidence**: screenshot of 1.4 (before/after filter switch), 1.6 (reason field enforcement), 1.9 (modal closing after edit).

---

## §2. Barber profile + image + gallery propagation

**Setup**: log in to the mobile app as Barber A (now approved).

| Step | Action | Expected result |
|---|---|---|
| 2.1 | On Barber A's Profile tab, change the shop name, address, and description; save | Success confirmation |
| 2.2 | Reload the Profile tab (kill and reopen the app, or pull-to-refresh) | The new shop name/address/description persist — this confirms the write actually landed, not just optimistic local state |
| 2.3 | Go to Barber A's own Dashboard (home) screen | Shop name shown there matches the edit in 2.1 |
| 2.4 | Upload a new profile photo | Barber's **own** Profile screen shows the new photo immediately (this was broken pre-Stage-4 — the barber's own screen previously showed no avatar after upload) |
| 2.5 | Upload 1–3 gallery photos (max 8) | Thumbnails appear in the gallery strip on the Profile tab |
| 2.6 | Delete one gallery photo | It disappears from the strip; re-open the app to confirm it didn't come back |
| 2.7 | Switch to the Customer account, search for or open Barber A's detail page | Shop name/address/description match step 2.1 exactly, profile photo matches step 2.4, and the gallery section shows the photos from 2.5/2.6 (not the deleted one) |
| 2.8 | On the Customer's Explore/search screen, find Barber A's card | Displayed rating/review count is real (0.0 with no review count shown if Barber A has no reviews yet — **not** a hardcoded 4.8/12; that hardcode was the Stage 8 finding) |

**Evidence**: screenshot pair for each of 2.1→2.7 (barber-side edit, then the same field on the customer-facing detail screen) to demonstrate propagation, not just that each side independently renders something.

---

## §3. Customer nearby search + map marker

**Setup**: Barber A and (if created) Barber B both approved and active, each with a real device-GPS-captured `location` set (via their own Profile screen's location step, not a seed script). Customer account, on a device with location permission grantable.

| Step | Action | Expected result |
|---|---|---|
| 3.1 | Open the Explore/Cari Barber screen, grant location permission when prompted | Map centers on your real location, not the Garut default fallback |
| 3.2 | Confirm a marker appears for Barber A (and Barber B, if within the 25km search radius) | Marker renders at the correct position; tapping it navigates to that barber's detail page |
| 3.3 | Deny location permission (test on a fresh install, or revoke permission in device settings and reopen) | App falls back to the default-area (Garut) center and shows the "Menampilkan barber di sekitar area default" notice — never silently presents the default area as your real location |
| 3.4 | Tap "Gunakan Lokasi Saya" from the notice in 3.3 | Prompts for permission again; on grant, re-centers on real location |
| 3.5 | Search by barber name in the search box | Filters the nearby list to matching barbers only |
| 3.6 | If you seeded a barber via `scripts/migrations/backfill-barber-geohash.mjs`'s test scenario or otherwise have a barber doc with `location` but no `geohash` field, alongside a normal geohash-having barber | Both appear in results — **this is the exact Stage 8 mixed-dataset regression**; if the geohash-less barber is missing while the other one shows, this has regressed |

**Evidence**: screenshot of the map with at least one marker, screenshot of the default-area notice (3.3), screenshot of a barber card showing a real (non-4.8) rating.

---

## §4. Pricing + voucher + Midtrans sandbox

**Setup**: Barber A active with at least one service configured (price, duration). Admin account for voucher/pricing-settings setup. Customer account for checkout.

| Step | Action | Expected result |
|---|---|---|
| 4.1 | As Admin, go to Pengaturan Biaya, enable Application Fee (pick either fixed or percentage mode) and confirm Home Service Fee settings | Save succeeds; re-open the page and confirm the values persisted |
| 4.2 | As Admin, go to Kelola Voucher, create a voucher (e.g. fixed or percentage discount, with a usage limit) | Voucher appears in the active list |
| 4.3 | As Customer, book Barber A's service **on-site** (not home service), apply the voucher at checkout | Invoice screen shows: base amount → voucher discount → subtotal → application fee → total, matching the amounts you configured in 4.1/4.2 — never a locally-recomputed guess |
| 4.4 | Proceed to Midtrans Snap checkout using the sandbox test card from the prerequisites section | Payment completes; app returns to a "paid" booking state |
| 4.5 | As Admin, open Monitoring Transaksi, find this transaction, expand its breakdown row | Base Amount / Voucher / Home Service Fee / Application Fee / Tip / Gross Amount all match what the customer saw in 4.3, and the disclaimer that Gross Amount is not platform revenue is visible |
| 4.6 | As Customer, book Barber A's service as **home service**, capture your device location when prompted | Backend computes a distance-based or fixed home-service fee per your 4.1 settings; if you are outside the barber's configured service radius, the booking is rejected with a clear distance-out-of-range message rather than silently created |
| 4.7 | As Customer, add a tip on either booking | Tip amount appears as its own line, added to the barber's payout value, never mislabeled as platform revenue |
| 4.8 | Try to reuse the same voucher past its usage limit (repeat 4.2's voucher on a second booking after exhausting its limit) | Checkout rejects the voucher with a clear "limit reached" message, does not silently apply a $0 discount |
| 4.9 | As Barber A, open the booking from 4.3 in Booking Detail | Shows "Nilai Layanan" (net) separately from any home-service fee/tip — never the gross customer payment mislabeled as the barber's own value |

**Evidence**: screenshot of the invoice breakdown (4.3), the Midtrans Snap payment confirmation (4.4), the admin transaction breakdown (4.5), and the barber's booking-detail net-value display (4.9).

---

## §5. Two-device home-service tracking

**Setup**: the home-service booking from §4.6, now `status: accepted` (have Barber A accept it from their Booking Detail screen — payment must already be `paid`). Barber A on physical Device 1, Customer on physical Device 2 (or a second real phone/session) — **not two emulators**, since GPS movement matters here.

| Step | Action | Expected result |
|---|---|---|
| 5.1 | Barber A opens the accepted booking's detail screen | Sees a "Mulai Perjalanan"/start-tracking action (only for accepted, home-service, untracked bookings) |
| 5.2 | Barber A taps start, grants foreground location permission | Tracking begins; screen shows en-route state |
| 5.3 | Customer opens their tracking screen for this booking | Sees "Barber Sedang Dalam Perjalanan", a map with Barber A's live marker, and live distance to the service address |
| 5.4 | Physically move Device 1 (walk with it, or drive a short distance) | Within roughly 5–10 seconds and 10+ meters of movement, the marker on Device 2 updates position and the distance figure changes |
| 5.5 | Put Device 1 in a low-signal area or airplane-mode briefly, then restore | Device 2's tracking screen shows the "⚠️ Sinyal Lemah" stale-data indicator while signal is lost, and it clears once updates resume |
| 5.6 | Barber A taps "Sudah Sampai" (mark arrived) | Customer's screen updates to "Barber Sudah Sampai di Lokasi Anda" |
| 5.7 | Barber A starts the service (`in_progress`) — should require step 5.6 to have happened first | If you try to start the service before marking arrived, the app blocks it with a clear message |
| 5.8 | Barber A completes the service | Tracking stops; customer's screen shows the terminal "Pelacakan Perjalanan Telah Selesai" state; the tracking document's status is `stopped` |
| 5.9 | Force-kill Barber A's app mid-tracking (before 5.8), then reopen the booking detail | The recovery effect force-stops tracking cleanly rather than leaving it stuck en-route forever |

**Evidence**: a short screen recording (or timestamped screenshot sequence) on Device 2 showing the marker moving between two positions, plus screenshots of the stale-signal indicator (5.5) and the terminal state (5.8).

---

## Evidence checklist (consolidated)

For your thesis defense / QA log, collect and keep organized by section:

- [ ] §1: 3 screenshots (approval before/after, suspend-reason enforcement, category-edit modal closing)
- [ ] §2: 5 before/after screenshot pairs (name, address, description, photo, gallery — barber-side edit next to customer-facing detail page)
- [ ] §3: 3 screenshots (map with marker, default-area notice, real rating on a barber card)
- [ ] §4: 4 screenshots (invoice breakdown, Midtrans Snap confirmation, admin transaction breakdown, barber net-value display)
- [ ] §5: screen recording or timestamped sequence showing marker movement, plus 2 screenshots (stale indicator, terminal state)
- [ ] For every step, note the exact date/time and which Firebase/Vercel project you tested against (sandbox vs. any other environment)
- [ ] For any FAILED step: the exact screen, the exact action taken, the exact error message or incorrect value shown, and — if available — the relevant backend log line (Vercel function logs) or `console.warn` output from the app (all error paths in this codebase are prefixed `[FeatureName ErrorType Error]`, e.g. `[DiscoveryService ...]`, `[TrackingService ...]`, making them easy to find)

---

## Rollback / recovery guidance if a manual test fails

1. **Do not fix code mid-session.** Finish evidence capture for the failing step, note it, and continue to the next independent step if possible (most sections are independent enough to continue past a failure).
2. **Data corrected by re-running, not by editing history.** If a test step leaves bad data (e.g., a wrongly-approved test barber, a stuck tracking document), fix it by taking the corresponding legitimate action in the app/admin (reject, suspend, mark completed) or by deleting the specific test document directly in the Firebase Console — never by editing git history or these audit documents.
3. **If the failure looks like a code regression** (not a test-setup mistake), capture the evidence above and report it back — do not attempt a hotfix without review, since a same-day fix during manual verification skips the automated-gate re-run this whole process exists to guarantee.
4. **If you need to discard test data entirely and start over**, the safest path is a fresh Firestore emulator instance (for local testing) or a dedicated sandbox/staging Firebase project (for anything closer to production) — never point manual verification at a project you cannot freely wipe.
5. **Git safety net**: nothing in this guide requires any git operation. If something goes wrong in the *codebase* while you're investigating a failure (not just app data), `backup/thesis-v1.1-pre-manual` is the exact checkpoint to diff against or restore from — it points at `59356c7`, the same commit this guide verifies.
6. **After completing the matrix**, report results (pass/fail per step, with evidence) back before requesting deployment — per your standing instruction, deployment/build proceeds only after that.
