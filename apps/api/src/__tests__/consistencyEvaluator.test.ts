import { describe, expect, it } from 'vitest';
import { DocumentType, RuleSeverity, SchemeCode } from '@tribalscholar/shared';
import { SEED_SCHEMES } from '../seed-data.js';
import {
  evaluateCrossDocConsistency,
  matchFuzzyTokenRatio,
  matchNonEmptyPresent,
  matchNormalizedContains,
  matchNumericExact,
  type OcrDocumentInput,
} from '../modules/ruleEngine/consistencyEvaluator.js';
import { evaluateApplicationRules } from '../modules/ruleEngine/index.js';

describe('Cross-Document Consistency and Confidence Evaluator', () => {
  const nfstScheme = SEED_SCHEMES.find((s) => s.code === SchemeCode.NFST);
  if (!nfstScheme) {
    throw new Error('NFST seed scheme must be present.');
  }

  // ============================================================================
  // Exact Matches Verification Suite
  // ============================================================================

  describe('Exact Matches across Declared Form and OCR Extractions', () => {
    it('should PASS exact matches for Sample Applicant, Scheduled Tribe (ST), Rs 80,000 / year, and Competent Revenue Authority', () => {
      const formData = {
        applicantName: 'Sample Applicant',
        category: 'Scheduled Tribe (ST)',
        annualFamilyIncome: 'Rs 80,000 / year',
        issuingAuthority: 'Competent Revenue Authority',
      };

      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          overallConfidence: 0.95,
          extractedFields: {
            applicantName: { rawText: 'Sample Applicant', confidence: 0.95 },
            category: { rawText: 'Scheduled Tribe (ST)', confidence: 0.94 },
            issuingAuthority: { rawText: 'Competent Revenue Authority', confidence: 0.91 },
          },
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          overallConfidence: 0.94,
          extractedFields: {
            applicantName: { rawText: 'Sample Applicant', confidence: 0.96 },
            annualFamilyIncome: {
              rawText: 'Rs 80,000 / year',
              normalizedValue: 80000,
              confidence: 0.93,
            },
            issuingAuthority: { rawText: 'Competent Revenue Authority', confidence: 0.88 },
          },
        },
        {
          documentType: DocumentType.AADHAAR_CARD,
          overallConfidence: 0.98,
          extractedFields: {
            applicantName: { rawText: 'Sample Applicant', confidence: 0.98 },
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, formData);

      expect(report.isConsistent).toBe(true);
      expect(report.mismatchCount).toBe(0);
      expect(report.lowConfidenceCount).toBe(0);
      expect(report.requiresHumanReview).toBe(false);
      expect(report.deficiencies).toHaveLength(0);

      // Verify specific field results
      const nameResults = report.results.filter((r) => r.fieldName === 'applicantName');
      expect(nameResults.length).toBeGreaterThan(0);
      for (const res of nameResults) {
        expect(res.status).toBe('Consistent');
        expect(res.passed).toBe(true);
        expect(res.matchScore).toBe(1.0);
      }

      const categoryResult = report.results.find((r) => r.fieldName === 'category');
      expect(categoryResult).toBeDefined();
      expect(categoryResult?.status).toBe('Consistent');
      expect(categoryResult?.passed).toBe(true);
      expect(categoryResult?.matchScore).toBe(1.0);

      const incomeResult = report.results.find((r) => r.fieldName === 'annualFamilyIncome');
      expect(incomeResult).toBeDefined();
      expect(incomeResult?.status).toBe('Consistent');
      expect(incomeResult?.passed).toBe(true);

      const authorityResults = report.results.filter((r) => r.fieldName === 'issuingAuthority');
      expect(authorityResults.length).toBeGreaterThan(0);
      for (const res of authorityResults) {
        expect(['Consistent', 'Present']).toContain(res.status);
        expect(res.passed).toBe(true);
      }
    });

    it('should produce Extracted status when OCR fields exist but form declared value was omitted', () => {
      // Form data does NOT contain category
      const formData = {
        applicantName: 'Sample Applicant',
      };

      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            category: { rawText: 'Scheduled Tribe (ST)', confidence: 0.95 },
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, formData);

      const categoryResult = report.results.find((r) => r.fieldName === 'category');
      expect(categoryResult).toBeDefined();
      expect(categoryResult?.status).toBe('Extracted');
      expect(categoryResult?.passed).toBe(true);
    });
  });

  // ============================================================================
  // Discrepancy & Mismatch Suite
  // ============================================================================

  describe('Field Discrepancy & Mismatch Detection', () => {
    it('should detect NAME MISMATCH and generate structured deficiency', () => {
      const formData = {
        applicantName: 'Sample Applicant',
        annualFamilyIncome: 80000,
      };

      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            applicantName: { rawText: 'Different Person', confidence: 0.95 }, // Name Mismatch!
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, formData);

      expect(report.isConsistent).toBe(false);
      expect(report.mismatchCount).toBe(1);

      const nameResult = report.results.find((r) => r.fieldName === 'applicantName');
      expect(nameResult).toBeDefined();
      expect(nameResult?.status).toBe('Mismatch');
      expect(nameResult?.passed).toBe(false);
      expect(nameResult?.matchScore).toBeLessThan(0.5);

      const nameDeficiency = report.deficiencies.find((d) => d.field.includes('applicantName'));
      expect(nameDeficiency).toBeDefined();
      expect(nameDeficiency?.severity).toBe(RuleSeverity.BLOCKING);
      expect(nameDeficiency?.deficiencyReason).toContain('Name discrepancy');
      expect(nameDeficiency?.deficiencyReason).toContain('Sample Applicant');
      expect(nameDeficiency?.deficiencyReason).toContain('Different Person');
    });

    it('should detect ANNUAL FAMILY INCOME MISMATCH and generate structured deficiency', () => {
      const formData = {
        applicantName: 'Sample Applicant',
        annualFamilyIncome: 80000, // Declared Rs 80,000
      };

      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          extractedFields: {
            annualFamilyIncome: {
              rawText: 'Rs 1,50,000 / year', // Extracted Rs 1,50,000 (Mismatch!)
              normalizedValue: 150000,
              confidence: 0.92,
            },
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, formData, {
        numericTolerancePercentage: 0,
      });

      expect(report.isConsistent).toBe(false);
      expect(report.mismatchCount).toBe(1);

      const incomeResult = report.results.find((r) => r.fieldName === 'annualFamilyIncome');
      expect(incomeResult).toBeDefined();
      expect(incomeResult?.status).toBe('Mismatch');
      expect(incomeResult?.passed).toBe(false);

      const incomeDeficiency = report.deficiencies.find((d) => d.field.includes('annualFamilyIncome'));
      expect(incomeDeficiency).toBeDefined();
      expect(incomeDeficiency?.deficiencyReason).toContain('Income discrepancy');
      expect(incomeDeficiency?.deficiencyReason).toContain('80000');
    });

    it('should detect CATEGORY MISMATCH (Declared ST vs Extracted GENERAL)', () => {
      const formData = {
        category: 'Scheduled Tribe (ST)',
      };

      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            category: { rawText: 'General Category', confidence: 0.94 },
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, formData);

      expect(report.isConsistent).toBe(false);
      expect(report.mismatchCount).toBe(1);

      const catResult = report.results.find((r) => r.fieldName === 'category');
      expect(catResult?.status).toBe('Mismatch');
      expect(catResult?.passed).toBe(false);

      const catDeficiency = report.deficiencies.find((d) => d.field.includes('category'));
      expect(catDeficiency).toBeDefined();
      expect(catDeficiency?.deficiencyReason).toContain('Community/Category discrepancy');
    });

    it('should detect missing or empty ISSUING AUTHORITY', () => {
      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            issuingAuthority: { rawText: '', confidence: 0.9 }, // Empty authority
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, {});

      const authResult = report.results.find((r) => r.fieldName === 'issuingAuthority');
      expect(authResult?.status).toBe('Mismatch');
      expect(authResult?.passed).toBe(false);
      expect(authResult?.deficiencyReason).toContain('issuingAuthority');
    });
  });

  // ============================================================================
  // OCR Confidence Threshold & Officer Scrutiny Routing Suite
  // ============================================================================

  describe('OCR Confidence Gate & Officer Scrutiny Routing', () => {
    it('should flag LOW CONFIDENCE OCR extractions (< 0.80) and route to human scrutiny officer', () => {
      const formData = {
        applicantName: 'Sample Applicant',
        category: 'Scheduled Tribe (ST)',
        annualFamilyIncome: 80000,
      };

      // OCR confidence is 0.62 (below threshold 0.80) due to blurred scan
      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            applicantName: { rawText: 'Sample Applicant', confidence: 0.62 }, // Low confidence!
            category: { rawText: 'Scheduled Tribe (ST)', confidence: 0.95 },
          },
        },
      ];

      const report = evaluateCrossDocConsistency(extractedDocuments, formData, {
        minConfidenceThreshold: 0.8,
      });

      expect(report.requiresHumanReview).toBe(true);
      expect(report.lowConfidenceCount).toBe(1);

      const nameResult = report.results.find((r) => r.fieldName === 'applicantName');
      expect(nameResult).toBeDefined();
      expect(nameResult?.status).toBe('Low Confidence');
      expect(nameResult?.passed).toBe(false);
      expect(nameResult?.requiresOfficerReview).toBe(true);
      expect(nameResult?.confidence).toBe(0.62);

      const lowConfDeficiency = report.deficiencies.find((d) =>
        d.ruleId.includes('ocr-low-confidence')
      );
      expect(lowConfDeficiency).toBeDefined();
      expect(lowConfDeficiency?.severity).toBe(RuleSeverity.MANUAL_REVIEW);
      expect(lowConfDeficiency?.deficiencyReason).toContain('Routed to scrutiny officer');
      expect(lowConfDeficiency?.deficiencyReason).toContain('0.62');
    });
  });

  // ============================================================================
  // Matcher Unit Function Tests
  // ============================================================================

  describe('Matcher Primitives', () => {
    it('FUZZY_TOKEN_RATIO should handle token reordering, punctuation, and slight typos', () => {
      // Reordered tokens
      const reordered = matchFuzzyTokenRatio('Sample Applicant', 'Applicant Sample');
      expect(reordered.match).toBe(true);
      expect(reordered.score).toBe(1.0);

      // Minor typo
      const typo = matchFuzzyTokenRatio('Sample Applicant', 'Sampel Applicant', 0.85);
      expect(typo.match).toBe(true);
      expect(typo.score).toBeGreaterThanOrEqual(0.85);

      // Distinct name
      const different = matchFuzzyTokenRatio('Sample Applicant', 'Birsa Munda', 0.85);
      expect(different.match).toBe(false);
      expect(different.score).toBeLessThan(0.3);
    });

    it('NORMALIZED_CONTAINS should handle Indian caste naming variations', () => {
      expect(matchNormalizedContains('Scheduled Tribe (ST)', 'Scheduled Tribe').match).toBe(true);
      expect(matchNormalizedContains('Scheduled Tribe', 'ST').match).toBe(true);
      expect(matchNormalizedContains('ST', 'Scheduled Tribe (ST)').match).toBe(true);
      expect(matchNormalizedContains('Scheduled Tribe (ST)', 'General').match).toBe(false);
      expect(matchNormalizedContains('Scheduled Tribe', 'OBC').match).toBe(false);
    });

    it('NUMERIC_EXACT should extract currency strings and compare with tolerance', () => {
      expect(matchNumericExact('Rs 80,000 / year', 80000).match).toBe(true);
      expect(matchNumericExact('₹ 80,000.00', '80000').match).toBe(true);
      expect(matchNumericExact('Rs. 82,000', 80000, 5).match).toBe(true); // 2.5% diff within 5% tolerance
      expect(matchNumericExact('Rs. 1,50,000', 80000, 5).match).toBe(false); // Exceeds tolerance
    });

    it('NON_EMPTY_PRESENT should validate certifying officer designations', () => {
      expect(matchNonEmptyPresent('Competent Revenue Authority').match).toBe(true);
      expect(matchNonEmptyPresent('Sub-Divisional Officer (Civil)').match).toBe(true);
      expect(matchNonEmptyPresent('Tahsildar').match).toBe(true);
      expect(matchNonEmptyPresent('').match).toBe(false);
      expect(matchNonEmptyPresent('N/A').match).toBe(false);
      expect(matchNonEmptyPresent(null).match).toBe(false);
    });
  });

  // ============================================================================
  // Unified Orchestrator Integration Tests (evaluateApplicationRules)
  // ============================================================================

  describe('Unified Rule Engine Orchestrator (evaluateApplicationRules)', () => {
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

    it('should evaluate full application workflow and return overallPassed = true when all tiers pass', () => {
      const applicantProfile = {
        fullName: 'Birsa Munda',
        casteCommunity: 'Santhal',
        annualIncome: 80000.0,
        aadhaarVerified: true,
        dateOfBirth: '2000-01-15T00:00:00.000Z',
      };

      const formData = {
        academic: {
          pgMarksPercentage: 66.0,
        },
      };

      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          overallConfidence: 0.95,
          extractedFields: {
            applicantName: { rawText: 'Birsa Munda', confidence: 0.95 },
            category: { rawText: 'Santhal (ST)', confidence: 0.94 },
            issuingAuthority: { rawText: 'Sub-Divisional Officer, Khunti', confidence: 0.9 },
          },
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          overallConfidence: 0.94,
          extractedFields: {
            applicantName: { rawText: 'Birsa Munda', confidence: 0.96 },
            annualFamilyIncome: {
              rawText: 'Rs 80,000 / year',
              normalizedValue: 80000,
              confidence: 0.93,
            },
            issuingAuthority: { rawText: 'Circle Officer, Khunti', confidence: 0.89 },
          },
        },
        {
          documentType: DocumentType.AADHAAR_CARD,
          overallConfidence: 0.98,
          extractedFields: {
            applicantName: { rawText: 'Birsa Munda', confidence: 0.98 },
          },
        },
      ];

      const result = evaluateApplicationRules({
        applicationId: 'app-unified-test-001',
        schemeVersion: nfstScheme.version,
        applicantProfile,
        formData,
        uploadedDocuments: validNfstDocs,
        extractedDocuments,
      });

      expect(result.applicationId).toBe('app-unified-test-001');
      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(true);
      expect(result.isCrossDocConsistent).toBe(true);
      expect(result.requiresOfficerReview).toBe(false);
      expect(result.overallPassed).toBe(true);
      expect(result.blockingFailuresCount).toBe(0);
      expect(result.deficiencies).toHaveLength(0);
    });

    it('should aggregate deficiencies from eligibility, document completeness, and cross-doc mismatches', () => {
      // 1. Income exceeds ceiling in rules (Rs 7,50,000 > 6,00,000)
      // 2. CASTE_CERTIFICATE missing from uploads
      // 3. Name mismatch on AADHAAR_CARD
      const applicantProfile = {
        fullName: 'Birsa Munda',
        casteCommunity: 'Santhal',
        annualIncome: 750000.0, // Fails eligibility rule
        aadhaarVerified: true,
      };

      const formData = {
        academic: {
          pgMarksPercentage: 62.0,
        },
      };

      // Missing CASTE_CERTIFICATE from uploaded documents
      const incompleteDocs = validNfstDocs.filter((d) => d !== DocumentType.CASTE_CERTIFICATE);

      // OCR extraction has different name
      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.AADHAAR_CARD,
          overallConfidence: 0.95,
          extractedFields: {
            applicantName: { rawText: 'Rajesh Kumar', confidence: 0.95 }, // Name mismatch
          },
        },
      ];

      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile,
        formData,
        uploadedDocuments: incompleteDocs,
        extractedDocuments,
      });

      expect(result.isEligible).toBe(false);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.isCrossDocConsistent).toBe(false);
      expect(result.overallPassed).toBe(false);

      // Deficiencies must include income, document, and cross-doc items
      const failedRuleIds = result.deficiencies.map((d) => d.ruleId);
      expect(failedRuleIds).toContain('nfst-income-ceiling');
      expect(failedRuleIds).toContain('doc-req-CASTE_CERTIFICATE');
      expect(failedRuleIds.some((id) => id.includes('applicantName'))).toBe(true);
    });

    it('should set requiresOfficerReview = true when OCR confidence is low despite matching values', () => {
      const applicantProfile = {
        fullName: 'Sample Applicant',
        casteCommunity: 'Santhal',
        annualIncome: 80000.0,
        aadhaarVerified: true,
      };

      const formData = {
        academic: {
          pgMarksPercentage: 65.0,
        },
      };

      // OCR confidence is 0.54 (< 0.80)
      const extractedDocuments: OcrDocumentInput[] = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            applicantName: { rawText: 'Sample Applicant', confidence: 0.54 }, // Low confidence
            category: { rawText: 'Scheduled Tribe (ST)', confidence: 0.92 },
          },
        },
      ];

      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile,
        formData,
        uploadedDocuments: validNfstDocs,
        extractedDocuments,
      });

      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(true);
      expect(result.requiresOfficerReview).toBe(true);
      expect(result.overallPassed).toBe(false); // Low confidence prevents auto-pass
      expect(result.deficiencies.some((d) => d.severity === RuleSeverity.MANUAL_REVIEW)).toBe(true);
    });
  });
});
