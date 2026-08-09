# Vercel Deployment & Environment Configuration

**Batch:** Batch 05  
**Architecture:** Two independent Vercel projects  

## Deployment Model

This repository contains **two separate Vercel projects** deployed independently:

```
URBarber Repository (GitHub)
├── PROJECT A: urbarber-api
│   └── Root Directory: backend/vercel
│   └── Purpose: Trusted backend API
│   └── Used By: Mobile + Admin Web
│
└── PROJECT B: urbarber-admin
    └── Root Directory: apps/admin
    └── Purpose: Admin Web Dashboard
    └── Used By: Admins only
```

Each project is imported separately into Vercel with different root directories.

## Project A: API Backend (urbarber-api)

### Setup

1. In Vercel dashboard, create new Project
2. Connect to GitHub repository
3. **Root Directory**: `backend/vercel`
4. **Framework**: Other (Node.js)

### Environment Variables

```
# Required: Firebase Admin SDK (server-only, NEVER expose)
FIREBASE_PROJECT_ID=<your-firebase-project-id>
FIREBASE_CLIENT_EMAIL=<your-firebase-service-account-email>
FIREBASE_PRIVATE_KEY=<multiline-key-paste-carefully>

# Required: Midtrans Payment Gateway
MIDTRANS_SERVER_KEY=<sandbox-or-production-key>
MIDTRANS_IS_PRODUCTION=false

# Allowed Origins (CORS)
# Comma-separated list of authorized application origins
ALLOWED_ORIGINS=https://urbarber.vercel.app,https://admin.urbarber.vercel.app,http://localhost:8081,http://localhost:19006

# Optional: Deep Link Configuration
APP_DEEP_LINK_SCHEME=urbarber
PAYMENT_RETURN_BASE_URL=https://urbarber.vercel.app

# Optional: Supabase Storage (for private document access in Batch 06)
SUPABASE_URL=<supabase-project-url>
SUPABASE_SECRET_KEY=<supabase-server-secret-key>
SUPABASE_PRIVATE_BUCKET=private-documents
```

### Build & Deploy

```bash
# Vercel auto-deploys on push to main/staging
# Manual deploy:
cd backend/vercel
npx vercel --prod
```

### Available Endpoints

```
POST /api/admin/me                 - Admin authentication bootstrap (Batch 05)
POST /api/auth/register            - Customer registration
POST /api/auth/login               - User login
POST /api/bookings/create          - Create booking
POST /api/payments/midtrans         - Midtrans payment
... (more endpoints per feature batch)
```

## Project B: Admin Web (urbarber-admin)

### Setup

1. In Vercel dashboard, create new Project
2. Connect to GitHub repository
3. **Root Directory**: `apps/admin`
4. **Framework**: Next.js

### Environment Variables

```
# Firebase Client Configuration (PUBLIC - exposed to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=<firebase-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<firebase-auth-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<firebase-project-id>
NEXT_PUBLIC_FIREBASE_APP_ID=<firebase-app-id>

# Admin API Base URL (pointing to Project A)
NEXT_PUBLIC_API_BASE_URL=https://urbarber-api.vercel.app
```

### Build & Deploy

```bash
# Vercel auto-deploys on push to main/staging
# Manual deploy:
cd apps/admin
npx vercel --prod
```

### Accessing Admin Web

```
Development: http://localhost:3000
Preview:     https://urbarber-admin-<branch>.vercel.app
Production:  https://admin.urbarber.vercel.app  (or custom domain)
```

## Environment Variable Security

### DO ✅

- ✅ Use Vercel's Environment Variables UI for secrets
- ✅ Different values per environment (Preview, Production)
- ✅ Only expose NEXT_PUBLIC_* from Admin Web
- ✅ Keep all private keys in backend only
- ✅ Rotate keys periodically
- ✅ Use Firebase service account (not user credentials)

### DON'T ❌

- ❌ Commit `.env` or `.env.local` files
- ❌ Expose FIREBASE_PRIVATE_KEY in apps/admin
- ❌ Expose SUPABASE_SECRET_KEY anywhere in frontend
- ❌ Use hardcoded API URLs (use environment variables)
- ❌ Log or console.log Firebase tokens

## CORS Configuration for Admin Web

### Current Setup

Backend `ALLOWED_ORIGINS` is configured via environment variable (comma-separated):

