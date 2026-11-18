# TribalScholar AI: Development Status & Roadmap

## 1. Project Overview & Tracking Summary
- **Problem Statement ID:** SIH26239
- **Project Title:** TribalScholar AI (Intelligent Scholarship & Fellowship Operations Platform)
- **Current Phase:** Phase 7 - Frontend Web Application & Live SIH Jury Demo (ALL PROMPTS 7.1–7.5 COMPLETED)
- **Status:** All Phases (Phase 1 through Phase 7) 100% COMPLETED. Full end-to-end platform operational: Next.js 14 App Router, One-Click SIH Jury Role Switcher, Scholar Intake & Multi-Step Application Wizard, Exception Management Resolution Desk, Proposal-Accurate 2-Column AI Officer Scrutiny Workspace, and System Admin Scheme Rules DSL Studio with Live Dry-Run Simulator. 313/313 backend tests passing, 0 build errors across entire monorepo.

---

## 2. Phase 1 Tracking Table: Foundation & Core Infrastructure

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **1.1** | **Monorepo Setup, Docker Infrastructure & Continuity Files** | **COMPLETED** | `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `docker-compose.yml`, `.env.example`, `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `DEVELOPMENT_STATUS.md`, `HANDOFF.md` |
| **1.2** | **Shared Domain Contracts & Prisma Database Models** | **COMPLETED** | `packages/shared/` (enums, rule DSL, OCR evidence schemas, auth/app DTOs), `apps/api/package.json`, `apps/api/prisma/schema.prisma` (10 relational models) |
| **1.3** | **PostgreSQL Database Schema Migrations & Seed Data** | **COMPLETED** | `apps/api/prisma/migrations/20261117181700_init/`, `apps/api/src/seed-data.ts`, `apps/api/prisma/seed.ts`, `apps/api/src/__tests__/seed.test.ts` |
| **1.4** | **Modular Express Core API Entrypoint & Error Handling** | **COMPLETED** | `apps/api/src/config/env.ts`, `apps/api/src/lib/prisma.ts`, `apps/api/src/lib/logger.ts`, `apps/api/src/middleware/errorHandler.ts`, `apps/api/src/routes/health.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/__tests__/health.test.ts` |

---

## 3. Phase 2 Tracking Table: Auth, Audit Governance & External Adapters

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **2.1** | **JWT Authentication, Password Hashing & RBAC Middleware** | **COMPLETED** | `apps/api/src/middleware/auth.ts`, `apps/api/src/modules/auth/auth.service.ts`, `apps/api/src/modules/auth/auth.routes.ts`, `apps/api/src/__tests__/auth.test.ts` |
| **2.2** | **Immutable Audit Trail Service & Role-Scoped Inspection API** | **COMPLETED** | `apps/api/src/modules/audit/audit.service.ts`, `apps/api/src/modules/audit/audit.routes.ts`, `apps/api/src/__tests__/audit.test.ts` |
| **2.3** | **External Ecosystem Adapter Interfaces & Deterministic Simulation Providers (DigiLocker, DBT, BHASHINI)** | **COMPLETED** | `apps/api/src/adapters/interfaces.ts`, `apps/api/src/adapters/mockDigiLocker.adapter.ts`, `apps/api/src/adapters/mockDbt.adapter.ts`, `apps/api/src/adapters/mockBhashini.adapter.ts`, `apps/api/src/modules/integrations/integrations.routes.ts`, `apps/api/src/__tests__/adapters.test.ts` |
| **2.4** | **API Security Hardening, Rate Limiting & Phase 2 Integration Suite** | **COMPLETED** | `apps/api/src/middleware/rateLimiter.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/phase2-integration.test.ts`, `HANDOFF.md` |

---

## 4. Phase 3 Tracking Table: Scheme Rule Engine, Consistency & Verification

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **3.1** | **Deterministic Scheme Rule Engine & Document Completeness Evaluator** | **COMPLETED** | `apps/api/src/modules/ruleEngine/eligibilityEvaluator.ts`, `apps/api/src/__tests__/eligibilityEvaluator.test.ts` |
| **3.2** | **Cross-Document Consistency Evaluator & Unified Rule Orchestrator** | **COMPLETED** | `apps/api/src/modules/ruleEngine/consistencyEvaluator.ts`, `apps/api/src/modules/ruleEngine/index.ts`, `apps/api/src/__tests__/consistencyEvaluator.test.ts` |
| **3.3** | **Versioned Scheme Management, Publication & Simulation API** | **COMPLETED** | `apps/api/src/modules/schemes/schemes.service.ts`, `apps/api/src/modules/schemes/schemes.routes.ts`, `apps/api/src/__tests__/schemes.routes.test.ts` |
| **3.4** | **Rule Engine Edge Cases, Unified Simulation Verification & Phase 3 Handoff** | **COMPLETED** | `apps/api/src/__tests__/unifiedEvaluatorEdgeCases.test.ts`, `DEVELOPMENT_STATUS.md`, `HANDOFF.md` |

---

## 5. Phase 4 Tracking Table: Intake Portal, Document Ingestion & AI OCR Service

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **4.1** | **Object Storage Service (S3/MinIO & Local Disk Fallback) & File Security Validation** | **COMPLETED** | `apps/api/src/modules/storage/storage.service.ts`, `apps/api/src/__tests__/storage.test.ts`, `apps/api/package.json` (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `multer`), `apps/api/src/config/env.ts` |
| **4.2** | **Applicant Profile Management, Draft Application Creation & Scoped Intake API** | **COMPLETED** | `apps/api/src/modules/applications/applications.service.ts`, `apps/api/src/modules/applications/applications.routes.ts`, `apps/api/src/__tests__/applications.intake.test.ts`, `packages/shared/src/schemas/application.ts` |
| **4.3** | **Multipart Document Upload, Version History & Controlled Viewing API** | **COMPLETED** | `apps/api/src/modules/applications/applications.routes.ts`, `apps/api/src/modules/applications/applications.service.ts`, `apps/api/src/__tests__/applications.documents.test.ts`, `apps/api/prisma/schema.prisma`, `packages/shared/src/enums.ts` |
| **4.4** | **Shared DTO Contracts, Full Regression Testing & Phase 4 Handoff** | **COMPLETED** | `packages/shared/src/schemas/scheme.ts`, `packages/shared/src/schemas/application.ts`, `packages/shared/src/index.ts`, `apps/api/src/__tests__/seed.test.ts`, `DEVELOPMENT_STATUS.md`, `HANDOFF.md` |

---

## 6. Phase 5 Tracking Table: AI OCR Microservice & Document Intelligence

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **5.1** | **AI OCR Microservice Initialization, Pydantic v2 Contracts, Hardware Fallback & API Key Auth** | **COMPLETED** | `services/ai-ocr/requirements.txt`, `services/ai-ocr/app/config.py`, `services/ai-ocr/app/schemas.py`, `services/ai-ocr/app/ocr_engine.py`, `services/ai-ocr/app/middleware.py`, `services/ai-ocr/app/main.py`, `services/ai-ocr/tests/test_health.py` |
| **5.2** | **PaddleOCR Pipeline, Image Preprocessing & MoTA Document Classifier** | **COMPLETED** | `services/ai-ocr/app/ocr_engine.py`, `services/ai-ocr/app/classifier.py`, `services/ai-ocr/app/schemas.py`, `services/ai-ocr/tests/test_classifier.py` |
| **5.3** | **Structured Field Extractor, Positional Anchors & Proposal Evidence Contract** | **COMPLETED** | `services/ai-ocr/app/extractor.py`, `services/ai-ocr/app/schemas.py`, `services/ai-ocr/app/ocr_engine.py`, `services/ai-ocr/tests/test_extractor.py` |
| **5.4** | **Document Intelligence API, Batch Consistency Analysis & Phase 5 AI OCR Handoff** | **COMPLETED** | `services/ai-ocr/app/analyzer.py`, `services/ai-ocr/app/main.py`, `services/ai-ocr/app/schemas.py`, `services/ai-ocr/tests/test_analyze_api.py`, `DEVELOPMENT_STATUS.md`, `HANDOFF.md` |

---

## 7. Phase 6 Tracking Table: Frontend Web Application, Officer Scrutiny & Selection Governance

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **6.1** | **Submission Orchestration Pipeline, FastAPI OCR Integration, Rule Engine Execution & State Transition** | **COMPLETED** | `apps/api/src/modules/ocrClient/ocrClient.service.ts`, `apps/api/src/modules/scrutiny/orchestrator.service.ts`, `apps/api/src/modules/applications/applications.routes.ts`, `apps/api/src/__tests__/orchestrator.test.ts`, `packages/shared/src/enums.ts`, `apps/api/prisma/schema.prisma` |
| **6.2** | **Applicant Correction, Deficiency Resolution & Delta Re-Verification Pipeline** | **COMPLETED** | `apps/api/src/modules/scrutiny/orchestrator.service.ts` (`resolveDeficienciesAndReverify`), `apps/api/src/modules/applications/applications.routes.ts` (`POST /:id/resolve`), `apps/api/prisma/schema.prisma` (`DeficiencyRecord.isResolved`), `apps/api/src/__tests__/deficiency-loop.test.ts` |
| **6.3** | **Scrutiny Officer Decision Desk, Decision Package & Review Governance APIs** | **COMPLETED** | `apps/api/src/modules/scrutiny/scrutiny.service.ts`, `apps/api/src/modules/scrutiny/scrutiny.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/scrutiny.routes.test.ts`, `packages/shared/src/enums.ts`, `apps/api/prisma/schema.prisma` |
| **6.4** | **Selection Committee Decision, Sanction Order, Institutional Verification & DBT Disbursement** | **COMPLETED** | `apps/api/src/modules/selection/selection.service.ts`, `apps/api/src/modules/selection/selection.routes.ts`, `apps/api/src/app.ts`, `apps/api/src/__tests__/selection.routes.test.ts` |

---

## 8. Phase 7 Tracking Table: Frontend Web Application & Live SIH Jury Demo

| Prompt ID | Task Description | Status | Key Deliverables & Files |
| :--- | :--- | :--- | :--- |
| **7.1** | **Next.js 14 App Router Setup, Tailwind CSS, Typed API Client, JWT Auth Context, SIH Demo Role Switcher & Role Layouts** | **COMPLETED** | `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/tailwind.config.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/context/AuthContext.tsx`, `apps/web/src/components/SihDemoRoleSwitcher.tsx`, `apps/web/src/components/RoleGuard.tsx`, `apps/web/src/components/Navbar.tsx`, `apps/web/src/components/Sidebar.tsx`, `apps/web/src/app/login/page.tsx`, `apps/web/src/app/register/page.tsx`, `apps/web/src/app/applicant/`, `apps/web/src/app/scrutiny/`, `apps/web/src/app/selection/`, `apps/web/src/app/admin/` |
| **7.2** | **Scholar Intake Portal, Multi-Step Form, Prescribed Document Slots, Simulated DigiLocker & AI Scrutiny Trigger** | **COMPLETED** | `apps/web/src/app/applicant/dashboard/page.tsx`, `apps/web/src/app/applicant/apply/page.tsx`, `apps/web/src/app/applicant/apply/[schemeCode]/page.tsx`, `apps/web/src/lib/api.ts` (extended with typed applications, schemes, documents, and DigiLocker integration helpers) |
| **7.3** | **Applicant Application Detail, Actionable Deficiency Cards, Replacement Upload & Re-Verification Loop** | **COMPLETED** | `apps/web/src/app/applicant/applications/[id]/page.tsx`, `apps/web/src/app/applicant/applications/page.tsx`, `apps/web/src/app/applicant/deficiencies/page.tsx`, `apps/web/src/lib/api.ts` (`resolveApplicationDeficiencies`) |
| **7.4** | **Officer Queue & Proposal-Accurate 2-Column AI-Assisted Scrutiny Workspace** | **COMPLETED** | `apps/web/src/app/officer/layout.tsx`, `apps/web/src/app/officer/queue/page.tsx`, `apps/web/src/app/officer/applications/[id]/page.tsx`, `apps/web/src/lib/api.ts` (`getScrutinyQueue`, `getDecisionPackage`, `submitOfficerReview`, `decideApplicationSelection`, `updatePostSelection`) |
| **7.5** | **System Admin Console, Versioned Scheme Rules DSL Studio & Dry-Run Simulator** | **COMPLETED** | `apps/web/src/app/admin/schemes/page.tsx`, `apps/web/src/app/admin/page.tsx`, `apps/web/src/lib/api.ts` (`getSchemeVersions`, `createSchemeVersion`, `updateSchemeVersion`, `cloneSchemeVersion`, `publishSchemeVersion`, `simulateSchemeVersion`) |

