import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ApplicationStatus, SchemeCode } from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';
import { MAX_FILE_SIZE_BYTES } from '../modules/storage/storage.service.js';

describe('Application Document Upload & Replacement Versioning API', () => {
  let applicantToken1: string;
  let applicantId1: string;

  let applicantToken2: string;
  let applicantId2: string;

  let scrutinyToken: string;

  let testApplicationId1: string;
  let testApplicationId2: string;

  let casteDocV1Id: string;
  let incomeDocV1Id: string;
  let domicileDocV1Id: string;
  let marksheetDocV1Id: string;

  const testAppIds: string[] = [];

  // Authentic binary sample buffers
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
    // 1. Authenticate Applicant 1
    const app1Login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'applicant@demo.in', password: 'Password@123' });
    expect(app1Login.status).toBe(200);
    applicantToken1 = app1Login.body.data?.accessToken || app1Login.body.accessToken;
    applicantId1 = app1Login.body.data?.user?.id || app1Login.body.user?.id;

    // 2. Register / Authenticate Applicant 2 (cross-scholar security testing)
    const app2Email = `applicant_doc_${Date.now()}@test.in`;
    const app2Register = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: app2Email,
        password: 'Password@123',
        fullName: 'Karthik Oraon',
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

    // 4. Create Draft Application for Applicant 1
    const app1Create = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken1}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: { degree: 'Ph.D.' },
      });
    expect(app1Create.status).toBe(201);
    testApplicationId1 = app1Create.body.data.id;
    testAppIds.push(testApplicationId1);

    // 5. Create Draft Application for Applicant 2
    const app2Create = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${applicantToken2}`)
      .send({
        schemeCode: SchemeCode.NFST,
        formData: { degree: 'M.Phil.' },
      });
    expect(app2Create.status).toBe(201);
    testApplicationId2 = app2Create.body.data.id;
    testAppIds.push(testApplicationId2);
  });

  afterAll(async () => {
    // Clean up created applications, documents, and audit logs
    if (testAppIds.length > 0) {
      await prisma.auditLog.deleteMany({
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
  // 1. Initial Upload of 4 Prescribed Certificates
  // ============================================================================
  describe('Initial Upload of All 4 Prescribed Certificates', () => {
    it('should upload ST_CASTE_CERTIFICATE (PDF) with version 1 and isCurrent true', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'caste_certificate.pdf');

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.documentType).toBe('ST_CASTE_CERTIFICATE');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.isCurrent).toBe(true);
      expect(res.body.data.fileName).toBe('caste_certificate.pdf');
      expect(res.body.data.mimeType).toBe('application/pdf');

      casteDocV1Id = res.body.data.id;

      // Verify AuditLog record
      const audit = await prisma.auditLog.findFirst({
        where: {
          applicationId: testApplicationId1,
          action: 'DOCUMENT_UPLOADED',
          details: {
            path: ['entityId'],
            equals: casteDocV1Id,
          },
        },
      });
      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(applicantId1);
    });

    it('should upload INCOME_CERTIFICATE (PDF) with version 1 and isCurrent true', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'INCOME_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'income_cert.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.documentType).toBe('INCOME_CERTIFICATE');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.isCurrent).toBe(true);

      incomeDocV1Id = res.body.data.id;
    });

    it('should upload DOMICILE_CERTIFICATE (PNG) with version 1 and isCurrent true', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'DOMICILE_CERTIFICATE')
        .attach('file', samplePngBuffer, 'domicile.png');

      expect(res.status).toBe(201);
      expect(res.body.data.documentType).toBe('DOMICILE_CERTIFICATE');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.isCurrent).toBe(true);
      expect(res.body.data.mimeType).toBe('image/png');

      domicileDocV1Id = res.body.data.id;
    });

    it('should upload ACADEMIC_MARKSHEET (JPEG) with version 1 and isCurrent true', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ACADEMIC_MARKSHEET')
        .attach('file', sampleJpegBuffer, 'marksheet.jpg');

      expect(res.status).toBe(201);
      expect(res.body.data.documentType).toBe('ACADEMIC_MARKSHEET');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.isCurrent).toBe(true);
      expect(res.body.data.mimeType).toBe('image/jpeg');

      marksheetDocV1Id = res.body.data.id;
    });

    it('should confirm all 4 certificates are attached to the application via GET', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId1}`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.documents).toHaveLength(4);

      const docTypes = res.body.data.documents.map((d: { documentType: string }) => d.documentType);
      expect(docTypes).toContain('ST_CASTE_CERTIFICATE');
      expect(docTypes).toContain('INCOME_CERTIFICATE');
      expect(docTypes).toContain('DOMICILE_CERTIFICATE');
      expect(docTypes).toContain('ACADEMIC_MARKSHEET');
      expect(res.body.data.documents.some((d: { id: string }) => d.id === marksheetDocV1Id)).toBe(true);

      // Every initial document must be isCurrent: true, version: 1
      for (const d of res.body.data.documents) {
        expect(d.isCurrent).toBe(true);
        expect(d.version).toBe(1);
      }
    });
  });

  // ============================================================================
  // 2. Replacement Versioning
  // ============================================================================
  describe('Replacement Version Tracking (version increment & isCurrent toggle)', () => {
    let casteDocV2Id: string;

    it('should upload a replacement ST_CASTE_CERTIFICATE and increment version to 2', async () => {
      const replacementPdf = Buffer.concat([
        samplePdfBuffer,
        Buffer.from(' - Updated Caste Certificate with Digital Seal'),
      ]);

      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', replacementPdf, 'caste_cert_v2.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.documentType).toBe('ST_CASTE_CERTIFICATE');
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.isCurrent).toBe(true);
      expect(res.body.data.fileName).toBe('caste_cert_v2.pdf');

      casteDocV2Id = res.body.data.id;

      // Verify in DB that Version 1 is marked isCurrent: false
      const v1InDb = await prisma.applicationDocument.findUnique({
        where: { id: casteDocV1Id },
      });
      expect(v1InDb?.isCurrent).toBe(false);
      expect(v1InDb?.version).toBe(1);

      // Verify in DB that Version 2 is marked isCurrent: true
      const v2InDb = await prisma.applicationDocument.findUnique({
        where: { id: casteDocV2Id },
      });
      expect(v2InDb?.isCurrent).toBe(true);
      expect(v2InDb?.version).toBe(2);

      // Verify AuditLog for replacement includes isReplacement metadata
      const replacementAudit = await prisma.auditLog.findFirst({
        where: {
          applicationId: testApplicationId1,
          action: 'DOCUMENT_UPLOADED',
          details: {
            path: ['entityId'],
            equals: casteDocV2Id,
          },
        },
      });
      expect(replacementAudit).not.toBeNull();
      const details = replacementAudit?.details as { metadata?: { isReplacement?: boolean } };
      expect(details?.metadata?.isReplacement).toBe(true);
    });

    it('should upload a 3rd replacement for ST_CASTE_CERTIFICATE, incrementing version to 3', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'caste_cert_v3.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.version).toBe(3);
      expect(res.body.data.isCurrent).toBe(true);

      const casteDocs = await prisma.applicationDocument.findMany({
        where: {
          applicationId: testApplicationId1,
          documentType: 'ST_CASTE_CERTIFICATE',
        },
        orderBy: { version: 'asc' },
      });

      expect(casteDocs).toHaveLength(3);
      expect(casteDocs[0]?.version).toBe(1);
      expect(casteDocs[0]?.isCurrent).toBe(false);

      expect(casteDocs[1]?.version).toBe(2);
      expect(casteDocs[1]?.isCurrent).toBe(false);

      expect(casteDocs[2]?.version).toBe(3);
      expect(casteDocs[2]?.isCurrent).toBe(true);
    });

    it('should increment version to 2 when replacing INCOME_CERTIFICATE', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'INCOME_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'income_v2.pdf');

      expect(res.status).toBe(201);
      expect(res.body.data.version).toBe(2);
      expect(res.body.data.isCurrent).toBe(true);

      const v1 = await prisma.applicationDocument.findUnique({
        where: { id: incomeDocV1Id },
      });
      expect(v1?.isCurrent).toBe(false);
    });
  });

  // ============================================================================
  // 3. Document Controlled Viewing & Streaming
  // ============================================================================
  describe('Document Viewing & Streaming (GET /documents/:docId/view)', () => {
    it('should return presigned view URL for authorised applicant owner', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId1}/documents/${domicileDocV1Id}/view`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.documentId).toBe(domicileDocV1Id);
      expect(res.body.data.fileName).toBe('domicile.png');
      expect(res.body.data.viewUrl).toBeDefined();
    });

    it('should return presigned view URL for Scrutiny Officer', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId1}/documents/${domicileDocV1Id}/view`)
        .set('Authorization', `Bearer ${scrutinyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.documentId).toBe(domicileDocV1Id);
      expect(res.body.data.viewUrl).toBeDefined();
    });

    it('should stream raw file bytes when stream=true is requested', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId1}/documents/${domicileDocV1Id}/view?stream=true`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.equals(samplePngBuffer)).toBe(true);
    });
  });

  // ============================================================================
  // 4. Unauthorized Access & Security Blocking
  // ============================================================================
  describe('Security Boundaries & Unauthorized Access Blocking', () => {
    it('should REJECT Applicant 2 trying to upload documents to Applicant 1 application (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken2}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'hacked.pdf');

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to upload documents');
    });

    it('should REJECT Applicant 2 trying to view Applicant 1 document (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId1}/documents/${domicileDocV1Id}/view`)
        .set('Authorization', `Bearer ${applicantToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('You do not have permission to view this document');
    });

    it('should REJECT Officer trying to upload documents (upload restricted to APPLICANT) (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${scrutinyToken}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'officer_doc.pdf');

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated upload with 401 Unauthorized', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'noauth.pdf');

      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated document view with 401 Unauthorized', async () => {
      const res = await request(app).get(
        `/api/v1/applications/${testApplicationId1}/documents/${domicileDocV1Id}/view`
      );

      expect(res.status).toBe(401);
    });

    it('should return 404 when viewing non-existent document ID', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${testApplicationId1}/documents/00000000-0000-0000-0000-000000000000/view`)
        .set('Authorization', `Bearer ${applicantToken1}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 when uploading to non-existent application ID', async () => {
      const res = await request(app)
        .post('/api/v1/applications/00000000-0000-0000-0000-000000000000/documents')
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'test.pdf');

      expect(res.status).toBe(404);
    });

    it('should reject invalid / unsupported docType with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'UNSUPPORTED_TYPE')
        .attach('file', samplePdfBuffer, 'test.pdf');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid or missing document type');
    });

    it('should reject upload without file attachment with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('File attachment is required');
    });

    it('should reject file with corrupted / fake magic bytes (e.g. text/html) with 400 Bad Request', async () => {
      const corruptedBuffer = Buffer.from('<html><body>Fake certificate</body></html>');

      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', corruptedBuffer, 'fake.pdf');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid file content or unsupported format');
    });

    it('should reject oversized file exceeding 5 MB limit with 400 Bad Request', async () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 10);
      oversizedBuffer[0] = 0x25;
      oversizedBuffer[1] = 0x50;
      oversizedBuffer[2] = 0x44;
      oversizedBuffer[3] = 0x46;

      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', oversizedBuffer, 'huge.pdf');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('exceeds maximum allowed limit of 5 MB');
    });

    it('should reject upload when application is in SUBMITTED status (400 Bad Request)', async () => {
      // Temporarily mark application as SUBMITTED
      await prisma.application.update({
        where: { id: testApplicationId1 },
        data: { status: ApplicationStatus.SUBMITTED },
      });

      const res = await request(app)
        .post(`/api/v1/applications/${testApplicationId1}/documents`)
        .set('Authorization', `Bearer ${applicantToken1}`)
        .field('docType', 'ST_CASTE_CERTIFICATE')
        .attach('file', samplePdfBuffer, 'post_submit.pdf');

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Uploads are only allowed in DRAFT or DEFICIENT status');

      // Restore back to DRAFT
      await prisma.application.update({
        where: { id: testApplicationId1 },
        data: { status: ApplicationStatus.DRAFT },
      });
    });
  });
});
