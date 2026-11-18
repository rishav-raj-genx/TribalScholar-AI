import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.schemas import DocumentType

client = TestClient(app)
AUTH_HEADERS = {settings.INTERNAL_API_KEY_HEADER: settings.INTERNAL_API_KEY}


# ==============================================================================
# Sample Document Texts
# ==============================================================================

CLEAN_INCOME_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE TEHSILDAR, RANCHI
ANNUAL INCOME CERTIFICATE
Certificate No: SAMPLE-2026-01482   Date: 14 FEB 2026
This is to certify that Shri Sample Applicant belongs to Scheduled Tribe (ST) Community.
Gross Annual Family Income from all sources is ₹80,000 per annum for the Financial Year 2025-2026.
Issued by: Competent Revenue Authority, Ranchi, Jharkhand.
"""

CLEAN_ST_CASTE_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE SUB-DIVISIONAL OFFICER, RANCHI
SCHEDULED TRIBE CERTIFICATE
Certificate No: CERT/JH/2024/ST/09842   Date: 20 JAN 2024
This is to certify that Shri Sample Applicant, son of Sugana Munda,
residing at Village Ulihatu, District Khunti, State of Jharkhand,
belongs to the Santhal Community, which is recognized as a Scheduled Tribe
under the Constitution (Scheduled Tribes) Order, 1950.
Prescribed Authority: Sub-Divisional Officer, Ranchi.
"""

CLEAN_DOMICILE_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE DISTRICT MAGISTRATE, RANCHI
CERTIFICATE OF DOMICILE / PERMANENT RESIDENT
Certificate No: DOM/JH/2024/09123   Date: 10/02/2024
Certified that Shri Sample Applicant is ordinarily resident and a permanent resident
and domicile of the State of Jharkhand.
Issued by: District Magistrate, Ranchi.
"""

CLEAN_MARKSHEET_CERT = """
CENTRAL UNIVERSITY OF JHARKHAND
STATEMENT OF MARKS
Bachelor of Technology in Computer Science
Semester VI Examination - May 2024
Roll No: 2022CS012
Candidate Name: Sample Applicant
Aggregate Percentage: 78.4%   CGPA: 8.65 / 10.00
Result: PASSED IN FIRST CLASS WITH DISTINCTION
Controller of Examinations
"""

DEFICIENT_INCOME_MISMATCH_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE TEHSILDAR, RANCHI
ANNUAL INCOME CERTIFICATE
Certificate No: INC/2025/JH/99999   Date: 14 FEB 2026
This is to certify that Shri Sample Applicant belongs to Scheduled Tribe (ST) Community.
Gross Annual Family Income from all sources is ₹1,50,000 per annum for the Financial Year 2025-2026.
Issued by: Competent Revenue Authority, Ranchi, Jharkhand.
"""

BLURRED_CERT_TEXT = """
xkjq 8392 #$*@! 11a blur blur ???? ### zxcvbnm qwertyuiop
9999 1111 **** ???? .... ~~~~ ---- ++++ ====
"""


# ==============================================================================
# API Integration Tests for /internal/v1/ocr/analyze and analyze-batch
# ==============================================================================


def test_analyze_unauthorized_without_api_key():
    """Verify endpoint rejects requests missing X-Internal-Api-Key."""
    res = client.post(
        "/internal/v1/ocr/analyze",
        json={"documentId": "doc-1", "docType": "INCOME_CERTIFICATE", "text": CLEAN_INCOME_CERT},
    )
    assert res.status_code == 401
    assert "Missing" in res.json()["detail"]


