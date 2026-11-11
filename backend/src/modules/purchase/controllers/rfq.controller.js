import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { ensureDefaultVendorsAndPrices, DEFAULT_PURCHASE_PREFIX_POLICY } from './vendor.controller.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getRfqs = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();

    const list = await prisma.outwardRfq.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: list.length,
      rfqs: list.map((r) => ({ ...r, _id: r.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createRfq = async (req, res, next) => {
  try {
    const config = await ensureDefaultVendorsAndPrices(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };
    const count = await prisma.outwardRfq.count();
    const rfqNumber = `${policy.rfqPrefix || 'RFQ'}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const { title, projectId, submissionDeadline, items = [], vendors = [], notes = '' } = req.body;

    const newRfq = await prisma.outwardRfq.create({
      data: {
        rfqNumber,
        projectId: projectId ? String(projectId).toUpperCase().trim() : '',
        title: title || 'Component Sourcing RFQ',
        vendorCount: Array.isArray(vendors) && vendors.length > 0 ? vendors.length : 1,
        itemCount: Array.isArray(items) && items.length > 0 ? items.length : 1,
        submissionDeadline: submissionDeadline || '',
        status: 'SENT',
        items: Array.isArray(items) ? items : [],
        vendors: Array.isArray(vendors) ? vendors : [],
        notes,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'OUTWARD_RFQ_CREATED',
      module: 'purchase',
      entityId: newRfq.id,
      entityType: 'OutwardRfq',
      notes: `Outward RFQ ${newRfq.rfqNumber} dispatched to vendors`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Outward RFQ created and sent to vendors.',
      rfq: { ...newRfq, _id: newRfq.id }
    });
  } catch (error) {
    next(error);
  }
};
