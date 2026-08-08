# Environment Variable Matrix (Batch 09B)

## Overview

This document catalogs all environment variables used in URBarber across mobile, admin web, backend, and local tooling components.

**Security Rule**: Never print values in reports. Only document variable names, purposes, and visibility levels.

---

## Mobile (Expo - EXPO_PUBLIC_* only)

| Variable | Component | Visibility | Required | Purpose | Environment |
|---|---|---|---|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Expo/Firebase | PUBLIC | Yes | Firebase client configuration | Development & Production |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Expo/Firebase | PUBLIC | Yes | Firebase authentication domain | Development & Production |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Expo/Firebase | PUBLIC | Yes | Firebase project identifier | Development & Production |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Expo/Firebase | PUBLIC | Yes | Firebase web app ID | Development & Production |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Expo/Firebase | PUBLIC | Yes | Firebase storage bucket | Development & Production |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Expo/Firebase | PUBLIC | Yes | Firebase messaging sender ID | Development & Production |
| `EXPO_PUBLIC_SUPABASE_URL` | Expo/Supabase | PUBLIC | Yes | Supabase project URL | Development & Production |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Expo/Supabase | PUBLIC | Yes | Supabase publishable key | Development & Production |
| `EXPO_PUBLIC_SUPABASE_KEY` | Expo/Supabase | PUBLIC | Yes | Supabase public/publishable key (alias) | Development & Production |
| `EXPO_PUBLIC_SUPABASE_PUBLIC_BUCKET` | Expo/Supabase | PUBLIC | Yes | Public media storage bucket name | Development & Production |
| `EXPO_PUBLIC_SUPABASE_PRIVATE_BUCKET` | Expo/Supabase | PUBLIC | Yes | Private documents storage bucket name | Development & Production |
| `EXPO_PUBLIC_PAYMENT_API_BASE_URL` | Expo/Payments | PUBLIC | Yes | Vercel backend API root URL | Development & Production |

**Note**: Mobile-safe values only. No Firebase private keys, Midtrans server key, or Supabase service-role key.

---

## Admin Web (Next.js)

| Variable | Component | Visibility | Required | Purpose | Environment |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Next.js/Firebase | PUBLIC | Yes | Firebase client configuration (dummy in development) | Development Only |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Next.js/Firebase | PUBLIC | Yes | Firebase authentication domain | Development & Production |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Next.js/Firebase | PUBLIC | Yes | Firebase project ID (development: dummy) | Development Only |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Next.js/Firebase | PUBLIC | Yes | Firebase app ID (development: dummy) | Development Only |
| `NEXT_PUBLIC_API_BASE_URL` | Next.js/Backend | PUBLIC | Yes | Vercel backend API root URL | Development & Production |

**Local Development**: `apps/admin/.env.local` uses dummy Firebase credentials. Vercel will override with real credentials at build time.

**Production**: Vercel environment variables (secrets) are set separately in Vercel dashboard.

---

## Backend (Vercel - Private Variables Only)

