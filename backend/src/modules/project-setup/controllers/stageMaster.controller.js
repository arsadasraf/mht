import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const DEFAULT_PROJECT_SETUP_POLICY = {
  workOrderPrefix: 'WO',
  workOrderStartSeq: 1001,
  projectStartSeq: 1001,
  stagePrefix: 'STG',
  stageStartSeq: 101,
  approverUserIds: [],
  approverUsers: [],
  editTimeLimitMode: 'UNLIMITED',
  editTimeLimitHours: 0,
  deleteTimeLimitMode: 'UNLIMITED',
  deleteTimeLimitHours: 0,
  requireRemarkOnStageMove: true,
  lockBaselineDatesAfterKickoff: false,
  autoCreateDepartmentSubStages: true
};

export const generateNextStageCode = async (policy = {}) => {
  const prefix = String(policy.stagePrefix || 'STG').trim().toUpperCase().replace(/-+$/, '');
  const startSeq = Number(policy.stageStartSeq) || 101;
  return generateUniqueSequenceCode({
    model: 'stageMaster',
    field: 'stageCode',
    prefix: `${prefix}-`,
    startSeq,
    padLength: 3
  });
};

const formatStageMaster = (sm, assignedProjects = []) => ({
  ...sm,
  _id: sm.id,
  assignedProjectsCount: assignedProjects.length,
  assignedProjects
});

const formatSubStageMaster = (ssm) => ({
  ...ssm,
  _id: ssm.id,
  name: ssm.subStageName
});

// Kept as a strict no-op (zero auto-generated default stages)
export const ensureDefaultStageMasters = async () => {
  return;
};

export const ensureProjectSetupConfig = async (user = null) => {
  const actorName = getActorName(user);
  let config = await prisma.projectSetupConfig.findUnique({
    where: { configKey: 'GLOBAL_PROJECT_SETUP_CONFIG' }
  });
  if (!config) {
    config = await prisma.projectSetupConfig.create({
      data: {
        configKey: 'GLOBAL_PROJECT_SETUP_CONFIG',
        prefixLockPolicy: DEFAULT_PROJECT_SETUP_POLICY,
        createdById: user?.id || null,
        createdByName: actorName,
        updatedById: user?.id || null,
        updatedByName: actorName
      }
    });
  }
  return config;
};

