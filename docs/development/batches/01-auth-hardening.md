# Batch 01: Authentication Hardening & Role Protection

## 1. Scope
Hardening application authentication and role-based access control (RBAC) across customer, barber, and admin roles. Removes fake OTP logic and unverified social login bypasses, ensuring Firebase Authentication is the single source of truth. Features addressed: F-01 (Customer Registration), F-02 (Customer Login), F-14 (Barber Registration), F-15 (Barber Login), F-24 (Admin Login).

---

## 2. Affected Files

- `[MODIFY]` [auth-context.tsx](file:///e:/app/urbarber/src/features/auth/context/auth-context.tsx) (Add `role` to AuthUser state; fetch role from Firestore `users` collection)
- `[MODIFY]` [auth.service.ts](file:///e:/app/urbarber/src/features/auth/services/auth.service.ts) (Purge fake OTP storage; require valid Firebase credentials for Google sign-in)
- `[MODIFY]` [(auth)/_layout.tsx](file:///e:/app/urbarber/src/app/\(auth\)/_layout.tsx) (Update layout stack options)
- `[NEW]` [(auth)/register-barber.tsx](file:///e:/app/urbarber/src/app/\(auth\)/register-barber.tsx) (Barber registration screen file F-14)
- `[MODIFY]` [(customer)/_layout.tsx](file:///e:/app/urbarber/src/app/\(customer\)/_layout.tsx) (Add customer role guard protection)
- `[NEW]` [(barber)/_layout.tsx](file:///e:/app/urbarber/src/app/\(barber\)/_layout.tsx) (Add barber layout & role guard protection)
- `[NEW]` [(admin)/_layout.tsx](file:///e:/app/urbarber/src/app/\(admin\)/_layout.tsx) (Add admin layout & role guard protection)

---

## 3. Acceptance Criteria

1. Registering a customer creates a user in Firebase Auth and document in Firestore `users` & `customers` collections with `role: "customer"`.
2. Registering a barber creates a user in Firebase Auth and document in Firestore `users` & `barbers` collections with `role: "barber"` and `status: "pending_verification"`.
3. Logging in fetches the user's role from Firestore `users/{uid}` and redirects to the appropriate role route group (`/(customer)/home`, `/(barber)/home`, or `/(admin)/dashboard`).
4. Fake OTP bypass code and unverified Google login token fallback are completely removed from production paths.
5. Unauthorized users attempting to access `/(customer)/*`, `/(barber)/*`, or `/(admin)/*` are redirected to `/(auth)/login`.

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npm run check
npm run doctor
git diff --check
```

---

## 5. Manual User Actions

- MANUAL ACTION REQUIRED: Complete MA-01 (Enable Email/Password provider in Firebase Console).
- MANUAL ACTION REQUIRED: Complete MA-02 (Configure Google OAuth Client ID and SHA-1 in Firebase Console).
- MANUAL ACTION REQUIRED: Complete MA-04 (Seed Initial Admin account in Firebase Auth & Firestore).

---

## 6. Rollback Notes

If authentication hardening causes regressions:
1. Revert modifications in `auth-context.tsx` and `auth.service.ts` using `git checkout HEAD -- src/features/auth/`.
2. Revert route layout changes in `src/app/(auth)/_layout.tsx` and `src/app/(customer)/_layout.tsx`.
3. Verify basic login capability before re-applying role protection rules.
