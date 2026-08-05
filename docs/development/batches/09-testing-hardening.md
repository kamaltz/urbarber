# Batch 09: System Hardening & End-to-End Verification

## 1. Scope
Comprehensive cross-role integration verification, offline network resilience validation, error boundary hardening, and full audit of all 30 thesis requirements (F-01 through F-30). Ensures zero forbidden mock paths exist in production code.

---

## 2. Affected Files

- `[MODIFY]` [auth-context.tsx](file:///e:/app/urbarber/src/features/auth/context/auth-context.tsx) (Harden error boundary and session restore logic)
- `[MODIFY]` [customerRepository.ts](file:///e:/app/urbarber/src/features/customer/repository/customer.repository.ts) (Verify clean error propagation on network loss)
- `[MODIFY]` [booking.repository.ts](file:///e:/app/urbarber/src/features/bookings/repository/booking.repository.ts) (Verify transactional integrity for booking creation and status updates)
- `[NEW]` [use-network-status.ts](file:///e:/app/urbarber/src/hooks/use-network-status.ts) (Hook monitoring network connectivity and offline alert banner)
- `[NEW]` [OfflineBanner.tsx](file:///e:/app/urbarber/src/components/ui/OfflineBanner.tsx) (UI banner alerting user when internet connectivity is lost)

---

## 3. Acceptance Criteria

1. Every single feature requirement F-01 through F-30 is audited and confirmed working against live Firebase & Supabase services.
2. Loss of network connection presents an `OfflineBanner` without crashing the application or returning silent mock fallbacks.
3. No fake OTP, fake social login bypasses, random payment outcomes, or hidden mock fallbacks exist anywhere in `src/`.
4. All navigation route transitions between `(auth)`, `(customer)`, `(barber)`, and `(admin)` work smoothly.
5. All three quality gate validation commands pass cleanly.

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

- MANUAL ACTION REQUIRED: Conduct manual end-to-end testing across three separate physical devices or emulator instances representing Customer, Barber, and Admin roles.

---

## 6. Rollback Notes

If system hardening introduces regression errors:
1. Revert modifications using `git checkout HEAD -- src/`.
2. Inspect log trace for specific component throwing errors.
