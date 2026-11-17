# TribalScholar AI: Project Context & Master Specification

## 1. Executive Summary
- **Hackathon:** Smart India Hackathon 2026
- **Problem Statement ID:** SIH26239
- **Problem Statement Title:** AI-Enabled Scholarship and Fellowship Management System for Scheduled Tribes
- **Ministry / Organization:** Ministry of Tribal Affairs (MoTA), Government of India
- **Theme:** Smart Education
- **Category:** Software
- **Team ID:** 132721
- **Team Name:** The Unknowns
- **Idea Title:** TribalScholar AI: Intelligent Scholarship & Fellowship Operations Platform

---

## 2. Problem Statement & Operational Objectives
The Ministry of Tribal Affairs administers vital scholarship and fellowship schemes for Scheduled Tribe (ST) students across India and abroad, notably:
1. **NFST (National Fellowship for Higher Education of ST Students)**: Supporting M.Phil and Ph.D. scholars pursuing higher education in Indian universities.
2. **NOS (National Overseas Scholarship for ST Students)**: Supporting meritorious ST students pursuing Master's, Ph.D., and Post-Doctoral studies in premier foreign institutions.

### Existing Challenges
- **Manual Scrutiny Bottlenecks:** Officers manually examine dozens of disparate documents (caste certificates, income certificates, university admission letters, marksheets, bank details) for thousands of applicants.
- **Document Quality & Extraction Errors:** Handwritten, scanned, blurred, or inconsistently formatted documents cause delays and repeated re-submissions.
- **Hard-Coded Scheme Workflows:** Annual guideline updates often require modifying application codebase rather than updating configuration tables.
- **Fragmented Deficiency Resolution:** Lack of structured, actionable deficiency notifications leads to communication overhead between scholars and scrutiny desks.
- **Audit & Governance Gaps:** Difficulty tracing every verification step, AI recommendation, and officer override in a single tamper-evident audit record.

### TribalScholar AI Solution
TribalScholar AI is a unified operations platform that automates first-pass verification and empowers authorized officers with explainable, human-in-the-loop decision support:
- **Intelligent Intake:** Responsive multi-step application portal with client-side document pre-validation.
- **AI Document Intelligence:** PaddleOCR and multi-modal analysis to classify documents, extract structured fields, and perform cross-document consistency validation (e.g., verifying name and DOB consistency across Aadhaar, Caste Certificate, and Marksheets).
- **Versioned Configurable Scheme Engine:** Dynamic rules for eligibility, required documents, scoring, and workflow routing for NFST and NOS without code modifications.
- **Actionable Deficiency Management:** Pinpointed deficiency items with specific correction instructions and automated re-scrutiny upon scholar re-upload.
- **Auditable Decision Packages:** End-to-end audit trail recording all AI findings, confidence scores, officer reviews, approvals, and post-selection milestones.

---

## 3. Locked Technical Stack & Runtime Specifications

| Tier | Technology | Directory | Port | Key Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web** | Next.js 14+ (App Router), Tailwind CSS, TypeScript | `apps/web` | `3000` | Applicant Portal & Officer/Admin Dashboard |
| **Core API & Engine** | Node.js (>=20), Express, Prisma ORM, TypeScript | `apps/api` | `4000` | REST API, RBAC, Scheme Rule Engine, State Machine |
| **Shared Contracts** | TypeScript, Zod Schemas, Shared DTOs | `packages/shared` | N/A | Type safety across client and server workspaces |
| **AI OCR Service** | Python (>=3.10), FastAPI, PaddleOCR, Uvicorn | `services/ai-ocr` | `8000` | OCR extraction, layout analysis, cross-doc validation |
| **Database** | PostgreSQL 16 | Docker Container | `5432` | Relational storage for users, schemes, applications, audit logs |
| **Object Storage** | MinIO (S3-Compatible) | Docker Container | `9000` (API) / `9001` (Console) | Encrypted storage for uploaded scholar certificates and artifacts |

---

## 4. User Roles & Permission Matrix (RBAC)

1. **APPLICANT (Scholar):**
   - Register, login, create/edit draft applications for NFST or NOS.
   - Upload prescribed documents (caste certificate, income certificate, transcripts, Bonafide/Offer letter).
   - View real-time status and actionable deficiency checklists.
   - Re-upload corrected documents for specific deficient criteria.
2. **SCRUTINY OFFICER (First-Pass Reviewer):**
   - Access designated application queues.
   - Review AI OCR extraction findings side-by-side with original document viewer.
   - Flag specific deficiencies or verify document criteria.
   - Forward verified decision packages to the Selection Committee.
3. **SELECTION OFFICER (Committee Member):**
   - Review merit lists, slot allocations, and verified application packages.
   - Record selection decisions, provisional award letters, and scholarship sanction orders.
4. **ADMINISTRATOR (System Admin & Ministry Policy Maker):**
   - Configure versioned scheme rules (eligibility thresholds, document requirements, deadlines).
   - Manage user accounts, role assignments, and system audit logs.
   - Monitor operational throughput and verification analytics.

---

## 5. Development Principles & Project Rules
- **Package Management:** Exclusively use `pnpm` for JavaScript/TypeScript packages (`pnpm add`, `pnpm install`, `pnpm <script>`).
- **Python Toolchain:** Exclusively use `uv` for Python virtual environments and dependency management.
- **Strict TypeScript:** Strict mode enabled across all TS packages (`noImplicitAny`, zero inferred `any`, explicit interfaces for DTOs and API payloads).
- **Defense-in-Depth:** Mandatory input validation using Zod, secure JWT verification, and encrypted storage keys.
