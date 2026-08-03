# Screen identity

- Frame name: BOOKING OTH - ACTIVE [ON PROCESS] OTH
- Node ID: 8243:21852
- Exact frame dimensions: 375 x 812
- Purpose: Active booking screen for the on-process stage.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/status/on-process.tsx

# Relationship to existing screens

- Follows the waiting status screen.
- Precedes the finished booking state.
- This screen indicates the service is in progress.

# Layout structure

- Top active booking tab header.
- Progress tracker showing the on-process stage highlighted.
- Appointment details card with barber, location, and scheduled time.
- Action buttons for chat and maps.
- Service summary with status notes and billing details.

# Visual properties

- Background: white.
- Active stage accent with orange.
- Buttons: orange for primary actions.
- Headings: dark gray; secondary text: muted gray.

# Reusable components

- Active booking tab header
- Progress tracker
- Service detail card
- Action button row
- Status note section

# Interaction and navigation

- Tap Maps to open the location.
- Tap Chat to communicate with the barber.
- View in-progress service details.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `status`
  - Type: `"on_process"`
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
- `services`
  - Type: `Array<{ name: string; price: string }>`
  - Required: yes
- `totalPrice`
  - Type: `string`
  - Required: yes

# Booking flow position

- This screen appears when the service is being performed.
- It is a later stage in the active booking lifecycle.
- Users may still contact barber or view the booking details.

# Validation rules

- Status must be `on_process`.
- Location and scheduled time are required.
- Service list must exist.

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

- BookingActiveOnProcessScreen
  - RootSafeArea
    - TabHeader
    - ProgressTracker
    - AppointmentCard
    - ActionButtonRow
    - ServiceSummary

# States

- On-process active state
- Navigation to chat/maps
