import base64
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

from app.classifier import document_classifier
from app.extractor import structured_extractor
from app.ocr_engine import ocr_engine
from app.schemas import (
    AnalyzeDocumentRequest,
    AnalyzeDocumentResponse,
    BatchAnalyzeRequest,
    BatchAnalyzeResponse,
    ClassificationResult,
    CrossDocCheckItem,
    CrossDocCheckStatus,
    DocValue,
    DocumentType,
    ExtractedField,
    FieldComparisonItem,
    OcrLine,
)

logger = logging.getLogger(__name__)


def _normalize_name_tokens(name_str: str) -> set:
    """Tokenize and normalize name strings for cross-document consistency matching."""
    cleaned = re.sub(r"[^a-zA-Z\s]", "", name_str.lower())
    # Remove honorifics
    tokens = set(cleaned.split()) - {"shri", "smt", "mr", "ms", "dr", "kumar", "kumari"}
    return tokens


class DocumentIntelligenceAnalyzer:
    """Orchestrates document classification, field extraction, and cross-field consistency verification."""

    def analyze_document(self, request: AnalyzeDocumentRequest) -> AnalyzeDocumentResponse:
        """Run classification, field extraction, and applicant-context comparison on a single document."""
        start_time = time.time()
        lines: List[OcrLine] = []
        raw_text: str = ""

        # 1. Resolve OCR lines and raw text
        if request.lines:
            lines = request.lines
            raw_text = "\n".join(l.text for l in lines)
        elif request.fileBase64:
            try:
                file_bytes = base64.b64decode(request.fileBase64)
                lines = ocr_engine.extract_lines(file_bytes, filename=request.filename or "doc.pdf")
                raw_text = "\n".join(l.text for l in lines)
            except Exception as e:
                logger.error("Failed to decode or process base64 file for %s: %s", request.documentId, e)
                raw_text = request.text or ""
        elif request.text:
            raw_text = request.text
            # Generate synthetic lines from text for positional awareness
            lines = [
                OcrLine(
                    text=line.strip(),
                    confidence=0.95,
                    pageNumber=1,
                    boundingBox={"x": 10.0, "y": float(20 + i * 25), "width": 400.0, "height": 20.0},
                )
                for i, line in enumerate(raw_text.splitlines())
                if line.strip()
            ]

        # 2. Document Classification & Type Verification
        is_type_match, classification = document_classifier.verify_document_type(
            expected_type=request.expectedType,
            text=raw_text,
            lines=lines,
        )

        # 3. Structured Field Extraction
        extracted_fields = structured_extractor.extract_fields(
            document_input=lines if lines else raw_text,
            document_type=request.expectedType,
        )

        # 4. Cross-Field Comparison with Applicant Form Context
        comparisons: List[FieldComparisonItem] = []
        deficiencies: List[str] = []

        if not is_type_match:
            deficiencies.append(
                classification.rejectionReason
                or f"Document classified as {classification.predictedType.value}, not expected {request.expectedType.value}."
            )

        if classification.predictedType == DocumentType.OTHER or classification.confidence < 0.40:
            deficiencies.append("Low OCR confidence or illegible certificate text.")

        if request.applicantContext:
            comp_items, comp_deficiencies = self._compare_with_applicant_context(
                applicant_context=request.applicantContext,
                extracted_fields=extracted_fields,
                expected_type=request.expectedType,
            )
            comparisons.extend(comp_items)
            deficiencies.extend(comp_deficiencies)

        # 5. Determine Overall Document Status
        status = "DEFICIENT" if deficiencies else "VERIFIED"

        # Calculate overall confidence
        conf_scores = [classification.confidence] + [f.confidence for f in extracted_fields.values()]
        overall_confidence = round(float(sum(conf_scores) / len(conf_scores)), 3) if conf_scores else 0.85

        processing_time_ms = round((time.time() - start_time) * 1000, 2)
        return AnalyzeDocumentResponse(
            success=True,
            documentId=request.documentId,
            documentType=request.expectedType,
            status=status,
            overallConfidence=overall_confidence,
            classification=classification,
            extractedFields=extracted_fields,
            comparisons=comparisons,
            deficiencyReasons=deficiencies,
            processingTimeMs=processing_time_ms,
            processedAt=datetime.now(timezone.utc).isoformat(),
        )

    def analyze_batch(self, request: BatchAnalyzeRequest) -> BatchAnalyzeResponse:
        """Run batch analysis across all documents of an application and evaluate cross-document consistency."""
        doc_responses: List[AnalyzeDocumentResponse] = []
        all_deficiencies: List[str] = []

        for doc_req in request.documents:
            # Propagate application-level context if not overridden
            if not doc_req.applicantContext and request.applicantContext:
                doc_req.applicantContext = request.applicantContext

            res = self.analyze_document(doc_req)
            doc_responses.append(res)
            if res.deficiencyReasons:
                all_deficiencies.extend([f"[{doc_req.documentId}] {d}" for d in res.deficiencyReasons])

        # Cross-document pairwise checks (e.g. name consistency between caste and income cert)
        cross_doc_checks, cross_deficiencies = self._evaluate_cross_document_consistency(doc_responses)
        all_deficiencies.extend(cross_deficiencies)

        verified_count = sum(1 for d in doc_responses if d.status == "VERIFIED")
        deficient_count = len(doc_responses) - verified_count

        overall_status = "VERIFIED" if (deficient_count == 0 and not cross_deficiencies) else "DEFICIENT"

        if overall_status == "VERIFIED":
            summary = (
                f"All {verified_count}/{len(doc_responses)} documents cleanly verified matching declared applicant "
                f"profile (Name, Category, and Financial/Academic thresholds)."
            )
        else:
            summary = (
                f"{deficient_count} of {len(doc_responses)} documents flagged with deficiencies. "
                f"Requires applicant correction or scrutiny desk review."
            )

        return BatchAnalyzeResponse(
            success=True,
            applicationId=request.applicationId,
            overallStatus=overall_status,
            totalDocuments=len(doc_responses),
            verifiedCount=verified_count,
            deficientCount=deficient_count,
            documents=doc_responses,
            crossDocChecks=cross_doc_checks,
            deficiencies=all_deficiencies,
            summary=summary,
            processedAt=datetime.now(timezone.utc).isoformat(),
        )

    # ==========================================================================
    # Cross-Field & Context Verification
    # ==========================================================================

    def _compare_with_applicant_context(
        self,
        applicant_context: Dict[str, Any],
        extracted_fields: Dict[str, ExtractedField],
        expected_type: DocumentType,
    ) -> Tuple[List[FieldComparisonItem], List[str]]:
        """Compare extracted fields against declared application form context."""
        comparisons: List[FieldComparisonItem] = []
        deficiencies: List[str] = []

        # 1. Applicant Name Comparison
        declared_name = applicant_context.get("name") or applicant_context.get("applicantName")
        if declared_name and "applicantName" in extracted_fields:
            extracted_name = str(extracted_fields["applicantName"].value)
            declared_tokens = _normalize_name_tokens(str(declared_name))
            extracted_tokens = _normalize_name_tokens(extracted_name)

            # Check token overlap
            is_name_match = bool(declared_tokens.intersection(extracted_tokens))
            notes = (
                None
                if is_name_match
                else f"Declared name '{declared_name}' does not match certificate name '{extracted_name}'."
            )
            if not is_name_match:
                deficiencies.append(notes)

            comparisons.append(
                FieldComparisonItem(
                    field="applicantName",
                    declaredValue=declared_name,
                    extractedValue=extracted_name,
                    isMatch=is_name_match,
                    confidence=extracted_fields["applicantName"].confidence,
                    evidenceString=extracted_fields["applicantName"].evidence.evidenceString,
                    notes=notes,
                )
            )

        # 2. Annual Income Comparison
        declared_income = applicant_context.get("annualIncome") or applicant_context.get("annualFamilyIncome")
        if declared_income is not None and "annualFamilyIncome" in extracted_fields:
            try:
                dec_inc_num = float(declared_income)
                ext_inc_num = float(extracted_fields["annualFamilyIncome"].value)

                # Tolerance of ₹500 or exact match
                is_income_match = ext_inc_num <= dec_inc_num or abs(ext_inc_num - dec_inc_num) <= 500
                notes = None
                if not is_income_match:
                    notes = (
                        f"Certificate income (₹{ext_inc_num:,.0f}) exceeds declared annual income "
                        f"(₹{dec_inc_num:,.0f})."
                    )
                    deficiencies.append(notes)

                comparisons.append(
                    FieldComparisonItem(
                        field="annualFamilyIncome",
                        declaredValue=dec_inc_num,
                        extractedValue=ext_inc_num,
                        isMatch=is_income_match,
                        confidence=extracted_fields["annualFamilyIncome"].confidence,
                        evidenceString=extracted_fields["annualFamilyIncome"].evidence.evidenceString,
                        notes=notes,
                    )
                )
            except (ValueError, TypeError):
                pass

        # 3. Category Comparison
        declared_category = applicant_context.get("category")
        if declared_category and "category" in extracted_fields:
            ext_cat = str(extracted_fields["category"].value)
            st_tokens = {"st", "scheduled tribe", "santhal", "munda", "oraon", "gond", "bhil", "bodo", "khasi"}
            dec_lower = str(declared_category).lower()
            ext_lower = ext_cat.lower()
            is_cat_match = (
                ("st" in dec_lower and "st" in ext_lower)
                or any(t in dec_lower and t in ext_lower for t in st_tokens)
                or ("scheduled tribe" in ext_lower and any(t in dec_lower for t in st_tokens))
                or ("scheduled tribe" in dec_lower and any(t in ext_lower for t in st_tokens))
            )
            notes = None if is_cat_match else f"Declared category '{declared_category}' does not match '{ext_cat}'."
            if not is_cat_match:
                deficiencies.append(notes)

            comparisons.append(
                FieldComparisonItem(
                    field="category",
                    declaredValue=declared_category,
                    extractedValue=ext_cat,
                    isMatch=is_cat_match,
                    confidence=extracted_fields["category"].confidence,
                    evidenceString=extracted_fields["category"].evidence.evidenceString,
                    notes=notes,
                )
            )

        # 4. State Domicile Comparison
        declared_state = applicant_context.get("state") or applicant_context.get("stateDomicile")
        if declared_state and "stateDomicile" in extracted_fields:
            ext_state = str(extracted_fields["stateDomicile"].value)
            is_state_match = str(declared_state).lower() in ext_state.lower() or ext_state.lower() in str(declared_state).lower()
            notes = None if is_state_match else f"Declared state '{declared_state}' does not match domicile '{ext_state}'."
            if not is_state_match:
                deficiencies.append(notes)

            comparisons.append(
                FieldComparisonItem(
                    field="stateDomicile",
                    declaredValue=declared_state,
                    extractedValue=ext_state,
                    isMatch=is_state_match,
                    confidence=extracted_fields["stateDomicile"].confidence,
                    evidenceString=extracted_fields["stateDomicile"].evidence.evidenceString,
                    notes=notes,
                )
            )

        return comparisons, deficiencies

    def _evaluate_cross_document_consistency(
        self,
        doc_responses: List[AnalyzeDocumentResponse],
    ) -> Tuple[List[CrossDocCheckItem], List[str]]:
        """Evaluate pairwise cross-document consistency across the complete document set."""
        checks: List[CrossDocCheckItem] = []
        deficiencies: List[str] = []

        # Find names across documents
        name_docs: List[Tuple[DocumentType, str, float]] = []
        for d in doc_responses:
            if "applicantName" in d.extractedFields:
                f = d.extractedFields["applicantName"]
                name_docs.append((d.documentType, str(f.value), f.confidence))

        # Check all pairs of names
        for i in range(len(name_docs)):
            for j in range(i + 1, len(name_docs)):
                doc_a, name_a, conf_a = name_docs[i]
                doc_b, name_b, conf_b = name_docs[j]

                tokens_a = _normalize_name_tokens(name_a)
                tokens_b = _normalize_name_tokens(name_b)
                is_match = bool(tokens_a.intersection(tokens_b))

                status = CrossDocCheckStatus.MATCH if is_match else CrossDocCheckStatus.MISMATCH
                score = 1.0 if is_match else 0.2
                notes = None if is_match else f"Name mismatch between {doc_a.value} ('{name_a}') and {doc_b.value} ('{name_b}')."

                if not is_match:
                    deficiencies.append(notes)

                checks.append(
                    CrossDocCheckItem(
                        field="applicantName",
                        sourceDocument=DocValue(documentType=doc_a, extractedValue=name_a, confidence=conf_a),
                        targetDocument=DocValue(documentType=doc_b, extractedValue=name_b, confidence=conf_b),
                        matchScore=score,
                        status=status,
                        notes=notes,
                    )
                )

        return checks, deficiencies


# Global singleton instance of DocumentIntelligenceAnalyzer
document_analyzer = DocumentIntelligenceAnalyzer()
