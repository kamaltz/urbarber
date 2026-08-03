# Screen identity

- Frame name: HOME - CUSTOMER
- Node ID: 8065:2552
- Exact frame dimensions: 375 x 812
- Purpose: Customer home dashboard with discovery cards and quick actions.
- Intended actor: Customer
- Proposed route: src/app/(customer)/home.tsx

# Layout structure

- Status bar / top header area.
- Greeting and summary text at the top.
- Search bar and notification icon row.
- Discover section with featured offers or barber categories.
- Horizontal card row for service highlights.
- Section for nearest barbers or booking suggestions.
- Bottom tab bar visible at the base.

# Visual properties

- White background with orange accent highlights.
- Search bar: rounded rectangle, light gray fill.
- Card surfaces: white with soft shadows and curved corners.
- Accent text: orange (#D2691E) and dark slate for headings.
- Category cards: image or icon plus text.

# Reusable components

- Search bar
- Notification badge icon
- Card summary item
- Horizontal service cards
- Barber suggestion card
- Bottom tab navigation

# Interaction and navigation

- Search input for finding barbers or services.
- Notification icon opens the alerts or inbox.
- Feature cards lead to discovery flows.
- Suggested barber cards link to barber detail or booking.

# Data contract

- `userId`
  - TypeScript type: `string`
  - Required: yes
  - Future Firestore collection: `users`
  - Editable: no
- `userName`
  - TypeScript type: `string`
  - Required: yes
  - Future Firestore collection: `users/profile`
  - Editable: no
- `featuredServices`
  - TypeScript type: `Array<{ id: string; title: string; subtitle: string; imageUrl?: string }>`
  - Required: yes
  - Future Firestore collection: `services`
  - Editable: no
- `barberSuggestions`
  - TypeScript type: `Array<{ barberId: string; name: string; status: string; rating?: number; distance?: string }>`
  - Required: yes
  - Future Firestore collection: `barbers`
  - Editable: no
- `notificationCount`
  - TypeScript type: `number`
  - Required: no
  - Future Firestore collection: `users/notifications`
  - Editable: no

# React Native mapping

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `ScrollView`, `SafeAreaView`

# NativeWind mapping

- `bg-white`, `rounded-2xl`, `shadow`, `text-slate-900`, `text-orange-600`, `px-4`, `py-4`, `gap-4`

# Component tree

- CustomerHomeScreen
  - RootSafeArea
    - HeaderRow
      - GreetingText
      - NotificationButton
    - SearchBar
    - FeaturedSection
      - FeatureCardRow
    - SuggestionsSection
      - BarberSuggestionCard
    - BottomTabBar

# States

- Default content state
- Search focus state
- Empty discovery state: not shown; NEEDS_CONFIRMATION

# Implementation notes

- Use a scrollable vertical layout for mobile.
- Keep top header elements aligned horizontally.
- Cards should stack with consistent spacing.
- The bottom tab bar is shared with the app shell.
