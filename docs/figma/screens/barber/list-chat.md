# Screen identity

- Frame name: CHAT - LIST
- Node ID: 8064:4154
- Exact frame dimensions: 375 x 812
- Purpose: Chat list screen for a barber to review active customer conversations.
- Intended actor: Barber
- Proposed route: src/app/(barber)/chat/index.tsx

# Layout structure

- Same verified visual structure as customer chat list.
- Header, search bar, conversation rows, and bottom tab bar are present.

# Visual properties

- Shared with customer list-chat frame.
- No actor-specific visual differences were visible in Figma.

# Reusable components

- Reuse the shared search input and chat row components.
- Unread badge and metadata styling are identical to the customer layout.

# Interaction and navigation

- Same shared behavior as the customer chat list screen.
- No barber-specific interactions or additional controls were visible in Figma.

# Data contract

- `conversationId`: `string`, required, `conversations`
- `participantId`: `string`, required, `users`
- `participantName`: `string`, required, `users`
- `participantAvatarUrl`: `string`, optional, `users`
- `lastMessage`: `string`, required, `conversations/latestMessage`
- `sentTimestamp`: `string` | `Date`, required, `conversations/updatedAt`
- `unreadCount`: `number`, optional, `conversations/unreadCount`
- `readStatus`: `"sent" | "read" | "delivered"`, optional, `conversations/lastMessage/status`

# React Native mapping

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `FlatList`.

# NativeWind mapping

- As in the shared chat list doc.

# Component tree

- BarberChatListScreen
  - RootView
    - Header
    - SearchBar
    - ConversationList
      - ConversationRow
    - BottomTabBar

# States

- Default state
- Search active state
- Unread badge state
- Tab selected state

# Implementation notes

- Implement shared chat list architecture with actor-specific data injection.
- The barber variant uses the same visual structure as the Figma basis.
- No employer/admin-specific differences were shown in this frame.
