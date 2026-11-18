# TribalScholar AI: Cross-Chat Continuity & Phase 5 Transition Guide

## 1. Executive Summary & Current Status
Phase 1 (Foundation, Infrastructure & Core Engine), Phase 2 (Backend Security, Governance, Audit Trail & External Integrations), Phase 3 (Deterministic Scheme Rule Engine, Cross-Document Consistency Evaluator, Versioned Scheme Management API & Simulation Verifications), and Phase 4 (Intake Portal, Document Ingestion, Version History & Shared Domain Contracts) of TribalScholar AI (SIH26239) are **100% COMPLETED**.  
Phase 5 (Selection, Post-Selection & Governance) is **READY TO COMMENCE**.

All backing infrastructure (PostgreSQL 16 and MinIO S3), cross-package domain contracts, Prisma database models, schema migrations, idempotent seed data, Express API entrypoint, centralized error handling, JWT authentication, role-based access control, transactional immutable audit logging, external government adapters (DigiLocker, DBT, BHASHINI), sliding-window rate limiters, reverse proxy security headers, deterministic JSON Rule DSL eligibility evaluator, cross-document consistency evaluator, unified rule orchestrator, versioned scheme management & dry-run simulation APIs, edge-case test suites, S3/MinIO object storage with offline local fallback and file validation, applicant profile management, draft application intake lifecycle, multipart document replacement versioning & controlled viewing, and shared DTO contracts are fully operational and verified with 218 tests across 13 test suites.

---

## 2. Complete Phase 1 & Phase 2 Inventory of Deliverables

