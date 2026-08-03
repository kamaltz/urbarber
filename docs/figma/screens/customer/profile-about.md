# Screen Identity

- Frame name: PROFILE - ABOUT
- Figma node: 8062:3560
- Dimensions: 375 x 847
- Platform target: Expo React Native (Android-first), TypeScript, Expo Router, NativeWind v4
- Actor: Customer
- Proposed route: src/app/(customer)/profile/about.tsx
- Purpose: About page describing URBARBER and linking to app rating action.

# Flow Position

- Entered from customer profile settings.
- Returns back to profile settings through "Kembali".

# Layout Structure

- Top navigation bar with title "Tentang".
- Orange branded hero area with logo artwork.
- White rounded top container with:
- Section title "Tentang URBARBER"
- Paragraph description text
- CTA row "Berikan penilaian untuk aplikasi ini"
- Bottom primary button "Kembali"
- Home indicator at bottom of canvas in the frame.

# Visual Properties

- Dominant accent background: #d2691e.
- Surface cards: white with large rounded top corners.
- Body copy: dark gray and muted gray hierarchy.
- CTA row uses subtle divider line and right chevron.

# Reusable Components

- Top navigation bar
- Branded hero block
- Content card with rounded top corners
- Inline CTA row
- Primary button

# Interaction and Navigation

- Back arrow navigates to previous profile route.
- "Berikan penilaian untuk aplikasi ini" opens app rating flow (store/deep link target NEEDS_CONFIRMATION).
- "Kembali" returns to previous profile page.

# Data Contract

- aboutTitle: string
- aboutBody: string
- ratingCtaLabel: string
- backCtaLabel: string
- versionLabel: string (NEEDS_CONFIRMATION, not visible in this frame)

# Validation Rules

- aboutTitle and aboutBody must be present.
- rating CTA must be tappable and visually distinct.
- Back action must always be available.

# React Native Mapping

- SafeAreaView
- View
- Text
- Pressable
- ScrollView
- Image

# NativeWind Mapping

- bg-orange-700
- bg-white
- rounded-t-3xl
- text-slate-900
- text-slate-500
- border-b
- border-slate-100
- px-4
- py-4

# Component Tree

- ProfileAboutScreen
- TopNavigationBar
- HeroBrandSection
- AboutContentCard
- AboutTextSection
- RateAppRow
- BackButton

# States

- default
- cta_pressed
- back_pressed

# Implementation Notes

- Keep this as documentation-only for now; no implementation code.
- Firebase is not required for static about content unless content will be remote-managed. Remote CMS/Firebase-backed content is NEEDS_CONFIRMATION.
