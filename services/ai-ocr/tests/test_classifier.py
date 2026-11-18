import cv2
import numpy as np
import pymupdf
import pytest

from app.classifier import DocumentClassifier, document_classifier
from app.ocr_engine import convert_pdf_to_images, ocr_engine, preprocess_image
from app.schemas import DocumentType, OcrBoundingBox, OcrLine


# ==============================================================================
# Sample Document Texts
# ==============================================================================

INCOME_CERT_TEXT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE TEHSILDAR, RANCHI
ANNUAL INCOME CERTIFICATE
Certificate No: INC/2025/JH/76129   Date: 14/05/2025
This is to certify that the Gross Annual Family Income from all sources of Shri Birsa Munda,
son of Shri Sugana Munda, resident of Village Ulihatu, District Khunti, Jharkhand,
is Rs. 80,000 (Rupees Eighty Thousand only) for the Financial Year 2025-2026.
Issued by Competent Authority under Revenue Department.
"""

ST_CASTE_CERT_TEXT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE SUB-DIVISIONAL OFFICER, RANCHI
SCHEDULED TRIBE CERTIFICATE
Certificate No: CERT/JH/2024/ST/09842   Date: 20/01/2024
This is to certify that Shri Birsa Munda, son of Sugana Munda,
residing at Village Ulihatu, District Khunti, State of Jharkhand,
belongs to the Santhal Community, which is recognized as a Scheduled Tribe
under the Constitution (Scheduled Tribes) Order, 1950 as amended from time to time.
Prescribed Authority / Sub-Divisional Magistrate.
"""

