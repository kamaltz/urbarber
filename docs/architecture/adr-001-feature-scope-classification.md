# ADR-001: Feature Scope Classification Strategy

## Context
During initial repository development, features were loosely grouped without explicit boundaries between mandatory thesis MVP deliverables, optional UX enhancements, and third-party demonstration features. This created ambiguity regarding acceptance gates, deployment dependencies, and testing priorities.

## Decision
We establish a binding, three-tier scope classification structure for all application features:
1. **Core Thesis MVP (F-01 to F-31)**: Mandatory requirements necessary for core value proposition delivery. Must be fully functional, Firestore-backed, and security-rule verified to pass thesis defense. Includes real-time text chat (F-31) and manual location address input.
2. **Preferred Core Enhancement (E-01)**: Optional UX enhancements (e.g. E-01 Interactive Booking Location Picker) that improve user experience but depend on custom Expo development builds. Must have a mandatory text-based fallback (manual address input) so core application flows remain 100% functional when the enhancement is unavailable.
3. **Additional Demonstration Feature (A-01)**: Optional external integrations (e.g. A-01 Midtrans Snap Sandbox Payment) integrated for proof-of-concept purposes. Must be decoupled from core booking processing so third-party sandbox downtime does not block core MVP completion.

## Alternatives Considered
- **All-in-One Mandatory Scope**: Marking all features (map, payment gateway, chat) as mandatory MVP gates. Rejected because third-party service failures or Expo Go limitations would block thesis completion.
- **Pure MVP without Maps or Payments**: Excluding maps and payments entirely. Rejected because having a free-first map picker and sandbox payment demonstration adds significant academic and practical value to the thesis.

## Consequences
- Developers and reviewers have clear, unambiguous criteria for what constitutes a blocker.
- Automated test suites can validate Core MVP flows independently of external Sandbox availability.
- Fallback paths (manual address input, cash on service) must be maintained and verified alongside enhancements.

## Security Considerations
- Out-of-scope features (e.g. Midtrans Production, chat file attachments, live GPS tracking) cannot be secretly introduced or bypassed.
- Each tier must adhere to strict role-based access control and security rules.

## Validation Gate
- Core Thesis MVP features must pass automated unit tests, Firestore rules integration tests, and live emulator/staged execution before release.

## Current Status
- **Accepted & Active** (Adopted in Batch 01).
