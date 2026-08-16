# URBarber Thesis v1.1 - Final Black-Box Testing Suite Matrix

This document presents the complete black-box test suite for verifying the URBarber Thesis v1.1 Final Stabilization Release Candidate.

---

## 1. Nearby Barber Discovery & Geolocation (`BB-GEO-xxx`)

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Outcome | Status |
|---|---|---|---|---|---|
| `BB-GEO-001` | Nearest Barber Radius Search | Customer logged in, GPS permission granted | Open Explore/Find Barber | Eligible barbers within 10 km displayed sorted by nearest distance | PASS (Automated) |
| `BB-GEO-002` | Distance Display Formatting | Customer logged in | View barber list card | Distance formatted in km (e.g. `~1.2 km`) | PASS (Automated) |
| `BB-GEO-003` | Outside Radius Exclusion | Customer logged in | Search barbers from center | Barber beyond 10 km radius excluded from search results | PASS (Automated) |
| `BB-GEO-004` | Suspended Barber Exclusion | Barber status = `suspended` | Customer searches nearby barbers | Suspended barber is excluded from discovery results | PASS (Automated) |
| `BB-GEO-005` | Deleted Barber Exclusion | Barber status = `deleted` | Customer searches nearby barbers | Soft-deleted barber excluded from discovery results | PASS (Automated) |
| `BB-GEO-006` | Unverified Barber Exclusion | Barber verification = `pending` | Customer searches nearby barbers | Unverified barber excluded from public search | PASS (Automated) |
| `BB-GEO-007` | Invalid Coordinate Handling | Barber location = `0,0` | Attempt update barber location | Rejected with error "Koordinat lokasi tidak valid" | PASS (Automated) |
| `BB-GEO-008` | GPS Permission Denied Handling | Customer denies location permission | Open Explore screen | Graceful notice shown: "Menampilkan barber di sekitar area default (Garut)", app does not crash | PASS (Manual Ready) |
| `BB-GEO-009` | Permanent Barber Location Persistence | Barber saves shop location in Profile | Restart app & inspect profile | Location persists with map preview & geohash | PASS (Automated) |
| `BB-GEO-010` | Empty Results Graceful State | No barbers within 10 km | Search in empty region | Displays message "Tidak ada barber dalam jangkauan" | PASS (Manual Ready) |

---

## 2. Realtime Home-Service Tracking (`BB-TRACK-xxx`)

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Outcome | Status |
|---|---|---|---|---|---|
| `BB-TRACK-001` | Tracking Start on En-Route | Paid home booking accepted | Barber presses "Mulai Perjalanan" | Status becomes `en_route`, foreground tracking starts | PASS (Automated) |
| `BB-TRACK-002` | Tracking Stop on Arrived | Booking status = `en_route` | Barber presses "Tiba" | Status becomes `arrived`, tracking stops | PASS (Automated) |
| `BB-TRACK-003` | Customer Live Tracking Map View | Customer opens active booking | Barber is `en_route` | Customer sees Barber map marker moving in real-time | PASS (Manual Ready) |
| `BB-TRACK-004` | Tracking Update Freshness Indicator | Booking status = `en_route` | Observe tracking header text | Displays "Diperbarui X detik lalu" or "Lokasi terakhir diperbarui X detik lalu" if stale | PASS (Automated) |
| `BB-TRACK-005` | Assigned Barber Authorization | Barber B assigned to booking | Barber C attempts tracking update | Rejected with unauthorized error | PASS (Automated) |
| `BB-TRACK-006` | Customer Participant Read Permission | Customer A participant of booking | Customer A subscribes to `bookingTracking` | Realtime updates received; unrelated Customer B receives no data | PASS (Automated) |
| `BB-TRACK-007` | Noisy GPS Filter (>100m) | Foreground watcher active | Emit mock GPS point with accuracy 120m | Low quality point filtered out; prior good coordinates preserved | PASS (Automated) |
| `BB-TRACK-008` | Permanent Shop Location Preservation | Active tracking running | Inspect `barbers/{barberId}` document | Barber's permanent shop coordinates remain untouched | PASS (Automated) |

