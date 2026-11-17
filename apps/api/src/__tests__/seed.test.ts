import { describe, expect, it } from 'vitest';
import {
  applicantProfileSchema,
  Role,
  SchemeCode,
  schemeRuleSetSchema,
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
});
