# Screen identity

- Frame name: EXPLORE BARBERS
- Node ID: 8086:5597
- Exact frame dimensions: 375 x 812
- Purpose: Customer discovery variant for exploring nearby barbers and services.
- Intended actor: Customer
- Route status: Variant of Customer Home, not a standalone route.

# Relationship to existing screens

- This frame is a visual variant of the Customer Home experience.
- It belongs on the same route as `Customer Home` rather than being a separate page.
- It likely represents the home route when the customer is in browsing/explore mode.

# Layout structure

- Full-screen white container.
- Hero card with featured barbershop image, title, location, rating, and favorite button.
- Slider indicator below the hero card.
- Search bar and filter icon row.
- Horizontal category chips for services.
- Vertical list of nearby barbers, each with image, name, service availability, location, and rating.
- Bottom tab bar shared with the app shell.

# Visual properties

- Background: white (`#FFFFFF`).
- Primary accent: orange (`#d2691e`).
- Secondary text: cool gray (`#6B7280`, `#8683A1`).
- Card corners: 8px rounded.
- Search bar fill: blue gray 100 (`#EBF0F5`).
- Tag chip stroke/active border: orange.
- Text fonts: Poppins / Plus Jakarta Sans.

# Reusable components

- Featured barber hero card
- Favorite button
- Search input with left icon
- Filter button
- Category chip
- Barber list item
- Slider position indicator
- Bottom tab navigation

# Interaction and navigation

- Tap favorite button to bookmark the featured barber.
- Tap search bar to focus search and enter query.
- Tap filter button to open filter options or modal.
- Tap category chip to filter the barber list.
- Tap a barber list item to navigate to barber detail.
- Bottom tab nav transitions to other app sections.

# Data contract

- `userId`
  - Type: `string`
  - Required: yes
- `searchQuery`
  - Type: `string`
  - Required: no
- `selectedCategory`
  - Type: `string`
  - Required: no
- `featuredBarber`
  - Type: `{ barberId: string; name: string; imageUrl?: string; location: string; distance: string; rating: number; isFavorite: boolean; serviceTags: string[] }`
- `nearbyBarbers`
  - Type: `Array<{ barberId: string; name: string; imageUrl?: string; serviceType: string; location: string; distance: string; rating: number; }>`
- `categoryChips`
  - Type: `Array<{ id: string; label: string; isActive: boolean }>`

# Booking flow position

- Entry point for barber discovery.
- Precedes barber detail and booking flow.
- Can be surfaced from Customer Home when the user is browsing.

# Validation rules

- `searchQuery` may be empty.
- `selectedCategory` is optional.
- `featuredBarber` must include `barberId` and `name`.
- `nearbyBarbers` list may be empty; handle empty state gracefully.

# React Native mapping

- `View`
- `Text`
- `TextInput`
- `Pressable`
- `Image`
- `FlatList`
- `ScrollView`

# NativeWind mapping

- `bg-white`
- `rounded-xl`
- `bg-slate-100`
- `text-orange-600`
- `text-slate-500`
- `text-slate-900`
- `px-4`, `py-3`, `gap-4`
- `border`, `border-orange-500`

# Component tree

- CustomerHomeExploreVariant
  - RootView
    - FeaturedBarberCard
      - BarberImage
      - BarberInfo
      - FavoriteButton
    - SliderIndicator
    - SearchFilterRow
      - SearchBar
      - FilterButton
    - CategoryChipRow
    - NearbyBarberList
      - BarberListItem
    - BottomTabBar

# States

- Default exploration state
- Search focus state
- Category-selected state
- Empty results state: not shown in frame; NEEDS_CONFIRMATION

# Implementation notes

- Treat this as a home route state, not a separate route.
- Use the existing bottom tab bar from the app shell.
- The featured hero card should be prominent and scroll with the content.
- Use local selection state for the active chip and search query.
- Avoid duplicate route scaffolding if this is only a state variation.
