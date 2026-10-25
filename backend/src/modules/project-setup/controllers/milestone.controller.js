import { Milestone } from '../models/milestone.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getMilestonesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const milestones = await Milestone.find({ projectId: projectId.toUpperCase() })
      .populate('signOffBy', 'firstName lastName')
      .sort({ baselineDate: 1 });

    res.status(200).json({ success: true, count: milestones.length, milestones });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, projectedDate, actualCompletionDate, signOffNotes } = req.body;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    if (status) milestone.status = status;
    if (projectedDate) milestone.projectedDate = projectedDate;
    if (actualCompletionDate) milestone.actualCompletionDate = actualCompletionDate;
    if (signOffNotes) milestone.signOffNotes = signOffNotes;

    if (status === 'COMPLETED' && !milestone.signOffBy) {
      milestone.signOffBy = req.user?._id;
      if (!milestone.actualCompletionDate) milestone.actualCompletionDate = new Date();
    }

    milestone.updatedBy = req.user?._id;
    await milestone.save();

    await logAuditEvent({
      req,
      action: 'MILESTONE_UPDATED',
      module: 'project-setup',
      entityId: milestone._id,
      entityType: 'Milestone',
      notes: `Milestone '${milestone.title}' on project ${milestone.projectId} marked as ${milestone.status}`
    });

    res.status(200).json({ success: true, message: 'Milestone updated successfully.', milestone });
  } catch (error) {
    next(error);
  }
};
