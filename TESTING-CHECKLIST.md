# TESTING EXECUTION CHECKLIST - URBarber

Quick actionable checklist untuk tracking progress saat manual testing berlangsung.

---

## PRE-EXECUTION CHECKLIST

### Environment Setup
- [ ] APK built atau app dev server running
- [ ] Midtrans Sandbox credentials configured
- [ ] Test accounts created:
  - [ ] Customer 1: testcust1@test.com / Pass123456
  - [ ] Customer 2: testcust2@test.com / Pass123456
  - [ ] Barber 1: barber1@test.com / BarbPass123 (VERIFIED & ACTIVE)
  - [ ] Barber 2: barber2@test.com / BarbPass123
  - [ ] Admin: admin@test.com / AdminPass123
- [ ] Verified barber account setup (approval done by admin)
- [ ] Location services enabled on device(s)
- [ ] Multiple devices/emulators ready (for concurrent tests)
- [ ] Screenshot tool ready
- [ ] Internet connection stable

---

## SESSION 1: CUSTOMER GOLDEN PATH (1.5-2 jam)

**Device**: 1 device/emulator with Customer app

### A. AUTHENTICATION (BB-AUTH-005)
- [ ] **BB-AUTH-005** - Customer registration
  - [ ] Register new customer
  - [ ] Email verification
  - [ ] Account created ✓
  - [ ] **Screenshot**: Welcome/home screen after register

### B. DISCOVERY & SEARCH (BB-CUS-001 to BB-CUS-006)
- [ ] **BB-CUS-001** - Map barber discovery
  - [ ] Open Explore
  - [ ] Allow location permission
  - [ ] Map loads with barber markers ✓
  - [ ] **Screenshot**: Map dengan markers
  
- [ ] **BB-CUS-002** - View barber detail
  - [ ] Tap marker/barber name
  - [ ] Detail page shows: name, rating, services ✓
  - [ ] **Screenshot**: Barber detail screen
  
- [ ] **BB-CUS-003** - Search by name
  - [ ] Search functionality works ✓
  
- [ ] **BB-CUS-005, BB-CUS-006** - Profile management
  - [ ] View profile ✓
  - [ ] Edit profile (if testable) ✓

### C. BOOKING - DATE/TIME VALIDATION (BB-BOOK-001 to BB-BOOK-004)
- [ ] **BB-BOOK-001** - Past dates disabled
  - [ ] Date picker: past dates grayed out ✓
  - [ ] **Screenshot**: Date picker with past dates disabled
  
- [ ] **BB-BOOK-002** - Past times (today)
  - [ ] Time picker: past times disabled ✓
  - [ ] **Screenshot**: Time picker with disabled times
  
- [ ] **BB-BOOK-003** - 60 min lead time
  - [ ] Try select time < 60 min away
  - [ ] Error or disabled ✓
  - [ ] **Screenshot**: Lead time validation error
  
- [ ] **BB-BOOK-004** - Future date validation
  - [ ] Select tomorrow + past time (e.g., tomorrow 09:00)
  - [ ] Should be available ✓

### D. BOOKING - SERVICE & LOCATION (BB-BOOK-006 to BB-BOOK-008)
- [ ] **BB-BOOK-006** - View services
  - [ ] Services list with prices shown ✓
  - [ ] **Screenshot**: Service list
  
- [ ] **BB-BOOK-007** - Select service
  - [ ] Service selected ✓
  
- [ ] **BB-BOOK-008** - Select location
  - [ ] Select "Ke rumah saya" ✓

### E. PAYMENT FLOW (BB-PAY-001 to BB-PAY-003)
- [ ] **BB-PAY-001** - Slot hold created
  - [ ] "Processing..." shown
  - [ ] Hold created (15 min expiry) ✓
  
- [ ] **BB-PAY-002** - Hold not visible yet
  - [ ] Go to booking history
  - [ ] Booking NOT visible ✓
  
- [ ] **BB-PAY-003** - Payment success
  - [ ] Midtrans Snap opened
  - [ ] Enter test card: 4111 1111 1111 1111
  - [ ] Payment success ✓
  - [ ] Booking NOW visible in history ✓
  - [ ] Status: "pending" ✓
  - [ ] **Screenshot**: Payment success confirmation
  - [ ] **Screenshot**: Booking in history dengan status "pending"

