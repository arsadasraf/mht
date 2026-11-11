import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatAllocation = (a) => ({
  ...a,
  _id: a.id
});

export const getAllocationsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const allocations = await prisma.stockAllocation.findMany({
      where: { projectId: String(projectId).toUpperCase() },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: allocations.length,
      allocations: allocations.map(formatAllocation)
    });
  } catch (error) {
    next(error);
  }
};

export const getAllocations = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (status) where.status = String(status);

    const allocations = await prisma.stockAllocation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: allocations.length,
      allocations: allocations.map(formatAllocation)
    });
  } catch (error) {
    next(error);
  }
};

export const requestTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetProjectId, justification } = req.body;
    const actorName = getActorName(req.user);

    const allocation = await prisma.stockAllocation.findUnique({ where: { id } });
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Stock allocation not found.' });
    }

    if (allocation.status !== 'HARD_LOCKED') {
      return res.status(400).json({
        success: false,
        message: `Cannot request transfer: Allocation is currently in '${allocation.status}' state.`
      });
    }

    const updated = await prisma.stockAllocation.update({
      where: { id },
      data: {
        status: 'TRANSFER_REQUESTED',
        transferRequestedToProject: String(targetProjectId).toUpperCase().trim(),
        managerialApprovalNotes: justification || '',
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'STOCK_TRANSFER_REQUESTED',
      module: 'store',
      entityId: updated.id,
      entityType: 'StockAllocation',
      notes: `Transfer requested for ${updated.allocatedQty} ${updated.baseUom} of ${updated.itemCode} from ${updated.projectId} to ${targetProjectId}.`
    });

    res.status(200).json({
      success: true,
      message: `Transfer request submitted for managerial approval to divert stock to ${targetProjectId}.`,
      allocation: formatAllocation(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const approveTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, notes } = req.body;
    const actorName = getActorName(req.user);

    const allocation = await prisma.stockAllocation.findUnique({ where: { id } });
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Stock allocation not found.' });
    }

    const sourceProject = allocation.projectId;
    const destinationProject = allocation.transferRequestedToProject;

    if (approved) {
      const updated = await prisma.stockAllocation.update({
        where: { id },
        data: {
          status: 'HARD_LOCKED',
          projectId: destinationProject || sourceProject,
          transferRequestedToProject: null,
          managerialApprovalById: req.user?.id || null,
          managerialApprovalByName: actorName,
          managerialApprovalNotes: notes || 'Managerial transfer approved.',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      res.status(200).json({
        success: true,
        message: `Stock transferred and hard-locked to ${updated.projectId}.`,
        allocation: formatAllocation(updated)
      });
    } else {
      const updated = await prisma.stockAllocation.update({
        where: { id },
        data: {
          status: 'HARD_LOCKED',
          transferRequestedToProject: null,
          managerialApprovalNotes: notes || 'Transfer request rejected by manager.',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      res.status(200).json({
        success: true,
        message: `Transfer rejected. Stock remains hard-locked to ${sourceProject}.`,
        allocation: formatAllocation(updated)
      });
    }
  } catch (error) {
    next(error);
  }
};
