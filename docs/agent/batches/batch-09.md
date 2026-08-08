# Batch 09: Deployment Readiness & Infrastructure Live Validation

## Overview

Batch 09 is a **multi-phase pre-deployment reconciliation and live validation pipeline**.

**Do NOT Deploy**. This batch focuses on:
1. Context reconciliation with actual codebase state
2. Local pre-deployment readiness validation
3. Staged infrastructure deployment readiness
4. Live multi-role validation preparation

---

## Phase A: Project Context & Pre-Deployment Reconciliation (CURRENT)

**Objective**: Audit actual codebase state and reconcile with documentation.

**Deliverables**
- [x] Git branch & working tree status (clean, on feat/batch-09-infrastructure-live-validation)
- [x] Architecture audit: actual implementation vs. stale docs
- [x] Payment-first implementation verification
- [x] Chat real-time implementation verification
- [x] Foreground tracking implementation verification
- [x] Admin web + backend API verification
- [x] Firestore rules & indexes verification
- [x] Environment variable inventory
- [x] Secret scan (no credentials in git)
- [x] Vercel function count verification (5 functions)
- [x] Test suite classification
- [x] Local validation status (typecheck, lint, rules test)
- [x] AGENTS.md reconciliation (remove obsolete scope restrictions)
- [x] CLAUDE.md update
- [x] Agent documentation creation (current-architecture.md, current-status.md, business-rules.md)

**Quality Gate**: No blocking linting/typing errors; warnings acceptable.

**Stop Condition**: Generate PRE-DEPLOYMENT RECONCILIATION REPORT (THIS DOCUMENT).

---

## Phase B: Local Pre-Deployment Readiness (NEXT)

**Objective**: Validate all local quality gates and environmental configuration.

**Tasks**

1. **Quality Gate Validation**
   ```bash
   npm run typecheck          # Mobile TypeScript
   npm run lint              # Mobile ESLint (warnings OK)
   npm run check             # Unified typecheck + lint
   npm --prefix backend/vercel run typecheck  # Backend
   npm --prefix apps/admin run lint           # Admin (expect deprecation warnings)
   git diff --check          # Whitespace & conflicts
   ```

2. **Rules Test Suite**
   ```bash
   # Start Firestore emulator (separate terminal)
   npx firebase emulators:start --only firestore
   
   # Run rules tests
   npm run test:firestore-rules
   ```

3. **Backend Test Suite**
   ```bash
   npm --prefix backend/vercel run test
   ```

4. **Unit Test Suite** (optional, comprehensive)
   ```bash
   npm run test:unit
   ```

5. **Environment Variable Verification**
   - Verify `.env.example` files exist (no real credentials)
   - Verify `.gitignore` includes `.env.local`, `backend/vercel/.env.local`
   - Verify no `firebase-service-account.json` in git

6. **Secret Scan**
   ```bash
   npm run check:secrets  # Windows PowerShell
   # OR
   git log -p --all -S "AKIA" --regexp-ignore-case  # AWS credentials
   git log -p --all -S "sk_live_" --regexp-ignore-case  # Stripe live key
   ```

7. **Vercel Configuration Validation**
   - Verify `backend/vercel/vercel.json` has 5 rewrites (health, app, admin, payments, webhook)
   - Verify function count matches (5 files: health.ts, app.ts, admin.ts, payments.ts, webhook.ts)
   - Verify no hardcoded secrets in function code

8. **Firebase Configuration**
   - Verify `firebase.json` points to correct `firestore.rules` and `firestore.indexes.json`
   - Verify `.firebaserc` has correct project ID (`urbarber-f97ae`)

**Expected Outcome**: All local checks pass (or blockers documented).

**Blocker Resolution**: Do NOT proceed to Phase C until Phase B gates pass.

---

## Phase C: Vercel Preview Deployment (CONDITIONAL)

**Objective**: Deploy backend to Vercel Preview environment for smoke testing.

**Preconditions** (Phase B must pass)
- Backend typecheck passes
- No hardcoded secrets
- Environment variables configured in Vercel

**Tasks** (User Authorization Required)

1. **Vercel Environment Setup**
   ```
   MANUAL ACTION REQUIRED:
   1. Connect Vercel project to git repository
   2. Set environment variables in Vercel dashboard:
      - MIDTRANS_SERVER_KEY (Midtrans Sandbox)
      - FIREBASE_PROJECT_ID (Firebase)
      - FIREBASE_CLIENT_EMAIL (Firebase)
      - FIREBASE_PRIVATE_KEY (Firebase)
      - ALLOWED_ORIGINS (localhost + preview URL)
      - APP_DEEP_LINK_SCHEME (urbarber)
      - PAYMENT_RETURN_BASE_URL (preview URL)
   ```

