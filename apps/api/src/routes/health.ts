import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  let dbStatus = 'disconnected';
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - startTime;
    dbStatus = 'connected';
  } catch (err) {
    dbError = err instanceof Error ? err.message : String(err);
  }

  const isHealthy = dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  const memory = process.memoryUsage();

  res.status(statusCode).json({
    status: isHealthy ? 'success' : 'error',
    data: {
      service: 'tribalscholar-api',
      status: isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(2)),
      environment: env.NODE_ENV,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Number((memory.rss / (1024 * 1024)).toFixed(2)),
          heapUsed: Number((memory.heapUsed / (1024 * 1024)).toFixed(2)),
          heapTotal: Number((memory.heapTotal / (1024 * 1024)).toFixed(2)),
        },
      },
    },
  });
});