---

## 9. High-Level Multi-Phase Master Roadmap

### Phase 1: Foundation, Infrastructure & Core Engine (COMPLETED)
- [x] **Prompt 1.1:** Monorepo, base TypeScript, Docker Compose (Postgres 16, MinIO), continuity docs.
- [x] **Prompt 1.2:** Shared contracts, schemas, DTOs (`packages/shared`), and Prisma 10-model schema (`apps/api`).
- [x] **Prompt 1.3:** PostgreSQL initial migration executed, idempotent seed script implemented and verified against PostgreSQL.
- [x] **Prompt 1.4:** Core Express application entrypoint, env validation, Prisma singleton, structured logger, `/api/v1/health` with live DB check, error handler middleware, and integration test suite.

### Phase 2: Backend Security, Governance & Verification Core (COMPLETED)
- [x] **Prompt 2.1:** Password hashing, JWT token issuance/verification, authentication routes (`/register`, `/login`, `/me`), and role-based access control (RBAC) middleware (`APPLICANT`, `SCRUTINY_OFFICER`, `SELECTION_OFFICER`, `ADMIN`/`SYSTEM_ADMIN`).
- [x] **Prompt 2.2:** Build immutable Audit Trail service (standalone and transactional `tx` injection), integrate audit logs into `/register` and `/login`, and expose role-scoped `GET /api/v1/audit/:entityType/:entityId`.
- [x] **Prompt 2.3:** External ecosystem adapter interfaces and deterministic simulation providers for DigiLocker, DBT, and BHASHINI with explicit `isSimulatedMock: true` metadata.
- [x] **Prompt 2.4:** Wire all Phase 2 modules in `app.ts`, configure sliding-window rate limiters, reverse proxy trust, security headers, correlation IDs, and execute end-to-end integration tests.

### Phase 3: Scheme Rule Engine, Consistency & Verification (COMPLETED)
- [x] **Prompt 3.1:** Pure, deterministic Eligibility and Document Completeness Evaluator processing `SchemeVersion` JSON DSL (`EQ`, `NEQ`, `LTE`, `GTE`, `IN`, `BOOLEAN`) against applicant profile data, form data, and uploaded document types without hard-coded scheme branches.
- [x] **Prompt 3.2:** Cross-Document Consistency and Confidence Evaluator supporting `FUZZY_TOKEN_RATIO`, `NORMALIZED_CONTAINS`, `NUMERIC_EXACT`, and `NON_EMPTY_PRESENT` matchers, OCR confidence threshold checks, and unified `evaluateApplicationRules()` orchestrator.
- [x] **Prompt 3.3:** Versioned Scheme Management API (`/api/v1/schemes/active`, `/:code/versions`, `/versions/:versionId/publish`, `/versions/:versionId/clone`, `/versions/:versionId/simulate`) with Rule DSL Zod validation and immutable AuditLog recording.
- [x] **Prompt 3.4:** Comprehensive edge case verification (missing/null fields, null/malformed OCR documents, multi-version rule isolation, parallel determinism), zero database side-effect simulation guarantee, and Phase 3 handoff documentation.

### Phase 4: Intake Portal, Document Ingestion & AI OCR Service (COMPLETED)
- [x] **Prompt 4.1:** Object Storage service (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `multer`), LocalStorageAdapter offline fallback, and file security validation (PDF/JPEG/PNG magic bytes, 5 MB limit).
- [x] **Prompt 4.2:** Applicant profile management (`GET`/`PUT /api/v1/applicant/profile`), draft application creation (`POST /api/v1/applications`) with auto-generated numbers (`TS-NFST-2026-0001`), state-guarded form data updates (`PATCH /api/v1/applications/:id/form`), and ownership-scoped retrieval with status timeline.
- [x] **Prompt 4.3:** Multipart Document Ingestion Controller, Object Storage persistence, replacement versioning (`version`, `isCurrent`), and controlled document viewing/streaming.
- [x] **Prompt 4.4:** Shared DTO Contracts (`Application`, `ApplicationDocument`, `SchemeVersion`, `Scheme`), regression test suite (218 tests passing across 13 suites), contract alignment, and Phase 4 handoff to Phase 5.

### Phase 5: AI OCR Microservice & Document Intelligence (COMPLETED)
- [x] **Prompt 5.1:** AI OCR Service initialization, Pydantic v2 schemas matching @tribalscholar/shared contracts, PaddleOCR engine wrapper with CPU/deterministic extraction fallback, internal API key middleware, and test suite.
- [x] **Prompt 5.2:** PDF-to-image conversion (PyMuPDF), OpenCV image pre-processing (CLAHE contrast normalization, grayscale), PaddleOCR line-level execution engine (bounding boxes, confidences), and Document Classifier for prescribed MoTA certificates.
- [x] **Prompt 5.3:** Structured field extractor parsing OCR lines into typed fields with exact evidence metadata matching proposal UI mockup (`value`, `status`, `confidence`, `evidence`: `{ page, fieldLabel, bbox, rawSnippet }`).
- [x] **Prompt 5.4:** Document Intelligence API exposing `POST /internal/v1/ocr/analyze` and `POST /internal/v1/ocr/analyze-batch`, multi-document cross-certificate consistency checks, clean 4/4 set verification, deficiency detection, and Phase 5 handoff.

### Phase 6: Officer Scrutiny & Selection Governance (COMPLETED)
- [x] **Prompt 6.1:** Submission Orchestration Pipeline (`POST /api/v1/applications/:id/submit`), FastAPI OCR Client with timeout/retry resilience, versioned scheme rule engine execution, deficiency generation, and atomic state transition to `UNDER_SCRUTINY` or `DEFICIENCY_RAISED`.
- [x] **Prompt 6.2:** Applicant Correction, Deficiency Resolution & Delta Re-Verification Pipeline (`POST /api/v1/applications/:id/resolve`), updating `DeficiencyRecord.isResolved = true`, running delta OCR on replacement document versions, re-evaluating pinned scheme rules, and transitioning compliant applications to `UNDER_SCRUTINY`.
- [x] **Prompt 6.3:** Scrutiny Officer Decision Desk, Decision Package & Review Governance APIs (`GET /api/v1/scrutiny/queue`, `GET /api/v1/scrutiny/applications/:id`, `POST /api/v1/scrutiny/applications/:id/review`), 2-column officer verification payload, and mandatory justification enforcement on human overrides.
- [x] **Prompt 6.4:** Selection Committee Decision, Sanction Order, Institutional Verification & DBT Disbursement (`POST /api/v1/selection/applications/:id/decide`, `PATCH /api/v1/selection/applications/:id/post-selection`, `GET /api/v1/selection/applications/:id`, `GET /api/v1/selection/queue`), `PostSelectionRecord` generation, joining report verification, and simulated DBT/PFMS disbursement orchestration via `mockDbtAdapter`.

### Phase 7: Frontend Web Application & Live SIH Jury Demo (COMPLETED)
- [x] **Prompt 7.1:** Next.js 14 App Router, Tailwind CSS, Typed API client, JWT Auth context with one-click SIH Demo Role Switcher, RoleGuard, responsive navigation, and role-specific workspace layouts (`/applicant`, `/scrutiny`, `/selection`, `/admin`).
- [x] **Prompt 7.2:** Scholar Intake Portal & Application Lifecycle (Profile management, multi-step application form, document upload zone with format validation, simulated DigiLocker integration, replacement versioning, and real-time status timeline).
- [x] **Prompt 7.3:** Applicant Application Detail & Exception Management (Actionable deficiency cards, inline field corrections, document replacement uploader, resolution note, delta re-verification trigger wired to `POST /api/v1/applications/:id/resolve`, and audit history timeline).
- [x] **Prompt 7.4:** Scrutiny Officer Verification Workspace (Proposal-accurate two-column UI: `01 · Submitted Document` certificate visualizer & switcher, `02 · AI-Assisted Scrutiny` with extracted fields, evidence anchors, rule checklist, override justification modal, Selection Officer award controls, and append-only audit drawer).
- [x] **Prompt 7.5:** System Admin Console, Versioned Scheme Rules DSL Studio & Dry-Run Simulator (Scheme version history selector, structured threshold editor, JSON Rule DSL specification editor, live dry-run simulator bench with preset profiles, and version publishing workflow with immutable audit logging).

---

## 10. Prompt Completion Reports

### Prompt 1.1 Completion Report (2026-11-17)
- Initialized pnpm monorepo workspace, root `package.json`, `tsconfig.base.json`.
- Configured PostgreSQL 16 and MinIO S3 in `docker-compose.yml` with bucket initialization.
- Created `.env.example`, `.gitignore`, and continuity documentation files.

### Prompt 1.2 Completion Report (2026-11-17)
- Created `@tribalscholar/shared` package with enums, Rule DSL schemas, OCR evidence schemas, and DTOs.
- Implemented full PostgreSQL schema in `apps/api/prisma/schema.prisma` across 10 relational models.
- Validated Prisma schema and generated Prisma Client.

### Prompt 1.3 Completion Report (2026-11-17)
- Applied initial PostgreSQL DDL migration (`20261117181700_init`).
- Created `seed-data.ts` and `prisma/seed.ts` upserting 4 RBAC demo users (`applicant@demo.in`, `scrutiny@mota.gov.in`, `selection@mota.gov.in`, `admin@mota.gov.in`) and published 2026-2027 v1 schemes (`NFST` and `NOS`).
- Verified seed data structures against Zod schemas in `seed.test.ts`.

