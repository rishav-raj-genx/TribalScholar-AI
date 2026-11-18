import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { AuditAction, Role, ApplicationStatus } from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { auditService } from '../modules/audit/audit.service.js';

describe('Audit Trail Service & Route Scoping Integration Tests', () => {
  const timestamp = Date.now();
  const testApplicant2Email = `applicant2-audit-${timestamp}@scholar.in`;
  const testPassword = 'Password@123';

  let applicant1Token: string;
  let applicant1Id: string;
  let applicant2Token: string;
  let applicant2Id: string;
  let scrutinyToken: string;
  let selectionToken: string;
  let adminToken: string;

  let testApplication1Id: string;
  let testApplication2Id: string;

  beforeAll(async () => {
    // 1. Authenticate pre-seeded users
    const app1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    applicant1Token = app1Login.body.accessToken || app1Login.body.data.accessToken;
    applicant1Id = app1Login.body.user.id || app1Login.body.data.user.id;

    const scrutinyLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'scrutiny@mota.gov.in', password: 'Password@123' });
    scrutinyToken = scrutinyLogin.body.accessToken || scrutinyLogin.body.data.accessToken;

    const selectionLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'selection@mota.gov.in', password: 'Password@123' });
    selectionToken = selectionLogin.body.accessToken || selectionLogin.body.data.accessToken;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@mota.gov.in', password: 'Password@123' });
    adminToken = adminLogin.body.accessToken || adminLogin.body.data.accessToken;

    // 2. Register applicant 2 for cross-applicant access testing
    const app2Register = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testApplicant2Email,
        password: testPassword,
        fullName: 'Jaipal Singh',
        phone: '+919876543202',
      });
    applicant2Token = app2Register.body.accessToken || app2Register.body.data.accessToken;
    applicant2Id = app2Register.body.user.id || app2Register.body.data.user.id;

    // 3. Find permanent seed scheme version (versionNumber: 1) for creating applications
    const schemeVersion = await prisma.schemeVersion.findFirst({
      where: { versionNumber: 1 },
      include: { scheme: true },
    });

    if (!schemeVersion) {
      throw new Error('Seed prerequisite failure: Published scheme version not found');
    }

    // 4. Create Application 1 for Applicant 1
    const app1 = await prisma.application.create({
      data: {
        applicationNumber: `NFST-AUDIT-1-${timestamp}`,
        applicantId: applicant1Id,
        schemeId: schemeVersion.schemeId,
        schemeVersionId: schemeVersion.id,
        status: ApplicationStatus.DRAFT,
        formData: { applicantName: 'Birsa Munda', income: 80000 },
      },
    });
    testApplication1Id = app1.id;

    // 5. Create Application 2 for Applicant 2
    const app2 = await prisma.application.create({
      data: {
        applicationNumber: `NFST-AUDIT-2-${timestamp}`,
        applicantId: applicant2Id,
        schemeId: schemeVersion.schemeId,
        schemeVersionId: schemeVersion.id,
        status: ApplicationStatus.DRAFT,
        formData: { applicantName: 'Jaipal Singh', income: 90000 },
      },
    });
    testApplication2Id = app2.id;
  });

  afterAll(async () => {
    // Clean up created test applications, logs, and users
    if (testApplication1Id || testApplication2Id) {
      await prisma.auditLog.deleteMany({
        where: {
          OR: [
            { applicationId: testApplication1Id },
            { applicationId: testApplication2Id },
            { details: { path: ['entityId'], equals: testApplication1Id } },
            { details: { path: ['entityId'], equals: testApplication2Id } },
          ],
        },
      });

      await prisma.application.deleteMany({
        where: {
          id: {
            in: [testApplication1Id, testApplication2Id].filter(Boolean),
          },
        },
      });
    }

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'applicant2-audit-',
        },
      },
    });
  });

  describe('Standalone and Transactional Audit Logging', () => {
    it('should create an immutable audit record in standalone mode', async () => {
      const record = await auditService.logAction({
        userId: applicant1Id,
        actorRole: Role.APPLICANT,
        action: AuditAction.APPLICATION_CREATED,
        entityType: 'Application',
        entityId: testApplication1Id,
        applicationId: testApplication1Id,
        newState: { status: 'DRAFT' },
        metadata: { ipOrigin: '127.0.0.1', testRun: 'audit-test' },
        ipAddress: '127.0.0.1',
      });

      expect(record.id).toBeDefined();
      expect(record.action).toBe(AuditAction.APPLICATION_CREATED);
      expect(record.applicationId).toBe(testApplication1Id);
      expect(record.userId).toBe(applicant1Id);
      expect(record.ipAddress).toBe('127.0.0.1');

      const details = record.details as Record<string, unknown>;
      expect(details.entityType).toBe('APPLICATION');
      expect(details.entityId).toBe(testApplication1Id);
      expect(details.actorRole).toBe(Role.APPLICANT);
    });

    it('should atomically commit audit log within an interactive Prisma transaction (tx)', async () => {
      const uniqueState = `TX_COMMITTED_${Date.now()}`;

      await prisma.$transaction(async (tx) => {
        await tx.application.update({
          where: { id: testApplication1Id },
          data: { status: ApplicationStatus.UNDER_SCRUTINY },
        });

        await auditService.logAction(
          {
            userId: applicant1Id,
            actorRole: Role.APPLICANT,
            action: AuditAction.APPLICATION_SUBMITTED,
            entityType: 'Application',
            entityId: testApplication1Id,
            previousState: { status: 'DRAFT' },
            newState: { status: uniqueState },
            metadata: { txTest: true },
          },
          tx
        );
      });

      const logs = await auditService.getAuditTrail('Application', testApplication1Id);
      const matchingLog = logs.find((l) => l.newState?.includes(uniqueState));
      expect(matchingLog).toBeDefined();
      expect(matchingLog?.action).toBe(AuditAction.APPLICATION_SUBMITTED);
    });

    it('should rollback audit log if outer transaction fails (atomicity guarantee)', async () => {
      const rollbackMarker = `ROLLBACK_TEST_${Date.now()}`;

      try {
        await prisma.$transaction(async (tx) => {
          await auditService.logAction(
            {
              userId: applicant1Id,
              actorRole: Role.APPLICANT,
              action: AuditAction.RULE_EVALUATED,
              entityType: 'Application',
              entityId: testApplication1Id,
              newState: { test: rollbackMarker },
            },
            tx
          );

          // Force transaction failure
          throw new Error('Simulated atomic rollback failure');
        });
      } catch (err) {
        expect((err as Error).message).toBe('Simulated atomic rollback failure');
      }

      const logs = await auditService.getAuditTrail('Application', testApplication1Id);
      const rollbackLog = logs.find((l) => l.newState?.includes(rollbackMarker));
      expect(rollbackLog).toBeUndefined();
    });
  });

  describe('Auth Service Audit Integration', () => {
    it('should have logged USER_REGISTER when applicant2 was registered', async () => {
      const userLogs = await auditService.getAuditTrail('User', applicant2Id);
      const registerLog = userLogs.find((l) => l.action === AuditAction.USER_REGISTER);

      expect(registerLog).toBeDefined();
      expect(registerLog?.userId).toBe(applicant2Id);
      expect(registerLog?.details).toBeDefined();

      const details = registerLog?.details as Record<string, unknown>;
      expect(details.entityType).toBe('USER');
      expect(details.entityId).toBe(applicant2Id);
      expect(details.actorRole).toBe(Role.APPLICANT);
    });

    it('should have logged USER_LOGIN when applicant1 logged in', async () => {
      const userLogs = await auditService.getAuditTrail('User', applicant1Id);
      const loginLog = userLogs.find((l) => l.action === AuditAction.USER_LOGIN);

      expect(loginLog).toBeDefined();
      expect(loginLog?.userId).toBe(applicant1Id);
      expect(loginLog?.action).toBe(AuditAction.USER_LOGIN);
    });
  });

  describe('Role-Scoped Audit Retrieval API (GET /api/v1/audit/:entityType/:entityId)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get(`/api/v1/audit/application/${testApplication1Id}`);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('should allow APPLICANT to retrieve their OWN application audit trail (200 OK)', async () => {
      const res1 = await request(app)
        .get(`/api/v1/audit/application/${testApplication1Id}`)
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.status).toBe('success');
      expect(Array.isArray(res1.body.data)).toBe(true);
      expect(res1.body.total).toBeGreaterThanOrEqual(1);

      // Verify applicant 2 can also retrieve their own application
      const res2 = await request(app)
        .get(`/api/v1/audit/application/${testApplication2Id}`)
        .set('Authorization', `Bearer ${applicant2Token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.status).toBe('success');
    });

    it('should reject APPLICANT trying to access ANOTHER applicant application audit trail (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/application/${testApplication2Id}`)
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('Access forbidden');
    });

    it('should reject APPLICANT trying to access non-application entity types (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/user/${applicant1Id}`)
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.message).toContain('applicants may only inspect application audit trails');
    });

    it('should return 404 when APPLICANT queries non-existent application ID', async () => {
      const res = await request(app)
        .get('/api/v1/audit/application/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should allow SCRUTINY_OFFICER to access any application audit trail (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/application/${testApplication1Id}`)
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should allow SELECTION_OFFICER to access any application audit trail (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/application/${testApplication2Id}`)
        .set('Authorization', `Bearer ${selectionToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should allow ADMIN to access any entity audit trail including User (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/user/${applicant1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Audit Trail Immutability & Ordering', () => {
    it('should return chronological logs in ascending order by default', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/application/${testApplication1Id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const logs = res.body.data;
      expect(logs.length).toBeGreaterThanOrEqual(2);

      for (let i = 1; i < logs.length; i++) {
        const prevTime = new Date(logs[i - 1].timestamp).getTime();
        const currTime = new Date(logs[i].timestamp).getTime();
        expect(currTime).toBeGreaterThanOrEqual(prevTime);
      }
    });

    it('should support descending order when explicitly requested (?order=desc)', async () => {
      const res = await request(app)
        .get(`/api/v1/audit/application/${testApplication1Id}?order=desc`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const logs = res.body.data;
      expect(logs.length).toBeGreaterThanOrEqual(2);

      for (let i = 1; i < logs.length; i++) {
        const prevTime = new Date(logs[i - 1].timestamp).getTime();
        const currTime = new Date(logs[i].timestamp).getTime();
        expect(prevTime).toBeGreaterThanOrEqual(currTime);
      }
    });
  });
});
