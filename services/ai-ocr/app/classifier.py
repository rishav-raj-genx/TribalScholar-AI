import logging
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from app.schemas import ClassificationResult, DocumentType, OcrLine

logger = logging.getLogger(__name__)


# Canonical equivalence mapping between aliases and standardized types
TYPE_EQUIVALENCES: Dict[DocumentType, Set[DocumentType]] = {
    DocumentType.ST_CASTE_CERTIFICATE: {DocumentType.ST_CASTE_CERTIFICATE, DocumentType.CASTE_CERTIFICATE},
    DocumentType.CASTE_CERTIFICATE: {DocumentType.ST_CASTE_CERTIFICATE, DocumentType.CASTE_CERTIFICATE},
    DocumentType.OVERSEAS_ADMISSION_LETTER: {DocumentType.OVERSEAS_ADMISSION_LETTER, DocumentType.ADMISSION_OFFER_LETTER},
    DocumentType.ADMISSION_OFFER_LETTER: {DocumentType.OVERSEAS_ADMISSION_LETTER, DocumentType.ADMISSION_OFFER_LETTER},
    DocumentType.RESEARCH_PROPOSAL: {DocumentType.RESEARCH_PROPOSAL, DocumentType.SYNOPSIS_RESEARCH_PROPOSAL},
    DocumentType.SYNOPSIS_RESEARCH_PROPOSAL: {DocumentType.RESEARCH_PROPOSAL, DocumentType.SYNOPSIS_RESEARCH_PROPOSAL},
    DocumentType.ACADEMIC_MARKSHEET: {
        DocumentType.ACADEMIC_MARKSHEET,
        DocumentType.MARKSHEET_UG,
        DocumentType.MARKSHEET_PG,
        DocumentType.MARKSHEET_10TH,
        DocumentType.MARKSHEET_12TH,
    },
}


