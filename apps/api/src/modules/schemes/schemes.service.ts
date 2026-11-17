import { randomUUID } from 'node:crypto';
import { Prisma, type SchemeVersion } from '@prisma/client';
import {
  AuditAction,
  type Role,
  SchemeCode,
  type SchemeRuleSet,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import {
  ConflictError,
  NotFoundError,
  BadRequestError,
} from '../../middleware/errorHandler.js';
import { auditService } from '../audit/audit.service.js';
import {
  evaluateApplicationRules,
  type UnifiedRuleEvaluationResult,
} from '../ruleEngine/index.js';

// ==============================================================================
// Types & Contracts
// ==============================================================================

export interface RequestAuditContext {
  userId?: string | null;
  userRole?: Role | string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreateSchemeVersionDTO {
  versionNumber?: number | undefined;
  academicYear: string;
  totalSlots: number;
  incomeCeiling: number;
  startDate: string | Date;
  endDate: string | Date;
  eligibilityRules: SchemeRuleSet | Record<string, unknown>;
  documentRequirements: unknown[];
  scoringConfig?: Record<string, unknown> | undefined;
  isPublished?: boolean | undefined;
}

export interface UpdateSchemeVersionDTO {
  academicYear?: string | undefined;
  totalSlots?: number | undefined;
  incomeCeiling?: number | undefined;
  startDate?: string | Date | undefined;
  endDate?: string | Date | undefined;
  eligibilityRules?: SchemeRuleSet | Record<string, unknown> | undefined;
  documentRequirements?: unknown[] | undefined;
  scoringConfig?: Record<string, unknown> | undefined;
  isPublished?: boolean | undefined;
}

export interface SimulationPayload {
  applicantProfile?: Record<string, unknown> | null | undefined;
  formData?: Record<string, unknown> | null | undefined;
  uploadedDocuments?: unknown[] | undefined;
  extractedDocuments?: unknown[] | Record<string, unknown> | undefined;
}

export interface SchemeWithLatestVersion {
  id: string;
  code: SchemeCode;
  name: string;
  description: string;
  isActive: boolean;
  latestPublishedVersion: SchemeVersionDTO | null;
  currentVersion: SchemeVersionDTO | null;
}

export interface SchemeVersionDTO {
  id: string;
  schemeId: string;
  schemeCode?: SchemeCode | undefined;
  versionNumber: number;
  academicYear: string;
  totalSlots: number;
  incomeCeiling: number;
  eligibilityRules: unknown;
  documentRequirements: unknown;
  scoringConfig: unknown | null;
  startDate: Date;
  endDate: Date;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SimulationReport {
  simulationId: string;
  schemeCode: SchemeCode;
  versionNumber: number;
  academicYear: string;
  isEligible: boolean;
  isDocumentComplete: boolean;
  isCrossDocConsistent: boolean;
  overallPassed: boolean;
  requiresOfficerReview: boolean;
  blockingFailuresCount: number;
  warningCount: number;
  deficiencies: unknown[];
  ruleResults: unknown[];
  documentResults: unknown;
  consistencyResults: unknown[];
  simulatedAt: string;
}

// ==============================================================================
// Schemes Service
// ==============================================================================

export class SchemesService {
  /**
   * Helper to serialize Prisma Decimal to number in DTO
   */
  private formatVersionDTO(version: SchemeVersion, schemeCode?: SchemeCode): SchemeVersionDTO {
    const dto: SchemeVersionDTO = {
      id: version.id,
      schemeId: version.schemeId,
      versionNumber: version.versionNumber,
      academicYear: version.academicYear,
      totalSlots: version.totalSlots,
      incomeCeiling: Number(version.incomeCeiling),
      eligibilityRules: version.eligibilityRules,
      documentRequirements: version.documentRequirements,
      scoringConfig: version.scoringConfig,
      startDate: version.startDate,
      endDate: version.endDate,
      isPublished: version.isPublished,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
    };

    if (schemeCode !== undefined) {
      dto.schemeCode = schemeCode;
    }

    return dto;
  }

  /**
   * Resolves string scheme code to validated SchemeCode enum
   */
  private parseSchemeCode(code: string): SchemeCode {
    const upper = code.trim().toUpperCase();
    if (upper === 'NFST') return SchemeCode.NFST;
    if (upper === 'NOS') return SchemeCode.NOS;
    throw new BadRequestError(`Invalid scheme code: "${code}". Allowed: [NFST, NOS]`);
  }

  /**
   * GET /schemes/active
   * Lists all active schemes with their latest published SchemeVersion.
   */
  async getActiveSchemesWithLatestPublishedVersion(): Promise<SchemeWithLatestVersion[]> {
    const schemes = await prisma.scheme.findMany({
      where: { isActive: true },
      include: {
        versions: {
          where: { isPublished: true },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { code: 'asc' },
    });

    return schemes.map((s) => {
      const schemeCode = s.code as unknown as SchemeCode;
      const latestVer = s.versions[0] ? this.formatVersionDTO(s.versions[0], schemeCode) : null;
      return {
        id: s.id,
        code: schemeCode,
        name: s.name,
        description: s.description,
        isActive: s.isActive,
        latestPublishedVersion: latestVer,
        currentVersion: latestVer,
      };
    });
  }

  /**
   * GET /schemes/:code/versions
   * Admin / Officer inspection of all versions for a given scheme.
   */
  async getSchemeVersions(code: string): Promise<SchemeVersionDTO[]> {
    const schemeCode = this.parseSchemeCode(code);

    const scheme = await prisma.scheme.findUnique({
      where: { code: schemeCode },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!scheme) {
      throw new NotFoundError(`Scheme with code "${code}" not found`);
    }

    return scheme.versions.map((v) => this.formatVersionDTO(v, scheme.code as unknown as SchemeCode));
  }

  /**
   * POST /schemes/:code/versions
   * SYSTEM_ADMIN creates a new version for a scheme validated against Rule DSL schema.
   */
  async createSchemeVersion(
    code: string,
    dto: CreateSchemeVersionDTO,
    context: RequestAuditContext
  ): Promise<SchemeVersionDTO> {
    const schemeCode = this.parseSchemeCode(code);

    const scheme = await prisma.scheme.findUnique({
      where: { code: schemeCode },
      include: {
        versions: {
          select: { versionNumber: true },
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!scheme) {
      throw new NotFoundError(`Scheme with code "${code}" not found`);
    }

    // Determine version number
    let targetVersionNumber = dto.versionNumber;
    if (targetVersionNumber === undefined) {
      const highestVersion = scheme.versions[0]?.versionNumber ?? 0;
      targetVersionNumber = highestVersion + 1;
    } else {
      const exists = scheme.versions.some((v) => v.versionNumber === targetVersionNumber);
      if (exists) {
        throw new ConflictError(
          `Version ${targetVersionNumber} already exists for scheme "${schemeCode}"`
        );
      }
    }

    const created = await prisma.schemeVersion.create({
      data: {
        schemeId: scheme.id,
        versionNumber: targetVersionNumber,
        academicYear: dto.academicYear,
        totalSlots: dto.totalSlots,
        incomeCeiling: new Prisma.Decimal(dto.incomeCeiling),
        eligibilityRules: dto.eligibilityRules as Prisma.InputJsonValue,
        documentRequirements: dto.documentRequirements as Prisma.InputJsonValue,
        scoringConfig: dto.scoringConfig ? (dto.scoringConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isPublished: dto.isPublished ?? false,
      },
    });

    // Record immutable audit log
    await auditService.logAction({
      userId: context.userId ?? null,
      actorRole: context.userRole ? String(context.userRole) : null,
      action: AuditAction.SCHEME_RULE_MODIFIED,
      entityType: 'SCHEME_VERSION',
      entityId: created.id,
      newState: {
        schemeCode,
        versionNumber: created.versionNumber,
        academicYear: created.academicYear,
        totalSlots: created.totalSlots,
        incomeCeiling: Number(created.incomeCeiling),
        isPublished: created.isPublished,
      },
      metadata: {
        event: 'CREATE_SCHEME_VERSION',
        schemeCode,
        versionNumber: created.versionNumber,
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return this.formatVersionDTO(created, schemeCode);
  }

  /**
   * PATCH /schemes/versions/:versionId/publish
   * SYSTEM_ADMIN publishes a scheme version, making it visible for new intakes.
   */
  async publishSchemeVersion(
    versionId: string,
    context: RequestAuditContext
  ): Promise<SchemeVersionDTO> {
    const existing = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
      include: { scheme: true },
    });

    if (!existing) {
      throw new NotFoundError(`Scheme version with ID "${versionId}" not found`);
    }

    const updated = await prisma.schemeVersion.update({
      where: { id: versionId },
      data: { isPublished: true },
    });

    // Audit the publication
    await auditService.logAction({
      userId: context.userId ?? null,
      actorRole: context.userRole ? String(context.userRole) : null,
      action: AuditAction.SCHEME_RULE_MODIFIED,
      entityType: 'SCHEME_VERSION',
      entityId: versionId,
      previousState: { isPublished: existing.isPublished },
      newState: { isPublished: true },
      metadata: {
        event: 'PUBLISH_SCHEME_VERSION',
        schemeCode: existing.scheme.code,
        versionNumber: existing.versionNumber,
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return this.formatVersionDTO(updated, existing.scheme.code as unknown as SchemeCode);
  }

  /**
   * POST /schemes/versions/:versionId/clone
   * SYSTEM_ADMIN clones an existing version into a new draft version.
   */
  async cloneSchemeVersion(
    versionId: string,
    context: RequestAuditContext
  ): Promise<SchemeVersionDTO> {
    const source = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
      include: {
        scheme: {
          include: {
            versions: {
              select: { versionNumber: true },
              orderBy: { versionNumber: 'desc' },
            },
          },
        },
      },
    });

    if (!source) {
      throw new NotFoundError(`Scheme version with ID "${versionId}" not found`);
    }

    const highestVersion = source.scheme.versions[0]?.versionNumber ?? source.versionNumber;
    const newVersionNumber = highestVersion + 1;

    const cloned = await prisma.schemeVersion.create({
      data: {
        schemeId: source.schemeId,
        versionNumber: newVersionNumber,
        academicYear: source.academicYear,
        totalSlots: source.totalSlots,
        incomeCeiling: source.incomeCeiling,
        eligibilityRules: source.eligibilityRules as Prisma.InputJsonValue,
        documentRequirements: source.documentRequirements as Prisma.InputJsonValue,
        scoringConfig: source.scoringConfig ?? Prisma.JsonNull,
        startDate: source.startDate,
        endDate: source.endDate,
        isPublished: false, // New cloned versions start as unpublished drafts
      },
    });

    await auditService.logAction({
      userId: context.userId ?? null,
      actorRole: context.userRole ? String(context.userRole) : null,
      action: AuditAction.SCHEME_RULE_MODIFIED,
      entityType: 'SCHEME_VERSION',
      entityId: cloned.id,
      newState: {
        versionNumber: cloned.versionNumber,
        clonedFromVersionId: versionId,
        sourceVersionNumber: source.versionNumber,
        isPublished: false,
      },
      metadata: {
        event: 'CLONE_SCHEME_VERSION',
        schemeCode: source.scheme.code,
        sourceVersionNumber: source.versionNumber,
        newVersionNumber: cloned.versionNumber,
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return this.formatVersionDTO(cloned, source.scheme.code as unknown as SchemeCode);
  }

  /**
   * PUT /schemes/versions/:versionId
   * SYSTEM_ADMIN updates a draft / unpublished version.
   */
  async updateSchemeVersion(
    versionId: string,
    dto: UpdateSchemeVersionDTO,
    context: RequestAuditContext
  ): Promise<SchemeVersionDTO> {
    const existing = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
      include: { scheme: true },
    });

    if (!existing) {
      throw new NotFoundError(`Scheme version with ID "${versionId}" not found`);
    }

    const data: Prisma.SchemeVersionUpdateInput = {};
    if (dto.academicYear !== undefined) data.academicYear = dto.academicYear;
    if (dto.totalSlots !== undefined) data.totalSlots = dto.totalSlots;
    if (dto.incomeCeiling !== undefined) data.incomeCeiling = new Prisma.Decimal(dto.incomeCeiling);
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);
    if (dto.eligibilityRules !== undefined) data.eligibilityRules = dto.eligibilityRules as Prisma.InputJsonValue;
    if (dto.documentRequirements !== undefined) data.documentRequirements = dto.documentRequirements as Prisma.InputJsonValue;
    if (dto.scoringConfig !== undefined) data.scoringConfig = dto.scoringConfig as Prisma.InputJsonValue;
    if (dto.isPublished !== undefined) data.isPublished = dto.isPublished;

    const updated = await prisma.schemeVersion.update({
      where: { id: versionId },
      data,
    });

    await auditService.logAction({
      userId: context.userId ?? null,
      actorRole: context.userRole ? String(context.userRole) : null,
      action: AuditAction.SCHEME_RULE_MODIFIED,
      entityType: 'SCHEME_VERSION',
      entityId: versionId,
      previousState: {
        totalSlots: existing.totalSlots,
        incomeCeiling: Number(existing.incomeCeiling),
        isPublished: existing.isPublished,
      },
      newState: {
        totalSlots: updated.totalSlots,
        incomeCeiling: Number(updated.incomeCeiling),
        isPublished: updated.isPublished,
      },
      metadata: {
        event: 'UPDATE_SCHEME_VERSION',
        schemeCode: existing.scheme.code,
        versionNumber: existing.versionNumber,
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null,
    });

    return this.formatVersionDTO(updated, existing.scheme.code as unknown as SchemeCode);
  }

  /**
   * POST /schemes/versions/:versionId/simulate
   * Dry-runs a sample application payload against the specified SchemeVersion without persisting.
   */
  async simulateSchemeVersion(
    versionId: string,
    payload: SimulationPayload
  ): Promise<SimulationReport> {
    const version = await prisma.schemeVersion.findUnique({
      where: { id: versionId },
      include: { scheme: true },
    });

    if (!version) {
      throw new NotFoundError(`Scheme version with ID "${versionId}" not found`);
    }

    const evaluationResult: UnifiedRuleEvaluationResult = evaluateApplicationRules({
      schemeVersion: {
        id: version.id,
        schemeCode: version.scheme.code,
        versionNumber: version.versionNumber,
        academicYear: version.academicYear,
        incomeCeiling: Number(version.incomeCeiling),
        eligibilityRules: version.eligibilityRules as Record<string, unknown>,
        documentRequirements: version.documentRequirements,
      },
      applicantProfile: payload.applicantProfile,
      formData: payload.formData,
      uploadedDocuments: (payload.uploadedDocuments as never) || [],
      extractedDocuments: (payload.extractedDocuments as never) || [],
    });

    return {
      simulationId: randomUUID(),
      schemeCode: version.scheme.code as unknown as SchemeCode,
      versionNumber: version.versionNumber,
      academicYear: version.academicYear,
      isEligible: evaluationResult.isEligible,
      isDocumentComplete: evaluationResult.isDocumentComplete,
      isCrossDocConsistent: evaluationResult.isCrossDocConsistent,
      overallPassed: evaluationResult.overallPassed,
      requiresOfficerReview: evaluationResult.requiresOfficerReview,
      blockingFailuresCount: evaluationResult.blockingFailuresCount,
      warningCount: evaluationResult.warningCount,
      deficiencies: evaluationResult.deficiencies,
      ruleResults: evaluationResult.eligibility.ruleResults,
      documentResults: evaluationResult.eligibility.documentResults,
      consistencyResults: evaluationResult.consistency.results,
      simulatedAt: new Date().toISOString(),
    };
  }
}

export const schemesService = new SchemesService();
