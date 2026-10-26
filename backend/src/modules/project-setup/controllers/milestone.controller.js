import { Milestone } from '../models/milestone.model.js';
import { Project } from '../models/project.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getMilestonesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const milestones = await Milestone.find({ projectId: projectId.toUpperCase() })
      .populate('signOffBy', 'firstName lastName email')
      .sort({ order: 1, baselineDate: 1 });

    res.status(200).json({ success: true, count: milestones.length, milestones });
  } catch (error) {
    next(error);
  }
};

export const createMilestoneForProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      stage,
      stageCode,
      order,
      leadRole,
      baselineDate,
      projectedDate,
      weightPercent,
      status = 'NOT_STARTED',
      initialRemark
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Stage title is required.' });
    }

    const upperProjectId = projectId.toUpperCase();
    const project = await Project.findOne({ projectId: upperProjectId });
    if (!project) {
      return res.status(404).json({ success: false, message: `Project ${upperProjectId} not found.` });
    }

    const currentCount = await Milestone.countDocuments({ projectId: upperProjectId });
    const finalOrder = order ? Number(order) : currentCount + 1;
    const baseDate = baselineDate ? new Date(baselineDate) : new Date();
    const projDate = projectedDate ? new Date(projectedDate) : baseDate;

    const remarks = [];
    if (initialRemark && initialRemark.trim()) {
      const authorName = req.user
        ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'System User'
        : 'System User';
      const authorRole = req.user?.role?.name || 'Project Manager';
      remarks.push({
        text: initialRemark.trim(),
        authorName,
        authorRole,
        authorId: req.user?._id,
        createdAt: new Date()
      });
    }

    const milestone = new Milestone({
      projectId: upperProjectId,
      title: title.trim(),
      stage: stage || stageCode || 'CUSTOM_STAGE',
      stageCode: stageCode || stage || 'CUSTOM_STAGE',
      order: finalOrder,
      leadRole: leadRole || 'Project Manager',
      weightPercent: Number(weightPercent) || 10,
      baselineDate: baseDate,
      projectedDate: projDate,
      status,
      remarks,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await milestone.save();

    await logAuditEvent({
      req,
      action: 'STAGE_ADDED_TO_PROJECT',
      module: 'project-setup',
      entityId: milestone._id,
      entityType: 'Milestone',
      notes: `Stage '${milestone.title}' added to project ${upperProjectId}`
    });

    res.status(201).json({
      success: true,
      message: 'Stage added to project successfully.',
      milestone
    });
  } catch (error) {
    next(error);
  }
};

export const updateMilestoneStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarkText } = req.body;

    const allowedStatuses = ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED', 'COMPLETED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Allowed: ${allowedStatuses.join(', ')}`
      });
    }

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Stage milestone not found.' });
    }

    const prevStatus = milestone.status;
    milestone.status = status;

    if (status === 'COMPLETED') {
      milestone.actualCompletionDate = new Date();
      milestone.signOffBy = req.user?._id;
    } else if (prevStatus === 'COMPLETED') {
      milestone.actualCompletionDate = null;
    }

    // If an optional remark was passed with the status transition, append it
    if (remarkText && remarkText.trim()) {
      const authorName = req.user
        ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'System User'
        : 'System User';
      const authorRole = req.user?.role?.name || 'Engineer';
      milestone.remarks.push({
        text: remarkText.trim(),
        authorName,
        authorRole,
        authorId: req.user?._id,
        createdAt: new Date()
      });
    }

    milestone.updatedBy = req.user?._id;
    await milestone.save();

    // Check project milestone completion progress
    const allMilestones = await Milestone.find({ projectId: milestone.projectId });
    const completedCount = allMilestones.filter((m) => m.status === 'COMPLETED').length;
    const progressPercent = Math.round((completedCount / (allMilestones.length || 1)) * 100);

    // Optionally update project currentStage if milestone has a known stage key
    if (status === 'IN_PROGRESS' && milestone.stage) {
      await Project.findOneAndUpdate(
        { projectId: milestone.projectId },
        { currentStage: milestone.stage, updatedBy: req.user?._id }
      );
    }

    await logAuditEvent({
      req,
      action: 'STAGE_STATUS_UPDATED',
      module: 'project-setup',
      entityId: milestone._id,
      entityType: 'Milestone',
      notes: `Stage '${milestone.title}' on ${milestone.projectId} moved from ${prevStatus} to ${status}`
    });

    res.status(200).json({
      success: true,
      message: `Stage moved to ${status.replace(/_/g, ' ')}.`,
      milestone,
      progressPercent
    });
  } catch (error) {
    next(error);
  }
};

export const addMilestoneRemark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, authorName: customName, authorRole: customRole } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Remark text cannot be empty.' });
    }

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Stage milestone not found.' });
    }

    const authorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'System User'
      : (customName || 'System User');
    const authorRole = req.user?.role?.name || customRole || 'Engineer';

    const newRemark = {
      text: text.trim(),
      authorName,
      authorRole,
      authorId: req.user?._id,
      createdAt: new Date()
    };

    milestone.remarks.push(newRemark);
    milestone.updatedBy = req.user?._id;
    await milestone.save();

    await logAuditEvent({
      req,
      action: 'STAGE_REMARK_ADDED',
      module: 'project-setup',
      entityId: milestone._id,
      entityType: 'Milestone',
      notes: `Remark added on stage '${milestone.title}' (${milestone.projectId}) by ${authorName}`
    });

    res.status(200).json({
      success: true,
      message: 'Remark logged successfully with timestamp.',
      remarks: milestone.remarks,
      milestone
    });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      order,
      leadRole,
      status,
      projectedDate,
      baselineDate,
      actualCompletionDate,
      signOffNotes
    } = req.body;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    if (title) milestone.title = title.trim();
    if (order !== undefined) milestone.order = Number(order);
    if (leadRole) milestone.leadRole = leadRole;
    if (status) milestone.status = status;
    if (baselineDate) milestone.baselineDate = baselineDate;
    if (projectedDate) milestone.projectedDate = projectedDate;
    if (actualCompletionDate) milestone.actualCompletionDate = actualCompletionDate;
    if (signOffNotes !== undefined) milestone.signOffNotes = signOffNotes;

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
      notes: `Milestone '${milestone.title}' on project ${milestone.projectId} updated`
    });

    res.status(200).json({ success: true, message: 'Milestone updated successfully.', milestone });
  } catch (error) {
    next(error);
  }
};