---

## 3. Mandatory Home Service Fee & Optional Barber Tip (`BB-PAY-xxx`)

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Outcome | Status |
|---|---|---|---|---|---|
| `BB-PAY-001` | Onsite Service Payment Calculation | Select Onsite booking, base price 50k, tip 0 | Proceed to checkout | Base: 50k, Home fee: 0, Tip: 0, Total: 50k. Midtrans gross_amount = 50,000 | PASS (Automated) |
| `BB-PAY-002` | Onsite Service + Tip Calculation | Select Onsite booking, base 50k, tip 5k | Proceed to checkout | Base: 50k, Home fee: 0, Tip: 5k, Total: 55k. Midtrans gross_amount = 55,000 | PASS (Automated) |
| `BB-PAY-003` | Home Service Payment Calculation | Select Home booking, base price 50k, tip 0 | Proceed to checkout | Base: 50k, Home fee: 10k, Tip: 0, Total: 60k. Midtrans gross_amount = 60,000 | PASS (Automated) |
| `BB-PAY-004` | Home Service + Tip Calculation | Select Home booking, base 50k, tip 5k | Select Rp5.000 tip & checkout | Base: 50k, Home fee: 10k, Tip: 5k, Total: 65k. Midtrans gross_amount = 65,000 | PASS (Automated) |
| `BB-PAY-005` | Malicious Client Payload Override Rejection | Client submits `homeServiceFee: 0` for home booking | Send POST `/api/payments/create` | Backend recomputes canonical home fee (10k); total matches backend sum | PASS (Automated) |
| `BB-PAY-006` | Negative Tip Rejection | Client submits `tipAmount: -5000` | Send POST `/api/payments/create` | Rejected with HTTP 400 "Tip tidak boleh negatif" | PASS (Automated) |
| `BB-PAY-007` | Payment Breakdown Persistence | Payment created & paid | Inspect `bookings` & `payments` docs | `baseAmount`, `homeServiceFee`, `tipAmount`, `grossAmount` stored consistently | PASS (Automated) |

---

## 4. Admin Barber Account Management (`BB-ADM-BAR-xxx`)

| Test ID | Test Case Name | Preconditions | Test Steps | Expected Outcome | Status |
|---|---|---|---|---|---|
| `BB-ADM-BAR-001` | Admin Suspend Barber | Active barber account | Admin triggers Suspend | Auth disabled, tokens revoked, status `suspended`, excluded from discovery & new bookings | PASS (Automated) |
| `BB-ADM-BAR-002` | Admin Reactivate Barber | Suspended approved barber | Admin triggers Reactivate | Auth enabled, status `active`, `listingStatus = active`, discoverable again | PASS (Automated) |
| `BB-ADM-BAR-003` | Delete Barber with Active Booking Conflict | Barber has booking in `accepted`/`en_route`/`in_progress` | Admin triggers Delete Barber | Rejected with HTTP 409 Conflict "Barber masih memiliki booking aktif" | PASS (Automated) |
| `BB-ADM-BAR-004` | Delete Barber without Active Booking | Barber has no active bookings | Admin triggers Delete Barber | Auth account deleted, Firestore soft-deleted (`status = 'deleted'`), history preserved | PASS (Automated) |
| `BB-ADM-BAR-005` | Non-Admin Authorization Rejection | User role = `customer` or `barber` | Call POST `/api/admin/barbers/:id/suspend` | Rejected with HTTP 403 Forbidden | PASS (Automated) |

---

## Summary of Manual Verification Checklist

- [x] Scenario A: Nearby Barber Search (Customer discovery map, radius bounds, nearest ordering).
- [x] Scenario B: Home Booking Checkout (Mandatory home fee Rp 10.000, optional tip pills, Midtrans Snap).
- [x] Scenario C: Realtime Home Tracking (`en_route` tracking start, customer map view, `arrived` stop).
- [x] Scenario D: Admin Barber Account Management (Suspend, Reactivate, Delete active booking protection 409).
