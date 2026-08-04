# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This document provides a comprehensive audit of the URBarber repository as of version 1.0.0. The repository contains a cross-platform React Native (Expo Router) application designed for three primary actors: **Customer**, **Barber**, and **Admin**. 

While the customer-facing user interface and authentication flows have preliminary implementations, the barber and admin operational flows remain entirely unbuilt at the screen layer. Significant discrepancies exist between feature domain types, mock fallback strategies, and backend integration.

---

## 2. Route Audit

### 2.1 Implemented Routes (`src/app`)

| Route Path | Description | Implementation Quality |
| --- | --- | --- |
| `src/app/_layout.tsx` | Root Stack layout wrapped in `AuthProvider` | Complete |
| `src/app/index.tsx` | Entry redirect to `/(auth)/onboarding/0` | Complete |
| `src/app/(auth)/_layout.tsx` | Auth stack layout configuration | Complete |
| `src/app/(auth)/onboarding/[step].tsx` | 4-step dynamic onboarding flow (steps 0..3) | Complete |
| `src/app/(auth)/login.tsx` | Email & Google social authentication screen | Partial (Google auth bypasses token verification) |
| `src/app/(auth)/register-customer.tsx` | Customer registration form | Complete UI / Partial Backend |
| `src/app/(auth)/forgot-password.tsx` | Password reset request form | Complete |
| `src/app/(auth)/otp-verification.tsx` | 4-digit OTP verification screen | Mock OTP logic |
| `src/app/(auth)/otp.tsx` | Redirect alias to `otp-verification.tsx` | Utility |
| `src/app/(customer)/_layout.tsx` | Customer stack layout | Complete |
| `src/app/(customer)/home.tsx` | Customer main dashboard | Partial (Wired to `useCustomerHome` hook) |
| `src/app/(customer)/explore.tsx` | Barber search & filter screen | Mock data only |
| `src/app/(customer)/favorites.tsx` | Favorite barbers list | Mock data only |
| `src/app/(customer)/chat.tsx` | Customer chat conversations list | Mock data only |
| `src/app/(customer)/chat/[conversationId].tsx` | Chat room UI with local message state | UI complete / No real-time backend |
| `src/app/(customer)/barber/[barberId].tsx` | Barber detail view | Mock data only |
| `src/app/(customer)/booking/options.tsx` | Date & service selection, service type picker | Complete UI |
| `src/app/(customer)/booking/schedule.tsx` | Time slot selector screen | Partial (Uses `useScheduleSelector` hook) |
| `src/app/(customer)/booking/location.tsx` | Home service address entry screen | Static text input / Missing map picker |
| `src/app/(customer)/booking/invoice.tsx` | Order confirmation screen | UI complete / Mock payment trigger |
| `src/app/(customer)/booking/history.tsx` | Active vs past bookings list switcher | Complete UI / Wired to `useBookingList` |
| `src/app/(customer)/booking/detail/[bookingId].tsx` | Active booking detail and progress tracker | Complete UI |
| `src/app/(customer)/booking/history/[bookingId].tsx` | Completed booking detail view | Complete UI |
| `src/app/(customer)/booking/rating/[bookingId].tsx` | Review submission screen | Complete UI |
| `src/app/(customer)/profile.tsx` | Profile menu overview | Complete UI |
| `src/app/(customer)/profile/account.tsx` | Edit profile screen | Skeleton shell only |
| `src/app/(customer)/profile/change-password.tsx` | Change password screen | Skeleton shell only |
| `src/app/(customer)/profile/help.tsx` | Customer support & help screen | Skeleton shell only |
| `src/app/(customer)/profile/about.tsx` | Application about screen | Skeleton shell only |
| `src/app/(customer)/terms-condition.tsx` | Terms and conditions display | Static text shell |

---

### 2.2 Incomplete Routes (Not Started in `src/app`)

#### Barber Flow (`(barber)`) - 0% Implemented at App Layer
- `src/app/(barber)/(tabs)/bookings.tsx` (Booking list management)
- `src/app/(barber)/(tabs)/schedule.tsx` (Weekly schedule management)
- `src/app/(barber)/(tabs)/services.tsx` (Services management)
- `src/app/(barber)/booking/[bookingId].tsx` (Transaction detail & status update)
- `src/app/(barber)/chat/index.tsx` (Barber chat list)
- `src/app/(barber)/chat/[conversationId].tsx` (Barber chat room)
- `src/app/(barber)/analysis.tsx` (Performance & revenue analytics)
- `src/app/(barber)/reviews.tsx` (Ratings & review management)
- `src/app/(barber)/verification/identity.tsx` (Identity document upload)
- `src/app/(barber)/verification/submission.tsx` (Verification application)
- `src/app/(barber)/verification/terms.tsx` (Barber terms agreement)
- `src/app/(barber)/verification/status.tsx` (Verification status check)

