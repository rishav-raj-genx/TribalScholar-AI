import {
  DocumentType,
  RuleOperator,
  RuleSeverity,
  SchemeCode,
  type SchemeRuleSet,
} from '@tribalscholar/shared';

// ==============================================================================
// Types & Contracts
// ==============================================================================

export interface ExpectedConstraint {
  operator: string;
  value: unknown;
  formatted: string;
  toString(): string;
}

export interface RuleEvaluationItem {
  ruleId: string;
  conditionId: string;
  field: string;
  passed: boolean;
  actualValue: unknown;
  expectedConstraint: ExpectedConstraint;
  expectedValue: unknown;
  severity: RuleSeverity;
  deficiencyReason: string;
  message: string;
  groupId?: string;
  groupName?: string;
}

export interface DocumentCompletenessItem {
  documentType: DocumentType;
  label: string;
  mandatory: boolean;
  uploaded: boolean;
  passed: boolean;
  deficiencyReason: string;
}

export interface DocumentCompletenessResult {
  isComplete: boolean;
  totalRequired: number;
  uploadedCount: number;
  missingCount: number;
  missingDocuments: DocumentType[];
  details: DocumentCompletenessItem[];
}

export interface DeficiencyItem {
  ruleId: string;
  field: string;
  deficiencyReason: string;
  severity: RuleSeverity;
}

export interface EligibilityEvaluationResult {
  isEligible: boolean;
  isDocumentComplete: boolean;
  overallPassed: boolean;
  blockingFailuresCount: number;
  warningCount: number;
  ruleResults: RuleEvaluationItem[];
  documentResults: DocumentCompletenessResult;
  deficiencies: DeficiencyItem[];
  summary: {
    totalRulesEvaluated: number;
    passedRulesCount: number;
    failedRulesCount: number;
  };
  evaluatedAt: string;
}

export interface DocumentRequirementSpec {
  documentType: DocumentType;
  label?: string | undefined;
  mandatory?: boolean | undefined;
  maxSizeMb?: number | undefined;
  allowedFormats?: string[] | undefined;
}

export interface SchemeRuleConditionInput {
  id: string;
  field: string;
  operator: RuleOperator | string;
  value: unknown;
  errorMessage?: string;
  severity?: RuleSeverity;
}

export interface SchemeRuleGroupInput {
  id: string;
  name: string;
  description?: string;
  logicalOperator?: 'AND' | 'OR';
  conditions: SchemeRuleConditionInput[];
}

export interface SchemeVersionLike {
  id?: string;
  schemeCode?: SchemeCode | string;
  versionNumber?: number;
  academicYear?: string;
  incomeCeiling?: number | unknown;
  eligibilityRules?:
    | SchemeRuleSet
    | { eligibilityGroups?: SchemeRuleGroupInput[]; conditions?: SchemeRuleConditionInput[] }
    | unknown;
  documentRequirements?: DocumentRequirementSpec[] | DocumentType[] | unknown;
  requiredDocs?: DocumentRequirementSpec[] | DocumentType[] | unknown;
  requiredDocumentTypes?: DocumentType[] | unknown;
  [key: string]: unknown;
}

export interface ApplicantProfileLike {
  dateOfBirth?: string | Date;
  gender?: string;
  casteCommunity?: string;
  subTribe?: string;
  fatherOrSpouseName?: string;
  annualIncome?: number | string;
  age?: number;
  aadhaarVerified?: boolean;
  state?: string;
  district?: string;
  addressLine?: string;
  pincode?: string;
  bankIfsc?: string;
  bankName?: string;
  [key: string]: unknown;
}

export interface EvaluationInput {
  schemeVersion: SchemeVersionLike;
  applicantProfile?: ApplicantProfileLike | null;
  formData?: Record<string, unknown> | null;
  uploadedDocuments?: Array<DocumentType | { documentType: DocumentType }> | DocumentType[];
  applicationId?: string;
  extraContext?: Record<string, unknown>;
}

