# Screen identity

- Frame name: BOOKING - ACTIVE [BOOKED]
- Node ID: 8063:5888
- Exact frame dimensions: 375 x 945
- Purpose: Active booking screen showing that the appointment is booked.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/status/booked.tsx

# Relationship to existing screens

- Follows booking confirmation or payment success.
- Precedes active waiting or processing states as the booking progresses.
- This screen is part of the customer active booking dashboard.

# Layout structure

- Top tab container with active booking and history tabs.
- Progress bar showing booking stages: Booked, Waiting, On Process, Finished.
- Appointment card with location, barber, rating, and date/time.
- CTA row with map, chat, and cancel booking actions.
- Booking details section listing selected services, time, and barber.

# Visual properties

- Background: white with a clean card layout.
- Active stage indicator: orange highlights on the booked step.
- Buttons: orange for main actions, neutral styling for secondary buttons.
- Text: dark gray headings, muted gray metadata.

# Reusable components

- Tab header
- Progress tracker
- Appointment detail card
- Action buttons
- Service list

# Interaction and navigation

- Tap active booking tab to stay on the active booking screen.
- Tap history to view past orders.
- Tap Maps to open the arrival location.
- Tap Chat to message the barber or support.
- Tap Cancel to cancel the current booking.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `status`
  - Type: `"booked"`
  - Required: yes
- `scheduledAt`
  - Type: `string`
  - Required: yes
- `barberName`
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

- This screen appears after the booking is confirmed.
- It provides live status for the booked appointment.
- It is the first state in the active booking lifecycle.

# Validation rules

- `status` must be `booked`.
- `scheduledAt` must be visible and formatted.
- `services` must include at least one selected item.

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

- BookingActiveBookedScreen
  - RootSafeArea
    - TabHeader
    - ProgressTracker
    - AppointmentCard
    - ActionButtonRow
    - ServiceDetailsSection

# States

- Active booked state
- Cancel pending state
- Navigation to maps/chat
