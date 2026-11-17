import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.js';

export function createApp(): Express {
  const app: Express = express();

  // 1. Security & Core Middlewares
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );
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

  // 3. API V1 Routes
  app.use('/api/v1', healthRouter);

  // 4. Fallback 404 & Global Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app: Express = createApp();
export default app;