// ==============================================================================
// Human-Readable Labels for Documents
// ==============================================================================

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.AADHAAR_CARD]: 'Aadhaar Card (Masked/E-Aadhaar)',
  [DocumentType.CASTE_CERTIFICATE]: 'Scheduled Tribe Community Certificate',
  [DocumentType.ST_CASTE_CERTIFICATE]: 'Scheduled Tribe Community Certificate',
  [DocumentType.INCOME_CERTIFICATE]: 'Income Certificate from Competent Revenue Authority',
  [DocumentType.DOMICILE_CERTIFICATE]: 'Domicile Certificate',
  [DocumentType.MARKSHEET_10TH]: 'Class 10th Marksheet / Passing Certificate',
  [DocumentType.MARKSHEET_12TH]: 'Class 12th Marksheet / Passing Certificate',
  [DocumentType.MARKSHEET_UG]: 'Undergraduate Degree Transcripts & Degree Certificate',
  [DocumentType.MARKSHEET_PG]: 'Post-Graduate Degree Marksheet / Transcripts',
  [DocumentType.ACADEMIC_MARKSHEET]: 'Academic Marksheet / Degree Certificate',
  [DocumentType.ADMISSION_OFFER_LETTER]: 'Admission Offer Letter / Confirmation',
  [DocumentType.BONAFIDE_CERTIFICATE]: 'Institution Bonafide Certificate',
  [DocumentType.FEE_RECEIPT]: 'Fee Receipt / Structure',
  [DocumentType.BANK_PASSBOOK]: 'Bank Passbook / Cancelled Cheque',
  [DocumentType.SYNOPSIS_RESEARCH_PROPOSAL]: 'Approved Research Synopsis / Topic Proposal',
  [DocumentType.JOINING_REPORT]: 'University Joining Report',
  [DocumentType.OTHER]: 'Other Document',
};

// ==============================================================================
// Pure Deterministic Operator Implementations
// ==============================================================================

function evaluateEquals(actual: unknown, expected: unknown): boolean {
  if (actual === expected) return true;
  if (actual === null || actual === undefined || expected === null || expected === undefined) {
    return actual === expected;
  }
  if (typeof expected === 'boolean') {
    return Boolean(actual) === expected;
  }
  if (typeof expected === 'number' || typeof actual === 'number') {
    const numActual = Number(actual);
    const numExpected = Number(expected);
    if (!isNaN(numActual) && !isNaN(numExpected)) {
      return numActual === numExpected;
    }
  }
  if (typeof actual === 'string' && typeof expected === 'string') {
    return actual.trim().toLowerCase() === expected.trim().toLowerCase();
  }
  return false;
}

function evaluateNotEquals(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined) {
    return false;
  }
  if (expected === '') {
    return String(actual).trim() !== '';
  }
  return !evaluateEquals(actual, expected);
}

function evaluateLTE(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined || actual === '') return false;
  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numExpected = typeof expected === 'number' ? expected : Number(expected);
  if (isNaN(numActual) || isNaN(numExpected)) return false;
  return numActual <= numExpected;
}

function evaluateGTE(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined || actual === '') return false;
  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numExpected = typeof expected === 'number' ? expected : Number(expected);
  if (isNaN(numActual) || isNaN(numExpected)) return false;
  return numActual >= numExpected;
}

function evaluateLT(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined || actual === '') return false;
  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numExpected = typeof expected === 'number' ? expected : Number(expected);
  if (isNaN(numActual) || isNaN(numExpected)) return false;
  return numActual < numExpected;
}

function evaluateGT(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined || actual === '') return false;
  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numExpected = typeof expected === 'number' ? expected : Number(expected);
  if (isNaN(numActual) || isNaN(numExpected)) return false;
  return numActual > numExpected;
}

