# URBarber Feature Acceptance Checklist & Implementation Audit

## 1. Complete 54-Screen Audit Matrix

This matrix tracks all 54 screens documented in `docs/figma/screen-index.md` against their current code status in `src/app` and backend integration status.

| # | Actor | Screen Name | Node ID | Proposed Route / Target Component | Current Status | Notes / Blockers |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Admin | CHAT - ROOM CHAT | 8064:4386 | `src/app/(admin)/chat/[conversationId].tsx` | Not Started | Needs shared chat component |
| 2 | Admin | CHAT - LIST | 8064:4154 | `src/app/(admin)/chat/index.tsx` | Not Started | Needs shared chat component |
| 3 | User | AUTHENTICATION | 8062:7562 | `src/app/(auth)/authentication.tsx` | Implemented | Integrated via login flow |
| 4 | User | FORGOT PASSWORD | 8062:7553 | `src/app/(auth)/forgot-password.tsx` | Implemented | Firebase reset wired |
| 5 | User | LOGIN | 8062:7161 | `src/app/(auth)/login.tsx` | Implemented | Requires native Google token |
| 6 | Customer | REGIST | 8062:7596 | `src/app/(auth)/register-customer.tsx` | Implemented | Customer signup form |
| 7 | Barber | Progress analysis - BARBER | 8115:7655 | `src/app/(barber)/analysis.tsx` | Not Started | Needs chart & KPI widgets |
| 8 | Barber | TRANSACTION DETAIL | 8240:19130 | `src/app/(barber)/booking/[bookingId].tsx` | Not Started | Needs barber booking hook |
| 9 | Barber | BOOKING LIST | 8115:7314 | `src/app/(barber)/(tabs)/bookings.tsx` | Not Started | Needs status filter tabs |
| 10 | Barber | CHAT - ROOM CHAT | 8064:4386 | `src/app/(barber)/chat/[conversationId].tsx` | Not Started | Shared chat room shell |
| 11 | Barber | CHAT - LIST | 8064:4154 | `src/app/(barber)/chat/index.tsx` | Not Started | Shared chat list shell |
| 12 | Barber | RATING REVIEW - BARBER | 8107:5960 | `src/app/(barber)/reviews.tsx` | Not Started | Needs review reply modal |
| 13 | Barber | SCHEDULE MANAGEMENT | 8096:4939 | `src/app/(barber)/(tabs)/schedule.tsx` | Not Started | Weekly schedule editor |
| 14 | Barber | [POP UP] ADD SERVICES | 8120:8662 | `src/features/services/components/ServiceFormModal.tsx` | Not Started | Service creation modal |
| 15 | Barber | BARBER - SERVICES | 8116:8322 | `src/app/(barber)/(tabs)/services.tsx` | Not Started | Service listing screen |
| 16 | Barber | PROFILE BARBER - SUBMISSION | 8187:4758 | `src/app/(barber)/verification/identity.tsx` | Not Started | Identity upload step |
| 17 | Barber | PROFILE BARBER - LOADING | 8120:8865 | `src/app/(barber)/verification/status.tsx` | Not Started | Verification pending state |
| 18 | Barber | PROFILE BARBER - SUBMISSION | 8116:8153 | `src/app/(barber)/verification/submission.tsx` | Not Started | Document submit step |
| 19 | Barber | Terms & Conditions - Barber | 8208:3251 | `src/app/(barber)/verification/terms.tsx` | Not Started | Barber terms step |
| 20 | Customer | DETAIL BARBER | 8067:5235 | `src/app/(customer)/barber/[barberId].tsx` | Implemented | Uses mock fallback data |
| 21 | Customer | BOOKING - ACTIVE [BOOKED] | 8063:5888 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Implemented | Status state within detail |
| 22 | Customer | BOOKING OTH - ACTIVE [FINISHED] OTH | 8242:20768 | `src/app/(customer)/booking/history/[bookingId].tsx` | Implemented | History detail screen |
| 23 | Customer | BOOKING OTH - ACTIVE [ON PROCESS] OTH | 8243:21852 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Implemented | Status state within detail |
| 24 | Customer | BOOKING OTH - ACTIVE [WAITING] OTH | 8180:2729 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Implemented | Status state within detail |
| 25 | Customer | BOOKING - FIX LOCATION OTH | 8238:5491 | `src/app/(customer)/booking/location.tsx` | Partial | Needs interactive map |
| 26 | Customer | INVOICE OTS | 8063:4206 | `src/app/(customer)/booking/invoice.tsx` | Implemented | Summary display screen |
| 27 | Customer | BOOKING - LOCATION OTH | 8236:4122 | `src/app/(customer)/booking/location.tsx` | Implemented | Location address input |
| 28 | Customer | BOOK APPOINTMENT OPTION | 8209:3599 | `src/app/(customer)/booking/options.tsx` | Implemented | Service & date picker |
| 29 | Customer | BOOKING OTH - SAVE LOCATION | 8244:22415 | `src/app/(customer)/booking/location.tsx` | Partial | Address save capability |
| 30 | Customer | BOOK APPOINTMENT SCHEDULE | 8209:3396 | `src/app/(customer)/booking/schedule.tsx` | Implemented | Time slot selection |
| 31 | Customer | BOOKING - CANCELED OTH | 8239:5797 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Implemented | Cancelled status state |
| 32 | Customer | DETAIL APPOINMENT (Bank Transfer) | 8063:5335 | `src/app/(customer)/booking/detail/[bookingId].tsx` | Implemented | Booking detail view |
| 33 | Customer | BOOKING OTH- HISTORY | 8242:20857 | `src/app/(customer)/booking/history.tsx` | Implemented | Active vs history tabs |
| 34 | Customer | BOOKING OTH - HISTORY [DETAIL] | 8242:20949 | `src/app/(customer)/booking/history/[bookingId].tsx` | Implemented | Past booking view |
| 35 | Customer | BOOKING OTH - RATING & REVIEW | 8242:21120 | `src/app/(customer)/booking/rating/[bookingId].tsx` | Implemented | Rating & tags submission |
| 36 | Customer | CHAT - ROOM CHAT | 8064:4386 | `src/app/(customer)/chat/[conversationId].tsx` | Implemented | In-memory message state |
| 37 | Customer | CHOOSE BARBER | 8065:2614 | `src/app/(customer)/explore.tsx` | Implemented | Static barber search |
| 38 | Customer | FAVORITE BARBERS | 8102:4497 | `src/app/(customer)/favorites.tsx` | Implemented | Static favorites list |
| 39 | Customer | FIND BARBER - DEFAULT | 8065:2782 | `src/app/(customer)/explore.tsx` | Implemented | Search screen shell |
| 40 | Customer | HOME - CUSTOMER | 8065:2552 | `src/app/(customer)/home.tsx` | Implemented | Dashboard UI |
| 41 | Customer | HOME - BOOKED | 8092:12810 | `src/app/(customer)/home.tsx` | Implemented | Active booking banner variant |
| 42 | Customer | EXPLORE BARBERS | 8086:5597 | `src/app/(customer)/explore.tsx` | Implemented | Category grid variant |
| 43 | Customer | HOME - FILTER | 8065:2691 | `src/app/(customer)/explore.tsx` | Partial | Filter drawer trigger |
| 44 | Customer | CHAT - LIST | 8064:4154 | `src/app/(customer)/chat.tsx` | Implemented | Static list screen |
| 45 | Customer | PROFILE - DEFAULT | 8062:3122 | `src/app/(customer)/profile.tsx` | Implemented | Main profile menu |
| 46 | Customer | PROFILE - ABOUT | 8062:3560 | `src/app/(customer)/profile/about.tsx` | Partial | Static text shell |
| 47 | Customer | PROFILE - ACCOUNT | 8062:2640 | `src/app/(customer)/profile/account.tsx` | Partial | Form shell only |
| 48 | Customer | PROFILE - HELP | 8062:2660 | `src/app/(customer)/profile/help.tsx` | Partial | FAQ shell only |
| 49 | Customer | PROFILE - PASSWORD | 8062:2654 | `src/app/(customer)/profile/change-password.tsx` | Partial | Form shell only |
| 50 | Customer | Terms and Conditions | 8209:3339 | `src/app/(customer)/terms-condition.tsx` | Implemented | Static text view |
| 51 | User | ONBOARD | 8062:2592 | `src/app/(auth)/onboarding/[step].tsx` | Implemented | Dynamic step 0 |
| 52 | User | ONBOARD1 | 8062:4443 | `src/app/(auth)/onboarding/[step].tsx` | Implemented | Dynamic step 1 |
| 53 | User | ONBOARD2 | 8062:4505 | `src/app/(auth)/onboarding/[step].tsx` | Implemented | Dynamic step 2 |
| 54 | User | ONBOARD3 | 8062:4473 | `src/app/(auth)/onboarding/[step].tsx` | Implemented | Dynamic step 3 |

