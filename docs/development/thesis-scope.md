# URBarber Thesis MVP Scope Specification

## 1. Overview & Core Objective
URBarber is a mobile-first, multi-role home service barber application designed for three distinct actors: **Customer**, **Barber**, and **Admin**. This document defines the authoritative, binding scope for the Thesis MVP.

---

## 2. Authoritative Feature Scope (F-01 to F-30)

### 2.1 Customer Actor Requirements (F-01 to F-13)
- **F-01 Customer Registration**: Register new customer account with full name, email, phone number, and password via Firebase Auth.
- **F-02 Customer Login**: Authenticate customer via Firebase Auth email/password credential.
- **F-03 Manage Profile**: View and edit customer profile information (name, phone number, address, avatar image URL via Supabase Storage).
- **F-04 View Barber List**: Browse available barbers with search, filtering by category, and sorting.
- **F-05 View Barber Details**: View detailed barber profile including rating, address, description, and operating hours.
- **F-06 View Barber Services**: List services offered by a specific barber with duration and pricing.
- **F-07 Select Service**: Choose one or more services for a booking request.
- **F-08 Select Date and Schedule**: Choose appointment date and select available operating time slots.
- **F-09 Enter Home-Service Location**: Input physical address and notes for home service delivery.
- **F-10 Create Booking**: Submit booking request with status initialized to canonical `pending`.
- **F-11 View Booking Status**: Real-time progress tracker for active bookings (`pending` -> `accepted` -> `in_progress` -> `completed` / `rejected` / `cancelled`).
- **F-12 View Booking History**: Filter and inspect past completed or cancelled booking records.
- **F-13 Submit Rating and Review**: Submit 1–5 star rating, comment, and review tags for completed bookings.

### 2.2 Barber Actor Requirements (F-14 to F-23)
- **F-14 Barber Registration**: Register barber user account and submit profile verification details.
- **F-15 Barber Login**: Authenticate barber user via Firebase Auth email/password credential.
- **F-16 Manage Barber Profile**: Edit barber profile info, business bio, address, and profile/cover media.
- **F-17 Manage Services**: Create, edit, and toggle active status of offered haircut and grooming services.
- **F-18 Manage Service Prices**: Set and update pricing (in IDR) and estimated duration for each service.
- **F-19 Manage Operating Schedule**: Configure weekly working days, open/close operating hours, and blacked-out unavailable dates.
- **F-20 View Booking Requests**: Monitor incoming customer booking requests filtering by status.
- **F-21 Accept or Reject Bookings**: Transition incoming `pending` bookings to `accepted` or `rejected`.
- **F-22 Update Service Status**: Transition active `accepted` bookings to `in_progress` and subsequently `completed`.
- **F-23 View Transaction History**: Review past completed bookings and total revenue metrics.

### 2.3 Admin Actor Requirements (F-24 to F-30)
- **F-24 Admin Login**: Authenticate platform administrator account via Firebase Auth.
- **F-25 Verify Barber Account**: Review pending barber applications and approve or reject verification status.
- **F-26 Manage Customer Data**: Inspect customer accounts, view profile details, and toggle account suspension (`active` / `suspended`).
- **F-27 Manage Barber Data**: Inspect barber listings, details, and toggle account status.
- **F-28 Manage Service Categories**: Create, edit, reorder, and activate global service categories.
- **F-29 Monitor All Bookings**: Global view of all platform bookings across all statuses and actors.
- **F-30 View Operational Reports**: Aggregate platform metrics including total users, booking volume, and revenue summaries.

---

## 3. Explicit Out-of-Scope Boundaries

The following features and patterns are **STRICTLY EXCLUDED** from the thesis scope and must not be implemented:
1. **Payment Gateway Integration**: No live payment processors (Stripe, Midtrans, etc.). Invoice screen completes booking creation directly.
2. **AI Recommendation Engine**: No automated AI recommendations or machine learning sorting.
3. **Advanced Maps / Live GPS Tracking**: No interactive map canvas or real-time location tracking pins; address entry is text-based.
4. **File / Attachment Chat**: In-app messaging is text-only; no file or media attachment handling in chat.
5. **Push Notifications**: No APNs or FCM push notification server pipelines.
6. **Fake / Mock Production Code Paths**:
   - No hardcoded dummy OTP codes or local `AsyncStorage` fake sessions.
   - No unverified social login token bypasses.
   - No randomized payment simulation (`Math.random() > 0.1`).
   - No hidden mock data returns in production repository error paths.

---

## 4. Technical Constraints & System Rules

1. **Authentication**: **Firebase Authentication** is the sole auth provider.
2. **Database**: **Cloud Firestore** stores all application business documents.
3. **Storage**: **Supabase Storage** (bucket: `public-media`) handles media files using Firebase Auth ID token verification. No Supabase Auth sessions are created.
4. **Architecture**: Clean repository pattern (Screens -> Custom Hooks -> Repositories -> Firebase/Supabase SDKs). Screens MUST NOT call Firebase or Supabase directly.
5. **Canonical Roles**: `customer`, `barber`, `admin`.
6. **Canonical Booking Statuses**: `pending`, `accepted`, `rejected`, `in_progress`, `completed`, `cancelled`.
