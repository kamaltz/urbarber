# Production Admin Login CORS Fix Report

**Date:** 2026-08-15  
**Issue:** Admin login fails with CORS error  
**Status:** Root cause identified, fix available in working tree

---

> ## ⚠️ SUPERSEDED IN PART — read this first
>
> The **root-cause analysis below is accurate** and the missing-CORS-headers fix
> shipped as written. The **recommended remedy is not what shipped.**
>
> This report recommends auto-trusting admin preview deployments with the pattern
> `^https://urbarber-admin(-[a-z0-9]+)*(-kamaltzs-projects)?\.vercel\.app$`, and
> states that "no additional env variables [are] needed". That approach was
> **rejected during pre-commit review as insecure**: `vercel.app` is a public,
> first-come namespace, so any outsider can register a project such as
> `urbarber-admin-attacker` and obtain a hostname satisfying the pattern, gaining
> credentialed cross-origin access to the admin API. No regex over that namespace
> can distinguish our deployments from a lookalike.
>
> **What actually shipped** (see `backend/vercel/src/lib/cors.ts`):
> - exact-match origins only, from `ALLOWED_ORIGINS` + `ADMIN_APP_ORIGIN` (both
>   comma-separated, so preview URLs are listed explicitly when needed);
> - loose localhost matching gated behind `ALLOW_LOCALHOST_ORIGINS`, defaulting on
>   only outside production;
> - no `*.vercel.app` pattern of any kind.
>
> Consequently **"Option 2" below is the supported path, not the fallback**, and
> `ADMIN_APP_ORIGIN` **must** be configured in the Vercel environment before this
> ships or admin API calls will return 403. Treat every "regex handles dynamic
> URLs automatically" statement below as historical.

---

## Root Cause (Production)

**Exact Problem:** The deployed backend code on `urbarber-payment-api-kamaltz-kamaltzs-projects.vercel.app` has **incomplete CORS validation logic** that:

1. **Only checks static allowed origins** from environment variables (line 12 of deployed cors.ts)
2. **Doesn't recognize dynamic Vercel deployment URLs** for the admin app
3. **Rejects OPTIONS preflight requests from unrecognized origins WITHOUT sending CORS headers** (line 15-16 of deployed cors.ts)

When the browser makes a preflight OPTIONS request from:
```
https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app
```

The deployed code checks `config.allowedOrigins` which defaults to just `http://localhost:8081,http://localhost:19006` (no dynamic Vercel URLs), then rejects it with 403 and NO `Access-Control-Allow-Origin` header.

---

## Production Preflight Test Result (Before Fix)

```
REQUEST:
OPTIONS /api/admin/me HTTP/1.1
Origin: https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app
Access-Control-Request-Method: GET
Access-Control-Request-Headers: authorization,content-type

RESPONSE:
HTTP/1.1 403 Forbidden
[NO Access-Control-Allow-Origin header]
[NO Access-Control-Allow-Methods header]
[NO Access-Control-Allow-Headers header]

Body:
{"error":{"code":"CORS_FORBIDDEN","message":"Origin tidak diizinkan."}}
```

**Problem:** 403 response without CORS headers = browser sees only "CORS policy blocked" error, hides actual error message.

---

## Git State

| Item | Value |
|---|---|
| Current Branch | `feat/batch-10-device-map-validation` |
| Local Commits Ahead | 24 (not pushed) |
| Working Tree Changes | Yes (many, including CORS fix) |
| Deployed Head | `095aa93` (older code without dynamic URL support) |
| Deployed CORS Version | Basic (static allowlist only) |

---

## The Solution (In Working Tree)

**File:** `backend/vercel/src/lib/cors.ts`

The working tree has a **complete rewrite** that:

1. **Extracts origin validation** into separate `isAllowedOrigin()` function (lines 5-31)
2. **Supports three validation modes:**
   - Explicit `config.allowedOrigins` (env-configured)
   - Local development (localhost)
   - **Dynamic Vercel URLs with regex pattern** (the critical fix)
3. **Always sets CORS headers** even for disallowed origins, so browser gets proper error responses

**Critical Regex Pattern (Line 26):**
```ts
if (/^https:\/\/urbarber-admin(-[a-z0-9]+)*(-kamaltzs-projects)?\.vercel\.app$/i.test(origin)) {
  return true;
}
```

This regex matches:
- `https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app` ✓ (current deployment)
- `https://urbarber-admin-[anything]-kamaltzs-projects.vercel.app` ✓ (any future preview)
- `https://urbarber-admin.vercel.app` ✓ (if stable alias added)

---

## Solution Deployment Path

### **Option 1: Deploy Working Tree Code (Recommended)**

The working tree `backend/vercel/src/lib/cors.ts` already has the complete fix.

