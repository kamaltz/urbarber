# URBarber Feature Acceptance Checklist & Implementation Audit

## 1. Complete 54-Screen Audit Matrix

This matrix tracks all 54 screens documented in `docs/figma/screen-index.md` against their current implementation status in `src/app`, scope classification, and validation evidence.

### Allowed Status Labels
- `Implemented`: Screen route exists and fully wired to backend/data hooks.
- `Partial`: Screen route exists but uses static/in-memory data or has partial UI/hook wiring.
- `Not Started`: Screen route or component does not exist in source code yet.
- `Out of Scope`: Excluded from project thesis scope.
- `Blocked`: Implementation depends on unfulfilled prerequisites (e.g. development build).
- `Needs Live Validation`: Implementation complete, pending live multi-role execution test.

### Scope Classifications
- `Core`: Mandatory Core Thesis MVP requirement (F-01 to F-31).
- `Preferred Enhancement`: Preferred Core Enhancement (E-01 Interactive Location Picker).
- `Additional Feature`: Additional Demonstration Feature (A-01 Midtrans Snap Sandbox).
- `Out of Scope`: Explicitly excluded from project scope.

---

### Audit Matrix (Screens 1 to 54)

| # | Actor | Screen Name | Node ID | Proposed Route / Target Component | Scope Classification | Current Status | Validation Evidence | Notes / Blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Admin | CHAT - ROOM CHAT | 8064:4386 | `src/app/(admin)/chat/[conversationId].tsx` | Out of Scope | Out of Scope | route audit | Admin support chat excluded from thesis scope |
| 2 | Admin | CHAT - LIST | 8064:4154 | `src/app/(admin)/chat/index.tsx` | Out of Scope | Out of Scope | route audit | Admin chat list excluded from thesis scope |
| 3 | User | AUTHENTICATION | 8062:7562 | `src/app/(auth)/authentication.tsx` | Core | Implemented | route audit | Integrated via login/signup selector shell |
| 4 | User | FORGOT PASSWORD | 8062:7553 | `src/app/(auth)/forgot-password.tsx` | Core | Implemented | route audit | Firebase password reset wired |
| 5 | User | LOGIN | 8062:7161 | `src/app/(auth)/login.tsx` | Core | Implemented | route audit | Firebase Auth email/password login |
| 6 | Customer | REGIST | 8062:7596 | `src/app/(auth)/register-customer.tsx` | Core | Implemented | route audit | Customer signup form with validation |
| 7 | Barber | Progress analysis - BARBER | 8115:7655 | `src/app/(barber)/analysis.tsx` | Core | Implemented | route audit | Barber analytics & revenue metrics screen |
| 8 | Barber | TRANSACTION DETAIL | 8240:19130 | `src/app/(barber)/booking/[bookingId].tsx` | Core | Implemented | route audit | Barber booking detail & status actions |
| 9 | Barber | BOOKING LIST | 8115:7314 | `src/app/(barber)/(tabs)/bookings.tsx` | Core | Implemented | route audit | Barber booking request list by status |
| 10 | Barber | CHAT - ROOM CHAT | 8064:4386 | `src/app/(barber)/chat/[conversationId].tsx` | Core | Not Started | route audit | Shared chat room to be wired in Batch 05 |
| 11 | Barber | CHAT - LIST | 8064:4154 | `src/app/(barber)/chat/index.tsx` | Core | Not Started | route audit | Shared chat list to be wired in Batch 05 |
| 12 | Barber | RATING REVIEW - BARBER | 8107:5960 | `src/app/(barber)/reviews.tsx` | Core | Implemented | route audit | Barber reviews listing screen |
| 13 | Barber | SCHEDULE MANAGEMENT | 8096:4939 | `src/app/(barber)/(tabs)/schedule.tsx` | Core | Implemented | route audit | Weekly schedule & unavailable dates editor |
| 14 | Barber | [POP UP] ADD SERVICES | 8120:8662 | `src/features/services/components/ServiceFormModal.tsx` | Core | Implemented | route audit | Service creation & editing modal |
| 15 | Barber | BARBER - SERVICES | 8116:8322 | `src/app/(barber)/(tabs)/services.tsx` | Core | Implemented | route audit | Barber service catalog management |
| 16 | Barber | PROFILE BARBER - SUBMISSION | 8187:4758 | `src/app/(barber-onboarding)/documents.tsx` | Core | Implemented | route audit | Identity document upload step (Batch 03) |
| 17 | Barber | PROFILE BARBER - LOADING | 8120:8865 | `src/app/(barber-onboarding)/status.tsx` | Core | Implemented | route audit | Verification pending status state |
| 18 | Barber | PROFILE BARBER - SUBMISSION | 8116:8153 | `src/app/(barber-onboarding)/review.tsx` | Core | Implemented | route audit | Verification submission wizard |
| 19 | Barber | Terms & Conditions - Barber | 8208:3251 | `src/app/(barber-onboarding)/profile.tsx` | Core | Implemented | route audit | Barber terms acceptance & profile step |
| 20 | Customer | DETAIL BARBER | 8067:5235 | `src/app/(customer)/barber/[barberId].tsx` | Core | Implemented | route audit | Live Firestore barber profile fetch |
| 21 | Customer | BOOKING - ACTIVE [PENDING] | 8063:5888 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Core | Implemented | route audit | Pending booking detail status state |
| 22 | Customer | BOOKING OTH - ACTIVE [COMPLETED] OTH | 8242:20768 | `src/app/(customer)/booking/history/[bookingId].tsx` | Core | Implemented | route audit | Completed booking history detail screen |
| 23 | Customer | BOOKING OTH - ACTIVE [IN_PROGRESS] OTH | 8243:21852 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Core | Implemented | route audit | In-progress service status state |
| 24 | Customer | BOOKING OTH - ACTIVE [ACCEPTED] OTH | 8180:2729 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Core | Implemented | route audit | Accepted booking status state |
| 25 | Customer | BOOKING - FIX LOCATION OTH | 8238:5491 | `src/app/(customer)/booking/location.tsx` | Preferred Enhancement | Blocked | development build pending | Interactive map picker (E-01) requires dev build; text fallback active |
| 26 | Customer | INVOICE OTS | 8063:4206 | `src/app/(customer)/booking/invoice.tsx` | Additional Feature | Implemented | unit test | Booking summary & Midtrans Snap payment trigger |
| 27 | Customer | BOOKING - LOCATION OTH | 8236:4122 | `src/app/(customer)/booking/location.tsx` | Core | Implemented | route audit | Required text address entry screen |
| 28 | Customer | BOOK APPOINTMENT OPTION | 8209:3599 | `src/app/(customer)/booking/options.tsx` | Core | Implemented | route audit | Service selection screen |
| 29 | Customer | BOOKING OTH - SAVE LOCATION | 8244:22415 | `src/app/(customer)/booking/location.tsx` | Preferred Enhancement | Blocked | development build pending | Pin drop location save (E-01) |
| 30 | Customer | BOOK APPOINTMENT SCHEDULE | 8209:3396 | `src/app/(customer)/booking/schedule.tsx` | Core | Implemented | route audit | Operating schedule & slot lock selector |
| 31 | Customer | BOOKING - CANCELLED OTH | 8239:5797 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Core | Implemented | route audit | Cancelled booking status state |
| 32 | Customer | DETAIL APPOINTMENT (Payment Review) | 8063:5335 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Additional Feature | Implemented | unit test | Payment details & status tracking |
| 33 | Customer | BOOKING OTH - HISTORY | 8242:20857 | `src/app/(customer)/booking/history.tsx` | Core | Implemented | route audit | Active vs history tabs |
| 34 | Customer | BOOKING OTH - HISTORY [DETAIL] | 8242:20949 | `src/app/(customer)/booking/history/[bookingId].tsx` | Core | Implemented | route audit | Past booking detail view |
| 35 | Customer | BOOKING OTH - RATING & REVIEW | 8242:21120 | `src/app/(customer)/booking/rating/[bookingId].tsx` | Core | Implemented | route audit | Rating & review submission |
| 36 | Customer | CHAT - ROOM CHAT | 8064:4386 | `src/app/(customer)/chat/[conversationId].tsx` | Core | Partial | route audit | UI route exists, in-memory state; Firestore real-time listener (F-31) needed |
| 37 | Customer | CHOOSE BARBER | 8065:2614 | `src/app/(customer)/explore.tsx` | Core | Implemented | route audit | Barber search & category catalog |
| 38 | Customer | FAVORITE BARBERS | 8102:4497 | `src/app/(customer)/favorites.tsx` | Core | Implemented | route audit | Customer favorite barbers list |
| 39 | Customer | FIND BARBER - DEFAULT | 8065:2782 | `src/app/(customer)/explore.tsx` | Core | Implemented | route audit | Main customer discovery screen |
| 40 | Customer | HOME - CUSTOMER | 8065:2552 | `src/app/(customer)/home.tsx` | Core | Implemented | route audit | Customer home dashboard |
| 41 | Customer | HOME - BOOKED | 8092:12810 | `src/app/(customer)/home.tsx` | Core | Implemented | route audit | Active booking banner variant |
| 42 | Customer | EXPLORE BARBERS | 8086:5597 | `src/app/(customer)/explore.tsx` | Core | Implemented | route audit | Category grid exploration |
| 43 | Customer | HOME - FILTER | 8065:2691 | `src/app/(customer)/explore.tsx` | Core | Implemented | route audit | Filter options drawer |
| 44 | Customer | CHAT - LIST | 8064:4154 | `src/app/(customer)/chat.tsx` | Core | Partial | route audit | UI list route exists, static mock items; Firestore listener needed |
| 45 | Customer | PROFILE - DEFAULT | 8062:3122 | `src/app/(customer)/profile.tsx` | Core | Implemented | route audit | Profile menu & avatar upload |
| 46 | Customer | PROFILE - ABOUT | 8062:3560 | `src/app/(customer)/profile/about.tsx` | Core | Implemented | route audit | Application info screen |
| 47 | Customer | PROFILE - ACCOUNT | 8062:2640 | `src/app/(customer)/profile/account.tsx` | Core | Implemented | route audit | Customer profile editor |
| 48 | Customer | PROFILE - HELP | 8062:2660 | `src/app/(customer)/profile/help.tsx` | Core | Implemented | route audit | Help & FAQ screen |
| 49 | Customer | PROFILE - PASSWORD | 8062:2654 | `src/app/(customer)/profile/change-password.tsx` | Core | Implemented | route audit | Password change screen |
| 50 | Customer | Terms and Conditions | 8209:3339 | `src/app/(customer)/terms-condition.tsx` | Core | Implemented | route audit | Terms and conditions view |
| 51 | User | ONBOARD | 8062:2592 | `src/app/(auth)/onboarding/[step].tsx` | Core | Implemented | route audit | Dynamic onboarding step 0 |
| 52 | User | ONBOARD1 | 8062:4443 | `src/app/(auth)/onboarding/[step].tsx` | Core | Implemented | route audit | Dynamic onboarding step 1 |
| 53 | User | ONBOARD2 | 8062:4505 | `src/app/(auth)/onboarding/[step].tsx` | Core | Implemented | route audit | Dynamic onboarding step 2 |
| 54 | User | ONBOARD3 | 8062:4473 | `src/app/(auth)/onboarding/[step].tsx` | Core | Implemented | route audit | Dynamic onboarding step 3 |

