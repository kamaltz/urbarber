# Direct Barber Registration & Firebase Account Bootstrap Guide

## 1. Executive Summary

This document specifies the authoritative architecture for **Direct Barber Registration** and **Firebase Account Bootstrap** in URBarber (Batch 03).

### Key Architectural Shift
- **Primary Registration Roles**: Users choose **Customer** or **Barber** during initial registration. Customer and Barber are separate primary account types from creation.
- **No Customer-to-Barber Conversion**: Customer-to-barber role conversion flows are removed. Dual-role accounts are strictly forbidden.
- **Trusted Vercel Backend Initialization**: Firebase Custom User Claims (`role: 'authenticated'`, `app_role: 'customer' | 'barber'`) and primary Firestore documents (`users/{uid}`, `customers/{uid}`, `barbers/{uid}`, `barberRegistrations/{uid}`) are written exclusively via trusted Vercel backend (`POST /api/auth/initialize-account`). Client code NEVER writes roles or custom claims directly.

---

## 2. Authoritative Account Creation Flow

### 2.1 Customer Registration Flow
```
Role Selection ('customer')
└── Firebase Auth createUserWithEmailAndPassword
    └── updateProfile (displayName)
        └── sendEmailVerification
            └── Get Firebase ID Token
                └── POST /api/auth/initialize-account (Vercel Backend)
                    ├── Set Custom Claim (app_role = 'customer')
                    ├── Write users/{uid} (role = 'customer', status = 'active')
                    └── Write customers/{uid}
                        └── Force Token Refresh (getIdToken(true))
                            └── Route to /(customer)/home
```

### 2.2 Barber Registration Flow
```
Role Selection ('barber')
└── Firebase Auth createUserWithEmailAndPassword
    └── updateProfile (displayName)
        └── sendEmailVerification
            └── Get Firebase ID Token
                └── POST /api/auth/initialize-account (Vercel Backend)
                    ├── Set Custom Claim (app_role = 'barber')
                    ├── Write users/{uid} (role = 'barber', status = 'pending_verification')
                    ├── Write barbers/{uid} (verificationStatus = 'draft', onboardingStatus = 'account_created')
                    └── Write barberRegistrations/{uid} (verificationStatus = 'draft')
                        └── Force Token Refresh (getIdToken(true))
                            └── Route to /(barber-onboarding)/profile
                                ├── Step 1: Personal & Business Info (profile.tsx)
                                ├── Step 2: Address & Service Area (business.tsx)
                                ├── Step 3: Private Document Upload (documents.tsx)
                                ├── Step 4: Review & Submit (review.tsx) -> POST /api/barber/registration/submit
                                └── Step 5: Verification Status Tracker (status.tsx)
```

---

## 3. Trusted Vercel Endpoints

### 3.1 `POST /api/auth/initialize-account`
- **Authentication**: Requires valid Firebase ID token in `Authorization: Bearer <token>` header.
- **Request Body**:
  ```json
  {
    "requestedRole": "customer" | "barber",
    "name": "Full User Name",
    "phoneNumber": "+6281234567890"
  }
  ```
- **Idempotency Strategy**: Uses `accountBootstraps/{uid}` document. A repeated call with the same `requestedRole` returns success. A repeated call with a different role returns `400 Bad Request` with `ROLE_ALREADY_INITIALIZED`.
- **Response**:
  ```json
  {
    "success": true,
    "uid": "FIREBASE_UID",
    "appRole": "customer" | "barber",
    "userStatus": "active" | "pending_verification",
    "onboardingStatus": "completed" | "account_created",
    "nextRoute": "/(customer)/home" | "/(barber-onboarding)/profile"
  }
  ```

### 3.2 `POST /api/barber/registration/submit`
- **Authentication**: Requires valid Firebase ID token with `app_role === 'barber'`.
- **Pre-Conditions**: Requires `emailVerified === true` on Firebase Admin user record.
- **Path Validation**: Verifies all document paths in `documentPaths` start with `{uid}/barber-registration/`.
- **Response**:
  ```json
  {
    "success": true,
    "verificationStatus": "pending",
    "onboardingStatus": "submitted",
    "nextRoute": "/(barber-onboarding)/status"
  }
  ```

---

## 4. Supabase Private Storage Rules
Private identity documents (KTP, certificates) are uploaded to Supabase Storage bucket `private-documents` at path:
`{firebaseUid}/barber-registration/{documentType}/{timestamp}.jpg`

- **Read Access**: Only the file owner (`(storage.foldername(name))[1] = auth.jwt() ->> 'sub'`) or platform Admin (`auth.jwt() ->> 'app_role' = 'admin'`) can read files in `private-documents`.
- **Write Access**: Only the file owner can upload/update/delete objects in their own UID folder.

---

## 5. Partial Initialization Recovery
If a user signs in to Firebase Auth but backend initialization or claims setup was interrupted:
1. `AuthProvider` detects `isUninitialized = true`.
2. User is routed to `/(auth)/complete-account-setup`.
3. User selects/confirms role and retries `initialize-account` without creating a duplicate Firebase Auth account.

---

## 6. Manual Testing Procedure

1. **Test Customer Direct Registration**:
   - Open registration screen `/(auth)/register-customer`.
   - Select **Pelanggan (Customer)** role tab.
   - Enter name, email, phone, password, and accept terms.
   - Submit registration -> Redirected to `/(auth)/verification-email`.
   - Verify `users/{uid}` and `customers/{uid}` documents created in Firestore.
   - Verify `app_role` custom claim is `'customer'`.

2. **Test Barber Direct Registration**:
   - Open registration screen `/(auth)/register-customer`.
   - Select **Mitra Barber** role tab.
   - Enter name, email, phone, password, and accept terms.
   - Submit registration -> Redirected to `/(auth)/verification-email`.
   - Verify `users/{uid}` (`status = 'pending_verification'`), `barbers/{uid}` (`verificationStatus = 'draft'`), and `barberRegistrations/{uid}` created.
   - Verify `app_role` custom claim is `'barber'`.
   - Complete onboarding steps: Profile -> Address -> Document Upload (`ktp`) -> Review -> Submit.
   - Verify `verificationStatus` transitions to `'pending'` and screen displays verification status tracker.
