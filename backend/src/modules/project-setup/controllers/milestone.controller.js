import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { formatMilestone } from './project.controller.js';

const getActorName = (user) => {
  if (!user) return 'System User';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System User';
};

const recalculateProjectProgress = async (projectId, user = null) => {
  const [project, allMilestones] = await Promise.all([
    prisma.project.findUnique({ where: { projectId } }),
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: { order: 'asc' }
    })
  ]);

  if (!project) return 0;

  if (allMilestones.length === 0) {
    if (project.status !== 'CREATED') {
      await prisma.project
        .update({
          where: { projectId },
          data: {
            progressPercent: 0,
            status: 'APPROVED',
            updatedById: user?.id || null,
            updatedByName: getActorName(user)
          }
        })
        .catch(() => {});
    }
    return 0;
  }

  const completedCount = allMilestones.filter((m) => m.status === 'COMPLETED').length;
  const activeCount = allMilestones.filter(
    (m) => m.status === 'IN_PROGRESS' || m.status === 'COMPLETED' || (m.completionPercent || 0) > 0
  ).length;
  const progressPercent = Math.round((completedCount / allMilestones.length) * 100);
  const activeStage =
    allMilestones.find((m) => m.status === 'IN_PROGRESS')?.stageCode ||
    allMilestones.find((m) => m.status !== 'COMPLETED')?.stageCode ||
    'DISPATCH_READY';

  let nextStatus = project.status;
  if (project.status !== 'CREATED') {
    if (completedCount === allMilestones.length) {
      nextStatus = 'COMPLETED';
    } else if (activeCount > 0) {
      nextStatus = 'IN_PROGRESS';
    } else {
      nextStatus = 'ASSIGNED_TO_DEPARTMENT';
    }
  }

  await prisma.project
    .update({
      where: { projectId },
      data: {
        progressPercent,
        currentStage: activeStage,
        status: nextStatus,
        updatedById: user?.id || null,
        updatedByName: getActorName(user)
      }
    })
    .catch(() => {});

  return progressPercent;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getMilestonesByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const cleanId = String(projectId).trim();
    const upperProjectId = cleanId.toUpperCase();
    const isUuid = UUID_REGEX.test(cleanId);

    const orClauses = [
      { projectId: upperProjectId },
      { projectId: cleanId },
      { project: { workOrderNumber: upperProjectId } },
      { project: { projectId: upperProjectId } }
    ];

    if (isUuid) {
      orClauses.push({ projectRefId: cleanId });
    }

    const milestones = await prisma.milestone.findMany({
      where: {
        OR: orClauses
      },
      include: {
        subStages: { orderBy: { order: 'asc' } }
      },
      orderBy: [{ order: 'asc' }, { baselineDate: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: milestones.length,
      milestones: milestones.map(formatMilestone)
    });
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
      departmentModule = 'project-setup',
      order,
      leadRole,
      assignedToUserId,
      assignedToUserName,
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
    const project = await prisma.project.findUnique({ where: { projectId: upperProjectId } });
    if (!project) {
      return res.status(404).json({ success: false, message: `Project ${upperProjectId} not found.` });
    }

    const currentCount = await prisma.milestone.count({ where: { projectId: upperProjectId } });
    const finalOrder = order ? Number(order) : currentCount + 1;
    const baseDate = baselineDate ? new Date(baselineDate) : new Date();
    const projDate = projectedDate ? new Date(projectedDate) : baseDate;

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';

    const remarks = [];
    if (initialRemark && initialRemark.trim()) {
      remarks.push({
        text: initialRemark.trim(),
        authorName: actorName,
        authorRole: actorRole,
        authorId: req.user?.id || null,
        createdAt: new Date().toISOString()
      });
    }

    const normalizedCode = (stageCode || stage || title)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_');

    const milestone = await prisma.milestone.create({
      data: {
        projectRefId: project.id,
        projectId: upperProjectId,
        title: title.trim(),
        stage: normalizedCode,
        stageCode: normalizedCode,
        departmentModule: String(departmentModule || 'project-setup'),
        order: finalOrder,
        leadRole: leadRole || 'Project Manager',
        assignedToUserId: assignedToUserId || null,
        assignedToUserName: assignedToUserName || '',
        weightPercent: Number(weightPercent) || 10,
        baselineDate: baseDate,
        projectedDate: projDate,
        status,
        remarks,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: { subStages: { orderBy: { order: 'asc' } } }
    });

    await recalculateProjectProgress(upperProjectId, req.user);

    await logAuditEvent({
      req,
      action: 'STAGE_ADDED_TO_PROJECT',
      module: 'project-setup',
      entityId: milestone.id,
      entityType: 'Milestone',
      notes: `Stage '${milestone.title}' added to project ${upperProjectId}`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Stage added to project.',
      milestone: formatMilestone(milestone)
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
        message: `Invalid status '${status}'.`
      });
    }

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Stage milestone not found.' });
    }

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Engineer';
    const currentRemarks = Array.isArray(existing.remarks) ? [...existing.remarks] : [];

    if (remarkText && remarkText.trim()) {
      currentRemarks.push({
        text: remarkText.trim(),
        authorName: actorName,
        authorRole: actorRole,
        authorId: req.user?.id || null,
        createdAt: new Date().toISOString()
      });
    }

    const isCompleted = status === 'COMPLETED';
    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        status,
        completionPercent: isCompleted ? 100 : status === 'IN_PROGRESS' ? Math.max(25, existing.completionPercent) : existing.completionPercent,
        actualCompletionDate: isCompleted ? new Date() : null,
        signOffById: isCompleted ? req.user?.id || null : existing.signOffById,
        signOffByName: isCompleted ? actorName : existing.signOffByName,
        remarks: currentRemarks,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: { subStages: { orderBy: { order: 'asc' } } }
    });

    const progressPercent = await recalculateProjectProgress(existing.projectId, req.user);

    if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
      const prj = await prisma.project.findUnique({ where: { projectId: existing.projectId } }).catch(() => null);
      if (prj) {
        const poOr = [
          ...(prj.customerPoId ? [{ id: prj.customerPoId }] : []),
          { convertedProjectId: prj.projectId },
          ...(prj.customerPoNumber ? [{ poNumber: prj.customerPoNumber }] : [])
        ];
        await prisma.customerPo.updateMany({
          where: {
            OR: poOr,
            status: { in: ['WORK_ORDER_CREATED', 'PROJECT_CONVERTED'] }
          },
          data: {
            status: 'IN_PROGRESS',
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        }).catch(() => {});
      }
    }

    res.status(200).json({
      success: true,
      message: `Stage moved to ${status.replace(/_/g, ' ')}.`,
      milestone: formatMilestone(updated),
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

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Stage milestone not found.' });
    }

    const actorName = customName || getActorName(req.user);
    const actorRole = customRole || req.user?.role?.name || 'Engineer';
    const currentRemarks = Array.isArray(existing.remarks) ? [...existing.remarks] : [];

    currentRemarks.push({
      text: text.trim(),
      authorName: actorName,
      authorRole: actorRole,
      authorId: req.user?.id || null,
      createdAt: new Date().toISOString()
    });

    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        remarks: currentRemarks,
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user)
      },
      include: { subStages: { orderBy: { order: 'asc' } } }
    });

    res.status(200).json({
      success: true,
      message: 'Remark logged with timestamp.',
      remarks: updated.remarks,
      milestone: formatMilestone(updated)
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
      assignedToUserId,
      assignedToUserName,
      assignedToUserEmail,
      status,
      projectedDate,
      baselineDate,
      actualCompletionDate,
      signOffNotes
    } = req.body;

    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    const actorName = getActorName(req.user);
    const updated = await prisma.milestone.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        order: order !== undefined ? Number(order) : existing.order,
        leadRole: leadRole ?? existing.leadRole,
        assignedToUserId: assignedToUserId !== undefined ? assignedToUserId : existing.assignedToUserId,
        assignedToUserName: assignedToUserName !== undefined ? assignedToUserName : existing.assignedToUserName,
        assignedToUserEmail: assignedToUserEmail !== undefined ? assignedToUserEmail : existing.assignedToUserEmail,
        status: status ?? existing.status,
        baselineDate: baselineDate ? new Date(baselineDate) : existing.baselineDate,
        projectedDate: projectedDate ? new Date(projectedDate) : existing.projectedDate,
        actualCompletionDate: actualCompletionDate
          ? new Date(actualCompletionDate)
          : status === 'COMPLETED' && !existing.actualCompletionDate
          ? new Date()
          : existing.actualCompletionDate,
        signOffNotes: signOffNotes !== undefined ? signOffNotes : existing.signOffNotes,
        signOffById: status === 'COMPLETED' && !existing.signOffById ? req.user?.id || null : existing.signOffById,
        signOffByName: status === 'COMPLETED' && !existing.signOffByName ? actorName : existing.signOffByName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: { subStages: { orderBy: { order: 'asc' } } }
    });

    await recalculateProjectProgress(existing.projectId, req.user);

    res.status(200).json({
      success: true,
      message: 'Great! Stage updated.',
      milestone: formatMilestone(updated)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Department Sub-Stages attached to a Project Milestone
 * POST /api/v1/project-setup/milestones/:id/sub-stages
 */
export const addSubStageToMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      subStageCode,
      departmentModule,
      assignedToUserId,
      assignedToUserName,
      assignedToUserEmail,
      baselineStartDate,
      targetEndDate,
      projectId: reqProjectId
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Sub-stage title is required.' });
    }

    let milestone = null;
    if (!id.startsWith('auto-')) {
      milestone = await prisma.milestone.findUnique({
        where: { id },
        include: { subStages: true }
      });
    }

    // If milestone ID is synthetic (e.g. auto-purchase-<projectId>) or not found, auto-find or create the department milestone!
    if (!milestone && (id.startsWith('auto-') || reqProjectId)) {
      const targetProjId = (reqProjectId || id.replace(/^auto-[a-z0-9_-]+-/, '')).toUpperCase().trim();
      const proj = await prisma.project.findFirst({
        where: { OR: [{ projectId: targetProjId }, { workOrderNumber: targetProjId }] }
      });

      if (proj) {
        const deptMod = String(departmentModule || 'purchase').toLowerCase();
        // Look for existing milestone for this department
        milestone = await prisma.milestone.findFirst({
          where: {
            projectId: proj.projectId,
            departmentModule: deptMod
          },
          include: { subStages: true }
        });

        if (!milestone) {
          const defaultStageTitle = deptMod === 'purchase' ? 'Purchase & Sourcing' : (deptMod.charAt(0).toUpperCase() + deptMod.slice(1));
          const count = await prisma.milestone.count({ where: { projectId: proj.projectId } });
          milestone = await prisma.milestone.create({
            data: {
              projectRefId: proj.id,
              projectId: proj.projectId,
              title: defaultStageTitle,
              stage: deptMod.toUpperCase(),
              stageCode: deptMod.toUpperCase(),
              departmentModule: deptMod,
              order: count + 1,
              leadRole: deptMod === 'purchase' ? 'Purchase Manager' : 'Project Manager',
              weightPercent: 15,
              baselineDate: new Date(),
              projectedDate: proj.deliveryCommitmentDate ? new Date(proj.deliveryCommitmentDate) : new Date(Date.now() + 14 * 86400000),
              status: 'IN_PROGRESS',
              createdByName: getActorName(req.user),
              updatedByName: getActorName(req.user)
            },
            include: { subStages: true }
          });
        }
      }
    }

    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Parent stage not found.' });
    }

    const actorName = getActorName(req.user);
    const normalizedCode = (subStageCode || title)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_');

    await prisma.projectSubStage.create({
      data: {
        milestoneId: milestone.id,
        projectId: milestone.projectId,
        departmentModule: departmentModule || milestone.departmentModule || 'design',
        subStageCode: normalizedCode,
        title: title.trim(),
        order: (milestone.subStages?.length || 0) + 1,
        assignedToUserId: assignedToUserId || null,
        assignedToUserName: assignedToUserName || '',
        assignedToUserEmail: assignedToUserEmail || '',
        baselineStartDate: baselineStartDate ? new Date(baselineStartDate) : new Date(),
        targetEndDate: targetEndDate ? new Date(targetEndDate) : milestone.projectedDate,
        status: 'NOT_STARTED',
        completionPercent: 0,
        remarks: [],
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    const refreshed = await prisma.milestone.findUnique({
      where: { id: milestone.id },
      include: { subStages: { orderBy: { order: 'asc' } } }
    });

    res.status(201).json({
      success: true,
      message: 'All set! Sub-stage added and assigned.',
      milestone: formatMilestone(refreshed)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/project-setup/milestones/sub-stages/:subStageId
 * Updates a Department Sub-Stage (status, user assignment, remark) and rolls up completion % to the parent Milestone
 */
export const updateSubStage = async (req, res, next) => {
  try {
    const { subStageId } = req.params;
    const {
      title,
      status,
      assignedToUserId,
      assignedToUserName,
      assignedToUserEmail,
      baselineStartDate,
      targetEndDate,
      completionPercent,
      priority,
      estimatedHours,
      actualHours,
      remarkText
    } = req.body;

    const existing = await prisma.projectSubStage.findUnique({ where: { id: subStageId } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sub-stage not found.' });
    }

    const actorName = getActorName(req.user);
    const currentRemarks = Array.isArray(existing.remarks) ? [...existing.remarks] : [];
    if (remarkText && remarkText.trim()) {
      currentRemarks.push({
        text: remarkText.trim(),
        authorName: actorName,
        createdAt: new Date().toISOString()
      });
    }

    const nextStatus = status ?? existing.status;
    const isCompleted = nextStatus === 'COMPLETED';
    const computedPercent =
      completionPercent !== undefined
        ? Number(completionPercent)
        : isCompleted
        ? 100
        : nextStatus === 'IN_PROGRESS'
        ? 50
        : 0;

    await prisma.projectSubStage.update({
      where: { id: subStageId },
      data: {
        title: title !== undefined ? title.trim() : existing.title,
        status: nextStatus,
        completionPercent: computedPercent,
        actualCompletionDate: isCompleted ? (existing.actualCompletionDate || new Date()) : null,
        assignedToUserId: assignedToUserId !== undefined ? assignedToUserId || null : existing.assignedToUserId,
        assignedToUserName: assignedToUserName !== undefined ? assignedToUserName : existing.assignedToUserName,
        assignedToUserEmail: assignedToUserEmail !== undefined ? assignedToUserEmail : existing.assignedToUserEmail,
        baselineStartDate: baselineStartDate ? new Date(baselineStartDate) : existing.baselineStartDate,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : existing.targetEndDate,
        priority: priority !== undefined ? priority : existing.priority,
        estimatedHours: estimatedHours !== undefined ? Number(estimatedHours) : existing.estimatedHours,
        actualHours: actualHours !== undefined ? Number(actualHours) : existing.actualHours,
        remarks: currentRemarks,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // Roll up sub-stage progress to parent Milestone
    const allSubStages = await prisma.projectSubStage.findMany({
      where: { milestoneId: existing.milestoneId }
    });

    if (allSubStages.length > 0) {
      const doneSubCount = allSubStages.filter((s) => s.status === 'COMPLETED').length;
      const inProgSubCount = allSubStages.filter((s) => s.status === 'IN_PROGRESS').length;
      const rollupPercent = Math.round((doneSubCount / allSubStages.length) * 100);
      const rollupStatus =
        doneSubCount === allSubStages.length
          ? 'COMPLETED'
          : doneSubCount > 0 || inProgSubCount > 0
          ? 'IN_PROGRESS'
          : 'NOT_STARTED';

      await prisma.milestone.update({
        where: { id: existing.milestoneId },
        data: {
          completionPercent: rollupPercent,
          status: rollupStatus,
          actualCompletionDate: rollupStatus === 'COMPLETED' ? new Date() : null,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      await recalculateProjectProgress(existing.projectId, req.user);
    }

    const refreshed = await prisma.milestone.findUnique({
      where: { id: existing.milestoneId },
      include: { subStages: { orderBy: { order: 'asc' } } }
    });

    res.status(200).json({
      success: true,
      message: 'Great! Sub-stage updated and progress synced.',
      milestone: formatMilestone(refreshed)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubStage = async (req, res, next) => {
  try {
    const { subStageId } = req.params;
    const existing = await prisma.projectSubStage.findUnique({
      where: { id: subStageId }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sub-stage not found.' });
    }

    await prisma.projectSubStage.delete({ where: { id: subStageId } });

    // Recalculate parent milestone
    const remaining = await prisma.projectSubStage.findMany({
      where: { milestoneId: existing.milestoneId }
    });
    const rollupPercent =
      remaining.length > 0
        ? Math.round(remaining.reduce((sum, s) => sum + (s.completionPercent || 0), 0) / remaining.length)
        : 0;

    await prisma.milestone.update({
      where: { id: existing.milestoneId },
      data: {
        completionPercent: rollupPercent,
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user)
      }
    });

    await recalculateProjectProgress(existing.projectId, req.user);

    res.status(200).json({
      success: true,
      message: 'All set! Sub-stage removed.'
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.milestone.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Stage not found.' });
    }

    await prisma.milestone.delete({ where: { id } });
    await recalculateProjectProgress(existing.projectId, req.user);

    await logAuditEvent({
      userId: req.user?.id,
      action: 'DELETE',
      module: 'project-setup',
      entity: 'Milestone',
      entityId: id,
      description: `Stage ${existing.title} (${existing.stageCode}) deleted from project ${existing.projectId}.`,
      req
    });

    res.status(200).json({
      success: true,
      message: 'Stage removed successfully.'
    });
  } catch (error) {
    next(error);
  }
};