def test_analyze_single_income_certificate_clean():
    """Verify single document analysis with exact proposal UI mockup fields and evidence strings."""
    payload = {
        "documentId": "doc-inc-001",
        "docType": "INCOME_CERTIFICATE",
        "text": CLEAN_INCOME_CERT,
        "applicantContext": {
            "name": "Sample Applicant",
            "category": "Scheduled Tribe (ST)",
            "annualIncome": 80000,
            "state": "Jharkhand",
        },
    }

    res = client.post("/internal/v1/ocr/analyze", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["documentId"] == "doc-inc-001"
    assert data["status"] == "VERIFIED"
    assert data["overallConfidence"] >= 0.85
    assert len(data["deficiencyReasons"]) == 0

    # Classification
    assert data["classification"]["predictedType"] == "INCOME_CERTIFICATE"
    assert data["classification"]["isMatch"] is True

    # Extracted fields matching proposal mockup
    fields = data["extractedFields"]
    assert fields["applicantName"]["value"] == "Sample Applicant"
    assert fields["applicantName"]["evidence"]["evidenceString"] == "page 1 · name field"
    assert fields["category"]["value"] == "Scheduled Tribe (ST)"
    assert fields["category"]["evidence"]["evidenceString"] == "page 1 · category field"
    assert fields["annualFamilyIncome"]["value"] == 80000
    assert fields["annualFamilyIncome"]["evidence"]["evidenceString"] == "page 1 · income field"
    assert fields["issuingAuthority"]["value"] == "Competent Revenue Authority"
    assert fields["issuingAuthority"]["evidence"]["evidenceString"] == "page 1 · issuer field"
    assert fields["certificateRef"]["value"] == "SAMPLE-2026-01482"
    assert fields["certificateRef"]["evidence"]["evidenceString"] == "page 1 · ref field"
    assert fields["issueDate"]["value"] == "14 FEB 2026"
    assert fields["issueDate"]["evidence"]["evidenceString"] == "page 1 · date field"

    # Context Comparisons
    comparisons = {c["field"]: c for c in data["comparisons"]}
    assert comparisons["applicantName"]["isMatch"] is True
    assert comparisons["annualFamilyIncome"]["isMatch"] is True
    assert comparisons["category"]["isMatch"] is True
    assert comparisons["stateDomicile"]["isMatch"] is True


def test_analyze_batch_clean_4_of_4_set():
    """Verify batch analysis of clean 4/4 document set produces VERIFIED overall status."""
    payload = {
        "applicationId": "app-sih-2026-0001",
        "applicantContext": {
            "name": "Sample Applicant",
            "category": "Scheduled Tribe (ST)",
            "annualIncome": 80000,
            "state": "Jharkhand",
        },
        "documents": [
            {
                "documentId": "doc-income",
                "docType": "INCOME_CERTIFICATE",
                "text": CLEAN_INCOME_CERT,
            },
            {
                "documentId": "doc-caste",
                "docType": "ST_CASTE_CERTIFICATE",
                "text": CLEAN_ST_CASTE_CERT,
            },
            {
                "documentId": "doc-domicile",
                "docType": "DOMICILE_CERTIFICATE",
                "text": CLEAN_DOMICILE_CERT,
            },
            {
                "documentId": "doc-marksheet",
                "docType": "ACADEMIC_MARKSHEET",
                "text": CLEAN_MARKSHEET_CERT,
            },
        ],
    }

    res = client.post("/internal/v1/ocr/analyze-batch", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["success"] is True
    assert data["applicationId"] == "app-sih-2026-0001"
    assert data["overallStatus"] == "VERIFIED"
    assert data["totalDocuments"] == 4
    assert data["verifiedCount"] == 4
    assert data["deficientCount"] == 0
    assert len(data["deficiencies"]) == 0
    assert "4/4 documents cleanly verified" in data["summary"]

    # Pairwise cross-document checks
    assert len(data["crossDocChecks"]) >= 3
    for check in data["crossDocChecks"]:
        assert check["status"] == "MATCH"


def test_analyze_deficient_income_mismatch():
    """Verify detection of income discrepancy (declared ₹80,000, certificate shows ₹1,50,000)."""
    payload = {
        "documentId": "doc-inc-bad",
        "docType": "INCOME_CERTIFICATE",
        "text": DEFICIENT_INCOME_MISMATCH_CERT,
        "applicantContext": {
            "name": "Sample Applicant",
            "annualIncome": 80000,
        },
    }

    res = client.post("/internal/v1/ocr/analyze", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "DEFICIENT"
    assert len(data["deficiencyReasons"]) >= 1
    assert any("exceeds declared annual income" in d for d in data["deficiencyReasons"])

    comparisons = {c["field"]: c for c in data["comparisons"]}
    assert comparisons["annualFamilyIncome"]["isMatch"] is False
    assert comparisons["annualFamilyIncome"]["extractedValue"] == 150000


def test_analyze_deficient_blurred_certificate():
    """Verify detection of blurred, unreadable, or noisy certificate uploads."""
    payload = {
        "documentId": "doc-blurred-001",
        "docType": "INCOME_CERTIFICATE",
        "text": BLURRED_CERT_TEXT,
    }

    res = client.post("/internal/v1/ocr/analyze", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "DEFICIENT"
    assert data["classification"]["predictedType"] == "OTHER"
    assert len(data["deficiencyReasons"]) >= 1


def test_analyze_deficient_wrong_document_type():
    """Verify detection when user uploads Marksheet instead of requested Income Certificate."""
    payload = {
        "documentId": "doc-wrong-type",
        "docType": "INCOME_CERTIFICATE",
        "text": CLEAN_MARKSHEET_CERT,
    }

    res = client.post("/internal/v1/ocr/analyze", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "DEFICIENT"
    assert data["classification"]["predictedType"] == "ACADEMIC_MARKSHEET"
    assert any("does not match the expected requirement" in d for d in data["deficiencyReasons"])


def test_analyze_batch_deficient_set():
    """Verify batch analysis reports DEFICIENT overall status when one document has a discrepancy."""
    payload = {
        "applicationId": "app-deficient-bundle",
        "applicantContext": {
            "name": "Sample Applicant",
            "annualIncome": 80000,
            "category": "Scheduled Tribe (ST)",
        },
        "documents": [
            {
                "documentId": "doc-1-clean",
                "docType": "ST_CASTE_CERTIFICATE",
                "text": CLEAN_ST_CASTE_CERT,
            },
            {
                "documentId": "doc-2-bad-income",
                "docType": "INCOME_CERTIFICATE",
                "text": DEFICIENT_INCOME_MISMATCH_CERT,
            },
        ],
    }

    res = client.post("/internal/v1/ocr/analyze-batch", json=payload, headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()

    assert data["overallStatus"] == "DEFICIENT"
    assert data["totalDocuments"] == 2
    assert data["verifiedCount"] == 1
    assert data["deficientCount"] == 1
    assert len(data["deficiencies"]) >= 1
    assert "flagged with deficiencies" in data["summary"]
