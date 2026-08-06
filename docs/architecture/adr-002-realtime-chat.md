# ADR-002: Real-Time Customer-Barber Text Messaging Architecture (F-31)

## Context
Home service barber appointments require direct communication between the customer and assigned barber for arrival coordination and specific service requests. Previous documentation lacked explicit technical specifications for chat data models, security rules, and state cleanup.

## Decision
We classify **Real-Time Customer-Barber Text Chat (F-31)** as a **Core Thesis MVP requirement**.

### Architecture Specifications
1. **Scope Boundary**: Text messages only between a customer and their assigned barber. No photo/video/audio attachments, no payment payloads, no map location pins, and no admin support chat.
2. **Conversation Identity**: Exactly one conversation document per booking using deterministic ID (`conversations/{bookingId}`).
3. **Data Model**:
   - `conversations/{bookingId}`: Stores metadata (`bookingId`, `customerId`, `barberId`, `participantIds`, `lastMessageText`, `lastMessageSenderId`, `lastMessageAt`, `customerUnreadCount`, `barberUnreadCount`, `status`).
   - `conversations/{bookingId}/messages/{messageId}`: Stores individual messages (`conversationId`, `senderId`, `senderRole`, `text`, `createdAt`, `readBy`).
4. **Real-Time Delivery**: Uses Cloud Firestore `onSnapshot` listeners. React screen components MUST clean up listeners on unmount (`unsubscribe()`).
5. **Lifecycle & Archiving**: When booking status transitions to terminal states (`completed` or `cancelled`), conversation status updates to `'archived'`, disabling new message creation while preserving historical read access.

## Alternatives Considered
- **Third-Party Chat SDKs (Stream / Firebase Chat SDK / Socket.io)**: Rejected to avoid extra paid subscriptions, non-standard auth tokens, or separate WebSocket server infrastructure.
- **Polling HTTP API**: Rejected because Firestore `onSnapshot` provides low-latency real-time updates natively without extra server overhead.

## Consequences
- Requires adding Firestore `conversations` collection and `messages` subcollection rules to `firestore.rules`.
- Requires composite indexes for `conversations` (`participantIds` array-contains + `updatedAt` DESC) and `messages` (`createdAt` ASC).
- Requires updating existing UI routes (`src/app/(customer)/chat.tsx` & `[conversationId].tsx`) to use a custom `useBookingChat` hook instead of in-memory mock state.

## Security Considerations
- **Access Control**: Only authenticated UIDs listed in `resource.data.participantIds` can read conversation documents or messages.
- **Impersonation Prevention**: Security rules enforce `request.resource.data.senderId == request.auth.uid`.
- **Payload Validation**: `text` must be trimmed, non-empty, and limited to 1,000 characters.
- **Immutable Fields**: `bookingId`, `customerId`, `barberId`, and `participantIds` cannot be altered by client updates.

## Validation Gate
- Automated Firestore rules integration test covering authorized read/write, unauthorized cross-user access rejection, and terminal state message blocking.

## Current Status
- **Accepted & Scheduled** (Implementation targeted for Batch 05).
