# Batch 04 (Batch 02 Roadmap): Data Model Harmonization & Security Rules

## 1. Scope
Harmonized domain models, types, and statuses across all features to enforce canonical roles (`customer`, `barber`, `admin`) and canonical booking statuses (`pending`, `accepted`, `rejected`, `in_progress`, `completed`, `cancelled`). Purged mock fallback returns and randomized payment simulation from repositories. Implemented Cloud Firestore Security Rules, indexes, and automated rules unit tests.

---

## 2. Affected Files

- `[MODIFY]` [domain.ts](file:///e:/app/urbarber/src/types/domain.ts) (Harmonized UserRole, UserStatus, BookingStatus, added mapLegacyBookingStatus)
- `[MODIFY]` [booking.ts](file:///e:/app/urbarber/src/features/bookings/types/booking.ts) (Aligned booking feature types with canonical `BookingStatus`)
- `[MODIFY]` [barber.ts](file:///e:/app/urbarber/src/features/barbers/types/barber.ts) (Aligned barber feature types with canonical `BookingStatus`)
- `[MODIFY]` [booking.repository.ts](file:///e:/app/urbarber/src/features/bookings/repository/booking.repository.ts) (Purged `Math.random() > 0.1` payment simulation; updated queries to canonical status)
- `[MODIFY]` [customer.repository.ts](file:///e:/app/urbarber/src/features/customer/repository/customer.repository.ts) (Purged mock data fallbacks in production paths)
- `[MODIFY]` [barber.repository.ts](file:///e:/app/urbarber/src/features/barbers/repository/barber.repository.ts) (Updated queries and updates to canonical status)
- `[NEW]` [firestore.rules](file:///e:/app/urbarber/firestore.rules) (Declarative Cloud Firestore v2 security rules enforcing RBAC and collection access)
- `[NEW]` [firestore.indexes.json](file:///e:/app/urbarber/firestore.indexes.json) (Compound query indexes)
- `[NEW]` [firebase.json](file:///e:/app/urbarber/firebase.json) (Firebase configuration pointing to rules and indexes)
- `[NEW]` [test-firestore-rules.js](file:///e:/app/urbarber/scripts/test-firestore-rules.js) (18 automated rules unit tests)

---

## 3. Acceptance Criteria Status

1. `BookingStatus` across `domain.ts`, `booking.ts`, and `barber.ts` is strictly `"pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled"`. **[PASSED]**
2. All Firestore queries query against these exact 6 canonical status strings. **[PASSED]**
3. Random payment logic (`Math.random() > 0.1`) is purged. **[PASSED]**
4. Repositories throw clean errors or return null on connection failure instead of mock fallbacks. **[PASSED]**
5. Declarative Firestore security rules file `firestore.rules` is validated. **[PASSED]**

---

## 4. Validation Commands

Execute the following commands in the workspace root:
```bash
npm run check
npm run doctor
npm run test:rules
git diff --check
```

---

## 5. Manual User Actions

- **MANUAL ACTION REQUIRED**: Deploy `firestore.rules` and `firestore.indexes.json` content to Cloud Firestore via Firebase Console or CLI (`firebase deploy --only firestore`).
