from pathlib import Path
import pytest

from app.analyzer import document_analyzer
from app.classifier import document_classifier
from app.extractor import structured_extractor
from app.ocr_engine import ocr_engine
from app.schemas import (
    AnalyzeDocumentRequest,
    BatchAnalyzeRequest,
    CrossDocCheckStatus,
    DocumentType,
)

# Root directory of the repository and demo-assets directory
REPO_ROOT = Path(__file__).resolve().parents[3]
DEMO_ASSETS_DIR = REPO_ROOT / "demo-assets"

EXPECTED_FILES = [
    "income_certificate_deficient.png",
    "income_certificate_deficient.pdf",
    "income_certificate_valid.png",
    "income_certificate_valid.pdf",
    "st_caste_certificate_valid.png",
    "st_caste_certificate_valid.pdf",
    "domicile_certificate_valid.png",
    "domicile_certificate_valid.pdf",
    "academic_marksheet_valid.png",
    "academic_marksheet_valid.pdf",
]


# ==============================================================================
# 1. Disk Existence & Asset Integrity Checks
# ==============================================================================

def test_demo_assets_exist_on_disk():
    """Verify all 5 PNG and 5 PDF synthetic certificates exist on disk with valid file sizes."""
    assert DEMO_ASSETS_DIR.exists(), f"Demo assets directory does not exist: {DEMO_ASSETS_DIR}"

    for filename in EXPECTED_FILES:
        filepath = DEMO_ASSETS_DIR / filename
        assert filepath.exists(), f"Expected demo asset {filename} not found at {filepath}"
        file_size = filepath.stat().st_size
        assert file_size > 50_000, f"File {filename} is suspiciously small ({file_size} bytes)"


# ==============================================================================
# 2. Valid Income Certificate OCR & Extraction
# ==============================================================================

def test_income_certificate_valid_ocr_extraction():
    """Verify PaddleOCR extraction of income_certificate_valid.png matching proposal mockup exactly."""
    img_path = DEMO_ASSETS_DIR / "income_certificate_valid.png"
    file_bytes = img_path.read_bytes()

    # 1. OCR Line Detection
    lines = ocr_engine.extract_lines(file_bytes, filename=img_path.name)
    assert len(lines) >= 20, f"Too few lines detected in {img_path.name}: {len(lines)}"

    full_text = "\n".join(l.text for l in lines)

    # 2. Document Classification
    is_match, class_res = document_classifier.verify_document_type(
        expected_type=DocumentType.INCOME_CERTIFICATE,
        text=full_text,
        lines=lines,
    )
    assert is_match is True
    assert class_res.predictedType == DocumentType.INCOME_CERTIFICATE
    assert class_res.confidence >= 0.70

    # 3. Field Extraction matching Proposal Page 4 Mockup
    fields = structured_extractor.extract_fields(lines, DocumentType.INCOME_CERTIFICATE)
    assert "applicantName" in fields
    assert fields["applicantName"].value == "Sample Applicant"
    assert fields["applicantName"].confidence >= 0.85

    assert "category" in fields
    assert fields["category"].value == "Scheduled Tribe (ST)"

    assert "annualFamilyIncome" in fields
    assert fields["annualFamilyIncome"].value == 80000
    assert isinstance(fields["annualFamilyIncome"].value, int)

    assert "certificateRef" in fields
    assert fields["certificateRef"].value == "SAMPLE-2026-01482"

    assert "issueDate" in fields
    assert fields["issueDate"].value == "14 FEB 2026"

    assert "issuingAuthority" in fields
    assert "Competent Revenue Authority" in fields["issuingAuthority"].value

    assert "stateDomicile" in fields
    assert fields["stateDomicile"].value == "Jharkhand"

    # 4. Single Document Intelligence Analysis against declared applicant context
    applicant_ctx = {
        "name": "Sample Applicant",
        "annualIncome": 80000,
        "category": "Scheduled Tribe (ST)",
        "state": "Jharkhand",
    }
    req = AnalyzeDocumentRequest(
        documentId="income-cert-valid",
        expectedType=DocumentType.INCOME_CERTIFICATE,
        lines=lines,
        applicantContext=applicant_ctx,
    )
    analysis = document_analyzer.analyze_document(req)
    assert analysis.success is True
    assert analysis.status == "VERIFIED"
    assert len(analysis.deficiencyReasons) == 0
    assert analysis.overallConfidence >= 0.80


# ==============================================================================
# 3. Deficient Income Certificate OCR & Cross-Doc Mismatch Flag
# ==============================================================================

