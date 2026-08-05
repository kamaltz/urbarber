# URBarber Software Architecture Specification

## 1. System Overview & Technology Stack

URBarber is built on a modern, decoupled client architecture:
- **Client Framework**: Expo Router (v57.0.0+), React Native 0.86+, React 19.
- **Language & Styling**: TypeScript strict mode, NativeWind (Tailwind CSS v3).
- **Authentication Provider**: **Firebase Authentication** is the ONLY authentication provider.
- **Application Database**: **Cloud Firestore** stores all application state, domain models, and relational data.
- **Media Storage**: **Supabase Storage** is used strictly for media file storage (avatars, barber photos, service images).

---

## 2. Strict Architectural Rules & Directives

### 2.1 No Direct SDK Calls in Screens
- **Screens (`src/app/`) MUST NOT invoke Firebase SDKs or Supabase SDKs directly.**
- All data access and mutations MUST pass through feature hooks (`src/features/*/hooks/`) and repositories/services (`src/features/*/repository/` or `src/features/services/`).

### 2.2 Supabase Usage Scope
- Supabase is used **ONLY** for file storage via `supabase.storage`.
- **DO NOT create Supabase Auth sessions** or invoke `supabase.auth`.
- Authenticated uploads derive identity via Firebase Auth ID token verification (`accessToken` callback in `src/lib/supabase.ts` passing `firebaseAuth.currentUser.getIdToken()`).

### 2.3 Production Path Integrity
- Do NOT implement fake OTP validation, fake social login token bypasses, random payment simulation (`Math.random() > 0.1`), or hidden mock fallbacks in production repositories.
- Out of scope features must not be added: Payment Gateway, AI Recommendations, Advanced Maps, File Chat, Push Notifications.

---

## 3. Four-Tier Unidirectional Layering Architecture

Data flows strictly top-down across four encapsulated layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. App & Screen Layer                           │
│   (src/app/* - Expo Router pages, parameter parsing, layout shells)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. Feature Hook Layer                           │
│  (src/features/*/hooks - Custom hooks: useCustomerHome, useBookingList)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    3. Service & Repository Layer                       │
│(src/features/*/repository - Firestore queries & Supabase storage service)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       4. Infrastructure / SDK Layer                    │
│ (src/lib/firebase.ts & src/lib/supabase.ts)                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Layer Responsibilities
1. **Screen Layer (`src/app/`)**: Consumes route params (`useLocalSearchParams`), renders NativeWind components, invokes custom hooks, and handles navigation. Contains NO direct backend calls.
2. **Feature Hook Layer (`src/features/*/hooks/`)**: Encapsulates UI state (loading, errors, form inputs), transforms domain models for components, and invokes repository methods.
3. **Service & Repository Layer (`src/features/*/repository/`, `src/features/services/`)**: Executes Firestore collection queries, converts Timestamps, handles image buffer uploads to Supabase Storage, and enforces canonical data formats.
4. **Infrastructure Layer (`src/lib/`)**: Initializes singleton instances of `firebaseApp`, `firebaseAuth`, `firestore`, and `supabase` storage client.

---

## 4. State Management & Auth Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                     State Management Hierarchy                         │
├─────────────────────┬──────────────────────────────────────────────────┤
│ Global Session      │ AuthContext (Firebase Auth state listener,       │
│                     │ current user role, profile cache)                 │
├─────────────────────┼──────────────────────────────────────────────────┤
│ Feature Hook State  │ Domain hooks (useState, useEffect) fetching       │
│                     │ async repository data                            │
├─────────────────────┼──────────────────────────────────────────────────┤
│ Screen Component    │ Local component state for form inputs, draft text,│
│ State               │ and UI modal open/close states                   │
└─────────────────────┴──────────────────────────────────────────────────┘
```

### 4.1 Role-Based Access Control (RBAC)
- User role (`customer`, `barber`, `admin`) is persisted in the Firestore `users` collection upon registration (`doc(firestore, 'users', uid)`).
- `AuthContext` fetches the user's role document upon Firebase `onAuthStateChanged` triggers.
- Route layout guards in `(customer)/_layout.tsx`, `(barber)/_layout.tsx`, and `(admin)/_layout.tsx` enforce role authorization before rendering stack/tab children.

---

## 5. Canonical Enums & Domain Contracts

### 5.1 Canonical Roles
- `customer`: End-user customer searching barbers and making home-service bookings.
- `barber`: Barber service provider managing services, schedules, and incoming bookings.
- `admin`: Platform admin managing verifications, users, categories, and system reports.

### 5.2 Canonical Booking Status Lifecycle
All booking documents in Firestore `bookings` collection MUST use one of the following canonical statuses:

```
[ pending ] ──► (Barber Accepts)  ──► [ accepted ] ──► (Barber Starts) ──► [ in_progress ] ──► (Barber Completes) ──► [ completed ]
     │                                     │
     ├────────► (Barber Rejects) ──► [ rejected ]
     │
     └────────► (Customer/Barber Cancels) ──► [ cancelled ]
```

1. `pending`: Initial status when booking created by customer (F-10).
2. `accepted`: Barber accepts booking request (F-21).
3. `rejected`: Barber declines booking request (F-21).
4. `in_progress`: Barber starts home service (F-22).
5. `completed`: Barber finishes home service (F-22).
6. `cancelled`: Booking cancelled prior to completion (F-21).

---

## 6. Supabase Storage Architecture

```
                               ┌──────────────────────────┐
                               │  Supabase Storage Client │
                               │   (src/lib/supabase.ts)  │
                               └────────────┬─────────────┘
                                            │
                                  Bearer Firebase JWT ID Token
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Bucket: public-media (Supabase)                      │
├────────────────────────────────────────────────────────────────────────┤
│  /avatars/{userId}/avatar.jpg          (Customer/Barber profile photo) │
│  /barbers/{barberId}/shop.jpg          (Barber storefront/work photo)  │
│  /services/{serviceId}/haircut.jpg     (Service visual image)          │
│  /verifications/{barberId}/id.jpg      (Barber verification document)  │
└────────────────────────────────────────────────────────────────────────┘
```

- Public read access enabled for `avatars`, `barbers`, and `services`.
- Authenticated write access granted via Supabase Storage RLS checking Firebase JWT claims.