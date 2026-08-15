# URBarber Project Context for Claude Agents

Read this first. It points to authoritative documentation.

## Quick Reference

**Technology**: Expo Router v57 (mobile) + Next.js (admin web) + Vercel backend + Firestore + Supabase

**Key Rule**: Actual source code beats stale historical docs. Always verify implementation first.

## Authoritative Documentation

1. **FINAL_THESIS_READINESS_AUDIT.md** (repo root) - Most current, evidence-based status: git state, security/payment audit findings, P0/P1 remediation results, exact test counts. Read this FIRST for "what actually works right now" — it supersedes the docs below wherever they disagree.
2. **AGENTS.md** - Agent directives (roles, canonical enums, payment-first, security invariants)
3. **docs/agent/current-architecture.md** - Technology stack, separation of concerns, real-time features
4. **docs/agent/current-status.md** - Feature status matrix, test suite audit, deployment readiness (verify against FINAL_THESIS_READINESS_AUDIT.md §11 before trusting — several claims here were found stale)
5. **docs/agent/business-rules.md** - Durable invariants, role-based access, legacy compatibility
6. **docs/agent/batches/batch-09.md** - Historical batch phases (A-E). No batch-10/11 doc exists yet even though the current branch is `feat/batch-10-device-map-validation` — do not infer scope/progress from the batch-doc series alone.

## Payment-First Principle (Batch 08)

> A customer does NOT own a scheduled booking slot until `paymentStatus = 'paid'` confirmed authoritatively.

- New booking method: `'midtrans_sandbox'` only
- Barber acceptance requires: `bookingStatus = 'pending' AND paymentStatus = 'paid'`
- Paid rejection/cancellation: marks `refundRequired: true` (manual admin refund)
- No automatic refund simulation or mock payment paths

## Current Branch Status

- **Branch**: `feat/batch-10-device-map-validation`
- **Working Tree**: Verify with `git status`; do not assume clean.
- **Task**: A full read-only audit (`FINAL_THESIS_READINESS_AUDIT.md`) found 5 P0 (critical/high) and several P1 issues; all P0 items and the P1 REQUIRED list have since been remediated with targeted tests and full regression passes recorded in that file's "P0 Remediation Results" / P1 sections. Those fixes were reviewed and **committed as 12 conventional commits on this branch** (see `git log`), after a pre-commit cleanup pass that narrowed the CORS origin allowlist to exact configured origins, removed temporary barber-profile debug logging, and dropped dead code. **Nothing has been pushed or merged.** Two sibling worktrees (`feat/batch-10c-tracking-hardening`, `feat/batch-11b-stable-ui-slicing`) were investigated for reconciliation and found to be stale/superseded, not merge candidates (see the audit's branch reconciliation section for the file-by-file evidence).
- **Before doing new work**: read `FINAL_THESIS_READINESS_AUDIT.md`'s executive verdict and remaining P2/P3 list to avoid duplicating already-completed remediation or re-flagging already-fixed issues.

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
