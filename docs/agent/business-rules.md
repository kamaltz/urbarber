# URBarber: Durable Business Rules & Security Invariants

## Payment-First Slot Ownership (Batch 08)

**Core Principle**:
> A customer does NOT own a scheduled booking slot until payment has been **authoritatively confirmed** as `paymentStatus = 'paid'`.

**Slot Lifecycle**

1. **Slot Hold** (temporary, 15-min expiry)
   - Customer initiates checkout for a specific barber + time
   - System creates temporary lock to prevent conflicting checkouts
   - Hold is NOT a booking; barber does not see it
   - Expires if checkout abandoned or payment timeout

2. **Payment Creation**
   - Amount calculated SERVER-SIDE (client cannot override)
   - Method enforced: `'midtrans_sandbox'` (new scheduled bookings only)
   - Idempotent creation via request ID (duplicate requests return same payment)

3. **Payment Confirmation** (2-phase)
   - Midtrans webhook updates payment status
   - Client polls for confirmation
   - Verification: `paymentStatus === 'paid'` authoritatively set by backend

4. **Slot Finalization** (atomic)
   - ONLY occurs if `paymentStatus === 'paid'`
   - Hold is converted to final booking
   - Barber can now see booking as pending request
   - Customer owns the slot exclusively

**Barber Acceptance Guard**
- Precondition: `bookingStatus === 'pending' AND paymentStatus === 'paid'`
- Enforced at: Mobile UI, Firestore rules, Backend API
- Rejection: Only unpaid bookings can be rejected (no double-charge risk)

**Paid Booking Rejection/Cancellation**
- Marks `refundRequired: true` (audit trail)
- Payment remains `paymentStatus: 'paid'` (auditable state)
- No automatic refund (manual admin reconciliation required)
- Refunded payment marked `paymentStatus: 'refunded'` after manual action

**In-Progress Booking Cancellation**
- Denied (service already started)
- Operator blocks cancel UI for `status === 'in_progress'`

---

## Canonical Enumerations

### AppRole (Authentication)
- `'customer'` - End-user purchasing services
- `'barber'` - Service provider
- `'admin'` - Web-only platform administrator

### BookingStatus
- `'pending'` - Customer created, awaiting barber acceptance
- `'accepted'` - Barber accepted; awaiting service start
- `'in_progress'` - Service underway
- `'completed'` - Service finished
- `'rejected'` - Barber declined
- `'cancelled'` - Customer or barber cancelled (before in_progress)

### PaymentStatus (Canonical New Bookings: `'midtrans_sandbox'`)
- `'initiated'` - Payment request created
- `'pending'` - Awaiting customer confirmation (Midtrans Snap open)
- `'paid'` - Authoritatively confirmed as paid
- `'failed'` - Payment declined
- `'expired'` - Payment window expired
- `'cancelled'` - Customer abandoned checkout
- `'refunded'` - Full refund processed
- `'partially_refunded'` - Partial refund (adjustment scenario)

### PaymentMethod (Scheduled Bookings)
- `'midtrans_sandbox'` - New bookings ONLY
- Legacy (read-only for historical compatibility):
  - `'cash_on_service'` - Pre-Batch 08 cash bookings
  - `'not_required'` - Pre-Batch 08 free services

### UserStatus
- `'active'` - Account enabled
- `'pending_verification'` - Email/phone not yet verified
- `'suspended'` - Temporary or permanent deactivation

### BarberVerificationStatus
- `'draft'` - Documents uploaded; not yet submitted
- `'pending'` - Awaiting admin review
- `'approved'` - Admin approved; barber can accept bookings
- `'rejected'` - Admin rejected; barber must resubmit

### BarberListingStatus
- `'inactive'` - Not accepting bookings (new barber default)
- `'active'` - Accepting bookings
- `'suspended'` - Admin deactivated

---

## Chat (F-31) Scope

**Participants**: Customer ↔ assigned Barber (one-to-one)

**Triggering Event**: `paymentStatus === 'paid'` (payment finalized)

**Firestore Structure**
- Collection: `conversations/{bookingId}`
- Subcollection: `messages`
- One conversation per paid booking

**Message Content**
- Text only (no files, no images, no media)
- Metadata: sender, timestamp, read status (optional)

**Access Rules**
- Customer: read/write own conversations (customerId = auth.uid)
- Barber: read/write conversations where barberId = auth.uid
- Admin: No chat access

