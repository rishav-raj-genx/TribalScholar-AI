import { RuleSeverity, SchemeCode } from '@tribalscholar/shared';
import {
  evaluateEligibility,
  type ApplicantProfileLike,
  type DeficiencyItem,
  type EligibilityEvaluationResult,
  type SchemeVersionLike,
} from './eligibilityEvaluator.js';
import {
  evaluateCrossDocConsistency,
  type ConsistencyEvaluationReport,
  type ConsistencyEvaluatorOptions,
  type OcrDocumentInput,
} from './consistencyEvaluator.js';
import { DocumentType } from '@tribalscholar/shared';

export * from './eligibilityEvaluator.js';
export * from './consistencyEvaluator.js';

// ==============================================================================
// Unified Orchestrator Contracts
// ==============================================================================

export interface UnifiedApplicationEvaluationInput {
  applicationId?: string | undefined;
  schemeVersion: SchemeVersionLike;
  applicantProfile?: ApplicantProfileLike | null | undefined;
  formData?: Record<string, unknown> | null | undefined;
  uploadedDocuments?:
    | Array<DocumentType | { documentType: DocumentType; [key: string]: unknown }>
    | DocumentType[]
    | undefined;
  extractedDocuments?:
    | Array<OcrDocumentInput | { documentType: DocumentType; [key: string]: unknown }>
    | Record<string, unknown>
    | null
    | undefined;
  options?: ConsistencyEvaluatorOptions | undefined;
  extraContext?: Record<string, unknown> | undefined;
}

export interface UnifiedRuleEvaluationResult {
  applicationId?: string | undefined;
  schemeCode?: SchemeCode | string | undefined;
  isEligible: boolean;
  isDocumentComplete: boolean;
  isCrossDocConsistent: boolean;
  overallPassed: boolean;
  requiresOfficerReview: boolean;
  blockingFailuresCount: number;
  warningCount: number;
  eligibility: EligibilityEvaluationResult;
  consistency: ConsistencyEvaluationReport;
  deficiencies: DeficiencyItem[];
  evaluatedAt: string;
}

// ==============================================================================
// Unified Application Rule Evaluator Orchestrator
// ==============================================================================

export function evaluateApplicationRules(
  input: UnifiedApplicationEvaluationInput
): UnifiedRuleEvaluationResult {
  const {
    applicationId,
    schemeVersion,
    applicantProfile,
    formData,
    uploadedDocuments,
    extractedDocuments,
    options,
    extraContext,
  } = input;

  // 1. Evaluate pure eligibility and document completeness
  const eligibility = evaluateEligibility({
    schemeVersion,
    applicantProfile,
    formData,
    uploadedDocuments,
    extraContext,
  });

  // 2. Build merged context for cross-document consistency checks
  const combinedFormData: Record<string, unknown> = {
    ...(applicantProfile ? (applicantProfile as Record<string, unknown>) : {}),
    ...(formData || {}),
    ...(extraContext || {}),
  };

  // 3. Evaluate cross-document consistency and OCR confidence
  const consistency = evaluateCrossDocConsistency(
    extractedDocuments || [],
    combinedFormData,
    options
  );

  // 4. Synthesize unified outcome
  const isEligible = eligibility.isEligible;
  const isDocumentComplete = eligibility.isDocumentComplete;
  const isCrossDocConsistent = consistency.isConsistent;
  const requiresOfficerReview = consistency.requiresHumanReview;

  // An application only passes fully if it is eligible, has all documents,
  // has zero cross-document mismatches, and has no low-confidence flags requiring officer review
  const overallPassed =
    isEligible && isDocumentComplete && isCrossDocConsistent && !requiresOfficerReview;

  // Consolidate deficiencies
  const deficiencies: DeficiencyItem[] = [
    ...eligibility.deficiencies,
    ...consistency.deficiencies,
  ];

  // Calculate blocking failures
  const blockingFailuresCount =
    eligibility.blockingFailuresCount + consistency.mismatchCount;

  // Calculate warnings
  const warningCount =
    eligibility.warningCount +
    consistency.lowConfidenceCount +
    consistency.deficiencies.filter((d) => d.severity === RuleSeverity.MANUAL_REVIEW).length;

  const result: UnifiedRuleEvaluationResult = {
    isEligible,
    isDocumentComplete,
    isCrossDocConsistent,
    overallPassed,
    requiresOfficerReview,
    blockingFailuresCount,
    warningCount,
    eligibility,
    consistency,
    deficiencies,
    evaluatedAt: new Date().toISOString(),
  };

  if (applicationId !== undefined) {
    result.applicationId = applicationId;
  }

  const schemeCode = schemeVersion.schemeCode;
  if (schemeCode !== undefined) {
    result.schemeCode = schemeCode as SchemeCode | string;
  }

  return result;
}
