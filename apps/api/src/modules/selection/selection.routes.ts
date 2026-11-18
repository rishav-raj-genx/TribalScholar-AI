import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { Role } from '@tribalscholar/shared';
import { authenticateJWT, requireRoles } from '../../middleware/auth.js';
import { BadRequestError } from '../../middleware/errorHandler.js';
import { selectionService } from './selection.service.js';
import type { RequestAuditContext } from '../scrutiny/orchestrator.service.js';

export const selectionRouter: Router = Router();

function getRequestContext(req: Request): RequestAuditContext {
  return {
    ipAddress:
      req.ip || (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

const decideSchema = z.object({
  decision: z.enum(['SELECTED', 'REJECTED']),
  remarks: z.string().min(1, 'Remarks are required for selection decision'),
  sanctionedAmount: z.number().positive().optional(),
  awardLetterUrl: z.string().optional(),
  visaStatus: z.string().optional(),
});

const updatePostSelectionSchema = z.object({
  institutionalVerification: z.boolean().optional(),
  joiningReportSubmitted: z.boolean().optional(),
  joiningDate: z.string().optional(),
  visaStatus: z.string().optional(),
  triggerDisbursement: z.boolean().optional(),
  disbursementAmount: z.number().positive().optional(),
  installmentNumber: z.number().int().positive().optional(),
  remarks: z.string().optional(),
});

/**
 * GET /api/v1/selection/queue
 * Returns applications eligible for selection or already decided, filterable by scheme code or status.
 */
selectionRouter.get(
  '/queue',
  authenticateJWT,
  requireRoles(Role.SELECTION_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { schemeCode, status, search, page, limit } = req.query;

      const result = await selectionService.getSelectionQueue({
        schemeCode: typeof schemeCode === 'string' ? schemeCode : undefined,
        status: typeof status === 'string' ? status : undefined,
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
 * GET /api/v1/selection/applications/:id
 * Returns complete post-selection package, award details, and live/simulated DBT disbursement status.
 */
selectionRouter.get(
  '/applications/:id',
  authenticateJWT,
  requireRoles(Role.SELECTION_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const result = await selectionService.getPostSelectionDetails(id);

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
 * POST /api/v1/selection/applications/:id/decide
 * Records final Selection Committee decision (SELECTED or REJECTED) on a SCRUTINY_APPROVED application.
 * If SELECTED, automatically generates sanction order and award letter, creating PostSelectionRecord.
 */
selectionRouter.post(
  '/applications/:id/decide',
  authenticateJWT,
  requireRoles(Role.SELECTION_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const validated = decideSchema.safeParse(req.body);
      if (!validated.success) {
        throw new BadRequestError('Invalid selection decision payload', validated.error.format());
      }

      const officer = {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role as Role,
      };

      const context = getRequestContext(req);
      const result = await selectionService.decideApplication(id, officer, validated.data, context);

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
 * PATCH /api/v1/selection/applications/:id/post-selection
 * Updates post-selection state: toggles institutional verification (joining report) and
 * triggers simulated Direct Benefit Transfer (DBT) disbursement via mockDbtAdapter.
 */
selectionRouter.patch(
  '/applications/:id/post-selection',
  authenticateJWT,
  requireRoles(Role.SELECTION_OFFICER, Role.ADMIN),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID parameter is required');
      }

      const validated = updatePostSelectionSchema.safeParse(req.body);
      if (!validated.success) {
        throw new BadRequestError(
          'Invalid post-selection update payload',
          validated.error.format()
        );
      }

      const officer = {
        id: req.user!.id,
        email: req.user!.email,
        role: req.user!.role as Role,
      };

      const context = getRequestContext(req);
      const result = await selectionService.updatePostSelection(
        id,
        officer,
        validated.data,
        context
      );

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);
