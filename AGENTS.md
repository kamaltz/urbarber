# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Permanent Project Rules & Agent Directives

## Architecture & Technology Stack
- Framework: Expo Router (v57.0.0+), TypeScript strict mode, NativeWind (Tailwind CSS v3).
- Primary Authentication: **Firebase Authentication** is the sole application authentication provider.
- Core Application Database: **Cloud Firestore** stores all application business data.
- Asset & File Storage: **Supabase Storage** is used strictly for file storage (avatars, barber photos, service images, verification documents).
- Supabase Integration: Access Supabase using Firebase Auth ID token (`accessToken` callback in `src/lib/supabase.ts`). **Do not create Supabase Auth sessions.**

## Separation of Concerns & Repository Pattern
- **Screens must NEVER call Firebase or Supabase directly.**
- All data access must pass through repository and service modules under `src/features/*/repository` or `src/features/services/`.
- Maintain clean layering: Screen Component -> Custom Feature Hook -> Service / Repository -> Firebase / Supabase SDK.

## Canonical Domain Models & Enums
- Canonical Roles: `customer`, `barber`, `admin`.
- Canonical Booking Statuses:
  - `pending` (initial request created by customer)
  - `accepted` (confirmed by barber)
  - `rejected` (declined by barber)
  - `in_progress` (service currently underway)
  - `completed` (service finished)
  - `cancelled` (cancelled by customer or barber)

## Quality & Integrity Standards
- **Production Path Integrity**: Do NOT add fake OTP logic, fake social login bypasses, random payment results (`Math.random() > 0.1`), or hidden mock fallbacks in production execution paths.
- **Strict Scope Boundaries**: Do NOT implement payment gateway integrations (e.g. Stripe/Midtrans), AI recommendations, advanced map pickers/GPS tracking, file chat, or push notifications unless explicitly requested later.
- **Preserve Visual Documentation**: Maintain alignment with Figma screen definitions in `docs/figma/`.
- **Required Validation Commands**:
  - `npm run check` (Runs typecheck and linting)
  - `npm run doctor` (Runs Expo doctor)
  - `git diff --check` (Audits whitespace & conflict markers)
- **Git Commit Directive**: Do NOT commit git changes automatically.
- **Manual Dashboard Operations**: Always mark dashboard-only environment actions clearly as `MANUAL ACTION REQUIRED`.