def test_income_certificate_deficient_ocr_extraction_and_mismatch():
    """Verify PaddleOCR extraction of income_certificate_deficient.png and deficiency flagging."""
    img_path = DEMO_ASSETS_DIR / "income_certificate_deficient.png"
    file_bytes = img_path.read_bytes()

    lines = ocr_engine.extract_lines(file_bytes, filename=img_path.name)
    assert len(lines) >= 20

    full_text = "\n".join(l.text for l in lines)
    is_match, class_res = document_classifier.verify_document_type(
        expected_type=DocumentType.INCOME_CERTIFICATE,
        text=full_text,
        lines=lines,
    )
    assert is_match is True
    assert class_res.predictedType == DocumentType.INCOME_CERTIFICATE

    fields = structured_extractor.extract_fields(lines, DocumentType.INCOME_CERTIFICATE)
    assert fields["annualFamilyIncome"].value == 120000
    assert fields["certificateRef"].value == "SAMPLE-2026-01482"

    # Declared form entry is ₹80,000; certificate shows ₹1,20,000 -> Triggers DEFICIENT status
    declared_ctx = {
        "name": "Sample Applicant",
        "annualIncome": 80000,
        "category": "Scheduled Tribe (ST)",
    }
    req = AnalyzeDocumentRequest(
        documentId="income-cert-deficient",
        expectedType=DocumentType.INCOME_CERTIFICATE,
        lines=lines,
        applicantContext=declared_ctx,
    )
    analysis = document_analyzer.analyze_document(req)
    assert analysis.success is True
    assert analysis.status == "DEFICIENT"
    assert any("120,000" in d and "80,000" in d for d in analysis.deficiencyReasons)


# ==============================================================================
# 4. Scheduled Tribe (ST) Caste Certificate OCR
# ==============================================================================

def test_st_caste_certificate_valid_ocr_extraction():
    """Verify PaddleOCR extraction of st_caste_certificate_valid.png."""
    img_path = DEMO_ASSETS_DIR / "st_caste_certificate_valid.png"
    file_bytes = img_path.read_bytes()

    lines = ocr_engine.extract_lines(file_bytes, filename=img_path.name)
    assert len(lines) >= 20

    full_text = "\n".join(l.text for l in lines)
    is_match, class_res = document_classifier.verify_document_type(
        expected_type=DocumentType.ST_CASTE_CERTIFICATE,
        text=full_text,
        lines=lines,
    )
    assert is_match is True
    assert class_res.predictedType == DocumentType.ST_CASTE_CERTIFICATE

    fields = structured_extractor.extract_fields(lines, DocumentType.ST_CASTE_CERTIFICATE)
    assert "applicantName" in fields
    assert fields["applicantName"].value == "Sample Applicant"

    assert "category" in fields
    assert fields["category"].value == "Scheduled Tribe (ST)"

    assert "certificateRef" in fields
    assert fields["certificateRef"].value == "CERT/JH/2024/ST/09842"

    assert "issueDate" in fields
    assert fields["issueDate"].value == "20 JAN 2024"

    assert "stateDomicile" in fields
    assert fields["stateDomicile"].value == "Jharkhand"

    assert "issuingAuthority" in fields
    assert "Sub-Divisional Officer" in fields["issuingAuthority"].value

    req = AnalyzeDocumentRequest(
        documentId="st-caste-valid",
        expectedType=DocumentType.ST_CASTE_CERTIFICATE,
        lines=lines,
        applicantContext={"name": "Sample Applicant", "category": "Scheduled Tribe (ST)"},
    )
    analysis = document_analyzer.analyze_document(req)
    assert analysis.status == "VERIFIED"
    assert len(analysis.deficiencyReasons) == 0


# ==============================================================================
# 5. Domicile / Permanent Resident Certificate OCR
# ==============================================================================

def test_domicile_certificate_valid_ocr_extraction():
    """Verify PaddleOCR extraction of domicile_certificate_valid.png."""
    img_path = DEMO_ASSETS_DIR / "domicile_certificate_valid.png"
    file_bytes = img_path.read_bytes()

    lines = ocr_engine.extract_lines(file_bytes, filename=img_path.name)
    assert len(lines) >= 20

    full_text = "\n".join(l.text for l in lines)
    is_match, class_res = document_classifier.verify_document_type(
        expected_type=DocumentType.DOMICILE_CERTIFICATE,
        text=full_text,
        lines=lines,
    )
    assert is_match is True
    assert class_res.predictedType == DocumentType.DOMICILE_CERTIFICATE

    fields = structured_extractor.extract_fields(lines, DocumentType.DOMICILE_CERTIFICATE)
    assert "applicantName" in fields
    assert fields["applicantName"].value == "Sample Applicant"

    assert "certificateRef" in fields
    assert fields["certificateRef"].value == "DOM/JH/2024/09123"

    assert "stateDomicile" in fields
    assert fields["stateDomicile"].value == "Jharkhand"

    assert "issuingAuthority" in fields
    assert "District Magistrate" in fields["issuingAuthority"].value

    req = AnalyzeDocumentRequest(
        documentId="domicile-valid",
        expectedType=DocumentType.DOMICILE_CERTIFICATE,
        lines=lines,
        applicantContext={"name": "Sample Applicant", "state": "Jharkhand"},
    )
    analysis = document_analyzer.analyze_document(req)
    assert analysis.status == "VERIFIED"
    assert len(analysis.deficiencyReasons) == 0


# ==============================================================================
# 6. Academic Marksheet & Transcript OCR
# ==============================================================================

