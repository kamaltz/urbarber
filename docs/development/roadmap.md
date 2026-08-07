# URBarber Thesis Implementation Roadmap & Execution Order

## 1. Executive Overview

This document specifies the authoritative, re-sequenced batch execution roadmap for completing URBarber. The roadmap prioritizes Core Thesis MVP features (including F-31 Real-Time Text Chat) ahead of optional enhancements (E-01 Interactive Map) and ensures third-party demonstration features (A-01 Midtrans Sandbox) do not block core project acceptance.

---

## 2. Re-Sequenced Implementation Roadmap (Batches 00 to 11)

| Batch # | Batch Title | Primary Focus & Deliverables | Scope Tier | Status |
|---|---|---|---|---|
| **Batch 00** | Branch Audit & Consolidation | Dynamic remote branch audit, semantic integration, non-regressive baseline stabilization. | Infrastructure | **COMPLETED** |
| **Batch 01** | Scope, Acceptance Criteria & Roadmap Sync | 3-tier scope classification, 54-screen reconciliation, ADR definitions, traceability matrix. | Documentation | **COMPLETED** |
| **Batch 02** | Infrastructure Deployment & Live Validation | Deployment of Vercel backend (`backend/vercel`), Supabase Storage RLS policies, `firestore.rules`, and Midtrans webhook setup. | Infrastructure / A-01 | **NEXT BATCH** |
| **Batch 03** | Barber Registration & Verification | Implementation of direct barber registration, Firebase Auth account bootstrap via Vercel backend (`POST /api/auth/initialize-account`), barber onboarding wizard (`/(barber-onboarding)/`), private document upload to Supabase Storage, and submission endpoint (`POST /api/barber/registration/submit`). | Core MVP | **COMPLETED** |
| **Batch 04** | Admin Operations | Implementation of Admin Dashboard screens (`src/app/(admin)/dashboard.tsx`), customer/barber management, service category editor (F-24 to F-30). | Core MVP | Planned |
| **Batch 05** | Core Customer-Barber Real-Time Chat | Implementation of real-time text chat (F-31) via Firestore `conversations/{bookingId}` and `messages` listeners (`onSnapshot`), listener cleanup, and security rules. | Core MVP | Planned |
| **Batch 06** | Interactive Map Proof of Concept & Booking Location | Development build setup (`npx expo run:android`), MapLibre React Native + OpenFreeMap map pin picker integration (E-01), coordinate capture, and text fallback validation. | Preferred Enhancement | Planned |
| **Batch 07** | Production-Path Cleanup & Architecture Hardening | Decoupling optional payment mode (`cash_on_service` vs `midtrans_sandbox`), removing any transient code, ensuring strict production path integrity. | Architecture | Planned |
| **Batch 08** | Automated Testing & Security Hardening | Comprehensive unit testing, Firestore security rules suite expansion, API validation testing. | Testing & Security | Planned |
| **Batch 09** | Live End-to-End Acceptance Testing | Staged multi-device execution testing across Customer, Barber, and Admin roles. | Quality Gate | Planned |
| **Batch 10** | Android Development & Release Builds | Android release APK/AAB build generation via EAS / Gradle, release asset validation. | Release Build | Planned |
| **Batch 11** | Final Documentation, Thesis Evidence & Git Finalization | Final thesis evidence compilation, audit log archiving, git tag release. | Documentation & Release | Planned |

---

## 3. Historical Batch Mapping & Cross-Reference

To preserve full historical traceability, the legacy batch documents in `docs/development/batches/` are maintained as historical references. The table below maps legacy batch filenames to the new authoritative execution roadmap order:

| Legacy Document File | Historical Batch Name | New Execution Order | Mapping / Notes |
|---|---|---|---|
| `docs/development/batches/01-auth-hardening.md` | Auth Hardening | Batch 01 (Foundation) | Historical reference; superseded by Batch 00 & 01 consolidation |
| `docs/development/batches/02-supabase-foundation.md` | Supabase Foundation | Batch 01 (Foundation) | Historical reference; storage policies consolidated in Batch 00 |
| `docs/development/batches/03-storage-integration-test.md` | Storage Integration Test | Batch 02 (Infrastructure) | Live storage test execution mapped to Batch 02 |
| `docs/development/batches/04-data-model-security.md` | Data Model & Security | Batch 01 (Data Model) | Reconciled in data-model.md & acceptance-checklist.md |
| `docs/development/batches/05-customer-discovery-profile.md` | Customer Discovery | Core MVP (F-04..F-09) | Implemented in baseline; live validation in Batch 02 |
| `docs/development/batches/06-booking-flow.md` | Booking Flow | Core MVP (F-10..F-12) | Implemented in baseline; live validation in Batch 02 |
| `docs/development/batches/07-barber-operations.md` | Barber Operations | Core MVP (F-14..F-23) | Baseline branch `feat/batch-05-barber-operations` |
| `docs/development/batches/08-admin-operations.md` | Admin Operations | Batch 04 (Admin Ops) | Scheduled as Batch 04 |
| `docs/development/batches/09-testing-hardening.md` | Testing & Hardening | Batch 08 (Testing) | Scheduled as Batch 08 |
| `docs/development/batches/10-android-release.md` | Android Release | Batch 10 (Android) | Scheduled as Batch 10 |

---

## 4. Key Strategic Directives

1. **Chat Prioritization**: Core Real-Time Chat (F-31) is scheduled as Batch 05 and is strictly NOT postponed behind optional Map work (Batch 06).
2. **Map Proof-of-Concept Gate**: E-01 Interactive Map is gated behind a successful Expo development build proof-of-concept in Batch 06. If incompatible, manual text address entry remains 100% active.
3. **Midtrans Sandbox Isolation**: Midtrans deployment and webhook configuration are executed in Batch 02, but third-party Sandbox downtime must NOT block Core MVP completion.
