# Batch 09B-C-D: Deployment Runbook

**Status**: DOCUMENTED (NOT EXECUTED)  
**Purpose**: Manual, ordered steps for phased infrastructure deployment  
**Phases**: C (Vercel Preview), D (Firebase/Supabase/Midtrans)

---

## Phase C: Vercel Preview Deployment

### Step C1: Vercel Environment Setup

**Precondition**: Phase B local checks pass ✓

**Action**:
1. Log into Vercel dashboard (vercel.com)
2. Select urbarber project
3. Navigate to: Settings → Environment Variables
4. Add the following environment variables:

```
MIDTRANS_SERVER_KEY = <value from Midtrans Sandbox>
MIDTRANS_IS_PRODUCTION = false

FIREBASE_PROJECT_ID = urbarber-f97ae
FIREBASE_CLIENT_EMAIL = <service account email>
FIREBASE_PRIVATE_KEY = <service account private key>

ALLOWED_ORIGINS = http://localhost:8081,http://localhost:19006,https://<preview-url>.vercel.app
APP_DEEP_LINK_SCHEME = urbarber
PAYMENT_RETURN_BASE_URL = https://<preview-url>.vercel.app
```

**Expected Result**: Variables saved in Vercel UI

**Rollback**: Delete environment variables from Vercel dashboard

---

### Step C2: Deploy Backend to Vercel Preview

**Precondition**: Step C1 complete ✓

**Action** (Option A - Git Push):
```bash
git push origin feat/batch-09-infrastructure-live-validation
```
(Vercel auto-triggers deployment on push if connected)

**Action** (Option B - Manual Deploy):
```bash
cd backend/vercel
vercel deploy
```

**Expected Result**: Deployment completes; preview URL assigned

**Status Check**:
```bash
vercel ls  # List deployments
```

**Rollback**:
```bash
vercel remove <deployment-id> --confirm
```

---

### Step C3: Smoke Test - Health Check

**Precondition**: Step C2 complete, preview URL available ✓

**Action**:
```bash
curl https://<preview-url>.vercel.app/api/health
```

**Expected Result**:
```json
{
  "status": "ok",
  "ok": true,
  "service": "urbarber-api",
  "timestamp": "2026-08-09T02:30:00.000Z"
}
```

**Status**: 200 OK

**If Failed**:
1. Check Vercel logs: `vercel logs <deployment-id> --tail`
2. Inspect error messages
3. Rollback and fix environment variables or config

**Rollback**: Delete deployment (Step C2 rollback)

---

### Step C4: Smoke Test - API Connectivity

**Precondition**: Step C3 passes ✓

**Action** (CORS preflight):
```bash
curl -X OPTIONS https://<preview-url>.vercel.app/api/app \
  -H "Origin: http://localhost:8081" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

**Expected Result**:
- Status: 204 No Content
- Response header: `Access-Control-Allow-Origin: http://localhost:8081`
- Response header: `Access-Control-Allow-Methods: POST`

**If Failed**:
1. Verify ALLOWED_ORIGINS in Vercel environment
2. Check CORS handler: `backend/vercel/src/lib/cors.ts`
3. Redeploy after fix

---

## Phase D: Hosted Infrastructure Integration

### Step D1: Firebase Firestore Rules Deployment

**Precondition**: Phase C passes, preview URL verified ✓

**Action**:
1. Review rules locally: `cat firestore.rules`
2. Verify no PII leakage in rules
3. Run local emulator test:
   ```bash
   npm run test:firestore-rules
   ```
4. Deploy to Firebase:
   ```bash
   firebase deploy --only firestore:rules
   ```

**Expected Result**: Deployment succeeds; rules active on Firebase project

**Verification**:
```bash
firebase rules:list
```

**Rollback**:
```bash
firebase deploy --only firestore:rules  # Re-deploy previous version from version control
```

---

### Step D2: Firebase Firestore Indexes Deployment

**Precondition**: Step D1 complete ✓

**Action**:
1. Review indexes: `cat firestore.indexes.json` (verify 9 indexes present)
2. Deploy:
   ```bash
   firebase deploy --only firestore:indexes
   ```
3. Wait for index creation (~5-15 min per index)

**Status Check**:
```bash
firebase firestore:indexes
```

**Expected Result**:
- 9 indexes in READY state
- Sample output:
  ```
  bookings (customerId, status, createdAt DESC) - READY
  bookings (barberId, status, createdAt DESC) - READY
  ...etc
  ```

**Rollback**:
```bash
firebase firestore:delete-indexes
firebase deploy --only firestore:indexes  # Re-deploy previous version
```

---

### Step D3: Supabase Storage RLS Policies Deployment

**Precondition**: Step D2 complete (indexes ready) ✓

