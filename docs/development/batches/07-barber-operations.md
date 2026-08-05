# Batch 07: Barber Operations & Management Flow

## 1. Scope
Building the complete screen route layer under `src/app/(barber)/` for barber operations. Fulfills thesis requirements F-16 (Manage Barber Profile), F-17 (Manage Services), F-18 (Manage Service Prices), F-19 (Manage Operating Schedule), F-20 (View Booking Requests), F-21 (Accept or Reject Bookings), F-22 (Update Service Status), and F-23 (View Transaction History).

---

## 2. Affected Files

- `[NEW]` [home.tsx](file:///e:/app/urbarber/src/app/\(barber\)/home.tsx) (Barber main dashboard overview)
- `[NEW]` [bookings.tsx](file:///e:/app/urbarber/src/app/\(barber\)/\(tabs\)/bookings.tsx) (Incoming & active booking requests list F-20)
- `[NEW]` [schedule.tsx](file:///e:/app/urbarber/src/app/\(barber\)/\(tabs\)/schedule.tsx) (Weekly schedule manager F-19)
- `[NEW]` [services.tsx](file:///e:/app/urbarber/src/app/\(barber\)/\(tabs\)/services.tsx) (Services and prices manager F-17, F-18)
- `[NEW]` [booking/[bookingId].tsx](file:///e:/app/urbarber/src/app/\(barber\)/booking/\[bookingId\].tsx) (Transaction detail screen with Accept/Reject and Status Update triggers F-21, F-22)
- `[NEW]` [analysis.tsx](file:///e:/app/urbarber/src/app/\(barber\)/analysis.tsx) (Performance metrics and transaction history F-23)
- `[NEW]` [reviews.tsx](file:///e:/app/urbarber/src/app/\(barber\)/reviews.tsx) (Ratings, reviews, and barber reply manager)
- `[NEW]` [profile.tsx](file:///e:/app/urbarber/src/app/\(barber\)/profile.tsx) (Barber profile editor F-16)

---

## 3. Acceptance Criteria

1. Barber home dashboard `/(barber)/home` renders total revenue, active bookings count, and quick status actions.
2. Incoming booking requests list `/(barber)/(tabs)/bookings` displays customer bookings with status `pending`.
3. Barber can tap "Accept" (updates status to `accepted`) or "Reject" (updates status to `rejected`) (F-21).
4. Barber can transition an `accepted` booking to `in_progress` when starting service and `completed` when finished (F-22).
5. Service manager `/(barber)/(tabs)/services` allows adding, editing price/duration, and toggling active status of services in `barberServices` collection (F-17, F-18).
6. Operating schedule editor `/(barber)/(tabs)/schedule` updates working hours in `barberSchedules` collection (F-19).

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

- MANUAL ACTION REQUIRED: Authenticate as barber user and verify tab bar navigation across `(barber)` routes on physical device or emulator.

---

## 6. Rollback Notes

If barber route creation introduces build errors:
1. Delete newly created screen files in `src/app/(barber)/`.
2. Check layout configuration in `src/app/(barber)/_layout.tsx`.