function evaluateIn(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined) return false;
  if (Array.isArray(expected)) {
    return expected.some((exp) => evaluateEquals(actual, exp));
  }
  if (typeof expected === 'string') {
    const list = expected.split(',').map((s) => s.trim());
    return list.some((item) => evaluateEquals(actual, item));
  }
  return false;
}

function evaluateNotIn(actual: unknown, expected: unknown): boolean {
  return !evaluateIn(actual, expected);
}

function evaluateBoolean(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined) return false;
  const boolExpected =
    typeof expected === 'boolean'
      ? expected
      : String(expected).toLowerCase() === 'true' || expected === 1;
  const boolActual =
    typeof actual === 'boolean'
      ? actual
      : String(actual).toLowerCase() === 'true' || actual === 1;
  return boolActual === boolExpected;
}

function evaluateContains(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined) return false;
  if (Array.isArray(actual)) {
    return actual.some((item) => evaluateEquals(item, expected));
  }
  if (typeof actual === 'string') {
    return actual.toLowerCase().includes(String(expected).toLowerCase());
  }
  return false;
}

function evaluateRegexMatch(actual: unknown, expected: unknown): boolean {
  if (actual === null || actual === undefined) return false;
  try {
    const regex = new RegExp(String(expected));
    return regex.test(String(actual));
  } catch {
    return false;
  }
}

function evaluateExists(actual: unknown, expected: unknown): boolean {
  const exists = actual !== null && actual !== undefined && actual !== '';
  const boolExpected = expected === undefined || expected === true || expected === 'true';
  return boolExpected ? exists : !exists;
}

export function evaluateOperator(
  operator: string,
  actual: unknown,
  expected: unknown
): boolean {
  const op = String(operator).toUpperCase().trim();
  switch (op) {
    case 'EQ':
    case 'EQUALS':
    case '==':
    case '===':
      return evaluateEquals(actual, expected);

    case 'NEQ':
    case 'NOT_EQUALS':
    case '!=':
    case '!==':
      return evaluateNotEquals(actual, expected);

    case 'LTE':
    case 'LESS_THAN_OR_EQUAL':
    case '<=':
      return evaluateLTE(actual, expected);

    case 'GTE':
    case 'GREATER_THAN_OR_EQUAL':
    case '>=':
      return evaluateGTE(actual, expected);

    case 'LT':
    case 'LESS_THAN':
    case '<':
      return evaluateLT(actual, expected);

    case 'GT':
    case 'GREATER_THAN':
    case '>':
      return evaluateGT(actual, expected);

    case 'IN':
      return evaluateIn(actual, expected);

    case 'NOT_IN':
      return evaluateNotIn(actual, expected);

    case 'BOOLEAN':
      return evaluateBoolean(actual, expected);

    case 'CONTAINS':
      return evaluateContains(actual, expected);

    case 'REGEX_MATCH':
      return evaluateRegexMatch(actual, expected);

    case 'EXISTS':
      return evaluateExists(actual, expected);

    default:
      throw new Error(`Unsupported rule operator: "${operator}"`);
  }
}

export function formatExpectedConstraint(
  operator: string,
  value: unknown
): ExpectedConstraint {
  const valueStr =
    typeof value === 'string'
      ? `'${value}'`
      : typeof value === 'object' && value !== null
      ? JSON.stringify(value)
      : String(value);
  const formatted = `${operator} ${valueStr}`;
  return {
    operator,
    value,
    formatted,
    toString() {
      return formatted;
    },
  };
}

// ==============================================================================
// Context Resolution & Normalization
// ==============================================================================

