# Screen Identity

- Frame name: PROFILE BARBER - LOADING
- Figma node: 8120:8865
- Dimensions: 375 x 695
- Platform target: Expo React Native (Android-first), TypeScript, Expo Router, NativeWind v4
- Actor: Barber (applicant)
- Proposed route: src/app/(barber)/verification/status.tsx
- Purpose: Verification processing state after submission.

# Flow Position

- Follows successful submission of barber verification data.
- Precedes outcome states (approved/rejected) or return to profile.

# Layout Structure

- Top navigation bar with title "Pengajuan".
- Center icon (process/refresh style).
- Centered status copy: "Pengajuan Akun Barber Sedang Diproses".
- Bottom primary CTA "Kembali".

# Visual Properties

- White background and minimal, focused layout.
- Orange icon and CTA accents.
- Headline uses primary brand dark tone.

# Reusable Components

- Top navigation bar
- Status icon block
- Centered status headline
- Primary bottom button

# Interaction and Navigation

- User can return via back arrow or "Kembali".
- No edit fields present in this state.

# Data Contract

- barberId: string
- verificationStatus: "not_submitted" | "draft" | "submitted" | "under_review" | "approved" | "rejected"
- identityFields: NEEDS_CONFIRMATION in this screen context (not visible)
- documentTypes: NEEDS_CONFIRMATION in this screen context (not visible)
- uploadedDocumentPlaceholders: NEEDS_CONFIRMATION in this screen context (not visible)
- submissionTimestamp: string (expected from prior submission step)
- adminReviewState: "under_review" for this frame intent
- rejectionReason: string | null
- resubmissionState: boolean
- privacyConcerns: review/retention policy text not shown (NEEDS_CONFIRMATION)
- fileSizeRestrictions: not visible
- cameraGalleryInteraction: not visible

# Validation Rules

- When shown, verificationStatus should map to under_review state.
- Back action must remain available.
- Processing copy should be prominent and legible.

# React Native Mapping

- SafeAreaView
- View
- Text
- Pressable

# NativeWind Mapping

- bg-white
- text-slate-900
- text-brand-900 (mapped token)
- items-center
- justify-center
- px-4
- py-4
- bg-orange-700
- rounded-lg
- text-white

# Component Tree

- VerifyProcessScreen
- TopNavigationBar
- ProcessingStateBlock
- ProcessIcon
- ProcessHeadline
- BackButton

# States

- under_review (primary)
- approved (future transition)
- rejected (future transition)
- back_pressed

# Implementation Notes

- Keep this as documentation-only; no implementation code.
- This frame represents a status-only step; no upload interactions appear.
- Storage strategy remains explicit and undecided at product level:
- Firebase Storage
- placeholder-only prototype
- local simulated data
- Final decision: NEEDS_CONFIRMATION.
