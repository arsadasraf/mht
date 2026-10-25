import { StockAllocation } from '../models/stockAllocation.model.js';
import { InventoryItem } from '../models/inventoryItem.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getAllocationsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const allocations = await StockAllocation.find({ projectId: projectId.toUpperCase() })
      .populate('managerialApprovalBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: allocations.length, allocations });
  } catch (error) {
    next(error);
  }
};

export const getAllocations = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (status) query.status = status;

    const allocations = await StockAllocation.find(query)
      .populate('managerialApprovalBy', 'firstName lastName')
      .populate('allocatedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: allocations.length, allocations });
  } catch (error) {
    next(error);
  }
};

/**
 * Request Inter-Project Material Transfer:
 * An allocation hard-locked to Project A cannot be used by Project B without explicit Managerial Transfer Approval.
 */
export const requestTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetProjectId, justification } = req.body;

    const allocation = await StockAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Stock allocation not found.' });
    }

    if (allocation.status !== 'HARD_LOCKED') {
      return res.status(400).json({
        success: false,
        message: `Cannot request transfer: Allocation is currently in '${allocation.status}' state.`
      });
    }

    allocation.status = 'TRANSFER_REQUESTED';
    allocation.transferRequestedToProject = targetProjectId.toUpperCase();
    allocation.updatedBy = req.user?._id;
    await allocation.save();

    await logAuditEvent({
      req,
      action: 'STOCK_TRANSFER_REQUESTED',
      module: 'store',
      entityId: allocation._id,
      entityType: 'StockAllocation',
      notes: `Transfer requested for ${allocation.allocatedQty} ${allocation.baseUom} of ${allocation.itemCode} from ${allocation.projectId} to ${targetProjectId}. Justification: ${justification}`
    });

    res.status(200).json({
      success: true,
      message: `Transfer request submitted for managerial approval to divert stock to ${targetProjectId}.`,
      allocation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Managerial Transfer Approval:
 * Only authorized plant managers can approve diversion of hard-allocated stock between projects.
 */
export const approveTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, notes } = req.body;

    const allocation = await StockAllocation.findById(id);
    if (!allocation) {
      return res.status(404).json({ success: false, message: 'Stock allocation not found.' });
    }

    if (allocation.status !== 'TRANSFER_REQUESTED') {
      return res.status(400).json({
        success: false,
        message: 'No pending transfer request on this allocation.'
      });
    }

    const sourceProject = allocation.projectId;
    const destinationProject = allocation.transferRequestedToProject;

    if (approved) {
      allocation.status = 'TRANSFERRED';
      allocation.projectId = destinationProject; // Reassign hard allocation
      allocation.transferRequestedToProject = null;
      allocation.managerialApprovalBy = req.user?._id;
      allocation.managerialApprovalNotes = notes || 'Managerial transfer approved.';
      allocation.updatedBy = req.user?._id;
      await allocation.save();

      await logAuditEvent({
        req,
        action: 'STOCK_TRANSFER_APPROVED',
        module: 'store',
        entityId: allocation._id,
        entityType: 'StockAllocation',
        notes: `Managerial approval granted: ${allocation.allocatedQty} ${allocation.baseUom} of ${allocation.itemCode} transferred from ${sourceProject} to ${destinationProject}.`
      });

      res.status(200).json({
        success: true,
        message: `Stock successfully transferred and hard-locked to ${destinationProject}.`,
        allocation
      });
    } else {
      allocation.status = 'HARD_LOCKED';
      allocation.transferRequestedToProject = null;
      allocation.managerialApprovalNotes = notes || 'Transfer request rejected by manager.';
      allocation.updatedBy = req.user?._id;
      await allocation.save();

      await logAuditEvent({
        req,
        action: 'STOCK_TRANSFER_REJECTED',
        module: 'store',
        entityId: allocation._id,
        entityType: 'StockAllocation',
        notes: `Stock transfer request from ${sourceProject} to ${destinationProject} rejected.`
      });

      res.status(200).json({
        success: true,
        message: `Transfer rejected. Stock remains hard-locked to ${sourceProject}.`,
        allocation
      });
    }
  } catch (error) {
    next(error);
  }
};