2. **Deployment**
   ```bash
   cd backend/vercel
   vercel deploy --prod  # Or git push to trigger auto-deploy
   ```

3. **Smoke Tests** (preview URL: https://vercel-preview-url.vercel.app)
   ```bash
   # Health check
   curl https://vercel-preview-url.vercel.app/api/health
   
   # Expected: { "status": "ok" }
   ```

**Stop Condition**: Deploy only if user explicitly approves. Do NOT merge to main.

---

## Phase D: Hosted Infrastructure Integration (REQUIRES USER APPROVAL)

**Objective**: Deploy Firebase rules, indexes, Supabase policies, and configure Midtrans.

**Preconditions** (Phase C must pass)
- Vercel backend deployed and passing smoke tests
- Phase B local checks passing

**Tasks** (Each Requires Explicit User Authorization)

1. **Firebase Firestore Rules Deployment**
   ```
   MANUAL ACTION REQUIRED:
   1. Review firestore.rules (all security policies)
   2. Confirm no PII leakage in rules
   3. Run rules test suite on Firestore emulator
   4. Deploy via Firebase CLI:
      firebase deploy --only firestore:rules
   ```

2. **Firebase Firestore Indexes Deployment**
   ```
   MANUAL ACTION REQUIRED:
   1. Review firestore.indexes.json (all 9 composite indexes)
   2. Deploy via Firebase CLI:
      firebase deploy --only firestore:indexes
   3. Wait for index creation (~5-15 min per index)
   ```

3. **Supabase Storage RLS Policies Deployment**
   ```
   MANUAL ACTION REQUIRED:
   1. Review supabase/storage-policies.sql
   2. Log into Supabase console (SQL editor)
   3. Execute policies script
   4. Verify policies applied to storage buckets:
      - public-bucket (avatars)
      - private-bucket (verification docs)
   ```

4. **Midtrans Webhook Configuration**
   ```
   MANUAL ACTION REQUIRED:
   1. Log into Midtrans Sandbox Dashboard
   2. Navigate to Settings → HTTP Notification
   3. Set notification URL:
      https://vercel-backend-url.vercel.app/api/payments/webhook
   4. Test webhook via dashboard "Send Test" button
   5. Verify webhook received and processed
   ```

5. **Admin Web Deployment** (Next.js to Vercel)
   ```
   MANUAL ACTION REQUIRED:
   1. Deploy apps/admin to Vercel:
      cd apps/admin && vercel deploy --prod
   2. Set environment variables in Vercel (admin):
      - NEXT_PUBLIC_API_BASE_URL (backend URL)
   3. Verify admin login at admin app URL
   ```

**Stop Condition**: Do NOT proceed to Phase E until all infrastructure deployed and smoke-tested.

---

## Phase E: Live Role & Payment & Chat Validation (MULTI-DEVICE)

**Objective**: End-to-end live testing across customer, barber, and admin roles.

**Preconditions** (Phase D infrastructure deployed)
- Vercel backend live
- Firebase rules & indexes deployed
- Supabase RLS policies deployed
- Midtrans webhook configured
- Admin web deployed

**Test Scenarios** (Sequential; user approval required for each)

### E1: Authentication & Account Setup
1. **Customer Registration**: New email → customer account created
2. **Barber Registration**: New email → barber account + onboarding wizard → document upload → submission
3. **Admin Account**: Admin email verified + claims set
4. **Multi-Device Login**: Same account (customer) logs in on 2 devices; verify session isolation

### E2: Customer Discovery & Booking
1. **Search/Filter**: Customer searches barbers by location + geohash queries work
2. **Barber Profile**: Customer views barber profile (photo, services, reviews, rating)
3. **Service Selection**: Customer selects service + date/time
4. **Slot Hold**: System creates 15-min temporary lock
5. **Payment Initiation**: Slot hold prevents concurrent customer checkout

### E3: Payment & Slot Finalization
1. **Payment Creation**: Midtrans creates snap token; amount calculated server-side
2. **Customer Pays**: Via Midtrans Sandbox → webhook received → `paymentStatus = 'paid'`
3. **Slot Finalization**: Lock converted to final booking atomically
4. **Barber Sees Request**: Barber dashboard shows pending booking request (payment-protected)

### E4: Barber Acceptance & In-Progress
1. **Barber Accepts**: Barber accepts paid booking → status = 'accepted'
2. **Barber Starts Service**: Barber marks in_progress → foreground tracking starts
3. **Customer Sees Tracking**: Customer real-time map shows barber position (live updates every 5 sec)
4. **Chat Active**: Customer ↔ Barber can message via Firestore chat

### E5: Service Completion & Chat History
1. **Barber Completes**: Barber marks booking complete
2. **Tracking Stops**: Real-time position updates cease
3. **Chat Remains**: Historical messages remain readable
4. **Customer Rates**: Customer submits review + rating

### E6: Payment Rejection Scenario (Paid Booking)
1. **Paid Booking Rejection**: Barber rejects accepted booking with payment already paid
2. **Refund Flag**: System marks `refundRequired: true`
3. **Admin Sees Flag**: Admin dashboard shows transaction requiring refund action
4. **Manual Refund**: Admin processes refund via Midtrans → `paymentStatus = 'refunded'`

### E7: Admin Operations
1. **Barber Verification**: Admin dashboard shows barber registrations with document previews
2. **Approve/Reject**: Admin approves barber → barber becomes active
3. **Booking Monitoring**: Admin sees global booking list with payment status filters
4. **Transaction Monitoring**: Admin sees payment transactions (Midtrans + cash combined)

### E8: Chat Multi-Device Sync
1. **Message Sent**: Customer sends message on device A
2. **Real-Time Sync**: Barber sees message on device B within 1 sec
3. **Barber Replies**: Barber replies on device B
4. **Customer Sync**: Customer sees reply on device A (multiple devices active)

### E9: Concurrent Slot Hold Conflict
1. **Customer A Holds Slot**: Creates hold for barber X at 14:00
2. **Customer B Attempts Hold**: Receives `SLOT_TEMPORARILY_HELD` error (A's hold active)
3. **A's Hold Expires**: After 15 min, hold expires
4. **Customer B Retries**: Successfully creates new hold

### E10: In-Progress Cancellation Guard
1. **Booking In-Progress**: Service started by barber
2. **Customer Attempts Cancel**: UI shows cancellation disabled
3. **Barber Completes**: Service finalized
4. **Post-Complete Cancel Blocked**: Cancellation option unavailable (completed state)

**Expected Results**: All test scenarios pass without manual intervention or error states.

**Failure Handling**: Document failures and remediate before proceeding to next batch.

---

## Success Criteria

**Phase A (Context Reconciliation)** ✅
- [x] Branch verified (clean, on correct commit)
- [x] Architecture audit complete
- [x] Payment-first implementation verified
- [x] Local validation status documented
- [x] Documentation created/reconciled
- [x] PRE-DEPLOYMENT REPORT generated

**Phase B (Local Readiness)** (To be completed)
- [ ] `npm run check` passes (typecheck + lint)
- [ ] Backend typecheck passes
- [ ] Rules test suite passes (emulator required)
- [ ] No secrets in git
- [ ] Vercel function count = 5

**Phase C (Preview Deployment)** (To be completed)
- [ ] Vercel preview deployment successful
- [ ] Health check passes
- [ ] No crashes in logs

**Phase D (Infrastructure Integration)** (To be completed)
- [ ] Firebase rules deployed
- [ ] Firestore indexes created
- [ ] Supabase RLS policies applied
- [ ] Midtrans webhook configured and tested
- [ ] Admin web deployed

**Phase E (Live Validation)** (To be completed)
- [ ] All 10 test scenarios pass
- [ ] No data loss or integrity violations
- [ ] Real-time features respond within SLA (chat <1 sec, tracking <5 sec)
- [ ] No phantom payments or slot conflicts
- [ ] Concurrent access handled correctly

---

## Rollback Procedures

**Phase C (Preview Deployment Rollback)**
```bash
vercel undeploy --confirm  # Remove preview deployment
# OR manually delete via Vercel dashboard
```

**Phase D (Firebase Rules Rollback)**
```bash
# Restore previous rules version via Firebase Console
# OR redeploy previous rules version:
firebase deploy --only firestore:rules --force
```

**Phase D (Supabase RLS Rollback)**
```bash
# Via Supabase SQL editor, revert policy changes manually
# OR restore from backup if available
```

**Complete Rollback**
- No git changes committed (Phase A work stays local)
- Vercel deployments remain as previews (non-production)
- Firebase/Supabase changes can be reverted via console
- No main branch modifications

---

## Next Batch (Batch 10+)

After Phase E validation:
- **Batch 10**: Map + Foreground Tracking Device Hardening
- **Batch 11**: Production Cleanup + Dependency Hardening
- **Batch 12**: Automated Testing + Security + CI
- **Batch 13**: Full Multi-Role E2E Acceptance Testing
- **Batch 14**: Android Release
- **Batch 15**: Thesis Evidence + Documentation + Git Finalization
