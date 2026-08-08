# ADR-005: Admin Web Separation from Mobile

**Date:** 2026-08-08  
**Status:** Accepted  
**Batch:** Batch 05 - Admin Web Foundation

## Context

The URBarber platform required administrative capabilities. Initial implementation attempted to build Admin features directly into the Expo mobile application (`src/app/(admin)/` routes). This created several architectural issues:

1. **Security**: Client-side access to privileged operations increased vulnerability surface
2. **Separation of Concerns**: Admin workflow (web/desktop) fundamentally differs from mobile user workflows
3. **Scalability**: Mobile App Router design is not optimized for complex admin business logic
4. **Maintainability**: Mixing mobile, barber, customer, and admin workflows in one codebase increased cognitive load
5. **Deployment**: Admin features force redeploy of mobile app; separate web app enables independent release cadence

## Decision

Implement Admin functionality as a **dedicated Next.js web application** separate from the Expo mobile application:

### Architecture

```
URBarber Repository
├── (Mobile) Expo App
│   ├── src/app/(auth)         - Authentication  
│   ├── src/app/(customer)     - Customer features
│   ├── src/app/(barber)       - Barber features
│   └── src/app/(barber-onboarding) - Barber registration
│
├── (Admin Web) Next.js App        ← NEW
│   ├── app/
│   ├── components/
│   ├── features/auth/
│   └── lib/
│
├── (Trusted Backend) Vercel Functions
│   ├── backend/vercel/api/     - All shared API endpoints
│   ├── backend/vercel/src/     - Business logic & auth
│   └── (includes Admin endpoints)
│
└── (External Services)
    ├── Firebase Authentication (auth)
    ├── Cloud Firestore (data)
    ├── Supabase Storage (files)
    └── Midtrans Sandbox (payments)
```

### Key Principles

1. **Trusted Backend Only**: Admin mutations route through backend/vercel with requireAdmin middleware
2. **No Admin in Mobile**: Admins who login to mobile app see `admin-web-only` message with logout option
3. **Separate Deployments**: Two independent Vercel projects (API + Admin Web)
4. **Shared Domain Model**: Firebase Auth + Firestore rules unchanged; Admin is a valid role
5. **Progressive Implementation**: Batch 05 (foundation) vs. Batch 06 (full Admin Operations)

## Consequences

### Positive

- ✅ Clear separation between User Applications (Mobile) and Admin Operations (Web)
- ✅ Admin Web can use modern web patterns (Server Components, React 19, TypeScript strict)
- ✅ Independent deployment cadence for admin features
- ✅ Reduced mobile bundle size (no unused admin code)
- ✅ Better security posture (privileged operations centralized in backend)
- ✅ Improved developer experience (web-focused tooling for admin work)
- ✅ Desktop-first UX optimization possible (sidebar, tables, forms)

### Negative

- ⚠️ Additional Vercel project to manage
- ⚠️ Admin provisioning requires separate operational process
- ⚠️ Admins must use separate web interface (not mobile app)

### Mitigation

- One GitHub repository stores both projects (easy discovery, shared PRs)
- Provisioning script (`scripts/set-admin-claims.mjs`) documents trusted process
- CORS configured at backend for both mobile and admin origins
- Type-safe API client ensures contracts between web and backend

## Implementation

### Batch 05 - Foundation

- Create `apps/admin` Next.js application
- Implement Firebase Web SDK login (email/password)
- Create `/api/admin/me` endpoint for bootstrap verification
- Build auth provider & route guards
- Desktop-first responsive layout (sidebar, header)
- Placeholder dashboard + menu structure

### Batch 06 - Admin Operations

- Barber registration verification queue
- Customer/Barber management (list, suspend, reactivate)
- Service category CRUD
- Global booking monitor
- Transaction monitoring
- Business analytics

## References

- [Batch 05 Specification](../../docs/development/batches/05-admin-web-foundation.md)
- [Provisioning Script](../../scripts/set-admin-claims.mjs)
- [Admin Auth Middleware](../../backend/vercel/src/admin/admin-auth.ts)
- [Admin Web Layout](../../apps/admin/app/(dashboard)/layout.tsx)

---

**Approved by:** Development Team  
**Implementation Lead:** Batch 05  
**Testing Lead:** Mobile regression + Backend verification tests