export function resolveFieldValue(context: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;

  // 1. Direct key match (e.g., context['applicant.casteCommunity'])
  if (Object.prototype.hasOwnProperty.call(context, path)) {
    return context[path];
  }

  // 2. Nested dot path traversal (e.g., context.applicant.casteCommunity)
  const segments = path.split('.');
  let current: unknown = context;
  let found = true;

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      found = false;
      break;
    }
  }

  if (found) {
    return current;
  }

  // 3. Fallback: single segment search in nested sub-objects
  if (segments.length === 1) {
    const key = segments[0] as string;
    const subObjects = ['applicant', 'applicantProfile', 'profile', 'formData', 'academic'];
    for (const sub of subObjects) {
      const obj = context[sub];
      if (obj && typeof obj === 'object' && key in (obj as Record<string, unknown>)) {
        return (obj as Record<string, unknown>)[key];
      }
    }
  }

  // 4. Fallback: academic.* path resolution when formData was passed directly without 'academic' nesting
  if (segments.length === 2 && segments[0] === 'academic') {
    const key = segments[1] as string;
    if (context[key] !== undefined) return context[key];
    const formData = context.formData as Record<string, unknown> | undefined;
    if (formData && formData[key] !== undefined) return formData[key];
  }

  // 5. Fallback: age calculation from dateOfBirth
  if (path === 'applicant.age' || path === 'age') {
    const dob = resolveFieldValue(context, 'applicant.dateOfBirth') || resolveFieldValue(context, 'dateOfBirth');
    if (dob) {
      const d = new Date(dob as string | number | Date);
      if (!isNaN(d.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
          age--;
        }
        return age;
      }
    }
  }

  return undefined;
}

export function buildEvaluationContext(
  applicantProfile?: ApplicantProfileLike | null,
  formData?: Record<string, unknown> | null,
  extraContext?: Record<string, unknown>
): Record<string, unknown> {
  const profile = applicantProfile ? { ...applicantProfile } : {};
  const form = formData ? { ...formData } : {};

  // Auto-calculate age if missing but dateOfBirth is present
  if (profile.age === undefined && profile.dateOfBirth) {
    const dob = new Date(profile.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let calculatedAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        calculatedAge--;
      }
      profile.age = calculatedAge;
    }
  }

  const academic =
    (form.academic as Record<string, unknown> | undefined) ||
    (form as Record<string, unknown>);

  if (typeof academic === 'object' && academic !== null) {
    if (academic.pgMarksPercentage === undefined && form.qualifyingPercentage !== undefined) {
      academic.pgMarksPercentage = Number(form.qualifyingPercentage);
    }
  }

  if (profile.aadhaarVerified === undefined && form.aadhaarVerified !== undefined) {
    profile.aadhaarVerified = Boolean(form.aadhaarVerified);
  }

  const unified: Record<string, unknown> = {
    ...profile,
    ...form,
    applicant: {
      ...profile,
      ...(typeof form.applicant === 'object' && form.applicant !== null
        ? (form.applicant as Record<string, unknown>)
        : {}),
    },
    applicantProfile: profile,
    profile: profile,
    formData: form,
    academic: academic,
    ...extraContext,
  };

  return unified;
}

export function normalizeDocumentRequirements(input: unknown): DocumentRequirementSpec[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map((item: unknown): DocumentRequirementSpec => {
      if (typeof item === 'string') {
        const docType = item as DocumentType;
        return {
          documentType: docType,
          label: DOCUMENT_TYPE_LABELS[docType] || docType,
          mandatory: true,
        };
      }
      if (item && typeof item === 'object' && 'documentType' in item) {
        const spec = item as {
          documentType: DocumentType;
          label?: string;
          mandatory?: boolean;
          maxSizeMb?: number;
          allowedFormats?: string[];
        };
        const docType = spec.documentType;
        const res: DocumentRequirementSpec = {
          documentType: docType,
          label: spec.label || DOCUMENT_TYPE_LABELS[docType] || docType,
          mandatory: spec.mandatory !== false,
        };
        if (spec.maxSizeMb !== undefined) {
          res.maxSizeMb = spec.maxSizeMb;
        }
        if (spec.allowedFormats !== undefined) {
          res.allowedFormats = spec.allowedFormats;
        }
        return res;
      }
      return {
        documentType: DocumentType.OTHER,
        label: 'Other',
        mandatory: false,
      };
    });
  }

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.documentRequirements)) {
      return normalizeDocumentRequirements(obj.documentRequirements);
    }
    if (Array.isArray(obj.requiredDocs)) {
      return normalizeDocumentRequirements(obj.requiredDocs);
    }
    if (Array.isArray(obj.requiredDocumentTypes)) {
      return normalizeDocumentRequirements(obj.requiredDocumentTypes);
    }
  }

  return [];
}

