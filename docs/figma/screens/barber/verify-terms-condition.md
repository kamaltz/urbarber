# Screen Identity

- Frame name: Terms & Conditions - Barber
- Figma node: 8208:3251
- Dimensions: 375 x 1380
- Platform target: Expo React Native (Android-first), TypeScript, Expo Router, NativeWind v4
- Actor: Barber (applicant)
- Proposed route: src/app/(barber)/verification/terms.tsx
- Purpose: Legal and submission requirements page shown before/within barber verification.

# Flow Position

- Shown before identity and submission confirmation screens.
- Usually accessed from verification onboarding or agreement link.

# Layout Structure

- Top navigation bar with title "Syarat dan Ketentuan".
- Long scrollable legal copy with numbered sections.
- Bottom fixed CTA button "Kembali".

# Visual Properties

- White background with high text density.
- Orange heading highlight for section title.
- Black/gray body copy for readability.
- Primary orange action button.

# Reusable Components

- Top navigation bar
- Legal text content block
- Numbered/bulleted policy text renderer
- Bottom fixed primary button

# Interaction and Navigation

- User scrolls through terms content.
- Back arrow and "Kembali" return to prior step.
- No accept checkbox shown in this specific frame.

# Data Contract

- barberId: string
- verificationStatus: "not_submitted" | "draft" | "submitted" | "under_review" | "approved" | "rejected"
- termsVersion: string (NEEDS_CONFIRMATION)
- termsAccepted: boolean (NEEDS_CONFIRMATION in this frame because no checkbox is shown)
- termsAcceptedAt: string (submission timestamp, NEEDS_CONFIRMATION)
- identityFields: NEEDS_CONFIRMATION (not shown in this frame)
- documentTypes: visible in policy copy (KTP, selfie dengan KTP, foto barbershop, sertifikasi, surat keterangan usaha)
- uploadedDocumentPlaceholders: NEEDS_CONFIRMATION (not shown in this frame)
- adminReviewState: "not_submitted" | "under_review" | "approved" | "rejected" (state model for downstream flow)
- rejectionReason: string | null (NEEDS_CONFIRMATION, not shown)
- resubmissionState: boolean (NEEDS_CONFIRMATION, not shown)
- privacyConcerns: includes identity and KTP handling requirements in text; retention/encryption policy NEEDS_CONFIRMATION
- fileSizeRestrictions: not explicitly visible in this frame (NEEDS_CONFIRMATION)
- cameraGalleryInteraction: not visible in this frame (NEEDS_CONFIRMATION)

# Validation Rules

- Terms content must be scrollable and fully readable.
- Navigation controls must remain accessible.
- If acceptance is required by product flow, enforcement rules are NEEDS_CONFIRMATION.

# React Native Mapping

- SafeAreaView
- ScrollView
- View
- Text
- Pressable

# NativeWind Mapping

- bg-white
- text-slate-900
- text-slate-700
- leading-5
- px-4
- py-3
- bg-orange-700
- rounded-lg

# Component Tree

- VerifyTermsConditionScreen
- TopNavigationBar
- TermsHeader
- TermsScrollableBody
- BackButton

# States

- default
- scrolled
- back_pressed
- verification_status_contextualized (not_submitted | draft | submitted | under_review | approved | rejected)

# Implementation Notes

- Keep this as documentation-only; no implementation code.
- Upload handling is not implemented here.
- Future upload architecture decision is explicit: Firebase Storage vs placeholder-only prototype vs local simulated data is NEEDS_CONFIRMATION.
