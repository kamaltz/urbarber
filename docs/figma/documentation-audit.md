# Documentation Audit

Scope audited:
- docs/figma/screens/
- docs/figma/screen-index.md

Audit method:
- Static audit only from existing documentation files.
- No Figma MCP call was made in this audit pass.

## 1. All Documented Screens

Total documented files under docs/figma/screens: 54.

Distribution by actor:
- Admin: 2
- User: 7
- Customer: 32
- Barber: 13

Canonical complete list is normalized in docs/figma/screen-index.md with continuous numbering 1-54.

## 2. Duplicate Screens

Duplicate by Node ID (same visual frame documented for multiple actors):

- Node 8064:4386
- docs/figma/screens/customer/chat.md
- docs/figma/screens/admin/chat.md
- docs/figma/screens/barber/chat.md
- Interpretation: Shared chat room frame reused by role.

- Node 8064:4154
- docs/figma/screens/customer/list-chat.md
- docs/figma/screens/admin/list-chat.md
- docs/figma/screens/barber/list-chat.md
- Interpretation: Shared chat list frame reused by role.

Conclusion:
- These are intentional cross-actor duplicates and should be implemented as shared components plus role-aware containers.

## 3. Frames That Are Only States or Variants

Classified as state:
- docs/figma/screens/barber/verify-process.md
- docs/figma/screens/customer/booking/booking-active-booked.md
- docs/figma/screens/customer/booking/booking-active-waiting.md
- docs/figma/screens/customer/booking/booking-active-on-process.md
- docs/figma/screens/customer/booking/booking-active-finished.md
- docs/figma/screens/customer/booking-cancelled.md
- docs/figma/screens/customer/booking/booking-fix-location.md
- docs/figma/screens/customer/booking/booking-save-location.md

Classified as variant:
- docs/figma/screens/onboard1.md
- docs/figma/screens/onboard2.md
- docs/figma/screens/onboard3.md
- docs/figma/screens/customer/home-filter.md
- docs/figma/screens/customer/home-explore.md
- docs/figma/screens/customer/home-booked.md

## 4. Screens That Should Share One Dynamic Route

Recommended dynamic-route consolidation:

- Chat room by actor:
- Current: src/app/(customer)/chat/[conversationId].tsx, src/app/(admin)/chat/[conversationId].tsx, src/app/(barber)/chat/[conversationId].tsx
- Consolidation target: shared chat-room component + role-scoped wrappers.

- Chat list by actor:
- Current: src/app/(customer)/chat/index.tsx, src/app/(admin)/chat/index.tsx, src/app/(barber)/chat/index.tsx
- Consolidation target: shared chat-list component + role-scoped wrappers.

- Booking active status set:
- Current: booked, waiting, on-process, finished, cancelled as separate routes.
- Consolidation target: src/app/(customer)/booking/status/[status].tsx.

- Onboarding steps:
- Current docs: onboard, onboard1, onboard2, onboard3.
- Consolidation target: single flow route with step param, for example src/app/(auth)/onboarding/[step].tsx.

- Verification steps (barber applicant):
- Current: terms, submission, identity, status.
- Consolidation target: single workflow route with step key, or one parent route with internal state machine.

## 5. Inconsistent File Names

Detected naming inconsistencies:

- docs/figma/screens/auth/register-customer.md
- Screen label is REGIST (should be REGISTER for consistency).

- docs/figma/screens/customer/terms-condition.md
- Singular condition naming is inconsistent with common terms-and-conditions naming.

- docs/figma/screens/barber/verify-terms-condition.md
- Same singular pattern inconsistency as customer terms doc.

- docs/figma/screens/customer/booking-cancelled.md
- Filename uses cancelled while frame text uses CANCELED.

- docs/figma/screens/onboard1.md
- docs/figma/screens/onboard2.md
- docs/figma/screens/onboard3.md
- Step files use numeric suffixes without semantic names (harder to maintain).

- docs/figma/screens/customer/booking/booking-active-on-process.md
- Mixed phrase style on-process vs other naming tokens.

## 6. Inconsistent Proposed Routes

Route inconsistencies or ambiguities:

- docs/figma/screens/customer/booking-detail.md
- Proposed route: src/app/(customer)/booking/review.tsx
- Mismatch: screen identity is booking detail, but route suggests review-only intent.

- docs/figma/screens/customer/home-explore.md
- Proposed route resolved to shared home route: src/app/(customer)/home.tsx.

- docs/figma/screens/customer/home-booked.md
- Proposed route resolved to shared home route: src/app/(customer)/home.tsx.

- docs/figma/screens/onboard.md
- docs/figma/screens/onboard1.md
- docs/figma/screens/onboard2.md
- docs/figma/screens/onboard3.md
- Proposed route resolved to shared dynamic route: src/app/(auth)/onboarding/[step].tsx.

- Cross-actor chat paths are consistent structurally, but should share one reusable implementation pattern.

## 7. Missing Documentation

Missing or partial documentation issues:

- Index normalization was previously fragmented into multiple table formats; now unified in docs/figma/screen-index.md.

- Missing route assignments have been resolved for onboarding and home variants.
- Current partial status now primarily comes from screen-state details that are not visible in source frames.

- Metadata style inconsistency across docs:
- Some use Screen name/Figma node ID/Proposed Expo Router route
- Some use Frame name/Node ID/Proposed route
- This should be standardized in a later cleanup pass.

## 8. Screens Required by Research Requirements but Absent From Figma

Based on the current actor model and operational scope implied by existing docs, the following are likely required but are not represented as dedicated Figma-documented screens in docs/figma/screens:

- Admin dashboard/overview screen (non-chat operational entry).
- Admin moderation or dispute-resolution screen for bookings.
- Admin verification queue screen for barber approvals at scale.
- Admin analytics/performance screen.
- Unified notifications/inbox center across all actors.
- Explicit empty/error/offline state frames for core flows (auth, booking, chat).

All items above are NEEDS_CONFIRMATION against the final research baseline.

## 9. Reusable Components Shared Across Actors

High-reuse candidates identified from duplicated and parallel docs:

- ChatRoomScreenShell
- Shared by customer, barber, admin chat room screens.

- ChatListScreenShell
- Shared by customer, barber, admin chat list screens.

- TopNavigationBar
- Present across auth, customer, barber operational docs.

- BottomTabBarContainer
- Shared by role tab-based home/operations screens.

- BookingStatusBadge
- Shared across booking active/cancelled/history/review contexts.

- RatingStarsDisplay
- Shared across customer review submission and barber review reading.

- ServiceCard and ServiceFormModal
- Shared across barber services and customer booking service selection patterns.

## 10. Proposed Implementation Batches

Batch 1: Foundation and shared primitives
- Build shared navigation shell, typography, spacing tokens, color tokens, and role-aware layout wrappers.
- Build shared chat list and chat room components from duplicate nodes 8064:4154 and 8064:4386.

Batch 2: Auth and onboarding
- Implement login, forgot-password, authentication, register-customer.
- Consolidate onboarding into one dynamic flow and finalize unresolved onboarding routes.

Batch 3: Customer booking flow core
- Implement barber discovery, booking option/schedule/location, booking detail/invoice/history.
- Collapse booking status states into one dynamic status route.

Batch 4: Barber operations core
- Implement booking list/detail, services, add-service modal, schedule, analysis, rating-review.
- Wire service modal as reusable component host path in feature layer.

Batch 5: Verification, profile, and hardening
- Implement barber verification sequence and customer profile set.
- Add explicit empty/error/loading/offline states and finalize unresolved routes.
- Resolve naming and route inconsistencies from sections 5 and 6.
