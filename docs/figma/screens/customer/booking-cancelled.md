# Screen identity

- Frame name: BOOKING - CANCELED OTH
- Node ID: 8239:5797
- Exact frame dimensions: 375 x 945
- Purpose: Customer screen for a cancelled booking state.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/status/cancelled.tsx

# Relationship to existing screens

- Follows the active booking flow.
- Represents the cancelled state of an on-the-spot booking.
- May transition back to booking history or home.

# Layout structure

- Top segmented control showing active booking state selection.
- Progress indicator with cancelled status reflected in the workflow.
- Booking detail card with shop image, name, location, and rating.
- CTA row with Map and Chat actions plus a cancelled status button.
- Date/time section with schedule details.
- Service section listing selected services.
- Top navigation bar with back arrow and title.

# Visual properties

- Background: white.
- Progress section: subtle track with inactive and completed markers.
- Cards: white with rounded corners and shadow.
- Cancelled CTA: neutral gray button showing order cancelled state.
- Text: dark headings with muted gray support.

# Reusable components

- Progress tracker
- Booking detail card
- Action button row
- Service item list
- Date/time section
- Top navigation bar

# Interaction and navigation

- Tap "Peta" to open the map.
- Tap "Chat" to message support or the barber.
- Use back navigation to return to history or home.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `status`
  - Type: `"cancelled"`
  - Required: yes
- `shopName`
  - Type: `string`
  - Required: yes
- `location`
  - Type: `string`
  - Required: yes
- `scheduledAt`
  - Type: `string`
  - Required: yes
- `services`
  - Type: `Array<{ name: string; price: string }>`
  - Required: yes
- `barberName`
  - Type: `string`
  - Required: no

# Booking flow position

- This screen appears after a booking has been cancelled.
- It is a terminal state in the active booking lifecycle.
- It can lead users back to history or new booking flows.

# Validation rules

- `status` must be `cancelled`.
- The cancelled indicator button must display on screen.
- The booking summary card should show the shop, location, and rating.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Image`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `text-slate-900`
- `text-slate-500`
- `rounded-xl`
- `rounded-2xl`
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- BookingCancelledScreen
  - RootSafeArea
    - BookingTabs
    - ProgressTracker
    - BookingDetailCard
    - ActionButtonRow
    - DateTimeSection
    - ServiceSummarySection

# States

- Cancelled booking state
- Booking detail visible