| Variable | Component | Visibility | Required | Purpose | Environment |
|---|---|---|---|---|---|
| `MIDTRANS_SERVER_KEY` | Vercel/Payments | PRIVATE | Yes | Midtrans Sandbox server authentication key | Vercel Backend Only |
| `MIDTRANS_IS_PRODUCTION` | Vercel/Payments | PRIVATE | No | Toggle Midtrans environment (default: false = Sandbox) | Vercel Backend Only |
| `FIREBASE_PROJECT_ID` | Vercel/Firebase | PRIVATE | Yes | Firebase project identifier | Vercel Backend Only |
| `FIREBASE_CLIENT_EMAIL` | Vercel/Firebase | PRIVATE | Yes | Firebase service account email | Vercel Backend Only |
| `FIREBASE_PRIVATE_KEY` | Vercel/Firebase | PRIVATE | Yes | Firebase service account private key (PEM format) | Vercel Backend Only |
| `ALLOWED_ORIGINS` | Vercel/CORS | PRIVATE | No | CORS allowed origins (comma-separated, default: localhost:8081,localhost:19006) | Vercel Backend Only |
| `APP_DEEP_LINK_SCHEME` | Vercel/Routing | PRIVATE | No | Deep link scheme for payment return (default: urbarber) | Vercel Backend Only |
| `PAYMENT_RETURN_BASE_URL` | Vercel/Payments | PRIVATE | No | Base URL for payment return redirect (default: https://urbarber.vercel.app) | Vercel Backend Only |

**Security**: Backend environment variables stored in `.env.local` locally, Vercel secrets in Vercel dashboard for production.

**Validation**: Zod schema validates all required variables. Missing variables cause startup failure with clear error messages.

---

## Local Tooling (Scripts Only)

| Variable | Component | Visibility | Required | Purpose | Environment |
|---|---|---|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Node.js Scripts | PRIVATE | Conditional | Path to Firebase service account JSON file for local scripts | Development Only |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT` | Node.js Scripts | PRIVATE | Conditional | Alternate: inline Firebase admin service account JSON | Development Only |

**Usage**: 
- `scripts/assign-firebase-custom-claims.js` - Set custom claims on test accounts
- `scripts/seed-barber-operations.js` - Seed test data locally
- `scripts/seed-discovery-data.js` - Seed geohash-based barber discovery data

**Note**: Service account file stored in `secrets/service-account.json` (gitignored). Variable name only exported to Expo; file itself is protected.

---

## Environment Configuration Files

### Root (.env.local)
**Location**: `E:\app\urbarber\.env.local`  
**Loaded by**: Expo CLI (mobile)  
**Content**: Mobile EXPO_PUBLIC_* variables + GOOGLE_APPLICATION_CREDENTIALS (local scripts)  
**Gitignored**: Yes  

### Backend (.env.local)
**Location**: `E:\app\urbarber\backend\vercel\.env.local`  
**Loaded by**: Node.js (Vercel functions, local dev)  
**Content**: Vercel private variables (MIDTRANS_SERVER_KEY, FIREBASE_*, ALLOWED_ORIGINS, etc.)  
**Gitignored**: Yes  

### Admin Web (.env.local)
**Location**: `E:\app\urbarber\apps\admin\.env.local`  
**Loaded by**: Next.js build (dev & preview)  
**Content**: Dummy Firebase credentials (development) + API_BASE_URL  
**Gitignored**: Yes  
**Note**: Vercel production deployment uses Vercel secrets, not .env files  

### Example Templates (.env.example)
**Root**: `E:\app\urbarber\.env.example` - Placeholder values for mobile  
**Backend**: `E:\app\urbarber\backend\vercel\.env.example` - Placeholder values for Vercel  
**Tracked**: Yes (safe; no real credentials)  

---

## Production Deployment (Vercel)

**Admin Web Variables** (Set in Vercel Dashboard):
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Real Firebase client API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Production Firebase domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Production Firebase project ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Production Firebase app ID
- `NEXT_PUBLIC_API_BASE_URL` - Production Vercel backend URL

**Backend Variables** (Set in Vercel Dashboard → Environment Variables):
- All variables listed under "Backend (Vercel)" table above
- Secrets marked as "Sensitive" to prevent preview environment exposure

---

## Security Checklist

✅ **No Firebase private keys in mobile code**  
✅ **No Midtrans server key in mobile code**  
✅ **No Supabase service-role key in mobile code**  
✅ **Backend secrets not exposed to Expo**  
✅ **Admin web uses dummy credentials in development**  
✅ **Service account files gitignored**  
✅ **Environment variables validated on startup**  
✅ **No secrets printed in logs or responses**  
✅ **CORS origins config-driven (not hardcoded)**  

---

## Related Documentation

- **Backend Config**: `backend/vercel/src/config/index.ts` - Zod schema validation
- **Supabase Client**: `src/lib/supabase.ts` - Firebase ID token configuration
- **CORS Handler**: `backend/vercel/src/lib/cors.ts` - Allowed origins check
- **CLAUDE.md**: Environment variable section
- **AGENTS.md**: Environment requirements for agents
