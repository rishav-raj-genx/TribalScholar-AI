import pytest

from app.extractor import StructuredFieldExtractor, structured_extractor
from app.schemas import DocumentType, OcrBoundingBox, OcrLine


# ==============================================================================
# Sample Document Texts
# ==============================================================================

PROPOSAL_INCOME_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE TEHSILDAR, RANCHI
ANNUAL INCOME CERTIFICATE
Certificate No: SAMPLE-2026-01482   Date: 14 FEB 2026
This is to certify that Shri Sample Applicant belongs to Scheduled Tribe (ST) Community.
Gross Annual Family Income from all sources is ₹80,000 per annum for the Financial Year 2025-2026.
Issued by: Competent Revenue Authority, Ranchi, Jharkhand.
"""

ST_CASTE_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE SUB-DIVISIONAL OFFICER, RANCHI
SCHEDULED TRIBE CERTIFICATE
Certificate No: CERT/JH/2024/ST/09842   Date: 20 JAN 2024
This is to certify that Shri Birsa Munda, son of Sugana Munda,
residing at Village Ulihatu, District Khunti, State of Jharkhand,
belongs to the Santhal Community, which is recognized as a Scheduled Tribe
under the Constitution (Scheduled Tribes) Order, 1950.
Prescribed Authority: Sub-Divisional Officer, Ranchi.
"""

DOMICILE_CERT = """
GOVERNMENT OF JHARKHAND
OFFICE OF THE DISTRICT MAGISTRATE, RANCHI
CERTIFICATE OF DOMICILE / PERMANENT RESIDENT
Certificate No: DOM/JH/2024/09123   Date: 10/02/2024
Certified that Shri Birsa Munda is ordinarily resident and a permanent resident
and domicile of the State of Jharkhand.
Issued by: District Magistrate, Ranchi.
"""

MARKSHEET_CERT = """
CENTRAL UNIVERSITY OF JHARKHAND
STATEMENT OF MARKS
Bachelor of Technology in Computer Science
Semester VI Examination - May 2024
Roll No: 2022CS012
Candidate Name: Birsa Munda
Aggregate Percentage: 78.4%   CGPA: 8.65 / 10.00
Result: PASSED IN FIRST CLASS WITH DISTINCTION
Controller of Examinations
"""

OVERSEAS_OFFER_CERT = """
UNIVERSITY OF OXFORD
Department of Computer Science
OFFER OF ADMISSION (UNCONDITIONAL)
Date: 15 March 2026
Dear Birsa Munda,
We are delighted to offer you unconditional admission to the Ph.D. in Computer Science program.
Tuition Fees: £28,500 per annum.
Confirmation of Acceptance for Studies (CAS Number): W92847192.
Faculty of Mathematical, Physical and Life Sciences.
"""


# ==============================================================================
# Unit & Integration Tests for Field Extraction
# ==============================================================================


def test_income_certificate_extraction_with_exact_proposal_fields():
    """Verify extraction of Income Certificate fields matching exact proposal UI mockup requirements."""
    fields = structured_extractor.extract_fields(PROPOSAL_INCOME_CERT, DocumentType.INCOME_CERTIFICATE)

    # 1. Applicant Name
    assert "applicantName" in fields
    assert fields["applicantName"].value == "Sample Applicant"
    assert fields["applicantName"].status == "VERIFIED"
    assert fields["applicantName"].confidence >= 0.85
    assert fields["applicantName"].evidence.fieldLabel == "name field"
    assert fields["applicantName"].evidence.evidenceString == "page 1 · name field"
    assert fields["applicantName"].evidence.page == 1

    # 2. Category
    assert "category" in fields
    assert fields["category"].value == "Scheduled Tribe (ST)"
    assert fields["category"].status == "VERIFIED"
    assert fields["category"].evidence.fieldLabel == "category field"
    assert fields["category"].evidence.evidenceString == "page 1 · category field"

    # 3. Annual Family Income (Numeric Normalization: ₹80,000 per annum -> 80000)
    assert "annualFamilyIncome" in fields
    assert fields["annualFamilyIncome"].value == 80000
    assert isinstance(fields["annualFamilyIncome"].value, int)
    assert fields["annualFamilyIncome"].status == "VERIFIED"
    assert fields["annualFamilyIncome"].evidence.fieldLabel == "income field"
    assert fields["annualFamilyIncome"].evidence.evidenceString == "page 1 · income field"

    # 4. Issuing Authority
    assert "issuingAuthority" in fields
    assert fields["issuingAuthority"].value == "Competent Revenue Authority"
    assert fields["issuingAuthority"].status == "VERIFIED"
    assert fields["issuingAuthority"].evidence.fieldLabel == "issuer field"
    assert fields["issuingAuthority"].evidence.evidenceString == "page 1 · issuer field"

    # 5. Certificate Reference Number
    assert "certificateRef" in fields
    assert fields["certificateRef"].value == "SAMPLE-2026-01482"
    assert fields["certificateRef"].status == "VERIFIED"
    assert fields["certificateRef"].evidence.fieldLabel == "ref field"
    assert fields["certificateRef"].evidence.evidenceString == "page 1 · ref field"

    # 6. Issue Date
    assert "issueDate" in fields
    assert fields["issueDate"].value == "14 FEB 2026"
    assert fields["issueDate"].status == "VERIFIED"
    assert fields["issueDate"].evidence.fieldLabel == "date field"
    assert fields["issueDate"].evidence.evidenceString == "page 1 · date field"

    # 7. State Domicile
    assert "stateDomicile" in fields
    assert fields["stateDomicile"].value == "Jharkhand"
    assert fields["stateDomicile"].evidence.fieldLabel == "state field"
    assert fields["stateDomicile"].evidence.evidenceString == "page 1 · state field"


