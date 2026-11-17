import {
  DocumentType,
  Role,
  RuleOperator,
  RuleSeverity,
  SchemeCode,
  type SchemeRuleSet,
} from '@tribalscholar/shared';

export interface SeedUser {
  email: string;
  fullName: string;
  role: Role;
  phone: string;
  passwordPlainText: string;
  profile?: {
    dateOfBirth: string;
    gender: string;
    casteCommunity: string;
    subTribe: string;
    fatherOrSpouseName: string;
    annualIncome: number;
    addressLine: string;
    district: string;
    state: string;
    pincode: string;
    bankIfsc: string;
    bankName: string;
  };
}

export const SEED_USERS: SeedUser[] = [
  {
    email: 'applicant@demo.in',
    fullName: 'Birsa Munda',
    role: Role.APPLICANT,
    phone: '+919876543210',
    passwordPlainText: 'Password@123',
    profile: {
      dateOfBirth: '2001-05-15T00:00:00.000Z',
      gender: 'MALE',
      casteCommunity: 'Santhal',
      subTribe: 'Munda',
      fatherOrSpouseName: 'Kanhu Munda',
      annualIncome: 80000.0, // Rs. 80,000 sample income
      addressLine: 'Village Haradih, Post Khunti',
      district: 'Khunti',
      state: 'Jharkhand',
      pincode: '835210',
      bankIfsc: 'SBIN0000123',
      bankName: 'State Bank of India',
    },
  },
  {
    email: 'scrutiny@mota.gov.in',
    fullName: 'Dr. Sunita Toppo',
    role: Role.SCRUTINY_OFFICER,
    phone: '+919876543211',
    passwordPlainText: 'Password@123',
  },
  {
    email: 'selection@mota.gov.in',
    fullName: 'Shri Rajeshwar Meena',
    role: Role.SELECTION_OFFICER,
    phone: '+919876543212',
    passwordPlainText: 'Password@123',
  },
  {
    email: 'admin@mota.gov.in',
    fullName: 'MoTA System Administrator',
    role: Role.ADMIN,
    phone: '+919876543213',
    passwordPlainText: 'Password@123',
  },
];

export interface SeedScheme {
  code: SchemeCode;
  name: string;
  description: string;
  version: {
    versionNumber: number;
    academicYear: string;
    totalSlots: number;
    incomeCeiling: number;
    startDate: string;
    endDate: string;
    isPublished: boolean;
    requiredDocumentTypes: DocumentType[];
    eligibilityRules: SchemeRuleSet;
    documentRequirements: Array<{
      documentType: DocumentType;
      label: string;
      mandatory: boolean;
      maxSizeMb: number;
      allowedFormats: string[];
    }>;
    crossDocumentConsistencyRules: {
      incomeCertificateCheck: {
        targetDocument: DocumentType;
        targetField: string;
        declaredField: string;
        expectedSampleValue: number;
        tolerancePercentage: number;
      };
      nameMatching: {
        documents: DocumentType[];
        minConfidenceThreshold: number;
        fuzzyScoreThreshold: number;
      };
      dobMatching: {
        documents: DocumentType[];
        strictEquality: boolean;
      };
    };
  };
}

