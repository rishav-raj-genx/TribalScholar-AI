import { Router, type Request, type Response, type NextFunction } from 'express';
import { demoService } from './demo.service.js';

export const demoRouter: Router = Router();

/**
 * POST /api/v1/demo/reset
 * Resets entire database and storage to a pristine SIH 2026 jury demonstration baseline.
 * Pre-populates 4 seed RBAC users, active NFST and NOS version 1 schemes, and 5 applications across all stages.
 * Execution SLA: < 2000ms.
 */
demoRouter.post('/reset', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const summary = await demoService.resetDemoState();
    res.status(200).json({
      status: 'success',
      message: `Demo environment reset successfully in ${summary.durationMs}ms`,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
});
