# Screen identity

- Frame name: BOOKING OTH - ACTIVE [WAITING] OTH
- Node ID: 8180:2729
- Exact frame dimensions: 375 x 812
- Purpose: Active booking screen for the waiting stage.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/status/waiting.tsx

# Relationship to existing screens

- Follows the booked status screen.
- Precedes the on-process and finished stages.
- This screen reflects that the appointment is confirmed and is now waiting for service delivery.

# Layout structure

- Top active booking tab header with `Pemesanan` selected.
- Progress tracker with `Booked`, `Waiting`, `On Process`, and `Finished` stages; the waiting stage is highlighted.
- Booking detail card with barber name, service title, rating, and location.
- CTA row with Map and Chat actions plus a Cancel booking action.
- Date & time section showing the scheduled appointment.
- Service summary list with selected services and add-ons.
- Barber detail section showing the assigned master barber.

# Visual properties

- Background: white.
- Progress tracker uses orange highlights for active and completed stages.
- Action buttons: orange primary CTA with neutral supporting controls.
- Card surfaces: white with subtle shadows and rounded corners.
- Text: dark gray for headings, muted gray for metadata.

# Reusable components

- Tab header
- Progress tracker
- Appointment detail card
- CTA action row
- Service list item
- Barber detail row

# Interaction and navigation

- Tap the Maps button to view the appointment location.
- Tap Chat to message the barber or support.
- Tap Cancel to cancel the active booking.
- Switch to the history tab to review past bookings.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `status`
  - Type: `"waiting"`
  - Required: yes
- `scheduledAt`
  - Type: `string`
  - Required: yes
- `barberName`
  - Type: `string`
  - Required: yes
- `serviceTitle`
  - Type: `string`
  - Required: yes
- `location`
  - Type: `string`
  - Required: yes
- `rating`
  - Type: `string`
  - Required: no
- `services`
  - Type: `Array<{ name: string; price: string }>`
  - Required: yes
- `totalPrice`
  - Type: `string`
  - Required: yes

# Booking flow position

- This screen appears after booking confirmation while the order is waiting.
- It is the second state in the active booking lifecycle.

# Validation rules

- `status` must be `waiting`.
- The booking stage tracker should show the waiting stage as active.
- `scheduledAt`, `barberName`, and `location` must be visible.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `bg-orange-600`
- `text-white`
- `rounded-xl`
- `rounded-full`
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- BookingActiveWaitingScreen
  - RootSafeArea
    - TabHeader
    - ProgressTracker
    - BookingDetailCard
    - ActionButtonRow
    - DateTimeSection
    - ServiceSummarySection
    - BarberDetailSection

# States

- Waiting stage active
- Action buttons available (Map, Chat, Cancel)
- History tab accessible
