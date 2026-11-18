import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.ocr_engine import OcrEngineWrapper, ocr_engine
from app.schemas import DocumentType, HealthResponse

client = TestClient(app)


def test_healthz_unauthenticated():
    """Verify public liveness endpoint succeeds without API key."""
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == settings.SERVICE_NAME


def test_health_missing_api_key():
    """Verify GET /health rejects requests without X-Internal-Api-Key header."""
    response = client.get("/health")
    assert response.status_code == 401
    assert response.json() == {"detail": f"Missing {settings.INTERNAL_API_KEY_HEADER} header"}


def test_health_invalid_api_key():
    """Verify GET /health rejects requests with invalid X-Internal-Api-Key header."""
    response = client.get("/health", headers={settings.INTERNAL_API_KEY_HEADER: "invalid_secret_key_xyz"})
    assert response.status_code == 403
    assert response.json() == {"detail": "Invalid internal API key"}


def test_health_valid_api_key():
    """Verify GET /health returns 200 and healthy payload with valid internal API key."""
    response = client.get("/health", headers={settings.INTERNAL_API_KEY_HEADER: settings.INTERNAL_API_KEY})
    assert response.status_code == 200
    data = response.json()

    # Validate against Pydantic schema
    health = HealthResponse(**data)
    assert health.status == "healthy"
    assert health.service == settings.SERVICE_NAME
    assert health.version == settings.VERSION
    assert health.environment == settings.ENV
    assert isinstance(health.ocrEngine, str)
    assert len(health.ocrEngine) > 0
    assert isinstance(health.gpuAvailable, bool)
    assert health.timestamp is not None


def test_api_v1_health_valid_api_key():
    """Verify namespaced GET /api/v1/health returns 200 with valid key."""
    response = client.get("/api/v1/health", headers={settings.INTERNAL_API_KEY_HEADER: settings.INTERNAL_API_KEY})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == settings.SERVICE_NAME


def test_root_endpoint_authentication():
    """Verify root endpoint requires internal API key."""
    # Without header
    res_unauth = client.get("/")
    assert res_unauth.status_code == 401

    # With valid header
    res_auth = client.get("/", headers={settings.INTERNAL_API_KEY_HEADER: settings.INTERNAL_API_KEY})
    assert res_auth.status_code == 200
    assert res_auth.json()["name"] == "TribalScholar AI OCR Service"


def test_ocr_engine_wrapper_diagnostics():
    """Verify OCR engine wrapper diagnostic health check and info payload."""
    assert ocr_engine.is_healthy is True
    info = ocr_engine.get_engine_info()
    assert "name" in info
    assert "mode" in info
    assert "device" in info
    assert "gpuAvailable" in info
    assert info["isHealthy"] is True


def test_ocr_engine_deterministic_st_certificate():
    """Verify OCR engine synthetic extraction for ST Caste Certificate."""
    engine = OcrEngineWrapper(mode="synthetic")
    payload = engine.extract_document(
        file_bytes=b"dummy-caste-certificate-bytes",
        filename="caste_cert.pdf",
        document_type=DocumentType.ST_CASTE_CERTIFICATE,
        document_id="doc-st-001",
    )

    assert payload.documentId == "doc-st-001"
    assert payload.documentType == DocumentType.ST_CASTE_CERTIFICATE
    assert payload.overallConfidence >= 0.90
    assert "certificateNumber" in payload.extractedFields
    assert payload.extractedFields["certificateNumber"].normalizedValue == "CERT/JH/2024/ST/09842"
    assert "applicantName" in payload.extractedFields
    assert payload.extractedFields["applicantName"].normalizedValue == "Birsa Munda"
    assert "casteName" in payload.extractedFields
    assert payload.extractedFields["casteName"].normalizedValue == "Santhal"


def test_ocr_engine_deterministic_income_certificate():
    """Verify OCR engine synthetic extraction for Income Certificate."""
    engine = OcrEngineWrapper(mode="synthetic")
    payload = engine.extract_document(
        file_bytes=b"dummy-income-certificate-bytes",
        filename="income_cert.png",
        document_type=DocumentType.INCOME_CERTIFICATE,
        document_id="doc-inc-002",
    )

    assert payload.documentId == "doc-inc-002"
    assert payload.documentType == DocumentType.INCOME_CERTIFICATE
    assert "annualIncome" in payload.extractedFields
    assert payload.extractedFields["annualIncome"].normalizedValue == 80000
    assert payload.extractedFields["financialYear"].normalizedValue == "2025-2026"
