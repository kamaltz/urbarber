# Screen identity

- Frame name: BOOKING  OTH- HISTORY
- Node ID: 8242:20857
- Exact frame dimensions: 375 x 812
- Purpose: Customer booking history list with tabs for active bookings and past history.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/history.tsx

# Relationship to existing screens

- Followed by booking detail screens.
- Related to active booking screens and booking history detail screens.
- This screen is the list-entry point for reviewing past orders.

# Layout structure

- Top segmented tab control with "Pemesanan Aktif" and "Riwayat".
- Scrollable booking card list with each item showing:
  - shop image
  - shop name
  - location and distance
  - rating
- Bottom navigation bar with active booking selected.
- A lightweight status and back navigation area at the top.

# Visual properties

- Background: white.
- Tab control: pill-shaped with active and inactive states.
- Cards: image thumbnails with adjacent text blocks.
- Text: primary dark heading, muted location/rating captions.
- Bottom nav icons: neutral gray for inactive items.

# Reusable components

- Segmented tab control
- Booking list item card
- Bottom navigation bar
- Top status bar

# Interaction and navigation

- Tap a booking card to open booking detail.
- Switch tabs between active bookings and history.
- Use bottom navigation for home/chat/profile/booking.

# Data contract

- `bookings`
  - Type: `Array<{ id: string; shopName: string; location: string; distance: string; rating: string; imageUrl: string }>`
  - Required: yes
- `selectedTab`
  - Type: `"active" | "history"`
  - Required: yes

# Booking flow position

- This screen is an entry point for reviewing prior bookings.
- It follows the bookings list or home feed.
- It precedes booking detail and history detail screens.

# Validation rules

- At least one booking item should render in the list.
- The "Riwayat" tab should be styled as active for this frame.
- Each card must show name, distance/location, and rating.

# React Native mapping

- `SafeAreaView`
- `View`
- `Text`
- `Pressable`
- `Image`
- `FlatList`

# NativeWind mapping

- `bg-white`
- `text-slate-900`
- `text-slate-500`
- `rounded-full`
- `rounded-xl`
- `shadow-sm`
- `border`
- `border-slate-200`
- `px-4`
- `py-3`

# Component tree

- BookingHistoryScreen
  - RootSafeArea
    - HistoryTabControl
    - BookingList
    - BottomNavigationBar

# States

- History tab selected
- Booking card hover/press states
- Bottom nav active booking state