### Prompt 1.4 Completion Report (2026-11-17)
- **Delivered Packages & Files:**
  - `apps/api/src/config/env.ts`: Zod-validated environment configuration loader.
  - `apps/api/src/lib/prisma.ts`: Singleton PrismaClient instance with development hot-reload protection.
  - `apps/api/src/lib/logger.ts`: Structured JSON/text logger with configurable log levels.
  - `apps/api/src/middleware/errorHandler.ts`: Standardized error response formatter supporting `AppError`, `ZodError`, and Prisma `P2002`/`P2025` codes.
  - `apps/api/src/routes/health.ts`: `/api/v1/health` endpoint monitoring process uptime, system memory, and executing live `SELECT 1` database ping.
  - `apps/api/src/app.ts`: Express application factory configured with `helmet`, `cors`, and JSON body parsers.
  - `apps/api/src/server.ts`: Production HTTP listener with graceful `SIGINT`/`SIGTERM` shutdown hooks.
  - `apps/api/src/__tests__/health.test.ts`: Vitest + Supertest suite validating root route, health endpoint, 404 handler, and error handler status codes.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 13/13 tests passed across 2 suites (`seed.test.ts`, `health.test.ts`).
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (TypeScript compilation clean).
  - `pnpm build`: Exited 0 (Full monorepo build clean).

### Prompt 2.1 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - Installed `jsonwebtoken` and `@types/jsonwebtoken` in `apps/api`.
  - `apps/api/src/middleware/auth.ts`: Implemented `authenticateJWT` bearer extractor/validator and `requireRoles` RBAC middleware enforcing `APPLICANT`, `SCRUTINY_OFFICER`, `SELECTION_OFFICER`, and `ADMIN` / `SYSTEM_ADMIN`.
  - `apps/api/src/modules/auth/auth.service.ts`: Implemented password hashing (bcrypt), token issuance, token verification, applicant registration, multi-role credential login, and user profile retrieval.
  - `apps/api/src/modules/auth/auth.routes.ts`: Mounted `/register`, `/login`, `/me`, and protected test routes `/officer-only` and `/admin-only`.
  - `apps/api/src/app.ts`: Mounted `/api/v1/auth` sub-router.
  - `apps/api/src/__tests__/auth.test.ts`: 18 integration tests covering registration, conflict 409 handling, payload validation 400s, multi-role login, invalid passwords, 401 unauthenticated requests, expired JWT handling, and 403 RBAC rejection.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 31/31 tests passed across 3 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`).
  - `pnpm build`: Exited 0 (strict TypeScript compilation passed across all workspaces).

### Prompt 2.2 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/modules/audit/audit.service.ts`: Implemented `AuditService` supporting standalone logging and Prisma interactive transaction (`tx`) injection for atomic state commits, JSON details metadata formatting, and chronological audit trail querying.
  - `apps/api/src/modules/auth/auth.service.ts` & `auth.routes.ts`: Integrated atomic audit logging on `/register` (under `USER_REGISTER` action with `tx`) and `/login` (under `USER_LOGIN` action with client IP and User-Agent capture).
  - `apps/api/src/modules/audit/audit.routes.ts`: Implemented `GET /api/v1/audit/:entityType/:entityId` with strict RBAC scoping:
    - Officers (`SCRUTINY_OFFICER`, `SELECTION_OFFICER`) and Admins (`ADMIN` / `SYSTEM_ADMIN`) have global inspection privileges.
    - Applicants (`APPLICANT`) are restricted strictly to Application entity types and only for their own application ID (rejecting cross-scholar or non-application access with 403 Forbidden).
  - `apps/api/src/app.ts`: Mounted `/api/v1/audit` route handler.
  - `apps/api/src/__tests__/audit.test.ts`: 15 integration tests covering standalone logging, transaction atomicity and rollback guarantee, auth register/login audit creation, applicant self-application access, applicant cross-application 403 rejection, officer global access, and chronological ascending/descending ordering.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 46/46 tests passed across 4 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`).
  - `pnpm build`: Exited 0 (TypeScript compilation clean).

### Prompt 2.3 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/adapters/interfaces.ts`: Defined `IDigiLockerAdapter`, `IDbtAdapter`, and `ITranslationAdapter` interfaces with strict `isSimulatedMock: true` metadata contracts.
  - `apps/api/src/adapters/mockDigiLocker.adapter.ts`: Implemented `MockDigiLockerAdapter` providing deterministic certificate verification, digital signature status, and document metadata extraction.
  - `apps/api/src/adapters/mockDbt.adapter.ts`: Implemented `MockDbtAdapter` providing simulated PFMS / DBT installment disbursement status, payment failure emulation, and payment trigger tracking.
  - `apps/api/src/adapters/mockBhashini.adapter.ts`: Implemented `MockBhashiniAdapter` providing deterministic Indic translation across ST regional languages (Santali, Gondi, Ho, Mundari, Bodo, Odia, Hindi).
  - `apps/api/src/modules/integrations/integrations.routes.ts`: Mounted `/api/v1/integrations` exposing `/digilocker/verify`, `/digilocker/metadata/:documentUri`, `/dbt/status/:applicationId`, `/dbt/simulate-disbursement`, `/bhashini/translate`, and `/bhashini/languages`.
  - `apps/api/src/__tests__/adapters.test.ts`: 17 integration and unit tests validating mock behavior, failure handling, validation error 400s, and verifying that every response includes `isSimulatedMock === true`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 63/63 tests passed across 5 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`, `adapters.test.ts`).
  - `pnpm build`: Exited 0 (strict TypeScript compilation passed).

### Prompt 2.4 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/middleware/rateLimiter.ts`: Implemented sliding-window rate limiters (`apiRateLimiter` 500 req/15m, `authRateLimiter` 50 req/15m) emitting standard `X-RateLimit-*` headers with `TooManyRequestsError` (HTTP 429).
  - `apps/api/src/app.ts`: Hardened security headers with Helmet, reverse proxy trust (`trust proxy`), request correlation tracking (`X-Request-ID`), and isolated route mounting for all Phase 2 endpoints (`/api/v1/auth`, `/api/v1/audit`, `/api/v1/integrations`).
  - `apps/api/src/__tests__/phase2-integration.test.ts`: 6 end-to-end integration tests verifying login -> JWT issuance -> correlation ID & security headers -> RBAC guarded route access -> DigiLocker / DBT / BHASHINI mock adapter executions -> atomic Prisma transaction with audit logging -> role-scoped audit trail retrieval.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 69/69 tests passed across 6 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`, `adapters.test.ts`, `phase2-integration.test.ts`).
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (clean compilation).
  - `pnpm build`: Exited 0 (workspace clean).

### Prompt 3.1 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/modules/ruleEngine/eligibilityEvaluator.ts`: Pure, deterministic evaluation engine supporting full JSON DSL (`EQ`, `NEQ`, `LTE`, `GTE`, `LT`, `GT`, `IN`, `NOT_IN`, `BOOLEAN`, `CONTAINS`, `REGEX_MATCH`, `EXISTS`), nested dot-path resolution, automatic age calculation from DOB, disjunctive OR / conjunctive AND logical groups, document completeness checking, and structured deficiency aggregation without hard-coded scheme branching.
  - `apps/api/src/__tests__/eligibilityEvaluator.test.ts`: Comprehensive test suite (25 tests) covering NFST and NOS Version 1 rules across passing and failing applicant profiles (non-ST category, income > Rs 6,00,000, missing ST caste certificate, age > 35, foreign QS rank > 500, missing admission letters, optional docs, operator matrices, and arbitrary custom schemes).
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 94/94 tests passed across 7 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`, `adapters.test.ts`, `phase2-integration.test.ts`, `eligibilityEvaluator.test.ts`).
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (strict TypeScript compilation passed).
  - `pnpm build`: Exited 0 (clean monorepo build).

### Prompt 3.2 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/modules/ruleEngine/consistencyEvaluator.ts`: Cross-document consistency and OCR confidence evaluator supporting `FUZZY_TOKEN_RATIO`, `NORMALIZED_CONTAINS`, `NUMERIC_EXACT`, and `NON_EMPTY_PRESENT` matchers, producing field statuses (`Extracted`, `Consistent`, `Present`, `Mismatch`, `Low Confidence`) and structured deficiency records.
  - `apps/api/src/modules/ruleEngine/index.ts`: Unified rule engine entrypoint exposing `evaluateApplicationRules()` which orchestrates eligibility, document completeness, and cross-document consistency into a single cohesive decision and deficiency package.
  - `apps/api/src/__tests__/consistencyEvaluator.test.ts`: Test suite (14 tests) validating exact matches for Sample Applicant, Scheduled Tribe (ST), Rs 80,000 / year, and Competent Revenue Authority, name/income/category/authority mismatches, low-confidence OCR routing to officer scrutiny (`RuleSeverity.MANUAL_REVIEW`), and end-to-end `evaluateApplicationRules` workflows.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 108/108 tests passed across 8 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`, `adapters.test.ts`, `phase2-integration.test.ts`, `eligibilityEvaluator.test.ts`, `consistencyEvaluator.test.ts`).
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (clean compilation).
  - `pnpm build`: Exited 0 (clean monorepo build).

### Prompt 3.3 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/modules/schemes/schemes.service.ts`: Implemented `SchemesService` providing active scheme discovery with latest published version resolution, scheme version retrieval by code, strict Zod-validated rule version creation (`RuleConfigSchema`), atomic draft cloning (`cloneSchemeVersion`), draft editing (`updateSchemeVersion`), version publication with audit trail recording (`publishSchemeVersion`), and live dry-run simulation against sample payloads (`simulateSchemeVersion`).
  - `apps/api/src/modules/schemes/schemes.routes.ts`: Mounted REST endpoints:
    - `GET /api/v1/schemes/active`: Public/applicant discovery of active scholarship schemes with their published rule configurations.
    - `GET /api/v1/schemes/:code/versions`: Officer/admin version history view.
    - `POST /api/v1/schemes/:code/versions`: `SYSTEM_ADMIN` creation of new version drafts with validation against Rule DSL Zod schemas.
    - `POST /api/v1/schemes/versions/:versionId/clone`: `SYSTEM_ADMIN` cloning of an existing version into a new draft.
    - `PUT /api/v1/schemes/versions/:versionId`: `SYSTEM_ADMIN` modification of unpublished draft versions.
    - `PATCH /api/v1/schemes/versions/:versionId/publish`: `SYSTEM_ADMIN` version publication logging to `AuditLog` and unpublishing prior active versions.
    - `POST /api/v1/schemes/versions/:versionId/simulate`: `SYSTEM_ADMIN` dry-run simulation of application payloads against the rule engine.
  - `apps/api/src/app.ts`: Mounted `/api/v1/schemes` route handler.
  - `apps/api/src/__tests__/schemes.routes.test.ts`: 20 comprehensive integration tests validating public scheme discovery, version listing, draft creation, duplicate version rejection (409), draft updating, publishing with audit logging, draft cloning, dry-run simulations (passing vs failing), historical submission immutability, and RBAC rejection (401/403).
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 128/128 tests passed across 9 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`, `adapters.test.ts`, `phase2-integration.test.ts`, `eligibilityEvaluator.test.ts`, `consistencyEvaluator.test.ts`, `schemes.routes.test.ts`).
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (strict TypeScript compilation passed).
  - `pnpm build`: Exited 0 (clean monorepo build across all packages).

### Prompt 3.4 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/modules/ruleEngine/index.ts`: Hardened `UnifiedApplicationEvaluationInput` to accept `null` for `extractedDocuments`, ensuring defensive, null-safe input handling.
  - `apps/api/src/__tests__/unifiedEvaluatorEdgeCases.test.ts`: Added 15 comprehensive unit & integration tests validating:
    - Missing & null profile/form handling (null profile, null form, non-object primitives at intermediate paths in dot traversal, malformed non-numeric values).
    - Null, empty, and malformed OCR documents (null/undefined inputs, empty extractions, zero confidence routing to `RuleSeverity.MANUAL_REVIEW`, irrelevant doc type filtering).
    - Multi-version rule isolation (evaluating NFST v1 ceiling 6,00,000 vs v2 ceiling 8,50,000; NOS v1 age 35/QS 500 vs v2 age 38/QS 800) with 50 concurrent interleaved executions confirming strict determinism.
    - NOS Version 1 complete lifecycle simulation across passing international scholars and deficient profiles.
    - Zero database side-effect simulation guarantee (zero rows created in `Application`, `ApplicationDocument`, or `DeficiencyRecord` during dry-runs).
    - Immutable `AuditLog` generation on version publication (`SCHEME_RULE_MODIFIED`).
  - `HANDOFF.md`: Comprehensive handoff documentation detailing Phase 3 completion and transition to Phase 4.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 143/143 tests passed across 10 suites (`seed.test.ts`, `health.test.ts`, `auth.test.ts`, `audit.test.ts`, `adapters.test.ts`, `phase2-integration.test.ts`, `eligibilityEvaluator.test.ts`, `consistencyEvaluator.test.ts`, `schemes.routes.test.ts`, `unifiedEvaluatorEdgeCases.test.ts`).
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (zero TypeScript errors).
  - `pnpm build`: Exited 0 (workspace clean).

