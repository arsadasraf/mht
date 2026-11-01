import { prisma } from '../config/db.config.js';

/**
 * Immutable Audit Logger Service (PostgreSQL + Prisma)
 * Append-only logging of critical operational changes, stage transitions, and security events.
 */
export const logAuditEvent = async ({
  req,
  action,
  module,
  entityId,
  entityType,
  beforeData = null,
  afterData = null,
  notes = ''
}) => {
  try {
    const user = req?.user;
    const clientIp =
      req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      '127.0.0.1';
    const userAgent = req?.headers?.['user-agent'] || 'system';

    await prisma.auditLog.create({
      data: {
        action,
        module,
        entityId: entityId ? String(entityId) : null,
        entityType: entityType || null,
        performedById: user?.id || null,
        performedByName: user ? `${user.firstName} ${user.lastName}` : 'System',
        performedByEmail: user?.email || 'system@machinehouse.local',
        role: user?.role?.name || (typeof user?.role === 'string' ? user.role : 'SYSTEM'),
        ipAddress: clientIp,
        userAgent,
        beforeDataSnapshot: beforeData ? JSON.parse(JSON.stringify(beforeData)) : undefined,
        afterDataSnapshot: afterData ? JSON.parse(JSON.stringify(afterData)) : undefined,
        notes: notes || null
      }
    });
  } catch (error) {
    console.error('[Audit Service Error] Failed to write audit log:', error.message);
  }
};
