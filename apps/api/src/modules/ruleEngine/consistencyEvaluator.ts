import { DocumentType, RuleSeverity } from '@tribalscholar/shared';
import { type DeficiencyItem } from './eligibilityEvaluator.js';

// ==============================================================================
// Types & Contracts
// ==============================================================================

export type ConsistencyMatcherType =
  | 'FUZZY_TOKEN_RATIO'
  | 'NORMALIZED_CONTAINS'
  | 'NUMERIC_EXACT'
  | 'NON_EMPTY_PRESENT';

export type FieldConsistencyStatus =
  | 'Consistent'
  | 'Extracted'
  | 'Present'
  | 'Mismatch'
  | 'Low Confidence';

export interface ConsistencyRuleConfig {
  fieldName: string;
  formFieldPath?: string | undefined;
  ocrFieldNames?: string[] | undefined;
  targetDocumentTypes?: DocumentType[] | undefined;
  matcher: ConsistencyMatcherType;
  minConfidenceThreshold?: number | undefined;
  fuzzyScoreThreshold?: number | undefined;
  tolerancePercentage?: number | undefined;
  severity?: RuleSeverity | undefined;
  customErrorMessage?: string | undefined;
}

export interface ConsistencyFieldResult {
  fieldName: string;
  documentType: DocumentType;
  declaredValue: unknown;
  extractedValue: unknown;
  confidence: number;
  matchScore: number;
  matcher: ConsistencyMatcherType;
  status: FieldConsistencyStatus;
  passed: boolean;
  requiresOfficerReview: boolean;
  notes?: string | undefined;
  deficiencyReason?: string | undefined;
}

export interface ConsistencyEvaluationReport {
  isConsistent: boolean;
  totalFieldsChecked: number;
  consistentCount: number;
  mismatchCount: number;
  lowConfidenceCount: number;
  results: ConsistencyFieldResult[];
  deficiencies: DeficiencyItem[];
  requiresHumanReview: boolean;
  evaluatedAt: string;
}

export interface ConsistencyEvaluatorOptions {
  minConfidenceThreshold?: number | undefined;
  fuzzyScoreThreshold?: number | undefined;
  numericTolerancePercentage?: number | undefined;
  customRules?: ConsistencyRuleConfig[] | undefined;
}

export interface OcrExtractedFieldItem {
  rawText?: string | undefined;
  normalizedValue?: unknown;
  value?: unknown;
  confidence?: number | undefined;
  pageNumber?: number | undefined;
}

export interface OcrDocumentInput {
  documentType: DocumentType;
  documentId?: string | undefined;
  overallConfidence?: number | undefined;
  extractedFields: Record<string, OcrExtractedFieldItem | string | number | boolean>;
}

// ==============================================================================
// Matcher Primitives
// ==============================================================================

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    const row = dp[0];
    if (row) {
      row[j] = j;
    }
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const prevRow = dp[i - 1];
      const currRow = dp[i];
      if (!prevRow || !currRow) continue;

      if (s1[i - 1] === s2[j - 1]) {
        currRow[j] = prevRow[j - 1]!;
      } else {
        currRow[j] = Math.min(
          prevRow[j]! + 1, // deletion
          currRow[j - 1]! + 1, // insertion
          prevRow[j - 1]! + 1 // substitution
        );
      }
    }
  }

  const finalRow = dp[m];
  return finalRow ? finalRow[n] ?? Math.max(m, n) : Math.max(m, n);
}