### F. CHAT (BB-CHAT-001 to BB-CHAT-003)
- [ ] **BB-CHAT-001** - Chat access after payment
  - [ ] Chat button visible ✓
  - [ ] Can open chat ✓
  
- [ ] **BB-CHAT-003** - Send message
  - [ ] Type & send message ✓
  - [ ] Message appears ✓
  - [ ] **Screenshot**: Chat dengan message

### G. WAIT FOR BARBER (Coordinate with Session 2)
- [ ] Barber accepts booking
- [ ] Barber starts service
- [ ] Barber marks completed
- [ ] **Continue to H when completed**

### H. RATING (BB-RATE-001 to BB-RATE-002)
- [ ] **BB-RATE-001** - Rating available after completed
  - [ ] Rate button visible ✓
  
- [ ] **BB-RATE-002** - Submit rating
  - [ ] Select 5 stars + comment ✓
  - [ ] Submit ✓
  - [ ] **Screenshot**: Rating submission success

### SESSION 1 STATUS
- **Started**: _______ (time)
- **Completed**: _______ (time)
- **Issues Found**: _______
- **Next**: Proceed to Session 2

---

## SESSION 2: BARBER OPERATIONS (1.5 jam)

**Device**: 1 device/emulator with Barber app (can be same device)
**Coordination**: Session 1 booking already paid

### A. AUTHENTICATION (BB-AUTH-001)
- [ ] **BB-AUTH-001** - Barber login
  - [ ] Login successful ✓
  - [ ] Navigate to home ✓

### B. BOOKING LIST (BB-BAR-001)
- [ ] **BB-BAR-001** - Only see paid bookings
  - [ ] Booking list shows only paid bookings ✓
  - [ ] Session 1 booking visible ✓
  - [ ] **Screenshot**: Booking list

### C. ACCEPT BOOKING (BB-BAR-002 to BB-BAR-004)
- [ ] **BB-BAR-002/003** - Verification guard
  - [ ] Barber verified & active ✓
  - [ ] Accept button enabled ✓
  
- [ ] **BB-BAR-004** - Accept booking
  - [ ] Tap "Accept Booking" ✓
  - [ ] Status → "accepted" ✓
  - [ ] **Screenshot**: Booking accepted

### D. SERVICE EXECUTION (BB-BAR-005 to BB-BAR-008)
- [ ] **BB-BAR-005** - Start service (en_route)
  - [ ] Tap "Start Service" atau "En Route" ✓
  - [ ] Status → "en_route" ✓
  - [ ] Location permission granted ✓
  
- [ ] **BB-TRACK-002** - Real-time tracking
  - [ ] COORDINATION: Check Customer app
  - [ ] Customer see barber position on map ✓
  - [ ] Position updates ✓
  - [ ] **Screenshot**: Real-time tracking map
  
- [ ] **BB-BAR-006** - Mark arrived
  - [ ] Reach customer location
  - [ ] Tap "Arrived" ✓
  - [ ] Status → "arrived" ✓
  
- [ ] **BB-BAR-007** - Mark in_progress
  - [ ] Start serving
  - [ ] Tap "In Progress" ✓
  - [ ] Status → "in_progress" ✓
  
- [ ] **BB-BAR-008** - Complete service
  - [ ] Tap "Complete Service" ✓
  - [ ] Status → "completed" ✓
  - [ ] **Screenshot**: Status completed

### E. CHAT (BB-CHAT-002)
- [ ] **BB-CHAT-002** - Barber chat access
  - [ ] Chat available ✓
  - [ ] Receive customer message ✓

### SESSION 2 STATUS
- **Started**: _______ (time)
- **Completed**: _______ (time)
- **Issues Found**: _______
- **Next**: Continue Session 1 rating → then Session 3

---

## SESSION 3: CONCURRENT SCENARIOS (1 hour)

**Devices**: 2 devices/emulators (Customer A + Customer B) + Barber app