class DocumentClassifier:
    """Classifies OCR extracted text and line tokens into canonical MoTA document types."""

    # Rules definition: Primary (3.0 pts), Secondary (1.5 pts), Negatives (-2.0 pts)
    RULES: Dict[DocumentType, Dict[str, Any]] = {
        DocumentType.INCOME_CERTIFICATE: {
            "primary": [
                r"\bincome\s+certificate\b",
                r"\bannual\s+(?:family\s+)?income\b",
                r"\bgross\s+annual\s+income\b",
                r"\bincome\s+from\s+all\s+sources\b",
                r"\bincome\s+declaration\b",
            ],
            "secondary": [
                r"\btehsildar\b",
                r"\btahasildar\b",
                r"\brevenue\s+officer\b",
                r"\bfinancial\s+year\b",
                r"\bfy\s*20\d\d[-/]\d\d\b",
                r"\bper\s+annum\b",
                r"\bp\.?a\.?\b",
                r"\brs\.?\s*\d[\d,]*\b",
                r"\binr\s*\d[\d,]*\b",
                r"\brupees\b",
                r"\bsub-?divisional\s+magistrate\b",
            ],
            "negative": [
                r"\bscheduled\s+tribe\b",
                r"\bcaste\s+certificate\b",
                r"\bstatement\s+of\s+marks\b",
                r"\bunconditional\s+offer\b",
                r"\bresearch\s+proposal\b",
            ],
        },
        DocumentType.ST_CASTE_CERTIFICATE: {
            "primary": [
                r"\bscheduled\s+tribe\b",
                r"\bst\s+certificate\b",
                r"\bcaste\s+certificate\b",
                r"\bcommunity\s+certificate\b",
                r"\btribe\s+certificate\b",
                r"\brecognized\s+as\s+a\s+scheduled\s+tribe\b",
                r"\bconstitution\s+\(scheduled\s+tribes\)\s+order\b",
            ],
            "secondary": [
                r"\bsanthal\b",
                r"\bgond\b",
                r"\bbhil\b",
                r"\bmunda\b",
                r"\boraon\b",
                r"\bbodo\b",
                r"\bkhasi\b",
                r"\bgaro\b",
                r"\bsub-?divisional\s+officer\b",
                r"\bdistrict\s+magistrate\b",
                r"\btribal\s+affairs\b",
                r"\bsub-?caste\b",
            ],
            "negative": [
                r"\bincome\s+from\s+all\s+sources\b",
                r"\bstatement\s+of\s+marks\b",
                r"\bcgpa\b",
                r"\boffer\s+of\s+admission\b",
            ],
        },
        DocumentType.DOMICILE_CERTIFICATE: {
            "primary": [
                r"\bdomicile\s+certificate\b",
                r"\bresidence\s+certificate\b",
                r"\bresidential\s+certificate\b",
                r"\bpermanent\s+resident\s+certificate\b",
                r"\bprc\s+certificate\b",
            ],
            "secondary": [
                r"\bordinarily\s+resident\b",
                r"\bpermanent\s+resident\b",
                r"\bdomicile\s+of\s+the\s+state\b",
                r"\bnative\s+of\b",
                r"\bbonafide\s+resident\b",
                r"\bdistrict\s+magistrate\b",
                r"\bcircle\s+officer\b",
                r"\bstate\s+of\s+[a-z\s]+\b",
            ],
            "negative": [
                r"\bannual\s+income\b",
                r"\bstatement\s+of\s+marks\b",
                r"\bcgpa\b",
                r"\bresearch\s+methodology\b",
            ],
        },
        DocumentType.ACADEMIC_MARKSHEET: {
            "primary": [
                r"\bstatement\s+of\s+marks\b",
                r"\bmarksheet\b",
                r"\bmark\s+sheet\b",
                r"\bgrade\s+card\b",
                r"\bgrade\s+sheet\b",
                r"\bacademic\s+transcript\b",
                r"\btranscript\s+of\s+records\b",
            ],
            "secondary": [
                r"\bcgpa\b",
                r"\bsgpa\b",
                r"\bpercentage\b",
                r"\broll\s+no\b",
                r"\bregistration\s+no\b",
                r"\bsemester\b",
                r"\bexamination\b",
                r"\bmarks\s+obtained\b",
                r"\bmaximum\s+marks\b",
                r"\bcredits\b",
                r"\bbachelor\s+of\b",
                r"\bmaster\s+of\b",
                r"\bcontroller\s+of\s+examinations\b",
            ],
            "negative": [
                r"\bannual\s+family\s+income\b",
                r"\bscheduled\s+tribe\s+certificate\b",
                r"\bdomicile\s+certificate\b",
                r"\btehsildar\b",
            ],
        },
        DocumentType.OVERSEAS_ADMISSION_LETTER: {
            "primary": [
                r"\boffer\s+of\s+admission\b",
                r"\badmission\s+offer\b",
                r"\bunconditional\s+offer\b",
                r"\bconditional\s+offer\b",
                r"\bletter\s+of\s+acceptance\b",
                r"\bconfirmation\s+of\s+acceptance\s+for\s+studies\b",
                r"\bcas\s+statement\b",
                r"\bcas\s+number\b",
            ],
            "secondary": [
                r"\btuition\s+fees?\b",
                r"\bpostgraduate\s+program\b",
                r"\bdoctoral\s+program\b",
                r"\bph\.?d\.?\s+(?:candidate|student|degree)\b",
                r"\binternational\s+student\b",
                r"\boverseas\b",
                r"\bi-?20\b",
                r"\bvisa\b",
                r"\buniversity\s+of\s+[a-z\s]+\b",
                r"\bfaculty\s+of\s+[a-z\s]+\b",
            ],
            "negative": [
                r"\btehsildar\b",
                r"\bscheduled\s+tribe\s+certificate\b",
                r"\bdistrict\s+magistrate\b",
            ],
        },
        DocumentType.RESEARCH_PROPOSAL: {
            "primary": [
                r"\bresearch\s+proposal\b",
                r"\bph\.?d\.?\s+synopsis\b",
                r"\bsynopsis\s+of\s+(?:proposed\s+)?research\b",
                r"\bproposed\s+research\s+work\b",
                r"\bdoctoral\s+research\s+proposal\b",
            ],
            "secondary": [
                r"\bliterature\s+review\b",
                r"\bresearch\s+methodology\b",
                r"\bproblem\s+statement\b",
                r"\bhypothesis\b",
                r"\bhypotheses\b",
                r"\bproposed\s+methodology\b",
                r"\bsupervisor\b",
                r"\bco-?supervisor\b",
                r"\bresearch\s+guide\b",
                r"\bobjectives\s+of\s+the\s+study\b",
                r"\bexpected\s+outcomes\b",
                r"\breferences\b",
            ],
            "negative": [
                r"\btehsildar\b",
                r"\bannual\s+income\b",
                r"\bmarksheet\b",
                r"\broll\s+no\b",
            ],
        },
    }

    CONFIDENCE_THRESHOLD = 0.40  # Minimum normalized score to be accepted
    MIN_RAW_SCORE = 2.0  # Minimum raw score before considering valid

    def classify_text(self, text: str, lines: Optional[List[OcrLine]] = None) -> ClassificationResult:
        """Classify input text or OCR lines into canonical DocumentType."""
        if not text or not text.strip():
            return ClassificationResult(
                predictedType=DocumentType.OTHER,
                confidence=0.0,
                isMatch=False,
                evidenceTokens=[],
                scores={},
                rejectionReason="Empty or blank document text; cannot classify.",
            )

        clean_text = text.lower()
        scores: Dict[str, float] = {}
        matched_tokens: Dict[str, List[str]] = {}

        # Evaluate scoring rules for each document type
        for doc_type, rule_group in self.RULES.items():
            type_score = 0.0
            tokens: List[str] = []

            # 1. Primary patterns (weight 3.0)
            for pattern in rule_group.get("primary", []):
                matches = re.findall(pattern, clean_text, re.IGNORECASE)
                if matches:
                    type_score += 3.0 * len(matches)
                    tokens.extend(matches)

            # 2. Secondary patterns (weight 1.5)
            for pattern in rule_group.get("secondary", []):
                matches = re.findall(pattern, clean_text, re.IGNORECASE)
                if matches:
                    type_score += 1.5 * len(matches)
                    tokens.extend(matches)

            # 3. Negative patterns (penalty -2.0)
            for pattern in rule_group.get("negative", []):
                matches = re.findall(pattern, clean_text, re.IGNORECASE)
                if matches:
                    type_score -= 2.0 * len(matches)

            type_score = max(type_score, 0.0)
            scores[doc_type.value] = type_score
            matched_tokens[doc_type.value] = list(set(tokens))

        # Determine winner
        best_type_str, best_score = max(scores.items(), key=lambda item: item[1])
        total_positive = sum(scores.values())

        if best_score < self.MIN_RAW_SCORE or total_positive == 0:
            return ClassificationResult(
                predictedType=DocumentType.OTHER,
                confidence=round(min(best_score / (self.MIN_RAW_SCORE * 2.0), 0.35), 3),
                isMatch=False,
                evidenceTokens=[],
                scores={k: round(v, 2) for k, v in scores.items()},
                rejectionReason="Document text does not contain sufficient distinctive evidence for prescribed MoTA certificates.",
            )

        # Normalize confidence to [0.0 - 1.0]
        # Ratio of best score to total score with ceiling
        confidence = round(min(best_score / (total_positive if total_positive > 0 else 1.0), 1.0), 3)

        # If confidence is below threshold, flag as OTHER
        if confidence < self.CONFIDENCE_THRESHOLD:
            return ClassificationResult(
                predictedType=DocumentType.OTHER,
                confidence=confidence,
                isMatch=False,
                evidenceTokens=matched_tokens.get(best_type_str, []),
                scores={k: round(v, 2) for k, v in scores.items()},
                rejectionReason=f"Ambiguous or low confidence classification ({confidence:.2f} < {self.CONFIDENCE_THRESHOLD}).",
            )

        predicted_type = DocumentType(best_type_str)
        return ClassificationResult(
            predictedType=predicted_type,
            confidence=confidence,
            isMatch=True,
            evidenceTokens=matched_tokens.get(best_type_str, []),
            scores={k: round(v, 2) for k, v in scores.items()},
            rejectionReason=None,
        )

    def classify_lines(self, lines: List[OcrLine]) -> ClassificationResult:
        """Classify a list of extracted OcrLine tokens."""
        if not lines:
            return self.classify_text("")

        # Weight lines by their OCR detection confidence
        full_text = "\n".join(l.text for l in lines)
        return self.classify_text(full_text, lines=lines)

    def verify_document_type(
        self,
        expected_type: DocumentType,
        text: str,
        lines: Optional[List[OcrLine]] = None,
    ) -> Tuple[bool, ClassificationResult]:
        """Verify whether the document text corresponds to the claimed/expected document type."""
        result = self.classify_text(text, lines=lines)

        # Handle equivalences (e.g. ST_CASTE_CERTIFICATE == CASTE_CERTIFICATE)
        equivalent_types = TYPE_EQUIVALENCES.get(expected_type, {expected_type})

        if result.predictedType in equivalent_types:
            result.isMatch = True
            result.rejectionReason = None
            return True, result

        # Mismatch detected
        result.isMatch = False
        if result.predictedType == DocumentType.OTHER:
            result.rejectionReason = (
                f"Document could not be recognized as a valid {expected_type.value}. "
                f"Please ensure upload is clear, legible, and uncorrupted."
            )
        else:
            result.rejectionReason = (
                f"Uploaded document appears to be {result.predictedType.value}, "
                f"which does not match the expected requirement ({expected_type.value})."
            )

        return False, result


# Global singleton instance of DocumentClassifier
document_classifier = DocumentClassifier()
