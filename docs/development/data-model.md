# URBarber Data Model & Storage Specification

## 1. Overview
This document specifies the authoritative Cloud Firestore collection schemas, Supabase Storage bucket layout, and database security rules for URBarber.

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
  avatarUrl?: string;          // Public URL from Supabase Storage
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
  fullName: string;
  phoneNumber?: string;
  address?: string;
  profileImage?: string;       // Supabase Storage URL
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
  imageUrl?: string;           // Supabase Storage URL
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
Home-service booking transactions. Uses canonical booking status.
```typescript
interface BookingDocument {
  id: string;                  // Auto-generated Firestore ID
  customerId: string;          // Foreign key to customers
  barberId: string;            // Foreign key to barbers
  serviceId: string;           // Foreign key to barberServices
  serviceName: string;
  date: string;                // YYYY-MM-DD
  startTime: string;           // HH:mm (e.g. "14:00")
  address: string;             // Home service location
  notes?: string;              // Special instructions
  totalPrice: number;          // Total price in IDR
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 2.8 Collection: `reviews`
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

### 2.9 Collection: `favorites`
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
  ├── avatars/{userId}/avatar.jpg
  ├── barbers/{barberId}/storefront.jpg
  ├── services/{serviceId}/service.jpg
  └── verifications/{barberId}/identity.jpg
  ```

---

## 4. Firestore & Supabase Security Rules Guidelines

### 4.1 Firestore Security Rules Architecture
- `users`: User can read their own record; admin can read/write all.
- `customers`: Customer can write own profile (`request.auth.uid == userId`).
- `barbers`: Barber can write own profile (`request.auth.uid == userId`); admin can update `verificationStatus`.
- `bookings`: Customer can create booking with status `pending`. Barber can update status to `accepted`, `rejected`, `in_progress`, `completed`. Both can update status to `cancelled`.
- `reviews`: Customer can create review only if matching booking status is `completed`.

### 4.2 Supabase Storage RLS Policies
- Policy 1 (Public Read): Allow `SELECT` on `public-media` bucket for all users.
- Policy 2 (Authenticated Write): Allow `INSERT`/`UPDATE` on `public-media` where path prefix matches Firebase JWT `request.auth.uid`.