export function normalizeEligibilityGroups(input: unknown): SchemeRuleGroupInput[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    if (input.length === 0) return [];
    const first = input[0];
    if (first && typeof first === 'object' && 'conditions' in first) {
      return input as SchemeRuleGroupInput[];
    }
    if (first && typeof first === 'object' && 'field' in first && 'operator' in first) {
      return [
        {
          id: 'default-group',
          name: 'General Eligibility Rules',
          logicalOperator: 'AND',
          conditions: input as SchemeRuleConditionInput[],
        },
      ];
    }
  }

  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.eligibilityGroups)) {
      return obj.eligibilityGroups as SchemeRuleGroupInput[];
    }
    if (Array.isArray(obj.conditions)) {
      return [
        {
          id: (obj.id as string) || 'default-group',
          name: (obj.name as string) || 'Eligibility Rules',
          logicalOperator: (obj.logicalOperator as 'AND' | 'OR') || 'AND',
          conditions: obj.conditions as SchemeRuleConditionInput[],
        },
      ];
    }
  }

  return [];
}

// ==============================================================================
// Evaluator Core Functions
// ==============================================================================

export function evaluateCondition(
  condition: SchemeRuleConditionInput,
  context: Record<string, unknown>,
  groupId?: string,
  groupName?: string
): RuleEvaluationItem {
  const actualValue = resolveFieldValue(context, condition.field);
  const passed = evaluateOperator(String(condition.operator), actualValue, condition.value);
  const severity = condition.severity || RuleSeverity.BLOCKING;

  const expectedConstraint = formatExpectedConstraint(
    String(condition.operator),
    condition.value
  );

  const defaultErrorMessage = `Criteria for "${condition.field}" failed: expected ${expectedConstraint.formatted}, but got ${
    actualValue === undefined ? 'undefined' : JSON.stringify(actualValue)
  }`;

  const deficiencyReason = passed ? '' : (condition.errorMessage || defaultErrorMessage);
  const message = condition.errorMessage || defaultErrorMessage;

  const item: RuleEvaluationItem = {
    ruleId: condition.id,
    conditionId: condition.id,
    field: condition.field,
    passed,
    actualValue: actualValue ?? null,
    expectedConstraint,
    expectedValue: condition.value,
    severity,
    deficiencyReason,
    message,
  };

  if (groupId !== undefined) {
    item.groupId = groupId;
  }
  if (groupName !== undefined) {
    item.groupName = groupName;
  }

  return item;
}