```
ALLOWED_ORIGINS=https://urbarber.vercel.app,https://admin.urbarber.vercel.app,http://localhost:8081,http://localhost:19006
```

### Adding New Origin

When deploying Admin Web or changing its URL:

1. Get the new Admin Web URL from Vercel (preview or production)
2. Add to `ALLOWED_ORIGINS` in backend/vercel environment
3. Redeploy backend
4. Test CORS with Admin Web

**Example:**

```
# Before
ALLOWED_ORIGINS=https://urbarber.vercel.app,https://admin-old.vercel.app

# After
ALLOWED_ORIGINS=https://urbarber.vercel.app,https://admin-new.vercel.app
```

### Localhost Development

Both projects support `http://localhost:*` during development:

```bash
# Mobile (localhost:8081 or localhost:19006)
npx expo start

# Admin Web (localhost:3000)
cd apps/admin && npm run dev

# Backend API (localhost:3000 in separate terminal)
cd backend/vercel && npx vercel dev
```

CORS handler automatically allows any `localhost:` origin.

## Deployment Checklist

### Before First Production Deploy

- [ ] Firebase Admin credentials in backend secrets
- [ ] Firebase Web config in Admin Web secrets
- [ ] Midtrans keys in backend
- [ ] ALLOWED_ORIGINS updated to include Admin domain
- [ ] Git configured to auto-deploy (GitHub → Vercel)
- [ ] Environment variable encryption verified (Vercel dashboard)

### After Deploying Admin Web

- [ ] Test login with admin credentials
- [ ] Verify `/api/admin/me` responds with 200
- [ ] Check CORS headers in network tab
- [ ] Test logout flow
- [ ] Verify mobile app still works (separate deployment)

### Regular Maintenance

- [ ] Review ALLOWED_ORIGINS quarterly
- [ ] Rotate Firebase credentials annually
- [ ] Monitor Vercel logs for 403/401 auth errors
- [ ] Update dependencies in package.json
- [ ] Test both projects after dependency updates

## Vercel Specific Features

### Preview Deployments

- Mobile app & backend deploy from staging/feature branches
- Admin Web should also deploy previews
- Preview Admin URLs use different CORS origins
- Each preview has isolated environment variables

### Build Settings

**Backend (Node.js)**
```
Build Command: (leave empty - automatic)
Output Directory: (leave empty)
```

**Admin Web (Next.js)**
```
Build Command: next build
Output Directory: .next
```

### Monitoring

- Vercel provides logs for failed builds
- Check Function logs for 5xx errors
- Monitor cold start times

## Rollback Procedure

If deployment causes issues:

### Mobile + Backend Issue

```bash
# Revert commit
git revert <bad-commit>
git push origin main
# Vercel auto-redeploys
```

### Admin Web Issue

```bash
# Revert commit
git revert <bad-commit>
git push origin main
# Vercel auto-redeploys Admin Web
```

### Manual Rollback

In Vercel dashboard:
1. Project Settings → Deployments
2. Click previous successful deployment
3. Promote to Production

## Troubleshooting

### Admin Web Cannot Connect to Backend

**Symptom**: 403 CORS error, Auth errors  
**Solution**:
1. Verify ALLOWED_ORIGINS includes Admin Web URL
2. Check `/api/admin/me` responds with 200 (postman test)
3. Ensure backend is deployed and running
4. Check Network tab for exact error

### Firebase Auth Failing

**Symptom**: Login hangs or redirects to `/unauthorized`  
**Solution**:
1. Verify Firebase Web config in Admin Web `.env.production`
2. Confirm Firebase project allows web apps
3. Test with Firebase emulator locally
4. Check Firebase Admin SDK in backend is initialized

### Token/Auth Issues

**Symptom**: 401 Unauthorized, token expired  
**Solution**:
1. Ensure backend calls `verifyIdToken(token, checkRevoked=true)`
2. Check token expiry in JWT.io decoder
3. Confirm Firebase Admin SDK config matches production project
4. Test with fresh login

## Support & Documentation

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Firebase Docs: https://firebase.google.com/docs
- Admin Provisioning: `scripts/set-admin-claims.mjs` (this repo)

---

**Last Updated:** Batch 05 - Admin Web Foundation  
**Next Review:** Before Batch 06 - Admin Operations
