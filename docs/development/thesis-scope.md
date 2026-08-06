# URBarber Thesis Scope & Feature Classification Specification

## 1. Overview & Core Objective
URBarber is a mobile-first, multi-role home-service barber application built for three distinct actors: **Customer**, **Barber**, and **Admin**. This document defines the authoritative, binding scope classification structure for the project into three distinct tiers:
1. **Core Thesis MVP** (Mandatory requirements F-01 through F-31)
2. **Preferred Core Enhancement** (Interactive location picker E-01)
3. **Additional Demonstration Feature** (Midtrans Snap Sandbox payment integration A-01)

No feature marked out-of-scope shall be treated as a mandatory core acceptance gate.

---

## 2. Authoritative Scope Classification Structure

### Level 1: Core Thesis MVP (F-01 to F-31)
The Core Thesis MVP represents the mandatory, essential requirements necessary to demonstrate the primary value proposition of URBarber. All F-01 through F-31 features are required for final thesis completion.

### Level 2: Preferred Core Enhancement (E-01)
The Preferred Core Enhancement includes features that improve user experience but require technical prerequisites (such as custom Expo development builds). Fallback mechanisms (such as manual text address input) remain mandatory so the application functions even when the enhancement is unavailable.

### Level 3: Additional Demonstration Feature (A-01)
Additional Demonstration Features are optional extensions integrated for proof-of-concept or demonstration purposes. Their failure or unavailability must not block the core booking flow or prevent core MVP completion.

---

## 3. Core Thesis MVP Requirements (F-01 to F-31)

### 3.1 Customer Actor Requirements (F-01 to F-13, F-31)
- **F-01 Customer Registration**: Register new customer account with full name, email, phone number, and password via Firebase Auth.
- **F-02 Customer Login**: Authenticate customer via Firebase Auth email/password credential.
- **F-03 Manage Profile**: View and edit customer profile information (name, phone number, address, avatar image URL & object path via Supabase Storage).
- **F-04 View Barber List**: Browse available barbers with search, filtering by category, and deterministic sorting.
- **F-05 View Barber Details**: View detailed barber profile including rating, address, description, and operating hours.
- **F-06 View Barber Services**: List services offered by a specific barber with duration and pricing.
- **F-07 Select Service**: Choose one or more services for a booking request.
- **F-08 Select Date and Schedule**: Choose appointment date and select available operating time slots.
- **F-09 Enter Home-Service Location**: Input physical text address and notes for home service delivery (manual address input is always supported).
- **F-10 Create Booking**: Submit booking request with status initialized to canonical `pending`.
- **F-11 View Booking Status**: Real-time progress tracker for active bookings (`pending` -> `accepted` -> `in_progress` -> `completed` / `rejected` / `cancelled`).
- **F-12 View Booking History**: Filter and inspect past completed or cancelled booking records.
- **F-13 Submit Rating and Review**: Submit 1–5 star rating, comment, and review tags for completed bookings.
- **F-31 Real-Time Customer-Barber Text Chat**:
  - Mandatory core feature connecting customer and assigned barber for an active/historical booking.
  - Exactly one conversation document per booking using deterministic ID (`conversations/{bookingId}`).
  - Supports **text messages only** (no images, files, voice messages, video calls, payment payloads, or map location attachments).
  - Both participants (customer and assigned barber) may read and send messages.
  - Sender impersonation is strictly forbidden; `senderId` must equal `request.auth.uid`.
  - Message sending is disabled or archived when booking reaches terminal states (`completed` or `cancelled`).
  - Conversation history remains readable for legitimate participants.
  - Delivered via real-time Firestore listeners (`onSnapshot`) with strict listener cleanup on unmount.
  - Admin support chat is NOT part of the core thesis requirement.

### 3.2 Barber Actor Requirements (F-14 to F-23)
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

### 3.3 Admin Actor Requirements (F-24 to F-30)
- **F-24 Admin Login**: Authenticate platform administrator account via Firebase Auth.
- **F-25 Verify Barber Account**: Review pending barber applications and approve or reject verification status.
- **F-26 Manage Customer Data**: Inspect customer accounts, view profile details, and toggle account suspension (`active` / `suspended`).
- **F-27 Manage Barber Data**: Inspect barber listings, details, and toggle account status.
- **F-28 Manage Service Categories**: Create, edit, reorder, and activate global service categories.
- **F-29 Monitor All Bookings**: Global view of all platform bookings across all statuses and actors.
- **F-30 View Operational Reports**: Aggregate platform metrics including total users, booking volume, and revenue summaries.