export function evaluateDocumentCompleteness(
  requirements: unknown,
  uploadedDocuments:
    | Array<DocumentType | { documentType: DocumentType }>
    | DocumentType[]
    | Set<string>
    | undefined
): DocumentCompletenessResult {
  const normalizedSpecs = normalizeDocumentRequirements(requirements);
  const uploadedSet = new Set<string>();

  if (uploadedDocuments) {
    if (uploadedDocuments instanceof Set) {
      for (const item of uploadedDocuments) {
        uploadedSet.add(String(item));
      }
    } else if (Array.isArray(uploadedDocuments)) {
      for (const item of uploadedDocuments) {
        if (typeof item === 'string') {
          uploadedSet.add(item);
        } else if (item && typeof item === 'object' && 'documentType' in item) {
          uploadedSet.add(item.documentType);
        }
      }
    }
  }

  const details: DocumentCompletenessItem[] = [];
  const missingDocuments: DocumentType[] = [];
  let uploadedCount = 0;

  for (const spec of normalizedSpecs) {
    const isUploaded =
      uploadedSet.has(spec.documentType) ||
      (spec.documentType === DocumentType.CASTE_CERTIFICATE &&
        uploadedSet.has(DocumentType.ST_CASTE_CERTIFICATE)) ||
      (spec.documentType === DocumentType.ST_CASTE_CERTIFICATE &&
        uploadedSet.has(DocumentType.CASTE_CERTIFICATE)) ||
      (spec.documentType === DocumentType.MARKSHEET_PG &&
        uploadedSet.has(DocumentType.ACADEMIC_MARKSHEET)) ||
      (spec.documentType === DocumentType.ACADEMIC_MARKSHEET &&
        uploadedSet.has(DocumentType.MARKSHEET_PG));
    if (isUploaded) {
      uploadedCount++;
    }

    const mandatory = spec.mandatory !== false;
    const passed = !mandatory || isUploaded;
    const label = spec.label || DOCUMENT_TYPE_LABELS[spec.documentType] || spec.documentType;

    const deficiencyReason = passed
      ? ''
      : `Mandatory document "${label}" (${spec.documentType}) has not been uploaded.`;

    if (!isUploaded && mandatory) {
      missingDocuments.push(spec.documentType);
    }

    details.push({
      documentType: spec.documentType,
      label,
      mandatory,
      uploaded: isUploaded,
      passed,
      deficiencyReason,
    });
  }

  const isComplete = missingDocuments.length === 0;

  return {
    isComplete,
    totalRequired: normalizedSpecs.filter((s) => s.mandatory !== false).length,
    uploadedCount,
    missingCount: missingDocuments.length,
    missingDocuments,
    details,
  };
}

