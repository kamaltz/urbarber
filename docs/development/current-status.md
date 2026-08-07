# URBarber Repository Status & Implementation Reconciliation Report

## 1. Executive Summary

This report presents an empirical reconciliation of the URBarber repository status on branch `docs/batch-01-scope-roadmap`.

All features across the application are categorized according to their explicit verification state:
- **`code implemented`**: Code exists in codebase.
- **`automated test passed`**: Verified via local Vitest / Node test runner.
- **`emulator test passed`**: Verified via local Firebase / Firestore emulator.
- **`deployment pending`**: Code ready, awaiting production deployment (e.g. Vercel, Firebase rules).
- **`live test pending`**: Requires live multi-role environment testing.
- **`documentation only`**: Architecture or specification defined in docs.
- **`planned`**: Scheduled for future implementation batch.

---

## 2. Feature & Architecture Status Matrix

### 2.1 Core Subsystems Status
| Subsystem | Scope Classification | Implementation Status | Automated Test | Deployment Status | Live Test Status | Blockers / Notes |
|---|---|---|---|---|---|---|
| **Batch 00 Consolidation** | Infrastructure | `code implemented` | `automated test passed` | N/A | `live test pending` | Consolidated in history (Commit `ea3e50a`) |
| **Auth & Claims** | Core (F-01, F-02) | `code implemented` | N/A | N/A | `live test pending` | Web persistence fallbacks added (`cdfd3bc`) |
| **Storage RLS & Avatars** | Core (F-03) | `code implemented` | N/A | `deployment pending` | `live test pending` | `storage-policies.sql` pending Supabase deployment |
| **Customer Discovery** | Core (F-04..F-09) | `code implemented` | N/A | N/A | `live test pending` | Text address input active |
| **Booking & Slot-Lock** | Core (F-10..F-12) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | `firestore.rules` pending Firebase deployment |
| **Real-Time Text Chat** | Core (F-31) | `code implemented` (UI shell only) | N/A | N/A | `planned` | Firestore `onSnapshot` listeners & rules missing |
| **Barber Operations** | Core (F-14..F-23) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | Status transitions (`accepted`->`in_progress`->`completed`) verified via tests |
| **Barber Verification** | Core (F-14, F-25) | `code implemented` | `automated test passed` | `deployment pending` | `live test pending` | Direct barber registration & onboarding wizard implemented (Batch 03) |
| **Admin Operations** | Core (F-24..F-30) | `planned` | N/A | N/A | `planned` | Admin queue & management scheduled for Batch 04 |
| **Location Map Picker** | Preferred Enhancement (E-01) | `code implemented` (Text fallback only) | N/A | N/A | `blocked` | MapLibre picker requires Expo dev build |
| **Midtrans Sandbox Payment** | Additional Feature (A-01) | `code implemented` (Vercel backend) | `automated test passed` | `deployment pending` | `live test pending` | Vercel deployment & Midtrans webhook setup required |

---

## 3. Detailed Component Breakdown

### 3.1 Midtrans Sandbox Backend (`backend/vercel/`)
- **Code Status**: `code implemented`
- **Testing Status**: `automated test passed` (10 Vitest tests passed, 6 payment unit tests passed)
- **Deployment Status**: `deployment pending` (Awaiting Vercel production deployment)
- **Scope Note**: Classified as **Additional Demonstration Feature (A-01)**. Payment processing is NOT a mandatory gate for Core MVP acceptance.

### 3.2 Real-Time Customer-Barber Text Chat (F-31)
- **Code Status**: `code implemented` (Partial UI routes `src/app/(customer)/chat.tsx` & `[conversationId].tsx` exist using in-memory mock state)
- **Backend Status**: `planned` (Scheduled for Batch 05)
- **Scope Note**: Classified as **Core Thesis MVP (F-31)**. Text chat between customer and assigned barber for a specific booking is required for thesis completion.

### 3.3 Interactive Booking Location Picker (E-01)
- **Code Status**: `code implemented` (Manual text address fallback in `src/app/(customer)/booking/location.tsx` active)
- **Map Component**: `planned` (Scheduled for Batch 06)
- **Scope Note**: Classified as **Preferred Core Enhancement (E-01)**. MapLibre React Native + OpenFreeMap stack requires an Expo development build (`npx expo run:android` / `eas build`).

---

## 4. Summary of Current Blockers

The following items are current project blockers that must be addressed in their respective upcoming batches:

1. **Chat Real-Time Implementation**: Firestore `conversations/{bookingId}` and `messages` subcollection listeners (`onSnapshot`) absent (Scheduled: Batch 05).
2. **Chat Security Rules & Indexes**: Firestore rules and index definitions for `conversations` and `messages` absent (Scheduled: Batch 05).
3. **Map Development Build**: MapLibre React Native requires an Expo development build (`npx expo run:android`) and cannot run in Expo Go (Scheduled: Batch 06).
4. **Map Fallback Validation**: Verification that text address entry remains 100% functional when location permission or map tiles fail (Scheduled: Batch 06).
5. **Optional Payment-Mode Decoupling**: Backend currently requires `paymentStatus == 'paid'` before barber acceptance. Decoupling `paymentMethod == 'cash_on_service'` with `paymentStatus == 'not_required'` is required before Midtrans Sandbox can truthfully be optional (Scheduled: Batch 07).
6. **Vercel Backend Deployment**: `backend/vercel` needs deployment to Vercel with environment variables (`MIDTRANS_SERVER_KEY`, Firebase service account) configured (Scheduled: Batch 02).
7. **Midtrans Webhook Configuration**: Midtrans Sandbox Dashboard notification URL must be set to `https://<vercel-app>.vercel.app/api/payments/webhook` (Scheduled: Batch 02).
8. **Firestore Rules & Indexes Deployment**: Production deployment of `firestore.rules` and `firestore.indexes.json` via Firebase CLI (Scheduled: Batch 02).
9. **Live Three-Role Testing**: End-to-end live testing across Customer, Barber, and Admin roles in staged environment (Scheduled: Batch 09).