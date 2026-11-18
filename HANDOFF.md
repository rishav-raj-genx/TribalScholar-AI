# TribalScholar AI: Cross-Chat Continuity & Phase 6 Transition Guide

## 1. Executive Summary & Current Status
Phase 1 (Foundation, Infrastructure & Core Engine), Phase 2 (Backend Security, Governance, Audit Trail & External Integrations), Phase 3 (Deterministic Scheme Rule Engine, Cross-Document Consistency Evaluator, Versioned Scheme Management API & Simulation Verifications), Phase 4 (Intake Portal, Document Ingestion, Version History & Shared Domain Contracts), Phase 5 (AI OCR Microservice, Document Intelligence & Cross-Document Verification), Phase 6 (Backend Governance, Deficiency Loop & Selection Lifecycle), and Phase 7 (Frontend Web Application, SIH Jury Role Switcher, Scholar Portal, Exception Desk, Proposal-Accurate 2-Column AI Officer Scrutiny Workspace & Admin Rule DSL Studio) of TribalScholar AI (SIH26239) are **100% COMPLETED**.  
The entire platform is production-compiled, verified across all 18 Next.js 14 App Router routes, and backed by 313 passing tests with zero compilation errors across the monorepo.

All backing infrastructure (PostgreSQL 16 and MinIO S3), cross-package domain contracts, Prisma database models, schema migrations, idempotent seed data, Express API entrypoint, centralized error handling, JWT authentication, role-based access control, transactional immutable audit logging, external government adapters (DigiLocker, DBT, BHASHINI), sliding-window rate limiters, reverse proxy security headers, deterministic JSON Rule DSL eligibility evaluator, cross-document consistency evaluator, unified rule orchestrator, versioned scheme management & dry-run simulation APIs, edge-case test suites, S3/MinIO object storage with offline local fallback and file validation, applicant profile management, draft application intake lifecycle, multipart document replacement versioning & controlled viewing, shared DTO contracts, the standalone Python FastAPI PaddleOCR microservice with document intelligence endpoints, and the entire end-to-end scholarship lifecycle (`DRAFT` -> document uploads -> submission pipeline with OCR & versioned rule evaluation -> deficiency loop & delta re-verification -> scrutiny officer decision desk with mandatory justification on overrides -> selection committee award with sanction order and award letter generation -> institutional verification toggle & simulated DBT disbursement -> unbroken immutable audit trail) are fully operational and verified with **313 passing tests** (270 in TypeScript API + 43 in Python AI OCR across 21 test suites).

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

### AI OCR Microservice & Document Intelligence (`services/ai-ocr`)
- [services/ai-ocr/requirements.txt](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/requirements.txt): Python dependencies (`fastapi`, `uvicorn`, `pydantic`, `python-multipart`, `pillow`, `numpy`, `opencv-python-headless`, `pymupdf`, `paddleocr`, `paddlepaddle`, `pytest`, `httpx`).
- [services/ai-ocr/app/config.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/config.py): Pydantic Settings loader reading `OCR_ENGINE`, `INTERNAL_API_KEY`, `DEBUG`, `PORT`, and runtime environment flags.
- [services/ai-ocr/app/schemas.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/schemas.py): Pydantic v2 schemas: `DocumentType` (canonical MoTA certificate types and aliases), `OcrLine` (text, confidence, pageNumber, boundingBox, polygon), `ClassificationResult`, `FieldEvidence` (page, fieldLabel, bbox, rawSnippet, evidenceString matching UI proposal mockup), `ExtractedField`, `AnalyzeDocumentRequest`, `AnalyzeDocumentResponse`, `BatchAnalyzeRequest`, `BatchAnalyzeResponse`, `FieldComparisonItem`, and `CrossDocCheckItem`.
- [services/ai-ocr/app/middleware.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/middleware.py): `InternalApiKeyMiddleware` enforcing `X-Internal-Api-Key` authentication on protected `/health` and `/internal/v1/*` routes while exempting `/healthz`, `/docs`, `/openapi.json`.
- [services/ai-ocr/app/ocr_engine.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/ocr_engine.py): `OcrEngineWrapper` providing:
  - `convert_pdf_to_images()`: Multi-page high-resolution rasterization via PyMuPDF (`dpi=200`).
  - `preprocess_image()`: OpenCV pipeline (grayscale, CLAHE adaptive histogram equalization, min-max contrast normalization).
  - PaddleOCR execution wrapper dynamically handling CPU vs GPU hardware, PaddleX v3 vs classic result formats, line-level bounding box normalization, and fallback to synthetic deterministic extraction.
