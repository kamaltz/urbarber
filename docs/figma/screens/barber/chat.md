# Screen identity

- Frame name: CHAT - ROOM CHAT
- Node ID: 8064:4386
- Exact frame dimensions: 375 x 812
- Purpose: Conversation screen for barber chat interactions.
- Intended actor: Barber
- Proposed route: src/app/(barber)/chat/[conversationId].tsx

# Layout structure

- Shared chat conversation layout with header, date pill, message bubbles, and input bar.
- The same visual structure as the customer conversation screen.

# Visual properties

- Outgoing barber messages use the orange bubble style.
- Incoming customer messages use a gray bubble.
- Header includes participant avatar and online status.
- Bottom input area is a light gray rounded field with a send icon.

# Reusable components

- Chat header
- Date capsule
- Message bubble
- Message input bar
- Delivery status icon

# Interaction and navigation

- Back navigation returns to chat list.
- Send button submits a message.
- No explicit barber-specific actions are visible beyond the shared message thread.

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

- `View`, `Text`, `TextInput`, `Pressable`, `Image`, `FlatList`.

# NativeWind mapping

- Same as customer chat screen.

# Component tree

- BarberChatScreen
  - RootView
    - ChatHeader
    - DatePill
    - MessageThread
      - MessageBubble
      - MessageBubble
    - MessageInputBar

# States

- Default chat state
- Message typing state
- Read/delivered status state

# Implementation notes

- Use a shared chat message architecture with barber-specific participant data.
- The Figma frame does not show barber-only controls, so keep the implementation consistent with the shared chat flow.
- Inverted `FlatList` is recommended for chat history.

# Firestore structure recommendation

- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`
