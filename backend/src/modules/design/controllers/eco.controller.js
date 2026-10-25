import { Eco } from '../models/eco.model.js';
import { Bom } from '../models/bom.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getEcos = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (status) query.status = status;

    const ecos = await Eco.find(query)
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: ecos.length, ecos });
  } catch (error) {
    next(error);
  }
};

export const createEco = async (req, res, next) => {
  try {
    const count = await Eco.countDocuments();
    const ecoNumber = `ECO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const { projectId, title, reasonForChange, changeType, affectedItemCodes = [] } = req.body;

    const eco = new Eco({
      ecoNumber,
      projectId: projectId.toUpperCase(),
      title,
      reasonForChange,
      changeType,
      affectedItemCodes: affectedItemCodes.map((c) => c.toUpperCase()),
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await eco.save();

    await logAuditEvent({
      req,
      action: 'ECO_SUBMITTED',
      module: 'design',
      entityId: eco._id,
      entityType: 'Eco',
      notes: `ECO ${ecoNumber} submitted for project ${projectId}. Affected items: ${affectedItemCodes.join(', ')}`
    });

    res.status(201).json({ success: true, message: 'ECO submitted successfully.', eco });
  } catch (error) {
    next(error);
  }
};

/**
 * Automated ECO Freeze Rule:
 * Approving an Engineering Change Order automatically freezes affected active BOM lines.
 */
export const approveEcoAndFreeze = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const eco = await Eco.findById(id);
    if (!eco) {
      return res.status(404).json({ success: false, message: 'ECO not found.' });
    }

    eco.status = 'APPROVED_FREEZE';
    eco.freezeActionTaken = true;
    eco.approvedBy = req.user?._id;
    eco.approvedAt = new Date();
    eco.approvalNotes = approvalNotes || 'Approved. Automated freeze executed on affected items.';
    eco.updatedBy = req.user?._id;

    await eco.save();

    // Execute automated freeze on target Project BOM
    const bom = await Bom.findOne({ projectId: eco.projectId });
    let frozenCount = 0;
    if (bom && bom.items) {
      bom.items.forEach((item) => {
        if (eco.affectedItemCodes.includes(item.itemCode)) {
          item.ecoStatus = 'FROZEN_ECO';
          item.ecoReference = eco.ecoNumber;
          frozenCount++;
        }
      });
      await bom.save();
    }

    await logAuditEvent({
      req,
      action: 'ECO_APPROVED_AND_FROZEN',
      module: 'design',
      entityId: eco._id,
      entityType: 'Eco',
      notes: `ECO ${eco.ecoNumber} approved! Automated freeze enacted on ${frozenCount} BOM lines for project ${eco.projectId}`
    });

    res.status(200).json({
      success: true,
      message: `ECO ${eco.ecoNumber} approved. Automated freeze successfully triggered on ${frozenCount} BOM line items.`,
      eco,
      frozenItemsCount: frozenCount
    });
  } catch (error) {
    next(error);
  }
};
