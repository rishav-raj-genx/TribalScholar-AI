import { Prisma, type ApplicantProfile, type Application, type ApplicationDocument } from '@prisma/client';
import {
  AuditAction,
  ApplicationStatus,
  DocumentType,
  VerificationStatus,
  Role,
  SchemeCode,
  type ApplicantProfileInput,
  type CreateApplicationInput,
  applicantProfileSchema,
  createApplicationSchema,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { auditService } from '../audit/audit.service.js';
import { storageService } from '../storage/storage.service.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../middleware/errorHandler.js';

export interface RequestAuditContext {
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export interface ApplicationFilterOptions {
  schemeCode?: SchemeCode | undefined;
  status?: ApplicationStatus | undefined;
}

export class ApplicationsService {
  /**
   * Retrieves an applicant's profile by their user ID.
   */
  async getApplicantProfile(userId: string): Promise<ApplicantProfile> {
    const profile = await prisma.applicantProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Applicant profile not found');
    }

    return profile;
  }

  /**
   * Creates or updates the applicant profile (idempotent upsert).
   */
  async upsertApplicantProfile(
    userId: string,
    input: ApplicantProfileInput,
    context?: RequestAuditContext
  ): Promise<ApplicantProfile> {
    const validated = applicantProfileSchema.parse(input);

    const profileData = {
      dateOfBirth: new Date(validated.dateOfBirth),
      gender: validated.gender,
      casteCommunity: validated.casteCommunity,
      subTribe: validated.subTribe ?? null,
      fatherOrSpouseName: validated.fatherOrSpouseName,
      annualIncome: new Prisma.Decimal(validated.annualIncome),
      addressLine: validated.addressLine,
      district: validated.district,
      state: validated.state,
      pincode: validated.pincode,
      bankIfsc: validated.bankIfsc ?? null,
      bankName: validated.bankName ?? null,
      ...(validated.aadhaarNumberHash ? { aadhaarNumberHash: validated.aadhaarNumberHash } : {}),
      ...(validated.bankAccountNumberHash ? { bankAccountNumberHash: validated.bankAccountNumberHash } : {}),
    };

    const profile = await prisma.$transaction(async (tx) => {
      const existing = await tx.applicantProfile.findUnique({
        where: { userId },
      });

      const upserted = await tx.applicantProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...profileData,
        },
        update: profileData,
      });

      await auditService.logAction(
        {
          userId,
          actorRole: Role.APPLICANT,
          action: existing ? AuditAction.APPLICATION_UPDATED : AuditAction.USER_REGISTER,
          entityType: 'ApplicantProfile',
          entityId: upserted.id,
          previousState: existing ? (existing as unknown as Record<string, unknown>) : null,
          newState: upserted as unknown as Record<string, unknown>,
          metadata: {
            isUpdate: !!existing,
            casteCommunity: upserted.casteCommunity,
            state: upserted.state,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return upserted;
    });

    return profile;
  }

  /**
   * Generates a unique sequential application number (e.g. TS-NFST-2026-0001).
   */
  private async generateApplicationNumber(
    schemeCode: SchemeCode,
    academicYear: string
  ): Promise<string> {
    const yearPrefix = academicYear.split('-')[0] || new Date().getFullYear().toString();
    const prefix = `TS-${schemeCode}-${yearPrefix}-`;

    const count = await prisma.application.count({
      where: {
        applicationNumber: {
          startsWith: prefix,
        },
      },
    });

    let seq = count + 1;
    let candidate = `${prefix}${String(seq).padStart(4, '0')}`;

    // Collision guard in case of deletes or gaps
    while (await prisma.application.findUnique({ where: { applicationNumber: candidate } })) {
      seq += 1;
      candidate = `${prefix}${String(seq).padStart(4, '0')}`;
    }

    return candidate;
  }

  /**
   * Initializes a draft application pinned to an active published scheme version.
   */
  async createDraftApplication(
    userId: string,
    input: CreateApplicationInput,
    context?: RequestAuditContext
  ): Promise<Application> {
    const validated = createApplicationSchema.parse(input);

    // 1. Resolve Scheme
    const scheme = await prisma.scheme.findUnique({
      where: { code: validated.schemeCode },
    });

    if (!scheme) {
      throw new NotFoundError(`Scheme with code '${validated.schemeCode}' not found`);
    }

    // 2. Resolve SchemeVersion
    let schemeVersion;
    if (validated.schemeVersionId) {
      schemeVersion = await prisma.schemeVersion.findUnique({
        where: { id: validated.schemeVersionId },
      });

      if (!schemeVersion || schemeVersion.schemeId !== scheme.id) {
        throw new NotFoundError(
          `SchemeVersion '${validated.schemeVersionId}' not found for scheme '${validated.schemeCode}'`
        );
      }
    } else {
      // Find latest published active version
      schemeVersion = await prisma.schemeVersion.findFirst({
        where: {
          schemeId: scheme.id,
          isPublished: true,
        },
        orderBy: { versionNumber: 'desc' },
      });

      if (!schemeVersion) {
        throw new BadRequestError(
          `No active published version found for scheme '${validated.schemeCode}'`
        );
      }
    }

    // 3. Generate structured application number
    const applicationNumber = await this.generateApplicationNumber(
      scheme.code as SchemeCode,
      schemeVersion.academicYear
    );

    // 4. Create application and record immutable AuditLog atomically
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          applicationNumber,
          applicantId: userId,
          schemeId: scheme.id,
          schemeVersionId: schemeVersion.id,
          status: ApplicationStatus.DRAFT,
          formData: (validated.formData as Prisma.InputJsonObject) ?? {},
        },
        include: {
          scheme: true,
          schemeVersion: true,
        },
      });

      await auditService.logAction(
        {
          userId,
          actorRole: Role.APPLICANT,
          action: AuditAction.APPLICATION_CREATED,
          entityType: 'Application',
          entityId: created.id,
          applicationId: created.id,
          newState: {
            id: created.id,
            applicationNumber: created.applicationNumber,
            status: created.status,
            schemeCode: scheme.code,
            schemeVersionId: schemeVersion.id,
            academicYear: schemeVersion.academicYear,
          },
          metadata: {
            schemeCode: scheme.code,
            versionNumber: schemeVersion.versionNumber,
            academicYear: schemeVersion.academicYear,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return created;
    });

    return application;
  }

  /**
   * Updates application formData only when in DRAFT or DEFICIENT status.
   */
  async updateApplicationFormData(
    applicationId: string,
    userId: string,
    userRole: Role,
    formData: Record<string, unknown>,
    context?: RequestAuditContext
  ): Promise<Application> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    // Strict ownership verification
    if (userRole === Role.APPLICANT && application.applicantId !== userId) {
      throw new ForbiddenError('You do not have permission to modify this application');
    }

    // Form data can only be modified in DRAFT or DEFICIENT state
    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.DEFICIENT
    ) {
      throw new BadRequestError(
        `Cannot update form data in status '${application.status}'. Form modifications are only allowed in DRAFT or DEFICIENT status.`
      );
    }

    const previousFormData = (application.formData as Record<string, unknown>) || {};
    const updatedFormData = {
      ...previousFormData,
      ...formData,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.application.update({
        where: { id: applicationId },
        data: {
          formData: updatedFormData as Prisma.InputJsonObject,
        },
        include: {
          scheme: true,
          schemeVersion: true,
          documents: true,
          deficiencies: true,
        },
      });

      await auditService.logAction(
        {
          userId,
          actorRole: userRole,
          action: AuditAction.APPLICATION_UPDATED,
          entityType: 'Application',
          entityId: res.id,
          applicationId: res.id,
          previousState: { formData: previousFormData },
          newState: { formData: updatedFormData },
          metadata: {
            modifiedFields: Object.keys(formData),
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return res;
    });

    return updated;
  }

  /**
   * Retrieves applications scoped to applicant ownership or officer privilege.
   */
  async getApplications(
    userId: string,
    userRole: Role,
    filters?: ApplicationFilterOptions
  ): Promise<Application[]> {
    const where: Prisma.ApplicationWhereInput = {};

    if (userRole === Role.APPLICANT) {
      where.applicantId = userId;
    }

    if (filters?.schemeCode) {
      where.scheme = { code: filters.schemeCode };
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return await prisma.application.findMany({
      where,
      include: {
        scheme: true,
        schemeVersion: true,
        _count: {
          select: {
            documents: true,
            deficiencies: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves a single application with ownership check, documents, deficiencies, and status timeline.
   */
  async getApplicationById(
    applicationId: string,
    userId: string,
    userRole: Role
  ): Promise<Application> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        scheme: true,
        schemeVersion: true,
        documents: true,
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
        auditLogs: {
          orderBy: { timestamp: 'asc' },
          select: {
            id: true,
            action: true,
            userId: true,
            user: {
              select: {
                fullName: true,
                role: true,
              },
            },
            previousState: true,
            newState: true,
            details: true,
            timestamp: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    if (userRole === Role.APPLICANT && application.applicantId !== userId) {
      throw new ForbiddenError('You do not have permission to view this application');
    }

    return application;
  }

  /**
   * Uploads an application document, stores it in object storage, and tracks versions.
   * If previous documents of the same docType exist for this application:
   *  - marks previous documents as isCurrent = false
   *  - sets new document version to previousMaxVersion + 1
   *  - records an immutable AuditLog entry with action DOCUMENT_UPLOADED
   */
  async uploadApplicationDocument(
    applicationId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    documentType: DocumentType,
    context?: RequestAuditContext
  ): Promise<ApplicationDocument> {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundError(`Application with ID '${applicationId}' not found`);
    }

    if (application.applicantId !== userId) {
      throw new ForbiddenError('You do not have permission to upload documents for this application');
    }

    if (
      application.status !== ApplicationStatus.DRAFT &&
      application.status !== ApplicationStatus.DEFICIENT
    ) {
      throw new BadRequestError(
        `Cannot upload documents in status '${application.status}'. Uploads are only allowed in DRAFT or DEFICIENT status.`
      );
    }

    // 1. Upload to Object Storage (validates magic bytes, size limits, and returns key/bucket)
    const uploadResult = await storageService.uploadDocumentBuffer(file.buffer, {
      applicationId: application.id,
      documentType,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    // 2. Perform atomic version tracking & database persistence
    const savedDocument = await prisma.$transaction(async (tx) => {
      // Find latest version for this documentType on this application
      const existingDocs = await tx.applicationDocument.findMany({
        where: {
          applicationId: application.id,
          documentType,
        },
        orderBy: { version: 'desc' },
      });

      const latestDoc = existingDocs[0];
      const nextVersion = latestDoc ? latestDoc.version + 1 : 1;

      // Mark all previous versions of this docType as isCurrent = false
      if (existingDocs.length > 0) {
        await tx.applicationDocument.updateMany({
          where: {
            applicationId: application.id,
            documentType,
          },
          data: {
            isCurrent: false,
          },
        });
      }

      // Create new ApplicationDocument record
      const createdDoc = await tx.applicationDocument.create({
        data: {
          applicationId: application.id,
          documentType,
          fileName: file.originalname,
          fileSize: uploadResult.fileSize,
          mimeType: uploadResult.mimeType,
          s3Key: uploadResult.key,
          s3Bucket: uploadResult.bucket,
          version: nextVersion,
          isCurrent: true,
          verificationStatus: VerificationStatus.PENDING,
        },
      });

      // Record AuditLog
      await auditService.logAction(
        {
          userId,
          actorRole: Role.APPLICANT,
          action: AuditAction.DOCUMENT_UPLOADED,
          entityType: 'ApplicationDocument',
          entityId: createdDoc.id,
          applicationId: application.id,
          newState: {
            id: createdDoc.id,
            documentType: createdDoc.documentType,
            version: createdDoc.version,
            isCurrent: createdDoc.isCurrent,
            fileName: createdDoc.fileName,
            s3Key: createdDoc.s3Key,
          },
          metadata: {
            isReplacement: nextVersion > 1,
            previousVersionsCount: existingDocs.length,
            fileSize: createdDoc.fileSize,
            mimeType: createdDoc.mimeType,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return createdDoc;
    });

    return savedDocument;
  }

  /**
   * Retrieves an application document for viewing with ownership verification and presigned URL.
   */
  async getApplicationDocumentForView(
    applicationId: string,
    documentId: string,
    userId: string,
    userRole: Role
  ): Promise<{
    document: ApplicationDocument;
    viewUrl: string;
    getStream: () => Promise<NodeJS.ReadableStream>;
  }> {
    const document = await prisma.applicationDocument.findUnique({
      where: { id: documentId },
      include: {
        application: true,
      },
    });

    if (!document || document.applicationId !== applicationId) {
      throw new NotFoundError(
        `Document with ID '${documentId}' not found on application '${applicationId}'`
      );
    }

    if (userRole === Role.APPLICANT && document.application.applicantId !== userId) {
      throw new ForbiddenError('You do not have permission to view this document');
    }

    const viewUrl = await storageService.getPresignedViewUrl(
      document.s3Key,
      document.s3Bucket
    );

    return {
      document,
      viewUrl,
      getStream: () => storageService.getDocumentStream(document.s3Key, document.s3Bucket),
    };
  }
}

export const applicationsService = new ApplicationsService();
