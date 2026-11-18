import { describe, expect, it, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import {
  ApplicationStatus,
  AuditAction,
  PostSelectionStatus,
  ReviewDecision,
  SchemeCode,
} from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import {
  ocrClientService,
  type OcrAnalyzeDocumentRequest,
  type OcrAnalyzeDocumentResponse,
} from '../modules/ocrClient/ocrClient.service.js';

describe('Selection Officer Workspace & Post-Selection APIs (/api/v1/selection)', () => {
  let selectionToken: string;

  let scrutinyToken: string;
  let adminToken: string;
  let applicantToken: string;

  let approvedAppId: string;
  let rejectedAppId: string;
  let draftAppId: string;

  const testAppIds: string[] = [];

  const samplePdfBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'),
    Buffer.from(' - TribalScholar AI Sample Certificate Document for Selection Test'),
  ]);

  const mandatoryNfstDocs = [
    { type: 'AADHAAR_CARD', buf: samplePdfBuffer, name: 'aadhaar.pdf' },
    { type: 'ST_CASTE_CERTIFICATE', buf: samplePdfBuffer, name: 'caste_cert.pdf' },
    { type: 'INCOME_CERTIFICATE', buf: samplePdfBuffer, name: 'income_cert.pdf' },
    { type: 'ACADEMIC_MARKSHEET', buf: samplePdfBuffer, name: 'marksheet_pg.pdf' },
    { type: 'ADMISSION_OFFER_LETTER', buf: samplePdfBuffer, name: 'admission_letter.pdf' },
    { type: 'BONAFIDE_CERTIFICATE', buf: samplePdfBuffer, name: 'bonafide.pdf' },
    { type: 'BANK_PASSBOOK', buf: samplePdfBuffer, name: 'passbook.pdf' },
    { type: 'SYNOPSIS_RESEARCH_PROPOSAL', buf: samplePdfBuffer, name: 'proposal.pdf' },
  ];

  function mockOcrPassing() {
    vi.spyOn(ocrClientService, 'analyzeDocument').mockImplementation(
      async (req: OcrAnalyzeDocumentRequest): Promise<OcrAnalyzeDocumentResponse> => {
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
  }

  beforeAll(async () => {
    // 1. Authenticate SELECTION_OFFICER (Shri Rajeshwar Meena)
    const selectionLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'selection@mota.gov.in', password: 'Password@123' });
    expect(selectionLogin.status).toBe(200);
    selectionToken = selectionLogin.body.data?.accessToken || selectionLogin.body.accessToken;

    // 2. Authenticate SCRUTINY_OFFICER (Dr. Sunita Toppo)
    const scrutinyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'scrutiny@mota.gov.in', password: 'Password@123' });
    expect(scrutinyLogin.status).toBe(200);
    scrutinyToken = scrutinyLogin.body.data?.accessToken || scrutinyLogin.body.accessToken;

    // 3. Authenticate ADMIN
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mota.gov.in', password: 'Password@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data?.accessToken || adminLogin.body.accessToken;

    // 4. Authenticate APPLICANT (Birsa Munda)
    const appLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(appLogin.status).toBe(200);
    applicantToken = appLogin.body.data?.accessToken || appLogin.body.accessToken;

    // 5. Create Draft Application (for status guard tests)
    const draftRes = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: { degree: 'Ph.D.', institution: 'Ranchi University' },
      });
    expect(draftRes.status).toBe(201);
    draftAppId = draftRes.body.data.id;
    testAppIds.push(draftAppId);

    // 6. Create, upload docs, submit, and scrutiny-approve Application 1 (for selection happy path)
    const app1Create = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: {
          degree: 'Ph.D.',
          institution: 'Ranchi University',
          aadhaarVerified: true,
          academic: { pgMarksPercentage: 82.5 },
        },
      });
    expect(app1Create.status).toBe(201);
    approvedAppId = app1Create.body.data.id;
    testAppIds.push(approvedAppId);

    for (const doc of mandatoryNfstDocs) {
      await request(app)
        .post(`/api/v1/applications/${approvedAppId}/documents`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('docType', doc.type)
        .attach('file', doc.buf, doc.name);
    }

    mockOcrPassing();

    const submit1 = await request(app)
      .post(`/api/v1/applications/${approvedAppId}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(submit1.status).toBe(200);
    expect(submit1.body.data.status).toBe(ApplicationStatus.UNDER_SCRUTINY);

    // Scrutiny Officer approves Application 1 -> SCRUTINY_APPROVED
    const scrutinyApprove1 = await request(app)
      .post(`/api/v1/scrutiny/applications/${approvedAppId}/review`)
      .set('Authorization', `Bearer ${scrutinyToken}`)
      .send({
        decision: 'APPROVE',
        remarks: 'All documents verified and consistent with MoTA criteria. Cleared for Selection Committee.',
        checklistResults: { identityVerified: true, incomeVerified: true },
      });
    expect(scrutinyApprove1.status).toBe(200);
    expect(scrutinyApprove1.body.data.status).toBe(ApplicationStatus.SCRUTINY_APPROVED);

    // 7. Create, upload docs, submit, and scrutiny-approve Application 2 (for rejection path)
    const app2Create = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: {
          degree: 'Ph.D.',
          institution: 'Ranchi University',
          aadhaarVerified: true,
          academic: { pgMarksPercentage: 68.0 },
        },
      });
    expect(app2Create.status).toBe(201);
    rejectedAppId = app2Create.body.data.id;
    testAppIds.push(rejectedAppId);

    for (const doc of mandatoryNfstDocs) {
      await request(app)
        .post(`/api/v1/applications/${rejectedAppId}/documents`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .field('docType', doc.type)
        .attach('file', doc.buf, doc.name);
    }

    mockOcrPassing();

    const submit2 = await request(app)
      .post(`/api/v1/applications/${rejectedAppId}/submit`)
      .set('Authorization', `Bearer ${applicantToken}`);
    expect(submit2.status).toBe(200);

    const scrutinyApprove2 = await request(app)
      .post(`/api/v1/scrutiny/applications/${rejectedAppId}/review`)
      .set('Authorization', `Bearer ${scrutinyToken}`)
      .send({
        decision: 'APPROVE',
        remarks: 'Eligibility verified.',
      });
    expect(scrutinyApprove2.status).toBe(200);
    expect(scrutinyApprove2.body.data.status).toBe(ApplicationStatus.SCRUTINY_APPROVED);
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
      await prisma.postSelectionRecord.deleteMany({
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
  // Suite 1: Selection Committee Final Award Decision (POST /decide)
  // ============================================================================
  describe('Selection Committee Final Award Decision (POST /api/v1/selection/applications/:id/decide)', () => {
    it('should reject final selection decision if application is still in DRAFT status', async () => {
      const res = await request(app)
        .post(`/api/v1/selection/applications/${draftAppId}/decide`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          decision: 'SELECTED',
          remarks: 'Premature selection attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/SCRUTINY_APPROVED/i);
    });

    it('should reject with 404 if application ID does not exist', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/v1/selection/applications/${fakeId}/decide`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          decision: 'SELECTED',
          remarks: 'Application not found',
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should reject with 400 if remarks are missing or payload is invalid', async () => {
      const res = await request(app)
        .post(`/api/v1/selection/applications/${approvedAppId}/decide`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          decision: 'SELECTED',
          // remarks missing
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid selection decision payload/i);
    });

    it('should successfully record SELECTED decision, transition application to PROVISIONALLY_SELECTED, and create PostSelectionRecord with sanction order and award letter', async () => {
      const res = await request(app)
        .post(`/api/v1/selection/applications/${approvedAppId}/decide`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          decision: 'SELECTED',
          remarks: 'Selected for National Fellowship for ST (NFST) 2026-27 cohort under Merit Quota.',
          sanctionedAmount: 350000.0,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.decision).toBe('SELECTED');
      expect(res.body.data.status).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);

      const postSelection = res.body.data.postSelection;
      expect(postSelection).toBeDefined();
      expect(postSelection.status).toBe(PostSelectionStatus.AWARD_LETTER_ISSUED);
      expect(postSelection.sanctionOrderNumber).toMatch(/^SANCTION-MOTA-NFST-/);
      expect(postSelection.sanctionedAmount).toBe(350000);
      expect(postSelection.awardLetterUrl).toMatch(/\.pdf$/);
      expect(postSelection.joiningReportSubmitted).toBe(false);

      // Verify Application state in DB
      const dbApp = await prisma.application.findUnique({
        where: { id: approvedAppId },
        include: { postSelection: true, reviews: true },
      });
      expect(dbApp?.status).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);
      expect(dbApp?.postSelection?.status).toBe(PostSelectionStatus.AWARD_LETTER_ISSUED);
      expect(dbApp?.reviews.some((r) => r.decision === ReviewDecision.RECOMMENDED_FOR_SELECTION)).toBe(true);

      // Verify AuditLog entry for SELECTION_DECISION_RECORDED
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: approvedAppId,
          action: AuditAction.SELECTION_DECISION_RECORDED,
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.newState).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);
      expect(JSON.stringify(auditLog?.details)).toMatch(/SANCTION-MOTA-NFST-/);
    });

    it('should successfully record REJECTED decision on a scrutiny-approved application, transitioning status to REJECTED without PostSelectionRecord', async () => {
      const res = await request(app)
        .post(`/api/v1/selection/applications/${rejectedAppId}/decide`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          decision: 'REJECTED',
          remarks: 'Cut-off score not met for current academic session quota.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.decision).toBe('REJECTED');
      expect(res.body.data.status).toBe(ApplicationStatus.REJECTED);
      expect(res.body.data.postSelection).toBeNull();

      const dbApp = await prisma.application.findUnique({
        where: { id: rejectedAppId },
        include: { postSelection: true, reviews: true },
      });
      expect(dbApp?.status).toBe(ApplicationStatus.REJECTED);
      expect(dbApp?.postSelection).toBeNull();
      expect(dbApp?.reviews.some((r) => r.decision === ReviewDecision.REJECTED)).toBe(true);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: rejectedAppId,
          action: AuditAction.SELECTION_DECISION_RECORDED,
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.newState).toBe(ApplicationStatus.REJECTED);
    });
  });

  // ============================================================================
  // Suite 2: Post-Selection Lifecycle & DBT Disbursement (PATCH /post-selection)
  // ============================================================================
  describe('Post-Selection Verification & DBT Disbursement (PATCH /api/v1/selection/applications/:id/post-selection)', () => {
    it('should reject DBT disbursement trigger if institutional verification (joining report) has not been submitted', async () => {
      const res = await request(app)
        .patch(`/api/v1/selection/applications/${approvedAppId}/post-selection`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          triggerDisbursement: true,
          disbursementAmount: 87500,
          installmentNumber: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/joining report.*must be submitted/i);
    });

    it('should reject post-selection updates on an application without a post-selection record (e.g. rejected app)', async () => {
      const res = await request(app)
        .patch(`/api/v1/selection/applications/${rejectedAppId}/post-selection`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          institutionalVerification: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/does not have a post-selection record/i);
    });

    it('should successfully toggle institutional verification, updating PostSelectionRecord status to JOINING_REPORT_SUBMITTED', async () => {
      const joiningDate = '2026-08-01T09:00:00.000Z';
      const res = await request(app)
        .patch(`/api/v1/selection/applications/${approvedAppId}/post-selection`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          institutionalVerification: true,
          joiningDate,
          remarks: 'Institutional Joining Report verified by Ranchi University Registrar.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.postSelectionStatus).toBe(PostSelectionStatus.JOINING_REPORT_SUBMITTED);
      expect(res.body.data.joiningReportSubmitted).toBe(true);
      expect(new Date(res.body.data.joiningDate).toISOString()).toBe(joiningDate);
      expect(res.body.data.disbursementTriggered).toBe(false);

      const postRec = await prisma.postSelectionRecord.findUnique({
        where: { applicationId: approvedAppId },
      });
      expect(postRec?.status).toBe(PostSelectionStatus.JOINING_REPORT_SUBMITTED);
      expect(postRec?.joiningReportSubmitted).toBe(true);
      expect(postRec?.joiningDate).toBeDefined();

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: approvedAppId,
          action: AuditAction.APPLICATION_UPDATED,
          newState: PostSelectionStatus.JOINING_REPORT_SUBMITTED,
        },
      });
      expect(auditLog).toBeDefined();
    });

    it('should trigger simulated DBT disbursement via mockDbtAdapter, moving status to DISBURSEMENT_ACTIVE with tracking and PFMS reference', async () => {
      const res = await request(app)
        .patch(`/api/v1/selection/applications/${approvedAppId}/post-selection`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          triggerDisbursement: true,
          disbursementAmount: 87500.0,
          installmentNumber: 1,
          remarks: 'Disbursing 1st fellowship installment Q1 2026-27.',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.postSelectionStatus).toBe(PostSelectionStatus.DISBURSEMENT_ACTIVE);
      expect(res.body.data.disbursementTriggered).toBe(true);

      const dbtResult = res.body.data.dbtResult;
      expect(dbtResult).toBeDefined();
      expect(dbtResult.isSimulatedMock).toBe(true);
      expect(dbtResult.status).toBe('INITIATED');
      expect(dbtResult.amount).toBe(87500.0);
      expect(dbtResult.pfmsReference).toMatch(/^PFMS-ORD-/);
      expect(dbtResult.trackingId).toMatch(/^DBT-TRK-/);

      // Verify DB record
      const postRec = await prisma.postSelectionRecord.findUnique({
        where: { applicationId: approvedAppId },
      });
      expect(postRec?.status).toBe(PostSelectionStatus.DISBURSEMENT_ACTIVE);
      const details = postRec?.disbursementDetails as Record<string, unknown>;
      expect(details).toBeDefined();
      expect(details.lastTrigger).toBeDefined();
      expect(Array.isArray(details.disbursements)).toBe(true);

      // Verify AuditLog contains disbursement details
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: approvedAppId,
          action: AuditAction.APPLICATION_UPDATED,
          newState: PostSelectionStatus.DISBURSEMENT_ACTIVE,
        },
      });
      expect(auditLog).toBeDefined();
      expect(JSON.stringify(auditLog?.details)).toMatch(/disbursementTriggered":true/);
    });

    it('should support combined institutional verification and DBT disbursement in a single request', async () => {
      // Create a 3rd application to test combined payload
      const app3Create = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {
            degree: 'Ph.D.',
            institution: 'JNU New Delhi',
            aadhaarVerified: true,
            academic: { pgMarksPercentage: 80.0 },
          },
        });
      expect(app3Create.status).toBe(201);
      const app3Id = app3Create.body.data.id;
      testAppIds.push(app3Id);

      for (const doc of mandatoryNfstDocs) {
        await request(app)
          .post(`/api/v1/applications/${app3Id}/documents`)
          .set('Authorization', `Bearer ${applicantToken}`)
          .field('docType', doc.type)
          .attach('file', doc.buf, doc.name);
      }

      mockOcrPassing();

      const subRes = await request(app)
        .post(`/api/v1/applications/${app3Id}/submit`)
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(subRes.status).toBe(200);
      expect(subRes.body.data.status).toBe(ApplicationStatus.UNDER_SCRUTINY);

      const scrutRes = await request(app)
        .post(`/api/v1/scrutiny/applications/${app3Id}/review`)
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .send({ decision: 'APPROVE', remarks: 'Eligible scholar' });
      expect(scrutRes.status).toBe(200);
      expect(scrutRes.body.data.status).toBe(ApplicationStatus.SCRUTINY_APPROVED);

      const selRes = await request(app)
        .post(`/api/v1/selection/applications/${app3Id}/decide`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({ decision: 'SELECTED', remarks: 'Selected on merit' });
      expect(selRes.status).toBe(200);

      // Trigger combined verification & DBT disbursement
      const combinedRes = await request(app)
        .patch(`/api/v1/selection/applications/${app3Id}/post-selection`)
        .set('Authorization', `Bearer ${selectionToken}`)
        .send({
          institutionalVerification: true,
          joiningDate: '2026-08-15T00:00:00.000Z',
          triggerDisbursement: true,
          disbursementAmount: 87500.0,
          installmentNumber: 1,
          remarks: 'Simultaneous joining verification & DBT trigger',
        });

      expect(combinedRes.status).toBe(200);
      expect(combinedRes.body.data.postSelectionStatus).toBe(PostSelectionStatus.DISBURSEMENT_ACTIVE);
      expect(combinedRes.body.data.joiningReportSubmitted).toBe(true);
      expect(combinedRes.body.data.disbursementTriggered).toBe(true);
      expect(combinedRes.body.data.dbtResult.pfmsReference).toBeDefined();
    });
  });

  // ============================================================================
  // Suite 3: Post-Selection Details & Live DBT Status (GET /applications/:id)
  // ============================================================================
  describe('Post-Selection Details & Status Inspection (GET /api/v1/selection/applications/:id)', () => {
    it('should return complete post-selection package with live simulated PFMS disbursement status', async () => {
      const res = await request(app)
        .get(`/api/v1/selection/applications/${approvedAppId}`)
        .set('Authorization', `Bearer ${selectionToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');

      const data = res.body.data;
      expect(data.application.id).toBe(approvedAppId);
      expect(data.application.status).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);
      expect(data.applicant.fullName).toBe('Birsa Munda');
      expect(data.scheme.code).toBe(SchemeCode.NFST);

      // Post-Selection details
      expect(data.postSelection).toBeDefined();
      expect(data.postSelection.status).toBe(PostSelectionStatus.DISBURSEMENT_ACTIVE);
      expect(data.postSelection.sanctionOrderNumber).toMatch(/^SANCTION-MOTA-NFST-/);
      expect(data.postSelection.joiningReportSubmitted).toBe(true);

      // Live DBT status from MockDbtAdapter
      expect(data.liveDbtStatus).toBeDefined();
      expect(data.liveDbtStatus.isSimulatedMock).toBe(true);
      expect(data.liveDbtStatus.totalSanctionedAmount).toBe(350000.0);
      expect(Array.isArray(data.liveDbtStatus.disbursements)).toBe(true);

      // Reviews
      expect(Array.isArray(data.reviews)).toBe(true);
      expect(data.reviews.length).toBeGreaterThanOrEqual(2); // Scrutiny Review + Selection Review
    });

    it('should return 404 for non-existent application', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/v1/selection/applications/${fakeId}`)
        .set('Authorization', `Bearer ${selectionToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ============================================================================
  // Suite 4: Selection Committee Queue Inspection (GET /queue)
  // ============================================================================
  describe('Selection Committee Queue Inspection (GET /api/v1/selection/queue)', () => {
    it('should return paginated list of applications eligible for selection or decided', async () => {
      const res = await request(app)
        .get('/api/v1/selection/queue')
        .set('Authorization', `Bearer ${selectionToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(1);

      const item = res.body.data.items.find((i: { id: string }) => i.id === approvedAppId);
      expect(item).toBeDefined();
      expect(item.status).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);
      expect(item.postSelectionStatus).toBe(PostSelectionStatus.DISBURSEMENT_ACTIVE);
      expect(item.sanctionOrderNumber).toMatch(/^SANCTION-MOTA-NFST-/);
    });

    it('should support filtering queue by schemeCode and status', async () => {
      const res = await request(app)
        .get('/api/v1/selection/queue?schemeCode=NFST&status=PROVISIONALLY_SELECTED')
        .set('Authorization', `Bearer ${selectionToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      const items = res.body.data.items;
      expect(items.every((i: { schemeCode: string; status: string }) => i.schemeCode === 'NFST' && i.status === 'PROVISIONALLY_SELECTED')).toBe(true);
    });
  });

  // ============================================================================
  // Suite 5: RBAC & Security Enforcement
  // ============================================================================
  describe('RBAC & Security Enforcement on Selection Endpoints', () => {
    it('should reject unauthenticated requests with 401 Unauthorized', async () => {
      const res1 = await request(app).get('/api/v1/selection/queue');
      expect(res1.status).toBe(401);

      const res2 = await request(app)
        .post(`/api/v1/selection/applications/${approvedAppId}/decide`)
        .send({ decision: 'SELECTED', remarks: 'No token' });
      expect(res2.status).toBe(401);

      const res3 = await request(app)
        .patch(`/api/v1/selection/applications/${approvedAppId}/post-selection`)
        .send({ institutionalVerification: true });
      expect(res3.status).toBe(401);
    });

    it('should reject APPLICANT role with 403 Forbidden', async () => {
      const res1 = await request(app)
        .get('/api/v1/selection/queue')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .post(`/api/v1/selection/applications/${approvedAppId}/decide`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ decision: 'SELECTED', remarks: 'Applicant attempting decision' });
      expect(res2.status).toBe(403);

      const res3 = await request(app)
        .patch(`/api/v1/selection/applications/${approvedAppId}/post-selection`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({ institutionalVerification: true });
      expect(res3.status).toBe(403);
    });

    it('should reject SCRUTINY_OFFICER role with 403 Forbidden (strict separation of duties)', async () => {
      const res1 = await request(app)
        .get('/api/v1/selection/queue')
        .set('Authorization', `Bearer ${scrutinyToken}`);
      expect(res1.status).toBe(403);

      const res2 = await request(app)
        .post(`/api/v1/selection/applications/${approvedAppId}/decide`)
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .send({ decision: 'SELECTED', remarks: 'Scrutiny officer attempting selection' });
      expect(res2.status).toBe(403);

      const res3 = await request(app)
        .patch(`/api/v1/selection/applications/${approvedAppId}/post-selection`)
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .send({ institutionalVerification: true });
      expect(res3.status).toBe(403);
    });

    it('should allow ADMIN role full access to Selection APIs', async () => {
      const resQueue = await request(app)
        .get('/api/v1/selection/queue')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resQueue.status).toBe(200);

      const resDetails = await request(app)
        .get(`/api/v1/selection/applications/${approvedAppId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resDetails.status).toBe(200);
    });
  });

  // ============================================================================
  // Suite 6: Full Lifecycle End-to-End Audit Verification
  // ============================================================================
  describe('Full Lifecycle End-to-End Audit Verification', () => {
    it('should have an unbroken, chronological immutable audit trail from DRAFT to DISBURSEMENT_ACTIVE', async () => {
      const auditRes = await request(app)
        .get(`/api/v1/audit/Application/${approvedAppId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(auditRes.status).toBe(200);
      expect(auditRes.body.status).toBe('success');

      const logs: Array<{ action: string; newState?: string; details?: unknown }> =
        auditRes.body.data;
      expect(logs.length).toBeGreaterThanOrEqual(5);

      const actions = logs.map((l) => l.action);

      // Verify the full lifecycle was recorded in the audit trail:
      expect(actions).toContain(AuditAction.APPLICATION_CREATED);
      expect(actions).toContain(AuditAction.DOCUMENT_UPLOADED);
      expect(actions).toContain(AuditAction.APPLICATION_SUBMITTED);
      expect(actions).toContain(AuditAction.OFFICER_REVIEW_SUBMITTED);
      expect(actions).toContain(AuditAction.SELECTION_DECISION_RECORDED);
      expect(actions).toContain(AuditAction.APPLICATION_UPDATED);

      // Verify specific selection and disbursement audit entries
      const selectionLog = logs.find((l) => l.action === AuditAction.SELECTION_DECISION_RECORDED);
      expect(selectionLog).toBeDefined();
      expect(selectionLog?.newState).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);

      const disbursementLog = logs.find(
        (l) => l.action === AuditAction.APPLICATION_UPDATED && l.newState === PostSelectionStatus.DISBURSEMENT_ACTIVE
      );
      expect(disbursementLog).toBeDefined();
    });
  });
});
