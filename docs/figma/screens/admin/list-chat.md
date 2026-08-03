# Screen identity

- Frame name: CHAT - LIST
- Node ID: 8064:4154
- Exact frame dimensions: 375 x 812
- Purpose: Admin chat list screen displaying recent conversations.
- Intended actor: Admin
- Proposed route: src/app/(admin)/chat/index.tsx

# Layout structure

- Identical verified visual layout to the shared list-chat basis.
- Header, search bar, conversation list, and bottom tab bar are present.

# Visual properties

- Matches the shared customer/barber list-chat frame.
- No admin-specific styling differences were visible.

# Reusable components

- Shared search input and conversation row components.
- No additional admin-only reusable pieces were exposed.

# Interaction and navigation

- Search filters conversation results.
- Selecting a row opens the chat thread.
- Bottom tab navigation is present but not structurally different.

# Data contract

- `conversationId`: `string`, required
- `participantId`: `string`, required
- `participantName`: `string`, required
- `participantAvatarUrl`: `string`, optional
- `lastMessage`: `string`, required
- `sentTimestamp`: `string` | `Date`, required
- `unreadCount`: `number`, optional
- `readStatus`: `"sent" | "read" | "delivered"`, optional

# React Native mapping

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `FlatList`.

# NativeWind mapping

- Shared with the customer/barber chat list screens.

# Component tree

- AdminChatListScreen
  - RootView
    - StatusBarSpacer
    - Header
    - SearchBar
    - ConversationList
      - ConversationRow
    - BottomTabBar

# States

- Default state
- Search query entered
- Unread conversation highlight

# Implementation notes

- Use the shared list-chat architecture and inject admin conversation data.
- This frame does not show any special admin controls or alternative layout.
