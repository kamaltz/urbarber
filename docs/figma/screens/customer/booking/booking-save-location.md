# Screen identity

- Frame name: BOOKING OTH - SAVE LOCATION
- Node ID: 8244:22415
- Exact frame dimensions: 375 x 812
- Purpose: Save the customer’s selected booking location and confirm address details.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/save-location.tsx

# Relationship to existing screens

- Follows fix-location and location confirmation.
- Precedes booking status or payment confirmation.
- This screen captures the final saved address for an OTH booking.

# Layout structure

- Base white screen with a large rounded location sheet.
- Map preview and address confirmation section.
- Selected location details with a small map pin or icon.
- Saved address card with location name, district, and city.
- Primary action button to add the location and continue.
- Persistent home indicator bar for modal-like flow.

# Visual properties

- Background: white.
- Sheets and cards: white with large rounded corners.
- Accent color: orange for the primary CTA.
- Text: dark gray for headings and black for address details.
- Secondary icons: map and edit icons in gray.

# Reusable components

- Location confirmation card
- Saved address card
- Primary CTA button
- Home indicator bar

# Interaction and navigation

- Tap the saved address card to choose an address.
- Tap the edit icon to adjust the saved location.
- Tap the primary button to add the location and proceed.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `savedAddress`
  - Type: `{ label: string; street: string; district: string; city: string }`
  - Required: yes
- `locationName`
  - Type: `string`
  - Required: yes
- `locationDetails`
  - Type: `string`
  - Required: yes
- `totalPrice`
  - Type: `string`
  - Required: yes

# Booking flow position

- This is the final save-location step for on-the-spot bookings.
- It submits the confirmed address before payment or booking status.

# Validation rules

- `savedAddress` must be populated.
- `locationName` and `locationDetails` should not be empty.
- The CTA should only be enabled after confirmation.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Pressable`
- `ScrollView`
- `Image`

# NativeWind mapping

- `bg-white`
- `bg-orange-600`
- `text-white`
- `rounded-3xl`
- `rounded-xl`
- `px-4`
- `py-3`
- `text-slate-900`
- `text-slate-500`

# Component tree

- BookingSaveLocationScreen
  - RootSafeArea
    - LocationSheet
      - MapPreview
      - SavedAddressCard
      - AddLocationButton
      - HomeIndicator

# States

- Default save-location state
- Location selected state
- Confirmation enabled state
