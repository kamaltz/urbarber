# URBarber Data Model & Storage Specification

## 1. Overview
This document specifies the authoritative Cloud Firestore collection schemas, Supabase Storage bucket layout, and security rules guidelines for URBarber.

---

## 2. Cloud Firestore Schema Specification

### 2.1 Collection: `users`
Primary user document indexed by Firebase Auth `uid`.
```typescript
interface UserDocument {
  uid: string;                 // Firebase Auth UID
  email: string;
  name: string;
  phoneNumber?: string;
  role: "customer" | "barber" | "admin";  // Canonical UserRole
  status: "active" | "pending_verification" | "suspended";
  profileImageUrl?: string;    // Public URL from Supabase Storage
  profileImagePath?: string;   // Relative storage object path
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.2 Collection: `customers`
Customer specific profile document indexed by `userId` (matches `uid`).
```typescript
interface CustomerDocument {
  userId: string;
  email: string;
  name: string;
  phoneNumber?: string;
  address?: string;
  profileImageUrl?: string;    // Supabase Storage URL
  profileImagePath?: string;   // Relative storage object path
  role: "customer";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.3 Collection: `barbers`
Barber profile document indexed by `barberId` (matches `uid`).
```typescript
interface BarberDocument {
  id: string;                  // Barber ID (matches user UID)
  userId: string;
  displayName: string;
  description: string;
  address: string;
  ratingAverage: number;       // e.g. 4.8
  reviewCount: number;         // e.g. 124
  verified: boolean;           // Approved by admin (F-25)
  verificationStatus: "pending" | "approved" | "rejected";
  profileImageUrl?: string;    // Supabase Storage URL
  profileImagePath?: string;   // Storage object path
  serviceTypes: string[];      // Array of category IDs offered
  status: "active" | "suspended";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.4 Collection: `barberServices`
Services offered by barbers.
```typescript
interface BarberServiceDocument {
  id: string;                  // Auto-generated Firestore ID
  barberId: string;            // Foreign key to barbers document
  categoryId: string;          // Foreign key to categories document
  name: string;                // e.g. "Gentleman Haircut"
  description?: string;
  price: number;               // Price in IDR
  durationMinutes: number;     // Estimated duration in minutes
  active: boolean;             // Service availability toggle
  imageUrl?: string;           // Supabase Storage URL
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.5 Collection: `categories`
Global service categories managed by Admin (F-28).
```typescript
interface CategoryDocument {
  id: string;                  // e.g. "haircut", "shaving", "styling"
  name: string;                // Display name
  description?: string;
  icon?: string;
  active: boolean;
  order: number;               // Display sorting index
  createdAt: Timestamp;
}
```

### 2.6 Collection: `barberSchedules`
Operating schedule and time slots for barbers (F-19).
```typescript
interface BarberScheduleDocument {
  barberId: string;            // Primary Key (matches barber ID)
  weeklySchedule: {
    [dayOfWeek: string]: {     // "monday", "tuesday", etc.
      isOpen: boolean;
      openTime: string;        // "09:00"
      closeTime: string;       // "18:00"
    };
  };
  unavailableDates: string[];  // ["2026-08-17", "2026-12-25"]
  updatedAt: Timestamp;
}
```

### 2.7 Collection: `bookings`
Home-service booking transactions. Uses canonical booking status and separate payment status.
```typescript
interface BookingDocument {
  id: string;                  // Auto-generated Firestore ID
  customerId: string;          // Foreign key to customers
  barberId: string;            // Foreign key to barbers
  serviceId: string;           // Foreign key to barberServices
  serviceName: string;
  date: string;                // YYYY-MM-DD
  startTime: string;           // HH:mm (e.g. "14:00")
  address: string;             // Required manual address text
  latitude?: number;           // Optional map latitude (E-01)
  longitude?: number;          // Optional map longitude (E-01)
  locationSource?: "manual" | "current_location" | "map_pin"; // Optional location source
  notes?: string;              // Special instructions
  totalPrice: number;          // Total price in IDR
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
  paymentMethod?: "cash_on_service" | "midtrans_sandbox";
  paymentStatus?: "not_required" | "initiated" | "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded" | "partially_refunded";
  paymentProvider?: "midtrans";
  paymentOrderId?: string;     // URB-{bookingId}
  paymentId?: string;          // bookingId
  paidAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.8 Collection: `conversations`
Real-time customer-barber text chat conversation document (F-31). Primary Key matches `bookingId`.
```typescript
interface ConversationDocument {
  id: string;                  // Primary Key (matches bookingId)
  bookingId: string;           // Foreign key to bookings
  customerId: string;          // Foreign key to customers
  barberId: string;            // Foreign key to barbers
  participantIds: string[];    // [customerId, barberId]
  lastMessageText: string;     // Preview text of last message sent
  lastMessageSenderId: string; // Sender UID of last message
  lastMessageAt: Timestamp;    // Timestamp of last message
  customerUnreadCount: number; // Count of unread messages for customer
  barberUnreadCount: number;   // Count of unread messages for barber
  status: "active" | "archived"; // Active during booking, archived on terminal status
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Subcollection: `conversations/{conversationId}/messages`
Text messages stored inside a conversation.
```typescript
interface MessageDocument {
  id: string;                  // Auto-generated Firestore message ID
  conversationId: string;      // Foreign key to parent conversation (bookingId)
  senderId: string;            // Firebase Auth UID of sender (must match request.auth.uid)
  senderRole: "customer" | "barber"; // Role of sender
  text: string;                // Non-empty trimmed message text (max 1000 characters)
  createdAt: Timestamp;        // Firestore Timestamp
  readBy: string[];            // Array of UIDs that have read the message
}
```

### 2.9 Collection: `payments`
Midtrans Snap payment transaction records. Indexed by `bookingId`.
```typescript
interface PaymentDocument {
  bookingId: string;           // Primary Key (matches bookingId)
  customerId: string;
  barberId: string;
  provider: "midtrans";
  environment: "sandbox" | "production";
  orderId: string;             // URB-{bookingId}
  grossAmount: number;
  status: "initiated" | "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded" | "partially_refunded";
  transactionStatus?: string;  // Midtrans raw status
  fraudStatus?: string;        // "accept" | "challenge" | "deny"
  paymentType?: string;        // "bank_transfer" | "gopay" | "qris" | etc.
  transactionId?: string;      // Midtrans transaction ID
  snapToken?: string;
  redirectUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  paidAt?: Timestamp;
  expiresAt?: Timestamp;
  lastNotificationAt?: Timestamp;
  lastSyncedAt?: Timestamp;
}
```

### 2.10 Collection: `paymentRequests`
Idempotency tracking records for client booking payment requests. Indexed by `{customerId}_{requestId}`.
```typescript
interface PaymentRequestDocument {
  requestId: string;
  customerId: string;
  bookingId: string;
  orderId: string;
  status: "processing" | "completed" | "failed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.11 Collection: `reviews`
Ratings and reviews submitted by customers after booking completion (F-13).
```typescript
interface ReviewDocument {
  id: string;                  // Auto-generated Firestore ID
  bookingId: string;           // Foreign key to bookings (Unique)
  customerId: string;
  barberId: string;
  rating: number;              // 1 to 5
  comment?: string;
  barberReply?: string;        // Barber response (F-16)
  createdAt: Timestamp;
}
```

### 2.12 Collection: `favorites`
Customer favorite barbers list.
```typescript
interface FavoriteDocument {
  id: string;
  customerId: string;
  barberId: string;
  createdAt: Timestamp;
}
```

---

## 3. Supabase Storage Bucket Schema

### 3.1 Bucket: `public-media`
- **Visibility**: Public (Read access granted to anonymous/authenticated users).
- **Structure**:
  ```
  public-media/
  └── {firebaseUid}/
      ├── avatar/avatar-{timestamp}-{random}.jpg
      ├── barbers/storefront.jpg
      └── services/service.jpg
  ```

### 3.2 Bucket: `private-documents`
- **Visibility**: Private (Owner UID or Admin access only).
- **Structure**:
  ```
  private-documents/
  └── {firebaseUid}/
      └── verifications/identity.pdf
  ```

---

## 4. Security Rules Architecture & Chat Rules Guidelines

### 4.1 Firestore Security Rules Architecture
- `users`: User can read their own record; admin can read/write all.
- `customers`: Customer can write own profile (`request.auth.uid == customerId`).
- `barbers`: Barber can write own profile (`request.auth.uid == barberId`); admin can update `verificationStatus`.
- `bookings`: Customer can create booking with status `pending`. Barber can update status `pending` -> `accepted`/`rejected`, `accepted` -> `in_progress`, `in_progress` -> `completed`. Customer can update `pending`/`accepted` -> `cancelled`.
- `reviews`: Customer can create review only if matching booking status is `completed` and `rating` is between 1 and 5.

### 4.2 Chat Security Rules Architecture (F-31)
- **`conversations/{conversationId}`**:
  - Read: `request.auth.uid in resource.data.participantIds`
  - Create: `request.auth.uid in request.resource.data.participantIds` AND `request.resource.data.bookingId == conversationId`
  - Update: `request.auth.uid in resource.data.participantIds` (Only `lastMessageText`, `lastMessageSenderId`, `lastMessageAt`, `customerUnreadCount`, `barberUnreadCount`, `status` can be updated; `bookingId`, `customerId`, `barberId`, `participantIds` are immutable).
  - Delete: `false` (Message history preserved).
- **`conversations/{conversationId}/messages/{messageId}`**:
  - Read: `request.auth.uid in get(/databases/(default)/documents/conversations/$(conversationId)).data.participantIds`
  - Create: `request.auth.uid in get(/databases/(default)/documents/conversations/$(conversationId)).data.participantIds` AND `request.resource.data.senderId == request.auth.uid` AND `request.resource.data.text.trim().size() > 0` AND `request.resource.data.text.size() <= 1000` AND `get(/databases/(default)/documents/conversations/$(conversationId)).data.status == 'active'`
  - Update: `request.auth.uid in get(/databases/(default)/documents/conversations/$(conversationId)).data.participantIds` (Only `readBy` array can be updated for unread tracking).
  - Delete: `false`.

### 4.3 Required Firestore Indexes for Chat
1. Collection `conversations`: `participantIds` (Array-contains) + `updatedAt` DESC
2. Subcollection `messages`: `conversationId` (ASC) + `createdAt` ASC

---

## 5. Supabase Storage RLS Policies
- Policy 1 (Public Read): Allow `SELECT` on `public-media` bucket for all users.
- Policy 2 (Authenticated Write): Allow `INSERT`/`UPDATE`/`DELETE` on `public-media` where path prefix matches `(auth.jwt() ->> 'sub')`.