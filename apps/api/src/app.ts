import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import crypto from 'node:crypto';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimiter, authRateLimiter } from './middleware/rateLimiter.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { integrationsRouter } from './modules/integrations/integrations.routes.js';
import { schemesRouter } from './modules/schemes/schemes.routes.js';
import { applicantRouter, applicationsRouter } from './modules/applications/applications.routes.js';
import { scrutinyRouter } from './modules/scrutiny/scrutiny.routes.js';
import { selectionRouter } from './modules/selection/selection.routes.js';
import { demoRouter } from './modules/demo/demo.routes.js';

export function createApp(): Express {
  const app: Express = express();

  // Trust reverse proxy (load balancers, ingress)
  app.set('trust proxy', true);

  // 1. Security & Core Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // REST API only
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
    })
  );

  // Correlation ID and explicit security response headers
  app.use((req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 2. Base Index Route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'TribalScholar AI Core API',
      version: '1.0.0',
      description: 'Intelligent Scholarship & Fellowship Operations Platform (SIH26239)',
      documentation: '/api/v1/docs',
      health: '/api/v1/health',
    });
  });

  // 3. API V1 Routes with Rate Limiting & Isolation
  app.use('/api/v1', apiRateLimiter);
  app.use('/api/v1', healthRouter);
  app.use('/api/v1/auth', authRateLimiter, authRouter);
  app.use('/api/v1/audit', auditRouter);
  app.use('/api/v1/integrations', integrationsRouter);
  app.use('/api/v1/schemes', schemesRouter);
  app.use('/api/v1/applicant', applicantRouter);
  app.use('/api/v1/applications', applicationsRouter);
  app.use('/api/v1/scrutiny', scrutinyRouter);
  app.use('/api/v1/selection', selectionRouter);
  app.use('/api/v1/demo', demoRouter);

  // 4. Fallback 404 & Global Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
export default app;
