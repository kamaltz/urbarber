# Screen identity

- Frame name: CHAT - ROOM CHAT
- Node ID: 8064:4386
- Exact frame dimensions: 375 x 812
- Purpose: Admin conversation thread screen.
- Intended actor: Admin
- Proposed route: src/app/(admin)/chat/[conversationId].tsx

# Layout structure

- Shared chat conversation screen layout with header, date indicator, thread bubbles, and input.
- No admin-specific structural differences were visible.

# Visual properties

- Shared appearance with customer and barber chat screens.
- Orange outgoing bubbles, gray incoming bubbles.
- White background and rounded input bar.

# Reusable components

- Shared chat header, message bubble, and input components.

# Interaction and navigation

- Back navigation to chat list.
- Text input and send action.
- No additional admin-only actions are visible.

# Data contract

- `conversationId`: `string`, required
- `participantIds`: `string[]`, required
- `messageId`: `string`, required
- `senderId`: `string`, required
- `messageContent`: `string`, required
- `sentTimestamp`: `string` | `Date`, required
- `deliveryStatus`: `"sent" | "delivered" | "read"`, optional
- `attachmentPlaceholder`: `boolean`, optional

# React Native mapping

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `FlatList`

# NativeWind mapping

- `bg-white`, `rounded-2xl`, `bg-slate-100`, `bg-orange-600`, `text-white`, `px-4`, `py-3`, `gap-4`

# Component tree

- AdminChatScreen
  - RootView
    - ChatHeader
    - DatePill
    - MessageThread
    - MessageInputBar

# States

- Default thread state
- Typing state
- Delivery/read status state

# Implementation notes

- Implement shared chat architecture for admin chat.
- Use an inverted `FlatList` for message history.
- The admin frame did not show any unique UI variations from the shared design.

# Firestore recommendation

- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`
