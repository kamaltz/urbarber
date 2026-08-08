# URBarber: Current Architecture (Batch 09 Baseline)

## Technology Stack

**Mobile (Expo Router)**
- Framework: Expo Router v57.0.11 with TypeScript strict mode
- Styling: NativeWind v4.2.6 (Tailwind CSS v3)
- State: React Hooks, Firestore real-time listeners (onSnapshot)
- Maps: MapLibre React Native v11.3.6 + OpenFreeMap tiles
- Location: expo-location v57.0.1 (foreground tracking via watchPositionAsync)
- Image: expo-image-picker v57.0.8 → Supabase Storage
- Auth: Firebase Authentication (no Supabase Auth sessions)

**Admin Web (Next.js)**
- Framework: Next.js 15 with TypeScript
- Location: `apps/admin/`
- Port: localhost:3001 (dev)
- Auth: Firebase ID token validation (Vercel backend)

**Backend (Vercel Serverless)**
- Runtime: Node.js 22+
- Functions: 5 consolidated Vercel functions (NOT file-per-endpoint)
  - `/api/health` - health check
  - `/api/app` - auth, barber ops, booking ops
  - `/api/admin` - admin operations (Phase 1-3 complete)
  - `/api/payments` - Midtrans payment flow
  - `/api/webhook` - Midtrans webhook callback
- Auth Middleware: Firebase Admin SDK ID token validation
- DB Access: Firebase Admin SDK (server-side only)

**Data Layer**
- **Firestore**: Primary business data (users, customers, barbers, bookings, chat, payments, tracking)
- **Supabase Storage**: File storage only (avatars, barber photos, verification documents)
  - RLS policies enforced
  - Access via Firebase ID token (`accessToken` callback in `src/lib/supabase.ts`)
  - No Supabase Auth sessions created
- **Midtrans Sandbox**: Payment processing (server-side via Vercel backend)

## Separation of Concerns

**Architecture Layer Boundary**

```
Screen/Component
  ↓
Custom Feature Hook (e.g., useBooking, useChat)
  ↓
Service/Repository (e.g., bookingRepository, chatRepository)
  ↓
Backend API or Firebase SDK
```

**Key Principle**: Screens never directly call Firebase or Supabase. All data access flows through repository/service modules.

**Repository Locations**
- `src/features/*/repository/` - Client-side data repositories
- `src/features/*/services/` - Business logic services
- `backend/vercel/src/*/` - Server-side admin/auth services

## Authentication & Authorization

**Mobile (Customer / Barber)**
- Firebase Auth custom claims: `app_role = 'customer' | 'barber'`
- ID token refreshed automatically
- Claims verified in Firestore security rules

**Admin Web**
- Firebase Auth custom claims: `app_role = 'admin'`
- Admin-only routes protected by Vercel backend (`requireAdmin` middleware)
- No admin mobile workspace (admin web-only)

## Real-Time Features

**Chat (F-31)**
- Firestore collection: `conversations/{bookingId}`
- Subcollection: `messages`
- Listeners: `onSnapshot` (mobile) + backend message deduplication
- Scope: Customer ↔ assigned Barber only
- Text only (no files)
- Rules: Customer/Barber can read/write own conversations only

**Foreground Tracking (F-32)**
- Barber foreground tracking: `expo-location` watchPositionAsync
- Customer real-time view: Firestore listeners on `bookingTracking` subcollection
- Lifecycle: Start (barber arrives) → Stop (service complete)
- Rules: Customer sees only assigned barber position for active bookings

**Location Discovery (F-04..F-09)**
- Geohash-based radius queries (geofire-common)
- OpenFreeMap tiles (no backend map service)
- Text address fallback (manual entry if map unavailable)

## Payment Architecture (Batch 08: Payment-First)

**Core Principle**: Customer owns a booking slot ONLY after `paymentStatus = 'paid'` confirmed authoritatively.

**Canonical Payment Values**
- Method (new scheduled bookings): `'midtrans_sandbox'`
- Statuses: `'initiated' | 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded' | 'partially_refunded'`
- Legacy read-only: `'cash_on_service'`, `'not_required'` (compatibility only)

**Booking Slot Ownership**
1. **Slot Hold** (temporary, expires in 15 min): Customer initiates checkout
2. **Temporary Lock**: Prevents conflicting checkouts; NOT a final booking
3. **Payment Creation**: Server calculates amount (client cannot override)
4. **Payment Confirmation**: Midtrans webhook + polling (2-phase confirmation)
5. **Finalization** (atomic): Lock → Booking conversion ONLY if `paymentStatus = 'paid'`

**Barber Acceptance**
- Requires: `bookingStatus = 'pending' AND paymentStatus = 'paid'`
- Enforced: Mobile UI + Firestore rules + backend API validation

**Paid Booking Rejection/Cancellation**
- Marks: `refundRequired = true` (audit trail)
- No automatic refund (manual admin reconciliation required)
- Payment remains auditable in `paymentStatus = 'paid'` state

## Firestore Rules & Indexes

**Security Model**
- Role-based access: `isCustomer()`, `isBarber()`, `isAdmin()`
- Document ownership: Users read/write own documents
- Immutable fields: `uid`, `role`, `status`, `createdAt`
- Batch operations: Guarded by `runTransaction`

**Composite Indexes** (9 active)
- Bookings: (customerId, status, createdAt), (barberId, status, createdAt), (customerId, paymentStatus, createdAt)
- Barber services: (barberId, active)
- Barbers: (status, verified, ratingAverage), (verificationStatus, status, geohash)
- Reviews: (barberId, createdAt)
- Conversations: (customerId, updatedAt), (barberId, updatedAt)

## Admin Operations (Batch 04 Complete)

**Admin Web Dashboard** (Phase 1-3)

*Phase 1: Barber Registration Management*
- Barber registration list with filters
- Document preview (Supabase Storage URLs)
- Approve/reject with reason tracking
- Status transition logging

*Phase 2: Category & Barber Management*
- Service category CRUD
- Barber listing with status filters
- Barber suspension/activation

*Phase 3: Booking & Transaction Monitoring*
- Global booking monitoring (status, date range, payment method/status filters)
- Booking details & payment transaction history
- Transaction monitoring (cash + Midtrans combined view)
- Pagination via cursor-based navigation

**Admin Backend Routes** (Vercel `/api/admin`)
- POST/GET barber registrations with document URLs
- POST approve/reject barber
- GET/POST categories
- GET barbers, users with status management
- GET bookings, transactions with filtering

## Environment Variables

**Public (Mobile)**
- `EXPO_PUBLIC_FIREBASE_*` - Firebase config
- `EXPO_PUBLIC_SUPABASE_*` - Supabase config & public key
- `EXPO_PUBLIC_API_BASE_URL` - Vercel backend root

**Private (Vercel Backend Only)**
- `MIDTRANS_SERVER_KEY` - Midtrans server key
- `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` - Firebase Admin SDK
- `ALLOWED_ORIGINS` - CORS whitelist
- `APP_DEEP_LINK_SCHEME`, `PAYMENT_RETURN_BASE_URL` - Payment flow routing
