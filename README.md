# TribalScholar AI: Intelligent Scholarship & Fellowship Operations Platform

> **Smart India Hackathon 2026** | **Problem Statement ID:** SIH26239  
> **Ministry:** Ministry of Tribal Affairs (MoTA), Government of India  
> **Team:** The Unknowns (Team ID: 132721)

---

## Architecture & Monorepo Structure

- `apps/web`: Next.js 14+ frontend application (Applicant portal & Officer console) — Port `3000`
- `apps/api`: Node.js + Express + Prisma REST API & Rule Engine — Port `4000`
- `packages/shared`: Shared TypeScript types, validation schemas, and domain models
- `services/ai-ocr`: Python FastAPI OCR & Document Intelligence microservice — Port `8000`

## Infrastructure
- **PostgreSQL 16**: Port `5432`
- **MinIO S3 Object Storage**: Ports `9000` (API), `9001` (Console) — Bucket `tribalscholar-docs`

---

## Quick Start

### 1. Prerequisites
- Node.js >= 20
- pnpm >= 10
- Python >= 3.10 (managed with `uv`)
- Docker & Docker Compose

### 2. Environment Setup
```bash
cp .env.example .env
pnpm install
```

### 3. Start Infrastructure
```bash
pnpm docker:up
```

### 4. Continuity Documentation
- [PROJECT_CONTEXT.md](file:///Users/apple/Desktop/SIH26239/PROJECT_CONTEXT.md): Problem statement, target schemes (NFST, NOS), locked stack.
- [ARCHITECTURE.md](file:///Users/apple/Desktop/SIH26239/ARCHITECTURE.md): System architecture, data flow diagrams, security topology.
- [DEVELOPMENT_STATUS.md](file:///Users/apple/Desktop/SIH26239/DEVELOPMENT_STATUS.md): Multi-phase implementation roadmap & prompt completion log.
- [HANDOFF.md](file:///Users/apple/Desktop/SIH26239/HANDOFF.md): Cross-chat continuity notes and next prompt guidelines.
