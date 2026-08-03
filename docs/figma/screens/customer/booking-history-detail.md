# Screen identity

- Frame name: BOOKING OTH - HISTORY [DETAIL]
- Node ID: 8242:20949
- Exact frame dimensions: 375 x 1024
- Purpose: Detailed view for a past booking history item.
- Intended actor: Customer
- Proposed route: src/app/(customer)/booking/history/[bookingId].tsx

# Relationship to existing screens

- Follows the booking history list.
- Precedes the service review or repeat booking flow.
- This is the deep-detail screen for a single historical booking.

# Layout structure

- Top shop header card with image, name, location, and rating.
- Separator line below the shop summary.
- Date and time section with calendar icon.
- Selected service section with itemized service cards and prices.
- Master barber section with barber name and profile image.
- Payment summary section with line items and total price.
- Top navigation bar with back arrow and screen title.

# Visual properties

- Background: white.
- Cards: white surfaces with subtle rounded corners.
- Section titles: semi-bold dark text.
- Price rows: space-between layout with clear currency values.
- Total row: bold text to emphasize final payment.

# Reusable components

- Top navigation bar
- Shop summary card
- Date/time section
- Service item row
- Barber detail row
- Payment summary row

# Interaction and navigation

- Tap back to return to booking history.
- Tap the map or chat CTA buttons if supported.
- Review service and cost breakdown for the historical booking.

# Data contract

- `bookingId`
  - Type: `string`
  - Required: yes
- `shopName`
  - Type: `string`
  - Required: yes
- `location`
  - Type: `string`
  - Required: yes
- `rating`
  - Type: `string`
  - Required: no
- `scheduledAt`
  - Type: `string`
  - Required: yes
- `services`
  - Type: `Array<{ name: string; description: string; price: string }>`
  - Required: yes
- `barberName`
  - Type: `string`
  - Required: yes
- `totalPrice`
  - Type: `string`
  - Required: yes
- `subtotal`
  - Type: `string`
  - Required: yes
- `travelFee`
  - Type: `string`
  - Required: no
- `handlingFee`
  - Type: `string`
  - Required: no
- `discount`
  - Type: `string`
  - Required: no

# Detail flow position

- This screen is displayed after selecting a past booking entry.
- It is the detailed review screen within the history flow.

# Validation rules

- `scheduledAt`, `shopName`, and `location` must appear.
- Service items and pricing rows should be visible.
- The total should be bold and easy to scan.

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

- BookingHistoryDetailScreen
  - RootSafeArea
    - ShopHeaderCard
    - DateTimeSection
    - ServiceList
    - BarberDetailSection
    - PaymentSummarySection

# States

- Default history detail state
- Service list expanded state
