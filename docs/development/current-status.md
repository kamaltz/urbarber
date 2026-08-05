# URBarber Repository Audit: Current Status Report

## 1. Executive Summary

This report presents an empirical code audit of the URBarber repository on branch `feat/complete-thesis-mvp`. The audit inspects all source code under `src/`, package definitions, configurations, and visual documentation in `docs/figma/`.

While customer authentication and customer dashboard UI elements exist, **barber operations (`(barber)`) and admin management (`(admin)`) route groups are completely missing screen files in `src/app/` (0% UI implementation)**. Critical discrepancies exist in data types, non-canonical booking status usage, mock fallbacks in production repositories, and command tool execution environment.

---

## 2. Route Audit & Screen Implementation Status

### 2.1 Implemented Customer & Auth Routes (`src/app/`)

| Route Path | Description | Audit Finding & Status |
| --- | --- | --- |
| `src/app/_layout.tsx` | Root Stack layout wrapped in `AuthProvider` | Complete |
| `src/app/index.tsx` | Entry redirect to `/(auth)/onboarding/0` | Complete |
| `src/app/(auth)/_layout.tsx` | Auth stack layout configuration | Complete |
| `src/app/(auth)/onboarding/[step].tsx` | 4-step dynamic onboarding flow (steps 0..3) | Complete |
| `src/app/(auth)/login.tsx` | Email & Google social login screen | Partial (Google login token bypass in catch blocks) |
| `src/app/(auth)/register-customer.tsx` | Customer registration form | Complete UI / Partial Backend |
| `src/app/(auth)/forgot-password.tsx` | Password reset request form | Complete |
| `src/app/(auth)/otp-verification.tsx` | 4-digit OTP verification screen | Mock OTP logic (Bypasses backend phone auth) |
| `src/app/(auth)/otp.tsx` | Redirect alias to `otp-verification.tsx` | Utility redirect |
| `src/app/(customer)/_layout.tsx` | Customer stack layout | Complete |
| `src/app/(customer)/home.tsx` | Customer main dashboard | Partial (Wired to `useCustomerHome` hook) |
| `src/app/(customer)/explore.tsx` | Barber search & filter screen | Mock data fallback in repository |
| `src/app/(customer)/favorites.tsx` | Favorite barbers list | Mock data fallback in repository |
| `src/app/(customer)/chat.tsx` | Customer chat conversations list | Static mock list |
| `src/app/(customer)/chat/[conversationId].tsx` | Chat room UI with local message state | UI complete / No real-time backend |
| `src/app/(customer)/barber/[barberId].tsx` | Barber detail view | Mock data fallback in repository |
| `src/app/(customer)/booking/options.tsx` | Date & service selection | Complete UI |
| `src/app/(customer)/booking/schedule.tsx` | Time slot selector screen | Partial (Uses `useScheduleSelector` hook) |
| `src/app/(customer)/booking/location.tsx` | Home service address entry screen | Text input / No map picker (in line with thesis scope) |
| `src/app/(customer)/booking/invoice.tsx` | Order confirmation screen | UI complete / Uses `bookingRepository.processPayment` |
| `src/app/(customer)/booking/history.tsx` | Active vs past bookings list | Complete UI / Wired to `useBookingList` |
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

### 2.2 Missing Routes (Not Created in `src/app`)

#### Barber Flow (`src/app/(barber)`) - 0% Implemented at Route Layer
- `src/app/(barber)/_layout.tsx`
- `src/app/(barber)/home.tsx`
- `src/app/(barber)/(tabs)/bookings.tsx`
- `src/app/(barber)/(tabs)/schedule.tsx`
- `src/app/(barber)/(tabs)/services.tsx`
- `src/app/(barber)/booking/[bookingId].tsx`
- `src/app/(barber)/analysis.tsx`
- `src/app/(barber)/reviews.tsx`
- `src/app/(barber)/verification/identity.tsx`
- `src/app/(barber)/verification/submission.tsx`
- `src/app/(barber)/verification/terms.tsx`
- `src/app/(barber)/verification/status.tsx`

#### Admin Flow (`src/app/(admin)`) - 0% Implemented at Route Layer
- `src/app/(admin)/_layout.tsx`
- `src/app/(admin)/dashboard.tsx`
- `src/app/(admin)/users/index.tsx`
- `src/app/(admin)/verifications/index.tsx`
- `src/app/(admin)/moderation/reviews.tsx`
- `src/app/(admin)/reports/index.tsx`

---

### 2.3 Orphaned and Duplicate Files
1. **Orphaned Starter File**: `src/app/explore.tsx` is an unused default template file that imports obsolete web components (`Collapsible`, `WebBadge`, `ThemedText`). It conflicts with `src/app/(customer)/explore.tsx` and must be deleted.
2. **Empty Repository Directories**: `src/repositories/` contains empty directories (`auth/`, `barbers/`, `bookings/`, `reviews/`, `analytics/`, `verification/`, `profile/`, `chat/`). The active code relies on `src/features/*/repository/`.

---

## 3. Major Discrepancies & Code Deficiencies Found

### 1. Booking Status Mismatch Across Code Layers
- `src/types/domain.ts` defines canonical status: `"pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"`.
- `src/features/bookings/repository/booking.repository.ts` queries Firestore using non-canonical values: `['booked', 'waiting', 'on_process']` and `['finished', 'cancelled']`.
- `src/features/barbers/repository/barber.repository.ts` queries Firestore using `['completed', 'pending', 'cancelled']`.
- **Impact**: Queries across customer and barber repositories fail to match documents created by each other.

### 2. Random Payment Simulation in Production Path
- In `src/features/bookings/repository/booking.repository.ts` line 332:
  ```typescript
  const success = Math.random() > 0.1;
  ```
- **Impact**: Violates permanent project rule prohibiting randomized payment results or mock logic in production execution paths.

### 3. Mock Fallback Returns in Repositories
- `customerRepository` in `src/features/customer/repository/customer.repository.ts` catches offline and general errors, returning hardcoded `MOCK_CUSTOMER_PROFILE` and `MOCK_CUSTOMER_HOME_DATA` objects instead of propagating backend errors.
- **Impact**: Masks broken Firebase configuration and missing Firestore documents in live builds.

### 4. Mock OTP Subsystem & AsyncStorage Fake Session
- `src/features/auth/services/auth.service.ts` `verifyOtp` accepts any 4-digit input without validating against Firebase Auth phone credentials.
- `AuthContext` stores fake OTP sessions in `AsyncStorage` (`@urbarber/otp-session`).

### 5. Social Login Token Verification Bypass
- `authService.loginWithGoogle` handles missing tokens by catching errors in `login.tsx` UI and forcing a direct navigation to `/(customer)/home` without valid Firebase credentials.

### 6. Validation Tool Execution Failure
- Running `npm run check` fails with `'tsc' is not recognized as an internal or external command`.
- Running `npm run lint` fails with `Error: Cannot find module 'eslint'`.
- Running `git diff --check` passes cleanly.

---

## 4. Operational & Security Risks

1. **Unprotected Routes**: `src/app/(customer)/_layout.tsx` lacks role check guards. Any logged-in user can access customer routes.
2. **Missing Storage RLS Rules**: Supabase Storage bucket `public-media` policies are not documented or tested against Firebase Auth JWT tokens.
3. **No Direct SDK in Screens Violation**: While most screens call feature hooks, some screens perform inline data mutations or state mocking.

---

## 5. Required Validation Commands

- `npm run check`
- `npm run doctor`
- `git diff --check`