### A. SLOT CONFLICT (BB-BOOK-005)
- [ ] **BB-BOOK-005** - Slot conflict detection
  - [ ] Customer A: Book barber, slot T1
  - [ ] Customer A: Complete payment ✓
  - [ ] Customer B: Simultaneously try same slot T1
  - [ ] Customer B: Slot unavailable ✓
  - [ ] **Screenshot** (Device A): Booking confirmed
  - [ ] **Screenshot** (Device B): Slot unavailable message

### B. PAYMENT FAILURE (BB-PAY-004)
- [ ] **BB-PAY-004** - Payment failed
  - [ ] Customer proceed to payment
  - [ ] Use failed card: 4000 0000 0000 0002
  - [ ] Payment fails ✓
  - [ ] Can retry ✓
  - [ ] **Screenshot**: Payment failed message

### C. HOLD TIMEOUT (BB-PAY-005)
- [ ] **BB-PAY-005** - Slot hold expires
  - [ ] Customer: Create booking & hold
  - [ ] Do NOT complete payment
  - [ ] Wait 15 minutes (or verify logic)
  - [ ] Try complete payment after timeout
  - [ ] Hold expired ✓
  - [ ] **Screenshot**: Hold timeout message (if applicable)

### D. FUTURE DATE VALIDATION (BB-BOOK-004 variant)
- [ ] Select date: Tomorrow
- [ ] Select time: 09:00 (even if past time today)
- [ ] Should be available ✓

### SESSION 3 STATUS
- **Started**: _______ (time)
- **Completed**: _______ (time)
- **Issues Found**: _______
- **Next**: Session 4

---

## SESSION 4: ADMIN OPERATIONS (45 min)

