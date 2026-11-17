import { Prisma, type PrismaClient, type AuditLog } from '@prisma/client';
import { AuditAction, Role } from '@tribalscholar/shared';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export type PrismaClientOrTx = Prisma.TransactionClient | PrismaClient;

export interface LogAuditParams {
  userId?: string | null;
  actorRole?: Role | string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  applicationId?: string | null;
  previousState?: string | Record<string, unknown> | null;
  newState?: string | Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditTrailOptions {
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Appends an immutable audit log entry.
   * Supports injecting a Prisma transaction client (tx) for atomic commits with domain operations.
   */
  async logAction(
    params: LogAuditParams,
    tx?: PrismaClientOrTx
  ): Promise<AuditLog> {
    const client = tx ?? prisma;

    const normalizedEntityType = params.entityType ? params.entityType.toUpperCase() : undefined;
    const entityId = params.entityId ?? undefined;

    // Build structured details JSON payload
    const detailsPayload: Prisma.InputJsonObject = {
      action: params.action,
      entityType: normalizedEntityType,
      entityId,
      actorId: params.userId ?? undefined,
      actorRole: params.actorRole ? String(params.actorRole) : undefined,
      before:
        typeof params.previousState === 'object' && params.previousState !== null
          ? (params.previousState as Prisma.InputJsonValue)
          : undefined,
      after:
        typeof params.newState === 'object' && params.newState !== null
          ? (params.newState as Prisma.InputJsonValue)
          : undefined,
      metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
    };

    // Serialize string state representations for fast indexing columns
    const previousStateStr =
      params.previousState !== undefined && params.previousState !== null
        ? typeof params.previousState === 'object'
          ? JSON.stringify(params.previousState)
          : String(params.previousState)
        : null;

    const newStateStr =
      params.newState !== undefined && params.newState !== null
        ? typeof params.newState === 'object'
          ? JSON.stringify(params.newState)
          : String(params.newState)
        : null;

    // Validate foreign keys if provided to ensure relational integrity without constraint failure
    let resolvedUserId: string | null = null;
    if (params.userId) {
      const userExists = await client.user.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (userExists) {
        resolvedUserId = userExists.id;
      }
    }

    let resolvedApplicationId: string | null = null;
    if (params.applicationId) {
      const appExists = await client.application.findUnique({
        where: { id: params.applicationId },
        select: { id: true },
      });
      if (appExists) {
        resolvedApplicationId = appExists.id;
      }
    } else if (normalizedEntityType === 'APPLICATION' && params.entityId) {
      const appExists = await client.application.findUnique({
        where: { id: params.entityId },
        select: { id: true },
      });
      if (appExists) {
        resolvedApplicationId = appExists.id;
      }
    }

    const auditLog = await client.auditLog.create({
      data: {
        action: params.action,
        userId: resolvedUserId,
        applicationId: resolvedApplicationId,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        previousState: previousStateStr,
        newState: newStateStr,
        details: detailsPayload,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    logger.debug(`[AUDIT] Action: ${params.action} recorded for entity: ${normalizedEntityType}:${entityId}`);
    return auditLog;
  }

  /**
   * Retrieves chronological audit logs for a target entity.
   */
  async getAuditTrail(
    entityType: string,
    entityId: string,
    options: AuditTrailOptions = {}
  ): Promise<AuditLog[]> {
    const normalizedType = entityType.toUpperCase();
    const sortOrder = options.order ?? 'asc';

    let whereClause: Prisma.AuditLogWhereInput;

    if (normalizedType === 'APPLICATION') {
      whereClause = {
        OR: [
          { applicationId: entityId },
          {
            AND: [
              { details: { path: ['entityId'], equals: entityId } },
              { details: { path: ['entityType'], equals: 'APPLICATION' } },
            ],
          },
        ],
      };
    } else if (normalizedType === 'USER') {
      whereClause = {
        OR: [
          { userId: entityId },
          {
            AND: [
              { details: { path: ['entityId'], equals: entityId } },
              { details: { path: ['entityType'], equals: 'USER' } },
            ],
          },
        ],
      };
    } else {
      whereClause = {
        AND: [
          { details: { path: ['entityId'], equals: entityId } },
          { details: { path: ['entityType'], equals: normalizedType } },
        ],
      };
    }

    const queryArgs: Prisma.AuditLogFindManyArgs = {
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: {
        timestamp: sortOrder,
      },
    };

    if (options.limit !== undefined) {
      queryArgs.take = options.limit;
    }
    if (options.offset !== undefined) {
      queryArgs.skip = options.offset;
    }

    return prisma.auditLog.findMany(queryArgs);
  }
}

export const auditService = new AuditService();
