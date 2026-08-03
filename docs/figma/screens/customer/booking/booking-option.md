# Screen identity

- Frame name: BOOK APPOINTMENT OPTION
- Node ID: 8209:3599
- Exact frame dimensions: 375 x 812
- Purpose: Booking options screen for selecting date, service, and booking type.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/options.tsx

# Relationship to existing screens

- Follows Barber Detail in the booking flow.
- Precedes Booking Schedule and Booking Detail.
- This is a full route in the customer booking process.

# Layout structure

- Top header with back navigation and title.
- Calendar section with month header and weekday labels.
- Date grid with selectable day chips.
- Service selection row with circular option cards.
- Payment summary section listing chosen services and prices.
- Primary action buttons for booking type: home service and on-site service.

# Visual properties

- Background: white.
- Calendar header: blue gray 100 (`#EDEFFB`).
- Selected date chip: orange fill (`#D2691E`) with white text.
- Unselected dates: white with gray text.
- Service option cards: circular images with labels and price below.
- Action buttons: orange and yellow fills with white or black text.
- Text colors: dark gray (`#111827`), medium gray (`#6B7280`).

# Reusable components

- Header bar
- Calendar month selector
- Date picker grid item
- Service option card
- Payment summary row
- Primary action button

# Interaction and navigation

- Tap back to return to the previous screen.
- Tap calendar arrows to change month.
- Tap a date chip to select an appointment day.
- Tap a service option to choose the service.
- Tap a booking type button to submit and continue.

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
  - Required: no
- `slotKey`
  - Type: `string`
  - Required: no
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

- This is the options-selection step in the booking flow.
- It is used after the customer has picked a barber and before schedule selection.
- It leads directly to the booking schedule route.

# Validation rules

- `selectedDate` is required.
- `serviceId` and `serviceName` are required.
- `servicePrice` must be present for selected services.
- `bookingType` must be either `home` or `onsite`.
- `slotKey` is optional until a time is selected.

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
- `bg-yellow-400`
- `text-white`
- `text-black`
- `text-slate-900`
- `text-slate-500`
- `rounded-xl`
- `rounded-full`
- `px-4`, `py-3`, `gap-4`

# Component tree

- BookingOptionScreen
  - RootSafeArea
    - HeaderBar
    - CalendarSection
      - MonthHeader
      - WeekdayLabels
      - DateGrid
    - ServiceSelectionRow
      - ServiceOptionCard
    - PaymentSummarySection
      - ServiceSummaryRow
    - BookingTypeButtons
      - HomeServiceButton
      - OnsiteServiceButton

# States

- Default booking option state
- Selected date state
- Selected service state
- Selected booking type state
- Disabled proceed state when required fields are missing

# Implementation notes

- Use circular image cards for service selection.
- The primary buttons should remain visible at the bottom of the content area.
- Keep the category and date controls responsive for narrower screens.
- If this screen only represents a booking state, confirm whether it should be merged with schedule, but current layout indicates a standalone route.
