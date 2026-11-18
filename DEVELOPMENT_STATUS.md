# TribalScholar AI: Development Status & Roadmap

## 1. Project Overview & Tracking Summary
- **Problem Statement ID:** SIH26239
- **Project Title:** TribalScholar AI (Intelligent Scholarship & Fellowship Operations Platform)
- **Current Phase:** Phase 5 - AI OCR Service, Selection & Governance (PHASE 5 AI OCR COMPLETE)
- **Next Phase:** Phase 6 - Frontend Web Application, Officer Scrutiny & Selection Governance
- **Status:** Phase 1, Phase 2, Phase 3, Phase 4, and Phase 5 AI OCR Microservice Complete (43/43 tests passing)

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

## 7. High-Level Multi-Phase Master Roadmap

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

### Phase 6: Frontend Web Application, Officer Scrutiny & Selection Governance
- Intake Portal & Scholar Self-Service Application Lifecycle (Registration, Profile, Form, Uploads, Replacement Versioning, Status Timeline).
- Scrutiny Officer Verification Workspace (Side-by-side certificate viewer, extracted field evidence verification, deficiency tagging & return-to-applicant workflow).
- Selection Committee Ranking & Quota Allocation (Merit list generator, PVTG / gender / state quotas, provisional award letters, sanction orders).
- Post-Selection Milestones, DBT Disbursement Orchestration & Statutory Compliance Audit Exporter.

---

## 8. Prompt Completion Reports

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
