# Screen identity

- Frame name: CHOOSE BARBER
- Node ID: 8065:2614
- Exact frame dimensions: 375 x 812
- Purpose: Customer selection screen for choosing a barber after location selection.
- Intended actor: Customer
- Proposed route: src/app/(customer)/choose-barber.tsx

# Layout structure

- Header with back navigation and screen title.
- Scrollable content area with barber listing.
- Each barber card includes profile image, name, status, services, rating, and price.
- Bottom fixed button to continue with the selected barber.

# Visual properties

- White background with orange/tan accents.
- Card elevation with subtle shadow and rounded corners.
- Status labels within cards using pill styling.
- Price text highlighted in dark and accent orange.
- Star rating icons with numeric values.

# Reusable components

- Barber profile card
- Tag pill
- Rating row
- Price row
- Continue button

# Interaction and navigation

- Tap barber card to select a barber.
- Continue button likely navigates to the booking confirmation flow.
- Scrollable list for available barbers.

# Data contract

- `barberId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: barber profile fixture
  - Firestore collection: `barbers`
  - Editable: no
- `barberName`
  - TypeScript type: `string`
  - Required: yes
  - Firestore collection: `barbers`
  - Editable: no
- `profileImageUrl`
  - TypeScript type: `string`
  - Required: optional
  - Firestore collection: `barbers`
  - Editable: no
- `availabilityStatus`
  - TypeScript type: `"available" | "busy" | "offline"`
  - Required: optional
  - Firestore collection: `barbers/status`
  - Editable: no
- `serviceDescription`
  - TypeScript type: `string`
  - Required: yes
  - Firestore collection: `barbers/services`
  - Editable: no
- `rating`
  - TypeScript type: `number`
  - Required: optional
  - Firestore collection: `barbers/reviews`
  - Editable: no
- `price`
  - TypeScript type: `number`
  - Required: yes
  - Firestore collection: `barbers/pricing`
  - Editable: no

# React Native mapping

- `View`, `Text`, `Image`, `Pressable`, `ScrollView`, `SafeAreaView`

# NativeWind mapping

- `bg-white`, `rounded-2xl`, `shadow`, `text-slate-900`, `text-orange-600`, `px-4`, `py-4`

# Component tree

- ChooseBarberScreen
  - RootSafeArea
    - Header
    - BarberListScrollView
      - BarberCard
        - ProfileImage
        - NameAndStatus
        - ServiceDescription
        - RatingAndPriceRow
    - ContinueButton

# States

- Default list state
- Selected barber highlight state
- Empty search / no barber state: not shown; NEEDS_CONFIRMATION
- Loading state: not shown

# Implementation notes

- Use `Pressable` on each card so selection is clear.
- The bottom button should remain accessible on smaller screens.
- The frame suggests a single default selected card with a strong visual highlight.
- The screen is part of the customer discovery and booking flow.
