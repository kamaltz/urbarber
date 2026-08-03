# Screen Identity

- Frame name: PROFILE - HELP
- Figma node: 8062:2660
- Dimensions: 375 x 928
- Platform target: Expo React Native (Android-first), TypeScript, Expo Router, NativeWind v4
- Actor: Customer
- Proposed route: src/app/(customer)/profile/help.tsx
- Purpose: Help/contact form so users can send support descriptions.

# Flow Position

- Entered from customer profile settings.
- Intended as a support branch, then returns to profile or shows a submission confirmation.

# Layout Structure

- Top navigation bar with back arrow and title "Bantuan".
- Intro block with dual message icon, headline, and helper description copy.
- Form block with three inputs:
- Name (prefilled sample)
- Email (prefilled sample)
- Description text area with placeholder
- Primary bottom CTA button "Kirim".

# Visual Properties

- Background: white.
- Brand accent: orange (#d2691e) for CTA and icon emphasis.
- Headline color: primary brand dark (#363062).
- Secondary body text: primary brand muted (#8683A1).
- Field border: cool gray (#D1D5DB), rounded corners.

# Reusable Components

- Top navigation bar
- Intro icon+copy block
- Labeled text field
- Labeled text area
- Primary full-width button

# Interaction and Navigation

- Back arrow returns to previous profile route.
- Name and email fields are editable in this frame style.
- Description area accepts long-form free text.
- "Kirim" submits support request payload.

# Data Contract

- helpRequestId: string (generated after submit)
- userId: string
- userName: string
- userEmail: string
- description: string
- submittedAt: string (ISO timestamp)
- status: "draft" | "submitted"

# Validation Rules

- userName is required.
- userEmail is required and must be valid email format.
- description is required.
- Submit should be blocked while required fields are empty.

# React Native Mapping

- SafeAreaView
- ScrollView
- View
- Text
- TextInput
- Pressable

# NativeWind Mapping

- bg-white
- text-slate-900
- text-slate-400
- border
- border-slate-300
- rounded-lg
- px-3 / px-4
- py-3 / py-4
- bg-orange-700
- text-white

# Component Tree

- ProfileHelpScreen
- TopNavigationBar
- HelpIntroSection
- HelpForm
- NameField
- EmailField
- DescriptionField
- SubmitButton

# States

- default
- draft (partially filled)
- submitting
- submitted
- validation_error

# Implementation Notes

- Keep this as documentation-only for now; no implementation code.
- Firebase integration is planned later. Support submission persistence is NEEDS_CONFIRMATION (Firestore collection shape not finalized).