@pytest.mark.parametrize(
    "raw_input,expected_numeric",
    [
        ("Annual Family Income is ₹80,000 per annum", 80000),
        ("Gross Annual Income: Rs. 80,000/- for FY 2025-2026", 80000),
        ("Total Income from all sources: INR 80,000.00", 80000),
        ("Annual income of scholar is Rs 1,50,000 per annum", 150000),
        ("Income: 250000", 250000),
        ("Family Income: ₹45,500.50", 45500.5),
    ],
)
def test_numeric_income_normalization_formats(raw_input: str, expected_numeric: float):
    """Verify numeric income normalization across currency symbols, commas, and suffixes."""
    fields = structured_extractor.extract_fields(raw_input, DocumentType.INCOME_CERTIFICATE)
    assert "annualFamilyIncome" in fields
    assert fields["annualFamilyIncome"].value == expected_numeric
    assert fields["annualFamilyIncome"].evidence.evidenceString == "page 1 · income field"


def test_st_caste_certificate_extraction():
    """Verify field extraction for Scheduled Tribe Caste Certificate."""
    fields = structured_extractor.extract_fields(ST_CASTE_CERT, DocumentType.ST_CASTE_CERTIFICATE)

    assert fields["applicantName"].value == "Birsa Munda"
    assert fields["applicantName"].evidence.evidenceString == "page 1 · name field"
    assert fields["category"].value == "Scheduled Tribe (ST)"
    assert fields["certificateRef"].value == "CERT/JH/2024/ST/09842"
    assert "Sub-Divisional Officer" in str(fields["issuingAuthority"].value)
    assert fields["issueDate"].value == "20 JAN 2024"
    assert fields["stateDomicile"].value == "Jharkhand"


def test_domicile_certificate_extraction():
    """Verify field extraction for Domicile / Permanent Residence Certificate."""
    fields = structured_extractor.extract_fields(DOMICILE_CERT, DocumentType.DOMICILE_CERTIFICATE)

    assert fields["applicantName"].value == "Birsa Munda"
    assert fields["stateDomicile"].value == "Jharkhand"
    assert fields["certificateRef"].value == "DOM/JH/2024/09123"
    assert "District Magistrate" in str(fields["issuingAuthority"].value)


def test_academic_marksheet_percentage_extraction():
    """Verify academic transcript extraction with percentage normalization."""
    fields = structured_extractor.extract_fields(MARKSHEET_CERT, DocumentType.ACADEMIC_MARKSHEET)

    assert fields["applicantName"].value == "Birsa Munda"
    assert fields["percentageMarks"].value == 78.4
    assert isinstance(fields["percentageMarks"].value, float)
    assert fields["percentageMarks"].evidence.evidenceString == "page 1 · marks field"
    assert fields["certificateRef"].value == "2022CS012"
    assert fields["issuingAuthority"].value == "Central University of Jharkhand"


def test_nos_overseas_admission_letter_extraction():
    """Verify Overseas Admission Letter extraction (CAS, tuition fees, institution)."""
    fields = structured_extractor.extract_fields(OVERSEAS_OFFER_CERT, DocumentType.OVERSEAS_ADMISSION_LETTER)

    assert fields["applicantName"].value == "Birsa Munda"
    assert fields["issuingAuthority"].value == "University of Oxford"
    assert fields["casNumber"].value == "W92847192"
    assert fields["tuitionFees"].value == 28500
    assert isinstance(fields["tuitionFees"].value, int)


def test_positional_anchor_extraction_multi_line():
    """Verify multi-line positional anchor extraction where label and value are on consecutive lines."""
    lines = [
        OcrLine(
            text="Name of Applicant:",
            confidence=0.98,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=50.0, y=100.0, width=150.0, height=20.0),
        ),
        OcrLine(
            text="Sample Applicant",
            confidence=0.97,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=50.0, y=125.0, width=160.0, height=20.0),
        ),
        OcrLine(
            text="Annual Family Income:",
            confidence=0.99,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=50.0, y=160.0, width=180.0, height=20.0),
        ),
        OcrLine(
            text="₹80,000 per annum",
            confidence=0.99,
            pageNumber=1,
            boundingBox=OcrBoundingBox(x=50.0, y=185.0, width=170.0, height=20.0),
        ),
    ]

    fields = structured_extractor.extract_fields(lines, DocumentType.INCOME_CERTIFICATE)

    assert "applicantName" in fields
    assert fields["applicantName"].value == "Sample Applicant"
    assert fields["applicantName"].evidence.bbox.y == 125.0
    assert fields["applicantName"].evidence.evidenceString == "page 1 · name field"

    assert "annualFamilyIncome" in fields
    assert fields["annualFamilyIncome"].value == 80000
    assert fields["annualFamilyIncome"].evidence.bbox.y == 185.0
    assert fields["annualFamilyIncome"].evidence.evidenceString == "page 1 · income field"


def test_evidence_metadata_contract():
    """Verify all extracted fields have structured evidence object matching proposal mockup."""
    fields = structured_extractor.extract_fields(PROPOSAL_INCOME_CERT, DocumentType.INCOME_CERTIFICATE)

    for field_name, field in fields.items():
        assert field.fieldName == field_name
        assert field.value is not None
        assert field.status == "VERIFIED"
        assert 0.0 <= field.confidence <= 1.0
        assert field.evidence is not None
        assert field.evidence.page >= 1
        assert len(field.evidence.fieldLabel) > 0
        assert len(field.evidence.rawSnippet) > 0
        assert field.evidence.evidenceString == f"page {field.evidence.page} · {field.evidence.fieldLabel}"
        assert str(field.evidence) == field.evidence.evidenceString
        assert field.evidenceString == field.evidence.evidenceString
