# Screen identity

- Frame name: BOOK APPOINTMENT SCHEDULE
- Node ID: 8209:3396
- Exact frame dimensions: 375 x 812
- Purpose: Booking schedule screen for selecting the appointment date and time.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/schedule.tsx

# Relationship to existing screens

- Follows booking options in the booking flow.
- Precedes booking review/detail.
- This is a full route for scheduling within the booking flow.

# Layout structure

- Top header with back navigation and title.
- Calendar section with month selector and weekday labels.
- Date grid with selectable day chips.
- Service selection row with horizontally scrollable service options.
- Time slot button grid for available times.
- Payment summary section with selected service breakdown.
- Bottom action button to proceed with the booking.

# Visual properties

- Background: white.
- Calendar card fill: blue gray 100 (`#EDEFFB`).
- Selected date chip: orange fill (`#D2691E`) with white text.
- Time slot chips: orange outline with white fill or selected orange background.
- Service option circles: white with subtle shadow.
- Button: orange fill with white text.
- Text: dark gray (`#111827`), gray (`#6B7280`).

# Reusable components

- Calendar picker
- Date chip
- Service option card
- Time slot button
- Payment summary row
- Primary continue button

# Interaction and navigation

- Tap back to return to the previous booking screen.
- Tap month arrows to change calendar month.
- Tap a date chip to choose appointment date.
- Tap a service option card to select service.
- Tap a time slot to choose appointment time.
- Tap proceed to continue to booking detail or payment.

# Data contract

- `barberId`
  - Type: `string`
  - Required: yes
- `customerId`
  - Type: `string`
  - Required: yes
- `serviceId`
  - Type: `string`
  - Required: yes
- `serviceName`
  - Type: `string`
  - Required: yes
- `servicePrice`
  - Type: `string`
  - Required: yes
- `durationMinutes`
  - Type: `number`
  - Required: no
- `selectedDate`
  - Type: `string`
  - Required: yes
- `selectedTime`
  - Type: `string`
  - Required: yes
- `slotKey`
  - Type: `string`
  - Required: yes
- `address`
  - Type: `string`
  - Required: no
- `notes`
  - Type: `string`
  - Required: no
- `bookingStatus`
  - Type: `string`
  - Required: no
- `bookingType`
  - Type: `"home" | "onsite"`
  - Required: yes

# Booking flow position

- This is the schedule-selection step in the booking flow.
- It is used after the customer has chosen a barber and service.
- It leads into the booking review/payment screen.

# Validation rules

- `selectedDate` is required.
- `selectedTime` is required.
- `serviceId` and `serviceName` are required.
- `slotKey` should map to a valid time slot.
- `bookingType` should be selected when relevant.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `bg-slate-100`
- `bg-orange-600`
- `text-white`
- `text-slate-900`
- `text-slate-500`
- `rounded-full`
- `rounded-xl`
- `px-4`, `py-3`, `gap-4`

# Component tree

- BookingScheduleScreen
  - RootSafeArea
    - HeaderBar
    - CalendarSection
      - MonthHeader
      - WeekdayLabels
      - DateGrid
    - ServiceOptionRow
    - TimeSlotGrid
    - PaymentSummarySection
    - BottomActionButton

# States

- Default scheduling state
- Date selected state
- Time slot selected state
- Service selected state
- Disabled proceed state when required fields are missing

# Implementation notes

- Use a grid layout for dates with selectable chips.
- Keep the proceed button anchored near the bottom.
- Use horizontal scrolling for service options.
- The payment summary should update dynamically based on selected service.
- `slotKey` should be generated from the selected time slot and date.
