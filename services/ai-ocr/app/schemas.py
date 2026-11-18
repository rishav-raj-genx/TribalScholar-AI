from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Document classification types mirroring @tribalscholar/shared enums."""

    AADHAAR_CARD = "AADHAAR_CARD"
    CASTE_CERTIFICATE = "CASTE_CERTIFICATE"
    ST_CASTE_CERTIFICATE = "ST_CASTE_CERTIFICATE"
    INCOME_CERTIFICATE = "INCOME_CERTIFICATE"
    DOMICILE_CERTIFICATE = "DOMICILE_CERTIFICATE"
    MARKSHEET_10TH = "MARKSHEET_10TH"
    MARKSHEET_12TH = "MARKSHEET_12TH"
    MARKSHEET_UG = "MARKSHEET_UG"
    MARKSHEET_PG = "MARKSHEET_PG"
    ACADEMIC_MARKSHEET = "ACADEMIC_MARKSHEET"
    ADMISSION_OFFER_LETTER = "ADMISSION_OFFER_LETTER"
    OVERSEAS_ADMISSION_LETTER = "OVERSEAS_ADMISSION_LETTER"
    BONAFIDE_CERTIFICATE = "BONAFIDE_CERTIFICATE"
    FEE_RECEIPT = "FEE_RECEIPT"
    BANK_PASSBOOK = "BANK_PASSBOOK"
    SYNOPSIS_RESEARCH_PROPOSAL = "SYNOPSIS_RESEARCH_PROPOSAL"
    RESEARCH_PROPOSAL = "RESEARCH_PROPOSAL"
    JOINING_REPORT = "JOINING_REPORT"
    OTHER = "OTHER"


class CrossDocCheckStatus(str, Enum):
    """Consistency match status mirroring @tribalscholar/shared enums."""

    MATCH = "MATCH"
    PARTIAL_MATCH = "PARTIAL_MATCH"
    MISMATCH = "MISMATCH"
    MISSING_SOURCE = "MISSING_SOURCE"


class OcrBoundingBox(BaseModel):
    """Spatial coordinates for OCR bounding polygon/box."""

    x: float = Field(ge=0.0, description="Top-left horizontal pixel coordinate")
    y: float = Field(ge=0.0, description="Top-left vertical pixel coordinate")
    width: float = Field(ge=0.0, description="Width in pixels")
    height: float = Field(ge=0.0, description="Height in pixels")


class OcrLine(BaseModel):
    """Line-level extraction item with spatial coordinates and confidence."""

    text: str = Field(description="Detected text string for the line")
    confidence: float = Field(ge=0.0, le=1.0, description="Normalized detection confidence")
    pageNumber: int = Field(default=1, ge=1, description="1-based page index")
    boundingBox: OcrBoundingBox = Field(description="Bounding box surrounding text line")
    polygon: Optional[List[List[float]]] = Field(default=None, description="Original 4-point polygon coordinates")


class ClassificationResult(BaseModel):
    """Document classification inference result with confidence and evidence."""

    predictedType: DocumentType = Field(description="Inferred canonical document type")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence of classification")
    isMatch: bool = Field(default=True, description="Whether document matches expected type or passed threshold")
    evidenceTokens: List[str] = Field(default_factory=list, description="Keywords and patterns providing evidence")
    scores: Dict[str, float] = Field(default_factory=dict, description="Relative confidence scores per document type")
    rejectionReason: Optional[str] = Field(default=None, description="Detailed explanation if invalid or mismatched")


class FieldEvidence(BaseModel):
    """Metadata evidence locating an extracted field in the document for officer review."""

    page: int = Field(default=1, ge=1, description="Page index where field was found (1-based)")
    fieldLabel: str = Field(description="Evidence label, e.g. 'name field', 'income field'")
    bbox: Optional[OcrBoundingBox] = Field(default=None, description="Spatial coordinates")
    rawSnippet: str = Field(description="Raw text line or surrounding snippet containing field")
    evidenceString: Optional[str] = Field(default=None, description="Formatted summary, e.g. 'page 1 · income field'")

    def model_post_init(self, __context: Any) -> None:
        if not self.evidenceString:
            self.evidenceString = f"page {self.page} · {self.fieldLabel}"

    def __str__(self) -> str:
        return self.evidenceString or f"page {self.page} · {self.fieldLabel}"


class ExtractedField(BaseModel):
    """Structured typed field extraction matching proposal UI mockup."""

    fieldName: str = Field(description="Identifier of extracted field")
    value: Union[str, float, int, bool] = Field(description="Normalized typed value")
    status: str = Field(default="VERIFIED", description="Verification status: VERIFIED, WARNING, UNRESOLVED")
    confidence: float = Field(ge=0.0, le=1.0, description="Extraction confidence score [0.0 - 1.0]")
    evidence: FieldEvidence = Field(description="Traceable visual and textual evidence")
    rawText: Optional[str] = Field(default=None, description="Original unnormalized raw string")

    @property
    def evidenceString(self) -> str:
        return self.evidence.evidenceString or f"page {self.evidence.page} · {self.evidence.fieldLabel}"

    @property
    def normalizedValue(self) -> Union[str, float, int, bool]:
        return self.value


class OcrFieldExtraction(BaseModel):
    """Structured extraction result for a specific document field."""

    fieldName: str = Field(min_length=1, description="Normalized field name")
    rawText: str = Field(description="Raw text detected by OCR engine")
    normalizedValue: Union[str, float, int, bool] = Field(description="Cleaned, typed, normalized value")
    confidence: float = Field(ge=0.0, le=1.0, description="Extraction confidence score [0.0 - 1.0]")
    pageNumber: int = Field(default=1, ge=1, description="Page index where field was located (1-based)")
    boundingBox: Optional[OcrBoundingBox] = Field(default=None, description="Optional bounding box")
    status: str = Field(default="VERIFIED", description="Verification state: VERIFIED, WARNING, UNRESOLVED")
    evidence: Optional[FieldEvidence] = Field(default=None, description="Exact evidence metadata")


class DocValue(BaseModel):
    """Field reference in a cross-document consistency check."""

    documentType: DocumentType
    extractedValue: str
    confidence: float = Field(ge=0.0, le=1.0)


class CrossDocCheckItem(BaseModel):
    """Single field consistency verification across two documents."""

    field: str = Field(min_length=1, description="Field being verified across documents")
    sourceDocument: DocValue
    targetDocument: DocValue
    matchScore: float = Field(ge=0.0, le=1.0, description="Calculated similarity score")
    status: CrossDocCheckStatus
    notes: Optional[str] = Field(default=None, description="Diagnostic notes or mismatch reason")


class OcrEvidencePayload(BaseModel):
    """Complete evidence payload for a processed document, stored in Prisma ApplicationDocument.ocrData."""

    documentId: str = Field(min_length=1, description="ApplicationDocument record identifier")
    documentType: DocumentType
    pageCount: int = Field(ge=1, description="Total pages processed")
    overallConfidence: float = Field(ge=0.0, le=1.0, description="Average OCR confidence across document")
    extractedFields: Dict[str, OcrFieldExtraction] = Field(
        default_factory=dict, description="Dictionary of named field extractions"
    )
    rawText: Optional[str] = Field(default=None, description="Full raw concatenated OCR text")
    processingTimeMs: Optional[float] = Field(default=None, ge=0.0, description="Processing duration in milliseconds")
    processedAt: str = Field(description="ISO 8601 UTC timestamp of processing")


class CrossDocEvidenceReport(BaseModel):
    """Application-level consistency verification report."""

    applicationId: str = Field(min_length=1, description="Target scholarship application ID")
    checks: List[CrossDocCheckItem] = Field(default_factory=list, description="List of pairwise field checks")
    inconsistenciesDetected: bool = Field(description="Whether any blocking or partial discrepancies exist")
    summary: str = Field(description="Human-readable executive summary of verification")
    verifiedAt: str = Field(description="ISO 8601 UTC timestamp")


# ==============================================================================
# Microservice HTTP API Request / Response DTOs
# ==============================================================================


class HealthResponse(BaseModel):
    """Health check diagnostic response."""

    status: str = Field(description="Health status indicator ('healthy', 'degraded')")
    service: str = Field(description="Microservice identifier")
    version: str = Field(description="Service semantic version")
    environment: str = Field(description="Environment name")
    ocrEngine: str = Field(description="Active OCR engine backend")
    gpuAvailable: bool = Field(description="Whether CUDA / GPU acceleration is enabled")
    timestamp: str = Field(description="ISO 8601 current UTC timestamp")


class OcrExtractionRequest(BaseModel):
    """Request payload for OCR document extraction."""

    documentId: str = Field(min_length=1)
    documentType: DocumentType
    applicantId: Optional[str] = None
    applicationId: Optional[str] = None
    options: Optional[Dict[str, Any]] = None


class OcrExtractionResponse(BaseModel):
    """Response payload for OCR document extraction."""

    success: bool
    data: Optional[OcrEvidencePayload] = None
    error: Optional[str] = None


class CrossDocValidationRequest(BaseModel):
    """Request payload for cross-document consistency verification."""

    applicationId: str = Field(min_length=1)
    documents: List[OcrEvidencePayload] = Field(min_length=1)


class CrossDocValidationResponse(BaseModel):
    """Response payload for cross-document consistency verification."""

    success: bool
    data: Optional[CrossDocEvidenceReport] = None
    error: Optional[str] = None


# ==============================================================================
# Intelligence & Document Analysis DTOs
# ==============================================================================


class FieldComparisonItem(BaseModel):
    """Comparison result between declared applicant profile context and OCR extracted field."""

    field: str = Field(description="Name of the field verified")
    declaredValue: Union[str, float, int, bool] = Field(description="Value declared in intake application form")
    extractedValue: Union[str, float, int, bool] = Field(description="Value extracted by AI OCR service")
    isMatch: bool = Field(description="Whether extracted and declared values match according to criteria")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score of comparison")
    evidenceString: Optional[str] = Field(default=None, description="Proposal mockup evidence tag, e.g. 'page 1 · income field'")
    notes: Optional[str] = Field(default=None, description="Diagnostic observation or mismatch reason")


class AnalyzeDocumentRequest(BaseModel):
    """Request payload for comprehensive document analysis."""

    documentId: str = Field(default="doc-1", description="ApplicationDocument record identifier")
    expectedType: DocumentType = Field(default=DocumentType.INCOME_CERTIFICATE, alias="docType", description="Expected MOTA document type")
    text: Optional[str] = Field(default=None, description="Raw OCR text content")
    fileBase64: Optional[str] = Field(default=None, description="Base64 encoded PDF or image bytes")
    filename: Optional[str] = Field(default="document.pdf", description="Document filename")
    lines: Optional[List[OcrLine]] = Field(default=None, description="Pre-extracted OCR lines")
    applicantContext: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Declared applicant context (e.g. name, category, annualIncome, state)",
    )

    model_config = {
        "populate_by_name": True,
    }


class AnalyzeDocumentResponse(BaseModel):
    """Comprehensive single-document intelligence payload."""

    success: bool
    documentId: str
    documentType: DocumentType
    status: str = Field(description="Document status: 'VERIFIED', 'DEFICIENT', or 'FLAGGED'")
    overallConfidence: float = Field(ge=0.0, le=1.0)
    classification: ClassificationResult
    extractedFields: Dict[str, ExtractedField] = Field(default_factory=dict)
    comparisons: List[FieldComparisonItem] = Field(default_factory=list)
    deficiencyReasons: List[str] = Field(default_factory=list)
    processingTimeMs: Optional[float] = None
    processedAt: str


class BatchAnalyzeRequest(BaseModel):
    """Batch document analysis request for an entire scholarship application."""

    applicationId: str = Field(default="app-1", description="Target Application record ID")
    applicantContext: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Declared applicant profile context used across all documents",
    )
    documents: List[AnalyzeDocumentRequest] = Field(min_length=1, description="List of documents to analyze")


class BatchAnalyzeResponse(BaseModel):
    """Batch intelligence report across an application's complete document bundle."""

    success: bool
    applicationId: str
    overallStatus: str = Field(description="Consolidated status: 'VERIFIED', 'DEFICIENT', or 'FLAGGED'")
    totalDocuments: int
    verifiedCount: int
    deficientCount: int
    documents: List[AnalyzeDocumentResponse]
    crossDocChecks: List[CrossDocCheckItem] = Field(default_factory=list)
    deficiencies: List[str] = Field(default_factory=list)
    summary: str
    processedAt: str