### Infrastructure & Monorepo Core
- [pnpm-workspace.yaml](file:///Users/apple/Desktop/SIH26239/pnpm-workspace.yaml): Monorepo workspace configuration (`apps/web`, `apps/api`, `packages/shared`, `services/ai-ocr`).
- [package.json](file:///Users/apple/Desktop/SIH26239/package.json): Root scripts for workspace build, test, lint, and Docker operations.
- [tsconfig.base.json](file:///Users/apple/Desktop/SIH26239/tsconfig.base.json): Strict TypeScript base configuration (`ES2022`, `NodeNext`, `strict: true`, `noImplicitAny`).
- [docker-compose.yml](file:///Users/apple/Desktop/SIH26239/docker-compose.yml): Multi-container services for PostgreSQL 16 (port `5432`), MinIO S3 (ports `9000`/`9001`), and automatic bucket bootstrap for `tribalscholar-docs`.
- [.env.example](file:///Users/apple/Desktop/SIH26239/.env.example): Production and development environment variable declarations.
- [.gitignore](file:///Users/apple/Desktop/SIH26239/.gitignore): Comprehensive exclusions for node_modules, Python caches, build artifacts, and secrets.

### Shared Domain Contracts (`packages/shared`)
- [packages/shared/package.json](file:///Users/apple/Desktop/SIH26239/packages/shared/package.json): Workspace package with Zod dependency.
- [packages/shared/src/enums.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/enums.ts): System enums (`Role`, `SchemeCode`, `ApplicationStatus`, `DocumentType` including `ST_CASTE_CERTIFICATE` & `ACADEMIC_MARKSHEET`, `VerificationStatus`, `DeficiencyStatus`, `ReviewDecision`, `PostSelectionStatus`, `AuditAction`, `RuleOperator`, `RuleSeverity`, `CrossDocCheckStatus`).
- [packages/shared/src/schemas/rule-dsl.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/schemas/rule-dsl.ts): Zod validation schemas for conditions, logical rule groups, scoring criteria, and versioned scheme rule sets.
- [packages/shared/src/schemas/scheme.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/schemas/scheme.ts): Zod validation schemas and DTO types for `Scheme` (`schemeSchema`, `SchemeDTO`, `Scheme`) and `SchemeVersion` (`schemeVersionSchema`, `SchemeVersionDTO`, `SchemeVersion`).
- [packages/shared/src/schemas/ocr-evidence.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/schemas/ocr-evidence.ts): Schemas for bounding boxes, field extractions, cross-document comparison items, and evidence payloads.
- [packages/shared/src/schemas/auth.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/schemas/auth.ts): Auth request and response DTO schemas.
- [packages/shared/src/schemas/application.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/schemas/application.ts): Intake, deficiency, review, and DTO contracts for `Application` (`applicationSchema`, `ApplicationDTO`, `Application`) and `ApplicationDocument` (`applicationDocumentSchema`, `ApplicationDocumentDTO`, `ApplicationDocument`).
- [packages/shared/src/index.ts](file:///Users/apple/Desktop/SIH26239/packages/shared/src/index.ts): Package barrel export.

### Core API Engine & Security Modules (`apps/api`)
- [apps/api/package.json](file:///Users/apple/Desktop/SIH26239/apps/api/package.json): Express, Prisma 6, Zod, Helmet, Cors, Bcryptjs, JsonWebToken, Vitest, Supertest, TSX.
- [apps/api/prisma/schema.prisma](file:///Users/apple/Desktop/SIH26239/apps/api/prisma/schema.prisma): 10 relational models (`User`, `ApplicantProfile`, `Scheme`, `SchemeVersion`, `Application`, `ApplicationDocument` with `version` and `isCurrent`, `DeficiencyRecord`, `OfficerReview`, `PostSelectionRecord`, `AuditLog`).
- [apps/api/prisma/migrations/20261117181700_init/migration.sql](file:///Users/apple/Desktop/SIH26239/apps/api/prisma/migrations/20261117181700_init/migration.sql): Initial applied database migration.
- [apps/api/src/seed-data.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/seed-data.ts): Master seed definitions for 4 RBAC users and 2 schemes (`NFST` and `NOS`) with 2026-2027 v1 rules and ₹80,000 sample income check.
- [apps/api/prisma/seed.ts](file:///Users/apple/Desktop/SIH26239/apps/api/prisma/seed.ts): Idempotent database seeder with bcrypt password hashing.
- [apps/api/src/config/env.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/config/env.ts): Zod-validated environment config loader.
- [apps/api/src/lib/prisma.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/lib/prisma.ts): Singleton PrismaClient instance.
- [apps/api/src/lib/logger.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/lib/logger.ts): Structured JSON/text logger with configurable log levels.
- [apps/api/src/middleware/errorHandler.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/middleware/errorHandler.ts): Standardized error handler with `AppError`, `ZodError`, `TooManyRequestsError`, and Prisma code mapping.
- [apps/api/src/middleware/rateLimiter.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/middleware/rateLimiter.ts): Sliding-window rate limiters for API and Auth endpoints emitting standard rate limit headers.
- [apps/api/src/middleware/auth.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/middleware/auth.ts): JWT authentication guard and RBAC authorization middleware (`requireRoles`).
- [apps/api/src/modules/auth/auth.service.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/auth/auth.service.ts) & [apps/api/src/modules/auth/auth.routes.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/auth/auth.routes.ts): Scholar registration, multi-role login, `/me` profile retrieval, and guarded queues.
- [apps/api/src/modules/audit/audit.service.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/audit/audit.service.ts) & [apps/api/src/modules/audit/audit.routes.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/audit/audit.routes.ts): Append-only audit logger supporting standalone and Prisma transaction client (`tx`) injection, with role-scoped inspection (`/api/v1/audit/:entityType/:entityId`).
- [apps/api/src/adapters/interfaces.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/adapters/interfaces.ts): External government ecosystem contracts (`IDigiLockerAdapter`, `IDbtAdapter`, `ITranslationAdapter`) enforcing `isSimulatedMock: true`.
- [apps/api/src/adapters/mockDigiLocker.adapter.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/adapters/mockDigiLocker.adapter.ts), [mockDbt.adapter.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/adapters/mockDbt.adapter.ts), [mockBhashini.adapter.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/adapters/mockBhashini.adapter.ts): Deterministic simulation providers.
- [apps/api/src/modules/integrations/integrations.routes.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/integrations/integrations.routes.ts): Simulation endpoints mounted under `/api/v1/integrations`.
- [apps/api/src/routes/health.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/routes/health.ts): `/api/v1/health` with live `SELECT 1` database probe, memory stats, and uptime.
- [apps/api/src/app.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/app.ts): Express application factory with Helmet, CORS, reverse proxy trust, correlation IDs, and rate limiters.
- [apps/api/src/server.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/server.ts): HTTP server listener with graceful shutdown hooks (`SIGINT`, `SIGTERM`).
- [apps/api/src/modules/ruleEngine/eligibilityEvaluator.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/ruleEngine/eligibilityEvaluator.ts): Pure, deterministic scheme eligibility & document completeness evaluator executing JSON DSL (`EQ`, `NEQ`, `LTE`, `GTE`, `LT`, `GT`, `IN`, `NOT_IN`, `BOOLEAN`, `CONTAINS`, `REGEX_MATCH`, `EXISTS`).
- [apps/api/src/modules/ruleEngine/consistencyEvaluator.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/ruleEngine/consistencyEvaluator.ts): Cross-document consistency and OCR confidence evaluator with `FUZZY_TOKEN_RATIO`, `NORMALIZED_CONTAINS`, `NUMERIC_EXACT`, and `NON_EMPTY_PRESENT` matchers.
- [apps/api/src/modules/ruleEngine/index.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/ruleEngine/index.ts): Unified rule engine orchestrator exposing `evaluateApplicationRules()`.
- [apps/api/src/modules/schemes/schemes.service.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/schemes/schemes.service.ts): Scheme version management, draft cloning, updating, audit-logged publishing, and dry-run simulation engine.
- [apps/api/src/modules/schemes/schemes.routes.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/schemes/schemes.routes.ts): REST routing for active schemes, version discovery, admin drafting/publishing, and simulation endpoints (`/api/v1/schemes`).
- [apps/api/src/modules/applications/applications.service.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/applications/applications.service.ts): Applicant profile upsert, draft application creation with sequential numbering (`TS-NFST-2026-0001`), state-guarded form data updates, document upload with automatic version increment (`version = max + 1`) and `isCurrent` toggle, presigned URL view/streaming, and ownership-scoped retrieval with status timeline.
- [apps/api/src/modules/applications/applications.routes.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/applications/applications.routes.ts): REST routing for `/api/v1/applicant/profile`, `/api/v1/applications`, multipart uploads (`POST /api/v1/applications/:id/documents`), and controlled document viewing (`GET /api/v1/applications/:id/documents/:docId/view`).
- [apps/api/src/__tests__/applications.intake.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/applications.intake.test.ts): Unit and integration test suite (22 tests) validating profile setup, draft creation, form updates in DRAFT/DEFICIENT states, submission immutability, and cross-applicant access prevention.
- [apps/api/src/__tests__/applications.documents.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/applications.documents.test.ts): Unit and integration test suite (23 tests) validating certificate uploads (`ST_CASTE_CERTIFICATE`, `INCOME_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`), replacement versioning (`v2`, `v3`, `isCurrent` toggle), streaming, presigning, and security boundaries.
- [apps/api/src/modules/storage/storage.service.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/modules/storage/storage.service.ts): S3/MinIO compatible object storage adapter (`S3StorageAdapter`), offline fast disk storage (`LocalStorageAdapter`), unified facade (`StorageService`), and binary magic bytes validator for PDF, PNG, and JPEG with 5 MB limit.
- [apps/api/src/__tests__/storage.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/storage.test.ts): Unit and integration test suite (27 tests) validating magic byte detection, file validation, oversized file rejection, MIME mismatch rejection, local disk streaming/deletion, S3 adapter mocking, and automatic offline fallback upon `ECONNREFUSED`.
- [apps/api/src/__tests__/eligibilityEvaluator.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/eligibilityEvaluator.test.ts): Unit and integration test suite (25 tests) validating NFST, NOS, and arbitrary JSON schemes.
- [apps/api/src/__tests__/consistencyEvaluator.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/consistencyEvaluator.test.ts): Unit and integration test suite (14 tests) validating exact matching, field mismatches, and OCR low-confidence routing.
- [apps/api/src/__tests__/schemes.routes.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/schemes.routes.test.ts): Integration test suite (20 tests) validating public scheme discovery, version drafting, duplicate handling, publishing, audit trail creation, cloning, dry-run simulation, and RBAC enforcement.
- [apps/api/src/__tests__/unifiedEvaluatorEdgeCases.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/unifiedEvaluatorEdgeCases.test.ts): Edge-case test suite (15 tests) validating missing/null inputs, empty/malformed OCR outputs, multi-version rule isolation (NFST v1 vs v2, NOS v1 vs v2), parallel determinism, zero database side-effect simulation guarantee, and immutable audit logging.
- [apps/api/src/__tests__/seed.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/seed.test.ts): Seed data and shared DTO contract validation test suite (8 tests).
- [apps/api/src/__tests__/health.test.ts](file:///Users/apple/Desktop/SIH26239/apps/api/src/__tests__/health.test.ts): Health endpoint and error handler integration suite (8 tests).
- [apps/api/vitest.config.ts](file:///Users/apple/Desktop/SIH26239/apps/api/vitest.config.ts): Vitest runner configuration with `fileParallelism: false` for strict PostgreSQL transaction isolation.

### Project Continuity Documentation
- [PROJECT_CONTEXT.md](file:///Users/apple/Desktop/SIH26239/PROJECT_CONTEXT.md): Master hackathon brief, MoTA schemes, and locked architecture.
- [ARCHITECTURE.md](file:///Users/apple/Desktop/SIH26239/ARCHITECTURE.md): Architecture topology diagram, data flows, and security policies.
- [DEVELOPMENT_STATUS.md](file:///Users/apple/Desktop/SIH26239/DEVELOPMENT_STATUS.md): Master roadmap and Phase 1 completion reports.
- [README.md](file:///Users/apple/Desktop/SIH26239/README.md): Quick start and run guide.

---

## 3. Seeded Accounts & Credentials

| Role | Email | Password | Full Name | Details |
| :--- | :--- | :--- | :--- | :--- |
| `APPLICANT` | `applicant@demo.in` | `Password@123` | Birsa Munda | Profile: Santhal tribe, Jharkhand, Annual Income: ₹80,000 |
| `SCRUTINY_OFFICER` | `scrutiny@mota.gov.in` | `Password@123` | Dr. Sunita Toppo | Scrutiny review desk officer |
| `SELECTION_OFFICER` | `selection@mota.gov.in` | `Password@123` | Shri Rajeshwar Meena | Selection committee officer |
| `ADMIN` | `admin@mota.gov.in` | `Password@123` | MoTA System Administrator | Full administrative rights |

---

## 4. Verification & Test Metrics

```bash
# Workspace Typecheck & Build
pnpm -r build
# packages/shared: compiled cleanly
# apps/api: compiled cleanly (0 errors)

# Unit & Integration Tests (218 passed across 13 suites)
pnpm --filter @tribalscholar/api test
 ✓ src/__tests__/applications.documents.test.ts (23 tests)
 ✓ src/__tests__/applications.intake.test.ts (22 tests)
 ✓ src/__tests__/storage.test.ts (27 tests)
 ✓ src/__tests__/consistencyEvaluator.test.ts (14 tests)
 ✓ src/__tests__/adapters.test.ts (17 tests)
 ✓ src/__tests__/eligibilityEvaluator.test.ts (25 tests)
 ✓ src/__tests__/health.test.ts (8 tests)
 ✓ src/__tests__/seed.test.ts (8 tests)
 ✓ src/__tests__/phase2-integration.test.ts (6 tests)
 ✓ src/__tests__/schemes.routes.test.ts (20 tests)
 ✓ src/__tests__/unifiedEvaluatorEdgeCases.test.ts (15 tests)
 ✓ src/__tests__/audit.test.ts (15 tests)
 ✓ src/__tests__/auth.test.ts (18 tests)

# Database Seeding Execution
pnpm --filter @tribalscholar/api prisma:seed
# Executed idempotently with zero errors
```

---

## 5. Phase 5 Handoff & Selection Architecture Roadmap

### Overview of Completed Phase 4 Milestones:
1. **Document Ingestion & Storage Adapter (Prompt 4.1):** Connected Core API to S3/MinIO bucket `tribalscholar-docs` with `uploadDocumentBuffer()`, `getDocumentStream()`, `getPresignedViewUrl()`, offline `LocalStorageAdapter` fallback, and binary magic bytes validation for PDF, PNG, and JPEG (5 MB limit).
2. **Applicant Profile & Draft Intake API (Prompt 4.2):** Implemented profile management (`GET`/`PUT /api/v1/applicant/profile`), draft application creation (`POST /api/v1/applications`) with auto-generated numbers (`TS-NFST-2026-0001`), state-guarded form data updates (`PATCH /api/v1/applications/:id/form`), and ownership-scoped retrieval with status timeline.
3. **Multipart Document Upload, Replacement Versioning & Controlled Viewing (Prompt 4.3):** Implemented multipart uploads (`POST /api/v1/applications/:id/documents`) with automatic version increments (`version: max + 1`), marking prior versions `isCurrent: false`, audit logging, and presigned/streaming view (`GET /api/v1/applications/:id/documents/:docId/view`).
4. **Shared Domain Contracts, Regression Testing & Phase 4 Transition (Prompt 4.4):** Exported shared DTO contracts and Zod schemas for `Application`, `ApplicationDocument`, `Scheme`, and `SchemeVersion` in `packages/shared`, established Vitest PostgreSQL runner isolation (`fileParallelism: false`), and verified full regression suite (218 passing tests).

### Immediate Objectives for Phase 5 (Selection, Post-Selection & Governance):
1. **Merit Ranking Engine & Quota Allocator (Prompt 5.1):**
   - Calculate merit scores from academic percentages and scoring criteria.
   - Rank applications per scheme (`NFST` and `NOS`) against available slots.
   - Enforce reservation quotas (female representation, PVTG, state distribution, disciplines).
   - Implement tie-breaking rules and generate draft merit lists.
2. **Selection Committee Approval Workflow & Provisional Award Generator (Prompt 5.2):**
   - Committee review interface & decision recording (`RECOMMENDED_FOR_SELECTION`, `REJECTED`).
   - Generation of provisional award letters and digital sanction orders.
   - Status transitions (`SUBMITTED` / `UNDER_REVIEW` -> `SELECTED` / `REJECTED`).
   - Immutable audit logging of committee votes and final decisions.
3. **Post-Selection Milestone Tracker & PFMS/DBT Disbursement Orchestration (Prompt 5.3):**
   - Create and manage `PostSelectionRecord`.
   - Track university joining reports, visa clearances (for NOS), and annual academic progress reports.
   - Orchestrate simulated DBT installment releases via `MockDbtAdapter` with transaction tracking.
4. **End-to-End Governance, Compliance Reporting & Final Verification (Prompt 5.4):**
   - Comprehensive audit trail exporter and statutory compliance reports.
   - Full regression and end-to-end multi-scholar lifecycle demonstration.
