# TEST PLAN SUMMARY - URBarber Black Box Testing

**Document**: Final Comprehensive Test Plan untuk Thesis Chapter  
**Date**: 2026-08-16  
**Status**: Ready for Manual Execution  
**Total Test Cases**: 61  
**Estimated Duration**: ~9 jam (1-2 hari kerja)

---

## EXECUTIVE SUMMARY

Dokumen ini merangkum Black Box Testing plan yang komprehensif untuk URBarber system. Plan ini dirancang untuk:

- ✅ **Feature Coverage**: Test semua fitur dari perspektif pengguna (Pelanggan, Barber, Admin)
- ✅ **Business Rule Validation**: Memastikan semua aturan bisnis critical dijalankan dengan benar
- ✅ **Security & Authorization**: Verify access control dan data isolation
- ✅ **Payment-First Principle**: Validate payment-first flow sesuai Batch 08 requirements
- ✅ **Real-time Features**: Chat dan tracking functionality
- ✅ **Thesis Documentation**: Evidence screenshots untuk skripsi chapter

---

## FILES PRODUCED

### 1. **BLACK-BOX-TESTING-FINAL.md** (MAIN DOCUMENT)
Dokumen utama yang berisi:
- **BAGIAN 1**: Feature Audit (Customer, Barber, Admin) - Features yang sebenarnya ada
- **BAGIAN 2**: 20+ Business Rules yang wajib ditest
- **BAGIAN 3**: 61 Test Case dengan detail format
- **BAGIAN 4**: Traceability Matrix (Requirement → Test Case)
- **BAGIAN 5**: Execution Sheet (untuk diisi manual saat testing)
- **BAGIAN 6**: E2E Test Order (5 sessions)
- **BAGIAN 7**: Screenshot Evidence Plan
- **BAGIAN 8**: Formula Evaluasi Hasil
- **BAGIAN 9**: Known Limitations
- **BAGIAN 10**: Summary & Next Steps

### 2. **MANUAL-TESTING-GUIDE.md**
Step-by-step panduan untuk eksekusi manual testing:
- Pre-testing checklist
- Detailed steps untuk setiap test case
- Screenshots yang diharapkan
- Coordination instructions untuk concurrent tests
- Troubleshooting tips

### 3. **TEST-PLAN-SUMMARY.md** (File ini)
Ringkasan dan overview dari keseluruhan plan

---

## TEST CASE BREAKDOWN

### By Priority
| Priority | Count | Focus |
|---|---|---|
| **P0 (Critical)** | 26 | Authentication, Payment, Booking, Security, Authorization |
| **P1 (Important)** | 31 | Full workflows, Tracking, Chat, Admin, Rating |
| **P2 (Nice-to-have)** | 7 | Polish, edge cases, performance |
| **TOTAL** | **61** | |

### By Category
| Category | Count | Test IDs |
|---|---|---|
| Authentication & Authorization | 14 | BB-AUTH-001:009, BB-SEC-001:005 |
| Discovery & Search | 6 | BB-CUS-001:006 |
| Booking & Validation | 9 | BB-BOOK-001:008 |
| Payment & Slot Hold | 5 | BB-PAY-001:005 |
| Barber Operations | 10 | BB-BAR-001:010 |
| Tracking | 4 | BB-TRACK-001:004 |
| Chat | 5 | BB-CHAT-001:005 |
| Rating | 3 | BB-RATE-001:003 |
| Onboarding | 2 | BB-ONBOARD-001:002 |
| Admin | 6 | BB-ADM-001:006 |

---

## TESTING SESSIONS OVERVIEW

### Session 1: Customer Golden Path (1.5-2 jam)
**What**: Complete customer journey dari registration hingga rating
**Focus**: 
- Registration & authentication
- Discovery & search
- Booking creation & validation
- Payment flow
- Chat messaging
- Rating submission

**Test IDs**: BB-AUTH-005, BB-CUS-001-006, BB-BOOK-001-008, BB-PAY-001-003, BB-CHAT-001-003, BB-RATE-001-002

### Session 2: Barber Operation (1.5 jam)
**What**: Barber booking acceptance & service execution
**Focus**:
- Barber authentication
- Pending bookings (paid only)
- Booking acceptance (verification guard)
- Status updates state machine
- Real-time tracking
- Chat from barber perspective

**Test IDs**: BB-AUTH-001, BB-BAR-001-010, BB-TRACK-002, BB-CHAT-002

### Session 3: Concurrent Scenarios (1 jam)
**What**: Multi-customer booking & conflict detection
**Focus**:
- Slot conflict prevention
- Payment failure handling
- Hold timeout
- Future date validation
- Concurrent access

**Test IDs**: BB-BOOK-005, BB-PAY-004-005, BB-TRACK-001-004

