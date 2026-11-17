import { Router, type Request, type Response, type NextFunction } from 'express';
import { Role } from '@tribalscholar/shared';
import { authService } from './auth.service.js';
import { authenticateJWT, requireRoles } from '../../middleware/auth.js';

export const authRouter: Router = Router();

/**
 * POST /api/v1/auth/register
 * Register a new applicant scholar.
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip || req.socket.remoteAddress;
    const context = {
      ipAddress: ip ?? null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
    };
    const result = await authService.registerApplicant(req.body, context);
    res.status(201).json({
      status: 'success',
      data: result,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/v1/auth/login
 * Authenticate credentials across all roles (APPLICANT, SCRUTINY_OFFICER, SELECTION_OFFICER, ADMIN).
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : req.ip || req.socket.remoteAddress;
    const context = {
      ipAddress: ip ?? null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
    };
    const result = await authService.login(req.body, context);
    res.status(200).json({
      status: 'success',
      data: result,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/auth/me
 * Retrieve the current authenticated user's profile.
 */
authRouter.get(
  '/me',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Unauthorized' });
        return;
      }
      const profile = await authService.getUserProfile(req.user.id);
      res.status(200).json({
        status: 'success',
        data: profile,
        user: profile,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/v1/auth/officer-only
 * Protected route for officer / administrative evaluation queues.
 */
authRouter.get(
  '/officer-only',
  authenticateJWT,
  requireRoles(Role.SCRUTINY_OFFICER, Role.SELECTION_OFFICER, Role.ADMIN),
  (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Welcome to the officer evaluation portal',
        currentUser: req.user,
      },
    });
  }
);

/**
 * GET /api/v1/auth/admin-only
 * Protected route strictly for System Administrators.
 */
authRouter.get(
  '/admin-only',
  authenticateJWT,
  requireRoles(Role.ADMIN),
  (req: Request, res: Response): void => {
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Welcome to the system administration console',
        currentUser: req.user,
      },
    });
  }
);
