# Testing: Admin Web Foundation

**Batch:** Batch 05  
**Focus:** Mobile regression tests and Admin Web foundation verification  

## Mobile Regression Tests

These tests verify that Admin removal from mobile has not broken existing user flows.

### Test Suite: Role-Based Routing

```typescript
describe('Role-Based Auth Routing', () => {
  // Test 1: Customer remains in Customer application
  it('should route active customer to /(customer)/home', async () => {
    // Setup: Firebase user with role=customer, status=active, emailVerified=true
    // Action: User navigates to root
    // Assert: Router redirects to /(customer)/home
  });

  // Test 2: Barber pending verification routes to status screen
  it('should route pending barber to /(barber-onboarding)/status', async () => {
    // Setup: Firebase user with role=barber, verificationStatus=pending
    // Action: User navigates to root
    // Assert: Router redirects to /(barber-onboarding)/status
  });

  // Test 3: Barber rejected routes to correction screen
  it('should route rejected barber to /(barber-onboarding)/profile', async () => {
    // Setup: Firebase user with role=barber, verificationStatus=rejected
    // Action: User navigates to root
    // Assert: Router redirects to /(barber-onboarding)/profile
  });

  // Test 4: Approved barber routes to Barber app
  it('should route approved barber to /(barber)/home', async () => {
    // Setup: Firebase user with role=barber, verificationStatus=approved, status=active
    // Action: User navigates to root
    // Assert: Router redirects to /(barber)/home
  });

  // Test 5: Admin NEVER routes to (admin) workspace
  it('should NOT route admin to /(admin) workspace', async () => {
    // Setup: Firebase user with app_role=admin, status=active
    // Action: User navigates to root
    // Assert: /(admin) route path does not exist
    // Assert: Files under src/app/(admin)/ have been deleted
  });

  // Test 6: Admin routes to admin-web-only screen
  it('should route admin to /(auth)/admin-web-only', async () => {
    // Setup: Firebase user with role=admin, status=active, emailVerified=true
    // Action: User logs in via auth flow
    // Assert: Router redirects to /(auth)/admin-web-only
  });

  // Test 7: Admin can logout from admin-web-only
  it('should allow admin to logout from admin-web-only screen', async () => {
    // Setup: Admin user on /(auth)/admin-web-only screen
    // Action: Tap "Logout" button
    // Assert: User logs out of Firebase
    // Assert: Router redirects to /(auth)/login
  });

  // Test 8: Suspended account cannot access any role-specific route
  it('should not route suspended user to any workspace', async () => {
    // Setup: Firebase user with status=suspended
    // Action: User attempts to navigate past auth
    // Assert: Router prevents access and redirects to login
  });
});
```

### Test Suite: Admin Routes Cleanup

```typescript
describe('Mobile Admin Workspace Removal', () => {
  // Test 9: No admin routes exist in mobile app
  it('should have deleted src/app/(admin)/ directory', () => {
    // Assert: src/app/(admin)/_layout.tsx does not exist
    // Assert: src/app/(admin)/dashboard.tsx does not exist
    // Assert: No routes under src/app/(admin)/ exist
  });

  // Test 10: No admin features imported by mobile code
  it('should have no Customer/Barber code importing features/admin', () => {
    // Assert: grep src/app/(customer)/ for "features/admin" = 0 matches
    // Assert: grep src/app/(barber)/ for "features/admin" = 0 matches
    // Assert: grep src/features/auth/ for "features/admin" = 0 matches
  });

  // Test 11: Admin Web only route exists
  it('should have created admin-web-only route', () => {
    // Assert: src/app/(auth)/admin-web-only.tsx exists
    // Assert: Route renders logout button and admin-only message
  });

  // Test 12: Routes constant updated
  it('should have updated routes.ts admin reference', () => {
    // Assert: routes.admin.webOnly === '/(auth)/admin-web-only'
    // Assert: routes.admin.dashboard does not exist
  });
});
```

### Test Suite: Core Mobile Flows

