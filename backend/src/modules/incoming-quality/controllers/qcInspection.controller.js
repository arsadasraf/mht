import { QcInspection } from '../models/qcInspection.model.js';
import { GateEntry } from '../models/gateEntry.model.js';
import { InventoryItem } from '../../store/models/inventoryItem.model.js';
import { StockAllocation } from '../../store/models/stockAllocation.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getInspections = async (req, res, next) => {
  try {
    const { projectId, verdict, search } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (verdict) query.overallVerdict = verdict;
    if (search) {
      query.$or = [
        { inspectionNumber: { $regex: search, $options: 'i' } },
        { poNumber: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } }
      ];
    }

    const inspections = await QcInspection.find(query)
      .populate('inspectedBy', 'firstName lastName')
      .sort({ inspectedAt: -1 });

    res.status(200).json({ success: true, count: inspections.length, inspections });
  } catch (error) {
    next(error);
  }
};

export const createInspection = async (req, res, next) => {
  try {
    const count = await QcInspection.countDocuments();
    const inspectionNumber = `QC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const {
      gateEntryId,
      projectId,
      poNumber,
      itemCode,
      itemName,
      receivedQty,
      acceptedQty,
      rejectedQty = { baseQty: 0, baseUom: 'NOS' },
      reworkQty = { baseQty: 0, baseUom: 'NOS' },
      overallVerdict,
      defects = [],
      inspectorRemarks
    } = req.body;

    const inspection = new QcInspection({
      inspectionNumber,
      gateEntryId,
      projectId: projectId.toUpperCase(),
      poNumber: poNumber.toUpperCase(),
      itemCode: itemCode.toUpperCase(),
      itemName,
      receivedQty,
      acceptedQty,
      rejectedQty,
      reworkQty,
      overallVerdict,
      defects,
      inspectedBy: req.user?._id,
      inspectedAt: new Date(),
      inspectorRemarks,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await inspection.save();

    // Update GateEntry status
    const gateEntry = await GateEntry.findById(gateEntryId);
    if (gateEntry) {
      gateEntry.status = overallVerdict === 'REJECTED_RTV' ? 'REJECTED_AT_GATE' : 'QC_CLEARED';
      await gateEntry.save();
    }

    // Update Store 4-Bucket Inventory: Add accepted qty to 'accepted' bucket
    const accQty = Number(acceptedQty?.baseQty || 0);
    if (accQty > 0) {
      let invItem = await InventoryItem.findOne({ itemCode: itemCode.toUpperCase() });
      if (!invItem) {
        invItem = new InventoryItem({
          itemCode: itemCode.toUpperCase(),
          itemName,
          baseUom: acceptedQty.baseUom || 'NOS',
          buckets: { ordered: 0, inQc: 0, accepted: accQty, issued: 0 },
          reservedQuantity: accQty, // Hard locked to project
          createdBy: req.user?._id,
          updatedBy: req.user?._id
        });
      } else {
        invItem.buckets.accepted = (invItem.buckets.accepted || 0) + accQty;
        invItem.reservedQuantity = (invItem.reservedQuantity || 0) + accQty;
        invItem.updatedBy = req.user?._id;
      }
      await invItem.save();

      // Create hard allocation lock to target Project ID
      const countAlloc = await StockAllocation.countDocuments();
      const allocation = new StockAllocation({
        allocationNumber: `ALC-${String(countAlloc + 1).padStart(4, '0')}`,
        projectId: projectId.toUpperCase(),
        itemCode: itemCode.toUpperCase(),
        allocatedQty: accQty,
        baseUom: acceptedQty.baseUom || 'NOS',
        status: 'HARD_LOCKED',
        allocatedBy: req.user?._id,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      });
      await allocation.save();
    }

    await logAuditEvent({
      req,
      action: 'QC_INSPECTION_COMPLETED',
      module: 'incoming-quality',
      entityId: inspection._id,
      entityType: 'QcInspection',
      notes: `QC ${inspectionNumber} completed for item ${itemCode}. Verdict: ${overallVerdict}, Accepted: ${accQty}`
    });

    res.status(201).json({
      success: true,
      message: 'QC inspection recorded and inventory allocation synchronized.',
      inspection
    });
  } catch (error) {
    next(error);
  }
};
