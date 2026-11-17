import { describe, expect, it } from 'vitest';
import {
  DocumentType,
  RuleOperator,
  RuleSeverity,
  SchemeCode,
} from '@tribalscholar/shared';
import { SEED_SCHEMES } from '../seed-data.js';
import {
  evaluateCondition,
  evaluateDocumentCompleteness,
  evaluateEligibility,
  evaluateOperator,
  type EvaluationInput,
  type SchemeVersionLike,
} from '../modules/ruleEngine/eligibilityEvaluator.js';

describe('Deterministic Rule Engine: Eligibility & Document Completeness Evaluator', () => {
  const nfstScheme = SEED_SCHEMES.find((s) => s.code === SchemeCode.NFST);
  const nosScheme = SEED_SCHEMES.find((s) => s.code === SchemeCode.NOS);

  if (!nfstScheme || !nosScheme) {
    throw new Error('Seed schemes NFST and NOS must be present for testing.');
  }

  // ============================================================================
  // NFST (National Fellowship for Higher Education of ST Students) Tests
  // ============================================================================

  describe('NFST Version 1 Eligibility & Document Evaluation', () => {
    const validNfstDocs: DocumentType[] = [
      DocumentType.AADHAAR_CARD,
      DocumentType.CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.MARKSHEET_PG,
      DocumentType.ADMISSION_OFFER_LETTER,
      DocumentType.BONAFIDE_CERTIFICATE,
      DocumentType.BANK_PASSBOOK,
      DocumentType.SYNOPSIS_RESEARCH_PROPOSAL,
    ];

    it('should PASS an eligible ST applicant with all 8 mandatory documents and income under ceiling', () => {
      const input: EvaluationInput = {
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: 'Santhal',
          subTribe: 'Munda',
          annualIncome: 80000.0,
          aadhaarVerified: true,
          dateOfBirth: '2000-01-15T00:00:00.000Z',
        },
        formData: {
          academic: {
            pgMarksPercentage: 68.5,
          },
        },
        uploadedDocuments: validNfstDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(true);
      expect(result.overallPassed).toBe(true);
      expect(result.blockingFailuresCount).toBe(0);
      expect(result.deficiencies).toHaveLength(0);

      // Verify each individual rule passed
      const casteRule = result.ruleResults.find((r) => r.ruleId === 'nfst-caste-validity');
      expect(casteRule).toBeDefined();
      expect(casteRule?.passed).toBe(true);
      expect(casteRule?.actualValue).toBe('Santhal');

      const incomeRule = result.ruleResults.find((r) => r.ruleId === 'nfst-income-ceiling');
      expect(incomeRule).toBeDefined();
      expect(incomeRule?.passed).toBe(true);
      expect(incomeRule?.actualValue).toBe(80000.0);

      const pgRule = result.ruleResults.find((r) => r.ruleId === 'nfst-pg-percentage');
      expect(pgRule).toBeDefined();
      expect(pgRule?.passed).toBe(true);
      expect(pgRule?.actualValue).toBe(68.5);

      const aadhaarRule = result.ruleResults.find((r) => r.ruleId === 'nfst-aadhaar-check');
      expect(aadhaarRule).toBeDefined();
      expect(aadhaarRule?.passed).toBe(true);
      expect(aadhaarRule?.actualValue).toBe(true);

      // Document completeness
      expect(result.documentResults.isComplete).toBe(true);
      expect(result.documentResults.missingCount).toBe(0);
    });

    it('should FAIL an applicant with empty / non-ST category and return descriptive deficiency', () => {
      const input: EvaluationInput = {
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: '', // Non-ST or missing community
          annualIncome: 120000.0,
          aadhaarVerified: true,
        },
        formData: {
          academic: {
            pgMarksPercentage: 70.0,
          },
        },
        uploadedDocuments: validNfstDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);
      expect(result.blockingFailuresCount).toBe(1);

      const casteDeficiency = result.deficiencies.find((d) => d.ruleId === 'nfst-caste-validity');
      expect(casteDeficiency).toBeDefined();
      expect(casteDeficiency?.severity).toBe(RuleSeverity.BLOCKING);
      expect(casteDeficiency?.deficiencyReason).toContain(
        'A valid Scheduled Tribe (ST) certificate is mandatory for NFST fellowship'
      );

      const casteRule = result.ruleResults.find((r) => r.ruleId === 'nfst-caste-validity');
      expect(casteRule?.passed).toBe(false);
      expect(casteRule?.actualValue).toBe('');
      expect(casteRule?.expectedConstraint.toString()).toBe("NOT_EQUALS ''");
    });

    it('should FAIL an applicant with annual income exceeding Rs 6,00,000 ceiling', () => {
      const input: EvaluationInput = {
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: 'Gond',
          annualIncome: 750000.0, // Exceeds 6,00,000 ceiling
          aadhaarVerified: true,
        },
        formData: {
          academic: {
            pgMarksPercentage: 62.0,
          },
        },
        uploadedDocuments: validNfstDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);

      const incomeDeficiency = result.deficiencies.find((d) => d.ruleId === 'nfst-income-ceiling');
      expect(incomeDeficiency).toBeDefined();
      expect(incomeDeficiency?.deficiencyReason).toContain(
        'exceeds the ceiling of Rs. 6,00,000 for NFST'
      );

      const incomeRule = result.ruleResults.find((r) => r.ruleId === 'nfst-income-ceiling');
      expect(incomeRule?.passed).toBe(false);
      expect(incomeRule?.actualValue).toBe(750000.0);
      expect(incomeRule?.expectedConstraint.value).toBe(600000.0);
      expect(incomeRule?.expectedConstraint.toString()).toBe('LESS_THAN_OR_EQUAL 600000');
    });

    it('should FAIL when mandatory ST CASTE_CERTIFICATE is missing from uploads', () => {
      // Omit CASTE_CERTIFICATE from uploaded documents
      const docsMissingCaste = validNfstDocs.filter((d) => d !== DocumentType.CASTE_CERTIFICATE);

      const input: EvaluationInput = {
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: 'Bodo',
          annualIncome: 90000.0,
          aadhaarVerified: true,
        },
        formData: {
          academic: {
            pgMarksPercentage: 60.0,
          },
        },
        uploadedDocuments: docsMissingCaste,
      };

      const result = evaluateEligibility(input);

      // Rules pass, but document completeness fails
      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.overallPassed).toBe(false);
      expect(result.documentResults.missingDocuments).toContain(DocumentType.CASTE_CERTIFICATE);

      const docDeficiency = result.deficiencies.find((d) =>
        d.field.includes('CASTE_CERTIFICATE')
      );
      expect(docDeficiency).toBeDefined();
      expect(docDeficiency?.severity).toBe(RuleSeverity.BLOCKING);
      expect(docDeficiency?.deficiencyReason).toContain('Scheduled Tribe Community Certificate');
      expect(docDeficiency?.deficiencyReason).toContain('has not been uploaded');

      const docRule = result.ruleResults.find(
        (r) => r.ruleId === 'doc-req-CASTE_CERTIFICATE'
      );
      expect(docRule).toBeDefined();
      expect(docRule?.passed).toBe(false);
      expect(docRule?.actualValue).toBe('MISSING');
      expect(docRule?.expectedValue).toBe('UPLOADED');
    });

    it('should FAIL when qualifying PG marks percentage is below 55%', () => {
      const input: EvaluationInput = {
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: 'Bhil',
          annualIncome: 100000.0,
          aadhaarVerified: true,
        },
        formData: {
          academic: {
            pgMarksPercentage: 51.5, // Below 55%
          },
        },
        uploadedDocuments: validNfstDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);

      const pgDeficiency = result.deficiencies.find((d) => d.ruleId === 'nfst-pg-percentage');
      expect(pgDeficiency).toBeDefined();
      expect(pgDeficiency?.deficiencyReason).toContain(
        'Minimum 55% marks required in Post-Graduate qualifying examination'
      );

      const pgRule = result.ruleResults.find((r) => r.ruleId === 'nfst-pg-percentage');
      expect(pgRule?.passed).toBe(false);
      expect(pgRule?.actualValue).toBe(51.5);
    });

    it('should aggregate MULTIPLE deficiencies simultaneously (caste missing + income excess + doc missing)', () => {
      const incompleteDocs = [
        DocumentType.AADHAAR_CARD,
        DocumentType.INCOME_CERTIFICATE,
      ];

      const input: EvaluationInput = {
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: '', // Deficient 1
          annualIncome: 850000.0, // Deficient 2 (exceeds 6,00,000)
          aadhaarVerified: false, // Deficient 3
        },
        formData: {
          academic: {
            pgMarksPercentage: 48.0, // Deficient 4 (below 55%)
          },
        },
        uploadedDocuments: incompleteDocs, // Deficient 5: 6 missing mandatory docs
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.overallPassed).toBe(false);

      // 4 blocking rule failures + 6 missing mandatory documents = 10 blocking failures
      expect(result.blockingFailuresCount).toBe(10);
      expect(result.deficiencies.length).toBe(10);

      const failedRuleIds = result.deficiencies.map((d) => d.ruleId);
      expect(failedRuleIds).toContain('nfst-caste-validity');
      expect(failedRuleIds).toContain('nfst-income-ceiling');
      expect(failedRuleIds).toContain('nfst-aadhaar-check');
      expect(failedRuleIds).toContain('nfst-pg-percentage');
      expect(failedRuleIds).toContain('doc-req-CASTE_CERTIFICATE');
      expect(failedRuleIds).toContain('doc-req-MARKSHEET_PG');
      expect(failedRuleIds).toContain('doc-req-ADMISSION_OFFER_LETTER');
    });
  });

  // ============================================================================
  // NOS (National Overseas Scholarship for ST Candidates) Tests
  // ============================================================================

  describe('NOS Version 1 Eligibility & Document Evaluation', () => {
    const validNosDocs: DocumentType[] = [
      DocumentType.AADHAAR_CARD,
      DocumentType.CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.MARKSHEET_UG,
      DocumentType.ADMISSION_OFFER_LETTER,
      DocumentType.BANK_PASSBOOK,
      // Note: MARKSHEET_PG is optional (mandatory: false) in NOS seed configuration
    ];

    it('should PASS an eligible candidate with age <= 35, income <= 8,00,000, QS Rank <= 500, marks >= 60%', () => {
      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Oraon',
          age: 29,
          annualIncome: 550000.0,
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 74.0,
            foreignUniversityRank: 142, // Oxford, Cambridge, MIT (<= 500)
          },
        },
        uploadedDocuments: validNosDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(true);
      expect(result.overallPassed).toBe(true);
      expect(result.deficiencies).toHaveLength(0);

      // Verify individual NOS rules
      const ageRule = result.ruleResults.find((r) => r.ruleId === 'nos-age-limit');
      expect(ageRule?.passed).toBe(true);
      expect(ageRule?.actualValue).toBe(29);

      const rankRule = result.ruleResults.find((r) => r.ruleId === 'nos-qs-rank');
      expect(rankRule?.passed).toBe(true);
      expect(rankRule?.actualValue).toBe(142);
      expect(rankRule?.expectedConstraint.toString()).toBe('LESS_THAN_OR_EQUAL 500');

      const marksRule = result.ruleResults.find((r) => r.ruleId === 'nos-qualifying-marks');
      expect(marksRule?.passed).toBe(true);
      expect(marksRule?.actualValue).toBe(74.0);

      const incomeRule = result.ruleResults.find((r) => r.ruleId === 'nos-income-ceiling');
      expect(incomeRule?.passed).toBe(true);
      expect(incomeRule?.actualValue).toBe(550000.0);
    });

    it('should calculate age automatically from dateOfBirth if age field is not passed', () => {
      // Born in 1998 -> Age in 2026 is ~28 (<= 35)
      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Munda',
          dateOfBirth: '1998-04-10T00:00:00.000Z',
          annualIncome: 400000.0,
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 65.0,
            foreignUniversityRank: 210,
          },
        },
        uploadedDocuments: validNosDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(true);
      const ageRule = result.ruleResults.find((r) => r.ruleId === 'nos-age-limit');
      expect(ageRule?.passed).toBe(true);
      expect(typeof ageRule?.actualValue).toBe('number');
      expect(Number(ageRule?.actualValue)).toBeLessThanOrEqual(35);
    });

    it('should FAIL candidate when age exceeds 35 years', () => {
      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Oraon',
          age: 38, // Exceeds 35 years
          annualIncome: 500000.0,
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 70.0,
            foreignUniversityRank: 100,
          },
        },
        uploadedDocuments: validNosDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);

      const ageDeficiency = result.deficiencies.find((d) => d.ruleId === 'nos-age-limit');
      expect(ageDeficiency).toBeDefined();
      expect(ageDeficiency?.deficiencyReason).toContain(
        'Applicant age must not exceed 35 years'
      );

      const ageRule = result.ruleResults.find((r) => r.ruleId === 'nos-age-limit');
      expect(ageRule?.passed).toBe(false);
      expect(ageRule?.actualValue).toBe(38);
    });

    it('should FAIL candidate when annual income exceeds Rs 8,00,000 ceiling', () => {
      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Gond',
          age: 30,
          annualIncome: 920000.0, // Exceeds 8,00,000
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 75.0,
            foreignUniversityRank: 80,
          },
        },
        uploadedDocuments: validNosDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);

      const incomeDeficiency = result.deficiencies.find((d) => d.ruleId === 'nos-income-ceiling');
      expect(incomeDeficiency?.deficiencyReason).toContain(
        'exceeds Rs. 8,00,000 ceiling prescribed under NOS guidelines'
      );
    });

    it('should FAIL candidate when foreign university QS rank is worse than Top 500 (e.g. Rank 620)', () => {
      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Santhal',
          age: 27,
          annualIncome: 300000.0,
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 80.0,
            foreignUniversityRank: 620, // Worse than 500
          },
        },
        uploadedDocuments: validNosDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);

      const rankDeficiency = result.deficiencies.find((d) => d.ruleId === 'nos-qs-rank');
      expect(rankDeficiency).toBeDefined();
      expect(rankDeficiency?.deficiencyReason).toContain(
        'Top 500 in the latest QS World Rankings'
      );

      const rankRule = result.ruleResults.find((r) => r.ruleId === 'nos-qs-rank');
      expect(rankRule?.passed).toBe(false);
      expect(rankRule?.actualValue).toBe(620);
    });

    it('should FAIL when mandatory ADMISSION_OFFER_LETTER is missing from uploads', () => {
      const docsMissingAdmission = validNosDocs.filter(
        (d) => d !== DocumentType.ADMISSION_OFFER_LETTER
      );

      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Kharia',
          age: 26,
          annualIncome: 350000.0,
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 66.0,
            foreignUniversityRank: 250,
          },
        },
        uploadedDocuments: docsMissingAdmission,
      };

      const result = evaluateEligibility(input);

      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.overallPassed).toBe(false);
      expect(result.documentResults.missingDocuments).toContain(
        DocumentType.ADMISSION_OFFER_LETTER
      );

      const offerDeficiency = result.deficiencies.find((d) =>
        d.field.includes('ADMISSION_OFFER_LETTER')
      );
      expect(offerDeficiency).toBeDefined();
      expect(offerDeficiency?.deficiencyReason).toContain('ADMISSION_OFFER_LETTER');
    });

    it('should PASS document completeness when NON-MANDATORY document (MARKSHEET_PG) is missing', () => {
      // validNosDocs does NOT have MARKSHEET_PG, but MARKSHEET_PG is mandatory: false in NOS
      const input: EvaluationInput = {
        schemeVersion: nosScheme.version,
        applicantProfile: {
          casteCommunity: 'Bhil',
          age: 31,
          annualIncome: 400000.0,
        },
        formData: {
          academic: {
            qualifyingMarksPercentage: 68.0,
            foreignUniversityRank: 190,
          },
        },
        uploadedDocuments: validNosDocs,
      };

      const result = evaluateEligibility(input);

      expect(result.isDocumentComplete).toBe(true);
      expect(result.overallPassed).toBe(true);

      const pgDocResult = result.documentResults.details.find(
        (d) => d.documentType === DocumentType.MARKSHEET_PG
      );
      expect(pgDocResult).toBeDefined();
      expect(pgDocResult?.mandatory).toBe(false);
      expect(pgDocResult?.uploaded).toBe(false);
      expect(pgDocResult?.passed).toBe(true); // Non-mandatory missing passes
    });
  });

  // ============================================================================
  // Pure JSON DSL Operator Tests (EQ, NEQ, LTE, GTE, IN, BOOLEAN, etc.)
  // ============================================================================

  describe('Modular Evaluator Primitives', () => {
    it('should evaluate a single condition directly via evaluateCondition', () => {
      const condition = {
        id: 'standalone-cond-1',
        field: 'applicant.annualIncome',
        operator: RuleOperator.LESS_THAN_OR_EQUAL,
        value: 600000.0,
        errorMessage: 'Income exceeds ceiling',
      };
      const context = {
        applicant: {
          annualIncome: 500000.0,
        },
      };
      const result = evaluateCondition(condition, context);
      expect(result.passed).toBe(true);
      expect(result.ruleId).toBe('standalone-cond-1');
      expect(result.actualValue).toBe(500000.0);
    });

    it('should evaluate document completeness directly via evaluateDocumentCompleteness', () => {
      const requirements = [
        { documentType: DocumentType.AADHAAR_CARD, mandatory: true },
        { documentType: DocumentType.CASTE_CERTIFICATE, mandatory: true },
        { documentType: DocumentType.MARKSHEET_PG, mandatory: false },
      ];
      const uploaded = [DocumentType.AADHAAR_CARD];
      const result = evaluateDocumentCompleteness(requirements, uploaded);
      expect(result.isComplete).toBe(false);
      expect(result.missingDocuments).toEqual([DocumentType.CASTE_CERTIFICATE]);
      expect(result.uploadedCount).toBe(1);
      expect(result.totalRequired).toBe(2);
    });
  });

  describe('Pure Operator Evaluation Matrix', () => {
    it('should evaluate EQ / EQUALS correctly across types', () => {
      expect(evaluateOperator('EQ', 'ST', 'ST')).toBe(true);
      expect(evaluateOperator('EQ', 'st', 'ST')).toBe(true); // Case-insensitive string match
      expect(evaluateOperator('EQ', 'GENERAL', 'ST')).toBe(false);
      expect(evaluateOperator('EQUALS', 600000, 600000)).toBe(true);
      expect(evaluateOperator('EQ', '600000', 600000)).toBe(true);
      expect(evaluateOperator('EQ', true, true)).toBe(true);
      expect(evaluateOperator('EQ', 'true', true)).toBe(true);
      expect(evaluateOperator('EQ', false, true)).toBe(false);
    });

    it('should evaluate NEQ / NOT_EQUALS correctly', () => {
      expect(evaluateOperator('NEQ', 'Santhal', '')).toBe(true);
      expect(evaluateOperator('NEQ', '', '')).toBe(false);
      expect(evaluateOperator('NOT_EQUALS', null, '')).toBe(false);
      expect(evaluateOperator('NEQ', undefined, '')).toBe(false);
      expect(evaluateOperator('NEQ', 'ST', 'GENERAL')).toBe(true);
      expect(evaluateOperator('NEQ', 'GENERAL', 'GENERAL')).toBe(false);
    });

    it('should evaluate LTE / LESS_THAN_OR_EQUAL correctly', () => {
      expect(evaluateOperator('LTE', 500000, 600000)).toBe(true);
      expect(evaluateOperator('LTE', 600000, 600000)).toBe(true);
      expect(evaluateOperator('LTE', 600001, 600000)).toBe(false);
      expect(evaluateOperator('LESS_THAN_OR_EQUAL', '35', 35)).toBe(true);
      expect(evaluateOperator('LTE', null, 35)).toBe(false);
    });

    it('should evaluate GTE / GREATER_THAN_OR_EQUAL correctly', () => {
      expect(evaluateOperator('GTE', 65, 55)).toBe(true);
      expect(evaluateOperator('GTE', 55, 55)).toBe(true);
      expect(evaluateOperator('GTE', 54.9, 55)).toBe(false);
      expect(evaluateOperator('GREATER_THAN_OR_EQUAL', '60', 60)).toBe(true);
    });

    it('should evaluate IN and NOT_IN correctly', () => {
      expect(evaluateOperator('IN', 'Khunti', ['Khunti', 'Ranchi', 'Dumka'])).toBe(true);
      expect(evaluateOperator('IN', 'khunti', ['Khunti', 'Ranchi'])).toBe(true);
      expect(evaluateOperator('IN', 'Patna', ['Khunti', 'Ranchi'])).toBe(false);
      expect(evaluateOperator('IN', 'ST', 'ST, PVTG')).toBe(true);
      expect(evaluateOperator('NOT_IN', 'GENERAL', ['ST', 'PVTG'])).toBe(true);
      expect(evaluateOperator('NOT_IN', 'ST', ['ST', 'PVTG'])).toBe(false);
    });

    it('should evaluate BOOLEAN operator correctly', () => {
      expect(evaluateOperator('BOOLEAN', true, true)).toBe(true);
      expect(evaluateOperator('BOOLEAN', 'true', true)).toBe(true);
      expect(evaluateOperator('BOOLEAN', 1, true)).toBe(true);
      expect(evaluateOperator('BOOLEAN', false, true)).toBe(false);
      expect(evaluateOperator('BOOLEAN', 0, true)).toBe(false);
      expect(evaluateOperator('BOOLEAN', null, true)).toBe(false);
    });

    it('should evaluate CONTAINS and REGEX_MATCH correctly', () => {
      expect(evaluateOperator('CONTAINS', 'Jharkhand State', 'Jharkhand')).toBe(true);
      expect(evaluateOperator('CONTAINS', ['Munda', 'Santhal'], 'Munda')).toBe(true);
      expect(evaluateOperator('REGEX_MATCH', '835210', '^[0-9]{6}$')).toBe(true);
      expect(evaluateOperator('REGEX_MATCH', 'ABCDE', '^[0-9]{6}$')).toBe(false);
    });
  });

  // ============================================================================
  // Arbitrary Dynamic Scheme Version Evaluation (Zero Hardcoding)
  // ============================================================================

  describe('Dynamic Scheme Evaluation (Zero Scheme Branching)', () => {
    it('should evaluate any arbitrary custom scheme version from JSON without code branches', () => {
      const customSchemeVersion: SchemeVersionLike = {
        id: 'custom-scheme-2027',
        schemeCode: 'PRE_MATRIC_ST',
        versionNumber: 1,
        academicYear: '2027-2028',
        documentRequirements: [
          {
            documentType: DocumentType.CASTE_CERTIFICATE,
            label: 'Tribal Community Certificate',
            mandatory: true,
          },
          {
            documentType: DocumentType.DOMICILE_CERTIFICATE,
            label: 'State Resident Domicile',
            mandatory: true,
          },
        ],
        eligibilityRules: {
          eligibilityGroups: [
            {
              id: 'group-location-category',
              name: 'State and Category Verification',
              logicalOperator: 'AND',
              conditions: [
                {
                  id: 'rule-state',
                  field: 'applicant.state',
                  operator: 'EQ',
                  value: 'Jharkhand',
                  errorMessage: 'Must be a bona fide resident of Jharkhand',
                  severity: RuleSeverity.BLOCKING,
                },
                {
                  id: 'rule-category-in',
                  field: 'applicant.category',
                  operator: 'IN',
                  value: ['ST', 'PVTG'],
                  errorMessage: 'Must belong to Scheduled Tribe (ST) or PVTG community',
                  severity: RuleSeverity.BLOCKING,
                },
                {
                  id: 'rule-is-day-scholar',
                  field: 'applicant.isDayScholar',
                  operator: 'BOOLEAN',
                  value: true,
                  errorMessage: 'Scheme is restricted to Day Scholar ST students',
                  severity: RuleSeverity.BLOCKING,
                },
              ],
            },
          ],
        },
      };

      // Passing applicant
      const passingInput: EvaluationInput = {
        schemeVersion: customSchemeVersion,
        applicantProfile: {
          state: 'Jharkhand',
          category: 'ST',
          isDayScholar: true,
        },
        uploadedDocuments: [
          DocumentType.CASTE_CERTIFICATE,
          DocumentType.DOMICILE_CERTIFICATE,
        ],
      };

      const passingResult = evaluateEligibility(passingInput);
      expect(passingResult.isEligible).toBe(true);
      expect(passingResult.isDocumentComplete).toBe(true);
      expect(passingResult.overallPassed).toBe(true);

      // Failing applicant (wrong state + non-ST)
      const failingInput: EvaluationInput = {
        schemeVersion: customSchemeVersion,
        applicantProfile: {
          state: 'Bihar', // Fails rule-state
          category: 'GENERAL', // Fails rule-category-in
          isDayScholar: true,
        },
        uploadedDocuments: [DocumentType.CASTE_CERTIFICATE], // Missing DOMICILE_CERTIFICATE
      };

      const failingResult = evaluateEligibility(failingInput);
      expect(failingResult.isEligible).toBe(false);
      expect(failingResult.isDocumentComplete).toBe(false);
      expect(failingResult.overallPassed).toBe(false);

      expect(failingResult.deficiencies.map((d) => d.ruleId)).toContain('rule-state');
      expect(failingResult.deficiencies.map((d) => d.ruleId)).toContain('rule-category-in');
      expect(failingResult.deficiencies.map((d) => d.ruleId)).toContain(
        'doc-req-DOMICILE_CERTIFICATE'
      );
    });

    it('should support disjunctive OR logical groups where satisfaction of any condition passes', () => {
      const orScheme: SchemeVersionLike = {
        eligibilityRules: {
          eligibilityGroups: [
            {
              id: 'group-qualifying-exam',
              name: 'Qualifying Examination Gate (UGC-NET or GATE or High Merit)',
              logicalOperator: 'OR',
              conditions: [
                {
                  id: 'cond-ugc-net',
                  field: 'academic.qualifiedUgcNet',
                  operator: 'BOOLEAN',
                  value: true,
                  errorMessage: 'UGC-NET qualified',
                },
                {
                  id: 'cond-gate',
                  field: 'academic.qualifiedGate',
                  operator: 'BOOLEAN',
                  value: true,
                  errorMessage: 'GATE qualified',
                },
              ],
            },
          ],
        },
      };

      // Candidate has NOT qualified UGC-NET, but HAS qualified GATE -> Should PASS OR group
      const resultPass = evaluateEligibility({
        schemeVersion: orScheme,
        formData: {
          academic: {
            qualifiedUgcNet: false,
            qualifiedGate: true,
          },
        },
      });

      expect(resultPass.isEligible).toBe(true);
      expect(resultPass.deficiencies).toHaveLength(0);

      // Candidate has neither -> Should FAIL OR group
      const resultFail = evaluateEligibility({
        schemeVersion: orScheme,
        formData: {
          academic: {
            qualifiedUgcNet: false,
            qualifiedGate: false,
          },
        },
      });

      expect(resultFail.isEligible).toBe(false);
      expect(resultFail.deficiencies.length).toBeGreaterThan(0);
    });

    it('should treat WARNING severity rules as non-blocking to eligibility', () => {
      const warningScheme: SchemeVersionLike = {
        eligibilityRules: {
          eligibilityGroups: [
            {
              id: 'group-warning-demo',
              name: 'Recommended Profile Attributes',
              logicalOperator: 'AND',
              conditions: [
                {
                  id: 'cond-pvtg-recommended',
                  field: 'applicant.isPvtg',
                  operator: 'BOOLEAN',
                  value: true,
                  errorMessage: 'PVTG priority not claimed',
                  severity: RuleSeverity.WARNING, // Warning severity
                },
              ],
            },
          ],
        },
      };

      const result = evaluateEligibility({
        schemeVersion: warningScheme,
        applicantProfile: {
          isPvtg: false,
        },
      });

      // Warning failure must NOT block overall eligibility
      expect(result.isEligible).toBe(true);
      expect(result.warningCount).toBe(1);
      expect(result.blockingFailuresCount).toBe(0);
      expect(result.deficiencies).toHaveLength(0); // Only blocking failures in actionable deficiencies
    });
  });
});