**Device**: Web browser (http://localhost:3001)

### A. ADMIN LOGIN & AUTH (BB-ADM-001, BB-ADM-002)
- [ ] **BB-ADM-001** - Admin login
  - [ ] Login successful ✓
  - [ ] Dashboard loaded ✓
  - [ ] **Screenshot**: Admin dashboard
  
- [ ] **BB-ADM-002** - Non-admin cannot access
  - [ ] Try login dengan customer credentials
  - [ ] Access denied ✓

### B. BARBER VERIFICATION (BB-ADM-003, BB-ADM-004)
- [ ] **BB-ADM-003** - Approve barber
  - [ ] Navigate to barber registration
  - [ ] Find pending barber
  - [ ] Review documents
  - [ ] Tap "Approve" ✓
  - [ ] Status → "approved" ✓
  - [ ] **Screenshot**: Barber approved
  
- [ ] **BB-ADM-004** - Reject barber (if applicable)
  - [ ] Reject with reason ✓ (or skip if already approved)

### C. BOOKING MONITORING (BB-ADM-005)
- [ ] **BB-ADM-005** - Monitor bookings
  - [ ] Navigate to bookings
  - [ ] Apply filters: status, date, payment
  - [ ] Results shown ✓
  - [ ] **Screenshot**: Booking list dengan filters

### D. TRANSACTION MONITORING (BB-ADM-006)
- [ ] **BB-ADM-006** - Monitor transactions
  - [ ] Navigate to transactions
  - [ ] View transaction list ✓
  - [ ] **Screenshot**: Transaction list

### SESSION 4 STATUS
- **Started**: _______ (time)
- **Completed**: _______ (time)
- **Issues Found**: _______
- **Next**: Session 5

---

## SESSION 5: NEGATIVE SCENARIOS (1 hour)

**Devices**: Minimal (1-2 devices)

### A. AUTHENTICATION ERRORS
- [ ] **BB-AUTH-002** - Wrong password
  - [ ] Login dengan email valid, password salah
  - [ ] Error shown ✓
  - [ ] **Screenshot**: Error message
  
- [ ] **BB-AUTH-003** - Unregistered email
  - [ ] Try login dengan email tidak terdaftar
  - [ ] Error atau prompt register ✓
  
- [ ] **BB-AUTH-004** - Empty email
  - [ ] Leave email empty, tap login
  - [ ] Validation error ✓
  
- [ ] **BB-AUTH-006** - Duplicate email on register
  - [ ] Try register dengan email existing
  - [ ] Error ✓
  
- [ ] **BB-AUTH-007** - Password mismatch
  - [ ] Register: password != confirm
  - [ ] Error ✓

### B. BOOKING ERRORS
- [ ] **BB-BOOK-001** - Cannot select past dates
  - [ ] Past dates disabled ✓
  
- [ ] **BB-BOOK-003** - 60 min lead time enforced
  - [ ] Try select time < 60 min
  - [ ] Disabled ✓

### C. FEATURE RESTRICTIONS
- [ ] **BB-RATE-003** - Cannot rate before completed
  - [ ] Open active booking
  - [ ] Rate button NOT visible ✓
  
- [ ] **BB-CHAT-005** - Chat not available before payment
  - [ ] Try access chat untuk unpaid booking
  - [ ] Chat unavailable ✓
  - [ ] **Screenshot**: Chat unavailable

### D. SECURITY
- [ ] **BB-SEC-002** - Customer cannot see other bookings
  - [ ] Customer A try access Customer B booking
  - [ ] Access denied ✓
  
- [ ] **BB-SEC-003** - Barber cannot access customer pages
  - [ ] Barber try navigate to /(customer)
  - [ ] Redirect atau blocked ✓

### E. PAYMENT ERRORS
- [ ] **BB-PAY-004** - Payment failed handled
  - [ ] Use failed payment method
  - [ ] Error shown ✓
  - [ ] Can retry ✓

### SESSION 5 STATUS
- **Started**: _______ (time)
- **Completed**: _______ (time)
- **Issues Found**: _______
- **Next**: Compilation

---

## RESULTS COMPILATION

### Test Results Summary

**Total Test Cases**: 61

| Priority | Total | Berhasil | Gagal |
|---|---|---|---|
| **P0** | 26 | ____ | ____ |
| **P1** | 31 | ____ | ____ |
| **P2** | 7 | ____ | ____ |
| **TOTAL** | **61** | **____** | **____** |

### Calculate Success Rate

```
Formula: P = (Berhasil / Total) × 100%

P = (____ / 61) × 100%
P = _____% 
```

### Success Evaluation

- [ ] **P ≥ 90%** → ✅ EXCELLENT
- [ ] **80% ≤ P < 90%** → ✅ GOOD
- [ ] **P < 80%** → ⚠️ REVIEW NEEDED

### Issues Found

| ID | Category | Severity | Description | Status |
|---|---|---|---|---|
| 1 | | P0/P1/P2 | | Open/Fixed/Deferred |
| 2 | | P0/P1/P2 | | Open/Fixed/Deferred |
| 3 | | P0/P1/P2 | | Open/Fixed/Deferred |

### Screenshot Evidence Collected

- [ ] Login success
- [ ] Map discovery
- [ ] Date validation
- [ ] Time validation  
- [ ] Lead time validation
- [ ] Service selection
- [ ] Payment flow
- [ ] Payment confirmation
- [ ] Booking history
- [ ] Barber booking list
- [ ] Booking acceptance
- [ ] Status updates
- [ ] Real-time tracking
- [ ] Chat messaging
- [ ] Rating submission
- [ ] Admin dashboard
- [ ] Admin verification
- [ ] Admin monitoring
- [ ] Error messages
- [ ] Access denied
- [ ] Unauthorized page
- [ ] (Others)

---

## FINAL SIGN-OFF

### Test Execution Completed

- **Start Date**: _______
- **End Date**: _______
- **Total Duration**: _______ hours
- **Tester Name**: _______
- **Testing Environment**: _______

### Quality Assessment

- **Code Coverage**: Covered all major features ✓
- **Business Rules**: All critical rules verified ✓
- **Security**: Authorization tested ✓
- **Payment Flow**: Payment-first validated ✓
- **Real-time Features**: Chat & tracking tested ✓

### Recommendation

- [ ] **APPROVED** - Ready for deployment
- [ ] **APPROVED WITH MINOR FIXES** - Non-critical issues found
- [ ] **NOT APPROVED** - Critical issues found, needs fixing

### Notes & Comments

```
[Space untuk final notes dan recommendations]
```

---

**Testing Execution Complete**

Catatan: Isi checklist ini saat testing berlangsung. Jika perlu detail lebih lanjut, refer ke BLACK-BOX-TESTING-FINAL.md atau MANUAL-TESTING-GUIDE.md.

