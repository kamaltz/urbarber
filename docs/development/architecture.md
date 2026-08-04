# URBarber Software Architecture Specification

## 1. System Overview

URBarber is a mobile-first, multi-role platform built with **React Native**, **Expo Router v57**, **NativeWind (Tailwind CSS)**, and **Firebase** (Authentication & Firestore). The application architecture follows a **Feature-Driven Architecture** combined with a clean repository pattern to segregate concerns between visual presentation, business domain logic, and data storage layers.

---

## 2. Directory & Architectural Layers

```
src/
├── app/                   # Expo Router Root (File-based navigation & route groups)
│   ├── (auth)/            # Authentication & Onboarding route group
│   ├── (customer)/        # Customer user experience stack & tabs
│   ├── (barber)/          # Barber operations stack & tabs (Target)
│   └── (admin)/           # Admin management stack & tabs (Target)
├── components/            # Cross-cutting UI Primitives & Navigation components
│   ├── navigation/        # Bottom tab bars & screen wrapper shells
│   └── ui/                # Atomic UI elements (AppButton, AppCard, AppInput, Avatar, Rating)
├── constants/             # Global constants, typography, theme tokens & route builders
├── features/              # Feature Modules (Domain-Driven Design)
│   ├── admin/             # Admin domain types, hooks, mocks, & components
│   ├── auth/              # Auth context, validation schemas, & services
│   ├── barbers/           # Barber operations components, hooks, & types
│   ├── bookings/          # Booking state, timeline components, & hooks
│   ├── chat/              # Chat messaging hooks & components
│   ├── customer/          # Customer dashboard, search, & profile hooks
│   ├── profile/           # Profile management utilities
│   ├── reviews/           # Review moderation & submission
│   ├── services/          # Barber service management
│   └── verification/      # Identity verification workflow
├── hooks/                 # Global utility hooks (useTheme, useColorScheme, useAsyncData)
├── lib/                   # Infrastructure integrations (Firebase init, Navigation helpers)
├── repositories/          # Modular repository definitions
├── shared/                # Shared constants, types, & UI widgets across actors
└── types/                 # Canonical domain type definitions
```

---

## 3. Tiered Layering Pattern

The codebase enforces a strict unidirectional data flow across four layers:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         1. App & Screen Layer                          │
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
 │                         3. Repository Layer                            │
 │(src/features/*/repository - Abstracted data fetchers & mutators)       │
 └───────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                       4. Data Source / SDK Layer                       │
 │ (src/lib/firebase.ts & static mock data fallbacks)                     │
 └────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Layer Responsibilities
1. **Screen Layer (`src/app`)**: Reads route params (`useLocalSearchParams`), renders page layouts, delegates user interaction to custom feature hooks, and handles navigation transitions via `@/constants/routes`.
2. **Feature Hook Layer (`src/features/*/hooks`)**: Manages loading state, error states, data transformation, and UI event handlers. Exposes clean hooks (e.g., `useBookingList`, `useCustomerHome`) to screens.
3. **Repository Layer (`src/features/*/repository`)**: Provides clean async methods (`getCustomerProfile`, `createBooking`, `updateBookingStatus`). Encapsulates Firestore query construction, document parsing, timestamp conversions, and fallback error handling.
4. **Data Source Layer (`src/lib/firebase.ts`)**: Initializes Firebase App, Auth, and Firestore instances using environment variables (`EXPO_PUBLIC_FIREBASE_*`).

---

## 4. State Management Strategy

The application uses a hybrid state management model tailored to scope and lifespan:

```
┌────────────────────────────────────────────────────────────────────────┐
│                     State Management Hierarchy                         │
├─────────────────────┬──────────────────────────────────────────────────┤
│ Global Session      │ AuthContext (Firebase Auth user, OTP session,    │
│                     │ loading status)                                  │
├─────────────────────┼──────────────────────────────────────────────────┤
│ Feature Hook State  │ Custom React hooks (useState, useEffect,          │
│                     │ useCallback) backed by Firestore repositories    │
├─────────────────────┼──────────────────────────────────────────────────┤
│ Local Screen State  │ React local state for form inputs, draft messages│
│                     │ step steps, and UI modal toggles                 │
└─────────────────────┴──────────────────────────────────────────────────┘
```

1. **Global Auth State (`AuthContext`)**: Located in `src/features/auth/context/auth-context.tsx`. Manages user authentication lifecycle via `onAuthStateChanged(firebaseAuth)` and `AsyncStorage` session caching.
2. **Feature State (Hook-driven)**: Custom domain hooks (`useBookingDetail`, `useScheduleSelector`, `useCustomerSearch`) fetch async repository data and manage reactive state locally.
3. **Screen Form State**: Form state (login input fields, review ratings, draft chat messages) lives within local screen component state to prevent unnecessary re-renders across the tree.

---

## 5. Navigation & Routing Design

Navigation is managed by **Expo Router v57**, leveraging file-based routing and route groups to enforce actor separation without polluting public URL paths:

- **`(auth)` Group**: Non-authenticated screens (`login`, `register-customer`, `forgot-password`, `otp-verification`, dynamic `onboarding/[step]`).
- **`(customer)` Group**: Customer experience stack (`home`, `explore`, `favorites`, `chat`, `profile`, `barber/[barberId]`, `booking/*`).
- **`(barber)` Group (Target)**: Barber operations tab navigator (`bookings`, `schedule`, `services`) and stack screens.
- **`(admin)` Group (Target)**: Platform administration dashboard, user queue, and moderation screens.

### Navigation Helper Contract
All internal links must use the type-safe static route helpers defined in `src/constants/routes.ts` rather than hardcoded string paths:

```typescript
// Example static and dynamic route invocation
router.push(routes.customer.home);
router.push(routes.customer.barber(barberId));
router.push(routes.customer.chat(conversationId));
```

---

## 6. Reusable Component Architecture

To promote visual consistency across Customer, Barber, and Admin roles, components are organized into hierarchical categories:

### 6.1 Atomic UI Primitives (`src/components/ui/`)
- **`AppButton`**: Standard button with primary, secondary, and loading spinner variants.
- **`AppInput`**: Input field with label, error text, and keyboard avoidance support.
- **`AppCard`**: Surface container with elevation and pressable capability.
- **`Avatar`**: User avatar with online/offline status indicators.
- **`Badge` / `Rating`**: Badges for statuses and star rating displays.
- **`Loading` / `EmptyState`**: Generic loading placeholders and empty list indicators.

### 6.2 Layout & Navigation Containers (`src/components/navigation/`)
- **`CustomerScreen`**: Standard container shell providing header, title, description, scroll container, and optional tab bar.
- **`CustomerBottomNavigation`**: Bottom tab navigation bar shared across main customer tabs.

### 6.3 Cross-Actor Target Component Primitives
- **`ChatRoomScreenShell`**: Reusable chat room layout shared across Customer, Barber, and Admin.
- **`ChatListScreenShell`**: Reusable conversation list shell.
- **`BookingStatusBadge`**: Unified status badge mapping backend status enums to colors.

---

## 7. Offline Resilience & Fallback Architecture

To ensure graceful degradation during weak network conditions or missing backend Firestore documents, the repository layer incorporates an offline fallback mechanism:

```typescript
// Pattern implemented in customerRepository
function isOfflineError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === 'unavailable' || candidate.message?.toLowerCase().includes('client is offline') === true;
}
```

When a Firestore query fails due to connectivity issues or non-existent documents, repositories return local fallback constants (`MOCK_CUSTOMER_PROFILE`, `MOCK_CUSTOMER_HOME_DATA`) rather than crashing the component layer.