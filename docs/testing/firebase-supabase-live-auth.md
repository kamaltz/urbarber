# Firebase–Supabase Live JWT and RLS Test

## Environment

- Firebase Project ID:
- Supabase Project Ref:
- App build:
- Test date:
- Tester:

## MA-05 — Third-Party Auth

- Firebase integration configured: Yes / No
- Configuration method: Dashboard / CLI / Support
- Registered Firebase Project ID:
- Result:

## MA-06 — Firebase Claims

| Account | Firebase UID | role | app_role | Token force-refreshed |
|---|---|---|---|---|
| Customer A | | authenticated | customer | |
| Customer B | | authenticated | customer | |
| Barber A | | authenticated | barber | |
| Admin A | | authenticated | admin | |

## MA-07 — Live RLS Test

| ID | Scenario | Expected | Actual | Status |
|---|---|---|---|---|
| JWT-01 | Upload to own public folder | Allowed | | |
| JWT-02 | Upload to another user's folder | Denied | | |
| JWT-03 | Upload while logged out | Denied | | |
| JWT-04 | Upload to own private folder | Allowed | | |
| JWT-05 | Read another user's private file | Denied | | |
| JWT-06 | Admin reads verification file | Allowed | | |
| JWT-07 | Signed URL before expiry | Allowed | | |
| JWT-08 | Signed URL after expiry | Denied | | |

## Evidence

- Firebase token claims screenshot:
- Supabase Storage object screenshot:
- Failed RLS request screenshot:
- Signed URL expiry evidence:

## Conclusion

- Firebase JWT accepted by Supabase: Yes / No
- RLS ownership enforcement works: Yes / No
- Private bucket access works: Yes / No
- Safe to proceed to Batch 03: Yes / No