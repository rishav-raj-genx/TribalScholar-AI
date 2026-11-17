import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  AuditAction,
  Role,
  type LoginRequest,
  type RegisterRequest,
  type UserProfile,
  loginRequestSchema,
  registerRequestSchema,
} from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../middleware/errorHandler.js';
import type { AuthUser } from '../../middleware/auth.js';
import { auditService } from '../audit/audit.service.js';

export interface RequestAuditContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuthService {
  /**
   * Hashes plain-text password using bcrypt.
   */
  async hashPassword(password: string): Promise<string> {
    return bcryptjs.hash(password, 10);
  }

  /**
   * Compares plain-text password against bcrypt hash.
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  /**
   * Issues signed JWT for user authentication.
   */
  generateToken(
    payload: AuthUser,
    expiresIn?: NonNullable<jwt.SignOptions['expiresIn']>
  ): string {
    const options: jwt.SignOptions = {
      expiresIn: expiresIn ?? (env.JWT_EXPIRES_IN as NonNullable<jwt.SignOptions['expiresIn']>),
    };

    return jwt.sign(
      {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      },
      env.JWT_SECRET,
      options
    );
  }

  /**
   * Synchronously verifies token and extracts AuthUser claims.
   */
  verifyToken(token: string): AuthUser {
    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    if (!decoded || typeof decoded !== 'object' || !decoded.id || !decoded.role) {
      throw new UnauthorizedError('Invalid token claims structure');
    }
    return {
      id: decoded.id as string,
      email: decoded.email as string,
      role: decoded.role as Role,
    };
  }

  /**
   * Registers a new scholar applicant with hashed credentials and creates an atomic audit log entry.
   */
  async registerApplicant(
    input: RegisterRequest,
    context?: RequestAuditContext
  ): Promise<{ accessToken: string; user: UserProfile }> {
    const validated = registerRequestSchema.parse(input);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists');
    }

    const passwordHash = await this.hashPassword(validated.password);

    // Atomic transaction creating applicant and audit log record
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          fullName: validated.fullName.trim(),
          phone: validated.phone?.trim() ?? null,
          role: Role.APPLICANT,
        },
      });

      await auditService.logAction(
        {
          userId: createdUser.id,
          actorRole: Role.APPLICANT,
          action: AuditAction.USER_REGISTER,
          entityType: 'User',
          entityId: createdUser.id,
          newState: {
            id: createdUser.id,
            email: createdUser.email,
            fullName: createdUser.fullName,
            role: createdUser.role,
          },
          metadata: {
            registrationMethod: 'LOCAL_PASSWORD',
            email: createdUser.email,
          },
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
        },
        tx
      );

      return createdUser;
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };

    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return {
      accessToken,
      user: userProfile,
    };
  }

  /**
   * Authenticates user credentials across any system role, issues JWT, and records login audit log.
   */
  async login(
    input: LoginRequest,
    context?: RequestAuditContext
  ): Promise<{ accessToken: string; user: UserProfile }> {
    const validated = loginRequestSchema.parse(input);
    const normalizedEmail = validated.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled. Please contact system administrator.');
    }

    const isMatch = await this.comparePassword(validated.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Record login audit event
    await auditService.logAction({
      userId: user.id,
      actorRole: user.role as Role,
      action: AuditAction.USER_LOGIN,
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: user.email,
        loginMethod: 'LOCAL_PASSWORD',
      },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    const userProfile: UserProfile = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };

    const accessToken = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role as Role,
    });

    return {
      accessToken,
      user: userProfile,
    };
  }

  /**
   * Retrieves user profile details and associated applicant profile if present.
   */
  async getUserProfile(
    userId: string
  ): Promise<UserProfile & { applicantProfile?: unknown }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        applicantProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      ...(user.applicantProfile ? { applicantProfile: user.applicantProfile } : {}),
    };
  }
}

export const authService = new AuthService();