### Prompt 4.1 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - Installed `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, and `multer` (with `@types/multer`) in `apps/api`.
  - `apps/api/src/config/env.ts`: Added `STORAGE_DRIVER` and `STORAGE_LOCAL_DIR` configurations.
  - `apps/api/src/modules/storage/storage.service.ts`: Implemented comprehensive object storage architecture:
    - Pure binary magic byte verification (`detectMagicBytes`, `validateDocumentBuffer`) enforcing strictly authentic PDF (`%PDF`), PNG (`\x89PNG\r\n\x1a\n`), and JPEG (`0xFF 0xD8 0xFF`) formats.
    - 5 MB maximum file size guard (`MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024`), empty buffer rejection, and declared MIME type spoofing detection.
    - `S3StorageAdapter`: Full AWS S3 & MinIO client implementing `upload()`, `getStream()`, `getPresignedUrl()`, `delete()`, and `exists()` with `forcePathStyle: true`.
    - `LocalStorageAdapter`: Fast local disk storage adapter with directory auto-creation, path traversal sanitization, and streaming for offline unit tests.
    - `StorageService`: Unified facade providing `uploadDocumentBuffer()`, `getDocumentStream()`, `getPresignedViewUrl()`, `deleteDocument()`, `documentExists()`, and automatic graceful fallback to `LocalStorageAdapter` when S3/MinIO connection is refused.
    - `documentUpload`: Memory-storage Multer ingestion middleware with 5 MB file size limit and MIME type filter.
  - `apps/api/src/__tests__/storage.test.ts`: 27 comprehensive tests covering magic byte detection, file validation (PDF, PNG, JPEG), empty buffer rejection, oversized 5 MB rejection, boundary checks, spoofed PDF scripts rejection, MIME type mismatch rejection, LocalStorageAdapter upload/stream/presign/delete, StorageService partitioned key generation, S3StorageAdapter mocking, and automatic offline fallback upon `ECONNREFUSED`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 170/170 tests passed across 11 suites.
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (zero TypeScript errors).
  - `pnpm build`: Exited 0 (monorepo build clean).

### Prompt 4.2 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `packages/shared/src/schemas/application.ts`: Enhanced `applicantProfileSchema` supporting ISO datetime strings, YYYY-MM-DD date formats, and Date objects; updated `createApplicationSchema` making `schemeVersionId` optional (for auto-resolving active published versions) and `formData` optional; added `updateApplicationFormSchema`.
  - `apps/api/src/modules/applications/applications.service.ts`: Implemented `ApplicationsService`:
    - `getApplicantProfile(userId)`: Fetches profile with 404 validation.
    - `upsertApplicantProfile(userId, input, context)`: Idempotently creates or updates `ApplicantProfile` with decimal conversion, string dates, and atomic `AuditLog` recording.
    - `generateApplicationNumber(schemeCode, academicYear)`: Generates sequential structured application numbers (e.g. `TS-NFST-2026-0001`, `TS-NOS-2026-0001`).
    - `createDraftApplication(userId, input, context)`: Creates `DRAFT` application pinned to active published `SchemeVersion` (or specified version) and records atomic `AuditLog` entry (`APPLICATION_CREATED`).
    - `updateApplicationFormData(applicationId, userId, userRole, formData, context)`: Updates `formData` with state guards allowing modification only in `DRAFT` or `DEFICIENT` status; records atomic `AuditLog` entry (`APPLICATION_UPDATED`).
    - `getApplications(userId, userRole, filters)`: Scopes application listings strictly to applicant ownership while allowing officers and administrators global access.
    - `getApplicationById(applicationId, userId, userRole)`: Fetches application details with strict ownership verification, related scheme, version, documents, deficiencies, and full status timeline from `AuditLog`.
  - `apps/api/src/modules/applications/applications.routes.ts`: Mounted REST endpoints:
    - `GET /api/v1/applicant/profile`: Authenticated applicant profile view.
    - `PUT /api/v1/applicant/profile`: Authenticated applicant profile upsert with Zod validation.
    - `POST /api/v1/applications`: Authenticated applicant draft creation.
    - `GET /api/v1/applications`: Scoped application listing.
    - `GET /api/v1/applications/:id`: Scoped application details with status timeline.
    - `PATCH /api/v1/applications/:id/form`: State-guarded form data updates.
  - `apps/api/src/app.ts`: Mounted `applicantRouter` (`/api/v1/applicant`) and `applicationsRouter` (`/api/v1/applications`).
  - `apps/api/src/__tests__/applications.intake.test.ts`: 22 comprehensive integration tests covering profile retrieval (200 / 404), profile creation/update (upsert), validation errors, RBAC guards, draft creation for NFST and NOS with audit logging, form data updates in DRAFT and DEFICIENT status, rejection of form data updates in SUBMITTED status, and strict cross-applicant ownership protection (403 Forbidden).
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 192/192 tests passed across 12 suites.
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (zero TypeScript errors).
  - `pnpm build`: Exited 0 (monorepo clean).


