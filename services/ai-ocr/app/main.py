import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.analyzer import document_analyzer
from app.config import settings
from app.middleware import InternalApiKeyMiddleware
from app.ocr_engine import ocr_engine
from app.schemas import (
    AnalyzeDocumentRequest,
    AnalyzeDocumentResponse,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    HealthResponse,
)

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ai_ocr_service")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Microservice lifecycle initialization and shutdown hooks."""
    logger.info("Booting %s v%s in %s mode...", settings.SERVICE_NAME, settings.VERSION, settings.ENV)
    engine_status = ocr_engine.get_engine_info()
    logger.info("OCR Engine status: %s (mode=%s, device=%s)", engine_status["name"], engine_status["mode"], engine_status["device"])
    yield
    logger.info("Shutting down %s...", settings.SERVICE_NAME)


app = FastAPI(
    title="TribalScholar AI - OCR & Document Intelligence Service",
    description="Python FastAPI microservice for PaddleOCR document analysis, structured extraction, and cross-document verification.",
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Cross-Origin Resource Sharing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enforce internal API key authentication
app.add_middleware(InternalApiKeyMiddleware)


# ==============================================================================
# Public / Unauthenticated Endpoints (Container Probes)
# ==============================================================================


@app.get(
    "/healthz",
    tags=["Probes"],
    summary="Lightweight container liveness probe (Unauthenticated)",
    status_code=status.HTTP_200_OK,
)
async def liveness_probe() -> dict:
    """Unauthenticated health ping for Docker / Kubernetes container liveness checks."""
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ==============================================================================
# Authenticated Diagnostic Endpoints
# ==============================================================================


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Complete health and OCR hardware diagnostic probe",
    status_code=status.HTTP_200_OK,
)
@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    tags=["Health"],
    summary="Namespaced complete health diagnostic probe",
    status_code=status.HTTP_200_OK,
)
async def health_check() -> HealthResponse:
    """Full health check inspecting OCR engine initialization, hardware mode, and service state."""
    engine_info = ocr_engine.get_engine_info()
    is_healthy = ocr_engine.is_healthy

    return HealthResponse(
        status="healthy" if is_healthy else "degraded",
        service=settings.SERVICE_NAME,
        version=settings.VERSION,
        environment=settings.ENV,
        ocrEngine=engine_info["name"],
        gpuAvailable=engine_info["gpuAvailable"],
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


# ==============================================================================
# Document Intelligence & OCR Extraction Endpoints
# ==============================================================================


@app.post(
    "/internal/v1/ocr/analyze",
    response_model=AnalyzeDocumentResponse,
    tags=["OCR Analysis"],
    summary="Comprehensive single document analysis, classification, and field verification",
    status_code=status.HTTP_200_OK,
)
async def analyze_document(request: AnalyzeDocumentRequest) -> AnalyzeDocumentResponse:
    """Analyze a single uploaded certificate or text: classifies type, extracts fields, and cross-checks with applicant form context."""
    return document_analyzer.analyze_document(request)


@app.post(
    "/internal/v1/ocr/analyze-batch",
    response_model=BatchAnalyzeResponse,
    tags=["OCR Analysis"],
    summary="Batch multi-document application bundle intelligence and consistency verification",
    status_code=status.HTTP_200_OK,
)
async def analyze_batch(request: BatchAnalyzeRequest) -> BatchAnalyzeResponse:
    """Analyze all certificates attached to an application bundle, verifying cross-document consistency and declared eligibility."""
    return document_analyzer.analyze_batch(request)


@app.get(
    "/",
    tags=["Root"],
    summary="Service metadata index",
    status_code=status.HTTP_200_OK,
)
async def root_index() -> dict:
    """Basic service identifier."""
    return {
        "name": "TribalScholar AI OCR Service",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
    }
