import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Role, schemeRuleSetSchema } from '@tribalscholar/shared';
import { authenticateJWT, requireRoles } from '../../middleware/auth.js';
import { schemesService, type RequestAuditContext } from './schemes.service.js';

export const schemesRouter: Router = Router();

// ==============================================================================
// Validation Schemas
// ==============================================================================

export const createSchemeVersionSchema = z.object({
  versionNumber: z.number().int().positive().optional(),
  academicYear: z.string().min(4),
  totalSlots: z.number().int().positive(),
  incomeCeiling: z.number().nonnegative(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  eligibilityRules: schemeRuleSetSchema,
  documentRequirements: z.array(z.record(z.unknown())).min(1),
  scoringConfig: z.record(z.unknown()).optional(),
  isPublished: z.boolean().optional().default(false),
});

export const updateSchemeVersionSchema = z.object({
  academicYear: z.string().min(4).optional(),
  totalSlots: z.number().int().positive().optional(),
  incomeCeiling: z.number().nonnegative().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  eligibilityRules: schemeRuleSetSchema.optional(),
  documentRequirements: z.array(z.record(z.unknown())).optional(),
  scoringConfig: z.record(z.unknown()).optional(),
  isPublished: z.boolean().optional(),
});

function getAuditContext(req: Request): RequestAuditContext {
  return {
    userId: req.user?.id ?? null,
    userRole: req.user?.role ?? null,
    ipAddress: req.ip || req.socket.remoteAddress || null,
    userAgent: (req.headers['user-agent'] as string) || null,
  };
}

// ==============================================================================
// Routes
// ==============================================================================

/**
 * GET /api/v1/schemes/active
 * Public / Applicant / Officer discovery of all active schemes and their latest published version.
 */
schemesRouter.get('/active', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const activeSchemes = await schemesService.getActiveSchemesWithLatestPublishedVersion();
    res.json({
      status: 'success',
      data: activeSchemes,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/schemes/:code/versions
 * Admin & Officer queue view of all versions for a given scheme (published and drafts).
 */
schemesRouter.get(
  '/:code/versions',
  authenticateJWT,
  requireRoles(Role.ADMIN, 'SYSTEM_ADMIN', Role.SCRUTINY_OFFICER, Role.SELECTION_OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const versions = await schemesService.getSchemeVersions(req.params.code as string);
      res.json({
        status: 'success',
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/schemes/:code/versions
 * Restricted to SYSTEM_ADMIN: creates a new scheme version validated against Rule DSL Zod schema.
 */
schemesRouter.post(
  '/:code/versions',
  authenticateJWT,
  requireRoles(Role.ADMIN, 'SYSTEM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createSchemeVersionSchema.parse(req.body);
      const auditContext = getAuditContext(req);

      const createdVersion = await schemesService.createSchemeVersion(
        req.params.code as string,
        validatedData,
        auditContext
      );

      res.status(201).json({
        status: 'success',
        data: createdVersion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/schemes/versions/:versionId/publish
 * Restricted to SYSTEM_ADMIN: publishes a scheme version and writes to immutable AuditLog.
 */
schemesRouter.patch(
  '/versions/:versionId/publish',
  authenticateJWT,
  requireRoles(Role.ADMIN, 'SYSTEM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auditContext = getAuditContext(req);
      const publishedVersion = await schemesService.publishSchemeVersion(
        req.params.versionId as string,
        auditContext
      );

      res.json({
        status: 'success',
        data: publishedVersion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/schemes/versions/:versionId/clone
 * Restricted to SYSTEM_ADMIN: clones an existing version into an editable draft version.
 */
schemesRouter.post(
  '/versions/:versionId/clone',
  authenticateJWT,
  requireRoles(Role.ADMIN, 'SYSTEM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auditContext = getAuditContext(req);
      const clonedVersion = await schemesService.cloneSchemeVersion(
        req.params.versionId as string,
        auditContext
      );

      res.status(201).json({
        status: 'success',
        data: clonedVersion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/v1/schemes/versions/:versionId
 * Restricted to SYSTEM_ADMIN: updates a draft scheme version.
 */
schemesRouter.put(
  '/versions/:versionId',
  authenticateJWT,
  requireRoles(Role.ADMIN, 'SYSTEM_ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = updateSchemeVersionSchema.parse(req.body);
      const auditContext = getAuditContext(req);

      const updatedVersion = await schemesService.updateSchemeVersion(
        req.params.versionId as string,
        validatedData,
        auditContext
      );

      res.json({
        status: 'success',
        data: updatedVersion,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/schemes/versions/:versionId/simulate
 * SYSTEM_ADMIN & Officers: dry-runs a sample application payload against the rule version.
 */
schemesRouter.post(
  '/versions/:versionId/simulate',
  authenticateJWT,
  requireRoles(Role.ADMIN, 'SYSTEM_ADMIN', Role.SCRUTINY_OFFICER, Role.SELECTION_OFFICER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await schemesService.simulateSchemeVersion(
        req.params.versionId as string,
        req.body
      );

      res.json({
        status: 'success',
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);
