# URBarber Thesis v1.1 — Final Readiness Audit

**Status**: Fresh audit, written from source-code inspection on 2026-08-17.
**Supersedes**: An earlier version of this file was referenced by `CLAUDE.md` and `docs/agent/current-status.md` but did not actually exist in this checkout (not tracked in git, not present on disk) as of branch `feat/thesis-v1.1-final-stabilization` @ `15bf2925be1c32b38a339b339bbfc37d8fb19aee`. CLAUDE.md's narrative of "12 conventional commits" and full P0 remediation could not be verified against it. This document replaces that narrative with directly-verified findings. Where CLAUDE.md/docs claims were checked and confirmed, that's noted; where they couldn't be verified or were found wrong, that's noted too.

## 0. Safety Verification

- v1.1 branch: `feat/thesis-v1.1-final-stabilization`, HEAD `15bf2925be1c32b38a339b339bbfc37d8fb19aee`, working tree clean.
- Local safety branch created: `backup/thesis-v1.1-before-final-expansion` → `15bf292`.
- Thesis v1 baseline (`E:\app\urbarber`, branch `release/v1.0.0-thesis-demo`) confirmed untouched at `85ded122a5f499a9d1ec30ecc01afe71a6dedaa4`, matching the expected baseline exactly. Clean working tree.
- Sibling worktrees present: `E:/app/urbarber-codex` (`feat/batch-10c-tracking-hardening` @ `af0bae9`), `E:/app/urbarber-ui` (`feat/batch-11b-stable-ui-slicing` @ `d74dca8`). **Not re-investigated in this audit** — CLAUDE.md's claim that these are "stale/superseded, not merge candidates" is unverified here; treat as an open question, not a confirmed fact, if reconciliation becomes relevant.
- Real v1.1 commit history since baseline (7 commits, not 12 as CLAUDE.md claimed):
  ```
  f561df2 feat(geo): add canonical barber location and nearby discovery
  cde74e0 feat(tracking): harden home-service realtime location tracking
  0f8b2fe feat(payments): add home-service fee and optional barber tip
  eade63c fix(admin): verify barber suspend reactivate and delete flows
  96a779d docs: add final black-box testing matrix
  350ba53 fix(admin): provide fallback web config and set ignoreDuringBuilds for Next.js 15 build
  15bf292 feat(admin): make dashboard functional with live platform metrics
  ```

## 1. Executive Verdict

**NOT READY.** Substantial real progress exists (geo discovery, tracking, admin barber/user/category/booking pages, CORS), but core mission features from the spec — **Application Fee, configurable Home Service Fee, and Voucher system — do not exist at all**, the pricing formula is duplicated and drifting across 4 locations, and the quality gate (`npm run check`) currently fails. One committed change (`350ba53`) introduced a real security/correctness regression in Admin's Firebase config that must be reverted/fixed before anything else.

## 2. P0 — Must fix before new feature work

1. **Admin Firebase config silently falls back to placeholder values in production.**
   `apps/admin/lib/firebase.ts:5-8` — commit `350ba53` removed a loud-fail guard (`throw` on missing `NEXT_PUBLIC_FIREBASE_*`) and replaced it with `process.env.X || 'demo-api-key'` / `|| 'urbarber-demo.firebaseapp.com'` / `|| 'urbarber-demo'`, active in **every** environment including production. If Vercel env vars are ever unset or misnamed, the admin app boots cleanly against a nonexistent Firebase project instead of failing the build — auth appears to work in the UI but fails opaquely at sign-in. Directly violates Phase 2 of the spec ("must fail clearly if required production values are missing"). **Needs revert to loud-fail behavior.**

