import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ApplicationStatus, SchemeCode } from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('Applicant Intake & Application Draft Management API', () => {
  let applicantToken1: string;
  let applicantId1: string;

  let applicantToken2: string;
  let applicantId2: string;

  let scrutinyToken: string;

  let createdAppId1: string;
  let createdAppId2: string;

  const testAppIds: string[] = [];

  beforeAll(async () => {
    // 1. Authenticate Applicant 1 (Seeded applicant: applicant@demo.in)
    const app1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(app1Login.status).toBe(200);
    applicantToken1 = app1Login.body.data?.accessToken || app1Login.body.accessToken;
    applicantId1 = app1Login.body.data?.user?.id || app1Login.body.user?.id;

    // 2. Register / Authenticate Applicant 2 (Second scholar for cross-applicant tests)
    const applicant2Email = `applicant2_${Date.now()}@test.in`;
    const app2Register = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: applicant2Email,
        password: 'Password@123',
        fullName: 'Jaipal Singh Munda',
        phone: '9876543210',
      });
    expect(app2Register.status).toBe(201);
    applicantToken2 = app2Register.body.data?.accessToken || app2Register.body.accessToken;
    applicantId2 = app2Register.body.data?.user?.id || app2Register.body.user?.id;

    // 3. Authenticate Scrutiny Officer
    const scrutinyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'scrutiny@mota.gov.in', password: 'Password@123' });
    expect(scrutinyLogin.status).toBe(200);
    scrutinyToken = scrutinyLogin.body.data?.accessToken || scrutinyLogin.body.accessToken;
  });

  afterAll(async () => {
    // Clean up created applications and audit logs
    if (testAppIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { applicationId: { in: testAppIds } },
      });
      await prisma.application.deleteMany({
        where: { id: { in: testAppIds } },
      });
    }

    // Clean up applicant 2
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
  // 1. Applicant Profile API Tests (/api/v1/applicant/profile)
  // ============================================================================
  describe('Applicant Profile Management (/api/v1/applicant/profile)', () => {
    it('GET /api/v1/applicant/profile should return 200 with existing profile for seeded applicant', async () => {
      const res = await request(app)
        .get('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.userId).toBe(applicantId1);
      expect(res.body.data.casteCommunity).toBe('Santhal');
    });

    it('GET /api/v1/applicant/profile should return 404 for Applicant 2 before profile setup', async () => {
      const res = await request(app)
        .get('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicantToken2}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toContain('Applicant profile not found');
    });

    it('PUT /api/v1/applicant/profile should create profile for Applicant 2 and return 200', async () => {
      const profilePayload = {
        dateOfBirth: '2001-08-15',
        gender: 'Male',
        casteCommunity: 'Munda',
        subTribe: 'Kolhan',
        fatherOrSpouseName: 'Pawan Munda',
        annualIncome: 120000,
        addressLine: 'House 14, Khunti Road',
        district: 'Khunti',
        state: 'Jharkhand',
        pincode: '835210',
        bankIfsc: 'SBIN0001234',
        bankName: 'State Bank of India',
      };

      const res = await request(app)
        .put('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicantToken2}`)
        .send(profilePayload);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.casteCommunity).toBe('Munda');
      expect(res.body.data.district).toBe('Khunti');
      expect(Number(res.body.data.annualIncome)).toBe(120000);

      // Verify profile is now retrievable via GET
      const getRes = await request(app)
        .get('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicantToken2}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.casteCommunity).toBe('Munda');
    });

    it('PUT /api/v1/applicant/profile should update existing profile (upsert)', async () => {
      const updatedPayload = {
        dateOfBirth: '2001-08-15',
        gender: 'Male',
        casteCommunity: 'Munda',
        subTribe: 'Kolhan Central',
        fatherOrSpouseName: 'Pawan Munda',
        annualIncome: 135000,
        addressLine: 'House 14, Khunti Road Updated',
        district: 'Khunti',
        state: 'Jharkhand',
        pincode: '835210',
      };

      const res = await request(app)
        .put('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicantToken2}`)
        .send(updatedPayload);

      expect(res.status).toBe(200);
      expect(res.body.data.subTribe).toBe('Kolhan Central');
      expect(Number(res.body.data.annualIncome)).toBe(135000);
    });

    it('PUT /api/v1/applicant/profile should reject invalid pincode (< 6 digits) with 400', async () => {
      const invalidPayload = {
        dateOfBirth: '2001-08-15',
        gender: 'Male',
        casteCommunity: 'Munda',
        fatherOrSpouseName: 'Pawan Munda',
        annualIncome: 120000,
        addressLine: 'Test Road',
        district: 'Khunti',
        state: 'Jharkhand',
        pincode: '123', // invalid
      };

      const res = await request(app)
        .put('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicantToken2}`)
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('PUT /api/v1/applicant/profile should reject non-applicant role with 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .send({
          dateOfBirth: '1990-01-01',
          gender: 'Female',
          casteCommunity: 'ST',
          fatherOrSpouseName: 'Father',
          annualIncome: 100000,
          addressLine: 'Ranchi',
          district: 'Ranchi',
          state: 'Jharkhand',
          pincode: '834001',
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/v1/applicant/profile should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/applicant/profile');
      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // 2. Draft Application Initialization (POST /api/v1/applications)
  // ============================================================================
  describe('Draft Application Creation (POST /api/v1/applications)', () => {
    it('should create a DRAFT application for NFST with auto-resolved published version', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {
            courseLevel: 'Ph.D.',
            universityName: 'Ranchi University',
            subject: 'Tribal Philosophy',
            admissionDate: '2026-07-01',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.status).toBe(ApplicationStatus.DRAFT);
      expect(res.body.data.applicantId).toBe(applicantId1);
      expect(res.body.data.applicationNumber).toMatch(/^TS-NFST-\d{4}-\d{4}$/);

      createdAppId1 = res.body.data.id;
      testAppIds.push(createdAppId1);

      // Verify AuditLog record was atomically committed
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          applicationId: createdAppId1,
          action: 'APPLICATION_CREATED',
        },
      });
      expect(auditLog).not.toBeNull();
      expect(auditLog?.userId).toBe(applicantId1);
    });

    it('should create a DRAFT application for Applicant 2 for NOS scheme with explicit versionId', async () => {
      // Find active NOS version
      const nosVersion = await prisma.schemeVersion.findFirst({
        where: {
          scheme: { code: SchemeCode.NOS },
          isPublished: true,
        },
      });
      expect(nosVersion).not.toBeNull();

      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken2}`)
        .send({
          schemeCode: SchemeCode.NOS,
          schemeVersionId: nosVersion!.id,
          formData: {
            degreeLevel: 'Masters',
            foreignUniversity: 'University of Oxford',
            qsRanking: 4,
            country: 'United Kingdom',
            tuitionFeesInr: 3500000,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(ApplicationStatus.DRAFT);
      expect(res.body.data.applicantId).toBe(applicantId2);
      expect(res.body.data.applicationNumber).toMatch(/^TS-NOS-\d{4}-\d{4}$/);
      expect(res.body.data.schemeVersionId).toBe(nosVersion!.id);

      createdAppId2 = res.body.data.id;
      testAppIds.push(createdAppId2);
    });

    it('should reject draft application creation with invalid/non-existent schemeCode (400)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          schemeCode: 'INVALID_SCHEME',
          formData: {},
        });

      expect(res.status).toBe(400);
    });

    it('should reject non-applicant trying to create draft application (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .send({
          schemeCode: SchemeCode.NFST,
          formData: {},
        });

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .send({ schemeCode: SchemeCode.NFST });

      expect(res.status).toBe(401);
    });
  });

  // ============================================================================
  // 3. Form Data Update API (PATCH /api/v1/applications/:id/form)
  // ============================================================================
  describe('Form Data Updates (PATCH /api/v1/applications/:id/form)', () => {
    it('should update and merge formData when application is in DRAFT status', async () => {
      const patchRes = await request(app)
        .patch(`/api/v1/applications/${createdAppId1}/form`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          formData: {
            synopsisTitle: 'Santhal Cultural Traditions and Forest Rights',
            supervisorName: 'Dr. Ramesh Soren',
            registrationNumber: 'RU-PHD-2026-88',
          },
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('success');
      expect(patchRes.body.data.formData.synopsisTitle).toBe(
        'Santhal Cultural Traditions and Forest Rights'
      );
      // Existing fields should be preserved (merged)
      expect(patchRes.body.data.formData.courseLevel).toBe('Ph.D.');
      expect(patchRes.body.data.formData.universityName).toBe('Ranchi University');

      // Verify AuditLog record for update
      const updateAudit = await prisma.auditLog.findFirst({
        where: {
          applicationId: createdAppId1,
          action: 'APPLICATION_UPDATED',
        },
        orderBy: { timestamp: 'desc' },
      });
      expect(updateAudit).not.toBeNull();
      expect(updateAudit?.userId).toBe(applicantId1);
    });

    it('should allow formData updates when application is in DEFICIENT status', async () => {
      // Temporarily set status to DEFICIENT
      await prisma.application.update({
        where: { id: createdAppId1 },
        data: { status: ApplicationStatus.DEFICIENT },
      });

      const patchRes = await request(app)
        .patch(`/api/v1/applications/${createdAppId1}/form`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          formData: {
            correctedField: 'Corrected Value after deficiency review',
          },
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.formData.correctedField).toBe(
        'Corrected Value after deficiency review'
      );

      // Reset back to DRAFT for remaining tests
      await prisma.application.update({
        where: { id: createdAppId1 },
        data: { status: ApplicationStatus.DRAFT },
      });
    });

    it('should reject formData update when application is in SUBMITTED status (400 Bad Request)', async () => {
      // Temporarily set status to SUBMITTED
      await prisma.application.update({
        where: { id: createdAppId1 },
        data: { status: ApplicationStatus.SUBMITTED },
      });

      const patchRes = await request(app)
        .patch(`/api/v1/applications/${createdAppId1}/form`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          formData: { attempt: 'Illegal edit on submitted application' },
        });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.message).toContain('Cannot update form data in status');

      // Restore to DRAFT
      await prisma.application.update({
        where: { id: createdAppId1 },
        data: { status: ApplicationStatus.DRAFT },
      });
    });

    it('should reject update on non-existent application ID (404 Not Found)', async () => {
      const res = await request(app)
        .patch('/api/v1/applications/00000000-0000-0000-0000-000000000000/form')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .send({
          formData: { field: 'test' },
        });

      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // 4. Cross-Applicant Access Prevention & Ownership Scoping
  // ============================================================================
  describe('Cross-Applicant Ownership & Security Guards', () => {
    it('GET /api/v1/applications should return ONLY the authenticated applicant applications', async () => {
      // Applicant 1 queries applications
      const res1 = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res1.status).toBe(200);
      expect(Array.isArray(res1.body.data)).toBe(true);
      // All returned applications must belong to Applicant 1
      for (const application of res1.body.data) {
        expect(application.applicantId).toBe(applicantId1);
      }
      expect(res1.body.data.some((a: { id: string }) => a.id === createdAppId1)).toBe(true);
      expect(res1.body.data.some((a: { id: string }) => a.id === createdAppId2)).toBe(false);

      // Applicant 2 queries applications
      const res2 = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${applicantToken2}`);

      expect(res2.status).toBe(200);
      for (const application of res2.body.data) {
        expect(application.applicantId).toBe(applicantId2);
      }
      expect(res2.body.data.some((a: { id: string }) => a.id === createdAppId2)).toBe(true);
      expect(res2.body.data.some((a: { id: string }) => a.id === createdAppId1)).toBe(false);
    });

    it('GET /api/v1/applications should allow Scrutiny Officer to view all applications', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(200);
      // Officer sees both App 1 and App 2
      const ids = res.body.data.map((a: { id: string }) => a.id);
      expect(ids).toContain(createdAppId1);
      expect(ids).toContain(createdAppId2);
    });

    it('GET /api/v1/applications/:id should return single application with audit status timeline for owner', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId1}`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdAppId1);
      expect(res.body.data.scheme.code).toBe(SchemeCode.NFST);
      expect(Array.isArray(res.body.data.auditLogs)).toBe(true);
      expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.auditLogs[0].action).toBe('APPLICATION_CREATED');
    });

    it('GET /api/v1/applications/:id should REJECT cross-applicant access with 403 Forbidden', async () => {
      // Applicant 2 attempts to read Applicant 1's application
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId1}`)
        .set('Authorization', `Bearer ${applicantToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to view this application');
    });

    it('PATCH /api/v1/applications/:id/form should REJECT cross-applicant modification with 403 Forbidden', async () => {
      // Applicant 2 attempts to modify Applicant 1's form data
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId1}/form`)
        .set('Authorization', `Bearer ${applicantToken2}`)
        .send({
          formData: { hack: 'Malicious modification of another scholar application' },
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to modify this application');
    });

    it('GET /api/v1/applications/:id should return 404 for non-existent application UUID', async () => {
      const res = await request(app)
        .get('/api/v1/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(404);
    });
  });
});
