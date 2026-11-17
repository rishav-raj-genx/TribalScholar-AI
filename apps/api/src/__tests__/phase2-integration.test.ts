import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AuditAction, Role, ApplicationStatus } from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { auditService } from '../modules/audit/audit.service.js';

describe('Phase 2 End-to-End Integration Suite', () => {
  const timestamp = Date.now();
  let scrutinyToken: string;
  let scrutinyUserId: string;
  let applicantToken: string;
  let applicantUserId: string;
  let testAppId: string;

  beforeAll(async () => {
    // 1. Fetch published scheme for test application
    const schemeVersion = await prisma.schemeVersion.findFirst({
      where: { isPublished: true },
      include: { scheme: true },
    });

    if (!schemeVersion) {
      throw new Error('Prerequisite failure: No published scheme found');
    }

    // 2. Fetch applicant user ID
    const applicant = await prisma.user.findUnique({
      where: { email: 'applicant@demo.in' },
    });
    if (!applicant) {
      throw new Error('Prerequisite failure: applicant@demo.in not found');
    }
    applicantUserId = applicant.id;

    // 3. Create test application for applicant
    const application = await prisma.application.create({
      data: {
        applicationNumber: `NFST-PHASE2-${timestamp}`,
        applicantId: applicantUserId,
        schemeId: schemeVersion.schemeId,
        schemeVersionId: schemeVersion.id,
        status: ApplicationStatus.SUBMITTED,
        formData: { applicantName: 'Birsa Munda', income: 80000, scheme: 'NFST' },
      },
    });
    testAppId = application.id;
  });

  afterAll(async () => {
    if (testAppId) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { applicationId: testAppId },
            { details: { path: ['entityId'], equals: testAppId } },
          ],
        },
      });

      await prisma.application.deleteMany({
        where: { id: testAppId },
      });
    }
  });

  it('Step 1: Authenticate Scrutiny Officer and capture User-Agent / IP in audit log', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'TribalScholar-OfficerConsole/2.0')
      .set('X-Forwarded-For', '203.0.113.195')
      .send({
        email: 'scrutiny@mota.gov.in',
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.status).toBe('success');
    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.user.role).toBe(Role.SCRUTINY_OFFICER);

    scrutinyToken = loginRes.body.accessToken;
    scrutinyUserId = loginRes.body.user.id;

    // Verify security headers & correlation ID
    expect(loginRes.headers['x-request-id']).toBeDefined();
    expect(loginRes.headers['x-content-type-options']).toBe('nosniff');
    expect(loginRes.headers['x-frame-options']).toBe('DENY');
    expect(loginRes.headers['x-ratelimit-limit']).toBeDefined();

    // Verify the latest AuditLog record was persisted with proxy IP and User-Agent
    const logs = await auditService.getAuditTrail('User', scrutinyUserId, { order: 'desc' });
    const latestLoginAudit = logs.find((l) => l.action === AuditAction.USER_LOGIN);
    expect(latestLoginAudit).toBeDefined();
    expect(latestLoginAudit?.userId).toBe(scrutinyUserId);
    expect(latestLoginAudit?.ipAddress).toBe('203.0.113.195');
    expect(latestLoginAudit?.userAgent).toBe('TribalScholar-OfficerConsole/2.0');
  });

  it('Step 2: Authenticate Scholar Applicant and verify token', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'applicant@demo.in',
        password: 'Password@123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe(Role.APPLICANT);
    applicantToken = loginRes.body.accessToken;
  });

  it('Step 3: Access protected officer queue endpoint with RBAC guard', async () => {
    const officerRes = await request(app)
      .get('/api/v1/auth/officer-only')
      .set('Authorization', `Bearer ${scrutinyToken}`);

    expect(officerRes.status).toBe(200);
    expect(officerRes.body.status).toBe('success');
    expect(officerRes.body.data.message).toContain('officer evaluation portal');

    // Confirm scholar is rejected from officer queue
    const scholarRes = await request(app)
      .get('/api/v1/auth/officer-only')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(scholarRes.status).toBe(403);
    expect(scholarRes.body.code).toBe('FORBIDDEN');
  });

  it('Step 4: Execute external mock government adapter calls and assert isSimulatedMock: true', async () => {
    // 4a. DigiLocker Caste Certificate Verification
    const digiLockerRes = await request(app)
      .post('/api/v1/integrations/digilocker/verify')
      .send({
        documentType: 'CASTE_CERTIFICATE',
        documentId: 'JH-ST-2024-88419',
        issuerId: 'IN-JH-REV',
        candidateName: 'Birsa Munda',
      });

    expect(digiLockerRes.status).toBe(200);
    expect(digiLockerRes.body.isSimulatedMock).toBe(true);
    expect(digiLockerRes.body.data.isSimulatedMock).toBe(true);
    expect(digiLockerRes.body.data.isVerified).toBe(true);
    expect(digiLockerRes.body.data.documentUri).toContain('in.gov.digilocker');

    // 4b. DBT / PFMS Fellowship Disbursement Status Lookup
    const dbtRes = await request(app).get(`/api/v1/integrations/dbt/status/${testAppId}`);

    expect(dbtRes.status).toBe(200);
    expect(dbtRes.body.isSimulatedMock).toBe(true);
    expect(dbtRes.body.data.totalSanctionedAmount).toBe(350000.0);
    expect(dbtRes.body.data.disbursements.length).toBeGreaterThan(0);

    // 4c. BHASHINI Indic Translation to Santali & Hindi
    const translateRes = await request(app)
      .post('/api/v1/integrations/bhashini/translate')
      .send({
        sourceLanguage: 'en',
        targetLanguage: 'sat',
        text: 'Scholarship Application',
      });

    expect(translateRes.status).toBe(200);
    expect(translateRes.body.isSimulatedMock).toBe(true);
    expect(translateRes.body.data.translatedText).toBe('ᱥᱠᱚᱞᱟᱨᱥᱤᱯ ᱟᱨᱫᱟᱥ');
  });

  it('Step 5: Mutate state and record transactional audit log atomically', async () => {
    const reviewNote = 'DigiLocker certificate matched and verified by officer';

    // Scrutiny Officer updates application status and commits audit trail inside interactive transaction
    await prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: testAppId },
        data: { status: ApplicationStatus.SCRUTINY_VERIFIED },
      });

      await auditService.logAction(
        {
          userId: scrutinyUserId,
          actorRole: Role.SCRUTINY_OFFICER,
          action: AuditAction.OFFICER_REVIEW_SUBMITTED,
          entityType: 'Application',
          entityId: testAppId,
          applicationId: testAppId,
          previousState: { status: ApplicationStatus.SUBMITTED },
          newState: { status: ApplicationStatus.SCRUTINY_VERIFIED },
          metadata: {
            reviewNote,
            digiLockerVerified: true,
          },
          ipAddress: '203.0.113.195',
        },
        tx
      );
    });

    // Verify application state changed in DB
    const updatedApp = await prisma.application.findUnique({
      where: { id: testAppId },
    });
    expect(updatedApp?.status).toBe(ApplicationStatus.SCRUTINY_VERIFIED);
  });

  it('Step 6: Retrieve and verify chronological audit trail for the application', async () => {
    // 6a. Officer retrieves audit trail
    const officerAuditRes = await request(app)
      .get(`/api/v1/audit/application/${testAppId}`)
      .set('Authorization', `Bearer ${scrutinyToken}`);

    expect(officerAuditRes.status).toBe(200);
    expect(officerAuditRes.body.status).toBe('success');
    expect(officerAuditRes.body.total).toBeGreaterThanOrEqual(1);

    const auditItem = officerAuditRes.body.data.find(
      (l: { action: string }) => l.action === AuditAction.OFFICER_REVIEW_SUBMITTED
    );
    expect(auditItem).toBeDefined();
    expect(auditItem.userId).toBe(scrutinyUserId);
    expect(auditItem.user.role).toBe(Role.SCRUTINY_OFFICER);
    expect(auditItem.details.entityType).toBe('APPLICATION');
    expect(auditItem.details.metadata.digiLockerVerified).toBe(true);

    // 6b. Scholar retrieves their own application audit trail
    const scholarAuditRes = await request(app)
      .get(`/api/v1/audit/application/${testAppId}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(scholarAuditRes.status).toBe(200);
    expect(scholarAuditRes.body.status).toBe('success');
    expect(scholarAuditRes.body.total).toBeGreaterThanOrEqual(1);
  });
});