### Session 4: Admin Operations (45 min)
**What**: Admin dashboard & barber verification
**Focus**:
- Admin authentication & authorization
- Barber registration approval/rejection
- Booking monitoring & filters
- Transaction monitoring

**Test IDs**: BB-ADM-001-006

### Session 5: Negative Scenarios (1 jam)
**What**: Error handling & edge cases
**Focus**:
- Invalid credentials
- Duplicate registration
- Password mismatch
- Unavailable features
- Access violations

**Test IDs**: BB-AUTH-002-004, BB-AUTH-006-007, BB-AUTH-009, BB-RATE-003, BB-CHAT-005, BB-SEC-002-003

---

## KEY BUSINESS RULES TESTED

### Payment-First Principle (Batch 08)
- ✅ Slot hold creation (15-min temporary)
- ✅ Hold tidak final booking
- ✅ Customer owns slot HANYA setelah payment confirmed (paymentStatus = 'paid')
- ✅ Dua customer tidak boleh punya final slot yang sama
- ✅ Barber hanya see paid bookings
- ✅ Barber tidak bisa set paymentStatus

### Slot & Scheduling
- ✅ Past dates tidak selectable
- ✅ Past times hari ini tidak selectable
- ✅ Minimum 60 menit lead time
- ✅ Future dates tetap valid meski past time hari ini

### State Machine (Booking Status)
- ✅ pending → accepted → en_route → arrived → in_progress → completed

### Security & Access Control
- ✅ Customer only lihat own bookings
- ✅ Barber only lihat own bookings
- ✅ Chat hanya untuk valid participants
- ✅ Tracking only untuk active bookings
- ✅ Rating only setelah completed
- ✅ Admin role-based access

### Barber Verification Guard
- ✅ Barber harus approved & active sebelum accept booking

---

## EXECUTION WORKFLOW

### Step 1: Preparation (1-2 jam SEBELUM testing)
```
□ Build APK atau setup dev environment
□ Verify Midtrans Sandbox credentials
□ Create test accounts (customers, barbers, admin)
□ Setup verified barber account
□ Configure location services
□ Setup multiple devices/emulators untuk concurrent testing
□ Prepare screenshot tools
```

### Step 2: Execute Sessions (6 jam TOTAL)
```
Session 1: Customer Golden Path            1.5-2 jam
Session 2: Barber Operations               1.5 jam
Session 3: Concurrent Scenarios            1 jam
Session 4: Admin Operations               45 min
Session 5: Negative Scenarios              1 jam
```

### Step 3: Documentation (30 min)
```
□ Fill execution sheet
□ Calculate success formula
□ Compile screenshot evidence
□ Document any issues found
```

---

## CRITICAL TEST SCENARIOS

Berikut adalah test case yang PALING PENTING dan harus 100% PASS:

| Test ID | Scenario | Why Critical |
|---|---|---|
| **BB-AUTH-001** | Customer login | Foundation for all features |
| **BB-BOOK-003** | 60 min lead time validation | Business rule enforcement |
| **BB-PAY-001** | Slot hold creation | Payment-first flow start |
| **BB-PAY-003** | Payment success → booking finalization | Core payment pipeline |
| **BB-BAR-001** | Barber only see paid bookings | Payment-first enforcement |
| **BB-BAR-004** | Barber accept booking | Booking acceptance |
| **BB-BOOK-005** | Slot conflict prevention | Concurrency safety |
| **BB-CHAT-001** | Chat after payment | Real-time communication |
| **BB-RATE-002** | Rating submission | Customer feedback |
| **BB-ADM-003** | Admin approve barber | Admin workflow |
| **BB-SEC-002** | Customer cannot see other bookings | Data privacy |

---

## EXPECTED SUCCESS CRITERIA

### Minimum Pass Rate
- **P0 Test Cases**: 100% PASS (26 tests) - MANDATORY
- **P1 Test Cases**: ≥95% PASS (31 tests) - EXPECTED
- **P2 Test Cases**: ≥80% PASS (7 tests) - NICE-TO-HAVE

### Overall Success Formula
```
P = (Berhasil / Total) × 100%

Target: P ≥ 90%
Acceptable: P ≥ 80%
Review Needed: P < 80%
```

### Example Calculation
```
Scenario 1 (Excellent):
60 / 61 = 98.36% ✅ PASS

Scenario 2 (Good):
57 / 61 = 93.44% ✅ PASS

Scenario 3 (Acceptable):
50 / 61 = 81.97% ✓ REVIEW NEEDED

Scenario 4 (Fail):
45 / 61 = 73.77% ✗ NEEDS FIXING
```

---

## EVIDENCE GATHERING

### Screenshot Priority

