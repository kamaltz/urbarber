# Firestore Index Map (Batch 09B)

## Overview

This document catalogs all 9 composite indexes defined in `firestore.indexes.json`.

Each index is documented with its consumer query, collection, fields, and usage purpose.

---

## Index 1: Bookings by Customer & Status

**File**: `firestore.indexes.json` → indexes[0]  
**Collection**: `bookings`  
**Fields**: `customerId` (ASC), `status` (ASC), `createdAt` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Customer booking history by status (pending, accepted, in_progress, completed, cancelled, rejected)
- Mobile: `src/features/customer/repository/customer.repository.ts` → `getCustomerBookings(customerId, status, limit)`
- Admin: `apps/admin` → Booking filtering by status

**Purpose**: Fast retrieval of customer's bookings filtered by status, ordered by creation date (newest first)

---

## Index 2: Bookings by Barber & Status

**File**: `firestore.indexes.json` → indexes[1]  
**Collection**: `bookings`  
**Fields**: `barberId` (ASC), `status` (ASC), `createdAt` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Barber booking requests (pending, accepted bookings)
- Mobile: `src/app/(barber)/(tabs)/bookings.tsx` → List pending booking requests
- Mobile: `src/features/barbers/repository/barber.repository.ts` → `getBarberBookings(barberId, status)`

**Purpose**: Fast retrieval of barber's assigned bookings filtered by status

---

## Index 3: Bookings by Customer & Payment Status

**File**: `firestore.indexes.json` → indexes[2]  
**Collection**: `bookings`  
**Fields**: `customerId` (ASC), `paymentStatus` (ASC), `createdAt` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Customer payment history (paid, failed, pending, cancelled bookings)
- Revenue analytics: "Paid bookings only" filter (Batch 08: Payment-First)
- Admin: Transaction monitoring by payment status
- Admin: `GET /api/admin/bookings?paymentStatus=paid` filter

**Purpose**: Fast retrieval of customer bookings filtered by payment status (payment-first validation)

---

## Index 4: Barber Services by Barber & Active Status

**File**: `firestore.indexes.json` → indexes[3]  
**Collection**: `barberServices`  
**Fields**: `barberId` (ASC), `active` (ASC)  
**Query Scope**: COLLECTION

**Consumer**:
- Barber's active service offerings (what services does this barber offer?)
- Mobile: `src/app/(customer)/search/[barberId].tsx` → Display barber's active services
- Mobile: `src/features/customer/repository/customer.repository.ts` → `getBarberServices(barberId, active=true)`
- Booking: Service selection dropdown

**Purpose**: Retrieve barber's active services only (filters out inactive/discontinued services)

---

## Index 5: Barbers by Status, Verified Flag & Rating

**File**: `firestore.indexes.json` → indexes[4]  
**Collection**: `barbers`  
**Fields**: `status` (ASC), `verified` (ASC), `ratingAverage` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Barber discovery: "Show only verified, active barbers"
- Mobile: `src/app/(customer)/(tabs)/home.tsx` → Barber discovery list
- Mobile: `src/features/customer/repository/customer.repository.ts` → `getVerifiedBarbers(geohash, radius)`
- Ranking: High-rated barbers first

**Purpose**: Fast retrieval of active, verified barbers ranked by rating (discovery optimization)

---

## Index 6: Barbers by Verification Status, Listing Status & Geohash

**File**: `firestore.indexes.json` → indexes[5]  
**Collection**: `barbers`  
**Fields**: `verificationStatus` (ASC), `status` (ASC), `geohash` (ASC)  
**Query Scope**: COLLECTION

**Consumer**:
- Admin barber management: Filter by verification status (pending, approved, rejected)
- Location-based query: Barbers by geohash (combined with geofencing)
- Admin: `GET /api/admin/barbers?verificationStatus=approved&status=active` filter
- Mobile: Geohash radius query (geofire-common)

**Purpose**: Support admin filtering and location-based barber discovery

---

## Index 7: Reviews by Barber & Creation Date