---

## 2. Actor Acceptance Criteria

### 2.1 Authentication & Onboarding Flow
- [x] Dynamic 4-step onboarding carousel navigates seamlessly using `routes.auth.onboarding(step)`.
- [x] Login screen validates email format and triggers OTP flow.
- [x] Customer registration validates required inputs, password matching, and terms acceptance.
- [ ] OTP verification connects to backend SMS/email provider rather than accepting dummy codes.
- [ ] Google/Apple social sign-in passes valid OAuth `idToken` to Firebase Auth.

### 2.2 Customer Operations Flow
- [x] Customer home dashboard displays personalized greeting and quick stats.
- [x] Booking workflow allows date selection, service selection, location entry, and order confirmation.
- [x] Booking history tab switcher toggles between active and completed bookings.
- [x] Rating and review submission records star ratings and feedback tags.
- [ ] Map picker in `booking/location.tsx` allows pin drop location setting.
- [ ] Profile sub-screens (`account`, `change-password`, `help`, `about`) allow data edits and persist to Firestore.
- [ ] Chat screen streams real-time Firestore messages via `onSnapshot`.

### 2.3 Barber Operations Flow
- [ ] Barber tab navigator renders `Bookings`, `Schedule`, and `Services` tabs.
- [ ] Barber can accept, reject, start (`on_process`), and complete (`finished`) customer bookings.
- [ ] Barber can set opening/closing hours per day in `schedule.tsx`.
- [ ] Barber can add new services and edit prices via `ServiceFormModal`.
- [ ] Barber identity verification wizard allows ID document upload and tracks application status.
- [ ] Barber analytics dashboard displays monthly revenue and booking volume metrics.

### 2.4 Admin Management Flow
- [ ] Admin dashboard displays platform-wide metrics (total revenue, active barbers, pending tickets).
- [ ] Admin verification queue displays unverified barber applications with approval/rejection triggers.
- [ ] Review moderation screen allows admins to approve or hide flagged customer reviews.
- [ ] Admin support chat connects directly to open customer support conversations.

---

## 3. Quality & Security Release Gates

- [ ] **Typecheck Gate**: `npx tsc --noEmit` completes with zero errors across all modules.
- [ ] **Lint Gate**: `npm run lint` passes with zero ESLint or formatting violations.
- [ ] **Orphan File Cleanliness**: Starter boilerplate (`src/app/explore.tsx`) removed.
- [ ] **Route Guard Gate**: Layout files in `(customer)`, `(barber)`, and `(admin)` redirect unauthorized user roles safely.
- [ ] **Security Rule Audit**: Firestore security rules prevent cross-user document tampering.