```typescript
describe('Core Mobile User Flows', () => {
  // Test 13: Direct Barber registration still works
  it('should allow barber direct registration flow', async () => {
    // Setup: New Firebase user
    // Action: User logs in, initiates barber registration
    // Assert: Registration flow completes and user reaches verification screen
  });

  // Test 14: Map/Tracking features remain unchanged
  it('should preserve map and tracking functionality', async () => {
    // Setup: Barber with active booking
    // Action: User opens map/tracking screen
    // Assert: Map loads, tracking works (geospatial queries unchanged)
  });

  // Test 15: Customer booking flow remains unchanged
  it('should preserve complete customer booking flow', async () => {
    // Setup: Customer with active bookings
    // Action: User books a service, makes payment, receives invoice
    // Assert: Full booking flow completes without errors
  });

  // Test 16: Chat between roles remains unchanged
  it('should preserve chat functionality across roles', async () => {
    // Setup: Customer and Barber with conversation
    // Action: Send message from customer, barber receives it
    // Assert: Messages sync in real-time (no changes to chat collection/rules)
  });
});
```

## Backend API Tests

### Test Suite: Admin Authentication

```typescript
describe('requireAdmin Middleware', () => {
  // Test 17: Missing token -> 401
  it('should return 401 for missing Authorization header', async () => {
    // Action: POST /api/admin/me with no Authorization header
    // Assert: Response status 401
    // Assert: error.code === 'UNAUTHENTICATED'
  });

  // Test 18: Malformed token -> 401
  it('should return 401 for malformed token', async () => {
    // Action: POST /api/admin/me with Authorization: "Bearer xyz"
    // Assert: Response status 401
    // Assert: error.code === 'UNAUTHENTICATED'
  });

  // Test 19: Invalid/expired token -> 401
  it('should return 401 for invalid/expired Firebase token', async () => {
    // Setup: Expired Firebase ID token
    // Action: POST /api/admin/me with expired token
    // Assert: Response status 401
  });

  // Test 20: Customer token -> 403
  it('should return 403 for customer user', async () => {
    // Setup: Firebase user with app_role=customer
    // Action: POST /api/admin/me with customer token
    // Assert: Response status 403
    // Assert: error.code === 'FORBIDDEN'
  });

  // Test 21: Barber token -> 403
  it('should return 403 for barber user', async () => {
    // Setup: Firebase user with app_role=barber
    // Action: POST /api/admin/me with barber token
    // Assert: Response status 403
  });

  // Test 22: Active admin -> 200
  it('should return 200 for active admin', async () => {
    // Setup: Firebase user with app_role=admin, users/{uid}.status=active
    // Action: POST /api/admin/me with valid admin token
    // Assert: Response status 200
    // Assert: Response contains { uid, email, appRole: 'admin', status: 'active' }
  });

  // Test 23: Suspended admin -> 403
  it('should return 403 for suspended admin', async () => {
    // Setup: Firebase user with app_role=admin, users/{uid}.status=suspended
    // Action: POST /api/admin/me with suspended admin token
    // Assert: Response status 403
    // Assert: error.code === 'ADMIN_INACTIVE'
  });
});

describe('/api/admin/me Endpoint', () => {
  // Test 24: Response contains only safe fields
  it('should not expose sensitive fields in response', async () => {
    // Setup: Active admin
    // Action: GET /api/admin/me with valid admin token
    // Assert: Response does not contain customClaims
    // Assert: Response does not contain firebasePrivateKey
    // Assert: Response does not contain tokens
    // Assert: Response contains only: uid, email, appRole, status, displayName
  });

  // Test 25: Token is not logged
  it('should not log Firebase ID token', async () => {
    // Setup: Monitoring console.log and error logs
    // Action: Make request with token
    // Assert: Token value does not appear in logs
  });
});

describe('CORS Configuration', () => {
  // Test 26: Unknown origin -> 403
  it('should reject CORS request from unknown origin', async () => {
    // Action: POST /api/admin/me from unknown origin
    // Assert: Response status 403
    // Assert: error.code === 'CORS_FORBIDDEN'
  });

  // Test 27: Configured mobile origin accepted
  it('should accept CORS request from configured mobile origin', async () => {
    // Setup: ALLOWED_ORIGINS includes mobile origin
    // Action: POST /api/admin/me from mobile origin
    // Assert: Access-Control-Allow-Origin header set correctly
  });

  // Test 28: Configured admin origin accepted
  it('should accept CORS request from configured admin origin', async () => {
    // Setup: ALLOWED_ORIGINS includes admin web origin
    // Action: GET /api/admin/me from admin web origin
    // Assert: Access-Control-Allow-Origin header set correctly
    // Assert: OPTIONS preflight succeeds
  });

  // Test 29: Localhost always accepted
  it('should accept CORS from any localhost origin', async () => {
    // Action: POST /api/admin/me from http://localhost:3000
    // Assert: Access-Control-Allow-Origin set to http://localhost:3000
    // Action: POST /api/admin/me from http://localhost:3001
    // Assert: Access-Control-Allow-Origin set to http://localhost:3001
  });

  // Test 30: OPTIONS preflight returns 204
  it('should handle OPTIONS preflight correctly', async () => {
    // Action: OPTIONS /api/admin/me
    // Assert: Response status 204
    // Assert: Access-Control headers present
  });
});
```

