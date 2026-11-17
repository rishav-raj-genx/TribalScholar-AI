import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  DocumentType,
  RuleSeverity,
  SchemeCode,
  type SchemeRuleSet,
} from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { SEED_SCHEMES } from '../seed-data.js';
import {
  evaluateApplicationRules,
  type UnifiedApplicationEvaluationInput,
} from '../modules/ruleEngine/index.js';
import { schemesService } from '../modules/schemes/schemes.service.js';

describe('Unified Rule Evaluator & Simulation Edge Cases Suite', () => {
  const nfstScheme = SEED_SCHEMES.find((s) => s.code === SchemeCode.NFST);
  const nosScheme = SEED_SCHEMES.find((s) => s.code === SchemeCode.NOS);

  if (!nfstScheme || !nosScheme) {
    throw new Error('Seed schemes NFST and NOS must be present.');
  }

  let adminToken: string;
  let testSchemeVersionId: string | null = null;

  beforeAll(async () => {
    // Authenticate admin for route testing
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mota.gov.in', password: 'Password@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data?.accessToken || adminLogin.body.accessToken;
  });

  afterAll(async () => {
    if (testSchemeVersionId) {
      await prisma.auditLog.deleteMany({
        where: { details: { path: ['entityId'], equals: testSchemeVersionId } },
      });
      await prisma.schemeVersion.deleteMany({
        where: { id: testSchemeVersionId },
      });
    }
  });

  // ============================================================================
  // Suite 1: Missing, Null & Malformed Fields in Profile / Form Context
  // ============================================================================

  describe('Missing, Null & Malformed Fields Handling', () => {
    it('should handle null applicantProfile and formData without throwing exceptions', () => {
      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: null,
        formData: null,
        uploadedDocuments: [],
        extractedDocuments: null,
      });

      expect(result).toBeDefined();
      expect(result.isEligible).toBe(false);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.overallPassed).toBe(false);
      expect(result.blockingFailuresCount).toBeGreaterThan(0);
      expect(result.deficiencies.length).toBeGreaterThan(0);

      // Deficiencies should identify missing caste and missing mandatory documents
      const failedRuleIds = result.deficiencies.map((d) => d.ruleId);
      expect(failedRuleIds).toContain('nfst-caste-validity');
      expect(failedRuleIds).toContain('doc-req-AADHAAR_CARD');
    });

    it('should handle undefined applicantProfile, formData, and extraContext', () => {
      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: undefined,
        formData: undefined,
        uploadedDocuments: undefined,
        extractedDocuments: undefined,
        extraContext: undefined,
      });

      expect(result.isEligible).toBe(false);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.overallPassed).toBe(false);
    });

    it('should handle non-object primitives at intermediate paths in dot-lookup (e.g. academic: "string")', () => {
      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          fullName: 'Test Candidate',
          casteCommunity: 'Santhal',
          annualIncome: 50000,
          aadhaarVerified: true,
        },
        formData: {
          // academic is expected to be an object with pgMarksPercentage, but is given as a string
          academic: 'NotAnObject',
        },
        uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
      });

      expect(result).toBeDefined();
      expect(result.isEligible).toBe(false);
      // Fails academic criteria because academic.pgMarksPercentage is undefined
      const pgDeficiency = result.deficiencies.find((d) => d.ruleId === 'nfst-pg-percentage');
      expect(pgDeficiency).toBeDefined();
      const pgRule = result.eligibility.ruleResults.find((r) => r.ruleId === 'nfst-pg-percentage');
      expect(pgRule?.actualValue).toBeNull();
    });

    it('should handle non-numeric or malformed data types in numeric comparisons', () => {
      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          casteCommunity: 'Santhal',
          aadhaarVerified: true,
          // Malformed annual income (string that is not a valid number)
          annualIncome: 'not-a-number' as unknown as number,
        },
        formData: {
          academic: {
            pgMarksPercentage: 'not-a-number' as unknown as number,
          },
        },
        uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
      });

      expect(result.isEligible).toBe(false);
      expect(result.overallPassed).toBe(false);
      // NaN should fail comparison cleanly
      const incomeDeficiency = result.deficiencies.find((d) => d.ruleId === 'nfst-income-ceiling');
      expect(incomeDeficiency).toBeDefined();
    });
  });

  // ============================================================================
  // Suite 2: Null, Malformed & Edge OCR Extractions
  // ============================================================================

  describe('Null, Empty & Edge OCR Extractions Handling', () => {
    it('should evaluate safely with null, undefined, and empty OCR documents', () => {
      const inputs: Array<UnifiedApplicationEvaluationInput['extractedDocuments']> = [
        null as unknown as undefined,
        undefined,
        [],
        {},
      ];

      for (const extractedDocs of inputs) {
        const result = evaluateApplicationRules({
          schemeVersion: nfstScheme.version,
          applicantProfile: {
            fullName: 'Birsa Munda',
            casteCommunity: 'Santhal',
            annualIncome: 80000,
            aadhaarVerified: true,
          },
          formData: {
            academic: { pgMarksPercentage: 70 },
          },
          uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
          extractedDocuments: extractedDocs,
        });

        // When extracted documents are empty/null, cross-document checks cannot find documents to compare,
        // so consistency evaluator flags missing documents for mandatory consistency rules
        expect(result).toBeDefined();
        expect(result.isEligible).toBe(true);
        expect(result.isDocumentComplete).toBe(true);
      }
    });

    it('should handle extracted documents with empty fields or missing confidence gracefully', () => {
      const extractedDocuments = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {}, // Empty extracted fields
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          extractedFields: {
            annualFamilyIncome: {
              rawText: '80000',
              // confidence is missing/undefined -> defaults to 1.0 or document confidence
            },
          },
        },
      ];

      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          fullName: 'Birsa Munda',
          casteCommunity: 'Santhal',
          annualIncome: 80000,
          aadhaarVerified: true,
        },
        formData: {
          academic: { pgMarksPercentage: 65 },
        },
        uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
        extractedDocuments,
      });

      expect(result).toBeDefined();
      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(true);
    });

    it('should flag MANUAL_REVIEW when confidence is explicitly 0 or below minimum threshold', () => {
      const extractedDocuments = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          extractedFields: {
            applicantName: { rawText: 'Birsa Munda', confidence: 0.1 }, // Extremely low confidence
            category: { rawText: 'Scheduled Tribe (ST)', confidence: 0.95 },
          },
        },
      ];

      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          fullName: 'Birsa Munda',
          casteCommunity: 'Santhal',
          annualIncome: 80000,
          aadhaarVerified: true,
        },
        formData: {
          academic: { pgMarksPercentage: 65 },
        },
        uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
        extractedDocuments,
      });

      expect(result.requiresOfficerReview).toBe(true);
      expect(result.overallPassed).toBe(false);
      expect(
        result.deficiencies.some((d) => d.severity === RuleSeverity.MANUAL_REVIEW)
      ).toBe(true);
    });

    it('should ignore irrelevant document types (e.g. OTHER) without false failure side effects', () => {
      const extractedDocuments = [
        {
          documentType: DocumentType.OTHER,
          extractedFields: {
            customField: 'irrelevant-data',
            randomText: 'sample text',
          },
        },
        {
          documentType: DocumentType.AADHAAR_CARD,
          extractedFields: {
            applicantName: { rawText: 'Birsa Munda', confidence: 0.95 },
          },
        },
      ];

      const result = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: {
          fullName: 'Birsa Munda',
          casteCommunity: 'Santhal',
          annualIncome: 80000,
          aadhaarVerified: true,
        },
        formData: {
          academic: { pgMarksPercentage: 65 },
        },
        uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
        extractedDocuments,
      });

      expect(result.isEligible).toBe(true);
      // Validated that OTHER document did not cause runtime errors
      expect(result.consistency.isConsistent).toBe(true);
      expect(result.consistency.results.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Suite 3: Multi-Version Rule Isolation & Concurrent Evaluation
  // ============================================================================

  describe('Multi-Version Rule Isolation & Parallel Execution', () => {
    // NFST v1: Income ceiling 6,00,000
    // Custom NFST v2: Income ceiling 8,50,000
    const nfstVersion2Rules: SchemeRuleSet = {
      ...nfstScheme.version.eligibilityRules,
      incomeCeiling: 850000.0,
      eligibilityGroups: nfstScheme.version.eligibilityRules.eligibilityGroups.map((g) => {
        if (g.id === 'nfst-group-economic') {
          return {
            ...g,
            conditions: g.conditions.map((c) =>
              c.id === 'nfst-income-ceiling' ? { ...c, value: 850000.0 } : c
            ),
          };
        }
        return g;
      }),
    };

    const nfstVersion2 = {
      ...nfstScheme.version,
      id: 'nfst-v2-mock-id',
      versionNumber: 2,
      incomeCeiling: 850000.0,
      eligibilityRules: nfstVersion2Rules,
    };

    it('should strictly isolate rule evaluation across two distinct versions of the same scheme', () => {
      // Candidate with income Rs 7,20,000
      // Fails NFST Version 1 (ceiling 6,00,000)
      // Passes NFST Version 2 (ceiling 8,50,000)
      const candidateProfile = {
        fullName: 'Birsa Munda',
        casteCommunity: 'Santhal',
        annualIncome: 720000.0,
        aadhaarVerified: true,
      };

      const candidateForm = {
        academic: { pgMarksPercentage: 68.0 },
      };

      // 1. Evaluate on Version 1
      const resultV1 = evaluateApplicationRules({
        schemeVersion: nfstScheme.version,
        applicantProfile: candidateProfile,
        formData: candidateForm,
        uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
      });

      expect(resultV1.isEligible).toBe(false);
      expect(resultV1.deficiencies.some((d) => d.ruleId === 'nfst-income-ceiling')).toBe(true);

      // 2. Evaluate on Version 2
      const resultV2 = evaluateApplicationRules({
        schemeVersion: nfstVersion2,
        applicantProfile: candidateProfile,
        formData: candidateForm,
        uploadedDocuments: nfstVersion2.requiredDocumentTypes,
      });

      expect(resultV2.isEligible).toBe(true);
      expect(resultV2.deficiencies.some((d) => d.ruleId === 'nfst-income-ceiling')).toBe(false);
    });

    it('should isolate NOS v1 (age <= 35, QS <= 500) vs NOS v2 (age <= 38, QS <= 800)', () => {
      const nosVersion2Rules: SchemeRuleSet = {
        ...nosScheme.version.eligibilityRules,
        maxAge: 38,
        eligibilityGroups: nosScheme.version.eligibilityRules.eligibilityGroups.map((g) => {
          if (g.id === 'nos-group-identity-age') {
            return {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === 'nos-age-limit' ? { ...c, value: 38 } : c
              ),
            };
          }
          if (g.id === 'nos-group-academic-admission') {
            return {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === 'nos-qs-rank' ? { ...c, value: 800 } : c
              ),
            };
          }
          return g;
        }),
      };

      const nosVersion2 = {
        ...nosScheme.version,
        id: 'nos-v2-mock-id',
        versionNumber: 2,
        eligibilityRules: nosVersion2Rules,
      };

      // Candidate age 37, QS Rank 650
      const applicant = {
        fullName: 'Birsa Munda',
        casteCommunity: 'Santhal',
        annualIncome: 500000.0,
        age: 37,
      };

      const formData = {
        academic: {
          qualifyingMarksPercentage: 72.0,
          foreignUniversityRank: 650,
        },
      };

      // Under v1: Fails both age (37 > 35) and rank (650 > 500)
      const resV1 = evaluateApplicationRules({
        schemeVersion: nosScheme.version,
        applicantProfile: applicant,
        formData,
        uploadedDocuments: nosScheme.version.requiredDocumentTypes,
      });
      expect(resV1.isEligible).toBe(false);
      const v1Failures = resV1.deficiencies.map((d) => d.ruleId);
      expect(v1Failures).toContain('nos-age-limit');
      expect(v1Failures).toContain('nos-qs-rank');

      // Under v2: Passes both age (37 <= 38) and rank (650 <= 800)
      const resV2 = evaluateApplicationRules({
        schemeVersion: nosVersion2,
        applicantProfile: applicant,
        formData,
        uploadedDocuments: nosVersion2.requiredDocumentTypes,
      });
      expect(resV2.isEligible).toBe(true);
      expect(resV2.deficiencies).toHaveLength(0);
    });

    it('should maintain strict determinism under 50 concurrent interleaved evaluations', async () => {
      const v1Profile = {
        fullName: 'Birsa Munda',
        casteCommunity: 'Santhal',
        annualIncome: 700000.0, // Fails v1 (ceiling 6,00,000)
        aadhaarVerified: true,
      };

      const v2Profile = {
        fullName: 'Birsa Munda',
        casteCommunity: 'Santhal',
        annualIncome: 700000.0, // Passes v2 (ceiling 8,50,000)
        aadhaarVerified: true,
      };

      const form = { academic: { pgMarksPercentage: 65 } };

      const promises = Array.from({ length: 50 }, (_, i) => {
        const isV1 = i % 2 === 0;
        return Promise.resolve().then(() => {
          return evaluateApplicationRules({
            schemeVersion: isV1 ? nfstScheme.version : nfstVersion2,
            applicantProfile: isV1 ? v1Profile : v2Profile,
            formData: form,
            uploadedDocuments: nfstScheme.version.requiredDocumentTypes,
          });
        });
      });

      const results = await Promise.all(promises);

      results.forEach((res, i) => {
        const isV1 = i % 2 === 0;
        if (isV1) {
          expect(res.isEligible).toBe(false);
        } else {
          expect(res.isEligible).toBe(true);
        }
      });
    });
  });

  // ============================================================================
  // Suite 4: Complete NOS Version 1 Full Lifecycle Simulation
  // ============================================================================

  describe('NOS Version 1 Complete Evaluation Workflow', () => {
    const validNosDocs: DocumentType[] = [
      DocumentType.AADHAAR_CARD,
      DocumentType.CASTE_CERTIFICATE,
      DocumentType.INCOME_CERTIFICATE,
      DocumentType.MARKSHEET_UG,
      DocumentType.MARKSHEET_PG,
      DocumentType.ADMISSION_OFFER_LETTER,
      DocumentType.BANK_PASSBOOK,
    ];

    it('should PASS an eligible ST scholar applying for NOS with Oxford/Cambridge admission (QS < 500)', () => {
      const applicantProfile = {
        fullName: 'Jaipal Singh Munda',
        casteCommunity: 'Munda',
        annualIncome: 450000.0, // Under 8,00,000 ceiling
        age: 27, // Under 35 years
        aadhaarVerified: true,
      };

      const formData = {
        academic: {
          qualifyingMarksPercentage: 78.5, // >= 60%
          foreignUniversityRank: 3, // Oxford / Cambridge Top 10 <= 500
        },
      };

      const extractedDocuments = [
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          overallConfidence: 0.95,
          extractedFields: {
            applicantName: { rawText: 'Jaipal Singh Munda', confidence: 0.96 },
            category: { rawText: 'Scheduled Tribe (ST) - Munda', confidence: 0.94 },
            issuingAuthority: { rawText: 'Sub-Divisional Officer, Ranchi', confidence: 0.91 },
          },
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          overallConfidence: 0.94,
          extractedFields: {
            applicantName: { rawText: 'Jaipal Singh Munda', confidence: 0.95 },
            annualFamilyIncome: { rawText: 'Rs 4,50,000 / year', normalizedValue: 450000, confidence: 0.93 },
            issuingAuthority: { rawText: 'Tahsildar, Ranchi', confidence: 0.9 },
          },
        },
        {
          documentType: DocumentType.AADHAAR_CARD,
          overallConfidence: 0.98,
          extractedFields: {
            applicantName: { rawText: 'Jaipal Singh Munda', confidence: 0.98 },
          },
        },
      ];

      const result = evaluateApplicationRules({
        schemeVersion: nosScheme.version,
        applicantProfile,
        formData,
        uploadedDocuments: validNosDocs,
        extractedDocuments,
      });

      expect(result.isEligible).toBe(true);
      expect(result.isDocumentComplete).toBe(true);
      expect(result.isCrossDocConsistent).toBe(true);
      expect(result.requiresOfficerReview).toBe(false);
      expect(result.overallPassed).toBe(true);
      expect(result.deficiencies).toHaveLength(0);
    });

    it('should FAIL an ineligible NOS applicant with age > 35, low marks, QS rank > 500, and missing documents', () => {
      const applicantProfile = {
        fullName: 'Candidate Overseas',
        casteCommunity: 'Santhal',
        annualIncome: 950000.0, // Exceeds Rs 8,00,000
        age: 39, // Exceeds 35 years
        aadhaarVerified: true,
      };

      const formData = {
        academic: {
          qualifyingMarksPercentage: 54.0, // < 60%
          foreignUniversityRank: 850, // > 500
        },
      };

      // Only upload 2 out of 7 required documents
      const uploadedDocuments = [DocumentType.AADHAAR_CARD, DocumentType.CASTE_CERTIFICATE];

      const result = evaluateApplicationRules({
        schemeVersion: nosScheme.version,
        applicantProfile,
        formData,
        uploadedDocuments,
      });

      expect(result.isEligible).toBe(false);
      expect(result.isDocumentComplete).toBe(false);
      expect(result.overallPassed).toBe(false);

      const failedRuleIds = result.deficiencies.map((d) => d.ruleId);
      expect(failedRuleIds).toContain('nos-age-limit');
      expect(failedRuleIds).toContain('nos-income-ceiling');
      expect(failedRuleIds).toContain('nos-qualifying-marks');
      expect(failedRuleIds).toContain('nos-qs-rank');
      expect(failedRuleIds).toContain('doc-req-ADMISSION_OFFER_LETTER');
      expect(failedRuleIds).toContain('doc-req-INCOME_CERTIFICATE');
    });
  });

  // ============================================================================
  // Suite 5: Simulation Side-Effect Zero Guarantee & Audit Trail Integrity
  // ============================================================================

  describe('Simulation Zero-Side-Effect Guarantee & Publishing Audit Trail', () => {
    it('should guarantee that dry-run simulations do NOT persist data into database tables', async () => {
      // Count existing rows
      const appCountBefore = await prisma.application.count();
      const docCountBefore = await prisma.applicationDocument.count();
      const defCountBefore = await prisma.deficiencyRecord.count();

      // Execute simulation via service
      const v1 = await prisma.schemeVersion.findFirst({
        where: { scheme: { code: 'NFST' }, versionNumber: 1 },
      });
      expect(v1).toBeDefined();

      const simResult = await schemesService.simulateSchemeVersion(v1!.id, {
        applicantProfile: {
          casteCommunity: 'Santhal',
          annualIncome: 80000,
          aadhaarVerified: true,
        },
        uploadedDocuments: [DocumentType.AADHAAR_CARD, DocumentType.CASTE_CERTIFICATE],
      });

      expect(simResult).toBeDefined();
      expect(simResult.simulationId).toBeDefined();

      // Count again to confirm ZERO rows were created
      const appCountAfter = await prisma.application.count();
      const docCountAfter = await prisma.applicationDocument.count();
      const defCountAfter = await prisma.deficiencyRecord.count();

      expect(appCountAfter).toBe(appCountBefore);
      expect(docCountAfter).toBe(docCountBefore);
      expect(defCountAfter).toBe(defCountBefore);
    });

    it('should create an immutable AuditLog entry when publishing a scheme version', async () => {
      // 1. Create a draft version
      const createRes = await request(app)
        .post('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          versionNumber: 99,
          academicYear: '2029-2030',
          totalSlots: 50,
          incomeCeiling: 700000.0,
          startDate: '2029-01-01T00:00:00.000Z',
          endDate: '2029-12-31T23:59:59.000Z',
          description: 'Draft version for audit verification test',
          documentRequirements: [
            { documentType: DocumentType.AADHAAR_CARD, mandatory: true },
            { documentType: DocumentType.CASTE_CERTIFICATE, mandatory: true },
          ],
          eligibilityRules: {
            schemeCode: SchemeCode.NFST,
            academicYear: '2029-2030',
            incomeCeiling: 700000.0,
            requiredDocumentTypes: [DocumentType.AADHAAR_CARD, DocumentType.CASTE_CERTIFICATE],
            eligibilityGroups: [],
          },
        });

      expect(createRes.status).toBe(201);
      testSchemeVersionId = createRes.body.data.id;

      // 2. Publish the version
      const pubRes = await request(app)
        .patch(`/api/v1/schemes/versions/${testSchemeVersionId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(pubRes.status).toBe(200);
      expect(pubRes.body.data.isPublished).toBe(true);

      // 3. Verify audit record was created in Prisma AuditLog table
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'SCHEME_RULE_MODIFIED',
          details: {
            path: ['metadata', 'event'],
            equals: 'PUBLISH_SCHEME_VERSION',
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('SCHEME_RULE_MODIFIED');
      const details = auditLog?.details as Record<string, unknown>;
      expect(details['entityType']).toBe('SCHEME_VERSION');
      expect(details['entityId']).toBe(testSchemeVersionId);
      const after = details['after'] as Record<string, unknown>;
      expect(after['isPublished']).toBe(true);
    });
  });
});