export function matchFuzzyTokenRatio(
  valA: unknown,
  valB: unknown,
  threshold = 0.85
): { match: boolean; score: number } {
  if (valA === valB) return { match: true, score: 1.0 };
  if (valA === null || valA === undefined || valB === null || valB === undefined) {
    return { match: false, score: 0.0 };
  }

  const cleanA = String(valA).toLowerCase().trim();
  const cleanB = String(valB).toLowerCase().trim();
  if (cleanA === cleanB) return { match: true, score: 1.0 };
  if (!cleanA || !cleanB) return { match: false, score: 0.0 };

  const tokensA = cleanA.split(/[^a-z0-9]+/).filter(Boolean);
  const tokensB = cleanB.split(/[^a-z0-9]+/).filter(Boolean);

  if (tokensA.length === 0 || tokensB.length === 0) {
    return { match: false, score: 0.0 };
  }

  const sortedA = [...tokensA].sort().join(' ');
  const sortedB = [...tokensB].sort().join(' ');

  if (sortedA === sortedB) {
    return { match: true, score: 1.0 };
  }

  const dist = levenshteinDistance(sortedA, sortedB);
  const maxLen = Math.max(sortedA.length, sortedB.length);
  const tokenSortScore = maxLen === 0 ? 1.0 : Math.max(0, 1 - dist / maxLen);

  const setB = new Set(tokensB);
  const intersection = tokensA.filter((t) => setB.has(t));
  const union = new Set([...tokensA, ...tokensB]);
  const jaccardScore = union.size === 0 ? 0 : intersection.length / union.size;

  const score = Number(Math.max(tokenSortScore, jaccardScore).toFixed(4));
  return { match: score >= threshold, score };
}