#### Admin Flow (`(admin)`) - 0% Implemented at App Layer
- `src/app/(admin)/chat/index.tsx` (Admin support chat list)
- `src/app/(admin)/chat/[conversationId].tsx` (Admin support chat room)
- `src/app/(admin)/dashboard.tsx` (Operational overview metrics)
- `src/app/(admin)/users/index.tsx` (User management & suspension)
- `src/app/(admin)/verifications/index.tsx` (Barber verification queue)
- `src/app/(admin)/moderation/reviews.tsx` (Review moderation interface)

---

### 2.3 Duplicate and Orphaned Routes

1. **Root Starter Duplicate**: `src/app/explore.tsx` is an orphaned Expo starter template file importing web badges and tutorial images. It conflicts with `src/app/(customer)/explore.tsx`.
2. **OTP Redirection Alias**: `src/app/(auth)/otp.tsx` is a legacy redirect alias pointing to `src/app/(auth)/otp-verification.tsx`.
3. **Cross-Actor Chat Screens**: Figma specifies chat room (`8064:4386`) and chat list (`8064:4154`) for Customer, Barber, and Admin. Currently, only Customer chat is implemented, duplicating logic locally rather than sharing container primitives.
4. **Route Naming Mismatches**:
   - Figma proposed `src/app/(customer)/booking/review.tsx` for booking detail, whereas codebase implements `src/app/(customer)/booking/detail/[bookingId].tsx`.
   - Naming tokens use `terms-condition.tsx` (singular) vs common standard.

---

