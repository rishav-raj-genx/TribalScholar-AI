import { Prisma } from '@prisma/client';
import {
  ApplicationStatus,
  AuditAction,
  PostSelectionStatus,
  ReviewDecision,
  Role,
  SchemeCode,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { mockDbtAdapter } from '../../adapters/mockDbt.adapter.js';
import { auditService } from '../audit/audit.service.js';
import { BadRequestError, NotFoundError } from '../../middleware/errorHandler.js';
import type { RequestAuditContext } from '../scrutiny/orchestrator.service.js';
import type { DbtTriggerResult } from '../../adapters/interfaces.js';

export interface SelectionOfficerActor {
  id: string;
  email: string;
  role: Role;
}

export interface SelectionDecisionInput {
  decision: 'SELECTED' | 'REJECTED';
  remarks: string;
  sanctionedAmount?: number | undefined;
  awardLetterUrl?: string | undefined;
  visaStatus?: string | undefined;
}

export interface PostSelectionUpdateInput {
  institutionalVerification?: boolean | undefined;
  joiningReportSubmitted?: boolean | undefined;
  joiningDate?: string | Date | undefined;
  visaStatus?: string | undefined;
  triggerDisbursement?: boolean | undefined;
  disbursementAmount?: number | undefined;
  installmentNumber?: number | undefined;
  remarks?: string | undefined;
}

export interface SelectionDecideResponse {
  applicationId: string;
  applicationNumber: string;
  status: ApplicationStatus;
  decision: 'SELECTED' | 'REJECTED';
  postSelection?: {
    id: string;
    status: PostSelectionStatus;
    sanctionOrderNumber: string | null;
    sanctionedAmount: number | null;
    awardLetterUrl: string | null;
    visaStatus: string | null;
    joiningReportSubmitted: boolean;
  } | null;
}

export interface PostSelectionUpdateResponse {
  applicationId: string;
  applicationNumber: string;
  postSelectionStatus: PostSelectionStatus;
  joiningReportSubmitted: boolean;
  joiningDate: Date | null;
  visaStatus: string | null;
  disbursementTriggered: boolean;
  dbtResult?: DbtTriggerResult | null;
}

export interface SelectionQueueItem {
  id: string;
  applicationNumber: string;
  schemeCode: string;
  schemeName: string;
  applicantName: string;
  applicantEmail: string;
  status: ApplicationStatus;
  meritScore: number | null;
  postSelectionStatus: PostSelectionStatus | null;
  sanctionOrderNumber: string | null;
  sanctionedAmount: number | null;
  submittedAt: Date | null;
  createdAt: Date;
}

export interface SelectionQueueFilters {
  schemeCode?: string | undefined;
  status?: string | undefined;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export class SelectionService {
  /**
   * Final Selection Committee award decision (SELECTED or REJECTED).
   * Requires application to be in SCRUTINY_APPROVED status.
   * If SELECTED, generates award reference and sanction order, creates PostSelectionRecord,
   * updates status to PROVISIONALLY_SELECTED, and records SELECTION_DECISION_RECORDED audit log.
   */
  async decideApplication(
    applicationId: string,
    officer: SelectionOfficerActor,
    input: SelectionDecisionInput,
    context?: RequestAuditContext
  ): Promise<SelectionDecideResponse> {
    let application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scheme: true,
        schemeVersion: true,
        applicant: {
          include: {
            applicantProfile: true,
          },
        },
        postSelection: true,
      },
    });

    if (!application) {
      application = await prisma.application.findUnique({
        where: { applicationNumber: applicationId },
        include: {
          scheme: true,
          schemeVersion: true,
          applicant: {
            include: {
              applicantProfile: true,
            },
          },
          postSelection: true,
        },
      });
    }

    if (!application) {
      throw new NotFoundError(`Application not found with ID: ${applicationId}`);
    }

    // Guard: Only applications verified & approved by scrutiny can receive a final selection decision
    const eligibleStatuses: ApplicationStatus[] = [
      ApplicationStatus.SCRUTINY_APPROVED,
      ApplicationStatus.SELECTION_PENDING,
      ApplicationStatus.SCRUTINY_VERIFIED,
    ];

    if (!eligibleStatuses.includes(application.status as ApplicationStatus)) {
      throw new BadRequestError(
        `Application in status '${application.status}' cannot receive a selection decision. Application must be in SCRUTINY_APPROVED status.`
      );
    }

    if (input.decision === 'SELECTED') {
      const academicYearClean = (application.schemeVersion.academicYear || '2026').replace(
        /[^A-Za-z0-9]/g,
        ''
      );
      const sanctionOrderNumber = `SANCTION-MOTA-${application.scheme.code}-${academicYearClean}-${application.applicationNumber}`;
      const defaultAwardAmount = 350000.0; // ₹3.5 Lakhs default fellowship allocation
      const sanctionedAmount = input.sanctionedAmount ?? defaultAwardAmount;
      const awardLetterUrl =
        input.awardLetterUrl ?? `/api/v1/storage/documents/awards/${sanctionOrderNumber}.pdf`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Update Application status to PROVISIONALLY_SELECTED
        const updatedApp = await tx.application.update({
          where: { id: application.id },
          data: {
            status: ApplicationStatus.PROVISIONALLY_SELECTED,
          },
        });

        // 2. Create or Upsert PostSelectionRecord
        const initialMilestone = {
          milestone: PostSelectionStatus.AWARD_LETTER_ISSUED,
          timestamp: new Date().toISOString(),
          officerId: officer.id,
          officerEmail: officer.email,
          sanctionOrderNumber,
          sanctionedAmount,
          remarks: input.remarks,
        };

        const postSelection = await tx.postSelectionRecord.upsert({
          where: { applicationId: application.id },
          create: {
            applicationId: application.id,
            status: PostSelectionStatus.AWARD_LETTER_ISSUED,
            awardLetterUrl,
            sanctionOrderNumber,
            sanctionedAmount: new Prisma.Decimal(sanctionedAmount),
            visaStatus:
              input.visaStatus ??
              (application.scheme.code === SchemeCode.NOS ? 'NOT_APPLIED' : null),
            joiningReportSubmitted: false,
            milestoneLogs: [initialMilestone] as Prisma.InputJsonValue,
          },
          update: {
            status: PostSelectionStatus.AWARD_LETTER_ISSUED,
            awardLetterUrl,
            sanctionOrderNumber,
            sanctionedAmount: new Prisma.Decimal(sanctionedAmount),
            ...(input.visaStatus !== undefined ? { visaStatus: input.visaStatus } : {}),
            updatedAt: new Date(),
          },
        });

        // 3. Record OfficerReview for Selection Committee
        await tx.officerReview.create({
          data: {
            applicationId: application.id,
            officerId: officer.id,
            decision: ReviewDecision.RECOMMENDED_FOR_SELECTION,
            remarks: input.remarks,
            checklistResults: {
              selectionCommitteeApproved: true,
              sanctionOrderGenerated: true,
            },
            aiFindingsAgreement: true,
          },
        });

        // 4. Record Audit Log
        await auditService.logAction(
          {
            userId: officer.id,
            actorRole: officer.role,
            action: AuditAction.SELECTION_DECISION_RECORDED,
            entityType: 'Application',
            entityId: applicationId,
            applicationId,
            previousState: application.status,
            newState: ApplicationStatus.PROVISIONALLY_SELECTED,
            metadata: {
              decision: 'SELECTED',
              sanctionOrderNumber,
              sanctionedAmount,
              remarks: input.remarks,
              officerEmail: officer.email,
              officerRole: officer.role,
            },
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
          },
          tx
        );

        return { updatedApp, postSelection };
      });

      return {
        applicationId: result.updatedApp.id,
        applicationNumber: result.updatedApp.applicationNumber,
        status: result.updatedApp.status as ApplicationStatus,
        decision: 'SELECTED',
        postSelection: {
          id: result.postSelection.id,
          status: result.postSelection.status as PostSelectionStatus,
          sanctionOrderNumber: result.postSelection.sanctionOrderNumber,
          sanctionedAmount: result.postSelection.sanctionedAmount
            ? Number(result.postSelection.sanctionedAmount)
            : null,
          awardLetterUrl: result.postSelection.awardLetterUrl,
          visaStatus: result.postSelection.visaStatus,
          joiningReportSubmitted: result.postSelection.joiningReportSubmitted,
        },
      };
    }

    // input.decision === 'REJECTED'
    const result = await prisma.$transaction(async (tx) => {
      const updatedApp = await tx.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.REJECTED,
        },
      });

      await tx.officerReview.create({
        data: {
          applicationId,
          officerId: officer.id,
          decision: ReviewDecision.REJECTED,
          remarks: input.remarks,
          checklistResults: {
            selectionCommitteeApproved: false,
          },
          aiFindingsAgreement: true,
        },
      });

      await auditService.logAction(
        {
          userId: officer.id,
          actorRole: officer.role,
          action: AuditAction.SELECTION_DECISION_RECORDED,
          entityType: 'Application',
          entityId: applicationId,
          applicationId,
          previousState: application.status,
          newState: ApplicationStatus.REJECTED,
          metadata: {
            decision: 'REJECTED',
            remarks: input.remarks,
            officerEmail: officer.email,
            officerRole: officer.role,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return updatedApp;
    });

    return {
      applicationId: result.id,
      applicationNumber: result.applicationNumber,
      status: result.status as ApplicationStatus,
      decision: 'REJECTED',
      postSelection: null,
    };
  }

  /**
   * Updates post-selection lifecycle:
   * - Institutional verification (joining report toggle & date)
   * - Visa status (for NOS scholars)
   * - Simulated DBT disbursement trigger via mockDbtAdapter
   */
  async updatePostSelection(
    applicationId: string,
    officer: SelectionOfficerActor,
    input: PostSelectionUpdateInput,
    context?: RequestAuditContext
  ): Promise<PostSelectionUpdateResponse> {
    let application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        applicant: {
          include: {
            applicantProfile: true,
          },
        },
        postSelection: true,
      },
    });

    if (!application) {
      application = await prisma.application.findUnique({
        where: { applicationNumber: applicationId },
        include: {
          applicant: {
            include: {
              applicantProfile: true,
            },
          },
          postSelection: true,
        },
      });
    }

    if (!application) {
      throw new NotFoundError(`Application not found with ID: ${applicationId}`);
    }

    if (!application.postSelection) {
      throw new BadRequestError(
        'Application does not have a post-selection record. Award decision must be SELECTED first.'
      );
    }

    const currentPostSelection = application.postSelection;
    const isJoiningReportSubmitted =
      input.institutionalVerification === true ||
      input.joiningReportSubmitted === true ||
      currentPostSelection.joiningReportSubmitted;

    // Check disbursement prerequisite: Institutional verification must be complete before DBT disbursement
    if (input.triggerDisbursement === true && !isJoiningReportSubmitted) {
      throw new BadRequestError(
        'Institutional verification (joining report) must be submitted before triggering DBT disbursement'
      );
    }

    let dbtResult: DbtTriggerResult | null = null;
    let nextStatus: PostSelectionStatus = currentPostSelection.status as PostSelectionStatus;

    if (
      isJoiningReportSubmitted &&
      currentPostSelection.status === PostSelectionStatus.AWARD_LETTER_ISSUED
    ) {
      nextStatus = PostSelectionStatus.JOINING_REPORT_SUBMITTED;
    }

    if (input.triggerDisbursement === true) {
      const disbursementAmount =
        input.disbursementAmount ??
        (currentPostSelection.sanctionedAmount
          ? Number(currentPostSelection.sanctionedAmount) / 4
          : 87500.0);
      const installmentNumber = input.installmentNumber ?? 1;
      const bankIfsc = application.applicant.applicantProfile?.bankIfsc || 'SBIN0001234';

      dbtResult = await mockDbtAdapter.simulatePaymentTrigger({
        applicationId: application.id,
        amount: disbursementAmount,
        installmentNumber,
        bankIfsc,
      });

      nextStatus = PostSelectionStatus.DISBURSEMENT_ACTIVE;
    }

    // Build milestone log
    const existingMilestones = Array.isArray(currentPostSelection.milestoneLogs)
      ? (currentPostSelection.milestoneLogs as Array<Record<string, unknown>>)
      : [];

    const newMilestone = {
      action: 'POST_SELECTION_UPDATE',
      status: nextStatus,
      timestamp: new Date().toISOString(),
      officerId: officer.id,
      officerEmail: officer.email,
      institutionalVerification: isJoiningReportSubmitted,
      joiningDate: input.joiningDate
        ? new Date(input.joiningDate).toISOString()
        : currentPostSelection.joiningDate?.toISOString() ?? null,
      disbursementTriggered: Boolean(dbtResult),
      dbtReference: dbtResult ? dbtResult.pfmsReference : null,
      remarks: input.remarks ?? null,
    };

    // Build disbursement details
    const existingDetails =
      (currentPostSelection.disbursementDetails as Record<string, unknown>) || {};
    const disbursements = Array.isArray(existingDetails.disbursements)
      ? [...(existingDetails.disbursements as unknown[])]
      : [];

    if (dbtResult) {
      disbursements.push(dbtResult);
    }

    const updatedDisbursementDetails = {
      ...existingDetails,
      ...(dbtResult ? { lastTrigger: dbtResult, disbursements } : {}),
    };

    const parsedJoiningDate = input.joiningDate
      ? new Date(input.joiningDate)
      : isJoiningReportSubmitted && !currentPostSelection.joiningDate
        ? new Date()
        : currentPostSelection.joiningDate;

    const result = await prisma.$transaction(async (tx) => {
      const updateData: Prisma.PostSelectionRecordUpdateInput = {
        status: nextStatus,
        joiningReportSubmitted: isJoiningReportSubmitted,
        joiningDate: parsedJoiningDate,
        ...(input.visaStatus !== undefined ? { visaStatus: input.visaStatus } : {}),
        ...(dbtResult
          ? {
              disbursementDetails: JSON.parse(
                JSON.stringify(updatedDisbursementDetails)
              ) as Prisma.InputJsonValue,
            }
          : {}),
        milestoneLogs: JSON.parse(
          JSON.stringify([...existingMilestones, newMilestone])
        ) as Prisma.InputJsonValue,
        updatedAt: new Date(),
      };

      const updatedPostSelection = await tx.postSelectionRecord.update({
        where: { applicationId },
        data: updateData,
      });

      await auditService.logAction(
        {
          userId: officer.id,
          actorRole: officer.role,
          action: AuditAction.APPLICATION_UPDATED,
          entityType: 'Application',
          entityId: applicationId,
          applicationId,
          previousState: currentPostSelection.status,
          newState: nextStatus,
          metadata: {
            action: 'POST_SELECTION_UPDATED',
            institutionalVerification: isJoiningReportSubmitted,
            joiningDate: parsedJoiningDate?.toISOString() ?? null,
            visaStatus: input.visaStatus ?? currentPostSelection.visaStatus,
            disbursementTriggered: Boolean(dbtResult),
            dbtResult: dbtResult
              ? (JSON.parse(JSON.stringify(dbtResult)) as Record<string, unknown>)
              : null,
            remarks: input.remarks ?? null,
            officerEmail: officer.email,
            officerRole: officer.role,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return updatedPostSelection;
    });

    return {
      applicationId: application.id,
      applicationNumber: application.applicationNumber,
      postSelectionStatus: result.status as PostSelectionStatus,
      joiningReportSubmitted: result.joiningReportSubmitted,
      joiningDate: result.joiningDate,
      visaStatus: result.visaStatus,
      disbursementTriggered: Boolean(dbtResult),
      dbtResult,
    };
  }

  /**
   * Retrieves complete post-selection details including award references,
   * verification milestones, and simulated live DBT/PFMS disbursement status.
   */
  async getPostSelectionDetails(applicationId: string): Promise<Record<string, unknown>> {
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
        reviews: {
          include: {
            officer: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: { reviewedAt: 'desc' },
        },
        postSelection: true,
      },
    });

    if (!application) {
      throw new NotFoundError(`Application not found with ID: ${applicationId}`);
    }

    let liveDbtStatus = null;
    if (application.postSelection) {
      liveDbtStatus = await mockDbtAdapter.getDisbursementStatus({
        applicationId: application.id,
        beneficiaryId: application.applicant.id,
      });
    }

    return {
      application: {
        id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status,
        submittedAt: application.submittedAt,
        createdAt: application.createdAt,
      },
      applicant: {
        id: application.applicant.id,
        fullName: application.applicant.fullName,
        email: application.applicant.email,
        profile: application.applicant.applicantProfile,
      },
      scheme: {
        code: application.scheme.code,
        name: application.scheme.name,
        academicYear: application.schemeVersion.academicYear,
      },
      postSelection: application.postSelection,
      liveDbtStatus,
      reviews: application.reviews,
    };
  }

  /**
   * Selection queue for Selection Officers to view applications eligible for selection or decided.
   */
  async getSelectionQueue(filters: SelectionQueueFilters): Promise<{
    items: SelectionQueueItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ApplicationWhereInput = {};

    if (filters.schemeCode) {
      where.scheme = { code: filters.schemeCode.toUpperCase() as SchemeCode };
    }

    if (filters.status) {
      where.status = filters.status as ApplicationStatus;
    } else {
      where.status = {
        in: [
          ApplicationStatus.SCRUTINY_APPROVED,
          ApplicationStatus.SELECTION_PENDING,
          ApplicationStatus.PROVISIONALLY_SELECTED,
          ApplicationStatus.REJECTED,
        ],
      };
    }

    if (filters.search) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { applicationNumber: { contains: searchTerm, mode: 'insensitive' } },
        { applicant: { fullName: { contains: searchTerm, mode: 'insensitive' } } },
        { applicant: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [total, apps] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        include: {
          scheme: true,
          applicant: true,
          postSelection: true,
        },
        orderBy: [{ meritScore: 'desc' }, { submittedAt: 'asc' }],
      }),
    ]);

    const items: SelectionQueueItem[] = apps.map((app) => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      schemeCode: app.scheme.code,
      schemeName: app.scheme.name,
      applicantName: app.applicant.fullName,
      applicantEmail: app.applicant.email,
      status: app.status as ApplicationStatus,
      meritScore: app.meritScore,
      postSelectionStatus: (app.postSelection?.status as PostSelectionStatus) ?? null,
      sanctionOrderNumber: app.postSelection?.sanctionOrderNumber ?? null,
      sanctionedAmount: app.postSelection?.sanctionedAmount
        ? Number(app.postSelection.sanctionedAmount)
        : null,
      submittedAt: app.submittedAt,
      createdAt: app.createdAt,
    }));

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
}

export const selectionService = new SelectionService();
