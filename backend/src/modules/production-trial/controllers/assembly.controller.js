import { AssemblyStage } from '../models/assemblyStage.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getAssemblyStages = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();

    const stages = await AssemblyStage.find(query)
      .populate('technicianAssigned', 'firstName lastName')
      .populate('stageGateSignOffBy', 'firstName lastName')
      .sort({ sequenceOrder: 1 });

    res.status(200).json({ success: true, count: stages.length, stages });
  } catch (error) {
    next(error);
  }
};

export const updateAssemblyStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progressPercentage, status, notes, signOff } = req.body;

    const stage = await AssemblyStage.findById(id);
    if (!stage) {
      return res.status(404).json({ success: false, message: 'Assembly stage not found.' });
    }

    if (progressPercentage !== undefined) stage.progressPercentage = Number(progressPercentage);
    if (status) stage.status = status;
    if (notes) stage.notes = notes;

    if (signOff) {
      stage.status = 'GATE_PASSED';
      stage.progressPercentage = 100;
      stage.gateChecklistPassed = true;
      stage.stageGateSignOffBy = req.user?._id;
      stage.stageGateSignOffAt = new Date();
    }

    stage.updatedBy = req.user?._id;
    await stage.save();

    await logAuditEvent({
      req,
      action: 'ASSEMBLY_STAGE_UPDATED',
      module: 'production-trial',
      entityId: stage._id,
      entityType: 'AssemblyStage',
      notes: `Stage ${stage.subAssemblyGroup} on project ${stage.projectId} updated: ${stage.status} (${stage.progressPercentage}%)`
    });

    res.status(200).json({ success: true, message: 'Assembly stage updated.', stage });
  } catch (error) {
    next(error);
  }
};