---

## 2. Actor Acceptance Criteria Status

### 2.1 Authentication & Onboarding Flow
- [x] Dynamic 4-step onboarding carousel navigates seamlessly using `routes.auth.onboarding(step)`.
- [x] Login screen validates email format and triggers Firebase Auth login.
- [x] Customer registration validates required inputs, password matching, and terms acceptance.
- [x] Web Auth persistence fallbacks (`indexedDBLocalPersistence`) prevent IndexedDB crashes on web tabs.

### 2.2 Customer Operations Flow
- [x] Customer home dashboard displays personalized greeting and active barber suggestions.
- [x] Customer discovery allows text search, category filtering, and rating sorting.
- [x] Booking workflow allows date selection, service selection, manual location entry, and order confirmation.
- [x] Booking history tab switcher toggles between active and completed/cancelled bookings.
- [x] Rating and review submission records star ratings and feedback tags.
- [ ] Map picker in `booking/location.tsx` (E-01) allows interactive pin selection (Blocked: requires Expo dev build).
- [x] Profile sub-screens (`account`, `change-password`, `help`, `about`) allow data edits and persist to Firestore.
- [ ] Chat screen streams real-time Firestore messages via `onSnapshot` (F-31, pending Batch 05).

### 2.3 Barber Operations Flow
- [x] Barber tab navigator renders `Bookings`, `Schedule`, `Services`, and `Profile` tabs.
- [x] Barber can accept, reject, start (`in_progress`), and complete (`completed`) customer bookings.
- [x] Barber can set opening/closing hours per day and blacked-out dates in `schedule.tsx`.
- [x] Barber can add new services and edit prices via `ServiceFormModal`.
- [ ] Barber identity verification wizard allows ID document upload and tracks application status (Pending Batch 03).
- [x] Barber analytics dashboard displays monthly revenue and booking volume metrics.

### 2.4 Admin Management Flow
- [ ] Admin dashboard displays platform-wide metrics (total revenue, active barbers, pending tickets) (Pending Batch 04).
- [ ] Admin verification queue displays unverified barber applications with approval/rejection triggers (Pending Batch 04).
- [ ] Admin service categories management allows creating and reordering categories (Pending Batch 04).

---

## 3. Quality & Security Release Gates

- [x] **Typecheck Gate**: `npx tsc --noEmit` completes with zero errors across all root and backend modules.
- [x] **Lint Gate**: `npm run lint` passes with zero errors (`expo lint`).
- [x] **Route Guard Gate**: Layout files in `(customer)`, `(barber)`, and `(admin)` handle authentication and role routing.
- [x] **Security Rule Audit**: Firestore security rules prevent cross-user document tampering and unauthorized payment status writes.