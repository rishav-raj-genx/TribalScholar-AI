import { Router, type Request, type Response, type NextFunction } from 'express';
import { Role } from '@tribalscholar/shared';
import { authenticateJWT } from '../../middleware/auth.js';
import { auditService } from './audit.service.js';
import { prisma } from '../../lib/prisma.js';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../middleware/errorHandler.js';

export const auditRouter: Router = Router();

/**
 * GET /api/v1/audit/:entityType/:entityId
 * Retrieves chronological audit history for a given target entity.
 * Role Scoping:
 * - SCRUTINY_OFFICER, SELECTION_OFFICER, ADMIN / SYSTEM_ADMIN: Full read access to all entity trails.
 * - APPLICANT: Strict access only to their own Application ID.
 */
auditRouter.get(
  '/:entityType/:entityId',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { entityType, entityId } = req.params;

      if (!entityType || !entityId) {
        throw new BadRequestError('Both entityType and entityId path parameters are required');
      }

      const user = req.user;
      if (!user) {
        throw new UnauthorizedError('Authentication required');
      }

      const userRole = user.role;
      const isOfficerOrAdmin =
        userRole === Role.SCRUTINY_OFFICER ||
        userRole === Role.SELECTION_OFFICER ||
        userRole === Role.ADMIN ||
        (userRole as string) === 'SYSTEM_ADMIN';

      if (!isOfficerOrAdmin) {
        if (userRole === Role.APPLICANT) {
          // Applicants are restricted exclusively to Application entities
          if (entityType.toLowerCase() !== 'application') {
            throw new ForbiddenError(
              'Access forbidden: applicants may only inspect application audit trails'
            );
          }

          // Verify the application exists and belongs to this scholar
          const application = await prisma.application.findUnique({
            where: { id: entityId },
            select: { id: true, applicantId: true },
          });

          if (!application) {
            throw new NotFoundError(`Application with ID ${entityId} not found`);
          }

          if (application.applicantId !== user.id) {
            throw new ForbiddenError(
              'Access forbidden: you may only view audit records for your own application'
            );
          }
        } else {
          throw new ForbiddenError('Access forbidden: insufficient role permissions');
        }
      }

      const options: { order?: 'asc' | 'desc'; limit?: number; offset?: number } = {};
      if (req.query.order === 'desc') {
        options.order = 'desc';
      } else if (req.query.order === 'asc') {
        options.order = 'asc';
      }

      if (req.query.limit) {
        const parsedLimit = Number(req.query.limit);
        if (!Number.isNaN(parsedLimit)) {
          options.limit = parsedLimit;
        }
      }

      if (req.query.offset) {
        const parsedOffset = Number(req.query.offset);
        if (!Number.isNaN(parsedOffset)) {
          options.offset = parsedOffset;
        }
      }

      const auditTrail = await auditService.getAuditTrail(entityType, entityId, options);

      res.status(200).json({
        status: 'success',
        data: auditTrail,
        audits: auditTrail,
        total: auditTrail.length,
      });
    } catch (err) {
      next(err);
    }
  }
);
