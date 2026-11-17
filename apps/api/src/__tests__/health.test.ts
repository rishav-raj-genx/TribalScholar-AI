import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import { z } from 'zod';
import { app } from '../app.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  errorHandler,
} from '../middleware/errorHandler.js';

describe('API Core & Health Endpoints', () => {
  it('GET / should return basic service information', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'TribalScholar AI Core API');
    expect(res.body).toHaveProperty('version', '1.0.0');
    expect(res.body).toHaveProperty('health', '/api/v1/health');
  });

  it('GET /api/v1/health should return 200 and healthy status with database connectivity', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'success');
    expect(res.body.data).toHaveProperty('service', 'tribalscholar-api');
    expect(res.body.data).toHaveProperty('status', 'healthy');
    expect(res.body.data.database).toHaveProperty('status', 'connected');
    expect(res.body.data.database).toHaveProperty('latencyMs');
    expect(typeof res.body.data.database.latencyMs).toBe('number');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('system');
  });

  it('GET /api/v1/unregistered-route should return 404 with standardized error JSON', async () => {
    const res = await request(app).get('/api/v1/unregistered-route');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      status: 'error',
      code: 'NOT_FOUND',
      message: 'Route GET /api/v1/unregistered-route not found',
      details: null,
    });
  });
});

describe('Centralized Error Handler Middleware', () => {
  const errorTestApp: Express = express();
  errorTestApp.use(express.json());

  errorTestApp.get('/test/bad-request', () => {
    throw new BadRequestError('Invalid query parameter provided', { param: 'filter' });
  });

  errorTestApp.get('/test/unauthorized', () => {
    throw new UnauthorizedError('Token expired or missing');
  });

  errorTestApp.get('/test/forbidden', () => {
    throw new ForbiddenError('Insufficient role privileges');
  });

  errorTestApp.get('/test/conflict', () => {
    throw new ConflictError('Application number already registered');
  });

  errorTestApp.post('/test/zod-validation', (req: Request, _res: Response) => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18),
    });
    schema.parse(req.body);
  });

  errorTestApp.use(errorHandler);

  it('should format BadRequestError into status: error with 400', async () => {
    const res = await request(errorTestApp).get('/test/bad-request');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      status: 'error',
      code: 'BAD_REQUEST',
      message: 'Invalid query parameter provided',
      details: { param: 'filter' },
    });
  });

  it('should format UnauthorizedError into status: error with 401', async () => {
    const res = await request(errorTestApp).get('/test/unauthorized');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      status: 'error',
      code: 'UNAUTHORIZED',
      message: 'Token expired or missing',
      details: null,
    });
  });

  it('should format ForbiddenError into status: error with 403', async () => {
    const res = await request(errorTestApp).get('/test/forbidden');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      status: 'error',
      code: 'FORBIDDEN',
      message: 'Insufficient role privileges',
      details: null,
    });
  });

  it('should format ConflictError into status: error with 409', async () => {
    const res = await request(errorTestApp).get('/test/conflict');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      status: 'error',
      code: 'CONFLICT',
      message: 'Application number already registered',
      details: null,
    });
  });

  it('should format ZodError into status: error with 400 and validation details', async () => {
    const res = await request(errorTestApp)
      .post('/test/zod-validation')
      .send({ email: 'invalid-email', age: 16 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(res.body).toHaveProperty('message', 'Invalid request payload or query parameters');
    expect(res.body).toHaveProperty('details');
  });
});