**HIGH PRIORITY** (Must capture):
- Login success
- Map dengan barber markers
- Date/time validation (past dates disabled)
- Slot lead time validation
- Service selection + price
- Payment flow
- Payment confirmation
- Barber see paid bookings
- Booking acceptance
- Status updates (en_route, arrived, completed)
- Real-time tracking
- Chat message exchange
- Rating submission
- Admin dashboard
- Admin barber approval

**MEDIUM PRIORITY** (Should capture):
- Unauthorized access blocked
- Payment failed message
- Slot conflict detected
- Hold timeout
- Rating disabled (before completed)
- Chat unavailable (before payment)

**TOTAL**: ~20-30 screenshots untuk thesis documentation

---

## KNOWN LIMITATIONS

### Cannot Test
- ❌ Automated refund processing (manual admin only)
- ❌ iOS-specific features (Windows dev environment)
- ❌ Production Stripe (Midtrans Sandbox only)
- ❌ Firestore Emulator tests (requires local setup)
- ❌ Dead Tracking API (intentionally unrouted)

### Should Be Tested Carefully
- ⚠️ Chat "closed" status (designed but not fully implemented)
- ⚠️ Tracking auto-stop on cancel (not enforced, only on barber complete)
- ⚠️ Chat TTL/cleanup (no cleanup for old conversations)

### Already Tested Automatically
- ✅ Firestore rules (95+ test scenarios)
- ✅ Unit tests (174 tests)
- ✅ Payment sync logic (Firestore emulator tests)
- ✅ Slot-ownership race conditions (emulator tests)

---

## ISSUES & BUG REPORTING

Jika menemukan issue selama testing:

```markdown
## BUG REPORT

**Test ID**: BB-BOOK-001
**Feature**: Slot Date Validation
**Severity**: P0 / P1 / P2
**Status**: Reproducible

**Expected**:
Past dates should be grayed out / non-selectable

**Actual**:
Can select yesterday's date

**Steps to Reproduce**:
1. Open booking flow
2. Tap date picker
3. Try select yesterday date

**Screenshot Evidence**:
[path to screenshot]

**Notes**:
This breaks slot validation business rule
```

---

## NEXT STEPS

### Immediate (Today)
- [ ] Review this test plan
- [ ] Verify all test cases are clear
- [ ] Prepare environment & test accounts

### Pre-Testing (Before Manual Execution)
- [ ] Build APK/setup app
- [ ] Configure Midtrans Sandbox
- [ ] Create test accounts
- [ ] Setup devices/emulators

### Testing Execution (1-2 Days)
- [ ] Session 1: Customer Golden Path
- [ ] Session 2: Barber Operations
- [ ] Session 3: Concurrent Scenarios
- [ ] Session 4: Admin Operations
- [ ] Session 5: Negative Scenarios

### Post-Testing (1 Day)
- [ ] Fill execution sheet
- [ ] Calculate success formula
- [ ] Compile evidence screenshots
- [ ] Document findings & recommendations
- [ ] Create final thesis test report

### Deliverables for Thesis
- [ ] Test Case Table (with results)
- [ ] Evidence Screenshots (20-30)
- [ ] Success Percentage Formula
- [ ] Issues Found & Resolution
- [ ] Test Execution Timeline

---

## QUICK REFERENCE

### Test IDs by Category
```
Authentication: BB-AUTH-001:009
Authorization/Security: BB-SEC-001:003, BB-CHAT-004:005, BB-RATE-003
Discovery: BB-CUS-001:006
Booking: BB-BOOK-001:008
Payment: BB-PAY-001:005
Barber: BB-BAR-001:010
Tracking: BB-TRACK-001:004
Chat: BB-CHAT-001:003
Rating: BB-RATE-001:002
Onboarding: BB-ONBOARD-001:002
Admin: BB-ADM-001:006
```

### Critical P0 Tests
```
BB-AUTH-001, BB-BOOK-003, BB-PAY-001, BB-PAY-003
BB-BAR-001, BB-BAR-004, BB-BOOK-005
BB-CHAT-001, BB-SEC-002, BB-ADM-001
... (26 total P0 tests)
```

### Files to Reference
- `BLACK-BOX-TESTING-FINAL.md` - Main test plan
- `MANUAL-TESTING-GUIDE.md` - Step-by-step execution guide
- Test Execution Sheet (dalam BLACK-BOX-TESTING-FINAL.md BAGIAN 5)

---

## SUPPORT & QUESTIONS

Jika ada pertanyaan tentang test case:

1. **Clarify Expected Behavior**: Check business-rules.md & current-architecture.md
2. **Check Implementation**: Review routes & components yang berelasi
3. **Reference Test Guide**: Lihat MANUAL-TESTING-GUIDE.md untuk step yang detail

---

**Ready for Manual Testing Execution**

Document Version: 1.0 Final  
Generated: 2026-08-16  
For: Thesis Chapter - Pengujian (Testing)  

Selamat melakukan testing! 🎉

