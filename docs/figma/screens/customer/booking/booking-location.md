# Screen identity

- Frame name: BOOKING - LOCATION OTH
- Node ID: 8236:4122
- Exact frame dimensions: 375 x 812
- Purpose: Location selection screen for on-the-spot customer bookings.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/location.tsx

# Relationship to existing screens

- Follows booking detail/review for on-site service flows.
- Precedes fix-location and save-location flows.
- This is the first step in choosing a location for an OTH booking.

# Layout structure

- Top status bar and navigation header.
- Large map preview card with location marker and full-screen control.
- Address input field showing the customer’s current address.
- Secondary address field for the selected pickup/delivery point.
- Payment summary section with service breakdown and total.
- Primary CTA button to continue to payment or confirm location.

# Visual properties

- Background: white.
- Map card uses rounded corners with a subtle shadow.
- Input fields use light gray borders and rounded corners.
- CTA button: orange fill with white text.
- Text: dark gray for headings and labels, muted gray for supporting text.

# Reusable components

- Status bar
- Header bar
- Map preview card
- Text input field
- Summary row
- Primary action button

# Interaction and navigation

- Tap back to return to booking review.
- Tap the map preview to expand it full screen.
- Tap the current address field to edit or change address.
- Tap continue to move to the fix-location confirmation screen.

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
- `destinationAddress`
  - Type: `string`
  - Required: no
- `servicePrice`
  - Type: `string`
  - Required: yes
- `estimatedFee`
  - Type: `string`
  - Required: yes
- `totalPrice`
  - Type: `string`
  - Required: yes

# Booking flow position

- This screen belongs to the OTH location selection path.
- It bridges the booking review/payment flow and the final confirmation.
- It is used before the user locks in the location.

# Validation rules

- `selectedLocation` must contain a valid address and coordinates.
- `currentAddress` should not be empty.
- `totalPrice` should include service fees, delivery/transport fees, and discounts.

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
- `rounded-3xl`
- `px-4`
- `py-3`
- `text-slate-900`
- `text-slate-500`
- `bg-orange-600`
- `text-white`

# Component tree

- BookingLocationScreen
  - RootSafeArea
    - StatusBar
    - TopNavigation
    - MapPreviewCard
    - LocationInputSection
    - PaymentSummarySection
    - ContinueButton

# States

- Map preview loaded
- Address input active
- Location selected
- Continue button enabled/disabled
