# Screen identity

- Frame name: BOOKING - FIX LOCATION OTH
- Node ID: 8238:5491
- Exact frame dimensions: 375 x 812
- Purpose: Confirm and refine the chosen booking location before payment.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/fix-location.tsx

# Relationship to existing screens

- Follows the location selection screen.
- Precedes the save-location confirmation or payment screen.
- This screen lets the customer review the selected map location and address.

# Layout structure

- Top status and navigation header.
- Map preview area with the selected marker.
- Current address field with editable text.
- A secondary address field for the customer’s location label or alternative address.
- Payment summary section with itemized booking costs.
- Primary button to pay now or save the location.

# Visual properties

- Background: white.
- The map area sits behind rounded panels and uses a light drop shadow.
- Input card surfaces: white with light gray borders.
- Accent color: orange for buttons and action states.
- Headings: dark gray; body text: muted gray.

# Reusable components

- Map preview
- Address input field
- Location summary row
- Pricing summary card
- Primary CTA button

# Interaction and navigation

- Tap address fields to edit the selected location.
- Scroll details for location and summary content.
- Tap the CTA to confirm the address and move to save-location or payment.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `selectedLocation`
  - Type: `{ address: string; latitude: number; longitude: number }`
  - Required: yes
- `currentAddress`
  - Type: `string`
  - Required: yes
- `locationLabel`
  - Type: `string`
  - Required: no
- `servicePrice`
  - Type: `string`
  - Required: yes
- `extras`
  - Type: `Array<{ label: string; amount: string }>`
  - Required: no
- `totalPrice`
  - Type: `string`
  - Required: yes

# Booking flow position

- This confirms the final location for an OTH booking.
- It is a refinement step before the user saves the location or continues to payment.

# Validation rules

- `selectedLocation` must be valid.
- `currentAddress` should match the displayed map pin.
- `totalPrice` must be present and in the expected currency format.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `TextInput`
- `Pressable`
- `Image`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `border`
- `border-slate-200`
- `rounded-xl`
- `px-4`
- `py-3`
- `text-slate-900`
- `text-slate-500`
- `bg-orange-600`
- `text-white`

# Component tree

- BookingFixLocationScreen
  - RootSafeArea
    - StatusBar
    - NavigationHeader
    - MapPreviewSection
    - AddressFields
    - CostSummarySection
    - ConfirmButton

# States

- Editing address
- Location preview active
- Payment summary visible
- Confirm button enabled
