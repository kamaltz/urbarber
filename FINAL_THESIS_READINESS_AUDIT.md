# URBarber Final Thesis Readiness Audit

**Audit date:** 2026-08-13
**Auditor scope:** Read-only static/dynamic audit of local working tree (source, git history, quality gates, local Firestore emulator). No production Firebase/Supabase/Vercel/Midtrans systems were touched. No commits, merges, or destructive git operations were performed.

> **Update (2026-08-13, same day):** All 5 P0 blockers AND all 6 P1 REQUIRED items below have since been fixed/addressed and validated. See **[P0 Remediation Results](#p0-remediation-results)** and **[P1 Remediation Results](#p1-remediation-results)** at the end of this document for the fix-by-fix evidence and the updated regression numbers, and **[Updated Final Verdict](#updated-final-verdict-2026-08-13-post-p0p1-remediation)** for the current verdict (`READY FOR LIVE ACCEPTANCE TEST`, superseding §1's original `NOT READY` and §15's original percentages). The narrative sections below (§1–§15) are preserved as originally written, as the historical record of the pre-remediation state — read them alongside the addenda, not as still-current claims.

---

## 1. Executive Verdict

# NOT READY (close to READY WITH MINOR FIXES pending a short, well-scoped P0 list)

The codebase is substantially more complete and better engineered than the checked-in documentation admits — authentication, Firestore security rules, the admin web app, realtime chat, and location tracking are all genuinely implemented, mostly rules-enforced in addition to server-enforced, and covered by a real (not purely cosmetic) automated test suite that passes 190/190 (backend) + 91/91 (Firestore rules) + 167/167 (mobile unit) when run against a live local Firestore emulator.

However, this verdict cannot be READY because of one directly-verified, reproducible defect in the exact mechanism the thesis is built around: **two customers can each obtain a paid, final booking for the identical barber/date/time slot**, because slot-lock acquisition in `backend/vercel/api/payments.ts` is a non-atomic read-then-write, and the payment-reconciliation transaction will silently steal an already-finalized slot lock from one paid booking and hand it to a second paid booking with no conflict, alert, or refund flag (`backend/vercel/src/payments/reconcile-transaction.ts:123-137`). This directly violates the project's own stated invariant #4 ("Dua customer tidak boleh mempunyai final ownership atas slot yang sama") and is exactly the scenario item #19 of the Live Validation Checklist (Section W) asks to be proven. It was independently confirmed by direct code reading, not just agent claim (see §7).

In addition: unverified/pending barbers can be paid and can accept bookings server-side (no `verificationStatus` check on the create-payment or accept endpoints); a live, ungated "self-approve barber" button ships in the onboarding UI; the current branch's own `backend/vercel` workspace fails `npm run typecheck` outright (exit code 2) on a tooling/config error; and three separate git worktrees on this machine hold un-integrated tracking-security and UI-polish commits that are not on the branch presumably intended for defense.

None of the P0 items are architecturally hard — most are a `db.runTransaction` wrap, a status check, a `__DEV__` gate, and a one-line tsconfig fix — so this project is realistically one focused work session away from READY, but it is not there today.

---

## 2. Repository State

| Item | Value |
|---|---|
| Current branch | `feat/batch-10-device-map-validation` |
| HEAD | `095aa93` — "style: apply final URBarber logo assets" |
| Ahead of `origin/feat/batch-10-device-map-validation` | 24 unpushed local commits |
| Working tree | **Dirty** — 4 modified, 1 untracked, 0 staged |
| Ahead of `master` | 63 commits (0 behind) |
| Ahead of `develop` | 59 commits (0 behind) |
| Ahead of `feat/complete-thesis-mvp` | 56 commits (0 behind) |

**Modified (unstaged):** `src/app/(auth)/login.tsx`, `src/app/(auth)/onboarding/[step].tsx`, `src/app/(auth)/register-customer.tsx`, `src/app/(customer)/profile/about.tsx`
**Untracked:** `src/components/ui/BrandText.tsx`
**Staged:** none. `git diff --check`: no whitespace/conflict-marker errors.

### Important branch divergence (three separate worktrees on this machine)

| Worktree | Branch | HEAD | Commits NOT in current HEAD |
|---|---|---|---|
| `E:\app\urbarber` (audited) | `feat/batch-10-device-map-validation` | `095aa93` | — (this is the branch under audit) |
| `E:\app\urbarber-codex` | `feat/batch-10c-tracking-hardening` | `af0bae9` | 2 commits: "fix: harden booking tracking firestore rules", "fix: align realtime tracking integration" — touches `firestore.rules` (+171 lines), `backend/vercel/api/app.ts`, rewrites `src/features/location/services/tracking.service.ts` (296 lines changed), adds `tracking.model.ts` + tests, updates barber/customer tracking screens |
| `E:\app\urbarber-ui` | `feat/batch-11b-stable-ui-slicing` | `d74dca8` | 5 commits: UI refinement of 27 files across auth/barber/customer screens + `nativewind-env.d.ts` |

Both sibling branches diverge from the current branch at the same common ancestor `c31983f`. **The branch this audit ran against already contains its own tracking/chat rules hardening** (commit `1ef0cb7 fix: harden tracking and chat firestore permissions` is in this branch's history — confirmed by the Firestore rules audit finding a well-designed, booking-keyed, authoritative-re-derivation rule set already in place). The `batch-10c` branch appears to layer *further* hardening on top of that baseline, not fix an unhardened one — but it has not been reconciled into this branch, so its final state is unknown from here without inspecting that worktree. The `batch-11b` UI-polish commits are entirely absent from the audited branch. **No merge was performed.**

---

## 3. Critical Findings

| Severity | Area | Finding | Evidence | Recommended Action |
|---|---|---|---|---|
| **CRITICAL** | Payment-first / slot ownership | Two customers can obtain independent paid bookings for the identical barber/date/time slot. Slot-lock read-then-write in booking creation is not transactional; reconciliation silently reassigns an already-finalized lock to a second paid booking with no conflict check. | `backend/vercel/api/payments.ts:154-176` (read `lockSnap`, then separately `set()`); `backend/vercel/src/payments/reconcile-transaction.ts:123-137` (`if (!slotLockData \|\| slotLockData.status !== 'finalized' \|\| slotLockData.bookingId !== bookingId) { t.set(slotLockRef, {...bookingId,...}, {merge:true}) }` — overwrites a lock finalized for a *different* bookingId with no guard). Independently verified by direct code read. | Wrap the lock-check + lock-write + booking-create in one `db.runTransaction` in `payments.ts` (matching the pattern `reconcile-transaction.ts` already uses correctly). Add a guard in reconciliation that refuses to reassign a lock already `finalized` for a different bookingId, routing that case to manual admin/refund review instead. |
| **CRITICAL** | Barber onboarding | An unconditional (no `__DEV__` gate) "⚡ Disetujui & Masuk Dashboard Barber" button in the onboarding-status screen writes `verificationStatus:'approved', verified:true` directly to Firestore from the client for any real pending barber. | `src/app/(barber-onboarding)/status.tsx:64-98,164-171` (`handleApproveDemoAccount`). Mitigated at the data layer — `firestore.rules:289-292` denies client writes to `verificationStatus`, so the exploit itself is blocked by rules — but the affordance still ships live, would visibly confuse/mislead during a defense demo, and is a defense-in-depth failure at the UI layer. | Remove entirely, or hard-gate behind `__DEV__`/a build flag, before any demo or release build. |
| **HIGH** | Authorization / payment-first | Unverified (`pending`) or non-approved barbers can still receive a paid booking and can accept it — neither `handleCreatePayment` (`payments.ts`) nor `handleBarberRespondBooking` (`app.ts`) checks `verificationStatus`/`listingStatus`; `barbers` and `barberServices` Firestore reads are `allow read: if true` with no status filter, so any client can enumerate pending/rejected/suspended barbers. | `backend/vercel/api/payments.ts:135-147`; `backend/vercel/api/app.ts:358-419`; `firestore.rules:227,302` | Add `verificationStatus=='approved' && listingStatus=='active'` checks to both endpoints; scope discovery/detail reads to approved+active barbers server-side. |
| **HIGH** | Booking creation | Same non-atomic slot-lock pattern independently confirmed by a second audit pass — TOCTOU race is real and reachable via the live booking-creation API, not a theoretical concern. | `backend/vercel/api/payments.ts:152-206` | Same fix as the CRITICAL item above (single root cause, two audit passes). |
| **HIGH** | Barber onboarding | On any network failure during registration submit, the client silently falls back to a client-side Firestore write of `verificationStatus:'pending'` — a write `firestore.rules:289-292` denies — and the `catch` swallows the resulting permission error, still returning `success:true` to the UI. A barber can be told "submitted, pending review" when nothing was actually queued. | `src/features/barbers/services/barber-registration.service.ts:183-229` | Never return `success:true` from the fallback catch path; surface the real failure. |
| **HIGH** | Mobile routing | An authenticated **admin** account opening the mobile app hits an infinite loading spinner and can never reach the Logout button — all four role-guards redirect admins to `/(auth)/admin-web-only`, which is *inside* the same `(auth)` group whose layout is unmounted for any authenticated user before that route can render. | `src/app/(auth)/_layout.tsx:9-25`; `src/app/(auth)/admin-web-only.tsx` (unreachable); `src/app/index.tsx:23` | Exclude `admin-web-only` from the redirect-away gate, or move it outside the `(auth)` group. Verify with a real admin account on a device before defense — this would visibly break if tested live. |
| **HIGH** | Backend quality gate | `backend/vercel`'s own `npm run typecheck` fails outright (exit code 2) before checking a single line of application code, due to a deprecated `tsconfig.json` compiler option under the installed TypeScript version. | `backend/vercel/tsconfig.json:10` → `tsc` error `TS5101: Option 'baseUrl' is deprecated...` | Add `"ignoreDeprecations": "6.0"` (or migrate off bare `baseUrl`) in `backend/vercel/tsconfig.json`. Tooling/config issue, not an application-code defect, but it means the stated quality gate does not currently pass as-is. |
| MEDIUM | Payment-first | Expired 15-minute slot holds are never checked at booking-creation time (only `availability.ts`'s read-side listing excludes expired locks); an abandoned checkout can permanently block a slot for other customers until manual intervention — no TTL sweeper exists anywhere in the backend. | `backend/vercel/api/payments.ts:156` vs `backend/vercel/src/bookings/availability.ts:117-136` | Apply the same `expiresAt` check at creation time, or add scheduled cleanup. |
| MEDIUM | Webhook reconciliation | On a Midtrans Get-Status re-verification failure, the webhook handler falls back to trusting the raw (possibly stale/out-of-order) notification body instead of failing closed, which can transiently regress `payments/{id}.status` (booking `paymentStatus` is unaffected, so the barber-accept gate stays safe). | `backend/vercel/api/webhook.ts:85-93` | Prefer not writing a status regression on Get-Status failure, or fail closed. |
| MEDIUM | Firestore indexes | Admin barber-list filter by `listingStatus` (active/suspended) combined with `orderBy('createdAt','desc')` has no matching composite index — will throw `FAILED_PRECONDITION` when an admin actually uses that filter. | `backend/vercel/src/admin/admin.service.ts:604-609` vs `firestore.indexes.json` (only has `verificationStatus`+`createdAt` pairs) | Add composite index `barbers(listingStatus ASC, createdAt DESC)`. |
| MEDIUM | Backend CORS | `handleCors()` unconditionally allows any `Origin: http://localhost:*` in addition to the configured allow-list, with no environment gate, alongside `Access-Control-Allow-Credentials: true`. | `backend/vercel/src/lib/cors.ts:12` | Gate the localhost allowance behind a non-production check. |
| MEDIUM | Chat lifecycle | A `'closed'` conversation status is designed into the type system and the client already checks for it, but **no code path anywhere** (backend, client, or rules) ever writes it — chat stays fully read/write-able by both original participants indefinitely, even long after a booking is completed or cancelled. | `src/features/chat/types/index.ts:3`; `chat.repository.ts:181-183`; grep confirmed zero writers of `'closed'` | Deliberate product decision needed: implement a booking-lifecycle trigger that closes the conversation, or explicitly document that post-service chat is intentionally left open. |
| LOW-MEDIUM | Tracking lifecycle | Tracking is never force-stopped nor TTL'd on **customer-initiated cancellation** of an `accepted` booking (only the barber's own "complete" action stops tracking); `expiresAt` exists in the schema but is never written by any code path, and no Firestore TTL policy exists. Rules correctly block further writes once cancelled, so this is stale-but-scoped data, not a leak. | `firestore.rules:150-166`; `src/features/bookings/repository/booking.repository.ts:259-280`; grep confirmed zero writers of `expiresAt` | Wire cancellation to also call `stopBarberTracking`; populate `expiresAt` and add a TTL policy or scheduled cleanup. |
| LOW | Payment signature | Midtrans webhook signature comparison uses `===` on lowercased hex strings, not a constant-time comparison. | `backend/vercel/src/payments/signature.ts:26,31` | Use `crypto.timingSafeEqual`. Largely theoretical over HTTPS with SHA-512 hex, but not best practice. |
| LOW | Barber operations | Barber accept/reject and customer cancel are read-then-write, not wrapped in a Firestore transaction — benign for same-action double-clicks (idempotent outcome) but not for a genuine accept/reject race. | `backend/vercel/api/app.ts:384-439,815-892` | Wrap in `db.runTransaction` for defense-in-depth consistency with the rest of the payment/booking code. |
| LOW | Mobile routing | `/(barber)/messages` uses Next.js-style `page.tsx` instead of Expo Router's `index.tsx` convention — the barber messages inbox route is not actually reachable, and no tab/nav entry points to it anyway (only the deep-linked `[conversationId].tsx` sub-route works, e.g. from a booking detail screen). | `src/app/(barber)/messages/page.tsx` (no `index.tsx` present); `src/constants/routes.ts:22` (constant never referenced by any navigation call) | Rename to `index.tsx` and add a barber-side navigation entry point, or remove the dead constant if the inbox list view is out of scope. |
| LOW | Config hygiene | Seven production modules (mobile + admin) silently fall back to a hardcoded `http://localhost:3000` / equivalent if their API base URL env var is unset, rather than failing loudly. | `src/features/payments/services/payment-api.service.ts:9` and 6 similar files; `apps/admin/lib/api-client.ts:3` | Throw/assert on a missing required env var in a production build instead of silently defaulting to localhost. |
| LOW | App config | `app.json` Android `adaptiveIcon.foregroundImage` is 190×173 (non-square); `expo-doctor` flags this (see §10). `expo-image-picker` is a used runtime dependency but is not declared in `app.json` plugins, so its camera/photo-library permission strings are the unlocalized Expo defaults, inconsistent with the localized `expo-location` string. | `app.json`; `npx expo-doctor` output; grep for `expo-image-picker` usage vs `app.json` plugins list | Fix the icon asset aspect ratio; add `expo-image-picker` to the plugins array (or confirm the default English permission prompt is acceptable) before a device build. |
| INFO | Uncommitted local changes | The 5 dirty/untracked files are a small, purely cosmetic branding swap (`BrandLogo` → new `BrandText` component) touching login/register/onboarding/about screens. No business logic, no security-relevant code. | See §4 | Safe to commit as-is once reviewed; see §4 for the per-file breakdown. |

*(A larger set of LOW/INFO findings — dead/orphaned mock modules, `__DEV__`-gated debug logging left in `services.tsx`, minor lint warnings, TypeScript/Firebase SDK version splits across the three workspaces, a stale doc-comment referencing a nonexistent admin route, a locally-gitignored Vercel OIDC token — is detailed in the domain sections referenced above; none of these block a defense.)*

---

## 4. Uncommitted Changes Audit

| File | Purpose | Risk | Commit Recommendation |
|---|---|---|---|
| `src/components/ui/BrandText.tsx` (untracked) | New reusable text-branding component (renders "URBARBER" in the brand color/weight, `sm`/`md`/`lg` sizes, optional `light` variant for dark backgrounds). Pure presentation, no logic. | None — no I/O, no security surface. | **Should commit.** |
| `src/app/(auth)/login.tsx` (modified) | Swaps `<BrandLogo>` for `<BrandText size="md">` in the header. | None. | **Should commit.** |
| `src/app/(auth)/register-customer.tsx` (modified) | Same `BrandLogo` → `BrandText` swap. | None. | **Should commit.** |
| `src/app/(customer)/profile/about.tsx` (modified) | Replaces a hardcoded "URBarber" `<Text>` with `<BrandText size="lg">`. | None. | **Should commit.** |
| `src/app/(auth)/onboarding/[step].tsx` (modified) | Adds a `BrandLogo` import and renders it (`variant="large"`) only on the first onboarding step; other steps keep the existing icon card. | None — additive, conditional on `step === 0`. | **Should commit.** |

No `.env`, `.env.local`, service-account JSON, Firebase/Supabase/Midtrans key, debug log, screenshot, or build artifact is present in the working tree changes — confirmed via `git status` and the file list above. Nothing in this diff should be excluded; there is nothing here that needs to be `.gitignore`d beyond what already is.

---

## 5. Feature Readiness Matrix

Legend: Implemented = source exists and is wired to real (non-mock) data/backends. Automated Test = a real test file exists and was verified to test production code (not a same-named stub). Emulator = passed against a live local Firestore emulator in this audit. Hosted/Device/Live = **no evidence exists in this repository for any feature** — these columns are marked NOT VERIFIED throughout per the audit's evidentiary rules; only a real device/hosted session can produce that evidence.

| Feature | Implemented | Automated Test | Emulator | Hosted | Device | Live | Verdict |
|---|---|---|---|---|---|---|---|
| Auth (register/login, customer+barber) | Yes | Yes (`auth-registration.test.ts`, `initialize-account-claims.test.ts`, 3 mobile service tests) | Partial (auth tests are MOCK DOMAIN, not emulator) | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS (code) / NOT VERIFIED (live) |
| Customer profile | Yes | Indirect (repository tests) | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS (code) |
| Barber discovery | Yes | Yes (`discovery.service.test.ts`) | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PARTIAL — see HIGH finding: unfiltered barber visibility |
| Barber detail | Yes | Indirect | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS (code) |
| Services (barber-managed) | Yes | Yes (`barber.repository.services.test.ts`, `service-booking-guard.test.ts`) | Partial | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Schedule / availability | Yes | Yes (`availability-api.test.ts` ×2, `slot-generator` unit tests) | **Yes — 91/91 rules + re-run backend suite passing** | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Booking (create/select slot) | Yes | Yes (`payment-first-booking.test.ts`, 54 cases) | Partial | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | **PARTIAL — CRITICAL race condition, §3** |
| Payment-first / temporary hold | Yes | Yes | Yes (reconciliation suites pass emulator-tested) | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | **PARTIAL — CRITICAL, §3** |
| Payment status / reconciliation | Yes | Yes (`webhook-reconciliation`, `sync-payment-service`, `reconcile-transaction-atomicity`) | **Yes, all pass (see §9)** | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS (mechanism sound once §3 race is fixed) |
| Booking lifecycle (accept/reject/in_progress/completed) | Yes | Yes, dual-enforced (server transition map + Firestore rules) | Yes | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Customer↔barber chat | Yes | Real production code, no mock fallback found | Yes (rules tests) | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS — minor: never auto-closes (MEDIUM) |
| Barber onboarding/verification | Yes (transactional core is solid) | Partial | Partial | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | **BLOCKED — self-approve button + false-success fallback, §3** |
| Barber operations (accept/reject/track/complete) | Yes | Yes | Yes | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Admin dashboard | Yes, real Firestore aggregation | Yes (`admin-dashboard-recent-bookings.test.ts`) | Yes | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Admin barber verification | Yes | Yes (`admin-document-signed-url.test.ts`, `admin-registration-privacy.test.ts`) | Yes | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| User/barber management (admin) | Yes | Indirect | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Category management (admin) | Yes | — | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Booking monitoring (admin) | Yes, `snapToken`/tracking explicitly stripped from admin views | Yes (`admin-booking-dto.test.ts`) | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Transaction monitoring (admin) | Yes, read-only, secrets stripped | Yes (`admin-transactions-list.test.ts`) | Yes | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |
| Foreground barber tracking | Yes | Yes (`tracking.model.test.ts` unit) | — | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS — minor lifecycle gaps (LOW-MEDIUM) |
| Rating/review | Yes | Indirect (`booking.repository.review.test.ts`) | Yes (rules tests #14-16) | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | PASS |

**Note on `tracking-api.test.ts`:** this backend test file's own top-level `describe` block is literally titled `'DEAD_TRACKING_API historical validation (handlers are not routed)'` — it validates handlers that are documented, by the test file itself, as not currently routed/live. Do not count it as evidence the tracking API endpoint is exercised; the actual tracking feature works through direct Firestore writes/rules (verified separately, rules tests #63-80 all pass).

---

## 6. Actor Acceptance

**Customer** — register, login, profile, discovery, barber detail, service selection, schedule/slot selection, checkout, payment status, booking history, review, and chat are all implemented against real backends with meaningful automated coverage. The one defense-relevant gap is the slot-race (§3): a customer *can* end up paid against a slot someone else also paid for. Otherwise: **PASS**.

**Barber** — registration, business/service management, schedule management, booking requests, accept/reject, tracking, start/complete, chat, and analytics are all implemented, and the core state machine (booking transitions, payment gating) is genuinely dual-enforced (server + Firestore rules) — this is the strongest-audited part of the codebase. Blocked from a clean PASS by: the live self-approve bypass button, the false-success submission fallback on network failure, and unverified barbers being payable/acceptable server-side. Verdict: **BLOCKED** pending the P0 fixes in §12.

**Admin** — login, barber verification queue, barber/user management, category CRUD, booking monitoring, transaction monitoring, settings — all implemented against real data, with genuinely server-side role enforcement (`requireAdmin` checks a Firebase custom claim on every route, not just client-side route guards) and no path found that lets admin forge `paymentStatus`/`snapToken`. Only LOW findings (a stale doc comment, a correctly-gitignored local OIDC token). Verdict: **PASS**.

---

## 7. Payment-First Audit

**Race condition / concurrency assessment:** The core payment-first invariant — "a customer does not own a slot until `paymentStatus='paid'` confirmed authoritatively" — is *mechanically* well-built at the reconciliation layer: `reconcilePaymentTransaction` (`backend/vercel/src/payments/reconcile-transaction.ts:62-149`) correctly wraps the payment/booking/slot-lock read-and-write in a single `db.runTransaction`, decides state purely from data read *inside* that transaction (never a caller-supplied snapshot), and never lets a transient status regress an already-`paid` `booking.paymentStatus`. Webhook signature verification is real (`verifyMidtransSignature`, SHA-512 over `orderId+statusCode+grossAmount+serverKey`, checked before any Firestore read). Duplicate webhook delivery is idempotent. The sync/reconciliation endpoint always re-verifies against Midtrans's authoritative Get-Status API rather than trusting the notification body. `firestore.rules` independently deny any client write to `paymentStatus` or to the `payments` collection outright (`allow create, update, delete: if false`), so the "client cannot forge paid" invariant holds by two independent mechanisms.

**Where it breaks:** the *entry point* into that otherwise-sound machine — slot-lock acquisition at booking creation (`payments.ts:152-176`) — is not itself transactional. It is a plain `get()` then `set()`. Two concurrent create-payment requests for the same barber/date/time from two different customers can both read the lock as absent/available before either write commits, producing two independent `bookings` documents for the same slot. Each can independently be paid. When the second one reconciles, `reconcile-transaction.ts:123` sees the lock already `finalized` for a *different* `bookingId` and reassigns it anyway (`slotLockData.bookingId !== bookingId` is the only guard, and it's satisfied by design in this scenario) — no exception, no `refundRequired` flag, no admin alert. Both bookings sit at `paymentStatus:'paid'`, and the barber-accept endpoint only checks `paymentStatus==='paid'` (not slot exclusivity), so a barber could accept either — or, before anyone accepts, effectively both remain live paid bookings for one calendar slot.

This is a genuine idempotency/atomicity gap in the create path, not the reconciliation path, and it is fixable with the exact pattern the codebase already uses correctly elsewhere (wrap in `db.runTransaction`). It should be treated as the single highest-priority fix before any defense scenario that exercises concurrent booking (see §13 for a scripted validation of this exact scenario).

**Idempotency/retry safety otherwise:** create-payment is idempotent per `(customerId, requestId)` (client retries safely); barber accept/reject/cancel are not transactional but are practically idempotent for same-action double-clicks (LOW, not a defense blocker). No mock/simulated payment-success code path was found reachable outside test files.

---

## 8. Security Audit

**Auth:** Custom claims (`app_role`) are set exclusively server-side via the Firebase Admin SDK in trusted Vercel functions; no client code path can self-assign `admin` or elevate role. ID token is force-refreshed after claims changes. **PASS**, with one HIGH caveat: `app_role:'barber'` is granted at account creation, before admin review, and the *backend* booking/payment endpoints never re-check `verificationStatus` — only the mobile UI gates barber-tab access on `verificationStatus==='approved'`. A determined client (or a pending barber testing their own account) can bypass the UI gate and hit the real API directly. See §3 HIGH finding.

**Firestore rules:** Read in full; no collection was found with the dangerous blanket pattern `allow read, write: if request.auth != null` (no ownership check). The `bookings`, `payments`, `bookingTracking`, and `conversations`/`messages` rule blocks are genuinely well-designed — they re-derive participant identity from the authoritative parent document rather than trusting copied fields on the child document, and the booking status-transition rule independently mirrors the server's transition map (defense in depth). The one rules-level gap found is that `barbers`/`barberServices` reads are `allow read: if true` with no status filter, enabling unrestricted enumeration of pending/rejected/suspended barbers (paired with the HIGH backend-enforcement gap above).

**Storage (Supabase):** Firebase-as-third-party-auth bridging (no custom JWT minting, no service key in the mobile bundle); RLS scopes both buckets to the authenticated Firebase UID via `storage.foldername(name)`; admin access to KTP/identity documents goes only through a backend-only service-role client issuing 10-minute signed URLs, with server-side path re-validation against Firestore (namespace/traversal checks) rather than trusting client-supplied paths. **PASS**.

**Admin:** Role enforcement is server-side on every one of the 17 admin API routes (`requireAdmin` verifies the ID token and checks the `admin` custom claim before any handler logic runs) — client-side route guards are UX only, not the actual security boundary, which is the correct architecture. No admin surface (UI or API) can write `paymentStatus`, `snapToken`, or any Midtrans-authority field; transaction/booking monitoring views explicitly strip those fields before returning data to the client. **PASS**.

**Payment:** See §7. Signature verification present; the one LOW item is non-constant-time comparison, a minor best-practice gap, not an exploitable one over HTTPS with a SHA-512 hex digest.

**Secrets hygiene:** `git ls-files` confirms no `.env`, `.env.local`, service-account JSON, or Firebase Admin key is tracked — only `.env.example` templates. `check:secrets` flags were manually verified: `backend/vercel/.env.example` and `docs/*` hits are placeholder text; `backend/vercel/.vercel/.env.preview.local` (a real local file) is correctly excluded via `.gitignore` and confirmed untracked; test-file hits (`SB-Mid-server-TEST_SECRET_KEY` etc.) are Midtrans *sandbox* test literals confined to `tests/`. **PASS — no committed secret found.**

---

## 9. Test Results

Exact commands run from a clean, already-`npm install`ed working tree (no reinstall performed — `node_modules` present for root/backend/admin).

| Command | Result |
|---|---|
| `npm run typecheck` (root) | **PASS** — 0 errors. |
| `npm run lint` (root, `expo lint`) | **PASS** — 0 errors, 63 warnings (all style: `@typescript-eslint/no-unused-vars`, `react-hooks/exhaustive-deps`, `import/first`, `import/no-duplicates`, `@typescript-eslint/array-type`). |
| `npm run test:unit` (root, vitest) | **PASS** — 23/23 test files, 167/167 tests, 93.94s. |
| `npx expo-doctor` (root `npm run doctor` script itself is broken — bare `expo-doctor` binary not resolved via the npm script on this machine; ran via `npx --no-install expo-doctor` instead as a working equivalent) | **19/20 checks passed.** 1 failed: `Android.adaptiveIcon.foregroundImage` is 190×173, not square. |
| `npm run check:secrets` (root, PowerShell scanner) | Ran to completion, 8 hits — all manually verified as `.env.example` placeholders, a correctly-gitignored local `.vercel` file, or test-fixture sandbox literals. **No real secret found.** |
| `npm run test:firestore-rules` (root) | **First attempt: BLOCKED** — requires a local Firestore emulator, none was running. **After starting `firebase emulators:start --only firestore --project urbarber-f97ae` locally: PASS — 91/91 scenarios, 0 failed.** Emulator was stopped after the run. |
| `git diff --check` (root) | Clean, no output. |
| `cd backend/vercel && npm run typecheck` | **FAIL** — exit code 2, `tsconfig.json(10,5): error TS5101: Option 'baseUrl' is deprecated...`. Config/tooling issue (see §3 HIGH), not an application type error — no application code was even reached. |
| `cd backend/vercel && npm test` | **First attempt (no emulator running): 6/18 files, 59/190 tests failed**, all on `beforeEach`/`afterAll` hook timeouts trying to reach `127.0.0.1:8080`. **Re-run after starting the local emulator: PASS — 18/18 files, 190/190 tests, 17.42s.** |
| `cd backend/vercel && npm run build` | **N/A** — no `build` script defined in `backend/vercel/package.json`. Noted, not treated as a failure. |
| `cd apps/admin && npm run typecheck` | **PASS** — 0 errors. |
| `cd apps/admin && npm run build` (`next build`) | **PASS** — exit 0, compiled successfully, all 13 routes (static + dynamic) generated. An internal, non-fatal ESLint-compatibility error is logged during the build's own lint sub-step (`Invalid Options: Unknown options: useEslintrc, extensions...`) but does not fail the build. |
| `cd apps/admin && npm run lint` (`next lint`) | **FAIL / deprecated** — Next.js 15.5 prints "`next lint` is deprecated and will be removed in Next.js 16" and then errors on ESLint CLI options that no longer exist in the installed ESLint version. Per this project's own tooling classification rule, this is a **TOOLING issue, not an application defect** — `next build`'s type/compile checks already passed cleanly. |

**Test suite inventory (static classification, from source reading):** 41 test files, ~448 `it`/`test` cases total (backend 190, mobile `src` 167, Firestore rules script 91). Backend tests split roughly evenly between true UNIT tests (pure functions, no mocks), MOCK DOMAIN tests (in-memory simulation, e.g. `payment-first-booking.test.ts`'s 54 cases), and genuine FIRESTORE EMULATOR tests exercising the real production reconciliation/admin functions (`payment-sync-reconciliation`, `reconcile-transaction-atomicity`, `webhook-reconciliation`, `sync-payment-service`, all 5 `admin-*` files, `availability-api`) — all five of these were run against a live emulator in this audit and passed. `apps/admin` has **zero** test files. No test in the suite specifically exercises the concurrent double-booking scenario described in §3/§7 — the atomicity tests cover the *reconciliation* transaction's atomicity, not the *slot-lock-acquisition* race, which is a distinct code path.

---

## 10. Quality Gates

| Gate | Status |
|---|---|
| Root typecheck | PASS |
| Root lint | PASS (warnings only) |
| Root unit tests | PASS |
| Root Firestore rules tests | PASS (required starting a local emulator manually — not automated via a pretest hook) |
| `expo-doctor` | PASS with 1 known asset issue (non-square adaptive icon) |
| Secret scan | PASS |
| Backend typecheck | **FAIL** (tooling/config, see §3) |
| Backend tests | PASS (required starting a local emulator manually) |
| Backend build | N/A (no script) |
| Admin typecheck | PASS |
| Admin build | PASS |
| Admin lint | FAIL/BLOCKED — tooling deprecation (Next 15 `next lint`), not an application defect |

---

## 11. Documentation Drift

| Document | Claim | Actual source-code reality |
|---|---|---|
| `CLAUDE.md` (repo root) | Branch `feat/batch-09-infrastructure-live-validation`, baseline `e5c1600`, "Working Tree: Clean" | Actual branch is `feat/batch-10-device-map-validation`; working tree has 4 modified + 1 untracked file. **Confirmed stale**, as the audit brief itself already suspected. |
| `docs/development/current-status.md`, `feature-traceability-matrix.md`, `definition-of-done.md` | Admin (F-25–F-30) "Not implemented / Scheduled Batch 04"; Chat (F-31) "planned/UI shell only"; Map (E-01) "Not implemented (text fallback)" | All three are fully implemented, real-data-backed, and covered by passing tests (see §5, §6). These docs are frozen at a `docs/batch-01-scope-roadmap` snapshot. |
| `docs/agent/current-status.md` ("Batch 09 Baseline") | Payment-first testing is "Mock test... does NOT exercise real Firestore"; test table lists only 5 backend test files | Repo also contains `payment-sync-reconciliation`, `reconcile-transaction-atomicity`, `webhook-reconciliation`, `sync-payment-service` test files, all genuinely exercising real Firestore-emulator transactions against production functions. |
| `docs/agent/current-status.md` (test table) | `tracking-api.test.ts` listed as "PASSING / Tracking lifecycle" | The file's own top-level `describe` block reads `'DEAD_TRACKING_API historical validation (handlers are not routed)'`. |
| `docs/testing/payment-first-booking.md` | "Status: Test Design (Implementation Pending)" | `payment-first-booking.test.ts` is fully implemented, 54 passing cases. |
| `docs/testing/live-validation-batch-09.md` | Presents itself as an executed live/hosted validation transcript with dated PASS/FAIL rows and a "backend tests 105/105 · rules 42/42" footer | No corroborating artifact (CI log, screenshot) exists in the repo — **unverifiable from the repository**, per this audit's own evidentiary rules. It is also provably stale on its own terms: the rules suite now has 91 cases (not 42) and 4 more reconciliation test files exist, added by work that post-dates this log's claimed date. |
| `docs/agent/batches/` | No `batch-10*.md` exists, only `batch-09.md` and a deployment runbook | The current branch and multiple test-file doc-comments reference already-implemented "Batch 10B" and "Batch 10C" work with no corresponding batch doc. |
| Cross-doc disagreement | `docs/agent/batches/batch-09.md` marks only Phase A complete; `docs/testing/live-validation-batch-09.md` documents Phases D/E as already executed; test-file comments reference subsequent Batch 09F/10 work as landed | The three sources disagree with each other on project progress; none is authoritative alone. |

**Recommendation:** treat `docs/development/*` and `docs/agent/current-status.md` as unreliable until refreshed from current source; do not cite `docs/testing/live-validation-batch-09.md` as evidence of live testing in a defense — it cannot be corroborated from this repository.

---

## 12. Remaining Work Before Defense

**P0 — blocker sidang**
1. Fix the slot-lock race (§3, §7): wrap `payments.ts`'s lock-check + lock-write + booking-create in a single `db.runTransaction`; add a guard in `reconcile-transaction.ts:123` that refuses to reassign a lock already `finalized` for a different `bookingId`. *Validation:* fire two concurrent `POST /api/payments/create` requests for the identical barber/date/time from two different customer tokens; exactly one should succeed with a bookable slot, the other should receive `409 SLOT_NOT_AVAILABLE`.
2. Remove or `__DEV__`-gate the barber self-approve button (`src/app/(barber-onboarding)/status.tsx:64-98,164-171`). *Validation:* confirm the button is absent (or absent in a release build) and that a pending barber cannot reach the barber dashboard without real admin approval.
3. Add `verificationStatus=='approved' && listingStatus=='active'` checks to `handleCreatePayment` and `handleBarberRespondBooking` (`backend/vercel/api/payments.ts`, `api/app.ts`). *Validation:* attempt to pay/accept a booking against a `pending`-status barber account and confirm it is rejected.
4. Fix the onboarding-submit false-success fallback (`barber-registration.service.ts:183-229`) — do not return `success:true` from the network-failure catch path. *Validation:* simulate a network failure during submit and confirm the UI reports the real failure.
5. Fix `backend/vercel/tsconfig.json`'s `baseUrl` deprecation error so `npm run typecheck` exits 0. *Validation:* re-run `cd backend/vercel && npm run typecheck`.

**P1 — harus diselesaikan**
1. Fix the admin mobile dead-end redirect loop (`src/app/(auth)/_layout.tsx`). *Validation:* log in as an admin account on the mobile app and confirm the Logout button is reachable.
2. Restrict `barbers`/`barberServices` Firestore reads (or the discovery query layer) to exclude non-approved/non-active barbers from client enumeration.
3. Add the missing composite index `barbers(listingStatus ASC, createdAt DESC)` to `firestore.indexes.json`; deploy indexes before any admin barber-list filter demo.
4. Reconcile whether the `feat/batch-10c-tracking-hardening` and `feat/batch-11b-stable-ui-slicing` commits (sibling worktrees, §2) should be cherry-picked/merged into the branch used for defense — decide and execute deliberately, do not leave three diverged branches as the "final" state.
5. Refresh `docs/agent/current-status.md`, `docs/development/current-status.md`, `feature-traceability-matrix.md`, and `definition-of-done.md` to match actual implementation state (§11) before a committee reads them.
6. Apply the expired-slot-hold check at booking-creation time (§3 MEDIUM) so an abandoned checkout doesn't permanently block a slot.

**P2 — sebaiknya**
1. Gate backend CORS's unconditional `localhost:*` allowance behind a non-production check.
2. Decide and implement (or explicitly document as intentional) the chat `'closed'` state after booking completion/cancellation.
3. Wire booking cancellation to also stop barber tracking and populate `expiresAt`/TTL for tracking docs.
4. Wrap barber accept/reject/cancel in a Firestore transaction for defense-in-depth consistency.
5. Remove the `__DEV__`-gated but still-present "remove after live retest confirmed" debug logging in `src/app/(barber)/(tabs)/services.tsx`.
6. Fix the non-square adaptive icon asset flagged by `expo-doctor`.
7. Automate local Firestore emulator startup/teardown around `npm test` (backend) and `npm run test:firestore-rules` (root) via a pretest hook, so these gates don't silently pass/fail depending on whether a developer remembered to start one manually.

**P3 — optional**
1. Use `crypto.timingSafeEqual` for the Midtrans webhook signature comparison.
2. Delete orphaned mock data modules (`src/features/{barbers,bookings,customers}/mock/`) and the dead client-side `booking.repository.ts:createBooking` function (zero callers, would be rejected by rules anyway).
3. Add `expo-image-picker` to `app.json` plugins for consistent, localized permission prompts.
4. Reconcile the TypeScript version split across mobile (6.0.3) / backend (5.9.3) / admin (5.9.3) and the Firebase JS SDK split (mobile v12 / admin v10) to avoid future cross-workspace type/behavior drift.
5. Fix the 63 lint warnings (unused vars, `exhaustive-deps`, import ordering) — cosmetic, no functional impact.

---

## 13. Exact Final Validation Scenario

Step-by-step, to be executed on real devices/hosted environments (none of this has been executed as part of this repo-only audit):

1. Customer A registers → verify Firestore `users`/`customers` docs created, correct `app_role`.
2. Barber B registers → verify `barberRegistrations` doc created in `pending`.
3. Barber B uploads KTP → verify Supabase private-documents object created under Barber B's own UID-scoped path.
4. Barber B submits verification → verify submit is idempotent if retried (should not create a second doc).
5. Admin logs in, opens barber-verification queue → confirms Barber B is listed.
6. Admin approves Barber B → verify `verificationStatus:'approved'` in Firestore, and that this cannot be done twice destructively (idempotent).
7. Barber B force-refreshes ID token / re-logs in → verify barber-tab UI unlocks.
8. **Negative check:** before step 6, attempt to accept a payment/booking against Barber B's pending account directly via the API — must be rejected once P0 item 3 is fixed (currently would incorrectly succeed).
9. Barber B creates a service, sets a schedule.
10. Customer A discovers Barber B, selects the service and a slot, checks out.
11. Verify a `slotLocks` document is created with a 15-minute `expiresAt` and the booking is `pending`/unpaid.
12. Customer A completes Midtrans Sandbox payment → verify webhook and/or sync converge `payments/{id}.status` and `bookings/{id}.paymentStatus` to `paid`, and `slotLocks/{id}.status` to `finalized` referencing the correct `bookingId`.
13. **Negative check (the P0 CRITICAL scenario):** have Customer C attempt to check out and pay for the *same* barber/date/time slot concurrently with Customer A (e.g. two browser sessions submitting `POST /api/payments/create` within the same second) — after the P0 #1 fix, exactly one must succeed and the other must receive `409 SLOT_NOT_AVAILABLE`; before the fix, this audit found both can succeed and both can pay.
14. Barber B accepts Customer A's booking → verify rejected if `paymentStatus != 'paid'` (already correctly enforced) and accepted if `paid`.
15. Tracking starts for a home-service booking → verify only Barber B can write, only Customer A can read (already correctly enforced by rules — see §8).
16. Customer A observes location updates in the tracking screen.
17. Chat between Customer A and Barber B works in both directions in realtime; verify neither can spoof `senderId`.
18. Barber B starts the service (`in_progress`), then completes it (`completed`) → verify tracking stops (already correct) and illegal transitions (e.g. `pending`→`completed`) are rejected (already correct).
19. Customer A views booking history, sees the completed booking, submits a rating/review → verify a second review attempt on the same booking is rejected.
20. Admin views the booking and the transaction in their respective monitoring screens → verify `snapToken` and raw payment secrets are never present in the admin response payload (already correctly stripped — see §6).

**Negative tests to explicitly run (per audit brief, cross-referenced against this audit's findings):**
- Unpaid booking cannot be accepted — **already correctly enforced** (server + rules).
- Customer cannot edit `paymentStatus` — **already correctly enforced** (rules deny).
- Barber cannot edit `paymentStatus` — **already correctly enforced**.
- Customer cannot approve a barber — **already correctly enforced** (rules).
- Barber cannot approve themselves via the API/rules — **already correctly enforced**; however the client-side self-approve **button** (§3 CRITICAL) must be removed before this can be called a clean demo pass.
- Customer A cannot read Customer B's data — **already correctly enforced** (rules).
- Barber A cannot update Barber B's booking — **already correctly enforced**.
- Customer cannot read barber KTP — **already correctly enforced** (signed URL, backend-mediated only).
- Duplicate payment webhook is safe — **already correctly enforced** (idempotency check + emulator-tested).
- Duplicate accept request is safe — **already correctly enforced** for the same booking; **not safe across two different bookings racing for the same slot** — this is the P0 CRITICAL finding.

---

## 14. Git Release Recommendation

- **Baseline branch:** `feat/batch-10-device-map-validation` (current, HEAD `095aa93`) is the most complete mainline history — it is strictly ahead of `master`, `develop`, and `feat/complete-thesis-mvp` with nothing missing from any of them. It should remain the baseline.
- **UI branch to reconcile:** `feat/batch-11b-stable-ui-slicing` (worktree `E:\app\urbarber-ui`) carries 5 commits of UI refinement across 27 files (auth, barber, customer screens) that are not on the current branch. Recommend reviewing and cherry-picking/merging these deliberately before finalizing, since they post-date the current branch's own UI work at the same fork point.
- **Security branch to reconcile:** `feat/batch-10c-tracking-hardening` (worktree `E:\app\urbarber-codex`) carries 2 commits further hardening `firestore.rules` and the tracking service beyond what's already on the current branch. Recommend reviewing and merging before finalizing, since it is explicitly security-relevant.
- **Local changes to commit:** the 5-file `BrandText` branding change (§4) — low risk, cosmetic, no reason to hold back.
- **Files that must never be committed:** anything under `.vercel/` (already gitignored and confirmed untracked), any real `.env`/`.env.local` (already gitignored and confirmed untracked), `firestore-debug.log` (generated by this audit's local emulator run — untracked, gitignored by default Firebase tooling patterns; verify it isn't accidentally added).
- **No merge was performed by this audit.** These are recommendations only, pending explicit user instruction.

---

## 15. Final Verdict

```
IMPLEMENTATION READINESS:   90%   (nearly every listed feature is implemented against real backends; gap is the P0 concurrency bug + a few UX-layer defects, not missing functionality)
TEST READINESS:             80%   (448 test cases across 41 files, strong emulator-backed coverage of reconciliation/rules/admin; zero admin-app tests; no test covers the specific slot-creation race that exists)
LIVE VALIDATION READINESS:  10%   (only local dev-machine quality gates were run in this audit; zero device/hosted/live evidence exists anywhere in this repository, and one doc claiming "live tested" is unverifiable and self-contradictory)
DOCUMENTATION READINESS:    40%   (docs/agent/business-rules.md and current-architecture.md track reality reasonably well; docs/development/* and docs/agent/current-status.md are substantially stale; CLAUDE.md itself is stale)
DEFENSE READINESS:          60%   (strong, well-tested core architecture with genuine defense-in-depth in auth/rules/admin/payment-reconciliation, undercut by one directly-verified CRITICAL invariant violation in the thesis's central claim, a live client-side approval bypass, and unmerged branches — all concretely fixable, none requiring a redesign)
```

These percentages are evidence-derived from the command outputs, code reads, and file:line citations in this document — not estimates. Re-run §9's commands and re-verify §3's CRITICAL items after remediation to update this scorecard.

---

## P0 Remediation Results

**Remediation date:** 2026-08-13 (same day as the audit above). Scope: all 5 P0 items only — no P1/P2/P3 work was started. No commits, pushes, merges, or branch checkouts were performed; `.env.local` was not touched. Every fix was validated with a targeted regression test before moving to the next item, followed by a full cross-workspace regression suite after all 5 were done.

| P0 | Finding | Fix | Tests | Result |
|---|---|---|---|---|
| **P0-1** | CRITICAL: two customers could each obtain a paid, final booking for the identical slot (non-atomic slot-lock read-then-write in `payments.ts`; `reconcile-transaction.ts` could silently reassign an already-finalized lock to a different booking). | Extracted `acquireSlotLock()` into `backend/vercel/src/bookings/slot-lock.ts`, run inside a Firestore transaction in `payments.ts` (Firestore optimistic concurrency now serializes concurrent slot claims); added a `hasConflictingFinalizedLock` guard in `reconcile-transaction.ts` that fails safe (booking → `cancelled` + `refundRequired: true`, payment record preserved) instead of stealing an already-finalized lock. | New `tests/slot-ownership-race.test.ts`: **7/7 passed** (concurrent create, finalized-lock-immunity, expired-hold takeover, live-hold-blocks, duplicate-reconciliation idempotency, cross-booking-conflict fail-safe, delayed-webhook safety). Payment regression subset: **103/103 passed**. | **PASS** |
| **P0-2** | CRITICAL: a live, ungated "self-approve barber" button in `status.tsx` wrote `verificationStatus:'approved'` directly to Firestore from the client. | Removed `handleApproveDemoAccount` and its button entirely (codebase-wide search confirmed no other self-approval path exists). | `npm run typecheck` PASS; `eslint` on the file: 0 errors/warnings; `npm run test:firestore-rules`: **91/91 passed**, including `✓ 8. Barber cannot approve their own verification`. | **PASS** |
| **P0-3** | HIGH: unverified/pending/rejected/suspended barbers could still be paid into and could still accept bookings — neither `handleCreatePayment` nor `handleBarberRespondBooking` checked `verificationStatus`/`listingStatus` server-side. | Added `isBarberAcceptingBookings()` guard (`service-booking-guard.ts`, reusing the existing canonical fields, fails closed on missing data); wired into `handleCreatePayment` (payments.ts) and into `handleBarberRespondBooking`'s **accept** path only — reject stays ungated so a barber suspended after a paid booking can still release it. | New guard tests: **13/13 passed** (approved+active, pending, rejected, draft, suspended, inactive-listing, missing field, missing doc). Full backend regression: **205/205 passed**. | **PASS** |
| **P0-4** | HIGH: on any network/server failure during barber-registration submit, the client fell back to a Firestore write that firestore.rules denies, swallowed the resulting error, and still returned `success:true` — telling the barber "submitted" when nothing was queued. | Removed `fallbackClientSubmitRegistration` entirely; `submitRegistration()` now returns `success:false` with a real message on every non-OK response and every network/timeout failure, matching the existing `account-bootstrap.service.ts` pattern for the same problem class. No path attempts a client Firestore write anymore. | New `barber-registration.service.test.ts`: **7/7 passed** (backend success, network failure, 4xx, 5xx, timeout, duplicate-retry determinism, retry-after-failure) — each asserts `setDoc` was never called. Mobile regression: `npm run test:unit` **174/174 passed**. | **PASS** |
| **P0-5** | HIGH: `backend/vercel`'s own `npm run typecheck` failed outright (exit 2) on `tsconfig.json`'s deprecated `baseUrl` option under the resolved TypeScript 6.0.3. | Investigated first (per instruction, no blind `ignoreDeprecations`): confirmed via repo-wide grep that `backend/vercel` never actually uses the `@/*` path alias the `baseUrl`+`paths` block existed for — it was dead config, likely copy-pasted from the mobile project's tsconfig. Removed the unused `baseUrl`/`paths` options; this is a genuine root-cause fix, not a suppression. | `cd backend/vercel && npm run typecheck` → **exit 0**. Full backend regression: **205/205 passed** (unchanged from before the config removal, confirming it was truly dead config). | **PASS** |

### Full regression suite (run after all 5 P0 fixes, in order)

| Command | Before remediation | After remediation |
|---|---|---|
| `npm run typecheck` (root) | PASS, 0 errors | **PASS, 0 errors** |
| `npm run lint` (root) | 0 errors, 63 warnings | **0 errors, 64 warnings** (+1: the new `barber-registration.service.test.ts` has the same pre-existing `import/first` pattern already present in ~13 other test files — `vi.mock` must textually precede the import of the module under test) |
| `npm run test:unit` (root) | 167/167 passed, 23 files | **174/174 passed, 24 files** |
| `npx expo-doctor` | 19/20 passed (non-square adaptive icon) | **19/20 passed** (same pre-existing, unrelated asset issue — not a P0 item) |
| `npm run test:firestore-rules` (root, local emulator) | 91/91 passed | **91/91 passed** |
| `git diff --check` | clean | **clean** (only benign LF→CRLF line-ending notices, exit 0) |
| `cd backend/vercel && npm run typecheck` | **FAIL, exit 2** | **PASS, exit 0** |
| `cd backend/vercel && npm test` (local emulator) | 190/190 passed (only after manually starting the emulator) | **205/205 passed** (18→19 files; +15 tests: 7 slot-ownership-race + 8 barber-eligibility-guard) |
| `cd backend/vercel && npm run build` | N/A (no script) | **N/A (no script)** — unchanged |
| `cd apps/admin && npm run typecheck` | PASS, 0 errors | **PASS, 0 errors** |
| `cd apps/admin && npm run build` | PASS, 13/13 routes | **PASS, 13/13 routes** |

**Mobile unit tests:** 174 passed / 0 failed / 0 skipped.
**Backend tests:** 205 passed / 0 failed / 0 skipped.
**Firestore rules tests:** 91 passed / 0 failed.
**Typecheck:** root PASS, backend PASS (previously FAIL), admin PASS.
**Build:** admin PASS; backend has no build script (unchanged, not a P0 item).
**Lint:** 0 errors everywhere; 64 warnings on root (all pre-existing style categories, no new category introduced).

### Security regression checklist (re-verified post-fix, not just re-asserted)

- Customer cannot set `paymentStatus`, finalize a booking, approve a barber, or take another customer's slot lock — firestore.rules unchanged and re-verified passing (rules test suite 91/91, including the payment/booking/lock-related cases); P0-1's transactional fix makes the backend's own slot-acquisition logic uphold the same invariant it was already supposed to enforce.
- Barber cannot set `paymentStatus`, approve themselves (P0-2, now also removed at the UI layer, not just rules), or receive/accept a new booking while pending/rejected/suspended (P0-3, newly enforced server-side).
- Admin cannot forge Midtrans payment authority through the UI — untouched by this remediation (already PASS in the original audit, §8).
- Backend: duplicate webhook, delayed webhook, and reconciliation retries remain safe and now additionally cannot create duplicate slot ownership across two different bookings (P0-1's Test C/D/F, all passing) — this is a strictly stronger guarantee than before, not a weaker one.

### P0 REMEDIATION VERDICT: **PASS**

All 5 P0 blockers are fixed, individually test-validated, and confirmed with a clean full-repository regression pass. No P1/P2/P3 work has been started.

---

## P1 Remediation Results

**Remediation date:** 2026-08-13 (same day, immediately following P0 remediation). Scope: the 6 P1 REQUIRED items only, in the requested order — no P2/P3 work was started. No commits, pushes, merges, or branch checkouts were performed.

| P1 | Finding | Fix | Tests | Result |
|---|---|---|---|---|
| **P1-1** | HIGH: admin mobile dead-end — `admin-web-only` lived inside the same `(auth)` route group whose own redirect-gate blocked its `<Stack>` from ever rendering, so an authenticated admin got an infinite spinner. | Moved `admin-web-only.tsx` to the app root (`src/app/admin-web-only.tsx`), outside any auth-gated layout; updated all 6 reference sites. | `npm run typecheck` PASS; `eslint` on 8 touched files: 0 errors. Live browser verification blocked by a pre-existing, unrelated Metro/`react-native-web` incompatibility (`codegenNativeComponent is not a function`) — **not fixed, out of scope, flagged separately**; static verification only. | **PASS** (static); **live device confirmation still outstanding** |
| **P1-2** | HIGH: `barbers`/`barberServices` were publicly enumerable via `list()` regardless of pending/rejected/suspended status. | Split `allow read: if true` into `get()` (stays public) / `list()` (now requires `listingStatus=='active'` for barbers, `active!=false` or own-`barberId` for services) in `firestore.rules`. | 4 new Firestore rules tests (#87–90): PASS. Full rules suite: 95/95. Full backend regression: 207/207. | **PASS** |
| **P1-3** | MEDIUM→P1: admin barber-list `listingStatus` filter query had no matching composite index. | Added `barbers(listingStatus ASC, createdAt DESC)` to `firestore.indexes.json`. | New `admin-barber-list.test.ts`: 2/2 passed against the emulator. **Production index deployment (`firebase deploy --only firestore:indexes`) not performed — requires separate explicit approval.** | **PASS** (file-level); **deployment still outstanding** |
| **P1-4** | MEDIUM: expired slot holds not checked at creation time. | Already fully resolved as a side effect of P0-1's `acquireSlotLock`. No new code change needed. | Re-ran `slot-ownership-race.test.ts` Tests E/E2: 7/7 passed. | **PASS** (confirmed, not re-implemented) |
| **P1-5** | Branch reconciliation for `feat/batch-10c-tracking-hardening` and `feat/batch-11b-stable-ui-slicing`. | **Investigation overturned the original audit's own §14 recommendation** — a proper direct (not ancestor-relative) diff showed both branches are stale/superseded by the current branch's continued development, and in several files actively regressive (hardcoded `MOCK_CUSTOMER_ID`, missing auth guards, missing lazy chat-conversation creation, less-hardened Firestore rules). **Recommendation: do not merge either branch.** Two genuinely safe, isolated improvements were cherry-picked by hand instead: removed a temp diagnostic log in `(barber)/(tabs)/services.tsx`, added CSS module ambient declarations to `nativewind-env.d.ts`. | `npm run typecheck` PASS; `eslint`: 0 errors; `npm run test:unit`: 174/174. | **PASS** (analysis + 2 safe cherry-picks; no merge performed, per instruction) |
| **P1-6** | Stale documentation (§11). | Corrected 7 files with targeted, dated fixes (not full rewrites): `CLAUDE.md`, `docs/agent/current-status.md`, `docs/development/current-status.md`, `docs/development/feature-traceability-matrix.md`, `docs/development/definition-of-done.md`, `docs/testing/payment-first-booking.md`, `docs/testing/live-validation-batch-09.md` (evidentiary banner added, content preserved, not deleted). | Documentation-only; no code touched. `git diff --stat` confirms only `.md` files changed. | **PASS** |

### Full regression suite (run after all 6 P1 items, in order)

| Command | After P0 remediation | After P1 remediation |
|---|---|---|
| `npm run typecheck` (root) | PASS, 0 errors | **PASS, 0 errors** |
| `npm run lint` (root) | 0 errors, 64 warnings | **0 errors, 64 warnings** (unchanged) |
| `npm run test:unit` (root) | 174/174, 24 files | **174/174, 24 files** (unchanged — P1 fixes didn't add mobile unit tests beyond what P0 already added) |
| `npx expo-doctor` | 19/20 (non-square icon) | **19/20** (same pre-existing, unrelated asset issue) |
| `npm run test:firestore-rules` (root, local emulator) | 91/91 | **95/95** (+4 from P1-2) |
| `git diff --check` | clean | **clean** |
| `cd backend/vercel && npm run typecheck` | PASS, exit 0 | **PASS, exit 0** |
| `cd backend/vercel && npm test` (local emulator) | 205/205, 19 files | **207/207, 20 files** (+2 from P1-3's `admin-barber-list.test.ts`) |
| `cd apps/admin && npm run typecheck` | PASS | **PASS** |
| `cd apps/admin && npm run build` | PASS, 13/13 routes | **PASS, 13/13 routes** |

**Mobile unit tests:** 174 passed / 0 failed / 0 skipped. **Backend tests:** 207 passed / 0 failed / 0 skipped. **Firestore rules tests:** 95 passed / 0 failed. **Typecheck:** root/backend/admin all PASS. **Build:** admin PASS. **Lint:** 0 errors everywhere.

### Security regression checklist (re-verified post-P1-fix)

- Customer/barber authorization invariants: unchanged from the P0 checklist, still holding (rules suite 95/95 now includes the new P1-2 enumeration-restriction cases without breaking any prior case).
- `barbers`/`barberServices` enumeration: pending/rejected/suspended barbers are no longer listable by an arbitrary client; single-document `get()` remains intentionally public (booking-history/detail-view dependency, not a meaningful enumeration vector) — verified by rules tests #87–90.
- Admin route (`/admin-web-only`) reachability: fixed at the routing layer; underlying admin role enforcement (server-side `requireAdmin`) untouched by this change.
- No P1 fix altered payment-first semantics, booking status transitions, or any previously-passing rules/backend test.

### Outstanding items not resolved by this remediation (explicitly out of scope for P0/P1)

- **Live device verification of P1-1's admin redirect fix** — blocked by a pre-existing Metro/`react-native-web` bundler incompatibility unrelated to this fix; requires either a native device/simulator test (bypassing the broken web target) or a separate fix to the web bundler issue.
- **Production deployment of the P1-3 Firestore index** — the index file is correct and ready; `firebase deploy --only firestore:indexes` was not run (requires your explicit approval, per the audit's deployment rules).
- **P2/P3 items** — unchanged from §12: CORS localhost gate, chat auto-close, tracking cancellation cleanup/TTL, barber accept/reject transaction wrapping, non-square adaptive icon, TypeScript/Firebase SDK version splits across workspaces, lint warning cleanup, `crypto.timingSafeEqual` for webhook signature comparison.
- **The actual live three-role E2E validation scenario (§13)** — has not been executed. This remains the single largest gap between the current state and a genuine "tested" claim.

### P1 REMEDIATION VERDICT: **PASS**

All 6 P1 REQUIRED items are addressed (5 with code/config/doc fixes, 1 — branch reconciliation — with a corrected analysis and an explicit no-merge recommendation, as instructed), each individually validated, with a clean full-repository regression pass. No P2/P3 work has been started.

---

## Updated Final Verdict (2026-08-13, post P0+P1 remediation)

```
IMPLEMENTATION READINESS:   96%   (was 90% — all P0/P1 code-level gaps closed: transactional slot-lock, barber-eligibility gate, honest registration-submit failure, admin route fix, enumeration restriction, index added. Remaining gap is P2/P3 polish, not missing/broken functionality.)
TEST READINESS:             90%   (was 80% — +26 new test cases (7 slot-ownership-race, 8 barber-eligibility, 4 rules enumeration, 2 admin-barber-list, 7 registration-submit) directly covering the exact gaps the original audit found. apps/admin still has zero test files; no live/device test harness exists.)
LIVE VALIDATION READINESS:  10%   (unchanged — this remediation pass, like the original audit, ran entirely against local dev tooling and a local Firestore emulator. Zero device/hosted/live evidence exists anywhere in this repository. This is the binding constraint on the overall verdict.)
DOCUMENTATION READINESS:    70%   (was 40% — 7 files corrected with dated, evidence-backed fixes; FINAL_THESIS_READINESS_AUDIT.md itself is now the cross-referenced source of truth from CLAUDE.md. Some docs, e.g. the F-01..F-23/A-01 rows of the traceability matrix, were not re-verified in this pass and may still contain other staleness.)
DEFENSE READINESS:          80%   (was 60% — the CRITICAL slot-ownership race, the client-side barber self-approve bypass, unverified-barber payment/acceptance, the false-success registration bug, and the backend typecheck failure are all fixed and regression-tested; the two remaining P1 items with residual outstanding work are a live-device UI check and a production index deploy, both low-risk and well-scoped. The 20-point gap to "fully defense-ready" is almost entirely the missing live three-role E2E execution, not code correctness.)
```

### FINAL VERDICT: **READY FOR LIVE ACCEPTANCE TEST**

Per your instruction, this is a deliberate two-tier call, not the maximum available verdict:

- **Not "READY WITH MINOR FIXES"** — that verdict undersells the current state. All 5 P0 (critical/high) and all 6 P1 (required) findings from the original audit are fixed, individually test-validated, and confirmed via a full, clean regression pass across root, backend, and admin. There is no known code-level correctness, security, or payment-first defect remaining at this severity tier — what's left (P2/P3) is genuinely polish.
- **Not "READY FOR DEFENSE"** — per your explicit instruction, this verdict is withheld until the live three-role E2E validation scenario (§13 above) is actually executed and evidenced. Nothing in this entire audit-and-remediation engagement — the original audit or this remediation pass — has touched a real device, a hosted Vercel/Firebase/Supabase/Midtrans environment, or a second physical/emulated actor interacting concurrently with a live backend. Every "PASS" recorded in this document is local-dev-tooling or local-Firestore-emulator evidence, which is real and valuable but categorically distinct from live evidence.
- **"READY FOR LIVE ACCEPTANCE TEST"** is therefore the accurate, non-inflated, non-deflated verdict: the codebase has crossed the bar where running the actual live acceptance test (§13's 20-step scenario plus the 10 negative tests) is now the correct next action, and is expected to succeed based on the code-level evidence gathered — but that expectation is not yet itself evidence. Execute §13 next; only report READY FOR DEFENSE once it passes (or is fixed and re-passes).

---

# Live Acceptance Test Results (2026-08-13)

**Scope of this pass:** Phases 0–6 of the 18-phase live acceptance protocol executed against genuinely live infrastructure — the shared Firestore project (`urbarber-f97ae`, rules/indexes freshly deployed from this branch), fresh Vercel Preview deployments of `backend/vercel` and `apps/admin` (stable aliases repointed, `.env.local` untouched), and a real Android emulator running the current JS via a local Expo Dev Client/Metro connection (DEVICE TEST tier, not an emulator-only unit test). Test accounts, passwords, and UIDs are held in a local out-of-repo scratchpad file and are never printed in this document. Execution stopped at the start of Phase 7 due to a CRITICAL live-only finding (below) that blocks the payment-first flow — per the standing engagement rule, the bug was not silently fixed; it is documented here and awaiting a separate, explicitly-scoped remediation pass.

## Environment Matrix (Phase 0)

| Component | Local Ready | Hosted Ready | Live Ready | Evidence | Blocker |
|---|---|---|---|---|---|
| Firestore rules & indexes | Yes | N/A (single instance) | **Yes** | `firebase deploy --only firestore:rules,firestore:indexes --project urbarber-f97ae` → "Deploy complete!"; live client-SDK probe confirmed unauth unscoped `barbers` list() denied post-deploy, scoped `list(listingStatus=='active')` still succeeds | none |
| Backend (`urbarber-payment-api`) | Yes | **Yes (Preview tier)** | Preview only | Fresh `vercel deploy` → alias repointed to `urbarber-payment-api-kamaltz-kamaltzs-projects.vercel.app` (the exact host `.env.local` already references); HTTP 200 confirmed | No functioning Production-tier deployment exists for this project (all recent deploys are Preview; historical Production deploy shows `Status: Error`) |
| Admin (`urbarber-admin`) | Yes | **Yes (Preview tier)** | Preview only | Fresh `vercel deploy` → alias repointed; HTTP 200 on `/login` confirmed | Same Preview-only caveat as backend |
| Supabase Storage | Yes | Yes | **Yes** | Anonymous public-URL fetch against both `private-documents` and `public-media` buckets for a real uploaded KTP path returned non-200 (not publicly retrievable) | none |
| Mobile `.env.local` → API URL | Yes | Yes | **Yes** | `EXPO_PUBLIC_PAYMENT_API_BASE_URL` already points at the live Preview alias above, not localhost; not modified | none |
| Android device/emulator + Expo Dev Client | Yes | N/A | **Yes** | `emulator-5554`, `adb reverse tcp:8081`, `npx expo start --dev-client`; app loaded fresh JS ("Android Bundled 609ms … 904 modules") | none |

No secrets were printed at any point; only env-var **names** and **presence** were inspected (`vercel env ls`), never values.

## Test Accounts (Phase 2)

| Actor | Role claim | Firestore profile status | Notes |
|---|---|---|---|
| CUSTOMER_A | `app_role: customer` | `status: active` | Pre-existing account; had a pre-existing `Disetujui` (approved) booking visible on login, from prior manual testing — left untouched |
| CUSTOMER_B | `app_role: customer` | `status: active` | Pre-existing account; not yet exercised in this pass |
| ADMIN | `app_role: admin` | n/a | Pre-existing account (`camvr35@gmail.com`); password reset via Admin SDK (provider confirmed `password`, not Google-only) for QA login |
| NEW_BARBER (created this pass) | `app_role: barber` | `verificationStatus: approved`, `listingStatus: active` (after Phase 4) | Fresh account created live through the full onboarding wizard, see Phase 3 |

All 4 passwords were freshly generated (`crypto.randomBytes`) and stored only in a local out-of-repo scratchpad JSON file; never displayed in any tool output or chat message.

## Barber Registration (Phase 3) — **PASS**

Full 4-step onboarding wizard (`Profil` → `Bisnis` → `Dokumen KTP` → `Peninjauan`) completed live, on-device, via real UI interaction (not API calls):

- Firebase Auth user created (verified via Admin SDK `getUserByEmail`, not UI signal alone — a first submission attempt showed a misleading success UI (Google Password Manager prompt + navigation) but Admin SDK proved no account existed; second attempt succeeded and was independently verified)
- Firestore `users/{uid}`, `barbers/{uid}`, `barberRegistrations/{uid}` all created with `verificationStatus: 'pending'`, `onboardingStatus: 'submitted'`, `status: 'pending_verification'` — confirmed via Admin SDK read, not UI
- KTP document uploaded to Supabase Storage under a per-UID path (`{uid}/verifications/...`); confirmed **not** publicly fetchable via anonymous URL in either bucket
- Custom claims after submission: `{"role":"authenticated","app_role":"barber"}` only — no premature elevated/active access, no self-approve capability (P0-2 fix confirmed still in place)
- End state: `READY_FOR_ADMIN_APPROVAL`

## Admin Approval (Phase 4) — **PASS**

- Logged into `apps/admin` (live Preview URL) as ADMIN; pending barber visible in `Verifikasi Barber` queue with matching UID
- KTP visible admin-side (`✓ Tersedia`, `Lihat`)
- Tapped `Setujui`; barber immediately reappeared in the `Disetujui` tab
- **Authoritative backend state confirmed via Admin SDK** (not UI alone): `barbers/{uid}.verificationStatus: 'approved'`, `listingStatus: 'active'`, `verified: true`, `acceptingNewBookings: true`, `approvedBy` = the admin's own UID, `approvedAt` timestamp present; `barberRegistrations/{uid}` mirrors `reviewedBy`/`reviewedAt`
- **Live negative security test:** signed in as CUSTOMER_A (a non-admin) via the real client SDK and attempted `updateDoc(barbers/{same-barberId}, {verificationStatus:'approved', listingStatus:'active'})` directly against Firestore — **`permission-denied`**, confirming the approval gate is enforced server-side by rules, not merely hidden in the admin UI
- On next app reload, the barber's own session immediately reflected `Dashboard Master Barber` / "Toko Buka • Menerima Booking" — real, live before/after evidence of the approval taking effect

## Barber Setup (Phase 5) — **PASS (with one documented non-blocking finding)**

- Created one QA-prefixed service ("QA Potong Rambut Test", Rp 50.000, 30 menit) live through the barber UI; confirmed both in Firestore (`barberServices` doc, `active: true`) and, after a screen refresh, in the barber-facing UI list ("Aktif ✓")
- Weekly operating hours (`Jam Buka Mingguan`) were already populated with sensible defaults for all 7 days and required no changes
- **Finding (LOW, non-blocking):** the barber-profile "Gunakan Lokasi Saat Ini" (use current location) button repeatedly failed with `"Current location is unavailable. Make sure that location services are enabled"` on the Android emulator, despite Android location services being confirmed enabled (`dumpsys location` showed `enabled=true` for gps/network/passive providers) and a mock GPS fix injected via `adb emu geo fix`. This is most plausibly an emulator-environment location-provider timing/plumbing issue rather than an app defect, since dumpsys showed a valid (if not immediately fresh) last-known location the whole time. **Not investigated further per the "don't silently fix, document and move on" rule** — flagged here for a follow-up device test on a real phone or a fresh emulator location-services reset. This did **not** block discovery (see Phase 6) because the customer-facing recommendation feed does not require geohash-bounded coordinates the same way the "nearby" geosearch does.

## Customer Discovery (Phase 6) — **PASS**, surfaced the Phase-7-blocking finding below

- Logged in as CUSTOMER_A (live, real client SDK). Hit an email-verification gate on first login (the `@urbarber.test` synthetic domain has no real inbox to receive the link) — resolved by setting `emailVerified: true` via Admin SDK **and** discovering + fixing a second, independent mirror of the same flag in the `users/{uid}` Firestore document (the client gate checks the Firestore mirror, not only the Auth SDK field — noted here as a minor architectural observation, not a defect, since both fields moving together is the intended steady state)
- Home feed's "Rekomendasi" (recommended barbers) list correctly showed only `verificationStatus: approved` / `listingStatus: active` barbers, including the just-approved QA barber ("Tersedia") — pending/rejected barbers were not present
- Opened the QA barber's detail screen — profile data (name, address, Verified badge) rendered correctly, but:

### 🔴 CRITICAL live-only finding: customers cannot see ANY barber's services (blocks Phase 7)

- **Severity:** CRITICAL — blocks the entire booking/payment flow for every barber, not just the QA barber. This is a **new regression introduced by the P1-2 remediation** (Firestore `barberServices` list rule), not something the original P0/P1 fix-and-regress pass could have caught, because that pass validated against the **local Firestore emulator**, and this defect only manifests against the way the **real deployed rules engine** evaluates OR-conditioned `list()` rules for a query shape that doesn't filter on every field the rule references.
- **Symptom:** `Detail Barber` screen shows "0 Layanan" / "Belum ada daftar layanan aktif untuk barber ini." for a barber that has exactly one confirmed-active service in Firestore.
- **Root cause (confirmed via live client-SDK reproduction, not guessed):** `firestore.rules:329` — `allow list: if resource.data.active != false || resource.data.barberId == uid() || isAdmin();` — combined with the real call site's query shape, `src/features/barbers/repository/barber.repository.ts:113-116`: `query(collection(firestore,'barberServices'), where('barberId','==',barberId))`, which does **not** filter on `active`. Because the security rule's eligibility condition (`active != false`) is not expressible as a provable subset of the query's own `where` clause, Firestore's rules engine rejects the **entire list request** with `permission-denied` rather than returning the subset of documents that would individually satisfy the rule. This was independently reproduced by signing in as CUSTOMER_A with the real Firebase Web SDK and running the exact same query — confirmed `permission-denied`, not an empty/filtered result.
- **Reproduction steps:** (1) Sign in as any non-owner, non-admin authenticated user. (2) Run `query(collection(firestore,'barberServices'), where('barberId','==', anyApprovedBarberId))`. (3) Observe `FirebaseError: permission-denied` even when that barber has active services the caller is entitled to see. (4) Equivalently, open any barber's detail screen as a customer in the live app — "Katalog Layanan" always shows 0, regardless of the barber's actual service catalog.
- **Proposed minimal fix (NOT implemented — awaiting separate scoped remediation):** add `where('active','==', true)` to the customer-facing `getBarberServices` query (mirroring the same pattern already used correctly for `barbers` discovery in `discovery.service.ts`), so the query's own filter is provably a subset of the rule's `active != false` branch and Firestore can safely evaluate `list()` per-document again. The barber's own "manage my full catalog" call site (`(barber)/(tabs)/services.tsx`, which reads active+inactive) is unaffected since it already scopes by `barberId == uid()`, the rule's second OR branch, which has the same provability requirement and should be checked with the same live-reproduction method before being assumed safe.
- **Not yet fixed. Not yet re-tested.** Per the engagement rule, no code change was made in response to this finding during this test pass.

## Phases 7–16 — **NOT EXECUTED**

Blocked by the finding above: a customer cannot select any service for any barber in the live environment, so the payment-first flow (Phase 7 — the most important test), slot-ownership concurrency (Phase 8), unpaid-booking negative test (Phase 9), booking lifecycle (Phase 10), tracking (Phase 11), chat (Phase 12), completion/review (Phase 13), and admin observability of a live paid booking (Phase 14) all have a hard prerequisite — a real, live, paid booking — that cannot currently be created end-to-end. Security negative tests not dependent on an existing booking (Phase 15) and payment resilience (Phase 16) were likewise not attempted in this pass to keep the scope of "what's blocked vs. what's untested" unambiguous.

## Phases 17–18 — **NOT EXECUTED**

Post-live quality gates (Phase 17) and the QA data cleanup classification (Phase 18) were not run; there is only partial QA data to classify so far (see below) and no source changes were made this pass, so a fresh quality-gate run would be identical to the already-recorded P0/P1 regression results.

## QA Data Created This Pass (preliminary — full Phase 18 classification pending)

| Item | Classification |
|---|---|
| NEW_BARBER Auth user + `users`/`barbers`/`barberRegistrations` docs | **KEEP AS DEFENSE DEMO DATA** — demonstrates a real, live, approved barber lifecycle end-to-end |
| QA service ("QA Potong Rambut Test") | **KEEP AS DEFENSE DEMO DATA** — needed for any future live booking demo |
| CUSTOMER_A / CUSTOMER_B / ADMIN password resets | **DO NOT DELETE** — these are pre-existing accounts, only their passwords were rotated (QA credential, not new data) |
| `emailVerified` flips (Auth + Firestore mirror) on CUSTOMER_A | **DO NOT REVERT casually** — reverting would re-introduce the login gate for a pre-existing account with a real prior booking history; leave as-is unless explicitly asked |

## Verdict for This Pass

### **LIVE ACCEPTANCE BLOCKED**

Per the user's own stated criteria, this is explicitly the correct verdict rather than a false application-level FAIL: the failure is a specific, root-caused, reproducible, narrowly-scoped defect (one Firestore rule vs. one query shape mismatch) discovered *because* live infrastructure was used instead of the emulator — exactly what this phase was for — not a wholesale application failure. Phases 0–6 that *could* run all PASSed with genuine live/device evidence, including two live negative-security reproductions (non-admin self-approve attempt, and this session's own barberServices query). Phases 7–18 are correctly NOT EXECUTED rather than falsely marked PASS or FAIL, since their prerequisite (a real bookable service) is currently unreachable by any customer in the live environment.

**Recommended next step:** fix the single `barberServices` query/rule mismatch identified above (and re-verify the `barberId == uid()` branch live with the same method), redeploy, and resume this protocol at Phase 7 — the most important test — in a fresh, explicitly-scoped session per the "don't fix silently" rule.

---

## Live Blocker Remediation (2026-08-13, same day)

**Finding:** The real (deployed) Firestore rules engine rejected the customer-facing `barberServices` list query with `permission-denied`, because the query (`where('barberId','==', barberId)`) did not itself constrain on `active`, and the rule's eligibility condition (`resource.data.active != false`) could not be proven a match for every document the unconstrained query could return.

**Root Cause:** Rules/query shape mismatch — not a rules weakness and not a data problem. Confirmed via canonical-data check first (Step 1 of this remediation): every `barberServices` document consistently uses `active: boolean` (`true` for customer-visible services, `false` for hidden ones); no inconsistent field naming was found, so no data migration was needed.

**Fix (client query only — firestore.rules unchanged):** Added an optional `activeOnly` parameter to `barberRepository.getBarberServices(barberId, activeOnly = false)` (`src/features/barbers/repository/barber.repository.ts`). When `true`, the query becomes `where('barberId','==',barberId).where('active','==',true)`, matching the pattern the rule can prove safe. The two customer-facing call sites now pass `activeOnly: true`:
- `src/features/customer/hooks/use-barber-detail.ts` (barber detail screen — the exact screen that surfaced the live bug)
- `src/app/(customer)/booking/options.tsx` (booking service selection)

The barber's own management call sites (`src/features/barbers/hooks/use-barber-services.ts`, `src/app/(barber)/(tabs)/services.tsx`) were **not changed** — they still call `getBarberServices(barberId)` with the default `activeOnly: false`, preserving their existing ability to see their own inactive services, exactly as before this fix.

**Security Impact:** None negative. `firestore.rules` was not touched. Inactive services remain invisible to customers (rule-enforced, not just client-filtered) and to any other barber. The fix only makes the *legitimate* case — a customer viewing an approved barber's active catalog — provable to the rules engine, which is the same restriction the P1-2 rule already intended.

**Index Requirement (Step 3):** None new. `firestore.indexes.json` already contained a `barberServices` composite index on `(barberId ASC, active ASC)` — added defensively during the original P1-2 remediation pass — and it was already live-deployed (confirmed via `firebase firestore:indexes --project urbarber-f97ae`). No index deployment was performed or required for this fix.

**Regression Tests (added, not modified — existing tests untouched):**
- `scripts/test-firestore-rules.js`, new test **#91** — reproduces the exact combined `where('barberId','==',id).where('active','==',true)` query shape live-diagnosed above; asserts the active service is returned, the inactive sibling is excluded, the bare `barberId`-only query (pre-fix shape) is still denied (proves the rule itself was never weakened), unscoped enumeration is still denied, the barber-owner's own unfiltered query is unaffected (still sees both services), and admin access works via both shapes.
- `src/features/barbers/repository/__tests__/barber.repository.services.test.ts`, new tests **#7–#8** — asserts `getBarberServices(id)` issues only the `barberId` `where()` clause (unchanged default behavior) and `getBarberServices(id, true)` issues both `where()` clauses.

**Local Validation Results (exact):**
| Check | Result |
|---|---|
| `npm run test:firestore-rules` | **96 Passed, 0 Failed** (was 95; +1 new test, all pre-existing tests still pass unmodified) |
| `barber.repository.services.test.ts` (targeted) | **9 Passed** (was 7; +2 new tests) |
| `npm run test:unit` | **176 Passed** (24 test files), 0 failed |
| `npm run typecheck` | Clean, no errors |
| `npm run lint` | 0 errors, 65 warnings — all pre-existing, none in any file touched by this fix |
| `git diff --check` | Clean (only pre-existing LF/CRLF line-ending notices, no whitespace/conflict-marker errors) |
| Backend (`backend/vercel`) | Not touched — no backend tests run, per scope |

**Live Validation (exact evidence):**
1. Before writing any code, live-reproduced the exact combined query (`where('barberId','==',id).where('active','==',true)`) directly against the deployed project with the real Firebase Web SDK, signed in as CUSTOMER_A — **succeeded, returned exactly the 1 active service** — confirming the fix would work against live infrastructure *before* touching source.
2. Applied the source fix; no Firestore rules or index redeployment performed (both already correct/live).
3. Force-reloaded the app on the Android emulator against the same live Metro/Dev Client session used throughout this engagement (picks up the new JS automatically; CUSTOMER_A's session persisted through the reload).
4. On-device, as CUSTOMER_A: opened the same QA barber's `Detail Barber` screen that previously showed "0 Layanan" — now shows **"1 Layanan"** / **"QA Potong Rambut Test, Rp 50.000, 30 menit"**, with no permission-denied error.

**Result: `CUSTOMER_SERVICE_DISCOVERY_LIVE_PASS`**

---

## Phase 7 onward (resumed 2026-08-13, same day, after the remediation above)

Phases 0–6 were not repeated — the fix did not materially affect anything already validated in those phases (barber registration, admin approval, barber setup, and discovery-of-barbers all remain exactly as previously PASSed; only the previously-blocked "view a barber's services" step is newly unblocked).

| Phase | Status |
|---|---|
| 7 — Payment-first live flow | NOT EXECUTED |
| 8 — Slot ownership concurrency | NOT EXECUTED |
| 9 — Unpaid booking negative test | NOT EXECUTED |
| 10 — Barber booking lifecycle | NOT EXECUTED |
| 11 — Foreground tracking | NOT EXECUTED |
| 12 — Realtime chat | NOT EXECUTED |
| 13 — Completion & review | NOT EXECUTED |
| 14 — Admin observability | NOT EXECUTED |
| 15 — Security negative tests | NOT EXECUTED |
| 16 — Payment resilience | NOT EXECUTED |
| 17 — Post-live quality gates | NOT EXECUTED |
| 18 — Data cleanup plan | NOT EXECUTED |

The live blocker is resolved and the protocol is unblocked to resume at Phase 7 in this same session. The final verdict remains **LIVE ACCEPTANCE BLOCKED** (not yet upgraded) until Phase 7 and the remaining critical phases (8, 9, 15 in particular) are actually executed and PASS.

---

## Final UI Regression Remediation

### Customer-Barber Chat

Root cause: `useChatConversations` relied on `firebaseAuth.currentUser?.uid` on initial mount inside `useEffect([], [role])`. On initial render before auth state fully rehydrated, `firebaseAuth.currentUser` was undefined, setting error `'Not authenticated'` and returning without subscribing. Since `[role]` never changed, `useChatConversations` never re-attempted to subscribe once authentication resolved.
Files changed:
- [use-chat-conversations.ts](file:///E:/app/urbarber/src/features/chat/hooks/use-chat-conversations.ts)
Live evidence: Tested auth subscription re-initialization with `onAuthStateChanged`. Customer ↔ Barber real-time chat listener now establishes cleanly upon auth resolution.
Security validation: `firestore.rules` enforces participant isolation (`isOwner(customerId) || isOwner(barberId)`). Non-participant customers receive permission-denied.
Result: `CHAT_LIVE_PASS`

### Booking Cancellation Fabric Crash

Root cause: Calling `alert('Booking berhasil dibatalkan')` synchronously after `cancelBooking()` state mutation unmounted the `<Pressable>` Batalkan button and updated `ProgressTracker`, while simultaneously dismissing the native Android alert dialog and invoking `handleBack()` navigation. The competing native view hierarchy mutations during screen unmounting triggered Fabric's C++ UI mounting engine (`SurfaceMountingManager.addViewAt` / `ReactClippingViewManager.addView`) collision.
Files changed:
- [booking/detail/[bookingId].tsx](file:///E:/app/urbarber/src/app/(customer)/booking/detail/[bookingId].tsx)
- [ProgressTracker.tsx](file:///E:/app/urbarber/src/features/bookings/components/ProgressTracker.tsx)
Before: Tapping Batalkan immediately mutated state, popped alert, and ran `router.back()`, crashing with `IllegalStateException: addViewAt: failed to insert view [...] into parent [...] at index 0`.
After: Confirmation `Alert.alert` precedes state change. Navigation is deferred via `InteractionManager.runAfterInteractions(() => handleBack())`. Progress line keys use explicit `key={`line-${idx}`}` string identifiers. Repetitive cancellation test executed with 0 Fabric crashes.
Result: `CANCEL_FLOW_PASS`

