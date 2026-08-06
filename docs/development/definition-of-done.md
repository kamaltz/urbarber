# URBarber Definition of Done (DoD)

## 1. Overview
The Definition of Done (DoD) establishes the mandatory quality and completeness criteria that every feature, batch, and release artifact must satisfy before being considered complete.

---

## 2. Technical Quality Gates (Mandatory Verification)

Every batch and feature implementation must execute and pass the following three commands without errors:

1. **Typecheck & Lint Verification**:
   ```bash
   npm run check
   ```
   - Must achieve 0 TypeScript errors (`tsc --noEmit`).
   - Must achieve 0 ESLint warnings or errors (`expo lint`).

2. **Environment & Dependency Diagnostics**:
   ```bash
   npm run doctor
   ```
   - Must pass all Expo dependency compatibility and configuration checks cleanly.

3. **Whitespace & Git Hygiene**:
   ```bash
   git diff --check
   ```
   - Must report zero trailing whitespace, conflict markers, or malformed diff lines.

---

## 3. Architecture & Code Standard Rules

- **No Direct SDK Calls in Screens**: Screens in `src/app/` must not call Firebase SDK or Supabase SDK functions directly. All operations pass through custom feature hooks and repositories.
- **Firebase Authentication**: Firebase Auth is the sole application authentication provider.
- **Firestore Data Store**: Cloud Firestore stores all application data.
- **Supabase Storage**: Supabase Storage (`public-media` bucket) handles file storage via Firebase Auth ID token verification. No Supabase Auth sessions are created.
- **Canonical Enums**:
  - Roles must strictly be `"customer" | "barber" | "admin"`.
  - Booking statuses must strictly be `"pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"`.
- **Production Path Integrity**: No fake OTP, fake social login bypasses, random payment outcomes (`Math.random() > 0.1`), or hidden mock fallbacks in production repositories.
- **Scope Compliance**: Out-of-scope features (Payment gateway, AI recommendation, advanced maps, file chat, push notifications) must not be added.

---

## 4. Thesis Feature Requirement Verification (F-01 to F-31)

| Actor | Range | Requirements Covered | Verification Status |
| --- | --- | --- | --- |
| Customer | F-01 to F-13, F-31 | Registration, Login, Profile, Barber List/Detail/Services, Service/Date Selection, Location, Booking Creation, Status, History, Rating & Review, Real-Time Text Chat | Must be verified against live Firestore listeners |
| Barber | F-14 to F-23, F-31 | Registration, Login, Profile, Services, Prices, Schedule, Requests, Accept/Reject, Status Update, Transaction History, Real-Time Text Chat | Must be verified in `src/app/(barber)` screen routes |
| Admin | F-24 to F-30 | Login, Barber Verification, Customer/Barber Management, Categories, Booking Monitor, Reports | Must be verified in `src/app/(admin)` screen routes |

---

## 5. Dashboard & Environment Action Verification

- All manual actions in `docs/development/manual-actions.md` marked as `MANUAL ACTION REQUIRED` must be completed and verified in their respective console environments (Firebase Console, Supabase Dashboard).
- Automatic git commits are disabled. Code modifications must remain unstaged or staged for manual user review.