export function matchNormalizedContains(
  valA: unknown,
  valB: unknown
): { match: boolean; score: number } {
  if (valA === valB) return { match: true, score: 1.0 };
  if (valA === null || valA === undefined || valB === null || valB === undefined) {
    return { match: false, score: 0.0 };
  }

  const clean = (s: unknown): string =>
    String(s)
      .toLowerCase()
      .replace(/[()[\]{}_,.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normA = clean(valA);
  const normB = clean(valB);

  if (!normA || !normB) return { match: false, score: 0.0 };
  if (normA === normB) return { match: true, score: 1.0 };

  if (normA.includes(normB) || normB.includes(normA)) {
    return { match: true, score: 1.0 };
  }

  // Acronym and ST community abbreviation heuristics
  const tokensA = normA.split(' ');
  const tokensB = normB.split(' ');

  const acronymA = tokensA.map((t) => t[0]).join('');
  const acronymB = tokensB.map((t) => t[0]).join('');

  if (
    acronymA === normB ||
    acronymB === normA ||
    (tokensA.includes('st') && tokensB.includes('tribe')) ||
    (tokensB.includes('st') && tokensA.includes('tribe'))
  ) {
    return { match: true, score: 1.0 };
  }

  // Token overlap check
  const setB = new Set(tokensB);
  const common = tokensA.filter((t) => setB.has(t));
  if (common.length > 0) {
    const score = Number((common.length / Math.max(tokensA.length, tokensB.length)).toFixed(4));
    return { match: score >= 0.5, score };
  }

  return { match: false, score: 0.0 };
}

export function extractNumericAmount(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  const str = String(val).replace(/,/g, '');
  const match = str.match(/\d+(\.\d+)?/);
  if (!match || !match[0]) return null;

  const parsed = parseFloat(match[0]);
  return isNaN(parsed) ? null : parsed;
}

export function matchNumericExact(
  valA: unknown,
  valB: unknown,
  tolerancePercentage = 0
): { match: boolean; score: number } {
  const numA = extractNumericAmount(valA);
  const numB = extractNumericAmount(valB);

  if (numA === null || numB === null) {
    return { match: false, score: 0.0 };
  }

  if (numA === numB) {
    return { match: true, score: 1.0 };
  }

  const maxVal = Math.max(Math.abs(numA), Math.abs(numB));
  if (maxVal === 0) {
    return { match: true, score: 1.0 };
  }

  const diff = Math.abs(numA - numB);
  const diffPercent = (diff / maxVal) * 100;

  if (diffPercent <= tolerancePercentage) {
    const score = Number(Math.max(0, 1 - diff / maxVal).toFixed(4));
    return { match: true, score };
  }

  return { match: false, score: 0.0 };
}

export function matchNonEmptyPresent(
  val: unknown,
  expected?: unknown
): { match: boolean; score: number } {
  if (val === null || val === undefined) {
    return { match: false, score: 0.0 };
  }

  const str = String(val).trim();
  if (str.length < 2 || str.toLowerCase() === 'null' || str.toLowerCase() === 'n/a') {
    return { match: false, score: 0.0 };
  }

  if (expected !== undefined && expected !== null && String(expected).trim() !== '') {
    const expectedStr = String(expected).toLowerCase().trim();
    const actualStr = str.toLowerCase();
    if (actualStr.includes(expectedStr) || expectedStr.includes(actualStr)) {
      return { match: true, score: 1.0 };
    }
  }

  return { match: true, score: 1.0 };
}

// ==============================================================================
// Default Scheme Consistency Rules
// ==============================================================================

export const DEFAULT_CONSISTENCY_RULES: ConsistencyRuleConfig[] = [
  {
    fieldName: 'applicantName',
    formFieldPath: 'applicantName',
    ocrFieldNames: ['applicantName', 'name', 'candidateName', 'studentName', 'fullName'],
    targetDocumentTypes: [
      DocumentType.AADHAAR_CARD,
      DocumentType.CASTE_CERTIFICATE,
      DocumentType.ST_CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.MARKSHEET_PG,
      DocumentType.MARKSHEET_UG,
      DocumentType.ACADEMIC_MARKSHEET,
    ],
    matcher: 'FUZZY_TOKEN_RATIO',
    minConfidenceThreshold: 0.8,
    fuzzyScoreThreshold: 0.85,
    severity: RuleSeverity.BLOCKING,
  },
  {
    fieldName: 'category',
    formFieldPath: 'category',
    ocrFieldNames: ['category', 'casteCommunity', 'community', 'caste', 'subTribe'],
    targetDocumentTypes: [DocumentType.CASTE_CERTIFICATE, DocumentType.ST_CASTE_CERTIFICATE],
    matcher: 'NORMALIZED_CONTAINS',
    minConfidenceThreshold: 0.8,
    severity: RuleSeverity.BLOCKING,
  },
  {
    fieldName: 'annualFamilyIncome',
    formFieldPath: 'annualFamilyIncome',
    ocrFieldNames: ['annualFamilyIncome', 'annualIncome', 'income', 'totalIncome'],
    targetDocumentTypes: [DocumentType.INCOME_CERTIFICATE],
    matcher: 'NUMERIC_EXACT',
    minConfidenceThreshold: 0.8,
    tolerancePercentage: 5,
    severity: RuleSeverity.BLOCKING,
  },
  {
    fieldName: 'issuingAuthority',
    formFieldPath: 'issuingAuthority',
    ocrFieldNames: ['issuingAuthority', 'authority', 'issuedBy', 'certifyingOfficer'],
    targetDocumentTypes: [
      DocumentType.CASTE_CERTIFICATE,
      DocumentType.ST_CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
    ],
    matcher: 'NON_EMPTY_PRESENT',
    minConfidenceThreshold: 0.75,
    severity: RuleSeverity.BLOCKING,
  },
];

// ==============================================================================
// Field Value Path Resolution Helper
// ==============================================================================

function getFieldValueFromObject(obj: Record<string, unknown>, path: string): unknown {
  if (!obj || !path) return undefined;

  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path];
  }

  const segments = path.split('.');
  let current: unknown = obj;
  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      current = undefined;
      break;
    }
  }

  if (current !== undefined) return current;

  // Fallbacks for common aliases
  if (path === 'applicantName' || path === 'fullName') {
    return (
      obj['applicantName'] ??
      obj['fullName'] ??
      obj['name'] ??
      (obj['applicant'] as Record<string, unknown> | undefined)?.['fullName'] ??
      (obj['applicantProfile'] as Record<string, unknown> | undefined)?.['fullName']
    );
  }

  if (path === 'category' || path === 'casteCommunity') {
    return (
      obj['category'] ??
      obj['casteCommunity'] ??
      (obj['applicant'] as Record<string, unknown> | undefined)?.['casteCommunity'] ??
      (obj['applicantProfile'] as Record<string, unknown> | undefined)?.['casteCommunity']
    );
  }

  if (path === 'annualFamilyIncome' || path === 'annualIncome') {
    return (
      obj['annualFamilyIncome'] ??
      obj['annualIncome'] ??
      (obj['applicant'] as Record<string, unknown> | undefined)?.['annualIncome'] ??
      (obj['applicantProfile'] as Record<string, unknown> | undefined)?.['annualIncome']
    );
  }

  if (path === 'issuingAuthority') {
    return obj['issuingAuthority'] ?? obj['authority'];
  }

  return undefined;
}