export const getStageMasters = async (req, res, next) => {
  try {
    const config = await ensureProjectSetupConfig(req.user);

    const { includeInactive, departmentModule } = req.query;
    const where = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    if (departmentModule) {
      where.departmentModule = String(departmentModule);
    }

    const [stages, subStages, milestones] = await Promise.all([
      prisma.stageMaster.findMany({
        where,
        orderBy: [{ defaultOrder: 'asc' }, { createdAt: 'asc' }]
      }),
      prisma.departmentSubStageMaster.findMany({
        where: departmentModule ? { departmentModule: String(departmentModule) } : {},
        orderBy: [{ parentStageCode: 'asc' }, { defaultOrder: 'asc' }]
      }),
      prisma.milestone.findMany({
        select: {
          stageCode: true,
          stage: true,
          projectId: true,
          status: true,
          project: {
            select: {
              projectId: true,
              projectName: true,
              workOrderNumber: true,
              customerName: true
            }
          }
        }
      })
    ]);

    // Build map of stageCode -> unique assigned projects
    const stageProjectsMap = new Map();
    for (const ms of milestones) {
      const code = (ms.stageCode || ms.stage || '').toUpperCase().trim();
      if (!code) continue;
      if (!stageProjectsMap.has(code)) {
        stageProjectsMap.set(code, new Map());
      }
      const projMap = stageProjectsMap.get(code);
      const pId = ms.project?.workOrderNumber || ms.project?.projectId || ms.projectId;
      if (pId && !projMap.has(pId)) {
        projMap.set(pId, {
          projectId: pId,
          projectName: ms.project?.projectName || pId,
          workOrderNumber: ms.project?.workOrderNumber || pId,
          customerName: ms.project?.customerName || '',
          milestoneStatus: ms.status || 'NOT_STARTED'
        });
      }
    }

    res.status(200).json({
      success: true,
      count: stages.length,
      stages: stages.map((st) => {
        const code = (st.stageCode || '').toUpperCase().trim();
        const assigned = stageProjectsMap.has(code)
          ? Array.from(stageProjectsMap.get(code).values())
          : [];
        return formatStageMaster(st, assigned);
      }),
      subStages: subStages.map(formatSubStageMaster),
      prefixLockPolicy: {
        ...DEFAULT_PROJECT_SETUP_POLICY,
        ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const createStageMaster = async (req, res, next) => {
  try {
    const {
      stageCode,
      stageName,
      departmentModule = 'project-setup',
      defaultOrder,
      leadRole,
      standardDaysOffset,
      weightPercent,
      description
    } = req.body;

    if (!stageName) {
      return res.status(400).json({
        success: false,
        message: 'Stage Name is required.'
      });
    }

    let rawCode = stageCode ? String(stageCode).trim() : '';
    if (!rawCode) {
      const config = await ensureProjectSetupConfig(req.user);
      const policy = {
        ...DEFAULT_PROJECT_SETUP_POLICY,
        ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
      };
      rawCode = await generateNextStageCode(policy);
    }

    const normalizedCode = rawCode.toUpperCase().trim().replace(/\s+/g, '_');
    const existing = await prisma.stageMaster.findUnique({ where: { stageCode: normalizedCode } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Stage Code '${normalizedCode}' already exists. Please use a unique code.`
      });
    }

    const actorName = getActorName(req.user);

    const stage = await prisma.stageMaster.create({
      data: {
        stageCode: normalizedCode,
        stageName: stageName.trim(),
        departmentModule: String(departmentModule || 'project-setup'),
        defaultOrder: Number(defaultOrder) || 1,
        leadRole: leadRole ? String(leadRole).trim() : '',
        standardDaysOffset: Number(standardDaysOffset) || 14,
        weightPercent: Number(weightPercent) || 0,
        description: description || '',
        isActive: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'STAGE_MASTER_CREATED',
      module: 'project-setup',
      entityId: stage.id,
      entityType: 'StageMaster',
      notes: `Stage Master created manually: ${stage.stageCode} (${stage.stageName})`
    });

    res.status(201).json({
      success: true,
      message: `All set! Department stage '${stage.stageName}' (${stage.stageCode}) created.`,
      stage: formatStageMaster(stage, [])
    });
  } catch (error) {
    next(error);
  }
};

export const updateStageMaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      stageCode,
      stageName,
      departmentModule,
      defaultOrder,
      leadRole,
      standardDaysOffset,
      weightPercent,
      description,
      isActive
    } = req.body;

    const existing = await prisma.stageMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Stage Master not found.' });
    }

    let nextStageCode = existing.stageCode;
    if (stageCode !== undefined && stageCode.trim() !== '') {
      const normalized = stageCode.toUpperCase().trim().replace(/\s+/g, '_');
      if (normalized !== existing.stageCode) {
        const duplicate = await prisma.stageMaster.findUnique({
          where: { stageCode: normalized }
        });
        if (duplicate && duplicate.id !== existing.id) {
          return res.status(400).json({
            success: false,
            message: `Stage Code '${normalized}' is already used by '${duplicate.stageName}'.`
          });
        }
        nextStageCode = normalized;
      }
    }

    const nextStageName = stageName !== undefined ? stageName.trim() : existing.stageName;
    const nextDeptModule = departmentModule !== undefined ? String(departmentModule) : existing.departmentModule;
    const nextLeadRole = leadRole !== undefined ? leadRole.trim() : existing.leadRole;
    const actorName = getActorName(req.user);

    const stage = await prisma.stageMaster.update({
      where: { id },
      data: {
        stageCode: nextStageCode,
        stageName: nextStageName,
        departmentModule: nextDeptModule,
        defaultOrder: defaultOrder !== undefined ? Number(defaultOrder) : existing.defaultOrder,
        leadRole: nextLeadRole,
        standardDaysOffset: standardDaysOffset !== undefined ? Number(standardDaysOffset) : existing.standardDaysOffset,
        weightPercent: weightPercent !== undefined ? Number(weightPercent) : existing.weightPercent,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // Propagate updated Stage Code, Stage Name, Department Module & Lead Role to assigned Project Milestones
    const codeChanged = nextStageCode !== existing.stageCode;
    const nameChanged = nextStageName !== existing.stageName;
    const deptChanged = nextDeptModule !== existing.departmentModule;
    const roleChanged = nextLeadRole !== existing.leadRole;

    if (codeChanged || nameChanged || deptChanged || roleChanged) {
      await prisma.milestone.updateMany({
        where: {
          OR: [
            { stageCode: existing.stageCode },
            { stage: existing.stageCode }
          ]
        },
        data: {
          stageCode: nextStageCode,
          stage: nextStageCode,
          title: nextStageName,
          departmentModule: nextDeptModule,
          leadRole: nextLeadRole,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      if (codeChanged) {
        await prisma.project.updateMany({
          where: { currentStage: existing.stageCode },
          data: { currentStage: nextStageCode }
        });

        await prisma.departmentSubStageMaster.updateMany({
          where: { parentStageCode: existing.stageCode },
          data: { parentStageCode: nextStageCode }
        });
      }
    }

    // Re-query assigned projects for accurate response
    const milestones = await prisma.milestone.findMany({
      where: {
        OR: [{ stageCode: stage.stageCode }, { stage: stage.stageCode }]
      },
      select: {
        projectId: true,
        status: true,
        project: {
          select: {
            projectId: true,
            projectName: true,
            workOrderNumber: true,
            customerName: true
          }
        }
      }
    });

    const projMap = new Map();
    for (const ms of milestones) {
      const pId = ms.project?.workOrderNumber || ms.project?.projectId || ms.projectId;
      if (pId && !projMap.has(pId)) {
        projMap.set(pId, {
          projectId: pId,
          projectName: ms.project?.projectName || pId,
          workOrderNumber: ms.project?.workOrderNumber || pId,
          customerName: ms.project?.customerName || '',
          milestoneStatus: ms.status || 'NOT_STARTED'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Great! Stage '${stage.stageName}' (${stage.stageCode}) updated successfully.`,
      stage: formatStageMaster(stage, Array.from(projMap.values()))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteStageMaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.stageMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Stage Master not found.' });
    }

    // Check if this stage is assigned to any project milestone
    const assignedMilestones = await prisma.milestone.findMany({
      where: {
        OR: [
          { stageCode: existing.stageCode },
          { stage: existing.stageCode }
        ]
      },
      select: {
        projectId: true,
        status: true,
        project: {
          select: {
            projectId: true,
            projectName: true,
            workOrderNumber: true,
            customerName: true
          }
        }
      }
    });

    const projMap = new Map();
    for (const ms of assignedMilestones) {
      const pId = ms.project?.workOrderNumber || ms.project?.projectId || ms.projectId;
      if (pId && !projMap.has(pId)) {
        projMap.set(pId, {
          projectId: pId,
          projectName: ms.project?.projectName || pId,
          workOrderNumber: ms.project?.workOrderNumber || pId,
          customerName: ms.project?.customerName || '',
          milestoneStatus: ms.status || 'NOT_STARTED'
        });
      }
    }

    const assignedProjects = Array.from(projMap.values());
    const assignedProjectIds = assignedProjects.map((p) => p.workOrderNumber || p.projectId);
    const actorName = getActorName(req.user);

    // CASE 1: Stage is assigned to >= 1 project -> Cannot be permanently deleted; deactivate instead
    if (assignedProjects.length > 0) {
      const stage = await prisma.stageMaster.update({
        where: { id },
        data: {
          isActive: false,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      await logAuditEvent({
        req,
        action: 'STAGE_MASTER_DEACTIVATED',
        module: 'project-setup',
        entityId: stage.id,
        entityType: 'StageMaster',
        notes: `Stage ${stage.stageCode} deactivated (assigned to ${assignedProjects.length} project(s): ${assignedProjectIds.join(', ')})`
      });

      return res.status(200).json({
        success: true,
        isDeleted: false,
        isDeactivated: true,
        assignedProjectsCount: assignedProjects.length,
        assignedProjectIds,
        message: `Stage '${existing.stageName}' is assigned to ${assignedProjects.length} project(s) (${assignedProjectIds.join(', ')}), so it cannot be deleted. It has been deactivated so it cannot be assigned to future projects.`,
        stage: formatStageMaster(stage, assignedProjects)
      });
    }

    // CASE 2: Stage is NOT assigned to any project -> Permanently delete from DB
    await prisma.stageMaster.delete({ where: { id } });

    await logAuditEvent({
      req,
      action: 'STAGE_MASTER_DELETED',
      module: 'project-setup',
      entityId: existing.id,
      entityType: 'StageMaster',
      notes: `Unassigned Stage Master permanently deleted: ${existing.stageCode} (${existing.stageName})`
    });

    return res.status(200).json({
      success: true,
      isDeleted: true,
      isDeactivated: false,
      assignedProjectsCount: 0,
      message: `All set! Stage '${existing.stageName}' (${existing.stageCode}) was not assigned to any project and has been permanently deleted.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Department Sub-Stage Masters CRUD (Used by Design, Purchase, Store, Quality, Production, Dispatch)
 */
export const getSubStageMasters = async (req, res, next) => {
  try {
    const { departmentModule, parentStageCode, includeInactive } = req.query;
    const where = {};
    if (departmentModule) where.departmentModule = String(departmentModule);
    if (parentStageCode) where.parentStageCode = String(parentStageCode);
    if (includeInactive !== 'true') where.isActive = true;

    const subStages = await prisma.departmentSubStageMaster.findMany({
      where,
      orderBy: [{ parentStageCode: 'asc' }, { defaultOrder: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: subStages.length,
      subStages: subStages.map(formatSubStageMaster)
    });
  } catch (error) {
    next(error);
  }
};

export const createSubStageMaster = async (req, res, next) => {
  try {
    const {
      name,
      subStageCode,
      subStageName,
      departmentModule = 'design',
      parentStageCode = 'DESIGN_BOM',
      defaultOrder = 1,
      standardDays = 5,
      weightPercent = 20,
      description = ''
    } = req.body;

    const finalName = (name || subStageName || '').trim();
    if (!finalName) {
      return res.status(400).json({ success: false, message: 'Sub-stage name is required.' });
    }

    const normalizedCode = (subStageCode || finalName)
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_');

    const existingSubStage = await prisma.departmentSubStageMaster.findUnique({
      where: { subStageCode: normalizedCode }
    });
    if (existingSubStage) {
      return res.status(400).json({
        success: false,
        message: `Just a heads up: Sub-Stage Code "${normalizedCode}" already exists. Please enter a unique sub-stage name or code.`
      });
    }

    const actorName = getActorName(req.user);

    const created = await prisma.departmentSubStageMaster.create({
      data: {
        subStageCode: normalizedCode,
        subStageName: finalName,
        departmentModule,
        parentStageCode,
        defaultOrder: Number(defaultOrder) || 1,
        standardDays: Number(standardDays) || 5,
        weightPercent: Number(weightPercent) || 20,
        description: description || '',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(201).json({
      success: true,
      message: 'All set! Sub-stage saved successfully.',
      subStage: formatSubStageMaster(created)
    });
  } catch (error) {
    next(error);
  }
};

export const updateSubStageMaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.departmentSubStageMaster.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Sub-stage template not found.' });
    }

    const actorName = getActorName(req.user);
    const finalName =
      req.body.name !== undefined
        ? req.body.name.trim()
        : req.body.subStageName !== undefined
        ? req.body.subStageName.trim()
        : existing.subStageName;

    const updated = await prisma.departmentSubStageMaster.update({
      where: { id },
      data: {
        subStageName: finalName,
        departmentModule: req.body.departmentModule ?? existing.departmentModule,
        parentStageCode: req.body.parentStageCode ?? existing.parentStageCode,
        defaultOrder: req.body.defaultOrder !== undefined ? Number(req.body.defaultOrder) : existing.defaultOrder,
        standardDays: req.body.standardDays !== undefined ? Number(req.body.standardDays) : existing.standardDays,
        weightPercent: req.body.weightPercent !== undefined ? Number(req.body.weightPercent) : existing.weightPercent,
        description: req.body.description !== undefined ? req.body.description : existing.description,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Great! Sub-stage updated successfully.',
      subStage: formatSubStageMaster(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSubStageMaster = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.departmentSubStageMaster.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Sub-stage template removed.' });
  } catch (error) {
    next(error);
  }
};

export const updateProjectSetupConfig = async (req, res, next) => {
  try {
    const existing = await ensureProjectSetupConfig(req.user);
    const actorName = getActorName(req.user);

    const nextPolicy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof existing.prefixLockPolicy === 'object' ? existing.prefixLockPolicy : {}),
      ...(req.body.prefixLockPolicy || req.body || {})
    };

    const updated = await prisma.projectSetupConfig.update({
      where: { id: existing.id },
      data: {
        prefixLockPolicy: nextPolicy,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // Apply updated approval policy to existing unstarted Work Orders
    const approverIds = Array.isArray(nextPolicy.approverUserIds)
      ? nextPolicy.approverUserIds.filter(Boolean)
      : [];

    if (approverIds.length > 0) {
      // Any Work Order that was only auto-approved (not manually approved) and has not started execution moves to CREATED (Pending Approval)
      const candidates = await prisma.project.findMany({
        where: {
          status: { in: ['APPROVED', 'ASSIGNED_TO_DEPARTMENT'] },
          progressPercent: 0
        }
      });

      for (const prj of candidates) {
        const cv = typeof prj.contractValue === 'object' && prj.contractValue ? prj.contractValue : {};
        const isAutoApproved =
          !cv.approvedById ||
          String(cv.approvedByName || '').includes('Auto-Approved') ||
          !cv.approvedAt;

        if (isAutoApproved) {
          await prisma.project.update({
            where: { id: prj.id },
            data: {
              status: 'CREATED',
              contractValue: {
                ...cv,
                approvedById: null,
                approvedByName: '',
                approvedAt: null
              },
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    } else {
      // No approver required (Auto-Approve mode): auto-approve any Work Orders currently waiting in CREATED status
      const pendingProjects = await prisma.project.findMany({
        where: { status: 'CREATED' },
        include: { milestones: { select: { id: true } } }
      });

      for (const prj of pendingProjects) {
        const cv = typeof prj.contractValue === 'object' && prj.contractValue ? prj.contractValue : {};
        const nextStatus = (prj.milestones?.length || 0) > 0 ? 'ASSIGNED_TO_DEPARTMENT' : 'APPROVED';
        await prisma.project.update({
          where: { id: prj.id },
          data: {
            status: nextStatus,
            contractValue: {
              ...cv,
              approvedById: req.user?.id || null,
              approvedByName: `${actorName} (Auto-Approved)`,
              approvedAt: new Date().toISOString()
            },
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'All set! Project Setup approval and time policies saved and applied.',
      prefixLockPolicy: updated.prefixLockPolicy
    });
  } catch (error) {
    next(error);
  }
};
