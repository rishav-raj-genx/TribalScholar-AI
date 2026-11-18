import { Prisma, type Application } from '@prisma/client';
import {
  ApplicationStatus,
  AuditAction,
  DeficiencyStatus,
  ReviewDecision,
  SchemeCode,
  VerificationStatus,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { storageService } from '../storage/storage.service.js';
import {
  BadRequestError,
  NotFoundError,
} from '../../middleware/errorHandler.js';
import type { OrchestratorActor, RequestAuditContext } from './orchestrator.service.js';

export interface ScrutinyQueueFilters {
  schemeCode?: string | undefined;
  status?: string | undefined;
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
  minConfidence?: number | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ScrutinyQueueItem {
  id: string;
  applicationNumber: string;
  schemeCode: string;
  schemeName: string;
  applicantName: string;
  applicantEmail: string;
  status: ApplicationStatus;
  submittedAt: Date | null;
  createdAt: Date;
  documentsCount: number;
  deficienciesCount: number;
  overallConfidence: number;
  hasAiFlag: boolean;
  flagCount: number;
  aiRecommendation: 'APPROVE' | 'REQUEST_CORRECTION';
}

export interface ScrutinyQueueResponse {
  items: ScrutinyQueueItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ScrutinyDecisionPackage {
  application: {
    id: string;
    applicationNumber: string;
    status: ApplicationStatus;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    formData: unknown;
  };
  applicant: {
    id: string;
    fullName: string;
    email: string;
    profile: unknown;
  };
  scheme: {
    id: string;
    code: string;
    name: string;
    version: {
      id: string;
      versionNumber: number;
      academicYear: string;
    };
  };
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    version: number;
    isCurrent: boolean;
    verificationStatus: string;
    ocrConfidence: number | null;
    ocrExtractedFields: unknown;
    crossDocValidation: unknown;
    rejectionReason: string | null;
    viewUrl: string;
    uploadedAt: Date;
  }>;
  ruleEvaluation: Record<string, unknown>;
  aiFindings: {
    overallConfidence: number;
    overallPassed: boolean;
    blockingFailuresCount: number;
    warningCount: number;
    hasFlag: boolean;
    flagCount: number;
    recommendation: 'APPROVE' | 'REQUEST_CORRECTION';
  };
  deficiencyHistory: unknown[];
  priorReviews: unknown[];
}

export interface SubmitOfficerReviewInput {
  decision: 'APPROVE' | 'REQUEST_CORRECTION' | 'RECOMMENDED_FOR_SELECTION' | 'DEFICIENCY_FLAGGED' | 'REJECTED';
  remarks: string;
  justification?: string | undefined;
  overrideUsed?: boolean | undefined;
  checklistResults?: Record<string, boolean> | undefined;
  deficiencies?: Array<{
    documentId?: string | undefined;
    fieldOrCriteria: string;
    deficiencyCode: string;
    description: string;
  }> | undefined;
}

export class ScrutinyService {
  /**
   * Retrieves the scrutiny queue filterable by scheme code, application status,
   * confidence level, and applicant search query.
   */
  async getScrutinyQueue(filters: ScrutinyQueueFilters): Promise<ScrutinyQueueResponse> {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = {};

    // 1. Status filter: Default to UNDER_SCRUTINY unless explicitly specified or 'ALL'
    if (filters.status && filters.status.toUpperCase() !== 'ALL') {
      where.status = filters.status as ApplicationStatus;
    } else if (!filters.status) {
      where.status = ApplicationStatus.UNDER_SCRUTINY;
    }

    // 2. Scheme code filter
    if (filters.schemeCode) {
      where.scheme = {
        code: filters.schemeCode.toUpperCase() as SchemeCode,
      };
    }

    // 3. Search query filter (applicant name, email, or application number)
    if (filters.search && filters.search.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { applicationNumber: { contains: term, mode: 'insensitive' } },
        { applicant: { fullName: { contains: term, mode: 'insensitive' } } },
        { applicant: { email: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        include: {
          scheme: true,
          schemeVersion: true,
          applicant: true,
          documents: {
            where: { isCurrent: true },
          },
          deficiencies: {
            where: { status: DeficiencyStatus.OPEN },
          },
        },
        orderBy: [{ submittedAt: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    let items: ScrutinyQueueItem[] = applications.map((app) => {
      const docConfidences = app.documents
        .map((d) => d.ocrConfidence)
        .filter((c): c is number => typeof c === 'number');

      const overallConfidence =
        docConfidences.length > 0
          ? Number(
              (
                docConfidences.reduce((sum, c) => sum + c, 0) /
                docConfidences.length
              ).toFixed(2)
            )
          : 1.0;

      const ruleEval =
        (app.ruleEvaluationResults as Record<string, unknown>) || {};
      const overallPassed = ruleEval.overallPassed !== false;
      const blockingCount = Number(ruleEval.blockingFailuresCount ?? 0);
      const openDefCount = app.deficiencies.length;
      const deficientDocsCount = app.documents.filter(
        (d) => d.verificationStatus === VerificationStatus.FLAGGED_DEFICIENT
      ).length;

      const hasAiFlag =
        !overallPassed ||
        blockingCount > 0 ||
        openDefCount > 0 ||
        deficientDocsCount > 0;

      const flagCount = openDefCount + blockingCount + deficientDocsCount;

      return {
        id: app.id,
        applicationNumber: app.applicationNumber,
        schemeCode: app.scheme.code,
        schemeName: app.scheme.name,
        applicantName: app.applicant.fullName,
        applicantEmail: app.applicant.email,
        status: app.status as unknown as ApplicationStatus,
        submittedAt: app.submittedAt,
        createdAt: app.createdAt,
        documentsCount: app.documents.length,
        deficienciesCount: openDefCount,
        overallConfidence,
        hasAiFlag,
        flagCount,
        aiRecommendation: hasAiFlag ? 'REQUEST_CORRECTION' : 'APPROVE',
      };
    });

    // 4. Confidence level filtering
    if (filters.confidenceLevel) {
      const level = filters.confidenceLevel.toUpperCase();
      if (level === 'HIGH') {
        items = items.filter((item) => item.overallConfidence >= 0.9);
      } else if (level === 'MEDIUM') {
        items = items.filter(
          (item) => item.overallConfidence >= 0.75 && item.overallConfidence < 0.9
        );
      } else if (level === 'LOW') {
        items = items.filter((item) => item.overallConfidence < 0.75);
      }
    } else if (typeof filters.minConfidence === 'number') {
      items = items.filter((item) => item.overallConfidence >= filters.minConfidence!);
    }

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves the comprehensive Decision Package for an application,
   * structured for the 2-column Officer Scrutiny UI.
   */
  async getDecisionPackage(applicationId: string): Promise<ScrutinyDecisionPackage> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scheme: true,
        schemeVersion: true,
        applicant: {
          include: {
            applicantProfile: true,
          },
        },
        documents: {
          where: { isCurrent: true },
          orderBy: { documentType: 'asc' },
        },
        deficiencies: {
          include: {
            raisedByOfficer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reviews: {
          include: {
            officer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: { reviewedAt: 'desc' },
        },
      },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    // Resolve presigned view URLs for each document
    const documentsWithViewUrls = await Promise.all(
      application.documents.map(async (doc) => {
        let viewUrl = `/api/v1/applications/${application.id}/documents/${doc.id}/view?stream=true`;
        try {
          const presigned = await storageService.getPresignedViewUrl(doc.s3Key, doc.s3Bucket, 3600);
          if (presigned) {
            viewUrl = presigned;
          }
        } catch {
          // Fall back to direct stream route
        }

        return {
          id: doc.id,
          documentType: doc.documentType,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          version: doc.version,
          isCurrent: doc.isCurrent,
          verificationStatus: doc.verificationStatus,
          ocrConfidence: doc.ocrConfidence,
          ocrExtractedFields: doc.ocrExtractedFields,
          crossDocValidation: doc.crossDocValidation,
          rejectionReason: doc.rejectionReason,
          viewUrl,
          uploadedAt: doc.uploadedAt,
        };
      })
    );

    const ruleEvaluation =
      (application.ruleEvaluationResults as Record<string, unknown>) || {};
    const overallPassed = ruleEvaluation.overallPassed !== false;
    const blockingFailuresCount = Number(ruleEvaluation.blockingFailuresCount ?? 0);
    const warningCount = Number(ruleEvaluation.warningCount ?? 0);

    const docConfidences = application.documents
      .map((d) => d.ocrConfidence)
      .filter((c): c is number => typeof c === 'number');

    const overallConfidence =
      docConfidences.length > 0
        ? Number(
            (
              docConfidences.reduce((sum, c) => sum + c, 0) /
              docConfidences.length
            ).toFixed(2)
          )
        : 1.0;

    const openDeficiencies = application.deficiencies.filter(
      (d) => d.status === DeficiencyStatus.OPEN
    );

    const hasFlag =
      !overallPassed ||
      blockingFailuresCount > 0 ||
      openDeficiencies.length > 0 ||
      application.documents.some(
        (d) => d.verificationStatus === VerificationStatus.FLAGGED_DEFICIENT
      );

    const recommendation = hasFlag ? 'REQUEST_CORRECTION' : 'APPROVE';

    return {
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status as unknown as ApplicationStatus,
        submittedAt: application.submittedAt,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        formData: application.formData,
      },
      applicant: {
        id: application.applicant.id,
        fullName: application.applicant.fullName,
        email: application.applicant.email,
        profile: application.applicant.applicantProfile,
      },
      scheme: {
        id: application.scheme.id,
        code: application.scheme.code,
        name: application.scheme.name,
        version: {
          id: application.schemeVersion.id,
          versionNumber: application.schemeVersion.versionNumber,
          academicYear: application.schemeVersion.academicYear,
        },
      },
      documents: documentsWithViewUrls,
      ruleEvaluation,
      aiFindings: {
        overallConfidence,
        overallPassed,
        blockingFailuresCount,
        warningCount,
        hasFlag,
        flagCount: openDeficiencies.length + blockingFailuresCount,
        recommendation,
      },
      deficiencyHistory: application.deficiencies,
      priorReviews: application.reviews,
    };
  }

  /**
   * Submits a scrutiny officer decision (APPROVE or REQUEST_CORRECTION).
   * Enforces mandatory justification when overriding AI or rule deficiencies.
   */
  async submitOfficerReview(
    applicationId: string,
    officer: OrchestratorActor,
    input: SubmitOfficerReviewInput,
    context?: RequestAuditContext
  ): Promise<Application> {
    const officerUserId = officer.userId || officer.id;
    if (!officerUserId) {
      throw new BadRequestError('Officer user ID is required to submit scrutiny review');
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scheme: true,
        schemeVersion: true,
        documents: { where: { isCurrent: true } },
        deficiencies: { where: { status: DeficiencyStatus.OPEN } },
      },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    // Status guard: DRAFT or REJECTED applications cannot be reviewed
    if (
      application.status === ApplicationStatus.DRAFT ||
      application.status === ApplicationStatus.REJECTED
    ) {
      throw new BadRequestError(
        `Application cannot be reviewed from status '${application.status}'. Only submitted applications can be reviewed.`
      );
    }

    // Determine whether active AI or Rule deficiencies exist
    const ruleResults = (application.ruleEvaluationResults as Record<string, unknown>) || {};
    const overallPassed = ruleResults.overallPassed !== false;
    const blockingFailuresCount = Number(ruleResults.blockingFailuresCount ?? 0);
    const openDeficiencies = application.deficiencies;
    const deficientDocs = application.documents.filter(
      (d) => d.verificationStatus === VerificationStatus.FLAGGED_DEFICIENT
    );

    const hasAiOrRuleFlags =
      application.status === ApplicationStatus.DEFICIENCY_RAISED ||
      !overallPassed ||
      blockingFailuresCount > 0 ||
      openDeficiencies.length > 0 ||
      deficientDocs.length > 0;

    const isApproving =
      input.decision === 'APPROVE' ||
      (input.decision as unknown as ReviewDecision) === ReviewDecision.APPROVE ||
      (input.decision as unknown as ReviewDecision) === ReviewDecision.RECOMMENDED_FOR_SELECTION;

    const isOverride =
      (isApproving && hasAiOrRuleFlags) || Boolean(input.overrideUsed);

    // Strict human governance rule: justification is mandatory on override
    if (isOverride && (!input.justification || !input.justification.trim())) {
      throw new BadRequestError(
        'Officer justification is mandatory when approving an application with active AI or rule deficiencies (override).'
      );
    }

    const targetStatus = isApproving
      ? ApplicationStatus.SCRUTINY_APPROVED
      : ApplicationStatus.DEFICIENCY_RAISED;

    const mappedDecision: ReviewDecision = isApproving
      ? ReviewDecision.APPROVE
      : ReviewDecision.REQUEST_CORRECTION;

    // Atomic transaction
    const updatedApplication = await prisma.$transaction(async (tx) => {
      // 1. If approving and overriding open deficiencies, mark them WAIVED
      if (isApproving && openDeficiencies.length > 0) {
        for (const def of openDeficiencies) {
          await tx.deficiencyRecord.update({
            where: { id: def.id },
            data: {
              status: DeficiencyStatus.WAIVED,
              isResolved: true,
              resolvedAt: new Date(),
              resolutionNote: `Waived by Officer override: ${input.justification || input.remarks}`,
              resolutionNotes: `Waived by Officer override: ${input.justification || input.remarks}`,
            },
          });
        }
      }

      // 2. If requesting correction, raise any newly specified or general deficiency records
      if (!isApproving) {
        if (input.deficiencies && input.deficiencies.length > 0) {
          for (const def of input.deficiencies) {
            await tx.deficiencyRecord.create({
              data: {
                applicationId: application.id,
                documentId: def.documentId ?? null,
                fieldOrCriteria: def.fieldOrCriteria,
                deficiencyCode: def.deficiencyCode,
                description: def.description,
                status: DeficiencyStatus.OPEN,
                isResolved: false,
                raisedByOfficerId: officerUserId,
              },
            });
          }
        } else {
          // General correction request recorded on application
          await tx.deficiencyRecord.create({
            data: {
              applicationId: application.id,
              fieldOrCriteria: 'OFFICER_SCRUTINY',
              deficiencyCode: 'CORRECTION_REQUIRED',
              description: input.remarks,
              status: DeficiencyStatus.OPEN,
              isResolved: false,
              raisedByOfficerId: officerUserId,
            },
          });
        }

        // Log DEFICIENCY_RAISED
        await auditService.logAction(
          {
            userId: officerUserId,
            actorRole: officer.role,
            action: AuditAction.DEFICIENCY_RAISED,
            entityType: 'Application',
            entityId: application.id,
            applicationId: application.id,
            metadata: {
              remarks: input.remarks,
              deficienciesCount: input.deficiencies?.length || 1,
            },
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
          },
          tx
        );
      }

      // 3. Create OfficerReview record
      await tx.officerReview.create({
        data: {
          applicationId: application.id,
          officerId: officerUserId,
          decision: mappedDecision,
          remarks: input.remarks,
          checklistResults: (input.checklistResults || {}) as Prisma.InputJsonValue,
          aiFindingsAgreement: !isOverride,
          overrideReason: isOverride ? (input.justification ?? null) : null,
          reviewedAt: new Date(),
        },
      });

      // 4. Update Application status
      const updated = await tx.application.update({
        where: { id: application.id },
        data: {
          status: targetStatus,
        },
        include: {
          scheme: true,
          schemeVersion: true,
          documents: { where: { isCurrent: true } },
          deficiencies: true,
          reviews: {
            orderBy: { reviewedAt: 'desc' },
          },
        },
      });

      // 5. Record AuditLog
      await auditService.logAction(
        {
          userId: officerUserId,
          actorRole: officer.role,
          action: AuditAction.OFFICER_REVIEW_SUBMITTED,
          entityType: 'Application',
          entityId: application.id,
          applicationId: application.id,
          previousState: application.status,
          newState: targetStatus,
          metadata: {
            decision: mappedDecision,
            targetStatus,
            isOverride,
            justification: input.justification ?? null,
            remarks: input.remarks,
            checklistResults: input.checklistResults ?? {},
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return updated;
    });

    return updatedApplication;
  }
}

export const scrutinyService = new ScrutinyService();