**Steps:**
1. Commit the CORS changes from working tree
2. Push to `feat/batch-10-device-map-validation`
3. Deploy to Vercel (using Vercel's GitHub integration)
4. No additional env variables needed (regex handles dynamic URLs)

**Deployment Result:**
- Backend redeploys with new CORS code
- Dynamic admin URL is automatically recognized
- preflight returns 204 with CORS headers

### **Option 2: Environment Variable Fallback (If Deploying Working Tree Later)**

If needed as an interim solution, set environment variable on Vercel backend project:

**Variable Name:** `ADMIN_APP_ORIGIN`  
**Value:** `https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app`

This env var is checked by config.ts line 35-37, added to allowedOrigins.

**Limitation:** Only works for that exact URL. When admin app gets redeployed to a new Vercel URL, this env var breaks again. The working tree regex fix solves this permanently.

---

## Production Preflight Test Result (After Fix)

Expected response after deploying working tree code:

```
REQUEST:
OPTIONS /api/admin/me HTTP/1.1
Origin: https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app
Access-Control-Request-Method: GET
Access-Control-Request-Headers: authorization,content-type

RESPONSE:
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, Accept, Origin
Access-Control-Allow-Credentials: true
Vary: Origin

(empty body)
```

---

## Verification Command (For Production)

After deployment, run from terminal to verify CORS is fixed:

```powershell
curl.exe -i -X OPTIONS `
  "https://urbarber-payment-api-kamaltz-kamaltzs-projects.vercel.app/api/admin/me" `
  -H "Origin: https://urbarber-admin-4z5n8h6r9-kamaltzs-projects.vercel.app" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
```

Expected: HTTP 204 with CORS headers present.

---

## Code Comparison

### Deployed Version (HEAD) - **BROKEN**
```ts
export function handleCors(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[] = ['POST', 'OPTIONS']
): boolean {
  const origin = req.headers.origin;

  if (origin) {
    if (config.allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.status(403).json({ error: { code: 'CORS_FORBIDDEN', ... } });
      return false;  // ← Returns 403 WITHOUT CORS headers
    }
  }
  // ... rest
}
```

**Problems:**
- Only checks `config.allowedOrigins` (defaults to localhost)
- Dynamic Vercel URLs not recognized
- Returns 403 without CORS headers

### Working Tree Version (FIXED) - **Recommended**
```ts
export function isAllowedOrigin(origin: string): boolean {
  // 1. Check explicit config origins
  if (config.allowedOrigins.includes(origin)) return true;
  
  // 2. Check localhost
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) 
    return true;
  
  // 3. Check dynamic Vercel URLs with regex
  if (/^https:\/\/urbarber-admin(-[a-z0-9]+)*(-kamaltzs-projects)?\.vercel\.app$/i.test(origin))
    return true;
  
  return false;
}

export function handleCors(...): boolean {
  const origin = req.headers.origin;
  
  if (origin) {
    res.setHeader('Vary', 'Origin');
  }
  
  const allowed = origin ? isAllowedOrigin(origin) : false;
  
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);  // ← Always set for browser
    if (allowed) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }
  
  res.setHeader('Access-Control-Allow-Headers', '...');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
  
  if (origin && !allowed) {
    res.status(403).json(...);  // ← Now returns 403 WITH CORS headers
    return false;
  }
  // ...
}
```

**Fixes:**
- Regex pattern matches dynamic Vercel URLs
- Always sets CORS headers (browser gets proper error if origin invalid)
- Clean separation of validation logic

---

## Files Affected

| File | Type | Status |
|---|---|---|
| `backend/vercel/src/lib/cors.ts` | Modified | ✅ Fixed in working tree |
| `backend/vercel/src/config/index.ts` | Modified | ✅ No changes needed (already supports ADMIN_APP_ORIGIN env var) |
| `backend/vercel/api/admin.ts` | Modified | ✅ Already calls handleCors correctly |

---

## Environment Variables

### Current Production (Broken)
```
ADMIN_APP_ORIGIN = <not set or wrong value>
ALLOWED_ORIGINS = http://localhost:8081,http://localhost:19006 (default)
```

### After Deployment (Fixed)
```
No new env variables needed!
The regex pattern in the code handles dynamic Vercel URLs automatically.

Optional fallback (if needed in future):
ADMIN_APP_ORIGIN = https://urbarber-admin-xyz.vercel.app
```

---

## Deployment Checklist

- [ ] Commit the working tree CORS changes to `feat/batch-10-device-map-validation`
- [ ] Push to GitHub (GitHub → Vercel auto-deploys)
- [ ] Wait for Vercel deployment to complete
- [ ] Run production preflight test (see command above)
- [ ] Test admin login in browser (should succeed for admin account)

---

## Acceptance Criteria (After Deployment)

### Production Preflight
- ✓ OPTIONS /api/admin/me returns **204** (not 403)
- ✓ **Access-Control-Allow-Origin** header present
- ✓ **Access-Control-Allow-Headers** includes Authorization
- ✓ **Access-Control-Allow-Methods** includes GET

### Admin Login
- ✓ Admin account logs in successfully
- ✓ `/api/admin/me` returns 200 with user data
- ✓ Admin Dashboard opens without CORS errors

### Non-Admin Accounts
- ✓ GET /api/admin/me returns **403** (insufficient permissions)
- ✓ Anonymous requests return **401** (no token)

---

## Summary

| Item | Details |
|---|---|
| **Root Cause** | Deployed code doesn't recognize dynamic Vercel admin URL in CORS validation |
| **Impact** | Admin login completely blocked for production deployments |
| **Fix Location** | `backend/vercel/src/lib/cors.ts` (working tree already has it) |
| **Fix Type** | Regex pattern for dynamic Vercel URLs + always send CORS headers |
| **Deployment** | Push and redeploy backend, no env changes needed |
| **Verification** | curl preflight test, then login attempt |

**Recommendation:** Deploy the working tree code as-is. The regex pattern solves this permanently for all future Vercel preview/production deployments of the admin app.
