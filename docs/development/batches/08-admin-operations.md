# Batch 08: Admin Operations & Platform Management

## 1. Scope
Building the platform administration screen route layer under `src/app/(admin)/`. Fulfills thesis requirements F-25 (Verify Barber Account), F-26 (Manage Customer Data), F-27 (Manage Barber Data), F-28 (Manage Service Categories), F-29 (Monitor All Bookings), and F-30 (View Operational Reports).

---

## 2. Affected Files

- `[NEW]` [dashboard.tsx](file:///e:/app/urbarber/src/app/\(admin\)/dashboard.tsx) (Admin main dashboard with platform KPI metrics F-30)
- `[NEW]` [verifications/index.tsx](file:///e:/app/urbarber/src/app/\(admin\)/verifications/index.tsx) (Pending barber verification queue F-25)
- `[NEW]` [users/index.tsx](file:///e:/app/urbarber/src/app/\(admin\)/users/index.tsx) (Customer and barber user directory & suspension toggle F-26, F-27)
- `[NEW]` [categories/index.tsx](file:///e:/app/urbarber/src/app/\(admin\)/categories/index.tsx) (Global service category manager F-28)
- `[NEW]` [bookings/index.tsx](file:///e:/app/urbarber/src/app/\(admin\)/bookings/index.tsx) (Global platform booking monitor F-29)
- `[NEW]` [reports/index.tsx](file:///e:/app/urbarber/src/app/\(admin\)/reports/index.tsx) (Operational reports summary F-30)

---

## 3. Acceptance Criteria

1. Admin dashboard `/(admin)/dashboard` renders aggregate platform metrics: total users, total bookings, total platform revenue (F-30).
2. Verification queue `/(admin)/verifications` lists pending barber accounts (`verificationStatus == "pending"`). Tapping Approve updates barber document `verified: true` and `verificationStatus: "approved"` (F-25).
3. User directory `/(admin)/users` lists all customer and barber accounts with option to toggle status (`active` vs `suspended`) (F-26, F-27).
4. Category manager `/(admin)/categories` allows adding, editing, and ordering global service categories in `categories` collection (F-28).
5. Global booking monitor `/(admin)/bookings` displays all platform bookings across all canonical statuses (F-29).

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

- MANUAL ACTION REQUIRED: Authenticate as admin user (`role: "admin"`) and verify admin dashboard access.

---

## 6. Rollback Notes

If admin route creation introduces build errors:
1. Delete newly created admin screen files under `src/app/(admin)/`.
2. Revert layout configuration in `src/app/(admin)/_layout.tsx`.