## Admin Web Tests

### Test Suite: Admin Auth Foundation

```typescript
describe('Admin Web Auth Flow', () => {
  // Test 31: Login page renders without authentication
  it('should render login page for unauthenticated users', () => {
    // Action: Navigate to /
    // Assert: Redirects to /login
    // Assert: Login form displays (email, password inputs)
  });

  // Test 32: Valid admin credentials succeed
  it('should sign in with valid admin credentials', async () => {
    // Setup: Admin account provisioned
    // Action: Enter email/password and click Login
    // Assert: Firebase signs in
    // Assert: AdminAuthProvider calls /api/admin/me
    // Assert: Redirects to dashboard
  });

  // Test 33: Invalid credentials fail gracefully
  it('should display error for invalid credentials', async () => {
    // Action: Enter invalid email/password and click Login
    // Assert: Firebase returns auth error
    // Assert: Error message displayed to user
    // Assert: Form remains on login page
  });

  // Test 34: Customer/Barber token shows unauthorized
  it('should show unauthorized page for customer/barber', async () => {
    // Setup: Firebase signs in a customer
    // Action: AdminAuthProvider validates with /api/admin/me
    // Assert: Backend returns 403
    // Assert: Admin Web redirects to /unauthorized
    // Assert: Unauthorized page displays with logout option
  });

  // Test 35: Backend unavailable shows error state
  it('should show error for backend unavailable', async () => {
    // Setup: Backend service down
    // Action: AdminAuthProvider attempts /api/admin/me
    // Assert: Request fails with 5xx or network error
    // Assert: Admin Web shows backend-unavailable state
    // Assert: User can retry
  });

  // Test 36: Session loading prevents dashboard flash
  it('should not flash dashboard before auth is resolved', () => {
    // Setup: Page reload while authenticated
    // Action: AdminAuthProvider initializing, checking auth state
    // Assert: Dashboard not rendered until auth validation complete
    // Assert: Loading state shown during validation
  });

  // Test 37: Logout clears session
  it('should clear session on logout', async () => {
    // Setup: Admin on dashboard
    // Action: Click logout in header menu
    // Assert: Firebase signOut called
    // Assert: AuthProvider state cleared
    // Assert: Redirects to /login
  });

  // Test 38: API client attaches Bearer token
  it('should include Bearer token in API requests', async () => {
    // Setup: Authenticated admin
    // Setup: Intercept HTTP requests
    // Action: AdminAuthProvider or admin code makes API call
    // Assert: Authorization: Bearer <token> header attached
  });

  // Test 39: Token value not rendered in UI
  it('should not expose token in rendered HTML', () => {
    // Setup: Authenticated admin on dashboard
    // Action: Inspect page HTML/JavaScript
    // Assert: Firebase ID token not visible anywhere
    // Assert: Token not in console output or error messages
  });
});

describe('Admin Dashboard Foundation', () => {
  // Test 40: Dashboard shows admin identity
  it('should display authenticated admin name/email', () => {
    // Setup: Authenticated admin
    // Action: Navigate to dashboard
    // Assert: Dashboard header shows admin displayName or email
    // Assert: Sidebar shows identity information
  });

  // Test 41: Dashboard shows no fake analytics
  it('should not display fake business metrics', () => {
    // Setup: Dashboard foundation implementation
    // Action: Inspect dashboard page
    // Assert: No fake revenue numbers
    // Assert: No fake user counts
    // Assert: No Math.random() metrics
    // Assert: Only foundation info (auth status, environment label)
  });

  // Test 42: Menu items mark unavailable features
  it('should indicate unavailable features are coming in Batch 06', () => {
    // Setup: Dashboard foundation
    // Action: View sidebar menu
    // Assert: Batch 06 features marked as disabled/pending
    // Assert: Hover shows "Available in Batch 06 - Admin Operations"
  });

  // Test 43: Responsive layout on tablet/mobile web
  it('should display usable layout on tablet screens', () => {
    // Action: View dashboard at 768px width
    // Assert: Layout remains readable
    // Assert: Sidebar collapses or adapts
    // Assert: No content hidden or broken
  });
});

describe('Security Validation', () => {
  // Test 44: No firebase-admin in browser bundle
  it('should not include firebase-admin SDK in admin web bundle', () => {
    // Setup: Build Admin Web app
    // Action: Analyze bundle
    // Assert: firebase-admin not present
    // Assert: Only firebase (Web SDK) present
  });

  // Test 45: No private keys in environment
  it('should not expose private credentials', () => {
    // Setup: Admin Web built with environment variables
    // Assert: FIREBASE_PRIVATE_KEY not in bundle
    // Assert: SUPABASE_SECRET_KEY not in bundle
    // Assert: MIDTRANS_SERVER_KEY not in bundle
    // Assert: Only NEXT_PUBLIC_* variables in bundle
  });

  // Test 46: LocalStorage/SessionStorage audit
  it('should not store sensitive data insecurely', () => {
    // Setup: Authenticated admin on dashboard
    // Action: Inspect browser storage
    // Assert: Firebase tokens in sessionStorage or memory (not localStorage)
    // Assert: No passwords stored
    // Assert: No private keys stored
  });
});
```