### Prompt 4.3 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `packages/shared/src/enums.ts`: Added `ST_CASTE_CERTIFICATE` and `ACADEMIC_MARKSHEET` to `DocumentType` enum to support comprehensive scholarship document requirements.
  - `apps/api/prisma/schema.prisma`:
    - Updated `DocumentType` enum with `ST_CASTE_CERTIFICATE` and `ACADEMIC_MARKSHEET`.
    - Enhanced `ApplicationDocument` model with `version Int @default(1)` and `isCurrent Boolean @default(true)`.
    - Added composite index `@@index([applicationId, isCurrent])` for optimized active document querying.
    - Synchronized database schema with `prisma db push` and regenerated `@prisma/client`.
  - `apps/api/src/modules/ruleEngine/eligibilityEvaluator.ts`: Added human-readable labels for newly added document types in `DOCUMENT_TYPE_LABELS`.
  - `apps/api/src/middleware/errorHandler.ts`: Added explicit `multer.MulterError` interceptor translating `LIMIT_FILE_SIZE` into structured HTTP 400 `FILE_UPLOAD_ERROR`.
  - `apps/api/src/modules/applications/applications.service.ts`:
    - Implemented `uploadApplicationDocument(applicationId, userId, file, documentType, context)`:
      - Validates application existence and ownership.
      - Enforces application status guards (only allows uploads in `DRAFT` or `DEFICIENT` status; rejects `SUBMITTED` applications with 400).
      - Stores binary file into Object Storage via `StorageService` (`S3StorageAdapter` or `LocalStorageAdapter`).
      - Queries existing documents for the given `documentType` on the application, automatically increments `version` (`nextVersion = latestVersion + 1`), and marks all prior versions as `isCurrent = false`.
      - Atomically records structured `AuditLog` entry (`DOCUMENT_UPLOADED`) with metadata.
    - Implemented `getApplicationDocumentForView(applicationId, docId, userId, userRole)`:
      - Validates document existence on the application.
      - Enforces strict RBAC: allows application owner (`APPLICANT`) or authorized review officers (`SCRUTINY_OFFICER`, `SELECTION_OFFICER`, `ADMIN`, `SYSTEM_ADMIN`); rejects other applicants with 403 Forbidden.
      - Returns presigned view URL or stream getter closure.
  - `apps/api/src/modules/applications/applications.routes.ts`:
    - Mounted `POST /api/v1/applications/:id/documents` accepting `multipart/form-data` with `docType` and `file` attachment (5 MB limit, PDF/JPEG/PNG).
    - Mounted `GET /api/v1/applications/:id/documents/:docId/view` returning presigned URL or raw binary streaming with correct `Content-Type` when `?stream=true`.
  - `apps/api/src/__tests__/applications.documents.test.ts`: 23 comprehensive integration tests covering:
    - Initial upload of all 4 required scholarship certificates (`ST_CASTE_CERTIFICATE`, `INCOME_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`) with `version: 1`, `isCurrent: true`.
    - Replacement document versioning: uploading updated certificate increments `version` to 2 and 3, setting prior versions to `isCurrent: false` while keeping the new version `isCurrent: true`.
    - Document viewing via presigned URL and raw binary stream with correct MIME headers.
    - Security boundaries: cross-applicant upload blocking (403), cross-applicant view blocking (403), officer inspection privileges, 401 unauthenticated upload/view, 404 for non-existent document or application, 400 for unsupported docType, 400 for missing file attachment, 400 for corrupted/spoofed magic bytes, 400 for oversized files (> 5 MB), and 400 rejection when application is in `SUBMITTED` status.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test`: 215/215 tests passed across 13 suites.
  - `pnpm --filter @tribalscholar/api build`: Exited 0 (zero TypeScript errors).
  - `pnpm build`: Exited 0 (monorepo clean).


### Prompt 4.4 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `packages/shared/src/schemas/scheme.ts`: Created shared domain DTOs and Zod validation schemas for `Scheme` (`schemeSchema`, `SchemeDTO`, `Scheme`) and `SchemeVersion` (`schemeVersionSchema`, `SchemeVersionDTO`, `SchemeVersion`).
  - `packages/shared/src/schemas/application.ts`: Exported shared domain DTOs and Zod validation schemas for `ApplicationDocument` (`applicationDocumentSchema`, `ApplicationDocumentDTO`, `ApplicationDocument`) and `Application` (`applicationSchema`, `ApplicationDTO`, `Application`) with optional relational typing.
  - `packages/shared/src/index.ts`: Re-exported all scheme and application DTO contracts.
  - `apps/api/src/__tests__/seed.test.ts`: Added contract verification tests for `applicationDocumentSchema`, `applicationSchema`, `schemeSchema`, and `schemeVersionSchema`.
  - `apps/api/vitest.config.ts`: Configured `fileParallelism: false` for strict database isolation across Vitest test runners against PostgreSQL.
  - Full regression execution: All 13 test suites passed (218 total tests).
- **Verification Results:**
  - `pnpm -r build`: Exited 0 (clean compilation across all workspace packages).
  - `pnpm --filter @tribalscholar/api test`: 218/218 tests passed across 13 suites.


### Prompt 5.1 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `services/ai-ocr/requirements.txt`: Python package specification (`fastapi`, `uvicorn`, `pydantic`, `pydantic-settings`, `python-multipart`, `pillow`, `numpy`, `opencv-python-headless`, `pymupdf`, `paddleocr`, `paddlepaddle`, `pytest`, `httpx`, `python-dotenv`).
  - `services/ai-ocr/pyproject.toml` & `services/ai-ocr/pytest.ini`: Python environment, project metadata, and pytest configuration with strict import resolution (`pythonpath = . app`).
  - `services/ai-ocr/app/config.py`: Pydantic v2 `BaseSettings` reading environment variables with defaults for host, port, internal API key, PaddleOCR language, and hardware acceleration options.
  - `services/ai-ocr/app/schemas.py`: Pydantic v2 domain schemas mirroring `@tribalscholar/shared` contracts:
    - Enums: `DocumentType`, `CrossDocCheckStatus`.
    - Spatial & Field Models: `OcrBoundingBox`, `OcrFieldExtraction`, `DocValue`, `CrossDocCheckItem`.
    - Payload & Diagnostics: `OcrEvidencePayload`, `CrossDocEvidenceReport`, `HealthResponse`.
    - API DTOs: `OcrExtractionRequest`, `OcrExtractionResponse`, `CrossDocValidationRequest`, `CrossDocValidationResponse`.
  - `services/ai-ocr/app/ocr_engine.py`: `OcrEngineWrapper` providing:
    - CPU/GPU auto-detection and graceful PaddleOCR initialization.
    - PDF multi-page rendering via PyMuPDF (`pymupdf`) and image decoding via Pillow.
    - Deterministic synthetic extraction fallback for offline and CPU environments (ST Caste Certificate, Income Certificate, Marksheet, Aadhaar Card).
    - Diagnostic status reporting (`is_healthy`, `get_engine_info`).
  - `services/ai-ocr/app/middleware.py`: `InternalApiKeyMiddleware` enforcing `X-Internal-Api-Key` on private routes with 401 for missing headers and 403 for invalid keys, while exempting OpenAPI docs (`/docs`, `/redoc`, `/openapi.json`) and liveness probes (`/healthz`, `/ping`).
  - `services/ai-ocr/app/main.py`: FastAPI microservice entrypoint with CORS, structured logging, lifespan hooks, `/healthz` container probe, and authenticated `/health` / `/api/v1/health` diagnostic routes.
  - `services/ai-ocr/tests/test_health.py`: 9 comprehensive test cases verifying:
    - Public container liveness probe (`GET /healthz`) returns 200 without API key.
    - Missing `X-Internal-Api-Key` returns 401 Unauthorized.
    - Invalid `X-Internal-Api-Key` returns 403 Forbidden.
    - Valid `X-Internal-Api-Key` returns 200 with structured `HealthResponse`.
    - Namespaced `/api/v1/health` authentication.
    - Root index route security.
    - OCR engine wrapper diagnostics.
    - Deterministic ST Caste Certificate and Income Certificate extractions.
  - `services/ai-ocr/package.json`: pnpm workspace integration enabling `pnpm --filter @tribalscholar/ai-ocr test`.
  - `.env.example`: Added `INTERNAL_API_KEY` configuration.
- **Verification Results:**
  - `pytest services/ai-ocr/tests/test_health.py`: 9/9 passed in 1.75s.
  - `pnpm --filter @tribalscholar/ai-ocr test`: 9/9 passed in 1.89s.


### Prompt 5.2 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `services/ai-ocr/app/schemas.py`: Enhanced `DocumentType` with `OVERSEAS_ADMISSION_LETTER` and `RESEARCH_PROPOSAL`; introduced `OcrLine` (text, confidence, pageNumber, boundingBox, polygon) and `ClassificationResult` (predictedType, confidence, isMatch, evidenceTokens, scores, rejectionReason).
  - `services/ai-ocr/app/ocr_engine.py`:
    - Implemented `convert_pdf_to_images(file_bytes, dpi=200)` using PyMuPDF (`pymupdf`) for crisp multi-page raster rendering.
    - Implemented `preprocess_image(image, enhance_contrast=True)` using OpenCV (grayscale conversion, CLAHE adaptive histogram equalization, min-max dynamic range normalization, and 3-channel RGB conversion).
    - Wrapped `PaddleOCR(use_angle_cls=True, lang='en')` returning normalized line-level bounding boxes and confidence scores.
    - Implemented `extract_lines(file_bytes, filename, preprocess=True)` returning structured `List[OcrLine]`.
  - `services/ai-ocr/app/classifier.py`:
    - Implemented rule-based + weighted token evidence classifier with primary keywords (3.0 pts), secondary keywords (1.5 pts), and negative penalties (-2.0 pts).
    - Classifies canonical MoTA document types: `INCOME_CERTIFICATE`, `ST_CASTE_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`, `OVERSEAS_ADMISSION_LETTER`, `RESEARCH_PROPOSAL`.
    - Handles aliases/equivalences (`ST_CASTE_CERTIFICATE` / `CASTE_CERTIFICATE`, `OVERSEAS_ADMISSION_LETTER` / `ADMISSION_OFFER_LETTER`, `RESEARCH_PROPOSAL` / `SYNOPSIS_RESEARCH_PROPOSAL`).
    - Detects wrong document uploads and mismatched files with structured `rejectionReason`.
    - Flags blurred, illegible, or noisy documents as `DocumentType.OTHER` with low confidence.
  - `services/ai-ocr/tests/test_classifier.py`: 14 comprehensive test cases covering:
    - Accurate classification of Income Certificate, ST Caste Certificate, Domicile Certificate, Academic Marksheet, Overseas Admission Letter, and Research Proposal.
    - Mismatched document detection (rejecting Marksheet uploaded as Income Certificate).
    - Blurred/gibberish text rejection.
    - Empty and blank string handling.
    - Line-level classification from `OcrLine` tokens.
    - OpenCV CLAHE image pre-processing pipeline verification.
    - PyMuPDF in-memory multi-page PDF rendering.
    - End-to-end real PaddleOCR line detection, bounding box normalization, and classification on rendered PDF.
- **Verification Results:**
  - `pytest services/ai-ocr/tests/test_classifier.py`: 14/14 passed in 3.87s (100% pass rate).
  - `pytest services/ai-ocr/tests`: 23/23 passed in 4.08s.
  - `pnpm --filter @tribalscholar/ai-ocr test`: 23/23 passed in 4.03s.
  - `pnpm -r build`: Clean TypeScript compilation (zero errors).


### Prompt 5.3 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `services/ai-ocr/app/schemas.py`: Introduced `FieldEvidence` (page, fieldLabel, bbox, rawSnippet, evidenceString) and `ExtractedField` (fieldName, value, status, confidence, evidence, rawText), and enriched `OcrFieldExtraction` with verification status and exact field evidence metadata.
  - `services/ai-ocr/app/extractor.py`:
    - Implemented `StructuredFieldExtractor` executing regex + positional anchor extraction across multi-page document lines.
    - Supported extraction targets:
      - `applicantName` with title/prefix stripping and line-by-line anchor discovery.
      - `category` normalized to `Scheduled Tribe (ST)` from tribal community designations.
      - `annualFamilyIncome` with numeric normalization (`₹80,000 per annum` -> `80000` int/float).
      - `issuingAuthority` parsing competent revenue authorities, tehsildars, SDOs, DMs, and universities.
      - `certificateRef` matching certificate/registration numbers (`SAMPLE-2026-01482`, `CERT/JH/2024/ST/09842`).
      - `issueDate` extracting formatted dates (`14 FEB 2026`, `20 JAN 2024`).
      - `stateDomicile` matching Indian state boundaries (`Jharkhand`, `Odisha`, etc.).
      - `percentageMarks` extracting normalized academic percentages (`78.4`).
      - Overseas admission letter fields (`institutionName`, `courseName`, `tuitionFees`, `casNumber`).
    - Emits exact evidence format matching SIH proposal UI mockup: `page 1 · name field`, `page 1 · income field`, `page 1 · issuer field`, `page 1 · ref field`, `page 1 · date field`, `page 1 · state field`, `page 1 · marks field`.
    - Implemented multi-line positional anchor extraction matching adjacent lines when labels and values are partitioned across separate visual lines.
  - `services/ai-ocr/app/ocr_engine.py`: Integrated `StructuredFieldExtractor` into `OcrEngineWrapper.extract_document`, mapping structured field outputs into `OcrEvidencePayload.extractedFields`.
  - `services/ai-ocr/tests/test_extractor.py`: 13 comprehensive test cases covering:
    - Income Certificate extraction with exact proposal mockup fields.
    - Currency and numeric income normalization (`₹80,000 per annum`, `Rs. 80,000/-`, `INR 80,000.00`).
    - ST Caste Certificate extraction.
    - Domicile Certificate extraction.
    - Academic Marksheet percentage normalization.
    - NOS Overseas Admission Letter extraction (CAS number, tuition fees, university).
    - Multi-line positional anchor spatial extraction.
    - Evidence metadata contract validation (`value`, `status`, `confidence`, `evidence`: `{ page, fieldLabel, bbox, rawSnippet }`).
- **Verification Results:**
  - `pytest services/ai-ocr/tests/test_extractor.py`: 13/13 passed in 0.05s.
  - `pytest services/ai-ocr/tests`: 36/36 passed in 4.50s across 3 test suites.
  - `pnpm --filter @tribalscholar/ai-ocr test`: 36/36 passed in 4.06s.
  - `pnpm -r build`: Clean TypeScript compilation (zero errors).


### Prompt 5.4 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `services/ai-ocr/app/schemas.py`: Defined comprehensive Pydantic v2 schemas:
    - `AnalyzeDocumentRequest` & `AnalyzeDocumentResponse`: Single certificate analysis supporting `fileBase64`, `lines`, or `text`, expected document type, and `applicantContext`.
    - `BatchAnalyzeRequest` & `BatchAnalyzeResponse`: Multi-document bundle analysis with summary statistics (`verifiedCount`, `deficientCount`), document results, bundle-wide deficiencies, and pairwise `crossDocChecks`.
    - `FieldComparisonItem`: Form value vs extracted OCR value comparison with match boolean, status, confidence, and human-readable explanation.
    - `CrossDocCheckItem`: Pairwise cross-certificate consistency check with source/target document types, fields, match status (`CONSISTENT`, `INCONSISTENT`, `SKIPPED`), and notes.
  - `services/ai-ocr/app/analyzer.py`: Implemented `DocumentIntelligenceAnalyzer` (`document_analyzer` singleton):
    - `analyze_document`: Resolves OCR lines from base64 files, pre-computed lines, or text; runs `document_classifier.verify_document_type`; extracts structured fields via `structured_extractor.extract_fields`; performs cross-field comparison against declared applicant form context (`applicantName`, `annualFamilyIncome`, `category`, `stateDomicile`); returns overall status (`VERIFIED` or `DEFICIENT`), deficiency reasons, field comparisons, and extracted fields with evidence metadata.
    - `analyze_batch`: Iterates across document bundles, evaluates individual document validity, performs pairwise cross-document checks (cross-verifying `applicantName` across all uploaded certificates using tokenized set intersection, verifying declared income against verified income certificate, checking category against ST certificate, and verifying state domicile), and compiles overall bundle status (`VERIFIED` or `DEFICIENT`).
  - `services/ai-ocr/app/main.py`: Exposed and secured internal intelligence endpoints:
    - `POST /internal/v1/ocr/analyze`: Single document analysis with `AnalyzeDocumentRequest` / `AnalyzeDocumentResponse`.
    - `POST /internal/v1/ocr/analyze-batch`: Multi-document bundle intelligence with `BatchAnalyzeRequest` / `BatchAnalyzeResponse`.
    - Protected via `InternalApiKeyMiddleware` enforcing `X-Internal-Api-Key`.
  - `services/ai-ocr/tests/test_analyze_api.py`: 7 comprehensive integration tests:
    - `test_analyze_unauthorized_without_api_key`: Enforces 401 Unauthorized when `X-Internal-Api-Key` is missing or invalid.
    - `test_analyze_single_income_certificate_clean`: Verifies proposal UI mockup values (`Sample Applicant`, `Scheduled Tribe (ST)`, `80000`, `Competent Revenue Authority`, `SAMPLE-2026-01482`, `14 FEB 2026`) and evidence strings (`page 1 · name field`, `page 1 · income field`, etc.) yielding `VERIFIED` status.
    - `test_analyze_batch_clean_4_of_4_set`: Verifies full 4/4 document bundle (`INCOME_CERTIFICATE`, `ST_CASTE_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`) yielding `overallStatus="VERIFIED"`, `verifiedCount=4`, `deficientCount=0`, and consistent pairwise cross-doc checks.
    - `test_analyze_deficient_income_mismatch`: Detects income discrepancies (e.g. certificate says ₹1,50,000 when declared income is ₹80,000), flagging `DEFICIENT` status and explicit deficiency reason.
    - `test_analyze_deficient_blurred_certificate`: Flags blurred/illegible certificates as `DEFICIENT` and document type `OTHER`.
    - `test_analyze_deficient_wrong_document_type`: Rejects mismatched uploads (e.g. Academic Marksheet uploaded where Income Certificate was expected) with structured rejection reason.
    - `test_analyze_batch_deficient_set`: Validates that a bundle containing a mismatched certificate produces `overallStatus="DEFICIENT"`, records bundle-wide deficiencies, and isolates the deficient document.
- **Verification Results:**
  - `services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests/test_analyze_api.py`: 7/7 passed in 2.59s.
  - `services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests`: 43/43 passed in 4.23s across 4 test suites (`test_analyze_api.py`, `test_classifier.py`, `test_extractor.py`, `test_health.py`).
  - `pnpm --filter @tribalscholar/ai-ocr test`: 43/43 passed in 4.43s.
  - `pnpm -r build`: Clean TypeScript compilation across `packages/shared` and `apps/api` (0 errors).


### Prompt 6.1 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `packages/shared/src/enums.ts` & `apps/api/prisma/schema.prisma`:
    - Added `DEFICIENCY_RAISED = 'DEFICIENCY_RAISED'` to `ApplicationStatus` enum.
    - Updated Prisma schema, ran `prisma db push`, and regenerated client.
  - `apps/api/src/config/env.ts`:
    - Added `INTERNAL_API_KEY` configuration with default secret key.
  - `apps/api/src/modules/storage/storage.service.ts`:
    - Implemented `getDocumentBuffer(key: string, bucket?: string): Promise<Buffer>` supporting local disk and MinIO/S3 buffer resolution.
  - `apps/api/src/modules/ocrClient/ocrClient.service.ts`:
    - Implemented `OcrClientService` connecting `apps/api` to `services/ai-ocr` at `POST /internal/v1/ocr/analyze`.
    - Handles `X-Internal-Api-Key` authentication, request payload construction (`documentId`, `expectedType`, `fileBase64`, `applicantContext`).
    - Configured timeout with `AbortSignal.timeout` and exponential backoff retry for transient 5xx errors while failing fast on 4xx client errors.
  - `apps/api/src/modules/scrutiny/orchestrator.service.ts`:
    - Implemented `ScrutinyOrchestratorService` with `submitAndEvaluateApplication(applicationId, actor, context)`.
    - Pipeline:
      1. Validates application presence, ownership/actor permissions, and eligible submission status (`DRAFT`, `DEFICIENT`, `DEFICIENCY_RAISED`).
      2. Loads all current active documents (`isCurrent: true`) and fetches their binary buffers via `storageService.getDocumentBuffer`.
      3. Dispatches each document to FastAPI OCR service in parallel via `ocrClientService.analyzeDocument`.
      4. Persists extracted OCR fields, OCR status, confidence scores, and raw payloads to `ApplicationDocument`.
      5. Executes versioned `SchemeVersion` rule engine (`evaluateApplicationRules`), evaluating document completeness, applicant eligibility, and cross-document consistency.
      6. Creates `DeficiencyRecord` entries if rule evaluation or OCR verification raises any deficiencies.
      7. Atomically transitions application state to `UNDER_SCRUTINY` (if 100% compliant) or `DEFICIENCY_RAISED` (if deficiencies exist).
      8. Generates immutable audit logs with `AuditService.logAction` recording previous state, new state, and submission metadata.
  - `apps/api/src/modules/applications/applications.routes.ts`:
    - Exposed `POST /api/v1/applications/:id/submit` route with `authenticate`, `requireRole([UserRole.APPLICANT, UserRole.ADMIN])`, and schema validation.
  - `apps/api/src/modules/applications/applications.service.ts`:
    - Updated status guards on `updateApplicationFormData` and `uploadApplicationDocument` to allow resubmissions/updates in `DEFICIENCY_RAISED` state.
  - `apps/api/src/modules/ruleEngine/eligibilityEvaluator.ts` & `consistencyEvaluator.ts`:
    - Added alias support (`ST_CASTE_CERTIFICATE` for `CASTE_CERTIFICATE`, `ACADEMIC_MARKSHEET` for `MARKSHEET_PG`) so documents match scheme version rules and cross-document checks cleanly.
  - `apps/api/src/__tests__/orchestrator.test.ts`:
    - 8 comprehensive integration tests:
      1. Submission when all documents pass OCR and rules -> transitions to `UNDER_SCRUTINY` with audit log.
      2. Submission with deficient document / income mismatch -> creates `DeficiencyRecord` entries and transitions to `DEFICIENCY_RAISED`.
      3. Missing required documents -> flags `DEFICIENCY_RAISED` with missing document codes.
      4. Double submission rejection -> 400 Bad Request when already `UNDER_SCRUTINY`.
      5. Unauthorized access -> 401 when unauthenticated.
      6. Forbidden submission -> 403 when applicant attempts to submit another user's application.
      7. OCR service retry on transient 500 error -> succeeds on retry.
      8. OCR service 4xx fast fail -> returns non-retryable error.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test src/__tests__/orchestrator.test.ts`: 8/8 passed.
  - `pnpm --filter @tribalscholar/api test`: 226/226 passed across 14 test suites.
  - `services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests`: 43/43 passed across 4 test suites.
  - Total workspace tests: 269/269 passing (100% pass rate).
  - `pnpm -r build`: Clean TypeScript compilation (0 errors).