- [services/ai-ocr/app/classifier.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/classifier.py): Rule-based and weighted token evidence classifier classifying MoTA certificates (`INCOME_CERTIFICATE`, `ST_CASTE_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`, `OVERSEAS_ADMISSION_LETTER`, `RESEARCH_PROPOSAL`), detecting mismatched/wrong document uploads, and flagging blurred/low-confidence documents.
- [services/ai-ocr/app/extractor.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/extractor.py): `StructuredFieldExtractor` executing regex + positional anchor extraction across multi-page document lines:
  - `applicantName`: Title/prefix stripping and line-by-line anchor discovery.
  - `category`: Normalization to `Scheduled Tribe (ST)`.
  - `annualFamilyIncome`: Numeric currency normalization (`₹80,000 per annum` -> `80000`).
  - `issuingAuthority`: Revenue authorities, tehsildars, SDOs, DMs, universities.
  - `certificateRef`: Certificate and registration reference numbers (`SAMPLE-2026-01482`).
  - `issueDate`: Formatted issue dates (`14 FEB 2026`).
  - `stateDomicile`: Indian state names (`Jharkhand`, `Odisha`, etc.).
  - `percentageMarks`: Academic percentage normalization (`78.4`).
  - Overseas fields: Institution name, course name, tuition fees, CAS number.
  - Formatted evidence strings: `page 1 · name field`, `page 1 · income field`, `page 1 · issuer field`, `page 1 · ref field`, `page 1 · date field`.
- [services/ai-ocr/app/analyzer.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/analyzer.py): `DocumentIntelligenceAnalyzer` orchestrator:
  - `analyze_document()`: Decodes base64 file or accepts raw text/lines, verifies classification against expected type, extracts typed fields with evidence metadata, compares against applicant form context (`applicantName`, `annualFamilyIncome`, `category`, `stateDomicile`), and flags `status` (`VERIFIED` or `DEFICIENT`).
  - `analyze_batch()`: Iterates across multi-certificate application bundles, performs pairwise cross-document consistency checks (name token intersection, income limit compliance, state domicile match), and compiles summary metrics (`verifiedCount`, `deficientCount`, `overallStatus`).