## Test Execution Strategy

### Mobile App Tests

```bash
# Run existing mobile test suite (should pass)
npm run test
npm run check

# Regression checklist (manual verification)
- [ ] Customer login -> Customer home ✓
- [ ] Barber registration flow ✓
- [ ] Map/Tracking functional ✓
- [ ] Booking complete flow ✓
- [ ] Admin login -> admin-web-only screen ✓
- [ ] Admin can logout ✓
```

### Backend API Tests

```bash
# Run from backend/vercel
npm run test

# Tests verify:
- requireAdmin middleware behavior
- /api/admin/me endpoint
- CORS configuration
- Error handling
```

### Admin Web Tests

```bash
# Run from apps/admin
npm run lint
npm run build
npm run test  # if test suite added

# Manual smoke tests:
- [ ] Login page renders
- [ ] Invalid credentials show error
- [ ] Valid admin credentials sign in
- [ ] Customer/Barber shows unauthorized
- [ ] Dashboard displays identity
- [ ] Logout works
- [ ] Token management secure
```

## Test Coverage Goals

- ✅ **Mobile**: 100% regression - all existing flows work
- ✅ **Backend**: 100% auth - all requireAdmin scenarios covered
- ✅ **Security**: 100% - no sensitive data exposure
- ✅ **Admin Web**: Foundation only - login, auth, dashboard, logout
- ⏳ **Admin Ops**: Deferred to Batch 06 (Barber verification, User management, etc.)

## Notes

- Tests in **Batch 05** focus on foundation and regression
- **Batch 06** will expand Admin Ops tests (Barber verification, User suspension, etc.)
- Use Firebase emulator for local testing (no production auth)
- CI/CD should block PRs that break regression tests
