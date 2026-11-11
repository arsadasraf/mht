import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getGateEntries = async (req, res, next) => {
  try {
    const { status, projectId, search } = req.query;
    const where = {};
    if (status) where.status = String(status);
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { gateEntryNumber: { contains: q, mode: 'insensitive' } },
        { poNumber: { contains: q, mode: 'insensitive' } },
        { vendorName: { contains: q, mode: 'insensitive' } }
      ];
    }

    const entries = await prisma.gateEntry.findMany({
      where,
      orderBy: { inwardDate: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: entries.length,
      gateEntries: entries.map((e) => ({ ...e, _id: e.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createGateEntry = async (req, res, next) => {
  try {
    const count = await prisma.gateEntry.count();
    const gateEntryNumber = `GE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const { poNumber, projectId, vendorName, challanOrInvoiceNumber = '', vehicleNumber = '', itemsCount = 1, notes = '' } = req.body;

    const entry = await prisma.gateEntry.create({
      data: {
        gateEntryNumber,
        poNumber: String(poNumber || 'PO-2026-0001').toUpperCase(),
        projectId: String(projectId || 'PRJ-2026-1001').toUpperCase(),
        vendorName: vendorName || 'Approved Vendor',
        challanOrInvoiceNumber,
        vehicleNumber,
        itemsCount: Number(itemsCount || 1),
        status: 'QUARANTINE_HOLD',
        notes,
        securityGuardName: actorName,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'GATE_ENTRY_LOGGED',
      module: 'incoming-quality',
      entityId: entry.id,
      entityType: 'GateEntry',
      notes: `Inward gate entry ${gateEntryNumber} logged for PO ${entry.poNumber}. Status: QUARANTINE_HOLD`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Gate entry created in quarantine hold.',
      gateEntry: { ...entry, _id: entry.id }
    });
  } catch (error) {
    next(error);
  }
};
