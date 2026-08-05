# Batch 06: Customer Booking Flow Implementation

## 1. Scope
Implementing full end-to-end customer booking flow from service selection to booking creation, status tracking, history inspection, and rating submission. Fulfills thesis requirements F-07 (Select Service), F-08 (Select Date & Schedule), F-09 (Enter Location), F-10 (Create Booking), F-11 (View Booking Status), F-12 (View Booking History), and F-13 (Submit Rating and Review).

---

## 2. Affected Files

- `[MODIFY]` [options.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/options.tsx) (Wire service selection state F-07)
- `[MODIFY]` [schedule.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/schedule.tsx) (Wire date picker and available time slots F-08)
- `[MODIFY]` [location.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/location.tsx) (Wire address text input and service notes F-09)
- `[MODIFY]` [invoice.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/invoice.tsx) (Submit booking document to Firestore with status `pending` F-10)
- `[MODIFY]` [history.tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/history.tsx) (List active vs completed bookings from Firestore F-11, F-12)
- `[MODIFY]` [detail/[bookingId].tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/detail/\[bookingId\].tsx) (Real-time Firestore snapshot listener for booking status progress tracker F-11)
- `[MODIFY]` [rating/[bookingId].tsx](file:///e:/app/urbarber/src/app/\(customer\)/booking/rating/\[bookingId\].tsx) (Submit rating and review to Firestore `reviews` collection F-13)

---

## 3. Acceptance Criteria

1. Choosing service, date, time slot, and location creates a new document in Firestore `bookings` collection with canonical status `pending` (F-07, F-08, F-09, F-10).
2. Navigation advances to `/(customer)/booking/detail/[bookingId]` showing live progress tracker (F-11).
3. Active bookings screen `/(customer)/booking/history` lists bookings matching user UID.
4. When booking status is `completed`, customer can submit a 1–5 star rating and comment on `/(customer)/booking/rating/[bookingId]`, saving to `reviews` collection (F-13).
5. All statuses conform strictly to canonical enum values.

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

- MANUAL ACTION REQUIRED: Test booking creation and verify document structure in Firebase Console Firestore `bookings` collection.

---

## 6. Rollback Notes

If booking creation fails:
1. Revert booking route screens using `git checkout HEAD -- src/app/(customer)/booking/`.
2. Check Firestore security rules for `bookings` collection.
