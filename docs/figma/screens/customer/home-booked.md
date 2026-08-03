# Screen identity

- Frame name: HOME - BOOKED
- Node ID: 8092:12810
- Exact frame dimensions: 375 x 812
- Purpose: Customer home state showing an active booking summary and nearby barbers.
- Intended actor: Customer
- Proposed route: src/app/(customer)/home.tsx

# Relationship to existing screens

- This is a variant of the Customer Home screen rather than a standalone route.
- It represents the home screen when the customer has an active or upcoming booking.
- It should be implemented as a conditional state on the home route.

# Layout structure

- Top greeting and profile row.
- Orange booking summary card with barber name, location, booking date/time, and estimated duration.
- Search bar and filter row below the active booking card.
- Nearby barbers list section.
- Bottom tab bar visible in the shell.

# Visual properties

- Background: white (`#FFFFFF`).
- Primary card: orange fill (`#D2691E`) with white text.
- Secondary text: gray tones (`#6B7280`, `#8683A1`).
- Card corners: rounded 8px.
- Search input: blue gray background (`#EBF0F5`).
- Tag chips and action buttons use orange accent.

# Reusable components

- Active booking card
- User greeting/profile row
- Search input
- Filter button
- Nearby barber list item
- Secondary text/icon row
- Bottom tab navigation

# Interaction and navigation

- Tap map icon to open map view.
- Tap chat icon to open conversation with the barber.
- Tap favorite icon to bookmark the barber.
- Tap search input to search services or barbers.
- Tap filter button to open filter options.
- Tap nearby barber list item to navigate to barber detail.

# Data contract

- `userId`
  - Type: `string`
  - Required: yes
- `activeBooking`
  - Type: `{ bookingId: string; barberId: string; barberName: string; location: string; distance: string; bookingDate: string; bookingTime: string; estimatedMinutes: number; bookingStatus: string; serviceSummary: string; isFavorite: boolean }`
  - Required: yes
- `searchQuery`
  - Type: `string`
  - Required: no
- `nearbyBarbers`
  - Type: `Array<{ barberId: string; name: string; imageUrl?: string; serviceType: string; location: string; distance: string; rating: number }>`
- `notificationCount`
  - Type: `number`
  - Required: no

# Booking flow position

- This screen is a home-state summary for customers with active bookings.
- It appears after the user has booked a service and returned to Home.
- It precedes detailed booking tracking or check-in flows.

# Validation rules

- `activeBooking` must include `bookingId`, `barberId`, `bookingDate`, `bookingTime`, and `bookingStatus`.
- `nearbyBarbers` may be empty; handle fallback state.
- `bookingStatus` should be validated against expected states such as `upcoming`, `confirmed`, `inProgress`, or `completed`.

# React Native mapping

- `View`
- `Text`
- `Image`
- `Pressable`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `bg-orange-600`
- `rounded-xl`
- `rounded-2xl`
- `text-white`
- `text-slate-500`
- `text-slate-900`
- `px-4`, `py-3`, `gap-4`

# Component tree

- CustomerHomeBookedState
  - RootView
    - GreetingRow
      - LocationText
      - ProfileAvatar
    - ActiveBookingCard
      - BarberHeadline
      - LocationAndDistance
      - BookingDateTime
      - EstimatedDuration
      - ActionIconRow
    - SearchFilterRow
    - NearbyBarberSection
      - BarberListItem
    - BottomTabBar

# States

- Active booking state
- Search focus state
- Filter selected state
- Empty nearby results state: not shown; NEEDS_CONFIRMATION

# Implementation notes

- Implement this as a state variation within the existing home route.
- The active booking card should be prominent and visually distinct.
- Preserve bottom tab navigation from the shell.
- The same search/filter row and nearby barber list may be reused from the explore variant.
- `home.tsx` can branch on `activeBooking` presence.