**Lifecycle**
- Created: After payment confirmed (`paymentStatus = 'paid'`)
- Active: While booking is pending, accepted, or in_progress
- Closed: After booking completed or cancelled

---

## Role-Based Access (Firestore Security)

**Customer**
- Read/write own `users` and `customers` documents
- Create bookings (read: available barbers, services)
- Read own bookings
- Read barber profiles (public)
- Write chat messages in own conversations
- Read chat messages in own conversations
- Read assigned barber tracking data (in_progress bookings only)

**Barber**
- Read/write own `users` and `barbers` documents
- Create/update services
- Read assigned bookings
- Update booking status (accept, reject, in_progress, complete)
- Write chat messages in assigned conversations
- Read chat messages in assigned conversations
- Write foreground tracking data (live position)

**Admin** (Vercel backend only, NOT mobile)
- Firebase Admin SDK access (unrestricted)
- Firestore read/write all collections (via backend)
- Supabase Storage document management (via backend)
- No mobile admin workspace
- Admin signing into mobile receives web-only state

---

## Security Invariants

**Client-Side Boundaries**
- Mobile/Web CANNOT set `paymentStatus = 'paid'` directly
  - Only Vercel backend (via Midtrans webhook + verification) can set paid status
  - Firestore rules block client writes to paymentStatus field

- Mobile/Web CANNOT set custom claims (`app_role`)
  - Only Vercel backend can set via Firebase Admin SDK
  - Mobile must use `getIdTokenResult()` after backend claim assignment

- Mobile CANNOT set booking status to in_progress/completed
  - Only barber mobile AND backend can do this (phone-to-cloud sync)

**Server-Side Boundaries**
- Vercel backend MUST verify Midtrans webhook signature
  - Prevents spoofed payment confirmations
  - Uses `MIDTRANS_SERVER_KEY` (server-only secret)

- Vercel backend MUST calculate booking amount server-side
  - Client-submitted amount is ignored
  - Amount derived from `service.price` + tax/fees (server rules)

- Vercel backend MUST use Firebase Admin SDK
  - No client SDK secrets in backend code
  - Service account credentials in environment only (NOT in code)

**Data Integrity**
- No fake payment mock fallbacks in production execution paths
  - Mock Midtrans used ONLY for local testing
  - Production path requires real Midtrans Sandbox callback

- No automatic refund simulation
  - Refunds marked as `refundRequired: true` only
  - Manual admin action required for actual refund processing

- Immutable fields (Firestore)
  - `createdAt`, `uid`, `role`, `status` cannot be modified post-creation
  - Enforced in Firestore rules

---

## Git & Deployment

**No Auto-Commit/Push**
- Agent must never automatically commit changes
- User approval required for each commit

**No Destructive Git Operations**
- Force push prohibited (unless explicit user request)
- Resets/rebases require user confirmation

**Deployment Gates**
- No production Firebase/Supabase writes without explicit user approval
- Vercel deployment requires user confirmation
- Midtrans Dashboard changes require explicit approval
- Environment variables never committed (use .env.local, .gitignore)

---

## Historical Compatibility (Read-Only)

**Legacy Payment Methods** (pre-Batch 08)
- `'cash_on_service'` - Bookings paid in cash at service time
- `'not_required'` - Free services (no payment)

**Handling**:
- Mobile/backend must read these values from historical bookings
- NEW scheduled bookings MUST use `'midtrans_sandbox'`
- Firestore rules allow read-only access to legacy values
- No new bookings created with legacy methods

**Legacy Booking Statuses** (pre-consolidation)
- Database may contain: 'booked', 'waiting', 'approved', 'declined', 'on_process', 'finished', 'canceled'
- Runtime mapper: `mapLegacyBookingStatus()` translates to canonical values
- Canonical values always used in new writes

---

## Feature Scope (Explicit Boundaries)

**NOT Implemented** (Batch 09 scope)
- Automated refund processing (manual only)
- Production Stripe/Midtrans live environment
- AI recommendations or search ranking
- Advanced GPS tracking (Batch 10)
- Video chat or media chat (text only)
- Push notifications
- SMS notifications

**Implemented**
- Foreground GPS tracking (barber position to customer, live view)
- Real-time text chat (Firestore listeners)
- MapLibre map picker with OpenFreeMap tiles
- Payment-first slot ownership (Midtrans Sandbox only)
- Multi-role access control (customer, barber, admin-web)
