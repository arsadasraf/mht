import mongoose from 'mongoose';

/**
 * Immutable Audit Logger Service
 * Append-only logging of critical operational changes, stage transitions, ECOs, and security events.
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
    const AuditLog = mongoose.model('AuditLog');
    const user = req?.user;

    const clientIp = req?.headers?.['x-forwarded-for']?.split(',')[0].trim() || req?.socket?.remoteAddress || 'system';
    const userAgent = req?.headers?.['user-agent'] || 'system';

    const auditEntry = new AuditLog({
      action,
      module,
      entityId: entityId ? entityId.toString() : undefined,
      entityType,
      performedBy: user?._id,
      performedByName: user ? `${user.firstName} ${user.lastName}` : 'System',
      performedByEmail: user?.email || 'system@machinehouse.local',
      role: user?.role?.name || user?.role || 'SYSTEM',
      ipAddress: clientIp,
      userAgent,
      beforeDataSnapshot: beforeData,
      afterDataSnapshot: afterData,
      notes,
      timestamp: new Date()
    });

    await auditEntry.save();
  } catch (error) {
    console.error('[Audit Service Error] Failed to write audit log:', error.message);
  }
};
