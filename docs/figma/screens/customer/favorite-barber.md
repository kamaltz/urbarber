# Screen identity

- Frame name: FAVORITE BARBERS
- Node ID: 8102:4497
- Exact frame dimensions: 375 x 1024 (approximate based on returned screenshot)
- Purpose: Favorite barbers list for a customer to browse saved barbers.
- Intended actor: Customer
- Proposed route: src/app/(customer)/favorite-barber.tsx

# Layout structure

- Top status/navigation bar placeholder at the top.
- Search bar and filter action row below the header.
- Horizontal category chips.
- Vertical list of barber cards.
- Default bottom navigation is visible but may be shared with the app shell.

# Visual properties

- Background: white (#FFFFFF).
- Search input: rounded rectangle, light gray (#EBF0F5).
- Active category chip: white background with orange border.
- Barber card backgrounds: white with rounded corners and subtle shadow.
- Text: dark gray (#111827) for titles, muted gray (#8683A1) for metadata.
- Rating icon: star badge with number.

# Reusable components

- Search input
- Filter button
- Category chip
- Barber card
  - Barber image
  - Name text
  - Tagline/status chip
  - Location line
  - Rating row
- Bottom tab bar

# Interaction and navigation

- Search input: filters favorite barbers.
- Filter button: opens filter options or sheet; exact behavior is implied.
- Category chips: filter the listed barbers by service type.
- Barber card tap: likely navigates to barber detail or booking.
- Vertical list is scrollable.

# Data contract

- `barberId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: barber fixture
  - Future Firestore collection: `barbers`
  - Editable: no
- `barberName`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: barber profile
  - Future Firestore collection: `barbers`
  - Editable: no
- `barberImageUrl`
  - TypeScript type: `string`
  - Required: optional
  - Mock source: image fixture
  - Future Firestore collection: `barbers`
  - Editable: no
- `serviceTag`
  - TypeScript type: `string`
  - Required: optional
  - Mock source: service label fixture
  - Future Firestore collection: `barbers/services`
  - Editable: no
- `locationDescription`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: location fixture
  - Future Firestore collection: `barbers/location`
  - Editable: no
- `rating`
  - TypeScript type: `number`
  - Required: optional
  - Mock source: review fixture
  - Future Firestore collection: `barbers/rating`
  - Editable: no

# React Native mapping

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `FlatList`.

# NativeWind mapping

- `bg-white`
- `rounded-xl`
- `bg-slate-100`
- `border`, `border-orange-500`
- `text-slate-900`
- `text-slate-500`
- `px-4`, `py-4`, `gap-4`

# Component tree

- FavoriteBarberScreen
  - RootView
    - Header
    - SearchAndFilterRow
      - SearchBar
      - FilterButton
    - CategoryChipRow
    - FavoriteBarberList
      - BarberCard
    - BottomTabBar

# States

- Default favorites list
- Active filter chip state
- Empty favorites state: not shown; NEEDS_CONFIRMATION

# Implementation notes

- Use horizontal scroll for category chips if needed.
- The filter button appears as a visual affordance; the actual filtering sheet or modal is not shown here.
- The list should be vertically scrollable.
