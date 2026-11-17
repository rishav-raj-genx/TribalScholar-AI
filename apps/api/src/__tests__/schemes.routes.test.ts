import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  DocumentType,
  Role,
  RuleOperator,
  RuleSeverity,
  SchemeCode,
  type SchemeRuleSet,
} from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('Schemes & Versioned Rule Engine Routes (/api/v1/schemes)', () => {
  let adminToken: string;
  let scrutinyToken: string;
  let applicantToken: string;

  let createdVersionId: string | null = null;
  let clonedVersionId: string | null = null;

  beforeAll(async () => {
    // 1. Authenticate ADMIN
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mota.gov.in', password: 'Password@123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.data?.accessToken || adminLogin.body.accessToken;

    // 2. Authenticate SCRUTINY_OFFICER
    const scrutinyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'scrutiny@mota.gov.in', password: 'Password@123' });
    expect(scrutinyLogin.status).toBe(200);
    scrutinyToken = scrutinyLogin.body.data?.accessToken || scrutinyLogin.body.accessToken;

    // 3. Authenticate APPLICANT
    const applicantLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(applicantLogin.status).toBe(200);
    applicantToken = applicantLogin.body.data?.accessToken || applicantLogin.body.accessToken;
  });

  afterAll(async () => {
    // Clean up created versions and their audit logs
    const versionIdsToClean = [createdVersionId, clonedVersionId].filter(Boolean) as string[];
    for (const vId of versionIdsToClean) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { details: { path: ['entityId'], equals: vId } },
            { details: { path: ['metadata', 'clonedFromVersionId'], equals: vId } },
          ],
        },
      });
      await prisma.schemeVersion.deleteMany({
        where: { id: vId },
      });
    }
  });

  // ============================================================================
  // 1. Public / Applicant Scheme Discovery
  // ============================================================================

  describe('GET /api/v1/schemes/active (Public Discovery)', () => {
    it('should return active schemes with latest published version without authentication', async () => {
      const res = await request(app).get('/api/v1/schemes/active');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      const nfst = res.body.data.find((s: { code: string }) => s.code === 'NFST');
      expect(nfst).toBeDefined();
      expect(nfst.isActive).toBe(true);
      expect(nfst.latestPublishedVersion).toBeDefined();
      expect(nfst.latestPublishedVersion.versionNumber).toBe(1);
      expect(nfst.latestPublishedVersion.academicYear).toBe('2026-2027');
      expect(nfst.latestPublishedVersion.incomeCeiling).toBe(600000.0);
      expect(nfst.latestPublishedVersion.isPublished).toBe(true);

      const nos = res.body.data.find((s: { code: string }) => s.code === 'NOS');
      expect(nos).toBeDefined();
      expect(nos.latestPublishedVersion).toBeDefined();
      expect(nos.latestPublishedVersion.incomeCeiling).toBe(800000.0);
    });
  });

  // ============================================================================
  // 2. Scheme Versions Queue Inspection
  // ============================================================================

  describe('GET /api/v1/schemes/:code/versions (Admin/Officer Inspection)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/schemes/NFST/versions');
      expect(res.status).toBe(401);
    });

    it('should reject APPLICANT role with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${applicantToken}`);
      expect(res.status).toBe(403);
    });

    it('should allow SCRUTINY_OFFICER to view scheme versions', async () => {
      const res = await request(app)
        .get('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].versionNumber).toBeGreaterThanOrEqual(1);
    });

    it('should allow ADMIN to view scheme versions', async () => {
      const res = await request(app)
        .get('/api/v1/schemes/NOS/versions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 400 for invalid scheme code', async () => {
      const res = await request(app)
        .get('/api/v1/schemes/INVALID_CODE/versions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // 3. Admin Scheme Version Creation & Rule DSL Validation
  // ============================================================================

  describe('POST /api/v1/schemes/:code/versions (SYSTEM_ADMIN Version Creation)', () => {
    const validEligibilityRules: SchemeRuleSet = {
      schemeCode: SchemeCode.NFST,
      academicYear: '2027-2028',
      incomeCeiling: 650000.0,
      minMarksPercentage: 55,
      requiredDocumentTypes: [
        DocumentType.AADHAAR_CARD,
        DocumentType.CASTE_CERTIFICATE,
        DocumentType.INCOME_CERTIFICATE,
      ],
      eligibilityGroups: [
        {
          id: 'nfst-v2-identity',
          name: 'Community & Identity Verification',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'nfst-v2-caste',
              field: 'applicant.casteCommunity',
              operator: RuleOperator.NOT_EQUALS,
              value: '',
              errorMessage: 'Scheduled Tribe certificate is mandatory',
              severity: RuleSeverity.BLOCKING,
            },
          ],
        },
        {
          id: 'nfst-v2-means',
          name: 'Income Ceiling Gate',
          logicalOperator: 'AND',
          conditions: [
            {
              id: 'nfst-v2-income',
              field: 'applicant.annualIncome',
              operator: RuleOperator.LESS_THAN_OR_EQUAL,
              value: 650000.0,
              errorMessage: 'Income exceeds ceiling of Rs. 6,50,000 for 2027-2028',
              severity: RuleSeverity.BLOCKING,
            },
          ],
        },
      ],
    };

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/v1/schemes/NFST/versions').send({});
      expect(res.status).toBe(401);
    });

    it('should reject non-admin (SCRUTINY_OFFICER) with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .send({});
      expect(res.status).toBe(403);
    });

    it('should reject invalid Rule DSL payload with 400 Bad Request', async () => {
      const invalidPayload = {
        academicYear: '2027-2028',
        totalSlots: 800,
        incomeCeiling: 650000,
        startDate: '2027-06-01T00:00:00.000Z',
        endDate: '2027-12-31T23:59:59.000Z',
        eligibilityRules: {
          // Invalid rules - missing required fields and groups
          schemeCode: 'INVALID_SCHEME',
        },
        documentRequirements: [],
      };

      const res = await request(app)
        .post('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should allow ADMIN to create a new SchemeVersion draft with audit logging', async () => {
      const payload = {
        academicYear: '2027-2028',
        totalSlots: 800,
        incomeCeiling: 650000.0,
        startDate: '2027-06-01T00:00:00.000Z',
        endDate: '2027-12-31T23:59:59.000Z',
        eligibilityRules: validEligibilityRules,
        documentRequirements: [
          {
            documentType: DocumentType.AADHAAR_CARD,
            label: 'Aadhaar Card',
            mandatory: true,
          },
          {
            documentType: DocumentType.CASTE_CERTIFICATE,
            label: 'Scheduled Tribe Certificate',
            mandatory: true,
          },
          {
            documentType: DocumentType.INCOME_CERTIFICATE,
            label: 'Income Certificate',
            mandatory: true,
          },
        ],
        isPublished: false,
      };

      const res = await request(app)
        .post('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.academicYear).toBe('2027-2028');
      expect(res.body.data.incomeCeiling).toBe(650000.0);
      expect(res.body.data.totalSlots).toBe(800);
      expect(res.body.data.isPublished).toBe(false); // Created as draft
      expect(res.body.data.versionNumber).toBeGreaterThanOrEqual(2);

      createdVersionId = res.body.data.id;

      // Verify immutable audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'SCHEME_RULE_MODIFIED',
          details: { path: ['entityId'], equals: createdVersionId as string },
        },
      });

      expect(auditLog).toBeDefined();
      const details = auditLog?.details as Record<string, unknown> | undefined;
      expect(details?.['actorRole']).toBe(Role.ADMIN);
    });

    it('should reject creating duplicate versionNumber with 409 Conflict', async () => {
      const duplicatePayload = {
        versionNumber: 1, // Version 1 already exists
        academicYear: '2026-2027',
        totalSlots: 750,
        incomeCeiling: 600000,
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2027-05-31T23:59:59.000Z',
        eligibilityRules: validEligibilityRules,
        documentRequirements: [{ documentType: DocumentType.AADHAAR_CARD, mandatory: true }],
      };

      const res = await request(app)
        .post('/api/v1/schemes/NFST/versions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicatePayload);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('already exists');
    });
  });

  // ============================================================================
  // 4. Publish Scheme Version
  // ============================================================================

  describe('PATCH /api/v1/schemes/versions/:versionId/publish (SYSTEM_ADMIN Publish)', () => {
    it('should reject non-admin from publishing version', async () => {
      const res = await request(app)
        .patch(`/api/v1/schemes/versions/${createdVersionId}/publish`)
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 when publishing non-existent version', async () => {
      const res = await request(app)
        .patch('/api/v1/schemes/versions/00000000-0000-0000-0000-000000000000/publish')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });

    it('should allow ADMIN to publish the draft version and record audit log', async () => {
      expect(createdVersionId).toBeDefined();

      const res = await request(app)
        .patch(`/api/v1/schemes/versions/${createdVersionId}/publish`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.isPublished).toBe(true);

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          action: 'SCHEME_RULE_MODIFIED',
          details: { path: ['entityId'], equals: createdVersionId as string },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeDefined();
      const details = auditLog?.details as Record<string, unknown> | undefined;
      expect((details?.['after'] as Record<string, unknown>)?.['isPublished']).toBe(true);

      // Verify active schemes now reflects the new latest version
      const activeRes = await request(app).get('/api/v1/schemes/active');
      const nfst = activeRes.body.data.find((s: { code: string }) => s.code === 'NFST');
      expect(nfst.latestPublishedVersion.id).toBe(createdVersionId);
      expect(nfst.latestPublishedVersion.academicYear).toBe('2027-2028');
    });
  });

  // ============================================================================
  // 5. Clone Scheme Version
  // ============================================================================

  describe('POST /api/v1/schemes/versions/:versionId/clone (SYSTEM_ADMIN Clone)', () => {
    it('should allow ADMIN to clone a version into a draft with incremented version number', async () => {
      expect(createdVersionId).toBeDefined();

      const res = await request(app)
        .post(`/api/v1/schemes/versions/${createdVersionId}/clone`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.isPublished).toBe(false); // Starts as unpublished draft
      expect(res.body.data.versionNumber).toBeGreaterThan(2);

      clonedVersionId = res.body.data.id;
    });
  });

  // ============================================================================
  // 6. Dry-Run Simulation
  // ============================================================================

  describe('POST /api/v1/schemes/versions/:versionId/simulate (Rule Dry-Run)', () => {
    it('should reject unauthenticated simulation requests with 401', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/versions/${createdVersionId}/simulate`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('should reject APPLICANT role from simulating scheme rules with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/schemes/versions/${createdVersionId}/simulate`)
        .set('Authorization', `Bearer ${applicantToken}`)
        .send({});

      expect(res.status).toBe(403);
    });

    it('should simulate PASSING candidate scenario without persisting data', async () => {
      expect(createdVersionId).toBeDefined();

      const simulationPayload = {
        applicantProfile: {
          casteCommunity: 'Santhal',
          annualIncome: 500000.0, // Under 6,50,000 ceiling
        },
        uploadedDocuments: [
          DocumentType.AADHAAR_CARD,
          DocumentType.CASTE_CERTIFICATE,
          DocumentType.INCOME_CERTIFICATE,
        ],
      };

      const res = await request(app)
        .post(`/api/v1/schemes/versions/${createdVersionId}/simulate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(simulationPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.simulationId).toBeDefined();
      expect(res.body.data.isEligible).toBe(true);
      expect(res.body.data.isDocumentComplete).toBe(true);
      expect(res.body.data.overallPassed).toBe(true);
      expect(res.body.data.deficiencies).toHaveLength(0);
    });

    it('should simulate FAILING candidate scenario and return structured deficiencies', async () => {
      expect(createdVersionId).toBeDefined();

      const simulationPayload = {
        applicantProfile: {
          casteCommunity: '', // Fails caste
          annualIncome: 700000.0, // Exceeds 6,50,000 ceiling
        },
        uploadedDocuments: [DocumentType.AADHAAR_CARD], // Missing 2 mandatory documents
      };

      const res = await request(app)
        .post(`/api/v1/schemes/versions/${createdVersionId}/simulate`)
        .set('Authorization', `Bearer ${scrutinyToken}`) // Allowed for officers too
        .send(simulationPayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.isEligible).toBe(false);
      expect(res.body.data.isDocumentComplete).toBe(false);
      expect(res.body.data.overallPassed).toBe(false);
      expect(res.body.data.blockingFailuresCount).toBeGreaterThanOrEqual(3);
      expect(res.body.data.deficiencies.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ============================================================================
  // 7. Historical Scheme Version Isolation Guarantee
  // ============================================================================

  describe('Historical Version Immutability Guarantee', () => {
    it('should keep existing application pinned to original SchemeVersionId when new versions are published', async () => {
      // 1. Fetch version 1 of NFST
      const v1 = await prisma.schemeVersion.findFirst({
        where: {
          scheme: { code: 'NFST' },
          versionNumber: 1,
        },
      });
      expect(v1).toBeDefined();

      // 2. Create sample historical application pinned to v1
      const applicant = await prisma.user.findUnique({
        where: { email: 'applicant@demo.in' },
      });
      expect(applicant).toBeDefined();

      const testApp = await prisma.application.create({
        data: {
          applicationNumber: `NFST-HISTORICAL-${Date.now()}`,
          applicantId: applicant!.id,
          schemeId: v1!.schemeId,
          schemeVersionId: v1!.id, // Pinned to v1
          formData: { applicantName: 'Birsa Munda', income: 80000 },
        },
      });

      // 3. Verify application stays on v1 even after v2 was created and published
      const reloadedApp = await prisma.application.findUnique({
        where: { id: testApp.id },
        include: { schemeVersion: true },
      });

      expect(reloadedApp?.schemeVersionId).toBe(v1!.id);
      expect(reloadedApp?.schemeVersion.versionNumber).toBe(1);
      expect(reloadedApp?.schemeVersion.incomeCeiling).toEqual(v1!.incomeCeiling);

      // Clean up test application
      await prisma.application.delete({ where: { id: testApp.id } });
    });
  });
});
