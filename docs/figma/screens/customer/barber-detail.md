# Screen identity

- Frame name: DETAIL BARBER
- Node ID: 8067:5235
- Exact frame dimensions: 375 x 812
- Purpose: Barber detail screen for customers to view shop profile, services, and reviews.
- Intended actor: Customer
- Proposed route: src/app/(customer)/barber/[barberId].tsx

# Relationship to existing screens

- Navigated from customer discovery screens such as Customer Home, Explore, or favorites.
- This is a standalone customer route for barber profile and booking entry.
- It sits before the booking flow screens (options, schedule, review).

# Layout structure

- Top navigation bar with back action and title.
- Large barber/shop hero image.
- Open status badge.
- Title block with barbershop name, location, and rating summary.
- Horizontal action row with map, chat, share, and favorite actions.
- Shop description text.
- Opening hours section.
- Service price list with service names, descriptions, and prices.
- Reviews section with reviewer cards and rating details.
- Fixed bottom action button for booking.

# Visual properties

- Background: white (`#FFFFFF`).
- Status pill: green (`#27ae60`).
- Accent button: orange (`#D2691E`).
- Text colors: dark gray (`#111827`), medium gray (`#6B7280`).
- Cards and sections: rounded corners and soft shadows.
- Fonts: Poppins and Plus Jakarta Sans.

# Reusable components

- Header with back navigation
- Hero image card
- Status badge
- Action icon button
- Service list item
- Review item
- Bottom CTA button

# Interaction and navigation

- Back button returns to the previous screen.
- Map button opens location details.
- Chat button opens a conversation with the barber.
- Share button opens share sheet.
- Favorite button toggles saved barber state.
- Booking button navigates to the booking options route.

# Data contract

- `barberId`
  - Type: `string`
  - Required: yes
- `barberName`
  - Type: `string`
  - Required: yes
- `barberImageUrl`
  - Type: `string`
  - Required: no
- `address`
  - Type: `string`
  - Required: yes
- `distance`
  - Type: `string`
  - Required: no
- `rating`
  - Type: `number`
  - Required: no
- `reviewCount`
  - Type: `number`
  - Required: no
- `isOpen`
  - Type: `boolean`
  - Required: yes
- `openingHours`
  - Type: `Array<{ dayLabel: string; hours: string }>`
  - Required: yes
- `services`
  - Type: `Array<{ serviceId: string; serviceName: string; description: string; price: string; durationMinutes?: number }>`
  - Required: yes
- `reviews`
  - Type: `Array<{ reviewerName: string; rating: number; body: string }>`
  - Required: no
- `bookingStatus`
  - Type: `string`
  - Required: no
- `selectedServiceId`
  - Type: `string`
  - Required: no
- `selectedDate`
  - Type: `string`
  - Required: no
- `selectedTime`
  - Type: `string`
  - Required: no
- `customerId`
  - Type: `string`
  - Required: no
- `notes`
  - Type: `string`
  - Required: no
- `slotKey`
  - Type: `string`
  - Required: no

# Booking flow position

- Entry point for booking a specific barber.
- The next route is booking options.
- It precedes schedule selection and review/payment.

# Validation rules

- `barberId`, `barberName`, and `address` are required.
- `services` should contain at least one entry.
- `openingHours` should be populated for accurate shop status.
- `isOpen` should be inferred from current shop hours.

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
- `bg-emerald-600`
- `text-white`
- `rounded-xl`
- `px-4`, `py-3`, `gap-4`
- `shadow`

# Component tree

- BarberDetailScreen
  - RootSafeArea
    - TopNavigationBar
      - BackButton
      - Title
    - ScrollView
      - HeroImageSection
      - StatusBadge
      - BarberTitleSection
      - ActionButtonRow
      - DescriptionBlock
      - OpeningHoursSection
      - ServiceListSection
      - ReviewsSection
    - BottomActionBar
      - BookNowButton

# States

- Default loaded state
- Favorite toggled state
- Share action state
- Chat ready state
- Loading or error state: not shown; NEEDS_CONFIRMATION

# Implementation notes

- Use an image container with rounded corners and object-cover styling.
- Keep the book button fixed to the bottom safe area.
- Render reviews in a vertical list with star rating icons.
- Use `barberId` from route params for data fetching.
- Keep secondary actions accessible above the fold.

# Navigation

- Input: `barberId`
- Output: selected barber booking flow state, such as `selectedServiceId` and route to `booking/options`.
