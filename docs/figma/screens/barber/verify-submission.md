# Screen Identity

- Frame name: PROFILE BARBER - SUBMISSION
- Figma node: 8116:8153
- Dimensions: 375 x 1101
- Platform target: Expo React Native (Android-first), TypeScript, Expo Router, NativeWind v4
- Actor: Barber (applicant)
- Proposed route: src/app/(barber)/verification/submission.tsx
- Purpose: Main barber submission form for business profile and supporting documents.

# Flow Position

- Follows terms and conditions.
- Precedes identity-specific verification and review state screens.

# Layout Structure

- Top navigation bar with title "Pengajuan".
- Intro icon and copy block "Pengajuan Akun Barber".
- Identity/business input fields:
- Nama Barber
- Nama Pemilik
- Alamat
- Email
- Document upload fields:
- Unggah Foto Barbershop
- Unggah Dokumen Setifikasi Barber
- Unggah Dokumen Surat Keterangan Usaha
- Each upload row shows helper text: "Format: .jpg/ .png/ .pdf Max 10MB".
- Bottom CTA button "Lanjut".

# Visual Properties

- White background and orange primary actions.
- Input fields outlined in cool gray.
- Placeholder text uses translucent dark gray.
- Upload affordances use document/file icon treatment.

# Reusable Components

- Top navigation bar
- Intro copy block
- Labeled input field
- Labeled file picker field
- Upload helper text row
- Primary button

# Interaction and Navigation

- User fills business profile fields.
- User chooses files for each required upload slot.
- "Lanjut" advances to next verification step.
- Back arrow returns to previous step.

# Data Contract

- barberId: string
- verificationStatus: "not_submitted" | "draft" | "submitted" | "under_review" | "approved" | "rejected"
- identityFields:
- barberShopName: string
- ownerName: string
- address: string
- email: string
- documentTypes:
- shop_photo
- barber_certificate
- business_license_sku
- uploadedDocumentPlaceholders:
- shopPhotoFile: FileRef | null
- certificateFile: FileRef | null
- skuFile: FileRef | null
- fileSizeRestrictions: max 10MB (visible)
- allowedExtensions: .jpg | .png | .pdf (visible)
- submissionTimestamp: string (set when status becomes submitted)
- adminReviewState: "not_submitted" | "under_review" | "approved" | "rejected"
- rejectionReason: string | null
- resubmissionState: boolean
- privacyConcerns: business/legal document PII handling required; retention/encryption policy NEEDS_CONFIRMATION
- cameraGalleryInteraction: not visible in this frame for these uploads (NEEDS_CONFIRMATION)

# Validation Rules

- barberShopName, ownerName, address, email are required.
- email must be valid format.
- each required upload slot must contain one file before submitted state.
- file extension must match .jpg/.png/.pdf.
- file size must be <= 10MB.

# React Native Mapping

- SafeAreaView
- ScrollView
- View
- Text
- TextInput
- Pressable

# NativeWind Mapping

- bg-white
- border
- border-slate-300
- rounded-lg
- text-slate-900
- text-slate-500
- px-3
- py-3
- bg-orange-700
- text-white

# Component Tree

- VerifySubmissionScreen
- TopNavigationBar
- SubmissionIntro
- BusinessIdentityForm
- DocumentUploadSection
- UploadFieldRow
- ContinueButton

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
- Upload persistence decision must be explicit and is not finalized in Figma:
- Option A: Firebase Storage (plus Firestore metadata)
- Option B: placeholder-only prototype
- Option C: local simulated data
- Final choice: NEEDS_CONFIRMATION.
