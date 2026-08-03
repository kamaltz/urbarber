# Screen identity

- Frame name: FIND BARBER - DEFAULT
- Node ID: 8065:2782
- Exact frame dimensions: 375 x 812
- Purpose: Customer map search screen for finding nearby barbers.
- Intended actor: Customer
- Proposed route: src/app/(customer)/find-barber.tsx

# Layout structure

- Full-screen map background with map controls overlaid.
- Search bar positioned near the top.
- Map action buttons on the right side.
- Bottom sheet panel with latest search results and a call-to-action button.

# Visual properties

- Map background: full-screen imagery.
- Search bar: white rounded rectangle, subtle shadow.
- Map action buttons: white circular icons with drop shadow.
- Bottom sheet: white card with rounded top corners.
- Location result card: text and icon list with subtle separators.
- CTA button: orange (#D2691E) full-width.

# Reusable components

- Search input
- Map action button
- Recent search card
- Result list item
- CTA button
- Bottom sheet capsule indicator

# Interaction and navigation

- Search bar: enters location search.
- Map action buttons: likely center map or select current location.
- Bottom sheet is scrollable within the map screen.
- Result item selection: likely picks a location.
- CTA button: confirms selected location.

# Data contract

- `locationId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: location fixture
  - Future Firestore collection: `locations`
  - Editable: no
- `locationName`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: location fixture
  - Future Firestore collection: `locations`
  - Editable: no
- `locationAddress`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: address fixture
  - Future Firestore collection: `locations`
  - Editable: no
- `selectedLocationId`
  - TypeScript type: `string`
  - Required: optional
  - Mock source: selection state
  - Future Firestore collection: none (local state)
  - Editable: yes
- `distance`
  - TypeScript type: `string`
  - Required: optional
  - Mock source: proximity display
  - Future Firestore collection: none
  - Editable: no

# React Native mapping

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `ScrollView`.

# NativeWind mapping

- `bg-white`, `rounded-xl`, `shadow`, `text-slate-900`, `text-slate-500`, `px-4`, `py-3`

# Component tree

- FindBarberScreen
  - RootView
    - MapView
    - TopSearchBar
    - RightMapActionButtons
    - BottomSheet
      - RecentSearchList
      - LocationResultItems
      - ConfirmButton

# States

- Default map state
- Search query active state
- Selected location state
- Bottom sheet expanded/collapsed state

# Implementation notes

- Map is represented as a full-screen background image in the frame.
- The bottom sheet is visually docked and scrollable.
- The CTA at the bottom reads "Pilih lokasi" in the related flow.
- Use local selection state for the chosen location.
