import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import {
  ApplicationStatus,
  AuditAction,
  DeficiencyStatus,
  DocumentType,
  SchemeCode,
} from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import {
  ocrClientService,
  type OcrAnalyzeDocumentRequest,
  type OcrAnalyzeDocumentResponse,
} from '../modules/ocrClient/ocrClient.service.js';

describe('Deficiency Lifecycle: Correction, Delta Re-Verification & State Transition', () => {
  let applicantToken1: string;

  let applicantToken2: string;
  let applicantId2: string;

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
    // 1. Authenticate Applicant 1 (Birsa Munda: Santhal, Rs 80,000 income, Jharkhand)
    const app1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(app1Login.status).toBe(200);
    applicantToken1 = app1Login.body.data?.accessToken || app1Login.body.accessToken;

    // 2. Register Applicant 2 (for cross-applicant security testing)
    const app2Email = `applicant_defloop_${Date.now()}@test.in`;
    const app2Register = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: app2Email,
        password: 'Password@123',
        fullName: 'Rani Kerketta',
      });
    expect(app2Register.status).toBe(201);
    applicantToken2 = app2Register.body.data?.accessToken || app2Register.body.accessToken;
    applicantId2 = app2Register.body.data?.user?.id || app2Register.body.user?.id;

    await request(app)
      .put('/api/v1/applicant/profile')
      .set('Authorization', `Bearer ${applicantToken2}`)
      .send({
        dateOfBirth: '2001-05-15',
        gender: 'FEMALE',
        casteCommunity: 'Kharia',
        fatherOrSpouseName: 'Bhanu Kerketta',
        annualIncome: 90000,
        addressLine: 'Gumla College Road',
        district: 'Gumla',
        state: 'Jharkhand',
        pincode: '835207',
      });
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
  // 1. Full Deficiency Lifecycle: Deficiency -> Re-upload -> Re-verify -> UNDER_SCRUTINY
  // ============================================================================
  describe('Full Deficiency Loop (Document Re-upload)', () => {
    it('should raise deficiency on mismatched income, allow corrected re-upload, perform delta OCR, and transition to UNDER_SCRUTINY', async () => {
      // Step A: Create Application
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {
            degree: 'Ph.D.',
            institution: 'Ranchi University',
            aadhaarVerified: true,
            academic: { pgMarksPercentage: 75.0 },
          },
        });
      expect(createRes.status).toBe(201);
      const appId = createRes.body.data.id;
      testAppIds.push(appId);

      // Upload all 8 documents initially (v1)
      for (const doc of mandatoryNfstDocs) {
        const uploadRes = await request(app)
          .post(`/api/v1/applications/${appId}/documents`)
          .set('Authorization', `Bearer ${applicantToken1}`)
          .field('docType', doc.type)
          .attach('file', doc.buf, doc.name);
        expect(uploadRes.status).toBe(201);
      }

      // Step B: Submit with initial deficiency (Income certificate says Rs 1,80,000 instead of declared 80,000)
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
                annualFamilyIncome: {
                  fieldName: 'annualFamilyIncome',
                  value: 180000,
                  status: 'Extracted',
                  confidence: 0.94,
                },
              },
              comparisons: [
                {
                  field: 'annualFamilyIncome',
                  declaredValue: 80000,
                  extractedValue: 180000,
                  isMatch: false,
                  confidence: 0.94,
                  notes: 'Declared annual income ₹80,000 does not match extracted income ₹1,80,000',
                },
              ],
              deficiencyReasons: [
                'Income mismatch: Declared annual income ₹80,000 does not match certificate ₹1,80,000',
              ],
              processedAt: new Date().toISOString(),
            };
          }

          // Other documents pass cleanly
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
              },
              category: {
                fieldName: 'category',
                value: 'Santhal (Scheduled Tribe - ST)',
                status: 'Extracted',
                confidence: 0.96,
              },
              stateDomicile: {
                fieldName: 'stateDomicile',
                value: 'Jharkhand',
                status: 'Extracted',
                confidence: 0.95,
              },
              percentageMarks: {
                fieldName: 'percentageMarks',
                value: 75.0,
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

      const submitRes = await request(app)
        .post(`/api/v1/applications/${appId}/submit`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);

      // Verify DeficiencyRecord was created
      const deficiencies = await prisma.deficiencyRecord.findMany({
        where: { applicationId: appId },
      });
      expect(deficiencies.length).toBeGreaterThanOrEqual(1);
      const openDeficiency = deficiencies.find((d) => d.status === DeficiencyStatus.OPEN);
      expect(openDeficiency).toBeDefined();
      expect(openDeficiency?.isResolved).toBe(false);

      // Step C: Applicant uploads corrected Income Certificate (version 2)
      const reuploadRes = await request(app)
        .post(`/api/v1/applications/${appId}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'INCOME_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'income_cert_corrected_v2.pdf');

      expect(reuploadRes.status).toBe(201);
      expect(reuploadRes.body.data.version).toBe(2);
      expect(reuploadRes.body.data.isCurrent).toBe(true);

      // Verify version 1 is now marked isCurrent = false
      const v1Doc = await prisma.applicationDocument.findFirst({
        where: { applicationId: appId, documentType: DocumentType.INCOME_CERTIFICATE, version: 1 },
      });
      expect(v1Doc?.isCurrent).toBe(false);

      // Step D: Re-run delta verification via POST /api/v1/applications/:id/resolve
      // Mock OCR Service response for the new corrected Income Certificate (version 2)
      let ocrCallCount = 0;
      const analyzedDocTypes: string[] = [];

      vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
        async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
          ocrCallCount++;
          analyzedDocTypes.push(req.expectedType);

          return {
            success: true,
            documentId: req.documentId,
            documentType: req.expectedType,
            status: 'VERIFIED',
            overallConfidence: 0.97,
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
                confidence: 0.97,
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
                confidence: 0.98,
                evidence: {
                  page: 1,
                  fieldLabel: 'Annual Income',
                  bbox: { x: 10, y: 50, width: 200, height: 20 },
                  rawSnippet: 'Annual Income is Rs 80,000 per annum',
                  evidenceString: 'page 1 · income field',
                },
              },
            },
            comparisons: [
              {
                field: 'annualFamilyIncome',
                declaredValue: 80000,
                extractedValue: 80000,
                isMatch: true,
                confidence: 0.98,
              },
            ],
            deficiencyReasons: [],
            processedAt: new Date().toISOString(),
          };
        }
      );

      const resolveRes = await request(app)
        .post(`/api/v1/applications/${appId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          resolutionNote: 'Uploaded corrected revenue certificate with verified ₹80,000 annual income',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
      expect(resolveRes.body.message).toContain('Deficiencies resolved successfully');

      // Verify Delta OCR behavior: Only the newly uploaded Income Certificate v2 was dispatched to OCR
      expect(ocrCallCount).toBe(1);
      expect(analyzedDocTypes).toEqual([DocumentType.INCOME_CERTIFICATE]);

      // Step E: Verify DeficiencyRecord in DB is marked resolved
      const resolvedDeficiency = await prisma.deficiencyRecord.findUnique({
        where: { id: openDeficiency!.id },
      });
      expect(resolvedDeficiency?.status).toBe(DeficiencyStatus.RESOLVED);
      expect(resolvedDeficiency?.isResolved).toBe(true);
      expect(resolvedDeficiency?.resolvedAt).toBeInstanceOf(Date);
      expect(resolvedDeficiency?.resolutionNote).toContain('Uploaded corrected revenue certificate');

      // Step F: Verify Audit Trail recorded all actions
      const auditLogs = await prisma.auditLog.findMany({
        where: { applicationId: appId },
        orderBy: { timestamp: 'asc' },
      });

      const auditActions = auditLogs.map((log) => log.action);
      expect(auditActions).toContain(AuditAction.APPLICATION_CREATED);
      expect(auditActions).toContain(AuditAction.DEFICIENCY_RAISED);
      expect(auditActions).toContain(AuditAction.DOCUMENT_UPLOADED);
      expect(auditActions).toContain(AuditAction.DEFICIENCY_RESOLVED);
      expect(auditActions).toContain(AuditAction.OCR_PROCESSED);
      expect(auditActions).toContain(AuditAction.RULE_EVALUATED);
      expect(auditActions).toContain(AuditAction.APPLICATION_SUBMITTED);

      // Verify the final status in audit log
      const finalSubmissionLog = auditLogs
        .filter((l) => l.action === AuditAction.APPLICATION_SUBMITTED)
        .pop();
      expect(finalSubmissionLog?.newState).toBe(ApplicationStatus.UNDER_SCRUTINY);
    });

    it('should resolve deficiency when applicant updates mismatched form data and triggers re-verification without document re-upload', async () => {
      // Step A: Create Application
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {
            degree: 'Ph.D.',
            institution: 'Ranchi University',
            aadhaarVerified: true,
            declaredAnnualIncome: 150000, // declared mismatch
            academic: { pgMarksPercentage: 75.0 },
          },
        });
      expect(createRes.status).toBe(201);
      const appId = createRes.body.data.id;
      testAppIds.push(appId);

      // Upload all 8 documents
      for (const doc of mandatoryNfstDocs) {
        await request(app)
          .post(`/api/v1/applications/${appId}/documents`)
          .set('Authorization', `Bearer ${applicantToken1}`)
          .field('docType', doc.type)
          .attach('file', doc.buf, doc.name);
      }

      // Initial submission flags deficiency because certificate is flagged deficient
      vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
        async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
          if (req.expectedType === DocumentType.INCOME_CERTIFICATE) {
            return {
              success: true,
              documentId: req.documentId,
              documentType: req.expectedType,
              status: 'DEFICIENT',
              overallConfidence: 0.93,
              classification: {
                predictedType: req.expectedType,
                confidence: 0.95,
                isMatch: true,
              },
              extractedFields: {
                applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.95 },
                annualFamilyIncome: { fieldName: 'annualFamilyIncome', value: 80000, status: 'Extracted', confidence: 0.96 },
              },
              comparisons: [],
              deficiencyReasons: ['Form declared income does not match verified certificate income'],
              processedAt: new Date().toISOString(),
            };
          }

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
              applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.95 },
              category: { fieldName: 'category', value: 'Santhal (Scheduled Tribe - ST)', status: 'Extracted', confidence: 0.96 },
              stateDomicile: { fieldName: 'stateDomicile', value: 'Jharkhand', status: 'Extracted', confidence: 0.95 },
              percentageMarks: { fieldName: 'percentageMarks', value: 75.0, status: 'Extracted', confidence: 0.95 },
            },
            comparisons: [],
            deficiencyReasons: [],
            processedAt: new Date().toISOString(),
          };
        }
      );

      const submitRes = await request(app)
        .post(`/api/v1/applications/${appId}/submit`)
        .set('Authorization', `Bearer ${applicantToken1}`);
      expect(submitRes.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);

      // Applicant corrects form data via PATCH /api/v1/applications/:id/form
      const formUpdateRes = await request(app)
        .patch(`/api/v1/applications/${appId}/form`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          formData: {
            declaredAnnualIncome: 80000,
          },
        });
      expect(formUpdateRes.status).toBe(200);

      // Re-verification with clean mock for FLAGGED_DEFICIENT document re-check
      vi.spyOn(ocrClientService, 'analyzeDocument').mockResolvedValue({
        success: true,
        documentId: 'doc-id',
        documentType: DocumentType.INCOME_CERTIFICATE,
        status: 'VERIFIED',
        overallConfidence: 0.97,
        classification: {
          predictedType: DocumentType.INCOME_CERTIFICATE,
          confidence: 0.98,
          isMatch: true,
        },
        extractedFields: {
          applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.97 },
          annualFamilyIncome: { fieldName: 'annualFamilyIncome', value: 80000, status: 'Extracted', confidence: 0.98 },
        },
        comparisons: [],
        deficiencyReasons: [],
        processedAt: new Date().toISOString(),
      });

      const resolveRes = await request(app)
        .post(`/api/v1/applications/${appId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          resolutionNote: 'Updated declared form data to align with revenue record',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
    });
  });

  // ============================================================================
  // 2. Unresolved Deficiencies: Re-verification keeps DEFICIENCY_RAISED if issues remain
  // ============================================================================
  describe('Failed Resolution Re-check', () => {
    it('should keep DEFICIENCY_RAISED status and re-flag deficiency if re-uploaded document is still non-compliant', async () => {
      // Create Application
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {
            degree: 'Ph.D.',
            institution: 'Ranchi University',
            aadhaarVerified: true,
            academic: { pgMarksPercentage: 75.0 },
          },
        });
      const appId = createRes.body.data.id;
      testAppIds.push(appId);

      for (const doc of mandatoryNfstDocs) {
        await request(app)
          .post(`/api/v1/applications/${appId}/documents`)
          .set('Authorization', `Bearer ${applicantToken1}`)
          .field('docType', doc.type)
          .attach('file', doc.buf, doc.name);
      }

      // Initial submit with deficient Income Certificate
      vi.spyOn(ocrClientService, 'analyzeDocument').mockResolvedValue({
        success: true,
        documentId: 'doc-id',
        documentType: DocumentType.INCOME_CERTIFICATE,
        status: 'DEFICIENT',
        overallConfidence: 0.90,
        classification: {
          predictedType: DocumentType.INCOME_CERTIFICATE,
          confidence: 0.95,
          isMatch: true,
        },
        extractedFields: {
          applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.95 },
          annualFamilyIncome: { fieldName: 'annualFamilyIncome', value: 250000, status: 'Extracted', confidence: 0.95 },
        },
        comparisons: [],
        deficiencyReasons: ['Income mismatch: Declared 80000 vs certificate 250000'],
        processedAt: new Date().toISOString(),
      });

      const initialSubmit = await request(app)
        .post(`/api/v1/applications/${appId}/submit`)
        .set('Authorization', `Bearer ${applicantToken1}`);
      expect(initialSubmit.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);

      // Applicant re-uploads another document, but it STILL fails OCR check (e.g. income is 200,000)
      await request(app)
        .post(`/api/v1/applications/${appId}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'INCOME_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'income_cert_v2_still_wrong.pdf');

      vi.spyOn(ocrClientService, 'analyzeDocument').mockResolvedValue({
        success: true,
        documentId: 'doc-id-v2',
        documentType: DocumentType.INCOME_CERTIFICATE,
        status: 'DEFICIENT',
        overallConfidence: 0.92,
        classification: {
          predictedType: DocumentType.INCOME_CERTIFICATE,
          confidence: 0.95,
          isMatch: true,
        },
        extractedFields: {
          applicantName: { fieldName: 'applicantName', value: 'Birsa Munda', status: 'Extracted', confidence: 0.95 },
          annualFamilyIncome: { fieldName: 'annualFamilyIncome', value: 200000, status: 'Extracted', confidence: 0.95 },
        },
        comparisons: [],
        deficiencyReasons: ['Income still exceeds declared value: certificate says 200000'],
        processedAt: new Date().toISOString(),
      });

      const resolveRes = await request(app)
        .post(`/api/v1/applications/${appId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          resolutionNote: 'Attempted re-upload',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);
      expect(resolveRes.body.message).toContain('Unresolved deficiencies remain');

      // Verify that open deficiency exists
      const remainingDefs = await prisma.deficiencyRecord.findMany({
        where: { applicationId: appId, status: DeficiencyStatus.OPEN },
      });
      expect(remainingDefs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // 3. Security, Ownership & Status Guards
  // ============================================================================
  describe('Authorization & Status Guards', () => {
    it('should return 401 when unauthenticated', async () => {
      const res = await request(app).post('/api/v1/applications/some-fake-id/resolve');
      expect(res.status).toBe(401);
    });

    it('should return 404 when application ID does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/v1/applications/${fakeId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken1}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    it('should return 403 when another applicant tries to resolve this application', async () => {
      // Create application owned by applicant 1
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: { degree: 'Ph.D.', institution: 'Ranchi University' },
        });
      const appId = createRes.body.data.id;
      testAppIds.push(appId);

      // Applicant 2 attempts to resolve Applicant 1's application
      const res = await request(app)
        .post(`/api/v1/applications/${appId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken2}`)
        .send({ resolutionNote: 'Unauthorized attempt' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('permission');
    });

    it('should return 400 when attempting to resolve an application still in DRAFT status', async () => {
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: { degree: 'Ph.D.', institution: 'Ranchi University' },
        });
      const appId = createRes.body.data.id;
      testAppIds.push(appId);

      const res = await request(app)
        .post(`/api/v1/applications/${appId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({ resolutionNote: 'Resolving from draft' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Application cannot be resolved from status 'DRAFT'");
    });

    it('should return 400 when attempting to resolve an application already UNDER_SCRUTINY', async () => {
      // Create and set directly to UNDER_SCRUTINY
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: { degree: 'Ph.D.', institution: 'Ranchi University' },
        });
      const appId = createRes.body.data.id;
      testAppIds.push(appId);

      await prisma.application.update({
        where: { id: appId },
        data: { status: ApplicationStatus.UNDER_SCRUTINY },
      });

      const res = await request(app)
        .post(`/api/v1/applications/${appId}/resolve`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({ resolutionNote: 'Resolving already under scrutiny' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Application cannot be resolved from status 'UNDER_SCRUTINY'");
    });
  });
});
