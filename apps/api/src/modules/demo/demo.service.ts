import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import {
  ApplicationStatus,
  AuditAction,
  DeficiencyStatus,
  DocumentType,
  PostSelectionStatus,
  ReviewDecision,
  SchemeCode,
  VerificationStatus,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { SEED_SCHEMES, SEED_USERS } from '../../seed-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-computed bcrypt hash of 'Password@123' with 10 salt rounds
// Avoids ~350ms of CPU hashing during live demo resets
const DEMO_PASSWORD_HASH = '$2b$10$f/nc5AbKVYSU/q9yuyy0z.9p6Tud47CQoCv1PLZU.t3RNe8lAM72m';

export interface DemoResetSummary {
  durationMs: number;
  timestamp: string;
  counts: {
    users: number;
    schemes: number;
    schemeVersions: number;
    applications: number;
    documents: number;
    deficiencies: number;
    officerReviews: number;
    postSelectionRecords: number;
    auditLogs: number;
  };
  applications: Array<{
    applicationNumber: string;
    schemeCode: SchemeCode;
    status: ApplicationStatus;
    applicantEmail: string;
    description: string;
  }>;
}

export class DemoService {
  /**
   * Locates the root `demo-assets` folder containing synthetic certificates.
   */
  private findDemoAssetsDir(): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'demo-assets'),
      path.resolve(process.cwd(), '../../demo-assets'),
      path.resolve(__dirname, '../../../../demo-assets'),
      path.resolve(__dirname, '../../../../../demo-assets'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Copies synthetic sample certificates into the local storage folder so document downloads work offline.
   */
  private syncDemoAssetsToStorage(): void {
    try {
      const assetsDir = this.findDemoAssetsDir();
      if (!assetsDir) {
        logger.warn('[DemoService] demo-assets directory not located on disk, skipping storage sync');
        return;
      }

      const targetDir = path.resolve(
        env.STORAGE_LOCAL_DIR || '.storage-local',
        env.S3_BUCKET || 'tribalscholar-docs',
        'demo-assets'
      );

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const files = fs.readdirSync(assetsDir);
      for (const file of files) {
        if (file.endsWith('.png') || file.endsWith('.pdf')) {
          const src = path.join(assetsDir, file);
          const dest = path.join(targetDir, file);
          fs.copyFileSync(src, dest);
        }
      }
    } catch (err: unknown) {
      logger.warn('[DemoService] Could not sync demo assets to local storage:', { error: String(err) });
    }
  }

  /**
   * Resets entire system state to pristine SIH 2026 jury demonstration baseline in < 2000ms:
   * 1. Purges transactional records (PostSelection, Reviews, Deficiencies, Documents, AuditLogs, Applications)
   * 2. Purges draft SchemeVersions (version > 1) and ensures NFST v1 & NOS v1 are published
   * 3. Idempotently restores the 4 RBAC seed personas with pre-hashed credentials
   * 4. Pre-populates 5 sample applications representing all key workflow states
   * 5. Syncs demo document assets to storage
   */
  public async resetDemoState(): Promise<DemoResetSummary> {
    const startTime = performance.now();
    logger.info('[DemoService] Initiating complete demo state reset...');

    // 1. Transactional cleanup in reverse dependency order
    const seedEmails = SEED_USERS.map((u) => u.email);
    await prisma.$transaction([
      prisma.postSelectionRecord.deleteMany(),
      prisma.officerReview.deleteMany(),
      prisma.deficiencyRecord.deleteMany(),
      prisma.applicationDocument.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.application.deleteMany(),
      prisma.schemeVersion.deleteMany({
        where: { versionNumber: { gt: 1 } },
      }),
      prisma.applicantProfile.deleteMany({
        where: { user: { email: { notIn: seedEmails } } },
      }),
      prisma.user.deleteMany({
        where: { email: { notIn: seedEmails } },
      }),
    ]);

    // 2. Sync Demo Assets to Local Storage
    this.syncDemoAssetsToStorage();

    // 3. Upsert 4 RBAC Demo Users
    const userMap = new Map<string, string>(); // email -> id

    for (const user of SEED_USERS) {
      const userRecord = await prisma.user.upsert({
        where: { email: user.email },
        update: {
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          passwordHash: DEMO_PASSWORD_HASH,
          isActive: true,
        },
        create: {
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
          passwordHash: DEMO_PASSWORD_HASH,
          isActive: true,
        },
      });

      userMap.set(user.email, userRecord.id);

      if (user.profile) {
        await prisma.applicantProfile.upsert({
          where: { userId: userRecord.id },
          update: {
            dateOfBirth: new Date(user.profile.dateOfBirth),
            gender: user.profile.gender,
            casteCommunity: user.profile.casteCommunity,
            subTribe: user.profile.subTribe,
            fatherOrSpouseName: user.profile.fatherOrSpouseName,
            annualIncome: new Prisma.Decimal(user.profile.annualIncome),
            addressLine: user.profile.addressLine,
            district: user.profile.district,
            state: user.profile.state,
            pincode: user.profile.pincode,
            bankIfsc: user.profile.bankIfsc,
            bankName: user.profile.bankName,
          },
          create: {
            userId: userRecord.id,
            dateOfBirth: new Date(user.profile.dateOfBirth),
            gender: user.profile.gender,
            casteCommunity: user.profile.casteCommunity,
            subTribe: user.profile.subTribe,
            fatherOrSpouseName: user.profile.fatherOrSpouseName,
            annualIncome: new Prisma.Decimal(user.profile.annualIncome),
            addressLine: user.profile.addressLine,
            district: user.profile.district,
            state: user.profile.state,
            pincode: user.profile.pincode,
            bankIfsc: user.profile.bankIfsc,
            bankName: user.profile.bankName,
          },
        });
      }
    }

    const applicantId = userMap.get('applicant@demo.in');
    const scrutinyOfficerId = userMap.get('scrutiny@mota.gov.in');
    const selectionOfficerId = userMap.get('selection@mota.gov.in');

    if (!applicantId || !scrutinyOfficerId || !selectionOfficerId) {
      throw new Error('Critical failure: Seed users could not be resolved during reset');
    }

    // 4. Upsert Schemes & Published Version 1 Rulesets
    const schemeVersionMap = new Map<SchemeCode, { schemeId: string; versionId: string }>();

    for (const scheme of SEED_SCHEMES) {
      const schemeRecord = await prisma.scheme.upsert({
        where: { code: scheme.code },
        update: {
          name: scheme.name,
          description: scheme.description,
          isActive: true,
        },
        create: {
          code: scheme.code,
          name: scheme.name,
          description: scheme.description,
          isActive: true,
        },
      });

      let docRequirements = scheme.version.documentRequirements;
      let eligibilityRules = scheme.version.eligibilityRules;
      let consistencyRules = scheme.version.crossDocumentConsistencyRules;

      if (scheme.code === SchemeCode.NFST) {
        docRequirements = [
          {
            documentType: DocumentType.CASTE_CERTIFICATE,
            label: 'Scheduled Tribe Community Certificate',
            mandatory: true,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf', 'image/png'],
          },
          {
            documentType: DocumentType.INCOME_CERTIFICATE,
            label: 'Income Certificate from Competent Revenue Authority',
            mandatory: true,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf', 'image/png'],
          },
          {
            documentType: DocumentType.DOMICILE_CERTIFICATE,
            label: 'State Domicile Certificate',
            mandatory: false,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf', 'image/png'],
          },
          {
            documentType: DocumentType.MARKSHEET_PG,
            label: "Master's Degree Final Marksheet / Degree Certificate",
            mandatory: true,
            maxSizeMb: 10,
            allowedFormats: ['application/pdf', 'image/png'],
          },
          {
            documentType: DocumentType.AADHAAR_CARD,
            label: 'Aadhaar Card (Masked/E-Aadhaar)',
            mandatory: false,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
          },
          {
            documentType: DocumentType.ADMISSION_OFFER_LETTER,
            label: 'Ph.D. / M.Phil Admission Offer Letter / Joining Confirmation',
            mandatory: false,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf'],
          },
          {
            documentType: DocumentType.BONAFIDE_CERTIFICATE,
            label: 'Institution Bonafide Certificate from University Registrar',
            mandatory: false,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf'],
          },
          {
            documentType: DocumentType.BANK_PASSBOOK,
            label: 'Bank Passbook / Cancelled Cheque (Aadhaar Seeded Account)',
            mandatory: false,
            maxSizeMb: 5,
            allowedFormats: ['application/pdf', 'image/jpeg'],
          },
          {
            documentType: DocumentType.SYNOPSIS_RESEARCH_PROPOSAL,
            label: 'Approved Research Synopsis / Topic Proposal',
            mandatory: false,
            maxSizeMb: 10,
            allowedFormats: ['application/pdf'],
          },
        ];

        consistencyRules = {
          ...consistencyRules,
          nameMatching: {
            documents: [
              DocumentType.CASTE_CERTIFICATE,
              DocumentType.INCOME_CERTIFICATE,
              DocumentType.DOMICILE_CERTIFICATE,
              DocumentType.MARKSHEET_PG,
            ],
            minConfidenceThreshold: 0.8,
            fuzzyScoreThreshold: 0.85,
          },
          dobMatching: {
            documents: [DocumentType.DOMICILE_CERTIFICATE, DocumentType.MARKSHEET_PG],
            strictEquality: true,
          },
        };
      }

      const versionRecord = await prisma.schemeVersion.upsert({
        where: {
          schemeId_versionNumber: {
            schemeId: schemeRecord.id,
            versionNumber: scheme.version.versionNumber,
          },
        },
        update: {
          academicYear: scheme.version.academicYear,
          totalSlots: scheme.version.totalSlots,
          incomeCeiling: new Prisma.Decimal(scheme.version.incomeCeiling),
          startDate: new Date(scheme.version.startDate),
          endDate: new Date(scheme.version.endDate),
          isPublished: true,
          eligibilityRules: eligibilityRules as unknown as Prisma.InputJsonValue,
          documentRequirements: docRequirements as unknown as Prisma.InputJsonValue,
          scoringConfig: consistencyRules as unknown as Prisma.InputJsonValue,
        },
        create: {
          schemeId: schemeRecord.id,
          versionNumber: scheme.version.versionNumber,
          academicYear: scheme.version.academicYear,
          totalSlots: scheme.version.totalSlots,
          incomeCeiling: new Prisma.Decimal(scheme.version.incomeCeiling),
          startDate: new Date(scheme.version.startDate),
          endDate: new Date(scheme.version.endDate),
          isPublished: true,
          eligibilityRules: eligibilityRules as unknown as Prisma.InputJsonValue,
          documentRequirements: docRequirements as unknown as Prisma.InputJsonValue,
          scoringConfig: consistencyRules as unknown as Prisma.InputJsonValue,
        },
      });

      schemeVersionMap.set(scheme.code, {
        schemeId: schemeRecord.id,
        versionId: versionRecord.id,
      });
    }

    const nfst = schemeVersionMap.get(SchemeCode.NFST);
    const nos = schemeVersionMap.get(SchemeCode.NOS);

    if (!nfst || !nos) {
      throw new Error('Critical failure: Schemes NFST and NOS could not be resolved');
    }

    // 5. Pre-populate Sample Applications Across 5 Workflow Stages
    const bucket = env.S3_BUCKET || 'tribalscholar-docs';
    const now = new Date();

    // Application 1: DRAFT (Fresh Application Form, No Documents Uploaded)
    const app1 = await prisma.application.create({
      data: {
        applicationNumber: 'TS-NFST-2026-0001',
        applicantId,
        schemeId: nfst.schemeId,
        schemeVersionId: nfst.versionId,
        status: ApplicationStatus.DRAFT,
        formData: {
          personal: {
            fullName: 'Birsa Munda',
            email: 'applicant@demo.in',
            phone: '+919876543210',
            gender: 'MALE',
            dateOfBirth: '2001-05-15',
          },
          academic: {
            qualification: 'Master of Science (Anthropology)',
            institution: 'Central University of Jharkhand',
            pgMarksPercentage: 68.5,
            researchTopic: 'Impact of Forest Rights Act on Tribal Livelihoods in Chota Nagpur',
          },
          economic: {
            annualIncome: 80000,
            incomeCertificateNumber: 'SAMPLE-2026-01482',
          },
        },
        auditLogs: {
          create: {
            userId: applicantId,
            action: AuditAction.APPLICATION_CREATED,
            newState: ApplicationStatus.DRAFT,
            details: { message: 'Scholar initiated NFST application draft' },
          },
        },
      },
    });

    // Application 2: UNDER_SCRUTINY (4 Verified Documents, Proposal Mockup Accurate)
    const app2SubmittedAt = new Date(now.getTime() - 2 * 86400 * 1000);
    const app2 = await prisma.application.create({
      data: {
        applicationNumber: 'TS-NFST-2026-0002',
        applicantId,
        schemeId: nfst.schemeId,
        schemeVersionId: nfst.versionId,
        status: ApplicationStatus.UNDER_SCRUTINY,
        formData: {
          applicant: {
            fullName: 'Birsa Munda',
            email: 'applicant@demo.in',
            annualIncome: 80000,
            casteCommunity: 'Santhal',
            aadhaarVerified: true,
          },
          academic: {
            qualification: 'M.Sc. Anthropology',
            pgMarksPercentage: 78.5,
            institution: 'Central University of Jharkhand',
            researchTopic: 'Ethno-botanical survey of Santhal Pargana',
          },
        },
        meritScore: 84.5,
        submittedAt: app2SubmittedAt,
        ruleEvaluationResults: {
          status: 'PASS',
          evaluatedAt: app2SubmittedAt.toISOString(),
          passedCount: 3,
          failedCount: 0,
          blockingFailures: [],
        },
        documents: {
          create: [
            {
              documentType: DocumentType.INCOME_CERTIFICATE,
              fileName: 'income_certificate_valid.png',
              fileSize: 187392,
              mimeType: 'image/png',
              s3Key: 'demo-assets/income_certificate_valid.png',
              s3Bucket: bucket,
              verificationStatus: VerificationStatus.VERIFIED,
              ocrExtractedFields: {
                certificateNumber: 'SAMPLE-2026-01482',
                dateOfIssue: '14 FEB 2026',
                applicantName: 'Sample Applicant',
                casteCategory: 'Scheduled Tribe (ST)',
                annualIncome: 80000,
                issuingAuthority: 'Competent Revenue Authority',
              },
              ocrConfidence: 0.985,
              crossDocValidation: {
                status: 'MATCH',
                declaredIncome: 80000,
                extractedIncome: 80000,
              },
            },
            {
              documentType: DocumentType.CASTE_CERTIFICATE,
              fileName: 'st_caste_certificate_valid.png',
              fileSize: 186368,
              mimeType: 'image/png',
              s3Key: 'demo-assets/st_caste_certificate_valid.png',
              s3Bucket: bucket,
              verificationStatus: VerificationStatus.VERIFIED,
              ocrExtractedFields: {
                certificateNumber: 'SAMPLE-ST-2026-0091',
                dateOfIssue: '14 FEB 2026',
                applicantName: 'Sample Applicant',
                casteCommunity: 'Scheduled Tribe (ST)',
                issuingAuthority: 'Competent Revenue Authority',
              },
              ocrConfidence: 0.978,
            },
            {
              documentType: DocumentType.DOMICILE_CERTIFICATE,
              fileName: 'domicile_certificate_valid.png',
              fileSize: 176128,
              mimeType: 'image/png',
              s3Key: 'demo-assets/domicile_certificate_valid.png',
              s3Bucket: bucket,
              verificationStatus: VerificationStatus.VERIFIED,
              ocrExtractedFields: {
                certificateNumber: 'DOM-2026-00412',
                applicantName: 'Sample Applicant',
                state: 'Jharkhand',
                issuingAuthority: 'Competent Revenue Authority',
              },
              ocrConfidence: 0.965,
            },
            {
              documentType: DocumentType.MARKSHEET_PG,
              fileName: 'academic_marksheet_valid.png',
              fileSize: 174080,
              mimeType: 'image/png',
              s3Key: 'demo-assets/academic_marksheet_valid.png',
              s3Bucket: bucket,
              verificationStatus: VerificationStatus.VERIFIED,
              ocrExtractedFields: {
                applicantName: 'Sample Applicant',
                course: 'Master of Science (Anthropology)',
                percentage: 78.5,
                division: 'First Division',
                institution: 'Central University of Jharkhand',
              },
              ocrConfidence: 0.991,
            },
          ],
        },
        auditLogs: {
          create: [
            {
              userId: applicantId,
              action: AuditAction.APPLICATION_SUBMITTED,
              previousState: ApplicationStatus.DRAFT,
              newState: ApplicationStatus.UNDER_SCRUTINY,
              details: { message: 'Application submitted with 4 verified documents' },
            },
          ],
        },
      },
    });

    // Application 3: DEFICIENCY_RAISED (Cross-Document Income Mismatch: ₹80k vs ₹1.2L)
    const app3SubmittedAt = new Date(now.getTime() - 3 * 86400 * 1000);
    const app3 = await prisma.application.create({
      data: {
        applicationNumber: 'TS-NFST-2026-0003',
        applicantId,
        schemeId: nfst.schemeId,
        schemeVersionId: nfst.versionId,
        status: ApplicationStatus.DEFICIENCY_RAISED,
        formData: {
          applicant: {
            fullName: 'Birsa Munda',
            annualIncome: 80000,
            casteCommunity: 'Santhal',
          },
          academic: {
            pgMarksPercentage: 65.0,
            institution: 'Ranchi University',
          },
        },
        meritScore: 71.0,
        submittedAt: app3SubmittedAt,
        documents: {
          create: [
            {
              documentType: DocumentType.INCOME_CERTIFICATE,
              fileName: 'income_certificate_deficient.png',
              fileSize: 188416,
              mimeType: 'image/png',
              s3Key: 'demo-assets/income_certificate_deficient.png',
              s3Bucket: bucket,
              verificationStatus: VerificationStatus.FLAGGED_DEFICIENT,
              ocrExtractedFields: {
                certificateNumber: 'SAMPLE-2026-01482',
                dateOfIssue: '14 FEB 2026',
                applicantName: 'Sample Applicant',
                casteCategory: 'Scheduled Tribe (ST)',
                annualIncome: 120000,
                issuingAuthority: 'Competent Revenue Authority',
              },
              ocrConfidence: 0.982,
              crossDocValidation: {
                status: 'MISMATCH',
                field: 'annualIncome',
                declaredValue: 80000,
                extractedValue: 120000,
                discrepancy: 40000,
              },
            },
          ],
        },
        auditLogs: {
          create: [
            {
              userId: scrutinyOfficerId,
              action: AuditAction.DEFICIENCY_RAISED,
              previousState: ApplicationStatus.UNDER_SCRUTINY,
              newState: ApplicationStatus.DEFICIENCY_RAISED,
              details: {
                deficiencyCode: 'CROSS_DOC_INCOME_MISMATCH',
                reason: 'Declared ₹80,000 does not match certificate ₹1,20,000',
              },
            },
          ],
        },
      },
      include: {
        documents: true,
      },
    });

    // Link open deficiency record to the deficient document in app 3
    const deficientDoc = app3.documents[0];
    await prisma.deficiencyRecord.create({
      data: {
        applicationId: app3.id,
        documentId: deficientDoc ? deficientDoc.id : null,
        fieldOrCriteria: 'applicant.annualIncome',
        deficiencyCode: 'CROSS_DOC_INCOME_MISMATCH',
        description:
          'Declared annual income of ₹80,000 does not match income certificate showing ₹1,20,000 per annum (discrepancy: ₹40,000). Please upload correct certificate or update declared income.',
        status: DeficiencyStatus.OPEN,
        isResolved: false,
        raisedByOfficerId: scrutinyOfficerId,
      },
    });

    // Application 4: PROVISIONALLY_SELECTED (Approved, Sanction Order Issued, DBT Ready)
    const app4SubmittedAt = new Date(now.getTime() - 7 * 86400 * 1000);
    const app4VerifiedAt = new Date(now.getTime() - 4 * 86400 * 1000);
    const app4 = await prisma.application.create({
      data: {
        applicationNumber: 'TS-NFST-2026-0004',
        applicantId,
        schemeId: nfst.schemeId,
        schemeVersionId: nfst.versionId,
        status: ApplicationStatus.PROVISIONALLY_SELECTED,
        formData: {
          applicant: {
            fullName: 'Birsa Munda',
            annualIncome: 80000,
            casteCommunity: 'Santhal',
            state: 'Jharkhand',
          },
          academic: {
            pgMarksPercentage: 82.5,
            researchTopic: 'Preservation of Indigenous Languages in Jharkhand',
            institution: 'Central University of Jharkhand',
          },
        },
        meritScore: 92.0,
        submittedAt: app4SubmittedAt,
        verifiedAt: app4VerifiedAt,
        reviews: {
          create: {
            officerId: scrutinyOfficerId,
            decision: ReviewDecision.RECOMMENDED_FOR_SELECTION,
            remarks:
              'All statutory ST criteria satisfied. Income authenticated at ₹80,000/yr. Marksheet verified at 82.5%. Recommended for sanction.',
            checklistResults: {
              incomeVerified: true,
              casteVerified: true,
              academicVerified: true,
            },
            aiFindingsAgreement: true,
          },
        },
        postSelection: {
          create: {
            status: PostSelectionStatus.AWARD_LETTER_ISSUED,
            sanctionOrderNumber: 'TS-SO-2026-001',
            sanctionedAmount: new Prisma.Decimal(420000.0),
            disbursementDetails: {
              monthlyFellowship: 35000,
              hraMonthly: 5600,
              contingencyAnnual: 28000,
              dbtReady: true,
              bankAccount: 'SBIN0000123 / XXXXXXXX4512',
            },
            joiningReportSubmitted: false,
          },
        },
        auditLogs: {
          create: [
            {
              userId: selectionOfficerId,
              action: AuditAction.SELECTION_DECISION_RECORDED,
              previousState: ApplicationStatus.SCRUTINY_VERIFIED,
              newState: ApplicationStatus.PROVISIONALLY_SELECTED,
              details: {
                sanctionOrderNumber: 'TS-SO-2026-001',
                sanctionedAmount: 420000.0,
              },
            },
          ],
        },
      },
    });

    // Application 5: UNDER_SCRUTINY for NOS (National Overseas Scholarship with Oxford Ph.D. Offer)
    const app5SubmittedAt = new Date(now.getTime() - 1 * 86400 * 1000);
    const app5 = await prisma.application.create({
      data: {
        applicationNumber: 'TS-NOS-2026-0001',
        applicantId,
        schemeId: nos.schemeId,
        schemeVersionId: nos.versionId,
        status: ApplicationStatus.UNDER_SCRUTINY,
        formData: {
          applicant: {
            fullName: 'Birsa Munda',
            age: 25,
            annualIncome: 80000,
            casteCommunity: 'Santhal',
          },
          academic: {
            foreignUniversity: 'University of Oxford',
            foreignUniversityRank: 3,
            course: 'DPhil in Social Anthropology',
            qualifyingMarksPercentage: 78.5,
          },
        },
        meritScore: 95.0,
        submittedAt: app5SubmittedAt,
        ruleEvaluationResults: {
          status: 'PASS',
          evaluatedAt: app5SubmittedAt.toISOString(),
          passedCount: 3,
          failedCount: 0,
          blockingFailures: [],
        },
        documents: {
          create: [
            {
              documentType: DocumentType.ADMISSION_OFFER_LETTER,
              fileName: 'oxford_admission_offer.pdf',
              fileSize: 204800,
              mimeType: 'application/pdf',
              s3Key: 'demo-assets/oxford_admission_offer.pdf',
              s3Bucket: bucket,
              verificationStatus: VerificationStatus.VERIFIED,
              ocrExtractedFields: {
                applicantName: 'Birsa Munda',
                institution: 'University of Oxford',
                program: 'DPhil in Social Anthropology',
                qsWorldRank: 3,
                offerType: 'Unconditional',
              },
              ocrConfidence: 0.99,
            },
          ],
        },
        auditLogs: {
          create: [
            {
              userId: applicantId,
              action: AuditAction.APPLICATION_SUBMITTED,
              previousState: ApplicationStatus.DRAFT,
              newState: ApplicationStatus.UNDER_SCRUTINY,
              details: { message: 'NOS Overseas Scholarship application submitted' },
            },
          ],
        },
      },
    });

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    const [
      userCount,
      schemeCount,
      schemeVersionCount,
      applicationCount,
      documentCount,
      deficiencyCount,
      officerReviewCount,
      postSelectionCount,
      auditLogCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.scheme.count(),
      prisma.schemeVersion.count(),
      prisma.application.count(),
      prisma.applicationDocument.count(),
      prisma.deficiencyRecord.count(),
      prisma.officerReview.count(),
      prisma.postSelectionRecord.count(),
      prisma.auditLog.count(),
    ]);

    logger.info(
      `[DemoService] Demo state reset successfully completed in ${durationMs}ms (${applicationCount} applications pre-populated)`
    );

    return {
      durationMs,
      timestamp: new Date().toISOString(),
      counts: {
        users: userCount,
        schemes: schemeCount,
        schemeVersions: schemeVersionCount,
        applications: applicationCount,
        documents: documentCount,
        deficiencies: deficiencyCount,
        officerReviews: officerReviewCount,
        postSelectionRecords: postSelectionCount,
        auditLogs: auditLogCount,
      },
      applications: [
        {
          applicationNumber: app1.applicationNumber,
          schemeCode: SchemeCode.NFST,
          status: app1.status as unknown as ApplicationStatus,
          applicantEmail: 'applicant@demo.in',
          description: 'Fresh scholar application in DRAFT stage (form initiated, 0 documents uploaded)',
        },
        {
          applicationNumber: app2.applicationNumber,
          schemeCode: SchemeCode.NFST,
          status: app2.status as unknown as ApplicationStatus,
          applicantEmail: 'applicant@demo.in',
          description: 'Fully submitted application with 4 valid sample certificates matching proposal page 4',
        },
        {
          applicationNumber: app3.applicationNumber,
          schemeCode: SchemeCode.NFST,
          status: app3.status as unknown as ApplicationStatus,
          applicantEmail: 'applicant@demo.in',
          description: 'Cross-document income mismatch deficiency (Declared ₹80k vs Certificate ₹1.2L)',
        },
        {
          applicationNumber: app4.applicationNumber,
          schemeCode: SchemeCode.NFST,
          status: app4.status as unknown as ApplicationStatus,
          applicantEmail: 'applicant@demo.in',
          description: 'Provisionally Selected by Dr. Sunita Toppo (Sanction Order TS-SO-2026-001, DBT Ready)',
        },
        {
          applicationNumber: app5.applicationNumber,
          schemeCode: SchemeCode.NOS,
          status: app5.status as unknown as ApplicationStatus,
          applicantEmail: 'applicant@demo.in',
          description: 'NOS Overseas Scholarship application with Oxford Ph.D. offer letter (QS Rank: 3)',
        },
      ],
    };
  }
}

export const demoService = new DemoService();
