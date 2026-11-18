import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import {
  ApplicationStatus,
  DeficiencyStatus,
  DocumentType,
  PostSelectionStatus,
  ReviewDecision,
  Role,
  SchemeCode,
  VerificationStatus,
} from '@tribalscholar/shared';
import { app } from '../app.js';
import { prisma } from '../lib/prisma.js';

describe('Demo Reset Utility & Endpoint (/api/v1/demo/reset)', () => {
  beforeAll(async () => {
    // Ensure clean connection before test execution
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should reset demo state in under 2000ms and return a detailed summary', async () => {
    const res = await request(app)
      .post('/api/v1/demo/reset')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.message).toContain('Demo environment reset successfully');
    expect(res.body.data).toBeDefined();

    const data = res.body.data;

    // SLA requirement: execution under 2000ms
    expect(data.durationMs).toBeLessThan(2000);
    expect(typeof data.timestamp).toBe('string');

    // Counts checks
    expect(data.counts.users).toBe(4);
    expect(data.counts.schemes).toBe(2);
    expect(data.counts.schemeVersions).toBe(2);
    expect(data.counts.applications).toBe(5);
    expect(data.counts.documents).toBe(6);
    expect(data.counts.deficiencies).toBe(1);
    expect(data.counts.officerReviews).toBe(1);
    expect(data.counts.postSelectionRecords).toBe(1);

    // Returned application summary list check
    expect(data.applications).toHaveLength(5);
    const appNumbers = data.applications.map(
      (a: { applicationNumber: string }) => a.applicationNumber
    );
    expect(appNumbers).toEqual([
      'TS-NFST-2026-0001',
      'TS-NFST-2026-0002',
      'TS-NFST-2026-0003',
      'TS-NFST-2026-0004',
      'TS-NOS-2026-0001',
    ]);
  });

  it('should verify all 4 RBAC users and applicant profile in database', async () => {
    const users = await prisma.user.findMany({
      include: { applicantProfile: true },
    });

    expect(users).toHaveLength(4);

    const applicant = users.find((u) => u.email === 'applicant@demo.in');
    const scrutiny = users.find((u) => u.email === 'scrutiny@mota.gov.in');
    const selection = users.find((u) => u.email === 'selection@mota.gov.in');
    const admin = users.find((u) => u.email === 'admin@mota.gov.in');

    expect(applicant?.role).toBe(Role.APPLICANT);
    expect(applicant?.fullName).toBe('Birsa Munda');
    expect(applicant?.applicantProfile).toBeDefined();
    expect(Number(applicant?.applicantProfile?.annualIncome)).toBe(80000);
    expect(applicant?.applicantProfile?.state).toBe('Jharkhand');

    expect(scrutiny?.role).toBe(Role.SCRUTINY_OFFICER);
    expect(scrutiny?.fullName).toBe('Dr. Sunita Toppo');

    expect(selection?.role).toBe(Role.SELECTION_OFFICER);
    expect(selection?.fullName).toBe('Shri Rajeshwar Meena');

    expect(admin?.role).toBe(Role.ADMIN);
    expect(admin?.fullName).toBe('MoTA System Administrator');
  });

  it('should authenticate users using the pre-computed demo password', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'applicant@demo.in',
        password: 'Password@123',
      })
      .expect(200);

    expect(loginRes.body.status).toBe('success');
    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.user.email).toBe('applicant@demo.in');
  });

  it('should verify NFST v1 and NOS v1 are published and any higher draft versions purged', async () => {
    const schemes = await prisma.scheme.findMany({
      include: {
        versions: {
          orderBy: { versionNumber: 'asc' },
        },
      },
    });

    expect(schemes).toHaveLength(2);

    const nfst = schemes.find((s) => s.code === SchemeCode.NFST);
    expect(nfst).toBeDefined();
    expect(nfst?.versions).toHaveLength(1);
    const nfstV1 = nfst?.versions[0];
    expect(nfstV1).toBeDefined();
    expect(nfstV1?.versionNumber).toBe(1);
    expect(nfstV1?.isPublished).toBe(true);
    expect(nfstV1?.totalSlots).toBe(750);
    expect(Number(nfstV1?.incomeCeiling)).toBe(600000);

    const nos = schemes.find((s) => s.code === SchemeCode.NOS);
    expect(nos).toBeDefined();
    expect(nos?.versions).toHaveLength(1);
    const nosV1 = nos?.versions[0];
    expect(nosV1).toBeDefined();
    expect(nosV1?.versionNumber).toBe(1);
    expect(nosV1?.isPublished).toBe(true);
    expect(nosV1?.totalSlots).toBe(100);
    expect(Number(nosV1?.incomeCeiling)).toBe(800000);
  });

  it('should verify Application 1 (TS-NFST-2026-0001) in DRAFT state with no documents', async () => {
    const appRecord = await prisma.application.findUnique({
      where: { applicationNumber: 'TS-NFST-2026-0001' },
      include: { documents: true, deficiencies: true },
    });

    expect(appRecord).toBeDefined();
    expect(appRecord?.status).toBe(ApplicationStatus.DRAFT);
    expect(appRecord?.documents).toHaveLength(0);
    expect(appRecord?.deficiencies).toHaveLength(0);
    expect(appRecord?.formData).toHaveProperty('personal');
    expect(appRecord?.formData).toHaveProperty('academic');
  });

  it('should verify Application 2 (TS-NFST-2026-0002) in UNDER_SCRUTINY with 4 valid proposal certificates', async () => {
    const appRecord = await prisma.application.findUnique({
      where: { applicationNumber: 'TS-NFST-2026-0002' },
      include: { documents: true, deficiencies: true },
    });

    expect(appRecord).toBeDefined();
    expect(appRecord?.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
    expect(appRecord?.meritScore).toBe(84.5);
    expect(appRecord?.documents).toHaveLength(4);
    expect(appRecord?.deficiencies).toHaveLength(0);

    const docTypes = appRecord?.documents.map((d) => d.documentType);
    expect(docTypes).toContain(DocumentType.INCOME_CERTIFICATE);
    expect(docTypes).toContain(DocumentType.CASTE_CERTIFICATE);
    expect(docTypes).toContain(DocumentType.DOMICILE_CERTIFICATE);
    expect(docTypes).toContain(DocumentType.MARKSHEET_PG);

    const incomeDoc = appRecord?.documents.find(
      (d) => d.documentType === DocumentType.INCOME_CERTIFICATE
    );
    expect(incomeDoc?.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(incomeDoc?.fileName).toBe('income_certificate_valid.png');
    expect(incomeDoc?.ocrExtractedFields).toMatchObject({
      certificateNumber: 'SAMPLE-2026-01482',
      dateOfIssue: '14 FEB 2026',
      applicantName: 'Sample Applicant',
      casteCategory: 'Scheduled Tribe (ST)',
      annualIncome: 80000,
      issuingAuthority: 'Competent Revenue Authority',
    });
  });

  it('should verify Application 3 (TS-NFST-2026-0003) in DEFICIENCY_RAISED with open deficiency record', async () => {
    const appRecord = await prisma.application.findUnique({
      where: { applicationNumber: 'TS-NFST-2026-0003' },
      include: {
        documents: true,
        deficiencies: {
          include: { raisedByOfficer: true },
        },
      },
    });

    expect(appRecord).toBeDefined();
    expect(appRecord?.status).toBe(ApplicationStatus.DEFICIENCY_RAISED);
    expect(appRecord?.documents).toHaveLength(1);

    const deficientDoc = appRecord?.documents[0];
    expect(deficientDoc?.fileName).toBe('income_certificate_deficient.png');
    expect(deficientDoc?.verificationStatus).toBe(VerificationStatus.FLAGGED_DEFICIENT);
    expect(deficientDoc?.ocrExtractedFields).toMatchObject({
      annualIncome: 120000,
      applicantName: 'Sample Applicant',
    });
    expect(deficientDoc?.crossDocValidation).toMatchObject({
      status: 'MISMATCH',
      discrepancy: 40000,
    });

    expect(appRecord?.deficiencies).toHaveLength(1);
    const deficiency = appRecord?.deficiencies[0];
    expect(deficiency?.deficiencyCode).toBe('CROSS_DOC_INCOME_MISMATCH');
    expect(deficiency?.status).toBe(DeficiencyStatus.OPEN);
    expect(deficiency?.isResolved).toBe(false);
    expect(deficiency?.raisedByOfficer.email).toBe('scrutiny@mota.gov.in');
  });

  it('should verify Application 4 (TS-NFST-2026-0004) in PROVISIONALLY_SELECTED with OfficerReview & Sanction Order', async () => {
    const appRecord = await prisma.application.findUnique({
      where: { applicationNumber: 'TS-NFST-2026-0004' },
      include: {
        reviews: { include: { officer: true } },
        postSelection: true,
      },
    });

    expect(appRecord).toBeDefined();
    expect(appRecord?.status).toBe(ApplicationStatus.PROVISIONALLY_SELECTED);

    expect(appRecord?.reviews).toHaveLength(1);
    const review = appRecord?.reviews[0];
    expect(review?.decision).toBe(ReviewDecision.RECOMMENDED_FOR_SELECTION);
    expect(review?.officer.email).toBe('scrutiny@mota.gov.in');

    expect(appRecord?.postSelection).toBeDefined();
    expect(appRecord?.postSelection?.status).toBe(PostSelectionStatus.AWARD_LETTER_ISSUED);
    expect(appRecord?.postSelection?.sanctionOrderNumber).toBe('TS-SO-2026-001');
    expect(Number(appRecord?.postSelection?.sanctionedAmount)).toBe(420000);
    expect(appRecord?.postSelection?.disbursementDetails).toMatchObject({
      dbtReady: true,
      monthlyFellowship: 35000,
    });
  });

  it('should verify Application 5 (TS-NOS-2026-0001) for NOS Overseas with Oxford offer letter', async () => {
    const appRecord = await prisma.application.findUnique({
      where: { applicationNumber: 'TS-NOS-2026-0001' },
      include: {
        scheme: true,
        documents: true,
      },
    });

    expect(appRecord).toBeDefined();
    expect(appRecord?.scheme.code).toBe(SchemeCode.NOS);
    expect(appRecord?.status).toBe(ApplicationStatus.UNDER_SCRUTINY);
    expect(appRecord?.documents).toHaveLength(1);

    const doc = appRecord?.documents[0];
    expect(doc?.documentType).toBe(DocumentType.ADMISSION_OFFER_LETTER);
    expect(doc?.fileName).toBe('oxford_admission_offer.pdf');
    expect(doc?.ocrExtractedFields).toMatchObject({
      institution: 'University of Oxford',
      program: 'DPhil in Social Anthropology',
      qsWorldRank: 3,
    });
  });

  it('should repeatedly reset idempotently in under 2000ms without duplicating records', async () => {
    for (let i = 0; i < 2; i++) {
      const res = await request(app).post('/api/v1/demo/reset').expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.durationMs).toBeLessThan(2000);
      expect(res.body.data.counts.applications).toBe(5);
      expect(res.body.data.counts.users).toBe(4);
      expect(res.body.data.counts.schemes).toBe(2);
    }
  });
});