def test_academic_marksheet_valid_ocr_extraction():
    """Verify PaddleOCR extraction of academic_marksheet_valid.png."""
    img_path = DEMO_ASSETS_DIR / "academic_marksheet_valid.png"
    file_bytes = img_path.read_bytes()

    lines = ocr_engine.extract_lines(file_bytes, filename=img_path.name)
    assert len(lines) >= 25

    full_text = "\n".join(l.text for l in lines)
    is_match, class_res = document_classifier.verify_document_type(
        expected_type=DocumentType.ACADEMIC_MARKSHEET,
        text=full_text,
        lines=lines,
    )
    assert is_match is True
    assert class_res.predictedType == DocumentType.ACADEMIC_MARKSHEET

    fields = structured_extractor.extract_fields(lines, DocumentType.ACADEMIC_MARKSHEET)
    assert "applicantName" in fields
    assert fields["applicantName"].value == "Sample Applicant"

    assert "percentageMarks" in fields
    assert fields["percentageMarks"].value == 78.4

    assert "certificateRef" in fields
    assert fields["certificateRef"].value == "2022CS012"

    assert "issuingAuthority" in fields
    assert "Central University of Jharkhand" in fields["issuingAuthority"].value

    req = AnalyzeDocumentRequest(
        documentId="marksheet-valid",
        expectedType=DocumentType.ACADEMIC_MARKSHEET,
        lines=lines,
        applicantContext={"name": "Sample Applicant"},
    )
    analysis = document_analyzer.analyze_document(req)
    assert analysis.status == "VERIFIED"
    assert len(analysis.deficiencyReasons) == 0


# ==============================================================================
# 7. End-to-End Batch Cross-Document Verification Suite
# ==============================================================================

def test_batch_cross_document_verification_clean_set():
    """Verify batch multi-document cross-consistency across the 4 valid demo certificates."""
    valid_docs = [
        ("income_certificate_valid.png", DocumentType.INCOME_CERTIFICATE),
        ("st_caste_certificate_valid.png", DocumentType.ST_CASTE_CERTIFICATE),
        ("domicile_certificate_valid.png", DocumentType.DOMICILE_CERTIFICATE),
        ("academic_marksheet_valid.png", DocumentType.ACADEMIC_MARKSHEET),
    ]

    doc_requests = []
    for filename, doc_type in valid_docs:
        img_path = DEMO_ASSETS_DIR / filename
        lines = ocr_engine.extract_lines(img_path.read_bytes(), filename=filename)
        doc_requests.append(
            AnalyzeDocumentRequest(
                documentId=filename,
                expectedType=doc_type,
                lines=lines,
            )
        )

    batch_req = BatchAnalyzeRequest(
        applicationId="APP-DEMO-2026-CLEAN",
        applicantContext={
            "name": "Sample Applicant",
            "annualIncome": 80000,
            "category": "Scheduled Tribe (ST)",
            "state": "Jharkhand",
        },
        documents=doc_requests,
    )

    batch_resp = document_analyzer.analyze_batch(batch_req)
    assert batch_resp.success is True
    assert batch_resp.overallStatus == "VERIFIED"
    assert batch_resp.totalDocuments == 4
    assert batch_resp.verifiedCount == 4
    assert batch_resp.deficientCount == 0
    assert len(batch_resp.deficiencies) == 0

    # Pairwise cross-document name checks must all MATCH
    for check in batch_resp.crossDocChecks:
        assert check.status == CrossDocCheckStatus.MATCH
        assert check.matchScore == 1.0


def test_batch_cross_document_verification_with_deficient_income():
    """Verify batch multi-document cross-consistency flags deficient status when income mismatches."""
    mixed_docs = [
        ("income_certificate_deficient.png", DocumentType.INCOME_CERTIFICATE),
        ("st_caste_certificate_valid.png", DocumentType.ST_CASTE_CERTIFICATE),
        ("domicile_certificate_valid.png", DocumentType.DOMICILE_CERTIFICATE),
        ("academic_marksheet_valid.png", DocumentType.ACADEMIC_MARKSHEET),
    ]

    doc_requests = []
    for filename, doc_type in mixed_docs:
        img_path = DEMO_ASSETS_DIR / filename
        lines = ocr_engine.extract_lines(img_path.read_bytes(), filename=filename)
        doc_requests.append(
            AnalyzeDocumentRequest(
                documentId=filename,
                expectedType=doc_type,
                lines=lines,
            )
        )

    batch_req = BatchAnalyzeRequest(
        applicationId="APP-DEMO-2026-DEFICIENT",
        applicantContext={
            "name": "Sample Applicant",
            "annualIncome": 80000,
            "category": "Scheduled Tribe (ST)",
            "state": "Jharkhand",
        },
        documents=doc_requests,
    )

    batch_resp = document_analyzer.analyze_batch(batch_req)
    assert batch_resp.success is True
    assert batch_resp.overallStatus == "DEFICIENT"
    assert batch_resp.totalDocuments == 4
    assert batch_resp.verifiedCount == 3
    assert batch_resp.deficientCount == 1
    assert any("Certificate income (₹120,000) exceeds declared annual income (₹80,000)" in d for d in batch_resp.deficiencies)
