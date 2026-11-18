import { Prisma, type Application } from '@prisma/client';
import {
  ApplicationStatus,
  AuditAction,
  DeficiencyStatus,
  DocumentType,
  Role,
  VerificationStatus,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { storageService } from '../storage/storage.service.js';
import {
  ocrClientService,
  type OcrAnalyzeDocumentResponse,
  type OcrExtractedField,
  type OcrFieldEvidence,
} from '../ocrClient/ocrClient.service.js';
import {
  evaluateApplicationRules,
  type ApplicantProfileLike,
  type SchemeVersionLike,
  type OcrDocumentInput,
  type OcrExtractedFieldItem,
} from '../ruleEngine/index.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../middleware/errorHandler.js';
import { logger } from '../../lib/logger.js';

export interface OrchestratorActor {
  userId?: string | undefined;
  id?: string | undefined;
  role: Role;
}

export interface RequestAuditContext {
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export interface ResolveDeficienciesOptions {
  resolutionNote?: string | undefined;
  resolutionNotes?: string | undefined;
  deficiencyIds?: string[] | undefined;
  forceOcr?: boolean | undefined;
}

export class ScrutinyOrchestratorService {
  /**
   * Submits an application and executes the end-to-end evaluation pipeline:
   * 1. Validates ownership and submission status guard.
   * 2. Retrieves current document buffers and dispatches them to the FastAPI AI OCR microservice.
   * 3. Updates ApplicationDocument records with extracted fields and evidence tags.
   * 4. Evaluates versioned SchemeVersion eligibility and cross-document consistency rules.
   * 5. If deficiencies exist, raises DeficiencyRecord entries and transitions status to DEFICIENCY_RAISED.
   *    If all checks pass cleanly, transitions status to UNDER_SCRUTINY.
   * 6. Atomically commits all changes with full audit logging.
   */
  async submitAndEvaluateApplication(
    applicationId: string,
    actor: OrchestratorActor,
    context?: RequestAuditContext
  ): Promise<Application> {
    const actorUserId = actor.userId || actor.id;
    if (!actorUserId) {
      throw new BadRequestError('Actor user ID is required to execute submission orchestration');
    }

    // 1. Fetch Application with relations
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
        },
      },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    // 2. Strict ownership guard
    if (actor.role === Role.APPLICANT && application.applicantId !== actorUserId) {
      throw new ForbiddenError('You do not have permission to submit this application');
    }

    // 3. Status guard: only DRAFT, DEFICIENT, DEFICIENCY_RAISED, or RESUBMITTED applications can be submitted
    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.DEFICIENT &&
      application.status !== ApplicationStatus.DEFICIENCY_RAISED &&
      application.status !== ApplicationStatus.RESUBMITTED
    ) {
      throw new BadRequestError(
        `Application cannot be submitted from status '${application.status}'. Only DRAFT or DEFICIENT applications can be submitted.`
      );
    }

    // 4. Verify Applicant Profile exists
    const profile = application.applicant.applicantProfile;
    if (!profile) {
      throw new BadRequestError(
        'Applicant profile must be completed before submitting the scholarship application'
      );
    }

    const currentDocs = application.documents;

    // 5. Build applicant form context for OCR cross-checking
    const applicantContext = {
      name: application.applicant.fullName,
      applicantName: application.applicant.fullName,
      annualIncome: Number(profile.annualIncome),
      annualFamilyIncome: Number(profile.annualIncome),
      category: profile.casteCommunity,
      state: profile.state,
      stateDomicile: profile.state,
      gender: profile.gender,
    };

    // 6. Process each current document through AI OCR microservice
    const ocrResults: Array<{
      doc: (typeof currentDocs)[number];
      ocrResult: OcrAnalyzeDocumentResponse;
    }> = [];

    for (const doc of currentDocs) {
      let fileBase64: string | undefined;
      try {
        const buffer = await storageService.getDocumentBuffer(doc.s3Key, doc.s3Bucket);
        fileBase64 = buffer.toString('base64');
      } catch (err: unknown) {
        logger.warn(
          `[ScrutinyOrchestrator] Could not load document buffer for ${doc.id} (${(err as Error).message}).`
        );
      }

      const ocrResult = await ocrClientService.analyzeDocument({
        documentId: doc.id,
        expectedType: doc.documentType as unknown as DocumentType,
        fileBase64,
        filename: doc.fileName,
        applicantContext,
      });

      ocrResults.push({ doc, ocrResult });

      // Update ApplicationDocument with OCR extractions and evidence
      const verificationStatus =
        ocrResult.status === 'VERIFIED'
          ? VerificationStatus.VERIFIED
          : VerificationStatus.FLAGGED_DEFICIENT;

      const rejectionReason =
        ocrResult.deficiencyReasons.length > 0 ? ocrResult.deficiencyReasons.join('; ') : null;

      await prisma.applicationDocument.update({
        where: { id: doc.id },
        data: {
          verificationStatus,
          ocrExtractedFields: ocrResult.extractedFields as unknown as Prisma.InputJsonValue,
          ocrConfidence: ocrResult.overallConfidence,
          crossDocValidation: {
            comparisons: ocrResult.comparisons,
            classification: ocrResult.classification,
          } as unknown as Prisma.InputJsonValue,
          rejectionReason,
        },
      });

      // Audit log OCR completion for document
      await auditService.logAction({
        userId: actorUserId,
        actorRole: actor.role,
        action: AuditAction.OCR_PROCESSED,
        entityType: 'ApplicationDocument',
        entityId: doc.id,
        applicationId: application.id,
        metadata: {
          documentType: doc.documentType,
          status: ocrResult.status,
          confidence: ocrResult.overallConfidence,
          deficiencies: ocrResult.deficiencyReasons,
        },
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
      });
    }

    // 7. Execute versioned SchemeVersion rule engine
    const applicantProfileLike: ApplicantProfileLike = {
      dateOfBirth: profile.dateOfBirth.toISOString().split('T')[0]!,
      gender: profile.gender,
      casteCommunity: profile.casteCommunity,
      fatherOrSpouseName: profile.fatherOrSpouseName,
      annualIncome: Number(profile.annualIncome),
      addressLine: profile.addressLine,
      state: profile.state,
      district: profile.district,
      pincode: profile.pincode,
      aadhaarVerified:
        Boolean(profile.aadhaarNumberHash) ||
        Boolean((application.formData as Record<string, unknown>)?.aadhaarVerified) ||
        Boolean(
          ((application.formData as Record<string, unknown>)?.applicant as Record<string, unknown>)
            ?.aadhaarVerified
        ),
      ...(profile.subTribe ? { subTribe: profile.subTribe } : {}),
      ...(profile.bankIfsc ? { bankIfsc: profile.bankIfsc } : {}),
      ...(profile.bankName ? { bankName: profile.bankName } : {}),
    };

    const extractedDocumentsForEngine: OcrDocumentInput[] = ocrResults.map(
      ({ doc, ocrResult }) => {
        const fieldItems: Record<string, OcrExtractedFieldItem> = {};
        for (const [key, field] of Object.entries(ocrResult.extractedFields || {})) {
          fieldItems[key] = {
            value: field.value,
            rawText: field.rawText ?? String(field.value),
            confidence: field.confidence,
            pageNumber: field.evidence?.page ?? 1,
          };
        }
        return {
          documentType: doc.documentType as unknown as DocumentType,
          documentId: doc.id,
          overallConfidence: ocrResult.overallConfidence,
          extractedFields: fieldItems,
        };
      }
    );

    const ruleEvaluation = evaluateApplicationRules({
      applicationId: application.id,
      schemeVersion: application.schemeVersion as unknown as SchemeVersionLike,
      applicantProfile: applicantProfileLike,
      formData: (application.formData as Record<string, unknown>) || {},
      uploadedDocuments: currentDocs.map((d) => d.documentType as unknown as DocumentType),
      extractedDocuments: extractedDocumentsForEngine,
      extraContext: {
        applicantName: application.applicant.fullName,
        annualFamilyIncome: Number(profile.annualIncome),
        category: profile.casteCommunity,
        stateDomicile: profile.state,
      },
    });

    // Audit log rule evaluation
    await auditService.logAction({
      userId: actorUserId,
      actorRole: actor.role,
      action: AuditAction.RULE_EVALUATED,
      entityType: 'Application',
      entityId: application.id,
      applicationId: application.id,
      metadata: {
        isEligible: ruleEvaluation.isEligible,
        isDocumentComplete: ruleEvaluation.isDocumentComplete,
        isCrossDocConsistent: ruleEvaluation.isCrossDocConsistent,
        overallPassed: ruleEvaluation.overallPassed,
        blockingFailuresCount: ruleEvaluation.blockingFailuresCount,
        warningCount: ruleEvaluation.warningCount,
        deficienciesCount: ruleEvaluation.deficiencies.length,
      },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    // 8. Compile all deficiencies
    interface CompiledDeficiency {
      documentId?: string | undefined;
      fieldOrCriteria: string;
      deficiencyCode: string;
      description: string;
    }

    const compiledDeficiencies: CompiledDeficiency[] = [];

    // Deficiencies from Scheme Rule Engine (eligibility, document completeness, cross-doc consistency)
    for (const def of ruleEvaluation.deficiencies) {
      const matchingDoc = currentDocs.find(
        (d) => d.documentType === def.field || def.field.includes(d.documentType)
      );
      compiledDeficiencies.push({
        documentId: matchingDoc?.id,
        fieldOrCriteria: def.field,
        deficiencyCode: def.ruleId || 'RULE_FAILURE',
        description: def.deficiencyReason,
      });
    }

    // Additional document-level deficiencies from OCR analysis
    for (const { doc, ocrResult } of ocrResults) {
      if (ocrResult.status === 'DEFICIENT' || ocrResult.deficiencyReasons.length > 0) {
        for (const reason of ocrResult.deficiencyReasons) {
          const alreadyAdded = compiledDeficiencies.some(
            (cd) => cd.documentId === doc.id && cd.description === reason
          );
          if (!alreadyAdded) {
            compiledDeficiencies.push({
              documentId: doc.id,
              fieldOrCriteria: doc.documentType,
              deficiencyCode: 'OCR_DEFICIENCY',
              description: reason,
            });
          }
        }
      }
    }

    // 9. Determine target status
    const hasDeficiencies =
      compiledDeficiencies.length > 0 ||
      !ruleEvaluation.overallPassed ||
      ocrResults.some((r) => r.ocrResult.status === 'DEFICIENT');

    const targetStatus = hasDeficiencies
      ? ApplicationStatus.DEFICIENCY_RAISED
      : ApplicationStatus.UNDER_SCRUTINY;

    // 10. Atomic database transaction to persist state, deficiencies, and audit log
    const updatedApplication = await prisma.$transaction(async (tx) => {
      if (hasDeficiencies) {
        // Resolve officer ID to record on the deficiency
        let raisedByOfficerId = actorUserId;
        if (actor.role === Role.APPLICANT) {
          const officer = await tx.user.findFirst({
            where: { role: { in: [Role.SCRUTINY_OFFICER, Role.ADMIN] } },
            select: { id: true },
          });
          if (officer) {
            raisedByOfficerId = officer.id;
          }
        }

        // Create DeficiencyRecord entries
        for (const def of compiledDeficiencies) {
          await tx.deficiencyRecord.create({
            data: {
              applicationId: application.id,
              documentId: def.documentId ?? null,
              fieldOrCriteria: def.fieldOrCriteria,
              deficiencyCode: def.deficiencyCode,
              description: def.description,
              status: DeficiencyStatus.OPEN,
              isResolved: false,
              raisedByOfficerId,
            },
          });
        }

        // Log DEFICIENCY_RAISED
        await auditService.logAction(
          {
            userId: actorUserId,
            actorRole: actor.role,
            action: AuditAction.DEFICIENCY_RAISED,
            entityType: 'Application',
            entityId: application.id,
            applicationId: application.id,
            metadata: {
              deficienciesCount: compiledDeficiencies.length,
              deficiencies: compiledDeficiencies.map((d) => ({
                field: d.fieldOrCriteria,
                code: d.deficiencyCode,
                description: d.description,
              })),
            },
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
          },
          tx
        );
      }

      // Update Application record
      const app = await tx.application.update({
        where: { id: application.id },
        data: {
          status: targetStatus,
          submittedAt: new Date(),
          ruleEvaluationResults: JSON.parse(
            JSON.stringify(ruleEvaluation)
          ) as Prisma.InputJsonValue,
        },
        include: {
          scheme: true,
          schemeVersion: true,
          documents: { where: { isCurrent: true } },
          deficiencies: true,
        },
      });

      // Log APPLICATION_SUBMITTED
      await auditService.logAction(
        {
          userId: actorUserId,
          actorRole: actor.role,
          action: AuditAction.APPLICATION_SUBMITTED,
          entityType: 'Application',
          entityId: application.id,
          applicationId: application.id,
          previousState: application.status,
          newState: targetStatus,
          metadata: {
            targetStatus,
            overallPassed: ruleEvaluation.overallPassed,
            deficienciesCount: compiledDeficiencies.length,
            documentsProcessed: currentDocs.length,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return app;
    });

    return updatedApplication;
  }

  /**
   * Resolves open deficiencies on an application, executes delta OCR re-verification
   * on newly uploaded or pending document versions, re-evaluates pinned SchemeVersion rules,
   * updates resolved DeficiencyRecord items with timestamps and notes, and transitions
   * application status to UNDER_SCRUTINY (or keeps DEFICIENCY_RAISED if issues remain).
   */
  async resolveDeficienciesAndReverify(
    applicationId: string,
    actor: OrchestratorActor,
    options?: ResolveDeficienciesOptions,
    context?: RequestAuditContext
  ): Promise<Application> {
    const actorUserId = actor.userId || actor.id;
    if (!actorUserId) {
      throw new BadRequestError('Actor user ID is required to resolve deficiencies');
    }

    // 1. Fetch application with current documents, deficiencies, scheme, schemeVersion, and applicantProfile
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
        },
        deficiencies: {
          where: { status: DeficiencyStatus.OPEN },
        },
      },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    // 2. Strict ownership guard
    if (actor.role === Role.APPLICANT && application.applicantId !== actorUserId) {
      throw new ForbiddenError(
        'You do not have permission to resolve deficiencies for this application'
      );
    }

    // 3. Status guard: only DEFICIENCY_RAISED (or DEFICIENT) applications can be resolved
    if (
      application.status !== ApplicationStatus.DEFICIENCY_RAISED &&
      application.status !== ApplicationStatus.DEFICIENT
    ) {
      throw new BadRequestError(
        `Application cannot be resolved from status '${application.status}'. Only DEFICIENCY_RAISED or DEFICIENT applications can be resolved.`
      );
    }

    // 4. Verify Applicant Profile exists
    const profile = application.applicant.applicantProfile;
    if (!profile) {
      throw new BadRequestError(
        'Applicant profile must be completed before re-verifying the scholarship application'
      );
    }

    const currentDocs = application.documents;
    const note =
      options?.resolutionNote?.trim() ||
      options?.resolutionNotes?.trim() ||
      'Deficiency resolved by applicant with updated documents and resubmitted for verification';

    // 5. Delta AI Re-Verification
    const applicantContext = {
      name: application.applicant.fullName,
      applicantName: application.applicant.fullName,
      annualIncome: Number(profile.annualIncome),
      annualFamilyIncome: Number(profile.annualIncome),
      category: profile.casteCommunity,
      state: profile.state,
      stateDomicile: profile.state,
      gender: profile.gender,
    };

    const ocrResults: Array<{
      doc: (typeof currentDocs)[number];
      ocrResult: OcrAnalyzeDocumentResponse;
    }> = [];

    for (const doc of currentDocs) {
      const needsOcr =
        Boolean(options?.forceOcr) ||
        doc.verificationStatus === VerificationStatus.PENDING ||
        doc.verificationStatus === VerificationStatus.FLAGGED_DEFICIENT ||
        !doc.ocrExtractedFields;

      if (needsOcr) {
        let fileBase64: string | undefined;
        try {
          const buffer = await storageService.getDocumentBuffer(doc.s3Key, doc.s3Bucket);
          fileBase64 = buffer.toString('base64');
        } catch (err: unknown) {
          logger.warn(
            `[ScrutinyOrchestrator] Could not load document buffer for ${doc.id} during re-verification (${(err as Error).message}).`
          );
        }

        const ocrResult = await ocrClientService.analyzeDocument({
          documentId: doc.id,
          expectedType: doc.documentType as unknown as DocumentType,
          fileBase64,
          filename: doc.fileName,
          applicantContext,
        });

        ocrResults.push({ doc, ocrResult });

        const verificationStatus =
          ocrResult.status === 'VERIFIED'
            ? VerificationStatus.VERIFIED
            : VerificationStatus.FLAGGED_DEFICIENT;

        const rejectionReason =
          ocrResult.deficiencyReasons.length > 0 ? ocrResult.deficiencyReasons.join('; ') : null;

        await prisma.applicationDocument.update({
          where: { id: doc.id },
          data: {
            verificationStatus,
            ocrExtractedFields: ocrResult.extractedFields as unknown as Prisma.InputJsonValue,
            ocrConfidence: ocrResult.overallConfidence,
            crossDocValidation: {
              comparisons: ocrResult.comparisons,
              classification: ocrResult.classification,
            } as unknown as Prisma.InputJsonValue,
            rejectionReason,
          },
        });

        await auditService.logAction({
          userId: actorUserId,
          actorRole: actor.role,
          action: AuditAction.OCR_PROCESSED,
          entityType: 'ApplicationDocument',
          entityId: doc.id,
          applicationId: application.id,
          metadata: {
            documentType: doc.documentType,
            version: doc.version,
            status: ocrResult.status,
            confidence: ocrResult.overallConfidence,
            deficiencies: ocrResult.deficiencyReasons,
            isReverification: true,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        });
      } else {
        // Reuse previously verified OCR extraction
        const rawJsonFields =
          (doc.ocrExtractedFields as Record<string, Record<string, unknown>>) || {};
        const existingExtractions: Record<string, OcrExtractedField> = {};
        for (const [key, val] of Object.entries(rawJsonFields)) {
          if (val && typeof val === 'object') {
            existingExtractions[key] = {
              fieldName: String(val.fieldName ?? key),
              value: (val.value as string | number | boolean) ?? '',
              status: String(val.status ?? 'Extracted'),
              confidence: Number(val.confidence ?? doc.ocrConfidence ?? 0.95),
              rawText: typeof val.rawText === 'string' ? val.rawText : null,
              evidence: val.evidence ? (val.evidence as OcrFieldEvidence) : null,
            };
          }
        }

        const ocrResult: OcrAnalyzeDocumentResponse = {
          success: true,
          documentId: doc.id,
          documentType: doc.documentType as unknown as DocumentType,
          status: 'VERIFIED',
          overallConfidence: doc.ocrConfidence ?? 0.95,
          classification: {
            predictedType: doc.documentType as unknown as DocumentType,
            confidence: doc.ocrConfidence ?? 0.95,
            isMatch: true,
          },
          extractedFields: existingExtractions,
          comparisons: [],
          deficiencyReasons: [],
          processedAt: new Date().toISOString(),
        };

        ocrResults.push({ doc, ocrResult });
      }
    }

    // 6. Re-evaluate versioned SchemeVersion rules with current documents & profile
    const applicantProfileLike: ApplicantProfileLike = {
      dateOfBirth: profile.dateOfBirth.toISOString().split('T')[0]!,
      gender: profile.gender,
      casteCommunity: profile.casteCommunity,
      fatherOrSpouseName: profile.fatherOrSpouseName,
      annualIncome: Number(profile.annualIncome),
      addressLine: profile.addressLine,
      state: profile.state,
      district: profile.district,
      pincode: profile.pincode,
      aadhaarVerified:
        Boolean(profile.aadhaarNumberHash) ||
        Boolean((application.formData as Record<string, unknown>)?.aadhaarVerified) ||
        Boolean(
          ((application.formData as Record<string, unknown>)?.applicant as Record<string, unknown>)
            ?.aadhaarVerified
        ),
      ...(profile.subTribe ? { subTribe: profile.subTribe } : {}),
      ...(profile.bankIfsc ? { bankIfsc: profile.bankIfsc } : {}),
      ...(profile.bankName ? { bankName: profile.bankName } : {}),
    };

    const extractedDocumentsForEngine: OcrDocumentInput[] = ocrResults.map(
      ({ doc, ocrResult }) => {
        const fieldItems: Record<string, OcrExtractedFieldItem> = {};
        for (const [key, field] of Object.entries(ocrResult.extractedFields || {})) {
          fieldItems[key] = {
            value: field.value,
            rawText: field.rawText ?? String(field.value),
            confidence: field.confidence ?? 0.9,
            pageNumber: field.evidence?.page ?? 1,
          };
        }
        return {
          documentType: doc.documentType as unknown as DocumentType,
          documentId: doc.id,
          overallConfidence: ocrResult.overallConfidence,
          extractedFields: fieldItems,
        };
      }
    );

    const ruleEvaluation = evaluateApplicationRules({
      applicationId: application.id,
      schemeVersion: application.schemeVersion as unknown as SchemeVersionLike,
      applicantProfile: applicantProfileLike,
      formData: (application.formData as Record<string, unknown>) || {},
      uploadedDocuments: currentDocs.map((d) => d.documentType as unknown as DocumentType),
      extractedDocuments: extractedDocumentsForEngine,
      extraContext: {
        applicantName: application.applicant.fullName,
        annualFamilyIncome: Number(profile.annualIncome),
        category: profile.casteCommunity,
        stateDomicile: profile.state,
      },
    });

    await auditService.logAction({
      userId: actorUserId,
      actorRole: actor.role,
      action: AuditAction.RULE_EVALUATED,
      entityType: 'Application',
      entityId: application.id,
      applicationId: application.id,
      metadata: {
        isEligible: ruleEvaluation.isEligible,
        isDocumentComplete: ruleEvaluation.isDocumentComplete,
        isCrossDocConsistent: ruleEvaluation.isCrossDocConsistent,
        overallPassed: ruleEvaluation.overallPassed,
        blockingFailuresCount: ruleEvaluation.blockingFailuresCount,
        warningCount: ruleEvaluation.warningCount,
        deficienciesCount: ruleEvaluation.deficiencies.length,
        isReverification: true,
      },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    // 7. Check for remaining / newly detected deficiencies
    interface CompiledDeficiency {
      documentId?: string | undefined;
      fieldOrCriteria: string;
      deficiencyCode: string;
      description: string;
    }

    const remainingDeficiencies: CompiledDeficiency[] = [];

    for (const def of ruleEvaluation.deficiencies) {
      const matchingDoc = currentDocs.find(
        (d) => d.documentType === def.field || def.field.includes(d.documentType)
      );
      remainingDeficiencies.push({
        documentId: matchingDoc?.id,
        fieldOrCriteria: def.field,
        deficiencyCode: def.ruleId || 'RULE_FAILURE',
        description: def.deficiencyReason,
      });
    }

    for (const { doc, ocrResult } of ocrResults) {
      if (ocrResult.status === 'DEFICIENT' || ocrResult.deficiencyReasons.length > 0) {
        for (const reason of ocrResult.deficiencyReasons) {
          const alreadyAdded = remainingDeficiencies.some(
            (cd) => cd.documentId === doc.id && cd.description === reason
          );
          if (!alreadyAdded) {
            remainingDeficiencies.push({
              documentId: doc.id,
              fieldOrCriteria: doc.documentType,
              deficiencyCode: 'OCR_DEFICIENCY',
              description: reason,
            });
          }
        }
      }
    }

    const hasRemainingIssues =
      remainingDeficiencies.length > 0 ||
      !ruleEvaluation.overallPassed ||
      ocrResults.some((r) => r.ocrResult.status === 'DEFICIENT');

    const targetStatus = hasRemainingIssues
      ? ApplicationStatus.DEFICIENCY_RAISED
      : ApplicationStatus.UNDER_SCRUTINY;

    // 8. Atomic transaction
    const updatedApplication = await prisma.$transaction(async (tx) => {
      // Find open deficiencies to resolve
      const openDeficiencies = await tx.deficiencyRecord.findMany({
        where: {
          applicationId: application.id,
          status: DeficiencyStatus.OPEN,
          ...(options?.deficiencyIds && options.deficiencyIds.length > 0
            ? { id: { in: options.deficiencyIds } }
            : {}),
        },
      });

      const resolvedAt = new Date();

      for (const def of openDeficiencies) {
        await tx.deficiencyRecord.update({
          where: { id: def.id },
          data: {
            status: DeficiencyStatus.RESOLVED,
            isResolved: true,
            resolvedAt,
            resolutionNote: note,
            resolutionNotes: note,
          },
        });

        await auditService.logAction(
          {
            userId: actorUserId,
            actorRole: actor.role,
            action: AuditAction.DEFICIENCY_RESOLVED,
            entityType: 'DeficiencyRecord',
            entityId: def.id,
            applicationId: application.id,
            previousState: { status: def.status, isResolved: def.isResolved },
            newState: { status: DeficiencyStatus.RESOLVED, isResolved: true },
            metadata: {
              deficiencyCode: def.deficiencyCode,
              fieldOrCriteria: def.fieldOrCriteria,
              resolutionNote: note,
            },
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
          },
          tx
        );
      }

      // If issues remain, record new/unresolved DeficiencyRecord entries
      if (hasRemainingIssues) {
        let raisedByOfficerId = actorUserId;
        if (actor.role === Role.APPLICANT) {
          const officer = await tx.user.findFirst({
            where: { role: { in: [Role.SCRUTINY_OFFICER, Role.ADMIN] } },
            select: { id: true },
          });
          if (officer) {
            raisedByOfficerId = officer.id;
          }
        }

        for (const remDef of remainingDeficiencies) {
          await tx.deficiencyRecord.create({
            data: {
              applicationId: application.id,
              documentId: remDef.documentId ?? null,
              fieldOrCriteria: remDef.fieldOrCriteria,
              deficiencyCode: remDef.deficiencyCode,
              description: remDef.description,
              status: DeficiencyStatus.OPEN,
              isResolved: false,
              raisedByOfficerId,
            },
          });
        }

        await auditService.logAction(
          {
            userId: actorUserId,
            actorRole: actor.role,
            action: AuditAction.DEFICIENCY_RAISED,
            entityType: 'Application',
            entityId: application.id,
            applicationId: application.id,
            metadata: {
              deficienciesCount: remainingDeficiencies.length,
              deficiencies: remainingDeficiencies.map((d) => ({
                field: d.fieldOrCriteria,
                code: d.deficiencyCode,
                description: d.description,
              })),
              isReverification: true,
            },
            ipAddress: context?.ipAddress ?? null,
            userAgent: context?.userAgent ?? null,
          },
          tx
        );
      }

      // Update Application record
      const app = await tx.application.update({
        where: { id: application.id },
        data: {
          status: targetStatus,
          ruleEvaluationResults: JSON.parse(
            JSON.stringify(ruleEvaluation)
          ) as Prisma.InputJsonValue,
        },
        include: {
          scheme: true,
          schemeVersion: true,
          documents: { where: { isCurrent: true } },
          deficiencies: true,
        },
      });

      // Log status transition
      await auditService.logAction(
        {
          userId: actorUserId,
          actorRole: actor.role,
          action: AuditAction.APPLICATION_SUBMITTED,
          entityType: 'Application',
          entityId: application.id,
          applicationId: application.id,
          previousState: application.status,
          newState: targetStatus,
          metadata: {
            isReverification: true,
            targetStatus,
            overallPassed: ruleEvaluation.overallPassed,
            resolvedDeficienciesCount: openDeficiencies.length,
            remainingDeficienciesCount: remainingDeficiencies.length,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return app;
    });

    return updatedApplication;
  }
}

export const scrutinyOrchestrator = new ScrutinyOrchestratorService();