DOMICILE_CERT_TEXT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE DISTRICT MAGISTRATE, RANCHI
CERTIFICATE OF DOMICILE / PERMANENT RESIDENT
Certificate No: DOM/JH/2024/09123   Date: 10/02/2024
Certified that Birsa Munda, son of Sugana Munda, is ordinarily resident and a permanent resident
and domicile of the State of Jharkhand.
He has been residing in the State of Jharkhand continuously for more than 15 years.
Issued by District Magistrate / Executive Authority.
"""

MARKSHEET_TEXT = """
CENTRAL UNIVERSITY OF JHARKHAND
STATEMENT OF MARKS
Bachelor of Technology in Computer Science and Engineering
Semester VI Examination - May 2024
Roll No: 2022CS012   Registration No: CUJ2022098
Candidate Name: Birsa Munda
Course Code   Course Title                 Credits   Marks Obtained   Max Marks   Grade
CS601         Machine Learning                4            88            100        A+
CS602         Compiler Design                 4            82            100        A
CS603         Database Systems                4            90            100        O
Semester CGPA: 8.65 / 10.00   Aggregate Percentage: 78.4%
Result: PASSED IN FIRST CLASS WITH DISTINCTION
Controller of Examinations
"""

OVERSEAS_OFFER_TEXT = """
UNIVERSITY OF OXFORD
Department of Computer Science, Wolfson Building, Parks Road, Oxford, UK
OFFER OF ADMISSION (UNCONDITIONAL)
Date: 15 March 2026
Dear Birsa Munda,
We are delighted to offer you unconditional admission to the Doctor of Philosophy (Ph.D.)
in Computer Science program for the academic session commencing October 2026.
Program: Postgraduate Research (DPhil in Computer Science)
Tuition Fees: £28,500 per annum for overseas international students.
Confirmation of Acceptance for Studies (CAS Number): W92847192.
Faculty of Mathematical, Physical and Life Sciences.
"""

RESEARCH_PROPOSAL_TEXT = """
CENTRAL UNIVERSITY OF JHARKHAND
DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
SYNOPSIS OF PROPOSED DOCTORAL RESEARCH WORK
RESEARCH PROPOSAL FOR PH.D. ADMISSION
Title: Transformer-Based Neural Architectures for Low-Resource Tribal Dialects in Eastern India
Candidate Name: Birsa Munda
Proposed Research Supervisor: Prof. A. K. Sharma
1. Problem Statement & Research Objectives
2. Literature Review of Indigenous Language Processing
3. Proposed Research Methodology & Hypotheses
4. Expected Contributions & References
"""

BLURRED_GIBBERISH_TEXT = """
xkjq 8392 #$*@! 11a blur blur ???? ### zxcvbnm qwertyuiop
9999 1111 **** ???? .... ~~~~ ---- ++++ ====
"""


# ==============================================================================
# Document Classifier Tests
# ==============================================================================


def test_classify_income_certificate():
    """Verify classification of Income Certificate with high confidence."""
    result = document_classifier.classify_text(INCOME_CERT_TEXT)
    assert result.predictedType == DocumentType.INCOME_CERTIFICATE
    assert result.confidence >= 0.70
    assert result.isMatch is True
    assert len(result.evidenceTokens) > 0
    assert result.rejectionReason is None


def test_classify_st_caste_certificate():
    """Verify classification of ST Caste Certificate with distinctive tribal evidence."""
    result = document_classifier.classify_text(ST_CASTE_CERT_TEXT)
    assert result.predictedType == DocumentType.ST_CASTE_CERTIFICATE
    assert result.confidence >= 0.70
    assert result.isMatch is True
    assert len(result.evidenceTokens) > 0
    assert result.rejectionReason is None


def test_classify_domicile_certificate():
    """Verify classification of Domicile / Permanent Residence Certificate."""
    result = document_classifier.classify_text(DOMICILE_CERT_TEXT)
    assert result.predictedType == DocumentType.DOMICILE_CERTIFICATE
    assert result.confidence >= 0.70
    assert result.isMatch is True
    assert len(result.evidenceTokens) > 0
    assert result.rejectionReason is None


def test_classify_academic_marksheet():
    """Verify classification of Academic Marksheet / Transcript."""
    result = document_classifier.classify_text(MARKSHEET_TEXT)
    assert result.predictedType == DocumentType.ACADEMIC_MARKSHEET
    assert result.confidence >= 0.70
    assert result.isMatch is True
    assert len(result.evidenceTokens) > 0
    assert result.rejectionReason is None


def test_classify_overseas_admission_letter():
    """Verify classification of Overseas University Admission Offer Letter."""
    result = document_classifier.classify_text(OVERSEAS_OFFER_TEXT)
    assert result.predictedType == DocumentType.OVERSEAS_ADMISSION_LETTER
    assert result.confidence >= 0.70
    assert result.isMatch is True
    assert len(result.evidenceTokens) > 0
    assert result.rejectionReason is None


def test_classify_research_proposal():
    """Verify classification of Ph.D. Synopsis / Research Proposal."""
    result = document_classifier.classify_text(RESEARCH_PROPOSAL_TEXT)
    assert result.predictedType == DocumentType.RESEARCH_PROPOSAL
    assert result.confidence >= 0.70
    assert result.isMatch is True
    assert len(result.evidenceTokens) > 0
    assert result.rejectionReason is None


def test_mismatched_document_verification():
    """Verify rejection when an applicant uploads an Academic Marksheet instead of an Income Certificate."""
    is_valid, result = document_classifier.verify_document_type(
        expected_type=DocumentType.INCOME_CERTIFICATE,
        text=MARKSHEET_TEXT,
    )

    assert is_valid is False
    assert result.isMatch is False
    assert result.predictedType == DocumentType.ACADEMIC_MARKSHEET
    assert "does not match the expected requirement" in result.rejectionReason


def test_blurred_or_gibberish_text_rejected():
    """Verify rejection of low-quality, blurry, or unrecognized text."""
    result = document_classifier.classify_text(BLURRED_GIBBERISH_TEXT)
    assert result.predictedType == DocumentType.OTHER
    assert result.isMatch is False
    assert result.confidence < 0.40
    assert result.rejectionReason is not None


def test_empty_or_whitespace_text_rejected():
    """Verify empty or blank document texts are safely handled."""
    res_empty = document_classifier.classify_text("")
    assert res_empty.predictedType == DocumentType.OTHER
    assert res_empty.confidence == 0.0
    assert res_empty.isMatch is False
    assert "Empty or blank" in res_empty.rejectionReason

    res_spaces = document_classifier.classify_text("   \n\t  ")
    assert res_spaces.predictedType == DocumentType.OTHER
    assert res_spaces.confidence == 0.0
    assert res_spaces.isMatch is False


def test_classify_lines_with_ocr_line_objects():
    """Verify classification from structured OcrLine tokens with bounding boxes."""
    lines = [
        OcrLine(
            text="GOVERNMENT OF JHARKHAND",
            confidence=0.99,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=10, y=10, width=200, height=20),
        ),
        OcrLine(
            text="OFFICE OF THE TEHSILDAR",
            confidence=0.98,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=10, y=35, width=180, height=20),
        ),
        OcrLine(
            text="ANNUAL INCOME CERTIFICATE",
            confidence=0.99,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=10, y=60, width=220, height=20),
        ),
        OcrLine(
            text="Gross Annual Income from all sources is Rs. 80,000",
            confidence=0.97,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=10, y=85, width=300, height=20),
        ),
    ]

    result = document_classifier.classify_lines(lines)
    assert result.predictedType == DocumentType.INCOME_CERTIFICATE
    assert result.isMatch is True
    assert result.confidence >= 0.70


# ==============================================================================
# Image Pre-processing and PyMuPDF Pipeline Tests
# ==============================================================================


def test_image_preprocessing_pipeline():
    """Verify OpenCV pre-processing produces valid 3-channel contrast-enhanced arrays."""
    # Synthetic 100x100 low-contrast RGB image
    raw_img = np.full((100, 100, 3), 120, dtype=np.uint8)
    # Add darker text region
    raw_img[40:60, 20:80] = 50

    preprocessed = preprocess_image(raw_img, enhance_contrast=True)
    assert isinstance(preprocessed, np.ndarray)
    assert preprocessed.shape == (100, 100, 3)
    assert preprocessed.dtype == np.uint8
    # Dynamic range should be stretched across 0-255
    assert preprocessed.min() <= 50
    assert preprocessed.max() >= 200


def test_pdf_to_images_conversion():
    """Verify in-memory PDF rendering via PyMuPDF into RGB numpy images."""
    doc = pymupdf.open()
    page1 = doc.new_page(width=300, height=200)
    page1.insert_text((30, 50), "Page 1 - Income Certificate")
    page2 = doc.new_page(width=300, height=200)
    page2.insert_text((30, 50), "Page 2 - Statement")
    pdf_bytes = doc.tobytes()
    doc.close()

    images = convert_pdf_to_images(pdf_bytes, dpi=150)
    assert len(images) == 2
    for img in images:
        assert isinstance(img, np.ndarray)
        assert len(img.shape) == 3
        assert img.shape[2] == 3
        assert img.shape[0] > 0
        assert img.shape[1] > 0


def test_ocr_engine_extract_lines_synthetic():
    """Verify OCR engine line extraction outputs correctly structured OcrLine objects."""
    lines = ocr_engine.extract_lines(
        file_bytes=b"sample-pdf-bytes",
        filename="caste_certificate.pdf",
    )

    assert len(lines) > 0
    for line in lines:
        assert isinstance(line.text, str)
        assert len(line.text) > 0
        assert 0.0 <= line.confidence <= 1.0
        assert line.pageNumber >= 1
        assert line.boundingBox.width > 0
        assert line.boundingBox.height > 0


def test_ocr_engine_extract_lines_real_paddleocr():
    """Verify real PaddleOCR line detection, bounding box normalization, and classification on rendered PDF."""
    doc = pymupdf.open()
    page = doc.new_page(width=400, height=150)
    page.insert_text((30, 40), "INCOME CERTIFICATE 2026", fontsize=18)
    page.insert_text((30, 80), "Annual Income Rs 80000", fontsize=14)
    pdf_bytes = doc.tobytes()
    doc.close()

    lines = ocr_engine.extract_lines(pdf_bytes, filename="rendered_income.pdf")
    assert len(lines) >= 2
    detected_texts = [l.text for l in lines]
    assert any("INCOME CERTIFICATE" in t for t in detected_texts)
    assert any("80000" in t for t in detected_texts)

    # Classify the extracted lines
    result = document_classifier.classify_lines(lines)
    assert result.predictedType == DocumentType.INCOME_CERTIFICATE
    assert result.isMatch is True
    assert result.confidence >= 0.70

