# Screen identity

- Frame name: BOOKING OTH - ACTIVE [FINISHED] OTH
- Node ID: 8242:20768
- Exact frame dimensions: 375 x 812
- Purpose: Active booking screen for the finished/completed booking stage.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/status/finished.tsx

# Relationship to existing screens

- Follows on-process and waiting booking states.
- Represents the booking completion stage.
- This screen is part of the active booking lifecycle and final status.

# Layout structure

- Top active booking tab header.
- Progress tracker showing the final finished stage highlighted.
- Appointment detail card with time, location, barber name, and ratings.
- Final action row with chat, map, and booking summary.
- Service summary and price totals.

# Visual properties

- Background: white.
- Finished stage highlighted with orange.
- Text: dark gray headings and muted gray details.
- Buttons: orange accent for relevant actions.

# Reusable components

- Tab header
- Progress indicator
- Appointment card
- Chat/map button row
- Service list and totals

# Interaction and navigation

- Tap Chat to message about the completed booking.
- Tap Maps to revisit the location.
- View completed service details and totals.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `status`
  - Type: `"finished"`
  - Required: yes
- `completedAt`
  - Type: `string`
  - Required: yes
- `barberName`
  - Type: `string`
  - Required: yes
- `location`
  - Type: `string`
  - Required: yes
- `services`
  - Type: `Array<{ name: string; price: string }>`
  - Required: yes
- `totalPrice`
  - Type: `string`
  - Required: yes

# Booking flow position

- This screen is displayed when the booking has been completed.
- It is the final state in the active booking flow.
- It may link to history or review flows.

# Validation rules

- `status` must be `finished`.
- `completedAt` should be displayed.
- Services and totals should match final billing.

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
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- BookingActiveFinishedScreen
  - RootSafeArea
    - TabHeader
    - ProgressTracker
    - AppointmentCard
    - ActionButtonRow
    - ServiceSummary

# States

- Finished booking state
- Historical or review navigation