### Prompt 6.2 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/prisma/schema.prisma`:
    - Added `isResolved Boolean @default(false)` and `resolutionNote String?` to `DeficiencyRecord` model.
    - Synchronized database with PostgreSQL via `prisma db push` and regenerated Prisma client.
  - `apps/api/src/modules/scrutiny/orchestrator.service.ts`:
    - Implemented `resolveDeficienciesAndReverify(applicationId, actor, options, context)`:
      1. Validates application presence, ownership guards, and status requirement (`DEFICIENCY_RAISED` or `DEFICIENT`).
      2. Marks open `DeficiencyRecord` entries as `isResolved = true`, `status = RESOLVED`, setting `resolvedAt` timestamp and resolution notes.
      3. Dispatches delta AI OCR re-verification only to newly uploaded/pending or deficient documents while reusing existing verified extractions for unchanged documents.
      4. Re-evaluates pinned `SchemeVersion` rules against all current documents and updated profile/form data.
      5. If issues remain, keeps status `DEFICIENCY_RAISED` and records new/unresolved `DeficiencyRecord` items.
      6. If all checks pass cleanly, transitions application status to `UNDER_SCRUTINY`.
      7. Generates immutable audit logs with `AuditAction.DEFICIENCY_RESOLVED`, `AuditAction.OCR_PROCESSED`, `AuditAction.RULE_EVALUATED`, and `AuditAction.APPLICATION_SUBMITTED`.
  - `apps/api/src/modules/applications/applications.routes.ts`:
    - Exposed `POST /api/v1/applications/:id/resolve` route guarded with `authenticateJWT`.
    - Handles optional resolution notes (`resolutionNote`, `resolutionNotes`), target `deficiencyIds`, and `forceOcr` options.
  - `apps/api/src/__tests__/deficiency-loop.test.ts`:
    - 8 comprehensive integration tests:
      1. Full lifecycle: Initial submission flags income mismatch (`DEFICIENCY_RAISED`) -> applicant re-uploads corrected document (v2) -> calls `/resolve` -> delta OCR runs only on v2 -> transitions to `UNDER_SCRUTINY` -> verifies resolved `DeficiencyRecord` and audit trail.
      2. Form correction lifecycle: Initial submission flags mismatch -> applicant updates form data via `PATCH /form` -> calls `/resolve` -> re-verification succeeds without document re-upload -> transitions to `UNDER_SCRUTINY`.
      3. Failed resolution re-check: Re-verification keeps `DEFICIENCY_RAISED` and records deficiency if replacement document is still non-compliant.
      4. 401 Unauthorized when unauthenticated.
      5. 404 Not Found for non-existent application ID.
      6. 403 Forbidden when another applicant attempts to resolve someone else's application.
      7. 400 Bad Request when trying to resolve an application in `DRAFT` status.
      8. 400 Bad Request when trying to resolve an application already in `UNDER_SCRUTINY` status.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test src/__tests__/deficiency-loop.test.ts`: 8/8 passed in 2.72s.
  - `pnpm --filter @tribalscholar/api test`: 234/234 passed across 15 test suites.
  - `services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests`: 43/43 passed across 4 test suites.
  - Total workspace tests: 277/277 passing (100% pass rate).
  - `pnpm -r build`: Clean TypeScript compilation across all workspaces (0 errors).


### Prompt 6.3 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `packages/shared/src/enums.ts` & `apps/api/prisma/schema.prisma`:
    - Added `SCRUTINY_APPROVED` to `ApplicationStatus` enum.
    - Added `APPROVE` and `REQUEST_CORRECTION` to `ReviewDecision` enum.
    - Synchronized database with PostgreSQL via `prisma db push` and regenerated Prisma client.
  - `apps/api/src/modules/scrutiny/scrutiny.service.ts`:
    - Implemented `getScrutinyQueue(filters)`:
      - Filterable by `schemeCode` (NFST/NOS), `status` (defaults to `UNDER_SCRUTINY`), `confidenceLevel` (`HIGH`, `MEDIUM`, `LOW` or numeric `minConfidence`), and `search` (applicant name, email, application number).
      - Computes queue item metadata: document counts, open deficiency counts, average OCR confidence, `hasAiFlag`, `flagCount`, and `aiRecommendation`.
      - Returns paginated results with pagination metadata.
    - Implemented `getDecisionPackage(applicationId)`:
      - Formats the complete 2-column Decision Package for the Officer Scrutiny UI:
        - Column 1: Submitted documents with resolved presigned/streaming view URLs, verification status, OCR confidence, extracted fields, field evidence strings (`page 1 · name field`, `page 1 · income field`), and cross-document validation results.
        - Column 2: Applicant profile context, scheme version details, rule engine evaluation results (completeness, eligibility, consistency), AI findings summary (`overallConfidence`, `overallPassed`, `hasFlag`, `recommendation`), complete deficiency history, and prior officer reviews.
    - Implemented `submitOfficerReview(applicationId, officer, input, context)`:
      - Validates officer permissions and application reviewable status (`UNDER_SCRUTINY` or `DEFICIENCY_RAISED`).
      - **Strict Human Override Governance**: Enforces mandatory justification whenever an officer selects `APPROVE` for an application with active AI or rule deficiencies (or sets `overrideUsed = true`). Missing justification is rejected with 400 Bad Request.
      - Approval with override automatically waives existing open deficiencies with officer notes and transitions status to `SCRUTINY_APPROVED`.
      - Request correction (`REQUEST_CORRECTION`) generates new `DeficiencyRecord` entries with officer attribution, routing the application back to the applicant in `DEFICIENCY_RAISED` status.
      - Persists `OfficerReview` record with officer ID, decision, remarks, checklist results, `aiFindingsAgreement`, and `overrideReason`.
      - Records immutable `AuditLog` for `OFFICER_REVIEW_SUBMITTED` and `DEFICIENCY_RAISED`.
  - `apps/api/src/modules/scrutiny/scrutiny.routes.ts`:
    - Exposed routes protected with `authenticateJWT` and `requireRoles(Role.SCRUTINY_OFFICER, Role.ADMIN)`:
      - `GET /api/v1/scrutiny/queue`
      - `GET /api/v1/scrutiny/applications/:id`
      - `POST /api/v1/scrutiny/applications/:id/review`
  - `apps/api/src/app.ts`:
    - Mounted `scrutinyRouter` at `/api/v1/scrutiny`.
  - `apps/api/src/__tests__/scrutiny.routes.test.ts`:
    - 17 comprehensive integration tests covering:
      1. RBAC enforcement: 401 Unauthorized for missing tokens, 403 Forbidden for `APPLICANT` role across all endpoints, 200 OK for `ADMIN` role.
      2. Scrutiny Queue: default queue listing, scheme code filtering (`NFST`), status filtering (`DEFICIENCY_RAISED`), confidence filtering (`HIGH`), and search query resolution.
      3. Complete Decision Package: 404 for non-existent applications, full 2-column payload validation (application, applicant, scheme, 8 documents with viewUrls & OCR extractions, rule evaluation, AI findings, deficiency history, prior reviews).
      4. Officer Review Happy Path: Clean application approved (`APPROVE` -> `SCRUTINY_APPROVED`) with `OfficerReview` and `AuditLog`.
      5. Mandatory Justification Enforcement: Rejection with 400 Bad Request when approving deficient application without justification.
      6. Human Override: Approval with justification succeeds (200 OK), waives open deficiencies, records `aiFindingsAgreement = false`, and logs override reason in audit trail.
      7. Request Correction: Submits `REQUEST_CORRECTION`, raises `DeficiencyRecord`, updates status to `DEFICIENCY_RAISED`, and logs action.
      8. Status Guards: Rejection with 400 Bad Request when attempting to review an application in `DRAFT` status.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test src/__tests__/scrutiny.routes.test.ts`: 17/17 passed in 2.66s.
  - `pnpm --filter @tribalscholar/api test`: 251/251 passed across 16 test suites.
  - `services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests`: 43/43 passed across 4 test suites.
  - Total workspace tests: 294/294 passing (100% pass rate).
  - `pnpm -r build`: Clean TypeScript compilation across all workspaces (0 errors).