export function evaluateEligibility(
  schemeVersionOrInput: SchemeVersionLike | EvaluationInput,
  maybeContext?: {
    applicantProfile?: ApplicantProfileLike | null;
    formData?: Record<string, unknown> | null;
    uploadedDocuments?: Array<DocumentType | { documentType: DocumentType }> | DocumentType[];
    applicationId?: string;
    extraContext?: Record<string, unknown>;
  }
): EligibilityEvaluationResult {
  let schemeVersion: SchemeVersionLike;
  let applicantProfile: ApplicantProfileLike | null | undefined;
  let formData: Record<string, unknown> | null | undefined;
  let uploadedDocuments: Array<DocumentType | { documentType: DocumentType }> | DocumentType[] | undefined;
  let extraContext: Record<string, unknown> | undefined;

  if (
    schemeVersionOrInput &&
    typeof schemeVersionOrInput === 'object' &&
    'schemeVersion' in schemeVersionOrInput &&
    (schemeVersionOrInput as EvaluationInput).schemeVersion !== undefined
  ) {
    const input = schemeVersionOrInput as EvaluationInput;
    schemeVersion = input.schemeVersion;
    applicantProfile = input.applicantProfile;
    formData = input.formData;
    uploadedDocuments = input.uploadedDocuments;
    extraContext = input.extraContext;
  } else {
    schemeVersion = schemeVersionOrInput as SchemeVersionLike;
    applicantProfile = maybeContext?.applicantProfile;
    formData = maybeContext?.formData;
    uploadedDocuments = maybeContext?.uploadedDocuments;
    extraContext = maybeContext?.extraContext;
  }

  const context = buildEvaluationContext(applicantProfile, formData, extraContext);

  const eligibilityRules = schemeVersion.eligibilityRules || schemeVersion;
  const groups = normalizeEligibilityGroups(eligibilityRules);

  const ruleResults: RuleEvaluationItem[] = [];
  const deficiencies: DeficiencyItem[] = [];
  let blockingRuleFailuresCount = 0;
  let warningCount = 0;
  let totalRulesEvaluated = 0;
  let passedRulesCount = 0;
  let failedRulesCount = 0;

  for (const group of groups) {
    const isOrGroup = group.logicalOperator === 'OR';
    const groupResults: RuleEvaluationItem[] = [];
    let groupHasPassingCondition = false;

    for (const condition of group.conditions) {
      totalRulesEvaluated++;
      const item = evaluateCondition(condition, context, group.id, group.name);
      groupResults.push(item);
      ruleResults.push(item);

      if (item.passed) {
        passedRulesCount++;
        groupHasPassingCondition = true;
      } else {
        failedRulesCount++;
      }
    }

    if (isOrGroup) {
      if (!groupHasPassingCondition) {
        for (const item of groupResults) {
          if (!item.passed) {
            if (item.severity === RuleSeverity.BLOCKING) {
              blockingRuleFailuresCount++;
              deficiencies.push({
                ruleId: item.ruleId,
                field: item.field,
                deficiencyReason: item.deficiencyReason,
                severity: item.severity,
              });
            } else if (item.severity === RuleSeverity.WARNING) {
              warningCount++;
            }
          }
        }
      }
    } else {
      for (const item of groupResults) {
        if (!item.passed) {
          if (item.severity === RuleSeverity.BLOCKING) {
            blockingRuleFailuresCount++;
            deficiencies.push({
              ruleId: item.ruleId,
              field: item.field,
              deficiencyReason: item.deficiencyReason,
              severity: item.severity,
            });
          } else if (item.severity === RuleSeverity.WARNING) {
            warningCount++;
          }
        }
      }
    }
  }

  const docRequirementsInput =
    schemeVersion.documentRequirements ||
    schemeVersion.requiredDocs ||
    schemeVersion.requiredDocumentTypes ||
    (typeof schemeVersion.eligibilityRules === 'object' && schemeVersion.eligibilityRules !== null
      ? (schemeVersion.eligibilityRules as Record<string, unknown>).requiredDocumentTypes
      : undefined);

  const documentResults = evaluateDocumentCompleteness(
    docRequirementsInput,
    uploadedDocuments
  );

  for (const docDetail of documentResults.details) {
    totalRulesEvaluated++;
    const docConstraint = formatExpectedConstraint('EXISTS', 'UPLOADED');
    const docRuleItem: RuleEvaluationItem = {
      ruleId: `doc-req-${docDetail.documentType}`,
      conditionId: `doc-req-${docDetail.documentType}`,
      field: `documents.${docDetail.documentType}`,
      passed: docDetail.passed,
      actualValue: docDetail.uploaded ? 'UPLOADED' : 'MISSING',
      expectedConstraint: docConstraint,
      expectedValue: 'UPLOADED',
      severity: docDetail.mandatory ? RuleSeverity.BLOCKING : RuleSeverity.WARNING,
      deficiencyReason: docDetail.deficiencyReason,
      message: docDetail.passed
        ? `Document "${docDetail.label}" is uploaded.`
        : docDetail.deficiencyReason,
      groupId: 'group-document-completeness',
      groupName: 'Required Document Completeness',
    };

    ruleResults.push(docRuleItem);

    if (docDetail.passed) {
      passedRulesCount++;
    } else {
      failedRulesCount++;
      if (docDetail.mandatory) {
        deficiencies.push({
          ruleId: docRuleItem.ruleId,
          field: docRuleItem.field,
          deficiencyReason: docDetail.deficiencyReason,
          severity: RuleSeverity.BLOCKING,
        });
      }
    }
  }

  const missingMandatoryDocsCount = documentResults.missingDocuments.length;
  const isEligible = blockingRuleFailuresCount === 0;
  const isDocumentComplete = documentResults.isComplete;
  const overallPassed = isEligible && isDocumentComplete;
  const blockingFailuresCount = blockingRuleFailuresCount + missingMandatoryDocsCount;

  return {
    isEligible,
    isDocumentComplete,
    overallPassed,
    blockingFailuresCount,
    warningCount,
    ruleResults,
    documentResults,
    deficiencies,
    summary: {
      totalRulesEvaluated,
      passedRulesCount,
      failedRulesCount,
    },
    evaluatedAt: new Date().toISOString(),
  };
}