---

## 4. Preferred Core Enhancement Specifications (E-01)

### E-01 Interactive Booking Location Picker
- **Classification**: Preferred Core Enhancement (Optional UX enhancement, non-blocking for core MVP).
- **Technical Strategy**: Free-first open-source technology stack:
  - `MapLibre React Native` (Vector map renderer)
  - `OpenFreeMap` (Free vector map style tiles)
  - `expo-location` (Device GPS coordinate picker)
- **Development Build Requirement**: Documented that MapLibre React Native requires an Expo development build (`npx expo run:android` / `eas build`) and cannot be validated in standard Expo Go.
- **Billing Safety**: No Google Maps API key or billing-dependent features used as default. No public OpenStreetMap raster tile endpoint used as an unrestricted production backend.
- **Required Map Functionality**:
  - Current-location button (request device GPS)
  - Movable / tappable location pin marker
  - Latitude & longitude coordinate selection
  - Manual text address input
  - Confirmation button to save selected location
- **Fallback Integrity**: Manual text address entry remains the required fallback. The application MUST continue working seamlessly when location permission is denied, GPS is disabled, map tiles fail, or the provider is unreachable.
- **Canonical Booking Location Fields**:
  - `address`: string (Required manual address text)
  - `latitude`: number (Optional coordinate)
  - `longitude`: number (Optional coordinate)
  - `locationSource`: `"manual"` | `"current_location"` | `"map_pin"`
- **Attribution**: Map attribution to OpenFreeMap & OpenStreetMap contributors.
- **Fallback Decision**: If MapLibre/OpenFreeMap is incompatible with a target build, the app falls back gracefully to a native webview/map or text-only address input.

---

## 5. Additional Demonstration Feature Specifications (A-01)

### A-01 Midtrans Snap Sandbox Payment
- **Classification**: Additional Demonstration Feature (Optional integration, non-blocking for core MVP acceptance).
- **Scope Boundary**: Midtrans Sandbox only (`environment: "sandbox"`). Midtrans Production is strictly out of scope.
- **Backend Isolation**: Standalone Vercel backend (`backend/vercel/`) handles Snap token creation, signature verification, and webhook callbacks. `MIDTRANS_SERVER_KEY` remains strictly in Vercel environment variables.
- **Status Separation**: `paymentStatus` remains strictly separate from canonical booking `status`. Server-side webhook or status API is authoritative; client redirect parameters never prove payment.
- **Future Payment Modes Architecture**:
  - `paymentMethod`: `"cash_on_service"` | `"midtrans_sandbox"`
  - `paymentStatus`: `"not_required"` (for cash on service)
- **Current Blocker Note**: Current backend requires `paymentStatus == 'paid'` before barber acceptance. Before Midtrans Sandbox can be considered optional, the backend must be updated in a future batch to support `paymentMethod == 'cash_on_service'` with `paymentStatus == 'not_required'`.

---

## 6. Explicit Out-of-Scope Boundaries

The following features are **STRICTLY EXCLUDED** from project scope:
1. **Midtrans Production**: No real-money transactions, live card processing, or production bank settlements.
2. **Refunds & Settlement Processing**: Automated banking refunds or payout dispatching.
3. **Chat Media Attachments**: No photo, video, audio, or document attachments in chat (F-31 is text-only).
4. **Voice & Video Calls**: No VOIP or WebRTC call implementation.
5. **Admin Support Chat**: No dedicated customer support chat desk for admins.
6. **Live GPS Tracking**: No real-time moving markers for customer or barber during service delivery.
7. **Route Navigation**: No turn-by-turn driving directions or routing engines.
8. **Background Location**: No background location tracking or geofencing.
9. **Push Notifications**: No APNs / FCM push notification server infrastructure (unless approved in later batches).
10. **AI Recommendation Engine**: No machine learning recommendation models.
11. **Hidden Mock Fallbacks**: No fake OTP bypasses, fake social logins, or `Math.random()` payment simulations in production code paths.