### Prompt 6.4 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/api/src/modules/selection/selection.service.ts`:
    - Implemented `decideApplication(applicationId, officer, input, context)`:
      - Enforces status guard: only applications in `SCRUTINY_APPROVED` (or `SELECTION_PENDING` / `SCRUTINY_VERIFIED`) can be decided. Applications in `DRAFT`, `UNDER_SCRUTINY`, or `DEFICIENCY_RAISED` return 400 Bad Request.
      - **SELECTED Path**:
        - Transitions application status to `PROVISIONALLY_SELECTED`.
        - Generates unique sanction order number (`SANCTION-MOTA-NFST-2026-TS-NFST-2026-0001`).
        - Calculates/assigns fellowship sanctioned amount (default ₹3,50,000.00).
        - Generates award letter URL (`/api/v1/storage/documents/awards/...pdf`).
        - Creates or upserts `PostSelectionRecord` with status `AWARD_LETTER_ISSUED`, `sanctionOrderNumber`, `sanctionedAmount`, `awardLetterUrl`, and initial milestone log.
        - Persists `OfficerReview` with `ReviewDecision.RECOMMENDED_FOR_SELECTION`.
        - Records immutable `AuditLog` entry for `SELECTION_DECISION_RECORDED`.
      - **REJECTED Path**:
        - Transitions application status to `REJECTED`.
        - Persists `OfficerReview` with `ReviewDecision.REJECTED`.
        - Records immutable `AuditLog` entry for `SELECTION_DECISION_RECORDED`.
    - Implemented `updatePostSelection(applicationId, officer, input, context)`:
      - Validates that application has an active `PostSelectionRecord` (rejects unselected applications with 400).
      - Institutional Verification Toggle: marks `joiningReportSubmitted: true`, records `joiningDate`, and advances status from `AWARD_LETTER_ISSUED` to `JOINING_REPORT_SUBMITTED`.
      - **Simulated DBT Disbursement Trigger**:
        - Enforces prerequisite: Institutional verification (joining report) must be submitted before triggering DBT disbursement.
        - Calls `mockDbtAdapter.simulatePaymentTrigger({ applicationId, amount, installmentNumber, bankIfsc })`.
        - Returns deterministic simulated PFMS reference (`PFMS-ORD-...`) and tracking ID (`DBT-TRK-...`).
        - Transitions `PostSelectionRecord` status to `DISBURSEMENT_ACTIVE`.
        - Appends payment details to `disbursementDetails` and milestone entry to `milestoneLogs`.
        - Records immutable `AuditLog` for `APPLICATION_UPDATED` with `newState: DISBURSEMENT_ACTIVE`.
      - Supports simultaneous verification and disbursement in a single composite payload.
    - Implemented `getPostSelectionDetails(applicationId)`:
      - Returns complete post-selection summary, scholar profile, scheme metadata, review history, and simulated live PFMS disbursement status from `mockDbtAdapter.getDisbursementStatus()`.
    - Implemented `getSelectionQueue(filters)`:
      - Returns paginated list of applications eligible for selection or already decided (`SCRUTINY_APPROVED`, `PROVISIONALLY_SELECTED`, `REJECTED`), filterable by `schemeCode`, `status`, and `search`.
  - `apps/api/src/modules/selection/selection.routes.ts`:
    - Exposed endpoints protected with `authenticateJWT` and `requireRoles(Role.SELECTION_OFFICER, Role.ADMIN)`:
      - `GET /api/v1/selection/queue`
      - `GET /api/v1/selection/applications/:id`
      - `POST /api/v1/selection/applications/:id/decide`
      - `PATCH /api/v1/selection/applications/:id/post-selection`
  - `apps/api/src/app.ts`:
    - Mounted `selectionRouter` at `/api/v1/selection`.
  - `apps/api/src/__tests__/selection.routes.test.ts`:
    - 19 comprehensive integration tests covering:
      1. Status & ID Guards on Selection: 400 for DRAFT status, 404 for unknown IDs, 400 for missing remarks.
      2. Happy Path Decision: `SELECTED` -> `PROVISIONALLY_SELECTED`, `PostSelectionRecord` created with `AWARD_LETTER_ISSUED`, sanction order number, amount, review, and audit log.
      3. Rejection Path: `REJECTED` -> `REJECTED`, no `PostSelectionRecord`, review and audit log recorded.
      4. Disbursement Guard: 400 if triggering DBT disbursement before institutional verification.
      5. Institutional Verification Toggle: advances status to `JOINING_REPORT_SUBMITTED` with date and audit log.
      6. DBT Disbursement Trigger: calls `mockDbtAdapter`, advances status to `DISBURSEMENT_ACTIVE`, returns PFMS reference and tracking ID.
      7. Combined Payload: simultaneous verification and disbursement in a single request.
      8. Post-Selection Inspection: `GET /applications/:id` returns package with live simulated PFMS status.
      9. Selection Queue: paginated retrieval and filtering by schemeCode and status.
      10. Strict RBAC: 401 Unauthorized for missing tokens, 403 Forbidden for `APPLICANT` and `SCRUTINY_OFFICER` roles, 200 OK for `SELECTION_OFFICER` and `ADMIN`.
      11. Unbroken Audit Trail: End-to-end verification of `APPLICATION_CREATED` -> `DOCUMENT_UPLOADED` -> `APPLICATION_SUBMITTED` -> `OFFICER_REVIEW_SUBMITTED` -> `SELECTION_DECISION_RECORDED` -> `APPLICATION_UPDATED`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/api test src/__tests__/selection.routes.test.ts`: 19/19 passed in 3.35s.
  - `pnpm --filter @tribalscholar/api test`: 270/270 passed across 17 test suites in 18.68s.
  - `services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests`: 43/43 passed across 4 test suites in 5.15s.
  - Total workspace tests: 313/313 passing (100% pass rate).
  - `pnpm -r build`: Clean TypeScript compilation across all workspaces (0 errors).

### Prompt 7.1 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/web/package.json`: Configured Next.js 14 (App Router), React 18, Tailwind CSS, Lucide React, and shared contracts reference `@tribalscholar/shared`.
  - `apps/web/tsconfig.json` & `apps/web/tailwind.config.ts`: Strict TypeScript configuration with bundler resolution and MoTA brand styling palette (emerald green, saffron amber, deep slate).
  - `apps/web/next.config.mjs` & `apps/web/postcss.config.js`: Next.js 14 configuration with `/api/v1` proxy rewrite to Express backend (port 4000) and package transpilation.
  - `apps/web/src/lib/api.ts`: Typed REST client helpers with custom `ApiError`, request envelopes, JWT authorization header injection, and typed auth helpers (`loginUser`, `registerUser`, `fetchCurrentUser`, `apiClient`).
  - `apps/web/src/context/AuthContext.tsx`: React Context providing JWT authentication state, token persistence in `localStorage`, and one-click demo persona switcher with offline fallback for resilient jury demonstrations.
  - `apps/web/src/components/SihDemoRoleSwitcher.tsx`: Fixed top demo bar featuring 4 instant persona switchers:
    1. Birsa Munda (ST Scholar / Applicant)
    2. Dr. Sunita Toppo (Scrutiny Officer)
    3. Shri Rajeshwar Meena (Selection Committee)
    4. MoTA Administrator (System Admin)
  - `apps/web/src/components/RoleGuard.tsx`: Route access guard enforcing role clearance and redirecting unauthorized sessions to designated dashboards.
  - `apps/web/src/components/Navbar.tsx` & `apps/web/src/components/Sidebar.tsx`: MoTA tricolor branding, scheme markers, and role-specific sidebar navigation.
  - `apps/web/src/app/login/page.tsx` & `apps/web/src/app/register/page.tsx`: Full credential auth forms plus one-click SIH jury demo persona cards.
  - Role-specific workspace pages:
    - `/applicant`: Scholar intake portal, application overview, status tracker.
    - `/scrutiny`: First-pass AI OCR review desk, consistency checks, worklist.
    - `/selection`: Committee review desk, sanction order issuing, DBT disbursement status.
    - `/admin`: Scheme Rule DSL editor, user governance, immutable audit trail overview.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/web typecheck`: 0 TypeScript errors.
  - `pnpm --filter @tribalscholar/web build`: Successful production compilation across all 10 App Router routes.
  - `pnpm --filter @tribalscholar/api test`: 270/270 passed across 17 test suites in 18.79s.
  - Total monorepo backend tests: 313/313 passing (100% pass rate).

### Prompt 7.2 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/web/src/app/applicant/dashboard/page.tsx`:
    - Real-time applications tracking table with status badges (`DRAFT`, `UNDER_SCRUTINY`, `ACTION REQUIRED`, `SCRUTINY VERIFIED`, `PROVISIONALLY SELECTED`).
    - Dynamic scheme cards for NFST (750 slots, income limit ≤ ₹80,000/yr) and NOS (100 slots, income limit ≤ ₹6,00,000/yr) displaying versioned criteria, slots, and direct application CTAs.
    - Integrated with `getActiveSchemes()`, `getApplications()`, and resilient fallback for live offline jury evaluation.
  - `apps/web/src/app/applicant/apply/page.tsx`:
    - Scheme selection index routing scholars to NFST or NOS dedicated wizards.
  - `apps/web/src/app/applicant/apply/[schemeCode]/page.tsx`:
    - Dynamic multi-step wizard (`NFST` and `NOS`):
      - **Step 1:** Scholar profile & fellowship details (caste community, sub-tribe, state domicile, family income, institution, degree, qualifying percentage).
      - **Step 2:** Prescribed document upload slots (`ST_CASTE_CERTIFICATE`, `INCOME_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`, and NOS overseas offer letters) with file validation.
      - **Simulated DigiLocker Fetch:** One-click integration badged `Simulated Mock`, calling `/api/v1/integrations/digilocker/verify`, generating verified certificate references, and auto-attaching verified mock documents.
      - **Step 3:** Final review, statutory declaration, and **"Submit Application for AI Scrutiny"** action.
      - **Step 4:** Live multi-stage AI scrutiny execution progress visualization (PDF rasterization, PaddleOCR line extraction, cross-document verification, scheme rule DSL evaluation) displaying resulting application number and compliance findings.
  - `apps/web/src/lib/api.ts`:
    - Extended with typed API client helpers for `getActiveSchemes`, `getApplications`, `getApplicationById`, `createDraftApplication`, `updateApplicationFormData`, `uploadApplicationDocument`, `submitApplication`, and `verifyDigiLockerDocument`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/web typecheck`: 0 TypeScript errors.
  - `pnpm --filter @tribalscholar/web build`: Clean production build across all 12 App Router routes.
  - Monorepo backend tests: 313/313 passing across all suites.

### Prompt 7.3 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/web/src/app/applicant/applications/[id]/page.tsx`:
    - 4-Stage lifecycle progression stepper (`Intake -> First-Pass AI Intelligence -> Exception Management Desk -> Officer Action & Sanction`).
    - Actionable deficiency cards detailing specific AI/officer reasons (e.g. `INCOME_CERTIFICATE_LEGIBILITY`, `ANNUAL_INCOME_EXCEEDS_CEILING`, `ST_CASTE_MISMATCH`) with exact bounding box and evidence string anchors (`page 1 · income field · bbox [120, 340, 480, 390]`).
    - Inline field correction inputs for income / candidate name and document replacement uploader supporting local file upload and simulated DigiLocker fetching (`Simulated Mock`).
    - Actionable resolution note input and **"Submit Corrections & Re-Verify"** button wired to `POST /api/v1/applications/:id/resolve`, triggering replacement document upload, form data patch, delta OCR re-verification, and status advance to `UNDER_SCRUTINY`.
    - Document version history table tracking replacement versions (`v1`, `v2`), current status, and OCR confidence scores.
    - Chronological append-only application audit history timeline with actor names, roles, state transitions, and timestamps.
  - `apps/web/src/app/applicant/applications/page.tsx` & `apps/web/src/app/applicant/deficiencies/page.tsx`:
    - Supporting routes for navigating application records and centralized deficiency exception resolution.
  - `apps/web/src/lib/api.ts`:
    - Added `resolveApplicationDeficiencies(id, payload)` helper communicating with `POST /api/v1/applications/:id/resolve`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/web typecheck`: 0 TypeScript errors.
  - `pnpm --filter @tribalscholar/web build`: Clean production build across all 14 App Router routes.
  - Total monorepo backend tests: 313/313 passing across all 21 test suites.

### Prompt 7.4 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/web/src/app/officer/layout.tsx`:
    - RoleGuard enforcing `SCRUTINY_OFFICER`, `SELECTION_OFFICER`, or `ADMIN` credentials.
    - Unified layout rendering the MoTA Navbar, SIH Demo Role Switcher banner, and responsive Sidebar.
  - `apps/web/src/app/officer/queue/page.tsx`:
    - Scrutiny and selection officer queue dashboard with live counters (`Total Applications`, `Under Scrutiny`, `Deficiencies Raised`, `Verified / Selected`).
    - Filter controls: Scheme (`ALL`, `NFST`, `NOS`), Case State (`ALL`, `UNDER_SCRUTINY`, `DEFICIENCY_RAISED`, `SCRUTINY_APPROVED`, `PROVISIONALLY_SELECTED`), Confidence Level (`ALL`, `HIGH`, `MEDIUM`, `LOW`), and text search (name, email, application number).
    - Queue table displaying Applicant details, scheme tags, document counts, average OCR confidence bar, exception flags, status pills, and direct "Open Workspace" action links.
  - `apps/web/src/app/officer/page.tsx` & `apps/web/src/app/scrutiny/queue/page.tsx`:
    - Proxy routes pointing seamlessly to `OfficerQueuePage`.
  - `apps/web/src/app/officer/applications/[id]/page.tsx`:
    - Faithful realization of the SIH proposal's Page 4 UI Mockup:
      - **Left Panel (`01 · Submitted Document`):**
        - Document switcher tabs (Income, Caste, Domicile, Marksheet, Offer Letter) showing verified badges and version markers (`v1`, `v2`).
        - Visual certificate viewer rendering government revenue certificate (Cert Ref: `SAMPLE-2026-01482`, Applicant Name: `Sample Applicant`, Category: `Scheduled Tribe (ST)`, Income: `₹80,000 per annum`, Authority: `Sub-Divisional Officer / Competent Revenue Authority`, Date: `14 Feb 2026`).
        - Toggleable OCR bounding box visualizer overlay with coordinate-anchored highlights.
        - Direct external document link and zoom controls.
      - **Right Panel (`02 · AI-Assisted Scrutiny`):**
        - Header summary metrics: `APPLICANT` (name, email, application number), `DOCUMENT SET 4 / 4 uploaded`, and `CASE STATE Officer review`.
        - `EXTRACTED FIELDS` verification grid with status pills (`Extracted`, `Consistent`, `Present`) and exact evidence strings:
          - `Evidence: page 1 · name field`
          - `Matches application entry`
          - `Evidence: page 1 · income field`
          - `Evidence: page 1 · issuer field`
          - `Evidence: page 1 · ref field`
        - Scheme Rule Engine automated checklist with rule codes, threshold descriptions, and pass/fail indicators.
        - Review remarks input and primary action buttons (`Approve Application` and `Request Correction`).
        - **Human Override Governance Modal**: Intercepts approvals when discrepancies or AI warnings exist, enforcing mandatory statutory justification before submission.
        - **Selection Officer Award Controls**: Sanction order issue button, fellowship amount assignment, and post-selection simulated DBT disbursement trigger via PFMS adapter.
        - **Append-Only Audit Trail Drawer**: Slide-over panel displaying immutable chronological audit logs with actor details and state transitions.
  - `apps/web/src/components/Sidebar.tsx`:
    - Added `Officer Scrutiny Queue` (`/officer/queue`) to both Scrutiny and Selection navigation items.
  - `apps/web/src/lib/api.ts`:
    - Added typed scrutiny & selection client functions: `getScrutinyQueue`, `getDecisionPackage`, `submitOfficerReview`, `decideApplicationSelection`, `updatePostSelection`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/web typecheck`: 0 TypeScript errors.
  - `pnpm --filter @tribalscholar/web build`: Clean production compilation across all 17 App Router routes.
  - Monorepo backend tests: 313/313 passing across all 21 test suites.

### Prompt 7.5 Completion Report (2026-11-18)
- **Delivered Packages & Files:**
  - `apps/web/src/app/admin/schemes/page.tsx`:
    - Full-featured **Scheme Rules DSL Studio** supporting both NFST and NOS policy management.
    - **Scheme Version History Selector**: Dynamically inspects version lineage (`v1`, `v2`), live published vs editable draft indicators, and cloning action.
    - **Structured Rule Thresholds Tab**:
      - Academic year configuration (`2026-2027`).
      - Total fellowship slots (`750` for NFST, `100` for NOS).
      - Statutory annual income ceiling (₹) with descriptive guidelines.
      - Minimum academic qualifying marks percentage (%).
      - Configured rule conditions list (`casteCommunity`, `annualIncome`, `pgMarksPercentage`) with operator, threshold value, and target document.
      - Prescribed document requirements checklist and cross-document matchers matrix.
    - **Raw JSON Rule DSL Spec Tab**:
      - Syntax-styled editable text area displaying raw JSON rule definition and document requirements.
      - Inline JSON syntax validator and error feedback.
    - **Dry-Run Rule Simulator Bench**:
      - Real-time test applicant inputs: Name, community, Aadhaar status, annual family income, academic percentage, and foreign university offer letter.
      - Quick test preset buttons: *Clean Eligible ST Scholar (100% Pass)*, *Income Exceeds Ceiling (Economic Block)*, *Marks Below Cutoff (Academic Block)*, and *Missing Caste Certificate (Incomplete Docs)*.
      - Live evaluation output: Overall verdict banner (`COMPLIANT` / `DEFICIENT`), blocking failures count, condition-by-condition evaluation breakdown (`PASS` / `FAIL`), and cross-document consistency checks.
    - **Version Publishing & Audit Governance Modal**:
      - Statutory notice reminding administrators that publishing permanently activates rules for new applicants and writes an immutable `AuditAction.SCHEME_RULE_MODIFIED` record to PostgreSQL.
  - `apps/web/src/app/admin/page.tsx`:
    - Updated admin dashboard to link directly to the Scheme Rule DSL Studio (`/admin/schemes?scheme=NFST` and `/admin/schemes?scheme=NOS`).
  - `apps/web/src/lib/api.ts`:
    - Extended with typed scheme administration helpers: `getSchemeVersions`, `createSchemeVersion`, `updateSchemeVersion`, `cloneSchemeVersion`, `publishSchemeVersion`, and `simulateSchemeVersion`.
- **Verification Results:**
  - `pnpm --filter @tribalscholar/web typecheck`: 0 TypeScript errors.
  - `pnpm --filter @tribalscholar/web build`: Clean production compilation across all 18 App Router routes.
  - `pnpm -r build`: Clean compilation across `packages/shared`, `apps/api`, and `apps/web`.
  - Backend tests: 313/313 passing across all 21 test suites.


