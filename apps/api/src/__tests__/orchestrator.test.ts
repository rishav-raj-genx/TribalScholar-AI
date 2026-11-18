import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import {
  ApplicationStatus,
  AuditAction,
  DeficiencyStatus,
  DocumentType,
  SchemeCode,
  VerificationStatus,
} from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import {
  ocrClientService,
  type OcrAnalyzeDocumentRequest,
  type OcrAnalyzeDocumentResponse,
} from '../modules/ocrClient/ocrClient.service.js';

describe('Submission Orchestration & Scrutiny Evaluation Pipeline', () => {
  let applicantToken1: string;

  let applicantToken2: string;
  let applicantId2: string;

  let testApplicationPassingId: string;
  let testApplicationDeficientId: string;

  const testAppIds: string[] = [];

  // Authentic binary sample buffers for upload
  const samplePdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
    Buffer.from(' - TribalScholar AI Sample Certificate Document'),
  ]);

  const samplePngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('IHDR sample PNG payload for certificate'),
  ]);

  const sampleJpegBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    Buffer.from('Sample JPEG payload for scholar mark sheet'),
  ]);

  beforeAll(async () => {
    // 1. Authenticate Applicant 1 (Birsa Munda - profile already seeded: Santhal, Rs 80,000 income, Jharkhand)
    const app1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(app1Login.status).toBe(200);
    applicantToken1 = app1Login.body.data?.accessToken || app1Login.body.accessToken;

    // 2. Register Applicant 2 (for cross-applicant security testing)
    const app2Email = `applicant_orch_${Date.now()}@test.in`;
    const app2Register = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: app2Email,
        password: 'Password@123',
        fullName: 'Shanti Tigga',
      });
    expect(app2Register.status).toBe(201);
    applicantToken2 = app2Register.body.data?.accessToken || app2Register.body.accessToken;
    applicantId2 = app2Register.body.data?.user?.id || app2Register.body.user?.id;

    // Create profile for Applicant 2
    await request(app)
      .put('/api/v1/applicant/profile')
      .set('Authorization', `Bearer ${applicantToken2}`)
      .send({
        dateOfBirth: '2000-08-20',
        gender: 'FEMALE',
        casteCommunity: 'Oraon',
        fatherOrSpouseName: 'Sukra Tigga',
        annualIncome: 95000,
        addressLine: 'Ranchi Main Road',
        district: 'Ranchi',
        state: 'Jharkhand',
        pincode: '834001',
      });

    // 3. Create Draft Application for Passing Scenario (NFST)
    const passingAppCreate = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken1}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: {
          degree: 'Ph.D.',
          institution: 'Ranchi University',
          aadhaarVerified: true,
          academic: {
            pgMarksPercentage: 75.0,
          },
        },
      });
    expect(passingAppCreate.status).toBe(201);
    testApplicationPassingId = passingAppCreate.body.data.id;
    testAppIds.push(testApplicationPassingId);

    // Upload all 8 mandatory NFST documents for Passing Application
    const mandatoryNfstDocs = [
      { type: 'AADHAAR_CARD', buf: samplePdfBuffer, name: 'aadhaar.pdf' },
      { type: 'ST_CASTE_CERTIFICATE', buf: samplePdfBuffer, name: 'caste_cert.pdf' },
      { type: 'INCOME_CERTIFICATE', buf: samplePdfBuffer, name: 'income_cert.pdf' },
      { type: 'ACADEMIC_MARKSHEET', buf: sampleJpegBuffer, name: 'marksheet_pg.jpg' },
      { type: 'ADMISSION_OFFER_LETTER', buf: samplePdfBuffer, name: 'admission_letter.pdf' },
      { type: 'BONAFIDE_CERTIFICATE', buf: samplePdfBuffer, name: 'bonafide.pdf' },
      { type: 'BANK_PASSBOOK', buf: samplePngBuffer, name: 'passbook.png' },
      { type: 'SYNOPSIS_RESEARCH_PROPOSAL', buf: samplePdfBuffer, name: 'proposal.pdf' },
    ];

    for (const doc of mandatoryNfstDocs) {
      await request(app)
        .post(`/api/v1/applications/${testApplicationPassingId}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', doc.type)
        .attach('file', doc.buf, doc.name);
    }

    // 4. Create Draft Application for Deficient Scenario (NFST)
    const deficientAppCreate = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken1}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: {
          degree: 'M.Phil.',
          institution: 'Central University of Jharkhand',
          aadhaarVerified: true,
          academic: {
            pgMarksPercentage: 72.0,
          },
        },
      });
    expect(deficientAppCreate.status).toBe(201);
    testApplicationDeficientId = deficientAppCreate.body.data.id;
    testAppIds.push(testApplicationDeficientId);

    // Upload documents for Deficient Application
    for (const doc of mandatoryNfstDocs) {
      await request(app)
        .post(`/api/v1/applications/${testApplicationDeficientId}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', doc.type)
        .attach('file', doc.buf, doc.name);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    vi.restoreAllMocks();

    if (testAppIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { applicationId: { in: testAppIds } },
      });
      await prisma.deficiencyRecord.deleteMany({
        where: { applicationId: { in: testAppIds } },
      });
      await prisma.applicationDocument.deleteMany({
        where: { applicationId: { in: testAppIds } },
      });
      await prisma.application.deleteMany({
        where: { id: { in: testAppIds } },
      });
    }

    if (applicantId2) {
      await prisma.auditLog.deleteMany({
        where: { userId: applicantId2 },
      });
      await prisma.applicantProfile.deleteMany({
        where: { userId: applicantId2 },
      });
      await prisma.user.deleteMany({
        where: { id: applicantId2 },
      });
    }
  });

  // ============================================================================
  // 1. Successful Submission Orchestration (All Checks Pass -> UNDER_SCRUTINY)
  // ============================================================================
  describe('Successful Submission Orchestration (UNDER_SCRUTINY)', () => {
    it('should evaluate all documents via OCR, pass versioned scheme rules, and transition to UNDER_SCRUTINY', async () => {
      // Mock OCR Service response for clean passing documents
      vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
        async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
          if (req.expectedType === DocumentType.INCOME_CERTIFICATE) {
            return {
              success: true,
              documentId: req.documentId,
              documentType: req.expectedType,
              status: 'VERIFIED',
              overallConfidence: 0.96,
              classification: {
                predictedType: req.expectedType,
                confidence: 0.98,
                isMatch: true,
              },
              extractedFields: {
                applicantName: {
                  fieldName: 'applicantName',
                  value: 'Birsa Munda',
                  status: 'Extracted',
                  confidence: 0.96,
                  evidence: {
                    page: 1,
                    fieldLabel: 'Name',
                    bbox: { x: 10, y: 20, width: 200, height: 20 },
                    rawSnippet: 'Certified that Shri Birsa Munda',
                    evidenceString: 'page 1 · name field',
                  },
                },
                annualFamilyIncome: {
                  fieldName: 'annualFamilyIncome',
                  value: 80000,
                  status: 'Extracted',
                  confidence: 0.97,
                  evidence: {
                    page: 1,
                    fieldLabel: 'Annual Income',
                    bbox: { x: 10, y: 50, width: 200, height: 20 },
                    rawSnippet: 'Annual Income is Rs 80,000 per annum',
                    evidenceString: 'page 1 · income field',
                  },
                },
                issuingAuthority: {
                  fieldName: 'issuingAuthority',
                  value: 'Competent Revenue Authority',
                  status: 'Extracted',
                  confidence: 0.95,
                },
              },
              comparisons: [
                {
                  field: 'applicantName',
                  declaredValue: 'Birsa Munda',
                  extractedValue: 'Birsa Munda',
                  isMatch: true,
                  confidence: 0.96,
                  evidenceString: 'page 1 · name field',
                },
                {
                  field: 'annualFamilyIncome',
                  declaredValue: 80000,
                  extractedValue: 80000,
                  isMatch: true,
                  confidence: 0.97,
                  evidenceString: 'page 1 · income field',
                },
              ],
              deficiencyReasons: [],
              processedAt: new Date().toISOString(),
            };
          }

          if (
            req.expectedType === DocumentType.ST_CASTE_CERTIFICATE ||
            req.expectedType === DocumentType.CASTE_CERTIFICATE
          ) {
            return {
              success: true,
              documentId: req.documentId,
              documentType: req.expectedType,
              status: 'VERIFIED',
              overallConfidence: 0.97,
              classification: {
                predictedType: req.expectedType,
                confidence: 0.99,
                isMatch: true,
              },
              extractedFields: {
                applicantName: {
                  fieldName: 'applicantName',
                  value: 'Birsa Munda',
                  status: 'Extracted',
                  confidence: 0.97,
                  evidence: {
                    page: 1,
                    fieldLabel: 'Name',
                    bbox: { x: 10, y: 20, width: 200, height: 20 },
                    rawSnippet: 'Shri Birsa Munda belongs to Santhal Community',
                    evidenceString: 'page 1 · name field',
                  },
                },
                category: {
                  fieldName: 'category',
                  value: 'Santhal (Scheduled Tribe - ST)',
                  status: 'Extracted',
                  confidence: 0.98,
                  evidence: {
                    page: 1,
                    fieldLabel: 'Category',
                    bbox: { x: 10, y: 50, width: 200, height: 20 },
                    rawSnippet: 'Santhal (Scheduled Tribe - ST)',
                    evidenceString: 'page 1 · category field',
                  },
                },
                issuingAuthority: {
                  fieldName: 'issuingAuthority',
                  value: 'Sub-Divisional Officer, Khunti',
                  status: 'Extracted',
                  confidence: 0.95,
                },
              },
              comparisons: [],
              deficiencyReasons: [],
              processedAt: new Date().toISOString(),
            };
          }

          // Generic verified fallback for all other documents
          return {
            success: true,
            documentId: req.documentId,
            documentType: req.expectedType,
            status: 'VERIFIED',
            overallConfidence: 0.95,
            classification: {
              predictedType: req.expectedType,
              confidence: 0.96,
              isMatch: true,
            },
            extractedFields: {
              applicantName: {
                fieldName: 'applicantName',
                value: 'Birsa Munda',
                status: 'Extracted',
                confidence: 0.95,
                evidence: {
                  page: 1,
                  fieldLabel: 'Name',
                  bbox: { x: 10, y: 20, width: 200, height: 20 },
                  rawSnippet: 'Birsa Munda',
                  evidenceString: 'page 1 · name field',
                },
              },
            },
            comparisons: [],
            deficiencyReasons: [],
            processedAt: new Date().toISOString(),
          };
        }
      );

      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationPassingId}/submit`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('moved to scrutiny queue');
      expect(res.body.data.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(res.body.data.submittedAt).not.toBeNull();

      // Verify Database state
      const updatedApp = await prisma.application.findUnique({
        where: { id: testApplicationPassingId },
        include: {
          documents: true,
          deficiencies: true,
        },
      });

      expect(updatedApp).toBeDefined();
      expect(updatedApp?.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(updatedApp?.deficiencies).toHaveLength(0);

      // Verify all current documents have verified OCR data stored
      expect(updatedApp?.documents.length).toBe(8);
      for (const doc of updatedApp!.documents) {
        expect(doc.verificationStatus).toBe(VerificationStatus.VERIFIED);
        expect(doc.ocrConfidence).toBeGreaterThan(0.9);
        expect(doc.ocrExtractedFields).not.toBeNull();
      }

      // Verify Audit Trail records
      const auditLogs = await prisma.auditLog.findMany({
        where: { applicationId: testApplicationPassingId },
        orderBy: { timestamp: 'asc' },
      });

      const actions = auditLogs.map((l) => l.action);
      expect(actions).toContain(AuditAction.OCR_PROCESSED);
      expect(actions).toContain(AuditAction.RULE_EVALUATED);
      expect(actions).toContain(AuditAction.APPLICATION_SUBMITTED);

      const submitLog = auditLogs.find((l) => l.action === AuditAction.APPLICATION_SUBMITTED);
      expect(submitLog?.newState).toBe(ApplicationStatus.UNDER_SCRUTINY);
    });
  });

  // ============================================================================
  // 2. Deficient Submission Orchestration (Deficiency Detected -> DEFICIENCY_RAISED)
  // ============================================================================
  describe('Deficient Submission Orchestration (DEFICIENCY_RAISED)', () => {
    it('should generate DeficiencyRecord entries and transition status to DEFICIENCY_RAISED when checks fail', async () => {
      // Mock OCR Service response where income exceeds ceiling (e.g., ₹8,50,000 vs ₹6,00,000 ceiling)
      vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
        async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
          if (req.expectedType === DocumentType.INCOME_CERTIFICATE) {
            return {
              success: true,
              documentId: req.documentId,
              documentType: req.expectedType,
              status: 'DEFICIENT',
              overallConfidence: 0.94,
              classification: {
                predictedType: req.expectedType,
                confidence: 0.96,
                isMatch: true,
              },
              extractedFields: {
                applicantName: {
                  fieldName: 'applicantName',
                  value: 'Birsa Munda',
                  status: 'Extracted',
                  confidence: 0.95,
                },
                annualFamilyIncome: {
                  fieldName: 'annualFamilyIncome',
                  value: 850000,
                  status: 'Mismatch',
                  confidence: 0.94,
                  evidence: {
                    page: 1,
                    fieldLabel: 'Annual Income',
                    bbox: { x: 10, y: 50, width: 200, height: 20 },
                    rawSnippet: 'Annual Income is Rs 8,50,000 per annum',
                    evidenceString: 'page 1 · income field',
                  },
                },
                issuingAuthority: {
                  fieldName: 'issuingAuthority',
                  value: 'Competent Revenue Authority',
                  status: 'Extracted',
                  confidence: 0.95,
                },
              },
              comparisons: [
                {
                  field: 'annualFamilyIncome',
                  declaredValue: 80000,
                  extractedValue: 850000,
                  isMatch: false,
                  confidence: 0.94,
                  evidenceString: 'page 1 · income field',
                  notes: 'Certificate income (₹850,000) exceeds declared annual income (₹80,000).',
                },
              ],
              deficiencyReasons: [
                'Certificate income (₹850,000) exceeds declared annual income (₹80,000).',
              ],
              processedAt: new Date().toISOString(),
            };
          }

          // Return standard verified for other docs
          return {
            success: true,
            documentId: req.documentId,
            documentType: req.expectedType,
            status: 'VERIFIED',
            overallConfidence: 0.95,
            classification: {
              predictedType: req.expectedType,
              confidence: 0.95,
              isMatch: true,
            },
            extractedFields: {
              applicantName: {
                fieldName: 'applicantName',
                value: 'Birsa Munda',
                status: 'Extracted',
                confidence: 0.95,
              },
              category: {
                fieldName: 'category',
                value: 'Scheduled Tribe (ST)',
                status: 'Extracted',
                confidence: 0.95,
              },
              issuingAuthority: {
                fieldName: 'issuingAuthority',
                value: 'Sub-Divisional Officer, Khunti',
                status: 'Extracted',
                confidence: 0.95,
              },
            },
            comparisons: [],
            deficiencyReasons: [],
            processedAt: new Date().toISOString(),
          };
        }
      );

      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationDeficientId}/submit`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('Deficiencies detected');
      expect(res.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);

      // Verify Database state
      const updatedApp = await prisma.application.findUnique({
        where: { id: testApplicationDeficientId },
        include: {
          documents: true,
          deficiencies: true,
        },
      });

      expect(updatedApp).toBeDefined();
      expect(updatedApp?.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);
      expect(updatedApp?.deficiencies.length).toBeGreaterThanOrEqual(1);

      // Verify deficiency record structure
      const incomeDeficiency = updatedApp?.deficiencies.find((d) =>
        d.description.includes('850,000') || d.fieldOrCriteria.toLowerCase().includes('income')
      );
      expect(incomeDeficiency).toBeDefined();
      expect(incomeDeficiency?.status).toBe(DeficiencyStatus.OPEN);
      expect(incomeDeficiency?.raisedByOfficerId).toBeDefined();

      // Verify the deficient document has FLAGGED_DEFICIENT status
      const incomeDoc = updatedApp?.documents.find(
        (d) => d.documentType === DocumentType.INCOME_CERTIFICATE
      );
      expect(incomeDoc?.verificationStatus).toBe(VerificationStatus.FLAGGED_DEFICIENT);
      expect(incomeDoc?.rejectionReason).toContain('850,000');

      // Verify Audit Trail records
      const auditLogs = await prisma.auditLog.findMany({
        where: { applicationId: testApplicationDeficientId },
        orderBy: { timestamp: 'asc' },
      });

      const actions = auditLogs.map((l) => l.action);
      expect(actions).toContain(AuditAction.OCR_PROCESSED);
      expect(actions).toContain(AuditAction.RULE_EVALUATED);
      expect(actions).toContain(AuditAction.DEFICIENCY_RAISED);
      expect(actions).toContain(AuditAction.APPLICATION_SUBMITTED);

      const submitLog = auditLogs.find((l) => l.action === AuditAction.APPLICATION_SUBMITTED);
      expect(submitLog?.newState).toBe(ApplicationStatus.DEFICIENCY_RAISED);
    });
  });

  // ============================================================================
  // 3. Security Boundaries & Guard Invariants
  // ============================================================================
  describe('Security Boundaries & Guard Invariants', () => {
    it('should REJECT unauthenticated submission requests with 401 Unauthorized', async () => {
      const res = await request(app).post(`/api/v1/applications/${testApplicationPassingId}/submit`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should REJECT Applicant 2 attempting to submit Applicant 1 application with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationPassingId}/submit`)
        .set('Authorization', `Bearer ${applicantToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('You do not have permission');
    });

    it('should REJECT resubmission of an application that is already UNDER_SCRUTINY with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationPassingId}/submit`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('BAD_REQUEST');
      expect(res.body.message).toContain('Only DRAFT or DEFICIENT applications can be submitted');
    });

    it('should return 404 for non-existent application submission', async () => {
      const res = await request(app)
        .post('/api/v1/applications/00000000-0000-0000-0000-000000000000/submit')
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================================
  // 4. OCR Client Resilience & Timeout / Retry Handling
  // ============================================================================
  describe('OCR Client Resilience & Timeout / Retry Handling', () => {
    it('should retry on transient 5xx server errors and return successful extraction on subsequent attempt', async () => {
      let attempts = 0;
      const originalFetch = global.fetch;

      global.fetch = vi.fn().mockImplementation(async () => {
        attempts += 1;
        if (attempts === 1) {
          // First attempt simulates 503 Service Unavailable
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => 'OCR engine warming up',
          } as Response;
        }

        // Second attempt succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            documentId: 'doc-retry-test',
            documentType: DocumentType.INCOME_CERTIFICATE,
            status: 'VERIFIED',
            overallConfidence: 0.95,
            classification: {
              predictedType: DocumentType.INCOME_CERTIFICATE,
              confidence: 0.98,
              isMatch: true,
            },
            extractedFields: {},
            comparisons: [],
            deficiencyReasons: [],
            processedAt: new Date().toISOString(),
          }),
        } as Response;
      });

      const result = await ocrClientService.analyzeDocument(
        {
          documentId: 'doc-retry-test',
          expectedType: DocumentType.INCOME_CERTIFICATE,
        },
        {
          maxRetries: 2,
          retryDelayMs: 20,
        }
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe('VERIFIED');
      expect(attempts).toBe(2);

      global.fetch = originalFetch;
    });

    it('should not retry on 400 Bad Request client errors and fail immediately', async () => {
      let attempts = 0;
      const originalFetch = global.fetch;

      global.fetch = vi.fn().mockImplementation(async () => {
        attempts += 1;
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: async () => 'Invalid payload format',
        } as Response;
      });

      await expect(
        ocrClientService.analyzeDocument(
          {
            documentId: 'doc-400-test',
            expectedType: DocumentType.INCOME_CERTIFICATE,
          },
          {
            maxRetries: 2,
            retryDelayMs: 20,
          }
        )
      ).rejects.toThrow('HTTP 400');

      expect(attempts).toBe(1);

      global.fetch = originalFetch;
    });
  });
});
