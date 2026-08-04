# URBarber Data Model & Firestore Schema Specification

## 1. Domain Types vs Feature Types Overview

The codebase currently contains domain entity definitions in `src/types/domain.ts` alongside feature-specific models in `src/features/*/types/`. To ensure data integrity across customer, barber, and admin modules, all Firestore documents must map to unified domain schemas.

---

## 2. Status Enum Harmonization Matrix

Existing type definitions contain conflicting status strings across feature folders. The table below defines the **Harmonized Canonical Enums** required for full platform alignment:

### 2.1 User Enums
```typescript
export type UserRole = 'customer' | 'barber' | 'admin';

export type UserStatus = 'active' | 'pending_verification' | 'suspended' | 'inactive';

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
```

### 2.2 Booking Status Enum Mapping
```typescript
// Canonical Booking Status Enum across Domain, Customer, Barber, and Admin
export type BookingStatus =
  | 'pending'     // Customer requested, awaiting barber confirmation
  | 'waiting'     // Confirmed/Accepted by barber, awaiting appointment date/time
  | 'booked'      // Payment completed / slot secured
  | 'on_process'  // Service currently being rendered (in progress)
  | 'finished'    // Service completed by barber
  | 'cancelled';   // Cancelled by customer, barber, or system
```

#### Legacy Status Conversion Table
| Legacy / Feature Status | Canonical Firestore Value | UI Display Label (Indonesian) |
| --- | --- | --- |
| `in_progress` | `on_process` | Dalam Proses |
| `accepted` | `waiting` | Menunggu |
| `completed` | `finished` | Selesai |
| `rejected` | `cancelled` | Dibatalkan |

### 2.3 Moderation Status Enum
```typescript
export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
```

---

## 3. Firestore Collection Schemas

### 3.1 `customers` Collection
Doc ID: `userId` (Firebase Auth UID)
```typescript
interface CustomerDocument {
  userId: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  profileImage: string | null;
  role: 'customer';
  status: UserStatus;
  verificationStatus: VerificationStatus;
  membershipTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  selectedCategories?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.2 `barbers` Collection
Doc ID: `barberId` (Firebase Auth UID)
```typescript
interface BarberDocument {
  barberId: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  description: string;
  address: string;
  serviceType: string[];          // e.g., ['Haircut', 'Shave', 'Coloring']
  ratingAverage: number;          // e.g., 4.8
  reviewCount: number;
  verified: boolean;
  verificationStatus: VerificationStatus;
  imageUrl: string | null;
  status: UserStatus;
  location?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.3 `barberServices` Collection
Doc ID: `serviceId` (Auto-generated)
```typescript
interface BarberServiceDocument {
  serviceId: string;
  barberId: string;
  name: string;
  description: string;
  price: number;                  // Currency value in IDR
  durationMinutes: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 3.4 `barberSchedules` Collection
Doc ID: `barberId`
```typescript
interface BarberScheduleDocument {
  barberId: string;
  schedule: Record<string, {
    isOpen: boolean;
    openTime: string;             // e.g., '09:00'
    closeTime: string;            // e.g., '21:00'
  }>;
  availableSlots?: string[];      // e.g., ['09:00', '10:00', '11:00']
  updatedAt: Timestamp;
}
```

### 3.5 `bookings` Collection
Doc ID: `bookingId` (Auto-generated)
```typescript
interface BookingDocument {
  bookingId: string;
  customerId: string;
  barberId: string;
  bookingType: 'home' | 'onsite';
  scheduledAt: string;            // ISO Date string 'YYYY-MM-DD'
  scheduledTime: string;          // e.g., '10:00'
  status: BookingStatus;
  verificationStatus?: VerificationStatus;
  flaggedReason?: string;
  address?: string;
  locationNotes?: string;
  services: Array<{
    id: string;
    name: string;
    price: number;
    durationMinutes?: number;
  }>;
  subtotal: number;
  travelFee: number;
  handlingFee: number;
  discount: number;
  couponCode?: string;
  totalPrice: number;
  paymentMethod?: 'bank_transfer' | 'e_wallet' | 'cash';
  paymentStatus?: 'pending' | 'completed' | 'failed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3.6 `reviews` Collection
Doc ID: `reviewId` (Auto-generated)
```typescript
interface ReviewDocument {
  reviewId: string;
  bookingId: string;
  customerId: string;
  barberId: string;
  rating: number;                 // Integer 1..5
  reviewText: string;
  tags?: string[];                // e.g., ['Ramah', 'Rapi', 'Tepat Waktu']
  barberReply?: string;
  barberReplyAt?: Timestamp;
  moderationStatus: ModerationStatus;
  moderatedBy?: string;
  moderationReason?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 3.7 `conversations` Collection & `messages` Sub-collection
Doc ID: `conversationId` (Auto-generated)
```typescript
interface ConversationDocument {
  conversationId: string;
  participants: string[];         // Array of UIDs [customerId, barberId/adminId]
  participantDetails: Record<string, {
    name: string;
    avatarUrl?: string;
    role: UserRole;
  }>;
  lastMessage: string;
  lastMessageTimestamp: Timestamp;
  unreadCount: Record<string, number>; // UID -> unread count
  createdAt: Timestamp;
}

// Sub-collection: conversations/{conversationId}/messages/{messageId}
interface MessageDocument {
  messageId: string;
  senderId: string;
  content: string;
  timestamp: Timestamp;
  read: boolean;
}
```

### 3.8 `supportTickets` Collection
Doc ID: `ticketId` (Auto-generated)
```typescript
interface SupportTicketDocument {
  ticketId: string;
  userId: string;
  userRole: UserRole;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

## 4. Entity Relationships & Normalization Rules

```
  ┌──────────────┐         1:N         ┌──────────────┐
  │  customers   ├────────────────────►│   bookings   │
  └──────────────┘                     └──────┬───────┘
                                              │
  ┌──────────────┐         1:N                │ 1:1
  │   barbers    ├────────────────────────────┼──────────────┐
  └──────┬───────┘                            │              │
         │                                    ▼              ▼
     1:N │                             ┌──────────────┐┌──────────────┐
         ├────────────────────────────►│   reviews    ││ conversations│
         │                             └──────────────┘└──────────────┘
         │ 1:N
         ├────────────────────────────► barberServices
         │
         │ 1:1
         └────────────────────────────► barberSchedules
```

1. **Booking Denormalization**: `bookings` documents store snapshot copies of `services` (service name and price at the time of booking) to prevent historical invoice mutation when a barber changes service prices.
2. **Aggregated Ratings**: `barbers` documents store `ratingAverage` and `reviewCount` denormalized for fast listing queries. Every new review write trigger updates these fields atomically.
3. **Participant Indexes**: `conversations` store an array of participant UIDs in `participants` to enable Firestore `array-contains` index queries across all roles.