**File**: `firestore.indexes.json` → indexes[6]  
**Collection**: `reviews`  
**Fields**: `barberId` (ASC), `createdAt` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Barber profile: Display recent reviews
- Mobile: `src/app/(customer)/search/[barberId].tsx` → Reviews section
- Mobile: `src/features/customer/repository/customer.repository.ts` → `getBarberReviews(barberId, limit=10)`
- Rating calculation: `ratingAverage` in barber doc (denormalized from reviews)

**Purpose**: Fast retrieval of barber's reviews ordered by newest first (recency bias)

---

## Index 8: Conversations by Customer & Update Date

**File**: `firestore.indexes.json` → indexes[7]  
**Collection**: `conversations`  
**Fields**: `customerId` (ASC), `updatedAt` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Customer chat list: Show conversations with most recent message first
- Mobile: `src/app/(customer)/chat.tsx` → Conversation list (real-time listener)
- Mobile: `src/features/chat/repository/chat.repository.ts` → `getCustomerConversations(customerId)`

**Purpose**: Real-time listener on customer's conversations, sorted by latest activity (most recent first)

---

## Index 9: Conversations by Barber & Update Date

**File**: `firestore.indexes.json` → indexes[8]  
**Collection**: `conversations`  
**Fields**: `barberId` (ASC), `updatedAt` (DESC)  
**Query Scope**: COLLECTION

**Consumer**:
- Barber chat list: Show assigned conversations with most recent message first
- Mobile: `src/app/(barber)/messages/page.tsx` → Conversation list (real-time listener)
- Mobile: `src/features/chat/repository/chat.repository.ts` → `getBarberConversations(barberId)`

**Purpose**: Real-time listener on barber's conversations, sorted by latest activity

---

## Usage by Feature

### Customer Discovery (F-04..F-09)
- **Index 5**: Barbers by status, verified, rating
- **Index 6**: Geohash-based radius query
- **Index 4**: Barber's active services

### Booking Flow (F-10..F-12)
- **Index 1**: Customer booking history
- **Index 2**: Barber booking requests
- **Index 3**: Payment status filtering (Payment-First)

### Barber Operations (F-14..F-23)
- **Index 2**: Barber's pending/accepted bookings
- **Index 7**: Barber's reviews
- **Index 6**: Admin filter (verification status)

### Chat (F-31)
- **Index 8**: Customer conversation list (real-time)
- **Index 9**: Barber conversation list (real-time)

### Admin Dashboard (F-24..F-30)
- **Index 1**: Booking monitoring (customer filter)
- **Index 3**: Transaction monitoring (payment status)
- **Index 5**: Barber listing (active, verified)
- **Index 6**: Barber registration management (verification status)

---

## Deployment Status

**Current**: Defined in `firestore.indexes.json`  
**Local Emulator**: Emulated (npm run test:firestore-rules)  
**Production**: Pending Firebase deployment (Phase D)

**Deployment Command**:
```bash
firebase deploy --only firestore:indexes
```

**Expected Duration**: 5-15 minutes per index creation on first deployment

---

## Index Optimization Notes

- **No composite index explosion**: Only 9 indexes for 30+ collections
- **Reuse**: Multiple features share single indexes (e.g., Index 5 for discovery & admin)
- **Denormalization**: Some fields (ratingAverage) denormalized to avoid additional indexes
- **Real-time listeners**: Indexes optimize `onSnapshot` queries (Conversations 8 & 9)
- **Geohashing**: Index 6 supports client-side geofencing (geofire-common)

---

## Removal Criteria (for Future Batches)

An index should only be removed if:
1. Code consuming that index is deleted
2. Query pattern is replaced with alternative (e.g., algorithm change)
3. Firestore auto-indexes the pattern (rare; Cloud Firestore creates some automatically)
4. Explicit user decision to remove dead code

**Do NOT speculatively remove indexes** based on assumptions about code usage. Always verify code references first.

---

## Related Documentation

- **Firestore Rules**: `firestore.rules` - Security rules for collections
- **Query Implementation**: `src/features/*/repository/*.ts` - Query usage
- **Admin Queries**: `backend/vercel/src/admin/admin.service.ts` - Admin endpoint queries
- **Batch 09.1**: Phase A PRE-DEPLOYMENT REPORT - Index status verification
