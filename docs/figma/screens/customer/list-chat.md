# Screen identity

- Frame name: CHAT - LIST
- Node ID: 8064:4154
- Exact frame dimensions: 375 x 812
- Purpose: Chat list screen showing recent conversations and unread indicators.
- Intended actor: Customer
- Proposed route: src/app/(customer)/chat/index.tsx

# Layout structure

- Root frame is full-screen with a fixed top navigation bar and bottom tab bar.
- Top section: status bar placeholder plus centered screen title "Chat".
- Search bar block below the header.
- Conversation list: vertically stacked chat rows.
- Bottom navigation: four tabs with the chat tab active.

# Visual properties

- Background: white (#FFFFFF).
- Search bar: rounded rectangle with light blue/gray fill (#EBF0F5).
- Text: dark gray (#111827) for names; muted gray (#6B7280) for message previews and timestamps.
- Avatars: circular user images with a small online dot overlay on the profile photo.
- Chat row background: white with rounded corners.
- Unread badge: orange circle with white numeric label.
- Icons: checkmark icon for delivery/read status.

# Reusable components

- Search input
  - Fill: #EBF0F5
  - Height: 44 px
  - Corner radius: 8 px
  - Icon: search magnifier
  - Placeholder text: "Cari obrolan"
- Chat row
  - Avatar image: 56 x 56 px circular
  - Name text: Poppins Medium 16 px
  - Preview text: Poppins Regular 14 px
  - Timestamp text: Poppins Regular 14 px
  - Read status icon: checkmark
  - Unread badge: 20 x 20 px, orange background
- Bottom tab bar
  - Four tabs with icon and label
  - Active tab highlight: chat tab with orange accent

# Interaction and navigation

- Search input: filters the conversation list.
- Chat row tap: navigates to conversation detail.
- Bottom tab tap: navigates between main app sections.
- No scroll behavior was explicitly shown, but the conversation list should be vertically scrollable if content exceeds the viewport.
- No pull-to-refresh or swipe actions are visible.

# Data contract

- `conversationId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: conversation list fixture
  - Future Firestore collection: `conversations`
  - Editable: no
- `participantId`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: user profile fixture
  - Future Firestore collection: `users`
  - Editable: no
- `participantName`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: profile name
  - Future Firestore collection: `users`
  - Editable: no
- `participantAvatarUrl`
  - TypeScript type: `string`
  - Required: optional
  - Mock source: remote image URL fixture
  - Future Firestore collection: `users`
  - Editable: no
- `lastMessage`
  - TypeScript type: `string`
  - Required: yes
  - Mock source: latest message text
  - Future Firestore collection: `conversations/latestMessage`
  - Editable: no
- `sentTimestamp`
  - TypeScript type: `string` | `Date`
  - Required: yes
  - Mock source: last message timestamp
  - Future Firestore collection: `conversations/updatedAt`
  - Editable: no
- `unreadCount`
  - TypeScript type: `number`
  - Required: optional
  - Mock source: unread count fixture
  - Future Firestore collection: `conversations/unreadCount`
  - Editable: no
- `readStatus`
  - TypeScript type: `"sent" | "read" | "delivered"`
  - Required: optional
  - Mock source: message delivery state
  - Future Firestore collection: `conversations/lastMessage/status`
  - Editable: no

# React Native mapping

- `View` for root and container layouts.
- `Text` for title, placeholder text, names, previews, and timestamps.
- `TextInput` for the search field.
- `Pressable` for chat rows and bottom tabs.
- `Image` for avatar photos and icons.
- `FlatList` for the conversation list.

# NativeWind mapping

- `bg-white`
- `rounded-xl` (or `rounded-[8px]`) for cards and inputs.
- `bg-slate-100` / `bg-[#EBF0F5]` for search background.
- `text-slate-900` / `text-[#111827]` for headings.
- `text-slate-500` / `text-[#6B7280]` for secondary copy.
- `p-4`, `px-4`, `py-4`, `gap-4` for spacing.
- `h-11` for search input height.
- `items-center`, `justify-between` for row layouts.

# Component tree

- ChatListScreen
  - RootView
    - StatusBarSpacer
    - Header
      - TitleText
    - SearchBar
      - SearchIcon
      - PlaceholderText
    - ConversationList
      - ConversationRow
        - AvatarImage
        - OnlineDot
        - ConversationInfo
          - NameText
          - PreviewText
        - MetaInfo
          - TimestampText
          - ReadStatusIcon
          - UnreadBadge
    - BottomTabBar
      - TabItem

# States

- Default list state
- Search active state
- Empty state: not shown in Figma; NEEDS_CONFIRMATION
- Unread badge visible state
- Active tab state

# Implementation notes

- Use a `FlatList` for performance and vertical scrolling.
- Keep the search bar fixed at top of the list area.
- Preserve the circular avatar and small online indicator overlay.
- The bottom tab bar is part of the screen frame but may be implemented as a shared app shell component.
- This screen is a customer view by route context; no barber/admin-specific variation is visible in the Figma frame.