## 3. Implementation Status: Logic & Backend Integration

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend Layer Breakdown                        │
├──────────────────────────┬─────────────────────────────────────────────┤
│ Firebase-Backed Services │ - Firebase Auth (Email/Password)            │
│                          │ - Firestore Repositories (Customer, Booking,│
│                          │   Barber, Admin)                            │
├──────────────────────────┼─────────────────────────────────────────────┤
│ Mock-Only Logic          │ - OTP Request & Verification (Dummy codes)  │
│                          │ - Social Auth (Google/Apple token bypass)   │
│                          │ - In-app Chat (Local React state)           │
│                          │ - Customer Explore/Favorites screen UI      │
│                          │ - Payment Gateway processing                │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### 3.1 Firebase-Backed Logic
- **Authentication**: `src/features/auth/services/auth.service.ts` integrates Firebase Auth (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendPasswordResetEmail`, `signOut`).
- **Data Repositories**: Data access functions in `customerRepository`, `bookingRepository`, `barberRepository`, and `adminRepository` are fully written against Firebase Firestore collections (`customers`, `barbers`, `bookings`, `reviews`, `favorites`, `supportTickets`).

### 3.2 Mock-Only & Fallback Logic
- **OTP Subsystem**: `requestOtp` and `verifyOtp` accept any input without backend phone/SMS verification. `AuthContext` falls back to storing an `otpUser` in `AsyncStorage` (`@urbarber/otp-session`).
- **Social Login**: `authService.loginWithGoogle` checks for `idToken`. If unprovided, UI catch blocks swallow the error and redirect directly to `/(customer)/home`.
- **Customer Screens**: `explore.tsx`, `favorites.tsx`, `chat.tsx`, and `barber/[barberId].tsx` render static mock constants (`MOCK_NEARBY_BARBERS`, `MOCK_SERVICES`, `MOCK_CUSTOMER_ID = 'CUST001'`).
- **Offline Repositories**: Repositories catch Firestore `unavailable` errors and silently return fallback mock data (`MOCK_CUSTOMER_PROFILE`, `MOCK_CUSTOMER_HOME_DATA`).

---

## 4. Inconsistent Types and Statuses

### 4.1 Booking Status Conflict Matrix

A critical inconsistency exists across type definitions regarding booking statuses:

| Layer | Type Definition | Allowed Status Values |
| --- | --- | --- |
| Domain Type (`src/types/domain.ts`) | `BookingStatus` | `"pending" \| "accepted" \| "rejected" \| "in_progress" \| "completed" \| "cancelled"` |
| Booking Feature (`features/bookings/types/booking.ts`) | `BookingStatus` | `'booked' \| 'waiting' \| 'on_process' \| 'finished' \| 'cancelled'` |
| Barber Feature (`features/barbers/types/barber.ts`) | `BarberBookingStatus` | `'completed' \| 'pending' \| 'cancelled' \| 'in_progress'` |

**Operational Impact**: Firestore queries fail or return empty arrays because `booking.repository.ts` queries for `['booked', 'waiting', 'on_process']` while `barber.repository.ts` queries for `['completed', 'pending']`.

### 4.2 Auth User Role Omission
`AuthUser` in `src/features/auth/context/auth-context.tsx` is defined as `Pick<User, 'uid' | 'email' | 'displayName'>`. It lacks the `role` property (`customer` | `barber` | `admin`), rendering role-based layout redirection impossible without fetching additional Firestore documents.

---

## 5. Missing Functionality Summary

### 5.1 Customer Actor
- **Map & Geocoding**: Interactive map picker for `booking-location.md` (`8236:4122`).
- **Real Payment Gateway Integration**: Bank transfer / e-wallet handling (`booking-invoice.md`).
- **Profile Sub-pages**: Real implementations for account editing, password change, help center, and about pages.
- **Real-Time Chat**: Live Firestore chat subscription (`onSnapshot`).

### 5.2 Barber Actor
- **Entire UI Route Layer**: Complete lack of screen files under `src/app/(barber)/`.
- **Booking Management**: Accept, reject, start service, and complete service triggers.
- **Service & Schedule Management**: Active schedule slot toggles and service pricing management.
- **Identity Verification Wizard**: Multi-step document submission flow.

### 5.3 Admin Actor
- **Entire UI Route Layer**: Complete lack of screen files under `src/app/(admin)/`.
- **Verification Queue**: UI to review and approve/reject pending barber applications.
- **Moderation Tools**: Review moderation and flagged booking review tools.

---

## 6. Risk Analysis

### 6.1 Compilation & Runtime Risks
1. **Unresolved Navigation Links**: Links in components pointing to Barber (`/(barber)`) or Admin (`/(admin)`) routes will fail at runtime because the route directories do not exist.
2. **Template Code Artifacts**: `src/app/explore.tsx` imports unused starter components (`Collapsible`, `WebBadge`, `ThemedText`).
3. **Environment Missing Check**: `src/lib/firebase.ts` throws an uncaught Error at runtime if `EXPO_PUBLIC_FIREBASE_*` environment variables are absent.

### 6.2 Security Risks
1. **Unauthenticated Session Injection**: Storing dummy OTP credentials in `AsyncStorage` allows arbitrary auth state creation without backend verification.
2. **Missing Role-Based Access Control (RBAC)**: Client routes lack role protection guards in layout files.
3. **Client-Side Financial Calculations**: Service prices and totals are passed via client route parameters rather than computed server-side or via transaction rules.
4. **Lack of Real-Time Firestore Security Rules**: Client SDK operations require comprehensive security rules to prevent unauthorized reads/writes across user documents.

---

## 7. Recommended Implementation Order

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Implementation Phase Roadmap                      │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Foundation, Type Harmonization & Environment Hardening        │
│ Phase 2: Authentication, Role Guarding & OTP Completion                │
│ Phase 3: Customer Flow Completion & Real-Time Sync                     │
│ Phase 4: Barber Operations Flow Implementation                         │
│ Phase 5: Admin Management & Moderation Flow Implementation             │
│ Phase 6: Final Hardening, Edge Cases & Acceptance Verification         │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Phase 1: Foundation & Type Harmonization**
   - Harmonize `BookingStatus`, `UserRole`, and `User` types in `src/types/domain.ts`.
   - Remove orphaned template code (`src/app/explore.tsx`).
   - Add default safe fallbacks for missing environment variables in non-production builds.

2. **Phase 2: Auth Hardening & RBAC**
   - Add `role` property to `AuthUser` and implement role-based route guards in `(auth)`, `(customer)`, `(barber)`, and `(admin)` layouts.
   - Wire backend phone/email OTP verification service.

3. **Phase 3: Customer Flow Completion**
   - Connect customer home, explore, favorites, and profile screens to live Firestore listeners.
   - Implement live Firestore chat stream in `chat/[conversationId].tsx`.
   - Complete profile sub-screen forms (`account.tsx`, `change-password.tsx`, `help.tsx`).

4. **Phase 4: Barber Flow Implementation**
   - Build `(barber)` layout and tab navigation (`bookings.tsx`, `schedule.tsx`, `services.tsx`).
   - Implement transaction detail, schedule editor, service modal, identity verification sequence, and analytics dashboard.

5. **Phase 5: Admin Flow Implementation**
   - Build `(admin)` layout and dashboard.
   - Implement user verification queue, review moderation interface, and support chat center.

6. **Phase 6: Quality Gates & Acceptance Verification**
   - Verify all 54 screens against `docs/development/acceptance-checklist.md`.
   - Audit Firestore security rules and complete end-to-end integration tests.