import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@tribalscholar/shared';
import { env } from '../config/env.js';
import { ForbiddenError, UnauthorizedError } from './errorHandler.js';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export type AllowedRole = Role | 'SYSTEM_ADMIN' | string;

/**
 * Express middleware to authenticate JWT from Authorization header.
 * Attaches decoded user payload { id, email, role } to req.user.
 */
export function authenticateJWT(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new UnauthorizedError('Authorization header missing'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return next(new UnauthorizedError('Invalid authorization format. Expected "Bearer <token>"'));
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    if (!decoded || typeof decoded !== 'object' || !decoded.id || !decoded.role) {
      return next(new UnauthorizedError('Invalid token payload structure'));
    }

    req.user = {
      id: decoded.id as string,
      email: decoded.email as string,
      role: decoded.role as Role,
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Token expired'));
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new UnauthorizedError('Invalid token signature or payload'));
    }
    return next(new UnauthorizedError('Token verification failed'));
  }
}

/**
 * Role-Based Access Control (RBAC) middleware generator.
 * Enforces that req.user has one of the required roles.
 * Note: 'SYSTEM_ADMIN' is accepted and matched against Role.ADMIN.
 */
export function requireRoles(...roles: AllowedRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const userRole = req.user.role;

    const hasPermission = roles.some((role) => {
      if (role === userRole) {
        return true;
      }
      if (role === 'SYSTEM_ADMIN' && userRole === Role.ADMIN) {
        return true;
      }
      if (role === Role.ADMIN && (userRole as string) === 'SYSTEM_ADMIN') {
        return true;
      }
      return false;
    });

    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Insufficient permissions. Required one of: [${roles.join(', ')}], Current: ${userRole}`
        )
      );
    }

    return next();
  };
}
