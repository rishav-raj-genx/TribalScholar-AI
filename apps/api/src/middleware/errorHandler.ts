import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details: unknown = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details: unknown = null) {
    super(message, 400, 'BAD_REQUEST', details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details: unknown = null) {
    super(message, 401, 'UNAUTHORIZED', details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden access', details: unknown = null) {
    super(message, 403, 'FORBIDDEN', details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details: unknown = null) {
    super(message, 404, 'NOT_FOUND', details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details: unknown = null) {
    super(message, 409, 'CONFLICT', details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation error', details: unknown = null) {
    super(message, 422, 'VALIDATION_ERROR', details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later', details: unknown = null) {
    super(message, 429, 'TOO_MANY_REQUESTS', details);
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handled AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`[${req.method} ${req.url}] ${err.message}`, { code: err.code, details: err.details });
    } else {
      logger.warn(`[${req.method} ${req.url}] ${err.message}`, { code: err.code, details: err.details });
    }

    res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
      details: err.details ?? null,
    });
    return;
  }

  // 2. Multer Upload Error
  if (err instanceof multer.MulterError) {
    logger.warn(`[${req.method} ${req.url}] Multer upload error: ${err.message}`, { code: err.code });
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File size exceeds maximum allowed limit of 5 MB'
        : `File upload error: ${err.message}`;

    res.status(400).json({
      status: 'error',
      code: 'FILE_UPLOAD_ERROR',
      message,
      details: { multerCode: err.code },
    });
    return;
  }

  // 3. Zod Schema Validation Error
  if (err instanceof ZodError) {
    logger.warn(`[${req.method} ${req.url}] Zod validation failed`, { issues: err.issues });
    res.status(400).json({
      status: 'error',
      code: 'VALIDATION_ERROR',
      message: 'Invalid request payload or query parameters',
      details: err.format(),
    });
    return;
  }

  // 3. Prisma Known Request Error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn(`[${req.method} ${req.url}] Prisma error ${err.code}: ${err.message}`);

    if (err.code === 'P2002') {
      const target = err.meta?.target;
      res.status(409).json({
        status: 'error',
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with this unique identifier already exists',
        details: { target },
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'error',
        code: 'RECORD_NOT_FOUND',
        message: 'The requested database record does not exist',
        details: null,
      });
      return;
    }

    res.status(400).json({
      status: 'error',
      code: 'DATABASE_ERROR',
      message: 'Database query rejected',
      details: null,
    });
    return;
  }

  // 4. Uncaught Generic Error
  const genericError = err instanceof Error ? err : new Error(String(err));
  logger.error(`[${req.method} ${req.url}] Unhandled exception: ${genericError.message}`, {
    stack: genericError.stack,
  });

  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: env.NODE_ENV === 'production' ? 'An unexpected internal error occurred' : genericError.message,
    details: null,
  });
}
