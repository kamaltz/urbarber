# Screen Identity

- Frame name: PROFILE BARBER - SUBMISSION
- Figma node: 8187:4758
- Dimensions: 375 x 1120
- Platform target: Expo React Native (Android-first), TypeScript, Expo Router, NativeWind v4
- Actor: Barber (applicant)
- Proposed route: src/app/(barber)/verification/identity.tsx
- Purpose: Identity verification step for KTP data and selfie/KTP photo capture.

# Flow Position

- Follows base submission/terms entry.
- Precedes admin review state screen.

# Layout Structure

- Top navigation bar with title "Pengajuan".
- Intro copy focused on identity verification.
- Two text fields:
- Nama (sesuai KTP)
- Nomor Induk Kependudukan
- Upload section 1: "Upload Foto KTP" with camera action card "Ambil Foto".
- Upload section 2: "Upload Foto Selfie Memegang KTP" with camera action card "Ambil Foto".
- Consent row with checkbox and link to "Syarat & Ketentuan".
- Bottom CTA button "Kirim".

# Visual Properties

- White background with orange action highlights.
- Upload placeholders are boxed and visually prominent.
- Helper notes under upload boxes use muted text.
- Terms link appears as blue underlined text.

# Reusable Components

- Top navigation bar
- Labeled text field
- Upload placeholder card
- Camera action tile
- Consent checkbox + linked text
- Primary submit button

# Interaction and Navigation

- User enters name and NIK according to KTP.
- User captures/uploads KTP image.
- User captures/uploads selfie while holding KTP.
- User checks consent checkbox and can open terms.
- "Kirim" submits verification package.

# Data Contract

- barberId: string
- verificationStatus: "not_submitted" | "draft" | "submitted" | "under_review" | "approved" | "rejected"
- identityFields:
- legalName: string
- nik: string
- documentTypes:
- ktp_photo
- selfie_with_ktp_photo
- uploadedDocumentPlaceholders:
- ktpPhotoFile: FileRef | null
- selfieWithKtpFile: FileRef | null
- submissionTimestamp: string
- adminReviewState: "not_submitted" | "under_review" | "approved" | "rejected"
- rejectionReason: string | null
- resubmissionState: boolean
- privacyConcerns: highly sensitive identity data (KTP + selfie); masking, retention, and consent copy beyond shown text are NEEDS_CONFIRMATION
- fileSizeRestrictions: not explicitly shown on this frame (NEEDS_CONFIRMATION)
- cameraGalleryInteraction:
- camera capture is visible ("Ambil Foto")
- gallery picker option is NEEDS_CONFIRMATION

# Validation Rules

- legalName is required and should match official KTP data.
- nik is required and should be numeric format; exact length rule NEEDS_CONFIRMATION.
- ktpPhotoFile and selfieWithKtpFile are required before submitted state.
- terms consent checkbox must be true before submit.

# React Native Mapping

- SafeAreaView
- ScrollView
- View
- Text
- TextInput
- Pressable
- Image

# NativeWind Mapping

- bg-white
- border
- border-slate-300
- rounded-lg
- text-slate-900
- text-slate-400
- underline
- px-3
- py-3
- bg-orange-700
- text-white

# Component Tree

- VerifyIdentityScreen
- TopNavigationBar
- IdentityIntro
- IdentityFieldGroup
- KtpUploadCard
- SelfieWithKtpUploadCard
- ConsentRow
- SubmitButton

# States

- not_submitted
- draft
- submitted
- under_review
- approved
- rejected
- resubmission

# Implementation Notes

- Keep this as documentation-only; no implementation code.
- Upload backend is undecided in design and must be explicit in planning:
- Option A: Firebase Storage
- Option B: placeholder-only prototype
- Option C: local simulated data
- Final choice: NEEDS_CONFIRMATION.
