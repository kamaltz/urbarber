# URBarber Project Context for Claude Agents

Read this first. It points to authoritative documentation.

## Quick Reference

**Technology**: Expo Router v57 (mobile) + Next.js (admin web) + Vercel backend + Firestore + Supabase

**Key Rule**: Actual source code beats stale historical docs. Always verify implementation first.

## Authoritative Documentation

1. **AGENTS.md** - Agent directives (roles, canonical enums, payment-first, security invariants)
2. **docs/agent/current-architecture.md** - Technology stack, separation of concerns, real-time features
3. **docs/agent/current-status.md** - Feature status matrix, test suite audit, deployment readiness
4. **docs/agent/business-rules.md** - Durable invariants, role-based access, legacy compatibility
5. **docs/agent/batches/batch-09.md** - Current batch phases (A-E), success criteria, test scenarios

## Payment-First Principle (Batch 08)

> A customer does NOT own a scheduled booking slot until `paymentStatus = 'paid'` confirmed authoritatively.

- New booking method: `'midtrans_sandbox'` only
- Barber acceptance requires: `bookingStatus = 'pending' AND paymentStatus = 'paid'`
- Paid rejection/cancellation: marks `refundRequired: true` (manual admin refund)
- No automatic refund simulation or mock payment paths

## Current Branch Status

- **Branch**: `feat/batch-09-infrastructure-live-validation`
- **Baseline**: `e5c1600 feat: finalize payment-first booking and slot ownership`
- **Working Tree**: Clean (no uncommitted changes)
- **Task**: Phase A (context reconciliation) complete; Phase B-E pending

## Do NOT

- Commit or push automatically (user approval required)
- Deploy to Firebase, Supabase, Vercel, or Midtrans without explicit user request
- Modify production environment variables
- Add fake payment logic, mock fallbacks, or automatic refunds in production paths
- Create mobile admin workspace (admin is web-only)

## Environment Variables

- Public vars (.env.local): EXPO_PUBLIC_* prefixed only
- Private vars (backend only): MIDTRANS_SERVER_KEY, FIREBASE_* (service account)
- Never commit .env.local or service account files
- .env.example templates exist (use as reference)

## Testing

- **Mock tests** (domain simulation) ≠ **integration tests** (real Firestore/Vercel)
- Rules test: `npm run test:firestore-rules` (requires emulator)
- Backend test: `npm --prefix backend/vercel run test`
- Unit test: `npm run test:unit`
- Quality check: `npm run check` (typecheck + lint)

## Git & Deployment Checklist

Before any deployment:
- [ ] Local checks pass (typecheck, lint)
- [ ] No secrets in code or git history
- [ ] Vercel function count = 5 (verified)
- [ ] Firestore rules & indexes reviewed
- [ ] User approval documented

## Contact & Debugging

- Project: URBarber (Thesis implementation)
- User: kamaltz (kamaltz.dena16@gmail.com)
- If stuck: Check AGENTS.md → current-architecture.md → current-status.md → business-rules.md (in order)