**Action**:
1. Review SQL: `cat supabase/storage-policies.sql`
2. Log into Supabase console (https://app.supabase.com)
3. Navigate to: SQL Editor
4. Create new query
5. Copy-paste entire `supabase/storage-policies.sql` content
6. Click "Run" (Execute query)
7. Verify no errors

**Expected Result**: Policies applied to `storage.objects` table

**Verification**:
1. In Supabase console: Storage → Policies tab
2. Verify policies listed:
   - Public Read Access for public-media
   - Authenticated Upload to public-media
   - Authenticated Update in public-media
   - Authenticated Delete in public-media
   - Owner or Admin Read Access for private-documents
   - Owner Upload to private-documents
   - Owner Update in private-documents
   - Owner Delete in private-documents

**Rollback**:
1. In Supabase console: SQL Editor
2. Run DROP POLICY statements from Step D3 SQL file
3. Or restore from Supabase backup if available

---

### Step D4: Midtrans Webhook Configuration

**Precondition**: Step C passes, Vercel preview URL confirmed ✓

**Action**:
1. Log into Midtrans Sandbox Dashboard (https://app.sandbox.midtrans.com)
2. Navigate to: Settings → HTTP Notification
3. Set Notification URL to:
   ```
   https://<preview-url>.vercel.app/api/payments/webhook
   ```
4. Verify settings saved

**Expected Result**: Notification URL configured

**Testing**:
1. In Midtrans dashboard: Send Test button
2. Check Vercel logs for webhook receipt:
   ```bash
   vercel logs <deployment-id> --tail | grep webhook
   ```
3. Verify status: 200 OK in logs

**Rollback**: Clear Notification URL in Midtrans settings

---

### Step D5: Admin Web Deployment (Next.js)

**Precondition**: Phase C complete, Vercel backend URL confirmed ✓

**Action** (Option A - Git Push):
```bash
git push origin feat/batch-09-infrastructure-live-validation
```
(If Vercel has `apps/admin` configured)

**Action** (Option B - Manual Deploy):
```bash
cd apps/admin
vercel deploy --prod
```

**Action** (Option C - Monorepo Deploy):
```bash
cd apps/admin
npm run build
vercel deploy --build-env NEXT_PUBLIC_API_BASE_URL=https://<backend-preview-url>.vercel.app
```

**Environment Variables** (Vercel Dashboard):
```
NEXT_PUBLIC_FIREBASE_API_KEY = <real Firebase API key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = urbarber-f97ae.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID = urbarber-f97ae
NEXT_PUBLIC_FIREBASE_APP_ID = <real Firebase app ID>
NEXT_PUBLIC_API_BASE_URL = https://<backend-preview-url>.vercel.app
```

**Expected Result**: Admin web deployed and accessible

**Verification**:
```bash
curl https://<admin-preview-url>.vercel.app/
# Expected: HTML with Next.js app
```

**Smoke Test**:
1. Open admin URL in browser
2. Attempt login with test admin account
3. Verify authentication works
4. Verify API calls to `/api/admin/*` succeed

**Rollback**: Delete deployment via Vercel dashboard

---

## Summary Checklist

### Phase C Complete ✓
- [ ] Vercel environment variables set
- [ ] Backend deployed to preview
- [ ] Health check passes
- [ ] CORS preflight succeeds

### Phase D Complete ✓
- [ ] Firebase Firestore rules deployed
- [ ] Firestore indexes created (9 indexes READY)
- [ ] Supabase RLS policies applied
- [ ] Midtrans webhook configured and tested
- [ ] Admin web deployed
- [ ] Admin login verified

---

## Stop Conditions

**DO NOT PROCEED** to Phase E if:
1. Any health check fails
2. Error logs show critical issues
3. Firestore indexes remain in "Creating" state > 30 min
4. Midtrans webhook test fails
5. Admin web login fails

**DO PROCEED** to Phase E when:
1. All checks pass
2. Preview URLs respond successfully
3. Webhook confirmed in Midtrans & Vercel logs
4. Admin credentials work on preview

---

## Emergency Rollback (All Phases)

**If something goes wrong**, execute in reverse order:

1. **Remove Admin Web**: Delete Vercel deployment
2. **Remove Webhook Config**: Clear Midtrans Notification URL
3. **Drop RLS Policies**: Run DROP statements via Supabase SQL Editor
4. **Remove Indexes**: Delete Firestore indexes via Firebase console
5. **Remove Rules**: Revert Firestore rules (deploy previous version)
6. **Remove Backend**: Delete Vercel deployment

**No git changes** needed (Phase A work remains local; no commits to main)

---

## Timing Expectations

- **Phase C**: ~5-10 min
- **Step D1 (Rules)**: ~2 min
- **Step D2 (Indexes)**: ~10-15 min (index creation)
- **Step D3 (Supabase)**: ~2 min
- **Step D4 (Midtrans)**: ~2 min
- **Step D5 (Admin Web)**: ~5-10 min

**Total Estimated**: ~30-45 minutes (including index wait time)

---

## Next Steps (Phase E)

After all Phase D steps complete successfully:
1. Review `docs/testing/live-validation-batch-09.md`
2. Prepare test accounts (customer, barber, admin)
3. Execute 10 live test scenarios
4. Document results
5. Proceed to Batch 10 or fix any failures
