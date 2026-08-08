# URBarber Agent Directives (Batch 09)

**CRITICAL**: Always read actual source code; it overrides stale historical docs.

## Architecture & Technology Stack

- **Mobile**: Expo Router v57 with TypeScript, NativeWind (Tailwind v3)
- **Admin Web**: Next.js 15 (web-only; no mobile admin workspace)
- **Backend**: 5 consolidated Vercel Serverless functions (NOT file-per-endpoint)
- **Authentication**: Firebase Authentication with custom claims (`app_role = 'customer' | 'barber' | 'admin'`)
- **Database**: Cloud Firestore (business data) + Supabase Storage (files only)
- **Payments**: Midtrans Sandbox (production Stripe out of scope)
- **Maps**: MapLibre React Native + OpenFreeMap tiles
- **Location**: expo-location for foreground GPS tracking
- **Real-Time**: Firestore `onSnapshot` for chat and tracking

## Canonical Roles

- **customer** - End-user purchasing services
- **barber** - Service provider (direct registration + verification)
- **admin** - Platform admin (web-only; no mobile workspace)

## Canonical Booking Status

- `pending` - Customer created, awaiting barber acceptance
- `accepted` - Barber accepted; awaiting service start
- `rejected` - Barber declined
- `in_progress` - Service underway
- `completed` - Service finished
- `cancelled` - Cancelled before in_progress

## Payment-First Slot Ownership (Batch 08)

**Core Invariant**: Customer owns a booking slot ONLY after `paymentStatus = 'paid'` confirmed authoritatively.

### Canonical Values
- **PaymentMethod** (new): `'midtrans_sandbox'`
- **PaymentStatus**: `'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded' | 'partially_refunded'`
- Legacy (read-only): `'cash_on_service'`, `'not_required'` (pre-Batch 08 compatibility)

### Booking Slot Lifecycle
1. **Slot Hold** (15-min expiry) - Temporary lock during checkout
2. **Payment Creation** - Amount calculated server-side (client cannot override)
3. **Payment Confirmation** - Webhook + polling verifies `paymentStatus = 'paid'`
4. **Finalization** (atomic) - Hold → Booking conversion ONLY if paid
5. **Barber Acceptance** - Requires: `bookingStatus = 'pending' AND paymentStatus = 'paid'`

### Paid Booking Rejection
- Marks `refundRequired: true` (audit trail)
- No automatic refund (manual admin reconciliation)
- Payment remains auditable in `paymentStatus = 'paid'` state

## Separation of Concerns

**Architecture Layer**:
```
Screen/Component
  ↓
Custom Feature Hook
  ↓
Service / Repository
  ↓
Firebase SDK or Vercel API
```

**Key Principle**: Screens NEVER call Firebase or Supabase directly. All data access flows through `src/features/*/repository/` or `src/features/*/services/`.

## Real-Time Features

**Chat (F-31)**
- Firestore listeners via `onSnapshot`
- Scope: Customer ↔ assigned Barber only
- Text only (no files/media)
- One conversation per paid booking
- Message deduplication via backend endpoint

**Foreground Tracking (F-32)**
- Barber: `expo-location` watchPositionAsync (foreground)
- Customer: Real-time Firestore listener on `bookingTracking` subcollection
- Lifecycle: arrive → start → stop
- Security: Customer sees only assigned barber position for active bookings

## Security Invariants

- **Client-Side**: Cannot set `paymentStatus = 'paid'`, custom claims, or immutable fields
- **Server-Side**: Vercel backend MUST validate Midtrans webhook signature; calculates booking amount
- **No Fake Paths**: No payment mock fallbacks in production; no automatic refund simulation
- **No Secrets in Mobile**: Firebase private keys, Midtrans server key (backend only)
- **Firestore Rules**: Enforce role-based access, document ownership, immutable fields

## Environment Variables

**Public (Mobile)**
- `EXPO_PUBLIC_FIREBASE_*` - Firebase config
- `EXPO_PUBLIC_SUPABASE_*` - Supabase public config
- `EXPO_PUBLIC_API_BASE_URL` - Vercel backend root

**Private (Vercel Backend Only)**
- `MIDTRANS_SERVER_KEY` - Midtrans server key
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Firebase Admin SDK
- `ALLOWED_ORIGINS`, `APP_DEEP_LINK_SCHEME`, `PAYMENT_RETURN_BASE_URL`

## Quality & Integrity Standards

- **Production Path Integrity**: No fake OTP logic, no social login bypasses, no random payment results, no mock fallbacks
- **Scope Boundaries**: Midtrans, MapLibre, foreground tracking, and chat ARE implemented and approved
- **Automatic Operations**: Do NOT commit, push, merge, or deploy automatically
- **Testing**: Mock tests differ from integration tests; classify accordingly
- **Validation Commands**:
  - `npm run check` (typecheck + lint)
  - `npm --prefix backend/vercel run typecheck`
  - `git diff --check` (whitespace/conflicts)

## Legacy Compatibility (Read-Only)

Historical bookings may contain:
- **BookingStatus**: 'booked', 'waiting', 'approved', 'declined', 'on_process', 'finished', 'canceled'
- **PaymentMethod**: 'cash_on_service', 'not_required'

Use `mapLegacyBookingStatus()` mapper; new bookings MUST use canonical values.

## Reference Documentation

Read these BEFORE implementing:
- `docs/agent/current-architecture.md` - Current technology stack & component boundaries
- `docs/agent/current-status.md` - Feature & test status matrix
- `docs/agent/business-rules.md` - Durable invariants & security rules
- `docs/agent/batches/batch-09.md` - Batch phases & success criteria
- CLAUDE.md - This agent's context setup