// ==============================================================================
// Normalization of Extracted Documents
// ==============================================================================

function normalizeExtractedDocuments(
  input: unknown
): Map<DocumentType, Record<string, OcrExtractedFieldItem>> {
  const map = new Map<DocumentType, Record<string, OcrExtractedFieldItem>>();

  if (!input) return map;

  if (Array.isArray(input)) {
    for (const item of input) {
      if (!item || typeof item !== 'object') continue;
      const doc = item as {
        documentType?: DocumentType;
        extractedFields?: Record<string, unknown>;
        ocrExtractedFields?: Record<string, unknown>;
        overallConfidence?: number;
      };

      const docType = doc.documentType;
      if (!docType) continue;

      const fieldsRaw = doc.extractedFields || doc.ocrExtractedFields || {};
      const fieldsObj: Record<string, OcrExtractedFieldItem> = {};

      for (const [k, v] of Object.entries(fieldsRaw)) {
        if (v && typeof v === 'object' && ('rawText' in v || 'normalizedValue' in v || 'confidence' in v)) {
          const fieldItem = v as OcrExtractedFieldItem;
          fieldsObj[k] = {
            rawText: fieldItem.rawText !== undefined ? fieldItem.rawText : String(fieldItem.value ?? ''),
            normalizedValue: fieldItem.normalizedValue !== undefined ? fieldItem.normalizedValue : fieldItem.value,
            confidence: fieldItem.confidence !== undefined ? fieldItem.confidence : doc.overallConfidence ?? 1.0,
            pageNumber: fieldItem.pageNumber,
          };
        } else {
          fieldsObj[k] = {
            rawText: String(v ?? ''),
            normalizedValue: v,
            confidence: doc.overallConfidence ?? 1.0,
          };
        }
      }

      map.set(docType, fieldsObj);
    }
  } else if (typeof input === 'object') {
    const record = input as Record<string, unknown>;
    for (const [key, val] of Object.entries(record)) {
      const docType = key as DocumentType;
      if (val && typeof val === 'object') {
        const valObj = val as Record<string, unknown>;
        const fieldsRaw = (valObj['extractedFields'] as Record<string, unknown>) || valObj;
        const fieldsObj: Record<string, OcrExtractedFieldItem> = {};

        for (const [fName, fVal] of Object.entries(fieldsRaw)) {
          if (fVal && typeof fVal === 'object' && ('rawText' in fVal || 'confidence' in fVal)) {
            fieldsObj[fName] = fVal as OcrExtractedFieldItem;
          } else {
            fieldsObj[fName] = {
              rawText: String(fVal ?? ''),
              normalizedValue: fVal,
              confidence: 1.0,
            };
          }
        }
        map.set(docType, fieldsObj);
      }
    }
  }

  return map;
}

// ==============================================================================
// Evaluator Main Function
// ==============================================================================

