# Screen identity

- Frame name: HOME - FILTER
- Node ID: 8065:2691
- Exact frame dimensions: 375 x 812
- Purpose: Modal overlay for filtering home discovery results.
- Intended actor: Customer
- Proposed route: src/app/(customer)/home-filter.tsx

# Layout structure

- Semi-transparent black overlay behind the modal.
- Centered white filter panel with rounded corners.
- Header with title and close icon.
- Filter options grouped by category.
- Apply button at the bottom.

# Visual properties

- Overlay: black with 40% opacity.
- Modal panel: white background, rounded corners.
- Header text: dark slate.
- Option pills: gray background for inactive, orange border for active.
- Apply button: orange fill, white text.

# Reusable components

- Modal overlay
- Filter header
- Filter chip list
- Action button

# Interaction and navigation

- Close icon dismisses the filter modal.
- Filter chips toggle selection.
- Apply button closes modal and applies filters.

# Data contract

- `selectedFilters`
  - TypeScript type: `Record<string, string[]>`
  - Required: yes
  - Editable: yes
- `availableFilters`
  - TypeScript type: `Array<{ category: string; options: string[] }>`
  - Required: yes
  - Editable: no

# React Native mapping

- `View`, `Text`, `Pressable`, `ScrollView`, `SafeAreaView`

# NativeWind mapping

- `bg-black/40`, `bg-white`, `rounded-3xl`, `text-slate-900`, `text-orange-600`, `px-4`, `py-4`

# Component tree

- HomeFilterModal
  - Overlay
  - ModalPanel
    - HeaderRow
    - FilterCategoryGroups
      - FilterChip
    - ApplyButton

# States

- Default filter state
- Filter selected state
- Disabled apply state: not shown; NEEDS_CONFIRMATION

# Implementation notes

- Render as a modal overlay above the home screen.
- Use `ScrollView` if filter content exceeds available height.
- Keep the apply action fixed near the bottom.
