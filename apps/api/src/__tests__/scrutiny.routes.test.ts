import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import {
  ApplicationStatus,
  AuditAction,
  DeficiencyStatus,
  DocumentType,
  ReviewDecision,
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

describe('Scrutiny Officer Workspace & Decision Desk (/api/v1/scrutiny)', () => {
  let officerToken: string;
  let officerId: string;

  let adminToken: string;

  let applicantToken: string;

  let passingAppId: string;
  let deficientAppId: string;

  const testAppIds: string[] = [];

  const samplePdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
    Buffer.from(' - TribalScholar AI Sample Certificate Document'),
  ]);

  const sampleJpegBuffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]),
    Buffer.from('Sample JPEG payload for scholar mark sheet'),
  ]);

  const samplePngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.from('IHDR sample PNG payload for certificate'),
  ]);

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

  beforeAll(async () => {
    // 1. Authenticate SCRUTINY_OFFICER (Dr. Sunita Toppo)
    const officerLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'scrutiny@mota.gov.in', password: 'Password@123' });
    expect(officerLogin.status).toBe(200);
    officerToken = officerLogin.body.data?.accessToken || officerLogin.body.accessToken;
    officerId = officerLogin.body.data?.user?.id || officerLogin.body.user?.id;

    // 2. Authenticate ADMIN
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mota.gov.in', password: 'Password@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data?.accessToken || adminLogin.body.accessToken;

    // 3. Authenticate APPLICANT (Birsa Munda)
    const appLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(appLogin.status).toBe(200);
    applicantToken = appLogin.body.data?.accessToken || appLogin.body.accessToken;

    // 4. Create and submit a clean passing application (NFST -> UNDER_SCRUTINY)
    const passingCreate = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: {
          degree: 'Ph.D.',
          institution: 'Ranchi University',
          aadhaarVerified: true,
          academic: { pgMarksPercentage: 75.0 },
        },
      });
    expect(passingCreate.status).toBe(201);
    passingAppId = passingCreate.body.data.id;
    testAppIds.push(passingAppId);

    for (const doc of mandatoryNfstDocs) {
      await request(app)
        .post(`/api/v1/applications/${passingAppId}/documents`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('docType', doc.type)
        .attach('file', doc.buf, doc.name);
    }

    vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
      async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
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
                rawSnippet: 'Shri Birsa Munda',
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
                rawSnippet: 'Income Rs 80,000 per annum',
                evidenceString: 'page 1 · income field',
              },
            },
            category: {
              fieldName: 'category',
              value: 'Santhal (Scheduled Tribe - ST)',
              status: 'Extracted',
              confidence: 0.98,
            },
            stateDomicile: {
              fieldName: 'stateDomicile',
              value: 'Jharkhand',
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

    const submitPassing = await request(app)
      .post(`/api/v1/applications/${passingAppId}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(submitPassing.status).toBe(200);
    expect(submitPassing.body.data.status).toBe(ApplicationStatus.UNDER_SCRUTINY);

    // 5. Create and submit an application with an AI/Rule deficiency (income mismatch -> DEFICIENCY_RAISED)
    const deficientCreate = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: {
          degree: 'Ph.D.',
          institution: 'Ranchi University',
          aadhaarVerified: true,
          academic: { pgMarksPercentage: 75.0 },
        },
      });
    expect(deficientCreate.status).toBe(201);
    deficientAppId = deficientCreate.body.data.id;
    testAppIds.push(deficientAppId);

    for (const doc of mandatoryNfstDocs) {
      await request(app)
        .post(`/api/v1/applications/${deficientAppId}/documents`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('docType', doc.type)
        .attach('file', doc.buf, doc.name);
    }

    vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
      async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
        if (req.expectedType === DocumentType.INCOME_CERTIFICATE) {
          return {
            success: true,
            documentId: req.documentId,
            documentType: req.expectedType,
            status: 'DEFICIENT',
            overallConfidence: 0.92,
            classification: {
              predictedType: req.expectedType,
              confidence: 0.95,
              isMatch: true,
            },
            extractedFields: {
              applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.95 },
              annualFamilyIncome: { fieldName: 'annualFamilyIncome', value: 250000, status: 'Extracted', confidence: 0.92 },
            },
            comparisons: [
              {
                field: 'annualFamilyIncome',
                declaredValue: 80000,
                extractedValue: 250000,
                isMatch: false,
                confidence: 0.92,
                notes: 'Income discrepancy detected',
              },
            ],
            deficiencyReasons: ['Income mismatch: Declared 80000 does not match certificate 250000'],
            processedAt: new Date().toISOString(),
          };
        }

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
            applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.96 },
            category: { fieldName: 'category', value: 'Santhal (Scheduled Tribe - ST)', status: 'Extracted', confidence: 0.98 },
            stateDomicile: { fieldName: 'stateDomicile', value: 'Jharkhand', status: 'Extracted', confidence: 0.95 },
          },
          comparisons: [],
          deficiencyReasons: [],
          processedAt: new Date().toISOString(),
        };
      }
    );

    const submitDeficient = await request(app)
      .post(`/api/v1/applications/${deficientAppId}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(submitDeficient.status).toBe(200);
    expect(submitDeficient.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);
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
      await prisma.officerReview.deleteMany({
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
  });

  // ============================================================================
  // 1. RBAC & Access Control Guards
  // ============================================================================
  describe('RBAC & Authentication Guards', () => {
    it('should return 401 when accessing scrutiny routes without authentication', async () => {
      const res = await request(app).get('/api/v1/scrutiny/queue');
      expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden when APPLICANT tries to access the scrutiny queue', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/queue')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permissions');
    });

    it('should return 403 Forbidden when APPLICANT tries to inspect an application decision package', async () => {
      const res = await request(app)
        .get(`/api/v1/scrutiny/applications/${passingAppId}`)
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 403 Forbidden when APPLICANT tries to submit an officer review', async () => {
      const res = await request(app)
        .post(`/api/v1/scrutiny/applications/${passingAppId}/review`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          decision: 'APPROVE',
          remarks: 'Applicant cannot approve own application',
        });
      expect(res.status).toBe(403);
    });

    it('should allow ADMIN to access the scrutiny queue and review applications', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });

  // ============================================================================
  // 2. Scrutiny Queue (GET /api/v1/scrutiny/queue)
  // ============================================================================
  describe('GET /api/v1/scrutiny/queue', () => {
    it('should return applications in the scrutiny queue with metadata', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/queue')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.items)).toBe(true);

      const passingItem = res.body.data.items.find(
        (item: { id: string }) => item.id === passingAppId
      );
      expect(passingItem).toBeDefined();
      expect(passingItem.applicationNumber).toMatch(/^TS-NFST-/);
      expect(passingItem.schemeCode).toBe('NFST');
      expect(passingItem.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(passingItem.documentsCount).toBe(8);
      expect(passingItem.overallConfidence).toBeGreaterThanOrEqual(0.9);
      expect(passingItem.hasAiFlag).toBe(false);
      expect(passingItem.aiRecommendation).toBe('APPROVE');
    });

    it('should filter queue by schemeCode (NFST)', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/queue?schemeCode=NFST')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      res.body.data.items.forEach((item: { schemeCode: string }) => {
        expect(item.schemeCode).toBe('NFST');
      });
    });

    it('should filter queue by status (DEFICIENCY_RAISED)', async () => {
      const res = await request(app)
        .get(`/api/v1/scrutiny/queue?status=${ApplicationStatus.DEFICIENCY_RAISED}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      const deficientItem = res.body.data.items.find(
        (item: { id: string }) => item.id === deficientAppId
      );
      expect(deficientItem).toBeDefined();
      expect(deficientItem.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);
      expect(deficientItem.hasAiFlag).toBe(true);
      expect(deficientItem.aiRecommendation).toBe('REQUEST_CORRECTION');
    });

    it('should filter queue by confidenceLevel=HIGH', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/queue?confidenceLevel=HIGH')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      res.body.data.items.forEach((item: { overallConfidence: number }) => {
        expect(item.overallConfidence).toBeGreaterThanOrEqual(0.9);
      });
    });

    it('should search queue by applicant name or application number', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/queue?search=Birsa')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      expect(res.body.data.items[0].applicantName).toContain('Birsa');
    });
  });

  // ============================================================================
  // 3. Complete Decision Package (GET /api/v1/scrutiny/applications/:id)
  // ============================================================================
  describe('GET /api/v1/scrutiny/applications/:id', () => {
    it('should return 404 for non-existent application', async () => {
      const res = await request(app)
        .get('/api/v1/scrutiny/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should return the complete Decision Package for the 2-column officer UI', async () => {
      const res = await request(app)
        .get(`/api/v1/scrutiny/applications/${passingAppId}`)
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      const pkg = res.body.data;

      // 1. Core Application & Applicant details
      expect(pkg.application.id).toBe(passingAppId);
      expect(pkg.application.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(pkg.applicant.fullName).toBe('Birsa Munda');
      expect(pkg.applicant.profile.casteCommunity).toBe('Santhal');
      expect(Number(pkg.applicant.profile.annualIncome)).toBe(80000);

      // 2. Scheme & Pinned SchemeVersion details
      expect(pkg.scheme.code).toBe('NFST');
      expect(pkg.scheme.version.academicYear).toBe('2026-2027');

      // 3. Document details with view URLs and OCR extractions (Column 1)
      expect(Array.isArray(pkg.documents)).toBe(true);
      expect(pkg.documents.length).toBe(8);
      const incomeDoc = pkg.documents.find(
        (d: { documentType: string }) => d.documentType === 'INCOME_CERTIFICATE'
      );
      expect(incomeDoc).toBeDefined();
      expect(incomeDoc.viewUrl).toBeDefined();
      expect(incomeDoc.verificationStatus).toBe(VerificationStatus.VERIFIED);
      expect(incomeDoc.ocrConfidence).toBeGreaterThanOrEqual(0.9);
      expect(incomeDoc.ocrExtractedFields.annualFamilyIncome.value).toBe(80000);
      expect(incomeDoc.ocrExtractedFields.annualFamilyIncome.evidence.evidenceString).toBe(
        'page 1 · income field'
      );

      // 4. Rule Engine results & AI findings (Column 2)
      expect(pkg.ruleEvaluation).toBeDefined();
      expect(pkg.ruleEvaluation.overallPassed).toBe(true);
      expect(pkg.aiFindings.overallConfidence).toBeGreaterThanOrEqual(0.9);
      expect(pkg.aiFindings.hasFlag).toBe(false);
      expect(pkg.aiFindings.recommendation).toBe('APPROVE');
      expect(Array.isArray(pkg.deficiencyHistory)).toBe(true);
      expect(Array.isArray(pkg.priorReviews)).toBe(true);
    });
  });

  // ============================================================================
  // 4. Officer Decision & Governance (POST /api/v1/scrutiny/applications/:id/review)
  // ============================================================================
  describe('POST /api/v1/scrutiny/applications/:id/review', () => {
    it('should successfully approve a clean application (APPROVE -> SCRUTINY_APPROVED)', async () => {
      const res = await request(app)
        .post(`/api/v1/scrutiny/applications/${passingAppId}/review`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'APPROVE',
          remarks: 'Physical seals and income limits verified against revenue authority records.',
          checklistResults: {
            incomeLimitVerified: true,
            casteVerified: true,
            marksheetOriginalVerified: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ApplicationStatus.SCRUTINY_APPROVED);
      expect(res.body.message).toContain('approved');

      // Verify OfficerReview record in DB
      const reviewRecord = await prisma.officerReview.findFirst({
        where: { applicationId: passingAppId },
        orderBy: { reviewedAt: 'desc' },
      });
      expect(reviewRecord).toBeDefined();
      expect(reviewRecord?.officerId).toBe(officerId);
      expect(reviewRecord?.decision).toBe(ReviewDecision.APPROVE);
      expect(reviewRecord?.aiFindingsAgreement).toBe(true);
      expect(reviewRecord?.overrideReason).toBeNull();

      // Verify Audit Trail recorded OFFICER_REVIEW_SUBMITTED
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: passingAppId,
          action: AuditAction.OFFICER_REVIEW_SUBMITTED,
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.userId).toBe(officerId);
      expect(auditLog?.newState).toBe(ApplicationStatus.SCRUTINY_APPROVED);
    });

    it('should reject approval without justification when AI or rule deficiencies are active (Mandatory Override Justification)', async () => {
      // Deficient application has active income mismatch deficiency
      const res = await request(app)
        .post(`/api/v1/scrutiny/applications/${deficientAppId}/review`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'APPROVE',
          remarks: 'Attempting to approve without justification',
          // justification omitted
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Officer justification is mandatory when approving an application with active AI or rule deficiencies');
    });

    it('should allow approval with override when justification is provided, waiving deficiencies', async () => {
      const overrideJustification =
        'Physical revenue inquiry completed by SDO Khunti; applicant declared farm loss reducing annual income to ₹80,000; override granted per MoTA circular.';

      const res = await request(app)
        .post(`/api/v1/scrutiny/applications/${deficientAppId}/review`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'APPROVE',
          remarks: 'Approved under district collectorate special verification.',
          justification: overrideJustification,
          overrideUsed: true,
          checklistResults: {
            physicalDocumentExamined: true,
            revenueCollectorSigned: true,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(ApplicationStatus.SCRUTINY_APPROVED);

      // Verify OfficerReview has overrideReason and aiFindingsAgreement = false
      const reviewRecord = await prisma.officerReview.findFirst({
        where: { applicationId: deficientAppId },
        orderBy: { reviewedAt: 'desc' },
      });
      expect(reviewRecord).toBeDefined();
      expect(reviewRecord?.aiFindingsAgreement).toBe(false);
      expect(reviewRecord?.overrideReason).toBe(overrideJustification);

      // Verify open deficiency was WAIVED
      const deficiencies = await prisma.deficiencyRecord.findMany({
        where: { applicationId: deficientAppId },
      });
      const waivedDeficiency = deficiencies.find((d) => d.status === DeficiencyStatus.WAIVED);
      expect(waivedDeficiency).toBeDefined();
      expect(waivedDeficiency?.isResolved).toBe(true);
      expect(waivedDeficiency?.resolutionNote).toContain('Waived by Officer override');

      // Verify Audit Trail recorded override
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: deficientAppId,
          action: AuditAction.OFFICER_REVIEW_SUBMITTED,
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(JSON.stringify(auditLog?.details)).toMatch(/override/i);
    });

    it('should request correction, raising deficiencies and routing application back to applicant (REQUEST_CORRECTION -> DEFICIENCY_RAISED)', async () => {
      // Create another submitted application for correction testing
      const appCreate = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {
            degree: 'Ph.D.',
            institution: 'Ranchi University',
            aadhaarVerified: true,
            academic: { pgMarksPercentage: 75.0 },
          },
        });
      const testId = appCreate.body.data.id;
      testAppIds.push(testId);

      for (const doc of mandatoryNfstDocs) {
        await request(app)
          .post(`/api/v1/applications/${testId}/documents`)
          .set('Authorization', `Bearer ${applicantToken}`)
          .field('docType', doc.type)
          .attach('file', doc.buf, doc.name);
      }

      vi.spyOn(ocrClientService, 'analyzeDocument').mockResolvedValue({
        success: true,
        documentId: 'doc-id',
        documentType: DocumentType.ACADEMIC_MARKSHEET,
        status: 'VERIFIED',
        overallConfidence: 0.95,
        classification: {
          predictedType: DocumentType.ACADEMIC_MARKSHEET,
          confidence: 0.95,
          isMatch: true,
        },
        extractedFields: {
          applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.95 },
          category: { fieldName: 'category', value: 'Santhal (Scheduled Tribe - ST)', status: 'Extracted', confidence: 0.95 },
          stateDomicile: { fieldName: 'stateDomicile', value: 'Jharkhand', status: 'Extracted', confidence: 0.95 },
          annualFamilyIncome: { fieldName: 'annualFamilyIncome', value: 80000, status: 'Extracted', confidence: 0.95 },
          percentageMarks: { fieldName: 'percentageMarks', value: 75.0, status: 'Extracted', confidence: 0.95 },
        },
        comparisons: [],
        deficiencyReasons: [],
        processedAt: new Date().toISOString(),
      });

      const submitRes = await request(app)
        .post(`/api/v1/applications/${testId}/submit`)
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(submitRes.status).toBe(200);

      // Officer requests correction
      const correctionRes = await request(app)
        .post(`/api/v1/scrutiny/applications/${testId}/review`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'REQUEST_CORRECTION',
          remarks: 'Academic Marksheet pg 2 signature is blurred; please upload clear attested copy.',
          deficiencies: [
            {
              fieldOrCriteria: 'ACADEMIC_MARKSHEET',
              deficiencyCode: 'BLURRED_SIGNATURE',
              description: 'Attestation signature on final year marksheet is illegible.',
            },
          ],
        });

      expect(correctionRes.status).toBe(200);
      expect(correctionRes.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);
      expect(correctionRes.body.message).toContain('Correction requested');

      // Verify DeficiencyRecord was created
      const defRecord = await prisma.deficiencyRecord.findFirst({
        where: { applicationId: testId, deficiencyCode: 'BLURRED_SIGNATURE' },
      });
      expect(defRecord).toBeDefined();
      expect(defRecord?.status).toBe(DeficiencyStatus.OPEN);
      expect(defRecord?.raisedByOfficerId).toBe(officerId);

      // Verify Audit Trail recorded both DEFICIENCY_RAISED and OFFICER_REVIEW_SUBMITTED
      const auditLogs = await prisma.auditLog.findMany({
        where: { applicationId: testId },
      });
      const actions = auditLogs.map((l) => l.action);
      expect(actions).toContain(AuditAction.OFFICER_REVIEW_SUBMITTED);
      expect(actions).toContain(AuditAction.DEFICIENCY_RAISED);
    });

    it('should return 400 when attempting to review an application in DRAFT status', async () => {
      const draftCreate = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: { degree: 'Ph.D.' },
        });
      const draftId = draftCreate.body.data.id;
      testAppIds.push(draftId);

      const res = await request(app)
        .post(`/api/v1/scrutiny/applications/${draftId}/review`)
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          decision: 'APPROVE',
          remarks: 'Premature review',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Application cannot be reviewed from status 'DRAFT'");
    });
  });
});
