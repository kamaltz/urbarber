# Batch 05: Customer Discovery & Profile Sub-System

## 1. Scope
Connecting customer discovery, search, barber detail, service browsing, and profile management screens to live Firestore data via `customerRepository`. Fulfills thesis requirements F-03 (Manage Profile), F-04 (View Barber List), F-05 (View Barber Details), and F-06 (View Barber Services). Deletes orphaned starter template `src/app/explore.tsx`.

---

## 2. Affected Files

- `[DELETE]` [explore.tsx](file:///e:/app/urbarber/src/app/explore.tsx) (Delete orphaned root starter template file)
- `[MODIFY]` [home.tsx](file:///e:/app/urbarber/src/app/\(customer\)/home.tsx) (Connect live barbers and category chips to Firestore)
- `[MODIFY]` [explore.tsx](file:///e:/app/urbarber/src/app/\(customer\)/explore.tsx) (Wire search query and category filters to `customerRepository.searchBarbers`)
- `[MODIFY]` [favorites.tsx](file:///e:/app/urbarber/src/app/\(customer\)/favorites.tsx) (Wire customer favorite barbers to `customerRepository.getFavoriteBarbers`)
- `[MODIFY]` [barberId].tsx](file:///e:/app/urbarber/src/app/\(customer\)/barber/\[barberId\].tsx) (Fetch real barber detail and services from Firestore)
- `[MODIFY]` [profile.tsx](file:///e:/app/urbarber/src/app/\(customer\)/profile.tsx) (Display real customer profile data and avatar)
- `[MODIFY]` [account.tsx](file:///e:/app/urbarber/src/app/\(customer\)/profile/account.tsx) (Build edit profile form with avatar upload via Supabase Storage)
- `[MODIFY]` [change-password.tsx](file:///e:/app/urbarber/src/app/\(customer\)/profile/change-password.tsx) (Build password update form)
- `[MODIFY]` [help.tsx](file:///e:/app/urbarber/src/app/\(customer\)/profile/help.tsx) (Build help center screen)
- `[MODIFY]` [about.tsx](file:///e:/app/urbarber/src/app/\(customer\)/profile/about.tsx) (Build about app screen)

---

## 3. Acceptance Criteria

1. `src/app/explore.tsx` (root orphaned starter file) is deleted.
2. `/(customer)/home` renders live verified barbers fetched from Firestore `barbers` collection.
3. Searching or selecting categories on `/(customer)/explore` filters barber records dynamically in Firestore.
4. Tapping a barber card opens `/(customer)/barber/[barberId]` with actual barber description, address, rating, and services list (F-05, F-06).
5. Editing customer profile on `/(customer)/profile/account` updates Firestore `customers/{uid}` document and uploads avatar to Supabase `public-media/avatars/{uid}/` (F-03).

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

- MANUAL ACTION REQUIRED: Seed test barber documents in Firestore `barbers` collection to verify live discovery rendering.

---

## 6. Rollback Notes

If customer screen updates fail:
1. Restore deleted `src/app/explore.tsx` if routing breaks (though it is orphaned).
2. Revert modified screens under `src/app/(customer)/` using `git checkout HEAD -- src/app/(customer)/`.