export function evaluateCrossDocConsistency(
  extractedDocuments:
    | Array<OcrDocumentInput | { documentType: DocumentType; [key: string]: unknown }>
    | Record<string, unknown>,
  formData: Record<string, unknown>,
  options?: ConsistencyEvaluatorOptions
): ConsistencyEvaluationReport {
  const docMap = normalizeExtractedDocuments(extractedDocuments);
  const rules = options?.customRules || DEFAULT_CONSISTENCY_RULES;

  const globalMinConfidence = options?.minConfidenceThreshold ?? 0.8;
  const globalFuzzyThreshold = options?.fuzzyScoreThreshold ?? 0.85;
  const globalTolerance = options?.numericTolerancePercentage ?? 0;

  const results: ConsistencyFieldResult[] = [];
  const deficiencies: DeficiencyItem[] = [];

  let consistentCount = 0;
  let mismatchCount = 0;
  let lowConfidenceCount = 0;
  let requiresHumanReview = false;

  for (const rule of rules) {
    const declaredPath = rule.formFieldPath || rule.fieldName;
    const declaredValue = getFieldValueFromObject(formData, declaredPath);

    const targetDocs = rule.targetDocumentTypes || Array.from(docMap.keys());
    const ocrFieldCandidates = rule.ocrFieldNames || [rule.fieldName];

    for (const docType of targetDocs) {
      const docFields = docMap.get(docType);
      if (!docFields) continue; // Document not present in extractions

      // Find first matching extracted field name
      let extractedItem: OcrExtractedFieldItem | undefined;
      let matchedOcrKey: string | undefined;

      for (const candidateKey of ocrFieldCandidates) {
        if (docFields[candidateKey]) {
          extractedItem = docFields[candidateKey];
          matchedOcrKey = candidateKey;
          break;
        }
      }

      if (!extractedItem || matchedOcrKey === undefined) {
        continue; // Field not found in this document
      }

      const extractedValue =
        extractedItem.normalizedValue !== undefined
          ? extractedItem.normalizedValue
          : extractedItem.rawText !== undefined
          ? extractedItem.rawText
          : extractedItem.value;

      const confidence = extractedItem.confidence ?? 1.0;
      const minConfidence = rule.minConfidenceThreshold ?? globalMinConfidence;

      let status: FieldConsistencyStatus;
      let passed = false;
      let matchScore = 0.0;
      let deficiencyReason: string | undefined;
      let requiresOfficerReview = false;

      // 1. Confidence gate check
      if (confidence < minConfidence) {
        status = 'Low Confidence';
        passed = false;
        requiresOfficerReview = true;
        requiresHumanReview = true;
        lowConfidenceCount++;

        deficiencyReason = `OCR confidence (${confidence.toFixed(2)}) for "${rule.fieldName}" in ${docType} is below threshold (${minConfidence}). Routed to scrutiny officer for inspection.`;

        deficiencies.push({
          ruleId: `ocr-low-confidence-${rule.fieldName}-${docType}`,
          field: `${rule.fieldName}.${docType}`,
          deficiencyReason,
          severity: RuleSeverity.MANUAL_REVIEW,
        });
      } else {
        // 2. High/adequate confidence -> evaluate match against declared value
        switch (rule.matcher) {
          case 'NON_EMPTY_PRESENT': {
            const matchRes = matchNonEmptyPresent(extractedValue, declaredValue);
            matchScore = matchRes.score;
            if (matchRes.match) {
              status = declaredValue !== undefined && declaredValue !== null ? 'Consistent' : 'Present';
              passed = true;
              consistentCount++;
            } else {
              status = 'Mismatch';
              passed = false;
              mismatchCount++;
              deficiencyReason =
                rule.customErrorMessage ||
                `Mandatory field "${rule.fieldName}" is missing or empty in ${docType}.`;
              deficiencies.push({
                ruleId: `consistency-${rule.fieldName}-${docType}`,
                field: `${rule.fieldName}.${docType}`,
                deficiencyReason,
                severity: rule.severity || RuleSeverity.BLOCKING,
              });
            }
            break;
          }

          case 'FUZZY_TOKEN_RATIO': {
            if (declaredValue === undefined || declaredValue === null || declaredValue === '') {
              status = 'Extracted';
              passed = true;
              matchScore = 1.0;
              consistentCount++;
            } else {
              const fThreshold = rule.fuzzyScoreThreshold ?? globalFuzzyThreshold;
              const matchRes = matchFuzzyTokenRatio(declaredValue, extractedValue, fThreshold);
              matchScore = matchRes.score;

              if (matchRes.match) {
                status = 'Consistent';
                passed = true;
                consistentCount++;
              } else {
                status = 'Mismatch';
                passed = false;
                mismatchCount++;
                deficiencyReason =
                  rule.customErrorMessage ||
                  `Name discrepancy: declared "${declaredValue}", but ${docType} extracted "${extractedValue}" (similarity: ${(
                    matchScore * 100
                  ).toFixed(1)}%, required >= ${(fThreshold * 100).toFixed(0)}%).`;
                deficiencies.push({
                  ruleId: `consistency-${rule.fieldName}-${docType}`,
                  field: `${rule.fieldName}.${docType}`,
                  deficiencyReason,
                  severity: rule.severity || RuleSeverity.BLOCKING,
                });
              }
            }
            break;
          }

          case 'NORMALIZED_CONTAINS': {
            if (declaredValue === undefined || declaredValue === null || declaredValue === '') {
              status = 'Extracted';
              passed = true;
              matchScore = 1.0;
              consistentCount++;
            } else {
              const matchRes = matchNormalizedContains(declaredValue, extractedValue);
              matchScore = matchRes.score;

              if (matchRes.match) {
                status = 'Consistent';
                passed = true;
                consistentCount++;
              } else {
                status = 'Mismatch';
                passed = false;
                mismatchCount++;
                deficiencyReason =
                  rule.customErrorMessage ||
                  `Community/Category discrepancy: declared "${declaredValue}", but ${docType} extracted "${extractedValue}".`;
                deficiencies.push({
                  ruleId: `consistency-${rule.fieldName}-${docType}`,
                  field: `${rule.fieldName}.${docType}`,
                  deficiencyReason,
                  severity: rule.severity || RuleSeverity.BLOCKING,
                });
              }
            }
            break;
          }

          case 'NUMERIC_EXACT': {
            if (declaredValue === undefined || declaredValue === null) {
              status = 'Extracted';
              passed = true;
              matchScore = 1.0;
              consistentCount++;
            } else {
              const tolerance = rule.tolerancePercentage ?? globalTolerance;
              const matchRes = matchNumericExact(declaredValue, extractedValue, tolerance);
              matchScore = matchRes.score;

              if (matchRes.match) {
                status = 'Consistent';
                passed = true;
                consistentCount++;
              } else {
                status = 'Mismatch';
                passed = false;
                mismatchCount++;
                deficiencyReason =
                  rule.customErrorMessage ||
                  `Income discrepancy: declared "${declaredValue}", but ${docType} extracted "${extractedValue}".`;
                deficiencies.push({
                  ruleId: `consistency-${rule.fieldName}-${docType}`,
                  field: `${rule.fieldName}.${docType}`,
                  deficiencyReason,
                  severity: rule.severity || RuleSeverity.BLOCKING,
                });
              }
            }
            break;
          }
        }
      }

      const fieldRes: ConsistencyFieldResult = {
        fieldName: rule.fieldName,
        documentType: docType,
        declaredValue,
        extractedValue,
        confidence,
        matchScore,
        matcher: rule.matcher,
        status,
        passed,
        requiresOfficerReview,
      };

      if (deficiencyReason !== undefined) {
        fieldRes.deficiencyReason = deficiencyReason;
      }

      results.push(fieldRes);
    }
  }

  const isConsistent = mismatchCount === 0;

  return {
    isConsistent,
    totalFieldsChecked: results.length,
    consistentCount,
    mismatchCount,
    lowConfidenceCount,
    results,
    deficiencies,
    requiresHumanReview,
    evaluatedAt: new Date().toISOString(),
  };
}