export const SEED_SCHEMES: SeedScheme[] = [
  {
    code: SchemeCode.NFST,
    name: 'National Fellowship and Scholarship for Higher Education of ST Students',
    description:
      'Provides financial assistance to meritorious Scheduled Tribe students pursuing higher education leading to M.Phil and Ph.D. degrees in Indian universities and research institutions recognized by UGC.',
    version: {
      versionNumber: 1,
      academicYear: '2026-2027',
      totalSlots: 750,
      incomeCeiling: 600000.0,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2027-05-31T23:59:59.000Z',
      isPublished: true,
      requiredDocumentTypes: [
        DocumentType.AADHAAR_CARD,
        DocumentType.CASTE_CERTIFICATE,
        DocumentType.INCOME_CERTIFICATE,
        DocumentType.MARKSHEET_PG,
        DocumentType.ADMISSION_OFFER_LETTER,
        DocumentType.BONAFIDE_CERTIFICATE,
        DocumentType.BANK_PASSBOOK,
        DocumentType.SYNOPSIS_RESEARCH_PROPOSAL,
      ],
      eligibilityRules: {
        schemeCode: SchemeCode.NFST,
        academicYear: '2026-2027',
        incomeCeiling: 600000.0,
        minMarksPercentage: 55,
        requiredDocumentTypes: [
          DocumentType.AADHAAR_CARD,
          DocumentType.CASTE_CERTIFICATE,
          DocumentType.INCOME_CERTIFICATE,
          DocumentType.MARKSHEET_PG,
          DocumentType.ADMISSION_OFFER_LETTER,
          DocumentType.BONAFIDE_CERTIFICATE,
          DocumentType.BANK_PASSBOOK,
          DocumentType.SYNOPSIS_RESEARCH_PROPOSAL,
        ],
        eligibilityGroups: [
          {
            id: 'nfst-group-identity',
            name: 'Identity & Community Verification',
            description: 'Validates Scheduled Tribe community certificate and Aadhaar verification status',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nfst-caste-validity',
                field: 'applicant.casteCommunity',
                operator: RuleOperator.NOT_EQUALS,
                value: '',
                errorMessage: 'A valid Scheduled Tribe (ST) certificate is mandatory for NFST fellowship',
                severity: RuleSeverity.BLOCKING,
              },
              {
                id: 'nfst-aadhaar-check',
                field: 'applicant.aadhaarVerified',
                operator: RuleOperator.EQUALS,
                value: true,
                errorMessage: 'Aadhaar identity verification must be completed',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nfst-group-economic',
            name: 'Economic Means Test',
            description: 'Validates annual family income against NFST statutory ceiling (Rs. 6,00,000/year)',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nfst-income-ceiling',
                field: 'applicant.annualIncome',
                operator: RuleOperator.LESS_THAN_OR_EQUAL,
                value: 600000.0,
                errorMessage: 'Total family income from all sources exceeds the ceiling of Rs. 6,00,000 for NFST',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nfst-group-academic',
            name: 'Academic Eligibility',
            description: 'Requires minimum 55% marks in qualifying Post-Graduate degree and valid admission',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nfst-pg-percentage',
                field: 'academic.pgMarksPercentage',
                operator: RuleOperator.GREATER_THAN_OR_EQUAL,
                value: 55,
                errorMessage: 'Minimum 55% marks required in Post-Graduate qualifying examination for ST candidates',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
        ],
      },
      documentRequirements: [
        {
          documentType: DocumentType.AADHAAR_CARD,
          label: 'Aadhaar Card (Masked/E-Aadhaar)',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
        },
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          label: 'Scheduled Tribe Community Certificate',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          label: 'Income Certificate from Competent Revenue Authority',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.MARKSHEET_PG,
          label: "Master's Degree Final Marksheet / Degree Certificate",
          mandatory: true,
          maxSizeMb: 10,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.ADMISSION_OFFER_LETTER,
          label: 'Ph.D. / M.Phil Admission Offer Letter / Joining Confirmation',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.BONAFIDE_CERTIFICATE,
          label: 'Institution Bonafide Certificate from University Registrar',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.BANK_PASSBOOK,
          label: 'Bank Passbook / Cancelled Cheque (Aadhaar Seeded Account)',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf', 'image/jpeg'],
        },
        {
          documentType: DocumentType.SYNOPSIS_RESEARCH_PROPOSAL,
          label: 'Approved Research Synopsis / Topic Proposal',
          mandatory: true,
          maxSizeMb: 10,
          allowedFormats: ['application/pdf'],
        },
      ],
      crossDocumentConsistencyRules: {
        incomeCertificateCheck: {
          targetDocument: DocumentType.INCOME_CERTIFICATE,
          targetField: 'annualIncome',
          declaredField: 'applicant.annualIncome',
          expectedSampleValue: 80000.0, // Rs. 80,000 sample test income
          tolerancePercentage: 5,
        },
        nameMatching: {
          documents: [
            DocumentType.AADHAAR_CARD,
            DocumentType.CASTE_CERTIFICATE,
            DocumentType.MARKSHEET_PG,
          ],
          minConfidenceThreshold: 0.8,
          fuzzyScoreThreshold: 0.85,
        },
        dobMatching: {
          documents: [DocumentType.AADHAAR_CARD, DocumentType.MARKSHEET_PG],
          strictEquality: true,
        },
      },
    },
  },
  {
    code: SchemeCode.NOS,
    name: 'National Overseas Scholarship for ST Candidates',
    description:
      'Facilitates higher studies overseas by providing full financial support to meritorious Scheduled Tribe candidates pursuing Master’s level courses, Ph.D. and Post-Doctoral research in reputed international universities.',
    version: {
      versionNumber: 1,
      academicYear: '2026-2027',
      totalSlots: 100,
      incomeCeiling: 800000.0,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2027-05-31T23:59:59.000Z',
      isPublished: true,
      requiredDocumentTypes: [
        DocumentType.AADHAAR_CARD,
        DocumentType.CASTE_CERTIFICATE,
        DocumentType.INCOME_CERTIFICATE,
        DocumentType.MARKSHEET_UG,
        DocumentType.MARKSHEET_PG,
        DocumentType.ADMISSION_OFFER_LETTER,
        DocumentType.BANK_PASSBOOK,
      ],
      eligibilityRules: {
        schemeCode: SchemeCode.NOS,
        academicYear: '2026-2027',
        incomeCeiling: 800000.0,
        maxAge: 35,
        minMarksPercentage: 60,
        requiredDocumentTypes: [
          DocumentType.AADHAAR_CARD,
          DocumentType.CASTE_CERTIFICATE,
          DocumentType.INCOME_CERTIFICATE,
          DocumentType.MARKSHEET_UG,
          DocumentType.MARKSHEET_PG,
          DocumentType.ADMISSION_OFFER_LETTER,
          DocumentType.BANK_PASSBOOK,
        ],
        eligibilityGroups: [
          {
            id: 'nos-group-identity-age',
            name: 'Category & Age Eligibility',
            description: 'Validates Scheduled Tribe status and age <= 35 years as of 1st July of award year',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nos-caste-validity',
                field: 'applicant.casteCommunity',
                operator: RuleOperator.NOT_EQUALS,
                value: '',
                errorMessage: 'Valid ST community certificate is required for NOS',
                severity: RuleSeverity.BLOCKING,
              },
              {
                id: 'nos-age-limit',
                field: 'applicant.age',
                operator: RuleOperator.LESS_THAN_OR_EQUAL,
                value: 35,
                errorMessage: 'Applicant age must not exceed 35 years as of the award year cutoff date',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nos-group-income',
            name: 'Family Income Ceiling',
            description: 'Validates that annual family income does not exceed Rs. 8,00,000 for overseas study',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nos-income-ceiling',
                field: 'applicant.annualIncome',
                operator: RuleOperator.LESS_THAN_OR_EQUAL,
                value: 800000.0,
                errorMessage: 'Total family income exceeds Rs. 8,00,000 ceiling prescribed under NOS guidelines',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
          {
            id: 'nos-group-academic-admission',
            name: 'Academic Merit & Foreign University Standing',
            description: 'Requires minimum 60% in qualifying degree and unconditionally admitted to Top 500 QS ranked university',
            logicalOperator: 'AND',
            conditions: [
              {
                id: 'nos-qualifying-marks',
                field: 'academic.qualifyingMarksPercentage',
                operator: RuleOperator.GREATER_THAN_OR_EQUAL,
                value: 60,
                errorMessage: 'Minimum 60% marks (or equivalent grade) required in the qualifying degree',
                severity: RuleSeverity.BLOCKING,
              },
              {
                id: 'nos-qs-rank',
                field: 'academic.foreignUniversityRank',
                operator: RuleOperator.LESS_THAN_OR_EQUAL,
                value: 500,
                errorMessage: 'Admitting international university must be ranked within the Top 500 in the latest QS World Rankings',
                severity: RuleSeverity.BLOCKING,
              },
            ],
          },
        ],
      },
      documentRequirements: [
        {
          documentType: DocumentType.AADHAAR_CARD,
          label: 'Aadhaar Card / Passport Identity Page',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.CASTE_CERTIFICATE,
          label: 'ST Tribe/Community Certificate issued by Authorized Revenue Officer',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.INCOME_CERTIFICATE,
          label: 'Family Income Certificate (Current Financial Year)',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.MARKSHEET_UG,
          label: 'Undergraduate Degree Transcripts & Degree Certificate',
          mandatory: true,
          maxSizeMb: 10,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.MARKSHEET_PG,
          label: 'Postgraduate Transcripts (for Ph.D. / Post-Doc applications)',
          mandatory: false,
          maxSizeMb: 10,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.ADMISSION_OFFER_LETTER,
          label: 'Unconditional Admission Offer Letter from Foreign University',
          mandatory: true,
          maxSizeMb: 10,
          allowedFormats: ['application/pdf'],
        },
        {
          documentType: DocumentType.BANK_PASSBOOK,
          label: 'Bank Account Statement (Primary Nationalized Bank)',
          mandatory: true,
          maxSizeMb: 5,
          allowedFormats: ['application/pdf'],
        },
      ],
      crossDocumentConsistencyRules: {
        incomeCertificateCheck: {
          targetDocument: DocumentType.INCOME_CERTIFICATE,
          targetField: 'annualIncome',
          declaredField: 'applicant.annualIncome',
          expectedSampleValue: 80000.0,
          tolerancePercentage: 5,
        },
        nameMatching: {
          documents: [
            DocumentType.AADHAAR_CARD,
            DocumentType.CASTE_CERTIFICATE,
            DocumentType.ADMISSION_OFFER_LETTER,
          ],
          minConfidenceThreshold: 0.85,
          fuzzyScoreThreshold: 0.85,
        },
        dobMatching: {
          documents: [DocumentType.AADHAAR_CARD, DocumentType.MARKSHEET_UG],
          strictEquality: true,
        },
      },
    },
  },
];
