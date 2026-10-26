import { StageMaster } from '../models/stageMaster.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getStageMasters = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { isActive: true };
    const stages = await StageMaster.find(filter).sort({ defaultOrder: 1, createdAt: 1 });
    res.status(200).json({ success: true, count: stages.length, stages });
  } catch (error) {
    next(error);
  }
};

export const createStageMaster = async (req, res, next) => {
  try {
    const {
      stageCode,
      stageName,
      defaultOrder,
      leadRole,
      standardDaysOffset,
      weightPercent,
      description
    } = req.body;

    if (!stageCode || !stageName) {
      return res.status(400).json({
        success: false,
        message: 'Stage Code and Stage Name are mandatory.'
      });
    }

    const normalizedCode = stageCode.toUpperCase().trim().replace(/\s+/g, '_');
    const existing = await StageMaster.findOne({ stageCode: normalizedCode });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Stage Code '${normalizedCode}' already exists.`
      });
    }

    const stage = new StageMaster({
      stageCode: normalizedCode,
      stageName: stageName.trim(),
      defaultOrder: Number(defaultOrder) || 1,
      leadRole: leadRole || 'Project Manager',
      standardDaysOffset: Number(standardDaysOffset) || 14,
      weightPercent: Number(weightPercent) || 10,
      description: description || '',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await stage.save();

    await logAuditEvent({
      req,
      action: 'STAGE_MASTER_CREATED',
      module: 'project-setup',
      entityId: stage._id,
      entityType: 'StageMaster',
      notes: `Standard Stage Master created: ${stage.stageCode} (${stage.stageName})`
    });

    res.status(201).json({
      success: true,
      message: 'Stage Master created successfully.',
      stage
    });
  } catch (error) {
    next(error);
  }
};

export const updateStageMaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      stageName,
      defaultOrder,
      leadRole,
      standardDaysOffset,
      weightPercent,
      description,
      isActive
    } = req.body;

    const stage = await StageMaster.findById(id);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage Master not found.' });
    }

    if (stageName) stage.stageName = stageName.trim();
    if (defaultOrder !== undefined) stage.defaultOrder = Number(defaultOrder);
    if (leadRole) stage.leadRole = leadRole;
    if (standardDaysOffset !== undefined) stage.standardDaysOffset = Number(standardDaysOffset);
    if (weightPercent !== undefined) stage.weightPercent = Number(weightPercent);
    if (description !== undefined) stage.description = description;
    if (isActive !== undefined) stage.isActive = Boolean(isActive);

    stage.updatedBy = req.user?._id;
    await stage.save();

    await logAuditEvent({
      req,
      action: 'STAGE_MASTER_UPDATED',
      module: 'project-setup',
      entityId: stage._id,
      entityType: 'StageMaster',
      notes: `Stage Master ${stage.stageCode} updated.`
    });

    res.status(200).json({
      success: true,
      message: 'Stage Master updated successfully.',
      stage
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStageMaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stage = await StageMaster.findById(id);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Stage Master not found.' });
    }

    // Soft toggle deactivation
    stage.isActive = false;
    stage.updatedBy = req.user?._id;
    await stage.save();

    await logAuditEvent({
      req,
      action: 'STAGE_MASTER_DEACTIVATED',
      module: 'project-setup',
      entityId: stage._id,
      entityType: 'StageMaster',
      notes: `Stage Master ${stage.stageCode} deactivated.`
    });

    res.status(200).json({
      success: true,
      message: 'Stage Master deactivated successfully.',
      stage
    });
  } catch (error) {
    next(error);
  }
};
