# URBarber — Mobile Home Service Barber Application

URBarber is a mobile-first, multi-role home-service barber application built with Expo Router (SDK 57), TypeScript, NativeWind, Firebase Authentication, Cloud Firestore, Supabase Storage, and a standalone Vercel Node.js backend.

---

## Technical Stack & Architecture

- **Mobile Framework**: Expo Router v57.0.0+, React Native, NativeWind (Tailwind CSS v3)
- **Primary Authentication**: Firebase Authentication (with `app_role` custom claims)
- **Core Database**: Cloud Firestore
- **File Storage**: Supabase Storage (`public-media` & `private-documents` buckets via Firebase Auth JWT)
- **Backend Architecture**: Standalone Vercel Node.js backend (`backend/vercel/`)

---

## Documentation & Project Resources

- **Implementation Roadmap**: [docs/development/roadmap.md](docs/development/roadmap.md)
- **Authoritative Feature Scope**: [docs/development/thesis-scope.md](docs/development/thesis-scope.md)
- **Data Model & Schema**: [docs/development/data-model.md](docs/development/data-model.md)
- **Acceptance Checklist (54 Screens)**: [docs/development/acceptance-checklist.md](docs/development/acceptance-checklist.md)
- **Current Status Report**: [docs/development/current-status.md](docs/development/current-status.md)
- **Feature Traceability Matrix**: [docs/development/feature-traceability-matrix.md](docs/development/feature-traceability-matrix.md)
- **Branch Consolidation Audit**: [docs/development/branch-consolidation-audit.md](docs/development/branch-consolidation-audit.md)

### Architecture Decision Records (ADRs)
- [ADR-001: Feature Scope Classification Strategy](docs/architecture/adr-001-feature-scope-classification.md)
- [ADR-002: Real-Time Customer-Barber Text Messaging Architecture](docs/architecture/adr-002-realtime-chat.md)
- [ADR-003: Free-First Interactive Booking Location Picker](docs/architecture/adr-003-free-interactive-map.md)
- [ADR-004: Midtrans Snap Sandbox Payment Integration as Additional Feature](docs/architecture/adr-004-midtrans-sandbox-additional-feature.md)

---

## Developer Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run typecheck and linting
npm run check

# 3. Start Expo dev server
npm start
```
