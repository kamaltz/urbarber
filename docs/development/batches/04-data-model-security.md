# Batch 04: Data Model Harmonization & Security Rules

## 1. Scope
Harmonizing domain models, types, and statuses across all features to enforce canonical roles (`customer`, `barber`, `admin`) and canonical booking statuses (`pending`, `accepted`, `rejected`, `in_progress`, `completed`, `cancelled`). Purges mock fallback returns and randomized payment simulation from repositories. Prepares Firestore Security Rules.

---

## 2. Affected Files

- `[MODIFY]` [domain.ts](file:///e:/app/urbarber/src/types/domain.ts) (Harmonize UserRole, UserStatus, and BookingStatus types)
- `[MODIFY]` [booking.ts](file:///e:/app/urbarber/src/features/bookings/types/booking.ts) (Align booking feature types with canonical `BookingStatus`)
- `[MODIFY]` [barber.ts](file:///e:/app/urbarber/src/features/barbers/types/barber.ts) (Align barber feature types with canonical `BookingStatus`)
- `[MODIFY]` [booking.repository.ts](file:///e:/app/urbarber/src/features/bookings/repository/booking.repository.ts) (Purge `Math.random() > 0.1` payment simulation; update Firestore queries to use canonical status enums)
- `[MODIFY]` [customer.repository.ts](file:///e:/app/urbarber/src/features/customer/repository/customer.repository.ts) (Purge silent offline mock data fallbacks in production paths)
- `[MODIFY]` [barber.repository.ts](file:///e:/app/urbarber/src/features/barbers/repository/barber.repository.ts) (Update queries to use canonical status enums)
- `[NEW]` [firestore.rules](file:///e:/app/urbarber/firestore.rules) (Declarative Cloud Firestore security rules enforcing RBAC and collection access)

---

## 3. Acceptance Criteria

1. `BookingStatus` across `domain.ts`, `booking.ts`, and `barber.ts` is strictly `"pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"`.
2. All Firestore queries in `booking.repository.ts` and `barber.repository.ts` query against these exact 6 canonical status strings.
3. Random payment logic (`Math.random() > 0.1`) in `booking.repository.ts` line 332 is deleted. `processPayment` creates booking invoice record deterministically with status `pending`.
4. Repositories throw clean errors on connection failure instead of swallowing errors and returning mock objects.
5. Declarative Firestore security rules file `firestore.rules` is validated.

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

- MANUAL ACTION REQUIRED: Complete MA-03 (Deploy `firestore.rules` content to Cloud Firestore via Firebase Console or CLI).

---

## 6. Rollback Notes

If type harmonization causes compiler errors across feature components:
1. Revert changes to `src/types/domain.ts` and feature type files.
2. Ensure all UI badge components support canonical status mapping before re-applying type restrictions.