2. **`npm run check` fails.** Exit code 2. `typecheck` alone produces 91 `TS` errors before `lint` even runs (short-circuited by `&&`). Dominant pattern is `TS7016` "Could not find a declaration file for module 'firebase/auth'/'firebase/firestore'/'firebase/app'" repeated across many files — looks like a `moduleResolution`/tsconfig issue rather than 91 distinct bugs, but needs root-causing. A handful of real errors mixed in: `src/app/(barber)/(tabs)/profile.tsx:343` `MarkerProps` mismatch, unresolved `@expo/ui/jetpack-compose` module in `src/components/ui/card.tsx:1`. This blocks every downstream quality gate in the spec.

3. **`next.config.ts` disables ESLint as a build gate entirely.** `apps/admin/next.config.ts:5-7` (also from `350ba53`) — changed from an explicit lint-scanned-dirs list to `eslint: { ignoreDuringBuilds: true }`. Not scoped to a known-noisy rule; silently passes any lint violation through the production build.

4. **No canonical pricing calculator; formula duplicated in 4 places and already drifting.**
   - `backend/vercel/api/payments.ts:186-190` (server, authoritative today)
   - `backend/vercel/tests/payment-calculation.test.ts:6-20` (hand-copied "mirror", not imported from source)
   - `src/constants/payment.ts:6` (`HOME_SERVICE_FEE_IDR = 10000`)
   - `src/app/(customer)/booking/invoice.tsx:370` (hardcodes `10000` again — **doesn't even use its own imported constant**)

   Current formula (`payments.ts:186-190`): `baseAmount = round(price)`, `homeServiceFee = bookingType==='home' ? 10000 : 0` (flat, not configurable, not distance-based), `tipAmount = max(0, floor(rawTip))`, `totalAmount = baseAmount + homeServiceFee + tipAmount`. No client-trust vulnerability found — server always recomputes from Firestore `serviceData.price`, and the webhook compares Midtrans `gross_amount` against the stored value rather than trusting it blindly. But there is no upper bound on `tipAmount`.

5. **Application Fee is completely absent.** Zero matches for `applicationFee`/`platformFee`/`admin_fee` across the entire repo (backend, mobile, admin). No settings/config collection of any kind backs any fee.

6. **Voucher system is dead scaffolding, not a feature.** `CouponCode` type (`src/features/bookings/types/booking.ts:105-110`) and `validateCoupon()` (`booking.repository.ts:333-356`, reads `coupons/{code}` **directly from the client**) exist, but `validateCoupon()` is called from **nowhere** in the app. No backend endpoint, no field in `createPaymentSchema`, no admin UI, 0% of a redemption flow.

## 3. P1 — Real bugs, scoped fixes

1. **Barber navigation icons are functionally invisible on Android/web.** Root cause identified precisely: `src/components/ui/SymbolIcon.tsx:10-12` passes a plain string `name` into `expo-symbols`. The library's cross-platform component only accepts an object (`{ios,android,web}`); a string fails its `typeof` check, `name` becomes `null`, and it renders `props.fallback` — which is never passed. 9 barber-side files use this pattern (both `(tabs)/_layout.tsx:25-53` and the hand-built `BarberBottomNavigation.tsx:5-46` used only on the dashboard `home.tsx:364`). Customer nav is unaffected — it uses plain Unicode glyphs, not `SymbolIcon`. Only `ios`/`macos` native folders exist for `expo-symbols`, so this may partially work on iOS but not Android — the primary target platform for this thesis' APK build.

2. **Barber booking-detail amount is inconsistent with dashboard revenue (fee-mixing display bug).** `booking/[bookingId].tsx:282` shows `booking.totalAmount || booking.totalPrice || 0`. `getBookingDetail` (`barber.repository.ts:361-365`) spreads raw Firestore data without mapping `totalAmount`, so it's always `undefined`, silently falling to `totalPrice` — the **gross** customer payment including `homeServiceFee` + tip. Meanwhile the dashboard/analysis screens correctly sum only `data.price` (net service value, `barber.repository.ts:328`). Same booking shows two different, inconsistent amounts depending on which screen you're on. Directly relevant to Phase 27's requirement to distinguish `Nilai Layanan` from gross payment.

3. **Barber profile has three-way field duplication with real name drift, not just redundancy.**
   - `barbers/{uid}` (canonical, read by Customer Detail)
   - `barberRegistrations/{uid}` (onboarding draft) — `barber-registration.service.ts:92-109` writes `address`, `description`, `phoneNumber`
   - `users/{uid}` (role/status/phone/photo) + Firebase Auth `displayName`/`photoURL` (UI fallback)

   But the barber's own Profile tab (`profile.tsx:43-47,192-198`) and the `BarberProfile` type read/write `shopAddress`, `shopDescription`, `phone` — **different field names than onboarding wrote**. Result: everything a barber enters during onboarding (address, description, phone) never appears on their own Profile tab. This is precisely the canonical-profile problem Phase 22 describes, now pinned to exact field names.

4. **Barber can't see their own newly-uploaded profile photo.** Upload handler (`profile.tsx:130-132`) writes `shopImageUrl`; the same screen's read path (`profile.tsx:47,70`) only reads `data.profileImageUrl`. Customer-facing `customerRepository.getPublicBarbers` (`customer.repository.ts:112`) defensively ORs both fields, so **customers do see the new photo, but the barber's own screen shows no avatar** after upload. Storage layer itself (Supabase `public-media`, MIME + 5MB validation, uid-prefixed path) is solid — this is purely a field-name mismatch.

5. **Nearby-discovery geohash fallback doesn't rescue mixed datasets.** `discovery.service.ts:120-153` — the "drop geohash filter" fallback only runs `if (docsMap.size === 0)`. In a dataset with *some* barbers carrying `geohash` and some legacy ones without it, the fallback never fires (since the geohash-having barbers do match), so legacy barbers stay permanently invisible in nearby search. No backfill/migration script exists anywhere in `scripts/` to populate `geohash` on pre-existing docs. Everything else in geo (atomic location+geohash writes, coordinate validation, fail-closed eligibility filtering matching Firestore rules) is solid and tested — this is the one real residual gap, not a wholesale rewrite.

6. **Admin audit log only covers barber suspend/reactivate/delete.** `adminAuditLogs` mechanism (`backend/vercel/src/admin/barber-account-management.ts:42-68`) exists and works, but barber approve/reject, user suspend/reactivate, and category CRUD produce no audit trail. Spec (Phase 28) expects broader coverage (and will need `VOUCHER_*`/`PRICING_SETTINGS_UPDATED` events once those features exist).

## 4. What's already solid (verified in source, not just commit messages)

- **CORS**: exact-origin allowlist (no wildcard, no `*.vercel.app` pattern), headers present on 2xx/4xx/5xx/OPTIONS alike, 5 backend functions total. Matches Phase 29 requirements already.
- **Admin security posture**: zero direct client-side Firestore writes anywhere in `apps/admin` — every mutation goes through `AdminApiClient` → `requireAdmin`-gated backend routes.
- **Admin pages**: Dashboard (live KPIs), Barber Management (list/detail/approve/reject/suspend/reactivate/delete, audited), User Management (list/filter/suspend/reactivate), Booking Management (read-only monitoring with filters), Category Management (CRUD) are all genuinely functional against real backend endpoints.
- **Geo discovery**: atomic `location`+`geohash` writes (`barber.repository.ts:768-820`), coordinate validation rejecting NaN/0,0/out-of-range client- and rules-side (`firestore.rules:170-180,263-278`), fail-closed eligibility filter (`listingStatus==='active' && verified===true && verificationStatus==='approved'`) matching Firestore rules exactly, correct marker field-mapping end to end.
- **Tracking**: separate `bookingTracking/{bookingId}` doc (never overwrites permanent shop location), bad-GPS filtering (rejects 0,0 and >100m accuracy), full status-transition guard matrix, tight Firestore rules scoped to booking participants only (admin explicitly excluded by design), per-call watcher cleanup, and a recovery effect that force-stops tracking if the app was killed mid-booking. Broad test coverage (`discovery.service.test.ts`, `tracking-lifecycle.test.ts`, `scripts/test-firestore-rules.js`).
- **Vercel project linkage** (local `.vercel/project.json`, gitignored, not yet deployed): backend → `urbarber-payment-api-v11-rc`, admin → `urbarber-admin-v11-rc` — both correctly separate from the v1 projects, matching the target names in the spec.
- No `ISI_VALUE` placeholders anywhere; the one `demo-api-key` hit is the regression in finding P0-1 above; all `localhost`/`127.0.0.1` occurrences are inert env-fallback patterns, not hardcoded prod targets.

## 5. Entirely missing (greenfield work against the spec)

- Application Fee engine (settings doc, calculation, snapshot into bookings/payments, admin UI)
- Home Service Fee: admin configurability + distance mode (a working Haversine util already exists client-side at `src/features/location/utils/geo.utils.ts:26-51` and is reusable/portable to the backend)
- Voucher system: admin CRUD, checkout integration, idempotent redemption tracking (current code is unwired scaffolding only)
- Pricing Settings admin page ("Pengaturan Biaya") — doesn't exist
- Voucher Management admin page — doesn't exist
- Transaction Management fee-breakdown fields (`applicationFee`/`homeServiceFee`/`voucherDiscount`/`tipAmount`) — `AdminTransaction` type has none of them
- Barber Gallery — zero references anywhere in the codebase; fully greenfield
- Canonical barber profile consolidation (fixing the field-name drift in finding P1-3/4, not a rewrite)
- Geohash backfill/migration script for legacy barber docs
- `preview-v11` EAS build profile (current profiles: `development`, `preview`, `production`)
- `EXPO_PUBLIC_PAYMENT_API_BASE_URL` undocumented in root `.env.example` despite being consumed by 6+ mobile source files (minor doc gap)

## 6. Test inventory (current)

| Area | Test files | Notes |
|---|---|---|
| Pricing/payment | 7 | Backend calc/reconciliation/webhook tests; no test asserts `sum(item_details) === gross_amount` |
| Voucher | 0 | Feature doesn't exist |
| Geo | 2 | Coordinate validation, geohash, discovery eligibility (15 cases) |
| Tracking | 3 + rules suite | Status-transition matrix, stale detection, Firestore rules (`scripts/test-firestore-rules.js`) |
| Admin (backend) | 6 | Barber list, booking DTO, dashboard, document signed-url, registration privacy, transactions list |
| Admin (`apps/admin`) | 0 | No test files under `apps/admin` itself |
| Profile/gallery | 0 | No coverage; gallery feature absent |

`docs/testing/BLACK-BOX-TESTING-FINAL.md` covers 4 areas (geo, tracking, home-fee/tip payment, admin barber management) with rows marked `PASS (Automated)` or `PASS (Manual Ready)` — the "Manual Ready" rows are explicitly flagged as not yet manually executed, so this is a curated status matrix, not a fully-executed manual QA log.

## 7. Immediate priority order for remaining work

1. Fix P0-1/P0-3 (admin Firebase fallback regression, lint gate) — small, high-risk-if-left.
2. Root-cause and fix P0-2 (typecheck failures) so quality gates are usable again.
3. Build the canonical server-side pricing calculator (consolidates P0-4), then layer Application Fee (P0-5) and Home Service distance mode on top of it.
4. Build the Voucher system properly (replaces P0-6 scaffolding) and wire into checkout.
5. Build Pricing Settings + Voucher Management admin pages, extend Transaction Management fields, broaden audit logging (P1-6).
6. Fix the three barber-side bugs (P1-1 nav icons, P1-2 fee-mixing display, P1-3/4 profile field drift) — all precisely scoped, not rewrites.
7. Build Barber Gallery (greenfield).
8. Write geohash backfill script (dry-run only) (P1-5).
9. Re-run full quality gates; only then consider deployment config (`preview-v11` EAS profile, actual Vercel/EAS deploys) per the spec's hard deployment gate.
