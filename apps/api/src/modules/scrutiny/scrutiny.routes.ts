import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@tribalscholar/shared';
import { authenticateJWT, requireRoles } from '../../middleware/auth.js';
import { BadRequestError } from '../../middleware/errorHandler.js';
import { scrutinyService } from './scrutiny.service.js';
import type { RequestAuditContext } from './orchestrator.service.js';

export const scrutinyRouter: Router = Router();

function getRequestContext(req: Request): RequestAuditContext {
  return {
    ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

const submitReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'REQUEST_CORRECTION', 'RECOMMENDED_FOR_SELECTION', 'DEFICIENCY_FLAGGED', 'REJECTED']),
  remarks: z.string().min(1, 'Remarks are required for scrutiny review'),
  justification: z.string().optional(),
  overrideUsed: z.boolean().optional(),
  checklistResults: z.record(z.string(), z.boolean()).optional(),
  deficiencies: z
    .array(
      z.object({
        documentId: z.string().uuid().optional(),
        fieldOrCriteria: z.string().min(1),
        deficiencyCode: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .optional(),
});

/**
 * GET /api/v1/scrutiny/queue
 * Returns applications in the scrutiny queue, filterable by scheme code, status, confidence, or search.
 */
scrutinyRouter.get(
  '/queue',
  authenticateJWT,
  requireRoles(Role.SCRUTINY_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schemeCode, status, confidenceLevel, minConfidence, search, page, limit } = req.query;

      const result = await scrutinyService.getScrutinyQueue({
        schemeCode: typeof schemeCode === 'string' ? schemeCode : undefined,
        status: typeof status === 'string' ? status : undefined,
        confidenceLevel:
          typeof confidenceLevel === 'string' && ['HIGH', 'MEDIUM', 'LOW'].includes(confidenceLevel.toUpperCase())
            ? (confidenceLevel.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW')
            : undefined,
        minConfidence: minConfidence !== undefined ? Number(minConfidence) : undefined,
        search: typeof search === 'string' ? search : undefined,
        page: page !== undefined ? Number(page) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
      });

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/scrutiny/applications/:id
 * Returns the complete Decision Package for the 2-column Officer Scrutiny UI.
 */
scrutinyRouter.get(
  '/applications/:id',
  authenticateJWT,
  requireRoles(Role.SCRUTINY_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const decisionPackage = await scrutinyService.getDecisionPackage(id);

      res.status(200).json({
        status: 'success',
        data: decisionPackage,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/v1/scrutiny/applications/:id/review
 * Records an authorized Scrutiny Officer decision (APPROVE or REQUEST_CORRECTION).
 * Enforces mandatory justification when overriding an AI or rule flag.
 */
scrutinyRouter.post(
  '/applications/:id/review',
  authenticateJWT,
  requireRoles(Role.SCRUTINY_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const validated = submitReviewSchema.parse(req.body);
      const context = getRequestContext(req);

      const updatedApplication = await scrutinyService.submitOfficerReview(
        id,
        {
          userId: req.user!.id,
          role: req.user!.role,
        },
        validated,
        context
      );

      res.status(200).json({
        status: 'success',
        message:
          validated.decision === 'APPROVE' || validated.decision === 'RECOMMENDED_FOR_SELECTION'
            ? 'Application approved and moved to scrutiny verified / selection pending'
            : 'Correction requested and returned to applicant with deficiency flags',
        data: updatedApplication,
      });
    } catch (err) {
      next(err);
    }
  }
);
