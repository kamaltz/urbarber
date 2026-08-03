# Screen identity

- Frame name: CHAT - ROOM CHAT
- Node ID: 8064:4386
- Exact frame dimensions: 375 x 812
- Purpose: Conversation screen displaying an in-chat message thread.
- Intended actor: Customer
- Proposed route: src/app/(customer)/chat/[conversationId].tsx

# Layout structure

- Root frame with a full-screen chat thread.
- Top chat header with back button, avatar, name, and online status.
- Centered date pill.
- Chat messages stacked vertically with sender and recipient bubbles.
- Bottom input bar with text placeholder, attachment icon, and send button.

# Visual properties

- Background: white (#FFFFFF).
- Incoming message bubble: light gray (#ECF0F7) with rounded corners.
- Outgoing message bubble: orange (#D2691E) with white text.
- Header text: dark gray (#111827).
- Status dot in header: green.
- Bottom input area: light gray rounded field with white send button.

# Reusable components

- Chat header
  - Back button icon
  - Avatar image
  - Participant name text
  - Online status text and icon
- Date pill
  - Rounded capsule with bold label
- Message bubble
  - Incoming bubble style
  - Outgoing bubble style
  - Text content, timestamp, optional delivery icon
- Input bar
  - Placeholder text
  - Attachment icon
  - Send button icon

# Interaction and navigation

- Back button: returns to chat list.
- Send button: submits a new message.
- Attachment icon: placeholder representation only.
- Conversation messages are vertically stacked.
- Keyboard behavior: expected on text entry; bottom input bar remains visible.
- No explicit swipe or edit actions are shown.

# Data contract

- `conversationId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: route parameter
  - Future Firestore collection: `conversations`
  - Editable: no
- `participantIds`
  - TypeScript type: `string[]`
  - Required: yes
  - Mock source: conversation participants fixture
  - Future Firestore collection: `conversations/participants`
  - Editable: no
- `messageId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: message item fixture
  - Future Firestore collection: `conversations/{conversationId}/messages`
  - Editable: no
- `senderId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: current user or participant ID
  - Future Firestore collection: `conversations/{conversationId}/messages/senderId`
  - Editable: no
- `messageContent`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: message text fixture
  - Future Firestore collection: `conversations/{conversationId}/messages/content`
  - Editable: yes
- `sentTimestamp`
  - TypeScript type: `string` | `Date`
  - Required: yes
  - Mock source: message timestamp fixture
  - Future Firestore collection: `conversations/{conversationId}/messages/timestamp`
  - Editable: no
- `deliveryStatus`
  - TypeScript type: `"sent" | "delivered" | "read"`
  - Required: optional
  - Mock source: message status fixture
  - Future Firestore collection: `conversations/{conversationId}/messages/status`
  - Editable: no
- `attachmentPlaceholder`
  - TypeScript type: `boolean`
  - Required: optional
  - Mock source: UI presentational state
  - Future Firestore collection: `conversations/{conversationId}/messages/attachments`
  - Editable: no

# React Native mapping

- `View` for layout and message containers.
- `Text` for all text content.
- `TextInput` for message entry.
- `Pressable` for send and back actions.
- `Image` for avatars and icons.
- `FlatList` or `ScrollView` for message history.

# NativeWind mapping

- `bg-white`
- `rounded-2xl` or `rounded-[16px]` for bubbles.
- `bg-slate-100` for incoming messages.
- `bg-orange-600` / `bg-[#D2691E]` for outgoing messages.
- `text-white` for outgoing bubble text.
- `px-4`, `py-3`, `mb-3` for bubble spacing.
- `border`, `border-gray-200` for input bar.
- `items-end`, `items-start` for alignment.

# Component tree

- ChatScreen
  - RootView
    - ChatHeader
      - BackButton
      - Avatar
      - ParticipantInfo
    - DatePill
    - MessageThread
      - MessageBubble (outgoing)
      - MessageBubble (incoming)
      - MessageBubble (incoming)
      - MessageBubble (outgoing)
    - MessageInputBar
      - TextInput
      - AttachmentButton
      - SendButton

# States

- Default loaded state
- Sending state: not shown in Figma; NEEDS_CONFIRMATION
- Empty message state: input placeholder only
- Error/send failure: not shown; NEEDS_CONFIRMATION
- Read/delivery status visible through checkmark icon

# Implementation notes

- Use an inverted `FlatList` for natural chat scrolling behavior.
- Preserve bubble alignment: outgoing messages right-aligned, incoming left-aligned.
- Keep the bottom input bar pinned above the keyboard.
- Represent delivery/read status with the checkmark icon.
- The attachment icon is present but only shown as a visual affordance in this frame.

# Firestore structure recommendation

- `conversations/{conversationId}`
  - `participants: string[]`
  - `updatedAt: Timestamp`
  - `lastMessage: string`
- `conversations/{conversationId}/messages/{messageId}`
  - `senderId: string`
  - `content: string`
  - `timestamp: Timestamp`
  - `status: string`
  - `attachments: object[]`