- [services/ai-ocr/app/main.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/app/main.py): FastAPI application mounting `/healthz` (liveness), `/health` (hardware diagnostic), `POST /internal/v1/ocr/analyze`, and `POST /internal/v1/ocr/analyze-batch`.
- [services/ai-ocr/tests/test_health.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/tests/test_health.py): Health and API key authentication tests (9 tests).
- [services/ai-ocr/tests/test_classifier.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/tests/test_classifier.py): Document classification, CLAHE pre-processing, and wrong-document rejection tests (14 tests).
- [services/ai-ocr/tests/test_extractor.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/tests/test_extractor.py): Structured field extraction, numeric parsing, and evidence string tests (13 tests).
- [services/ai-ocr/tests/test_analyze_api.py](file:///Users/apple/Desktop/SIH26239/services/ai-ocr/tests/test_analyze_api.py): Intelligence API integration tests validating clean 4/4 set, income mismatch, blurred rejection, and batch cross-checking (7 tests).

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

# Core API Unit & Integration Tests (251 passed across 16 suites)
pnpm --filter @tribalscholar/api test
 ✓ src/__tests__/scrutiny.routes.test.ts (17 tests)
 ✓ src/__tests__/deficiency-loop.test.ts (8 tests)
 ✓ src/__tests__/orchestrator.test.ts (8 tests)
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

# AI OCR Microservice Unit & Integration Tests (43 passed across 4 suites)
pnpm --filter @tribalscholar/ai-ocr test
# or: services/ai-ocr/.venv/bin/pytest services/ai-ocr/tests -c services/ai-ocr/pytest.ini
 ✓ tests/test_analyze_api.py (7 tests)
 ✓ tests/test_classifier.py (14 tests)
 ✓ tests/test_extractor.py (13 tests)
 ✓ tests/test_health.py (9 tests)

# Total Tests Passing across Workspace: 294 passed (100% pass rate)

# Database Seeding Execution
pnpm --filter @tribalscholar/api prisma:seed
# Executed idempotently with zero errors
```

---

## 5. Phase 6 Handoff: Frontend Web App, Scrutiny Desk & Governance Integration

### Overview of Completed Phase 6 Milestones:
1. **Submission Orchestration Pipeline & OCR Integration (Prompt 6.1):**
   - Implemented `OcrClientService` in `apps/api/src/modules/ocrClient/ocrClient.service.ts` connecting to `services/ai-ocr` with timeout and exponential backoff retry.
   - Implemented `ScrutinyOrchestratorService` in `apps/api/src/modules/scrutiny/orchestrator.service.ts` running document buffer resolution, OCR extraction, versioned scheme rule evaluation, and deficiency generation.
   - Exposed `POST /api/v1/applications/:id/submit` with atomic state transition to `UNDER_SCRUTINY` or `DEFICIENCY_RAISED` and full audit logging.
   - Added `DEFICIENCY_RAISED` enum to Prisma and `@tribalscholar/shared`.
   - Verified via 8 integration tests in `apps/api/src/__tests__/orchestrator.test.ts`.

2. **Applicant Correction, Deficiency Resolution & Delta Re-Verification Pipeline (Prompt 6.2):**
   - Added `isResolved` and `resolutionNote` to `DeficiencyRecord` in Prisma schema.
   - Implemented `resolveDeficienciesAndReverify()` in `apps/api/src/modules/scrutiny/orchestrator.service.ts` to mark open deficiencies resolved (`isResolved = true`), run delta OCR only on new or modified document versions, re-evaluate pinned scheme rules, and transition to `UNDER_SCRUTINY`.
   - Exposed `POST /api/v1/applications/:id/resolve` in `apps/api/src/modules/applications/applications.routes.ts`.
   - Verified via 8 integration tests in `apps/api/src/__tests__/deficiency-loop.test.ts`.

3. **Scrutiny Officer Decision Desk, Decision Package & Review Governance APIs (Prompt 6.3):**
   - Implemented `ScrutinyService` and `scrutinyRouter` at `/api/v1/scrutiny`.
   - Exposed `GET /api/v1/scrutiny/queue` with scheme, status, confidence, and search filters.
   - Exposed `GET /api/v1/scrutiny/applications/:id` providing the complete 2-column Decision Package with view URLs, OCR evidence strings, rule evaluation, and deficiency history.
   - Exposed `POST /api/v1/scrutiny/applications/:id/review` enforcing mandatory officer justification on human overrides when approving applications with active AI/rule flags.
   - Verified via 17 integration tests in `apps/api/src/__tests__/scrutiny.routes.test.ts`.

### Overview of Completed Phase 5 Milestones:
1. **AI OCR Microservice Architecture (Prompt 5.1):** Initialized FastAPI microservice with Pydantic v2 schemas mirroring `@tribalscholar/shared`, dynamic CPU/GPU PaddleOCR engine wrapper with deterministic fallback, and `X-Internal-Api-Key` middleware.
2. **MoTA Document Classifier & Preprocessing (Prompt 5.2):** Implemented PyMuPDF PDF-to-image rasterization, OpenCV CLAHE contrast enhancement, line-level bounding box normalization, and weighted token classifier for canonical MoTA certificates with wrong-document rejection.
3. **Structured Field Extractor & Evidence Metadata (Prompt 5.3):** Implemented regex + spatial positional anchor extraction for applicant name, category, income (numeric normalization to `80000`), issuer, reference, date, and percentage marks with exact proposal evidence format (`page 1 · name field`, `page 1 · income field`).
4. **Document Intelligence API & Cross-Document Consistency (Prompt 5.4):** Exposed `POST /internal/v1/ocr/analyze` and `POST /internal/v1/ocr/analyze-batch`, validating clean 4/4 document sets (`Sample Applicant`, `Scheduled Tribe (ST)`, `₹80,000 / year`, `Competent Revenue Authority`), detecting income/caste/domicile discrepancies, and rejecting blurred or wrong uploads.

### How `apps/api` Consumes `services/ai-ocr`:
- **Base URL:** `http://localhost:8000` (or `AI_OCR_SERVICE_URL` from `.env`).
- **Authentication:** Header `X-Internal-Api-Key: tribalscholar_internal_secret_key_2026`.
- **Single Document Analysis:**
  - `POST /internal/v1/ocr/analyze`
  - Body: `{ "documentId": "...", "expectedType": "INCOME_CERTIFICATE", "fileBase64": "...", "applicantContext": { "applicantName": "Birsa Munda", "annualFamilyIncome": 80000, "category": "ST", "stateDomicile": "Jharkhand" } }`
  - Returns: `{ "status": "VERIFIED"|"DEFICIENT", "overallConfidence": 0.94, "classification": {...}, "extractedFields": {...}, "comparisons": [...], "deficiencyReasons": [...] }`
- **Batch Application Analysis:**
  - `POST /internal/v1/ocr/analyze-batch`
  - Body: `{ "applicationId": "...", "applicantContext": {...}, "documents": [...] }`
  - Returns: `{ "applicationId": "...", "overallStatus": "VERIFIED"|"DEFICIENT", "verifiedCount": 4, "deficientCount": 0, "results": {...}, "crossDocChecks": [...], "bundleDeficiencies": [...] }`

### Immediate Objectives for Phase 6 (Frontend Web Application & Governance):
1. **Scholar Self-Service Intake Portal (`apps/web`):**
   - Registration, multi-role login, and applicant profile completion.
   - Scheme selection (`NFST` and `NOS`) and application drafting (`TS-NFST-2026-0001`).
   - Multipart document upload dropzone with immediate OCR preview, bounding box visualizer, and live feedback on blurred/mismatched uploads.
   - Application status timeline and deficiency response interface for replacement uploads.
2. **Scrutiny Officer Verification Desk (`apps/web`):**
   - Queue of submitted applications with filter by scheme, status, and deficiency flags.
   - Split-screen verification workspace: rendered certificate preview with bounding boxes on the left, extracted fields with evidence badges (`page 1 · name field`) on the right.
   - One-click approve or deficiency tagging with automated applicant notification.
3. **Selection Committee Workspace & Quota Allocation:**
   - Merit ranking engine computing academic scores and tie-breaking.
   - Allocation against 30% female quota, PVTG representation, and state quotas.
   - Provisional award letter and sanction order PDF generation.
4. **Post-Selection & Statutory Governance Desk:**
   - Joining report upload and university verification.
   - DBT installment release simulation via `mockDbtAdapter`.
   - Immutable audit trail explorer with full exportable compliance report.

---

## 5. Phase 6 Backend Governance & Lifecycle Summary (Prompts 6.1–6.4 Completed)

### 1. Submission Orchestration Pipeline (Prompt 6.1)
- **Files:** `apps/api/src/modules/ocrClient/ocrClient.service.ts`, `apps/api/src/modules/scrutiny/orchestrator.service.ts`, `apps/api/src/__tests__/orchestrator.test.ts`.
- **Pipeline:** `POST /api/v1/applications/:id/submit` reads current documents, calls AI OCR service with exponential backoff retry and timeout handling, records OCR fields and evidence on `ApplicationDocument`, runs pinned `SchemeVersion` rules, generates `DeficiencyRecord` entries, and atomically transitions status to `UNDER_SCRUTINY` or `DEFICIENCY_RAISED`.

### 2. Applicant Correction & Delta Re-Verification (Prompt 6.2)
- **Files:** `apps/api/src/modules/scrutiny/orchestrator.service.ts` (`resolveDeficienciesAndReverify`), `apps/api/src/__tests__/deficiency-loop.test.ts`.
- **Pipeline:** `POST /api/v1/applications/:id/resolve` marks resolved deficiencies as `isResolved = true` with notes and timestamps, executes delta OCR only on new replacement document versions, re-evaluates versioned scheme rules, and transitions compliant applications back to `UNDER_SCRUTINY`.

### 3. Scrutiny Officer Verification Desk & Decision Package (Prompt 6.3)
- **Files:** `apps/api/src/modules/scrutiny/scrutiny.service.ts`, `apps/api/src/modules/scrutiny/scrutiny.routes.ts`, `apps/api/src/__tests__/scrutiny.routes.test.ts`.
- **Endpoints:**
  - `GET /api/v1/scrutiny/queue` (filterable by scheme, status, confidence, search).
  - `GET /api/v1/scrutiny/applications/:id` (2-column Decision Package with document view URLs, OCR evidence strings, applicant context, rule results, deficiency history).
  - `POST /api/v1/scrutiny/applications/:id/review` (`APPROVE` -> `SCRUTINY_APPROVED` or `REQUEST_CORRECTION` -> `DEFICIENCY_RAISED`).
  - **Human Governance Rule:** Mandatory justification strictly enforced when approving an application with active AI/rule flags (overrides).

### 4. Selection Committee Decision, Sanction Order & DBT Disbursement (Prompt 6.4)
- **Files:** `apps/api/src/modules/selection/selection.service.ts`, `apps/api/src/modules/selection/selection.routes.ts`, `apps/api/src/__tests__/selection.routes.test.ts`.
- **Endpoints:**
  - `GET /api/v1/selection/queue`: Applications queue eligible for selection or decided.
  - `GET /api/v1/selection/applications/:id`: Post-selection summary with simulated live PFMS status.
  - `POST /api/v1/selection/applications/:id/decide`: `SELECTION_OFFICER` selects (`PROVISIONALLY_SELECTED`) or rejects (`REJECTED`) a `SCRUTINY_APPROVED` application. On selection, generates sanction order number, sets fellowship amount, and creates `PostSelectionRecord` with `AWARD_LETTER_ISSUED`.
  - `PATCH /api/v1/selection/applications/:id/post-selection`: Institutional verification toggle (`joiningReportSubmitted: true` -> `JOINING_REPORT_SUBMITTED`) and simulated Direct Benefit Transfer trigger via `mockDbtAdapter` (`DISBURSEMENT_ACTIVE` with tracking ID and PFMS reference).
- **Audit Governance:** Full chronological audit trail (`APPLICATION_CREATED` -> `DOCUMENT_UPLOADED` -> `APPLICATION_SUBMITTED` -> `OFFICER_REVIEW_SUBMITTED` -> `SELECTION_DECISION_RECORDED` -> `APPLICATION_UPDATED`).
- **Test Results:** 19/19 tests passing in `selection.routes.test.ts`; all 270 API tests passing; all 43 AI OCR tests passing (313/313 total).

---

## 6. Phase 7 Frontend Web Application & Live SIH Jury Demo (Prompts 7.1–7.5 COMPLETED)

### 1. Architecture & Monorepo Web Deliverables
- **Framework:** Next.js 14.2 (App Router), TypeScript 5.7, Tailwind CSS 3.4, Lucide React icons.
- **Directory:** `apps/web/`
- **Total Operational Routes:** 18 production App Router routes.

### 2. Comprehensive Inventory of Delivered Phase 7 Interfaces:
1. **SIH Demo Role Switcher & Authentication Shell (Prompt 7.1):**
   - [apps/web/src/components/SihDemoRoleSwitcher.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/components/SihDemoRoleSwitcher.tsx): Fixed top demo banner providing one-click instant persona switching between all 4 required SIH jury personas (Applicant, Scrutiny Officer, Selection Officer, System Admin) with offline fallback.
   - [apps/web/src/context/AuthContext.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/context/AuthContext.tsx): Typed authentication state with token caching and mock resilience.
   - [apps/web/src/components/RoleGuard.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/components/RoleGuard.tsx): Role-clearance routing protector.
   - [apps/web/src/app/login/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/login/page.tsx) & [apps/web/src/app/register/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/register/page.tsx): Full auth forms and one-click demo access cards.

2. **Scholar Intake Portal & Multi-Step Application Wizard (Prompt 7.2):**
   - [apps/web/src/app/applicant/dashboard/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/applicant/dashboard/page.tsx): Live applicant tracker displaying applications with status pills and active scheme cards for NFST (750 slots, ≤ ₹6,00,000/yr) and NOS (100 slots, ≤ ₹6,00,000/yr).
   - [apps/web/src/app/applicant/apply/[schemeCode]/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/applicant/apply/[schemeCode]/page.tsx): 4-step intake form with prescribed document slots (`ST_CASTE_CERTIFICATE`, `INCOME_CERTIFICATE`, `DOMICILE_CERTIFICATE`, `ACADEMIC_MARKSHEET`), simulated DigiLocker auto-fetch badged `Simulated Mock`, and "Submit for AI Scrutiny" progress visualizer.

3. **Applicant Exception Management & Deficiency Resolution Desk (Prompt 7.3):**
   - [apps/web/src/app/applicant/applications/[id]/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/applicant/applications/[id]/page.tsx): 4-stage lifecycle progression stepper, actionable deficiency cards with exact OCR evidence string anchors (`page 1 · income field`), inline field corrections, document replacement uploader (local + DigiLocker mock), and **"Submit Corrections & Re-Verify"** button wired to `POST /api/v1/applications/:id/resolve`.
   - [apps/web/src/app/applicant/deficiencies/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/applicant/deficiencies/page.tsx): Dedicated deficiency resolution hub.

4. **Officer Queue & Proposal-Accurate 2-Column AI Scrutiny Workspace (Prompt 7.4):**
   - [apps/web/src/app/officer/queue/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/officer/queue/page.tsx): Full officer queue with scheme, status, and OCR confidence filters.
   - [apps/web/src/app/officer/applications/[id]/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/officer/applications/[id]/page.tsx): Direct realization of SIH Proposal Page 4 UI Mockup:
     - Left Panel (`01 · Submitted Document`): Document switcher tabs with version tags, authentic revenue certificate visualizer (`SAMPLE-2026-01482`, `₹80,000 per annum`, SDO authority), and interactive toggleable OCR bounding boxes.
     - Right Panel (`02 · AI-Assisted Scrutiny`): Summary header (`APPLICANT`, `DOCUMENT SET 4 / 4 uploaded`, `CASE STATE Officer review`), `EXTRACTED FIELDS` grid with status badges (`Extracted`, `Consistent`, `Present`) and exact evidence strings (`Evidence: page 1 · name field`, `Matches application entry`, `Evidence: page 1 · income field`, `Evidence: page 1 · issuer field`), Rule engine checklist, statutory override justification modal, Selection Officer award controls, and append-only audit drawer.

5. **System Admin Console, Versioned Scheme Rules DSL Studio & Dry-Run Simulator (Prompt 7.5):**
   - [apps/web/src/app/admin/schemes/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/admin/schemes/page.tsx):
     - Version history selector for NFST and NOS with live published vs draft indicators.
     - Structured thresholds editor: academic year, total fellowship slots, statutory income ceiling (₹), qualifying marks (%), rule condition predicates, and document requirements.
     - Raw JSON Rule DSL spec view with inline format & syntax validator.
     - Dry-run rule simulator test bench with quick presets (*Clean Eligible ST Scholar*, *Income Exceeds Ceiling*, *Marks Below Cutoff*, *Missing Caste Cert*) and real-time evaluation report (`COMPLIANT` / `DEFICIENT`, condition breakdowns).
     - "Publish New Version" modal with statutory notice of immutable PostgreSQL `AuditAction.SCHEME_RULE_MODIFIED` logging.
   - [apps/web/src/app/admin/page.tsx](file:///Users/apple/Desktop/SIH26239/apps/web/src/app/admin/page.tsx): Admin console navigation linking directly to the Rule DSL Studio.

---

## 7. SIH Jury Live Demonstration Script & Walkthrough

| Stage | Persona & Role | Actions to Demonstrate Live |
| :--- | :--- | :--- |
| **1. Scholar Intake & DigiLocker** | **Birsa Munda** (`Role.APPLICANT`) | 1. Click "Applicant" in top role switcher.<br>2. Navigate to `/applicant/apply/NFST`.<br>3. Fill personal/fellowship details, click "Fetch from DigiLocker" (`Simulated Mock`) to automatically verify caste and revenue documents.<br>4. Click "Submit Application for AI Scrutiny" and observe real-time OCR extraction pipeline animation. |
| **2. Deficiency Exception Loop** | **Birsa Munda** (`Role.APPLICANT`) | 1. Open `/applicant/applications/demo-app-1`.<br>2. Inspect actionable deficiency card highlighting income ceiling mismatch with evidence bounding box.<br>3. Submit inline correction or replacement certificate and click "Submit Corrections & Re-Verify". |
| **3. Proposal Page 4 Scrutiny Workspace** | **Dr. Sunita Toppo** (`Role.SCRUTINY_OFFICER`) | 1. Click "Scrutiny Officer" in top role switcher.<br>2. Open `/officer/queue` and select an application to open `/officer/applications/demo-app-1`.<br>3. Show Proposal Page 4 layout: Left panel `01 · Submitted Document` (certificate preview, OCR toggle) vs Right panel `02 · AI-Assisted Scrutiny` (extracted fields with `Evidence: page 1 · ...` strings, rule checklist).<br>4. Demonstrate mandatory justification requirement on human overrides. |
| **4. Selection Award & DBT Disbursement** | **Shri Rajeshwar Meena** (`Role.SELECTION_OFFICER`) | 1. Click "Selection Officer" in top role switcher.<br>2. Open `/officer/applications/demo-app-1`.<br>3. Trigger Selection Award: issue sanction order number and set fellowship amount.<br>4. Toggle institutional verification (joining report) and trigger simulated DBT installment disbursement via PFMS adapter. |
| **5. Policy DSL & Rule Simulator** | **MoTA Administrator** (`Role.ADMIN`) | 1. Click "Admin" in top role switcher.<br>2. Open `/admin/schemes` (Versioned Scheme Rules DSL Studio).<br>3. Switch between NFST and NOS, clone a version to draft, adjust income ceiling or cutoff marks.<br>4. Test against Dry-Run Simulator with presets to show instant deterministic rule evaluation.<br>5. Publish new version with permanent audit logging. |

---

## 8. Verification & Monorepo Build Metrics
- `pnpm -r build`: 100% clean compilation across all monorepo packages (`packages/shared`, `apps/api`, `apps/web`).
- `pnpm --filter @tribalscholar/web typecheck`: 0 TypeScript errors.
- `pnpm --filter @tribalscholar/web build`: 18/18 App Router routes statically/dynamically generated.
- Monorepo backend tests: 313/313 passing across 21 test suites (270 Vitest in `apps/api` + 43 Pytest in `services/ai-ocr`).
