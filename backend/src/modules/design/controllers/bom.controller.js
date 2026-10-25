import { Bom } from '../models/bom.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getBoms = async (req, res, next) => {
  try {
    const { projectId, search } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (search) query.bomNumber = { $regex: search, $options: 'i' };

    const boms = await Bom.find(query)
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: boms.length, boms });
  } catch (error) {
    next(error);
  }
};

export const getBomByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const bom = await Bom.findOne({ projectId: projectId.toUpperCase() })
      .populate('approvedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName');

    if (!bom) {
      return res.status(404).json({ success: false, message: `No BOM found for Project ID ${projectId}` });
    }

    res.status(200).json({ success: true, bom });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateBom = async (req, res, next) => {
  try {
    const { projectId, items, revision = 'REV-0' } = req.body;
    if (!projectId || !items) {
      return res.status(400).json({ success: false, message: 'projectId and items array are required.' });
    }

    let bom = await Bom.findOne({ projectId: projectId.toUpperCase() });

    if (!bom) {
      const count = await Bom.countDocuments();
      const bomNumber = `BOM-${projectId.toUpperCase()}-${String(count + 1).padStart(3, '0')}`;

      bom = new Bom({
        projectId: projectId.toUpperCase(),
        bomNumber,
        revision,
        items,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      });
    } else {
      bom.items = items;
      bom.revision = revision;
      bom.updatedBy = req.user?._id;
    }

    await bom.save();

    await logAuditEvent({
      req,
      action: 'BOM_SAVED',
      module: 'design',
      entityId: bom._id,
      entityType: 'Bom',
      notes: `Hierarchical BOM saved for Project ${projectId}. Total items: ${items.length}`
    });

    res.status(200).json({ success: true, message: 'BOM saved successfully.', bom });
  } catch (error) {
    next(error);
  }
};
