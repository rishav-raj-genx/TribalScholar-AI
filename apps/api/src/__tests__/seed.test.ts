import { describe, expect, it } from 'vitest';
import {
  applicantProfileSchema,
  applicationDocumentSchema,
  applicationSchema,
  ApplicationStatus,
  DocumentType,
  Role,
  SchemeCode,
  schemeRuleSetSchema,
  schemeSchema,
  schemeVersionSchema,
  VerificationStatus,
} from '@tribalscholar/shared';
import { SEED_SCHEMES, SEED_USERS } from '../seed-data.js';

describe('Seed Data Validation Suite', () => {
  it('should contain all 4 required RBAC demo users with correct emails', () => {
    const emailToRoleMap = new Map<string, Role>(
      SEED_USERS.map((u) => [u.email, u.role])
    );

    expect(emailToRoleMap.get('applicant@demo.in')).toBe(Role.APPLICANT);
    expect(emailToRoleMap.get('scrutiny@mota.gov.in')).toBe(Role.SCRUTINY_OFFICER);
    expect(emailToRoleMap.get('selection@mota.gov.in')).toBe(Role.SELECTION_OFFICER);
    expect(emailToRoleMap.get('admin@mota.gov.in')).toBe(Role.ADMIN);
  });

  it('should validate applicant profile against applicantProfileSchema', () => {
    const applicant = SEED_USERS.find((u) => u.email === 'applicant@demo.in');
    expect(applicant).toBeDefined();
    expect(applicant?.profile).toBeDefined();

    const parseResult = applicantProfileSchema.safeParse(applicant?.profile);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.annualIncome).toBe(80000.0);
      expect(parseResult.data.state).toBe('Jharkhand');
      expect(parseResult.data.casteCommunity).toBe('Santhal');
    }
  });

  it('should validate NFST scheme eligibility rules against schemeRuleSetSchema', () => {
    const nfst = SEED_SCHEMES.find((s) => s.code === SchemeCode.NFST);
    expect(nfst).toBeDefined();
    expect(nfst?.version.isPublished).toBe(true);
    expect(nfst?.version.academicYear).toBe('2026-2027');
    expect(nfst?.version.versionNumber).toBe(1);

    const parseResult = schemeRuleSetSchema.safeParse(nfst?.version.eligibilityRules);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.schemeCode).toBe(SchemeCode.NFST);
      expect(parseResult.data.incomeCeiling).toBe(600000.0);
      expect(parseResult.data.eligibilityGroups.length).toBeGreaterThan(0);
    }
  });

  it('should validate NOS scheme eligibility rules against schemeRuleSetSchema', () => {
    const nos = SEED_SCHEMES.find((s) => s.code === SchemeCode.NOS);
    expect(nos).toBeDefined();
    expect(nos?.version.isPublished).toBe(true);
    expect(nos?.version.academicYear).toBe('2026-2027');
    expect(nos?.version.versionNumber).toBe(1);

    const parseResult = schemeRuleSetSchema.safeParse(nos?.version.eligibilityRules);
    expect(parseResult.success).toBe(true);
    if (parseResult.success) {
      expect(parseResult.data.schemeCode).toBe(SchemeCode.NOS);
      expect(parseResult.data.incomeCeiling).toBe(800000.0);
      expect(parseResult.data.maxAge).toBe(35);
      expect(parseResult.data.eligibilityGroups.length).toBeGreaterThan(0);
    }
  });

  it('should verify sample income certificate check is configured for Rs 80,000', () => {
    for (const scheme of SEED_SCHEMES) {
      const incomeRule = scheme.version.crossDocumentConsistencyRules.incomeCertificateCheck;
      expect(incomeRule).toBeDefined();
      expect(incomeRule.expectedSampleValue).toBe(80000.0);
      expect(incomeRule.tolerancePercentage).toBe(5);
    }
  });

  it('should validate applicationDocumentSchema with versioning and verification status', () => {
    const validDoc = {
      id: 'a0000000-0000-0000-0000-000000000001',
      applicationId: 'a0000000-0000-0000-0000-000000000002',
      documentType: DocumentType.ST_CASTE_CERTIFICATE,
      fileName: 'caste_cert.pdf',
      fileSize: 102400,
      mimeType: 'application/pdf',
      s3Key: 'applications/test/caste_cert.pdf',
      s3Bucket: 'tribalscholar-docs',
      version: 1,
      isCurrent: true,
      verificationStatus: VerificationStatus.PENDING,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = applicationDocumentSchema.safeParse(validDoc);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe(1);
      expect(result.data.isCurrent).toBe(true);
      expect(result.data.documentType).toBe(DocumentType.ST_CASTE_CERTIFICATE);
    }
  });

  it('should validate applicationSchema with nested documents', () => {
    const validApp = {
      id: 'a0000000-0000-0000-0000-000000000003',
      applicationNumber: 'TS-NFST-2026-0001',
      applicantId: 'a0000000-0000-0000-0000-000000000004',
      schemeId: 'a0000000-0000-0000-0000-000000000005',
      schemeVersionId: 'a0000000-0000-0000-0000-000000000006',
      status: ApplicationStatus.DRAFT,
      formData: { applicantName: 'Birsa Munda', income: 80000 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: [],
    };

    const result = applicationSchema.safeParse(validApp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.applicationNumber).toBe('TS-NFST-2026-0001');
      expect(result.data.status).toBe(ApplicationStatus.DRAFT);
    }
  });

  it('should validate schemeSchema and schemeVersionSchema contracts', () => {
    const validScheme = {
      id: 'a0000000-0000-0000-0000-000000000007',
      code: SchemeCode.NFST,
      name: 'National Fellowship for ST Students',
      description: 'Fellowship scheme for higher education',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const schemeResult = schemeSchema.safeParse(validScheme);
    expect(schemeResult.success).toBe(true);

    const validVersion = {
      id: 'a0000000-0000-0000-0000-000000000008',
      schemeId: validScheme.id,
      versionNumber: 1,
      academicYear: '2026-2027',
      totalSlots: 750,
      incomeCeiling: 600000,
      eligibilityRules: { minMarks: 55 },
      documentRequirements: [{ docType: 'ST_CASTE_CERTIFICATE' }],
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2027-05-31T23:59:59.000Z',
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scheme: validScheme,
    };

    const versionResult = schemeVersionSchema.safeParse(validVersion);
    expect(versionResult.success).toBe(true);
    if (versionResult.success) {
      expect(versionResult.data.academicYear).toBe('2026-2027');
      expect(versionResult.data.isPublished).toBe(true);
    }
  });
});
