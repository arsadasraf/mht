import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import {
  ensureDefaultStageMasters,
  ensureProjectSetupConfig,
  DEFAULT_PROJECT_SETUP_POLICY
} from './stageMaster.controller.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatSubStage = (ss) => ({
  ...ss,
  _id: ss.id
});

export const formatMilestone = (m) => ({
  ...m,
  _id: m.id,
  notes: m.notes || '',
  remarks: Array.isArray(m.remarks) ? m.remarks : [],
  subStages: Array.isArray(m.subStages) ? m.subStages.map(formatSubStage) : [],
  signOffBy: m.signOffByName
    ? {
        _id: m.signOffById,
        firstName: m.signOffByName.split(' ')[0] || m.signOffByName,
        lastName: m.signOffByName.split(' ').slice(1).join(' ') || ''
      }
    : null
});

export const formatProject = (p) => ({
  ...p,
  _id: p.id,
  productDescription: p.productDescription || '',
  deliveryCommitmentDate: p.deliveryCommitmentDate || null,
  customerPoRef: p.customerPoNumber
    ? {
        _id: p.customerPoId,
        poNumber: p.customerPoNumber,
        totalAmount: p.contractValue
      }
    : null,
  milestones: Array.isArray(p.milestones) ? p.milestones.map(formatMilestone) : undefined
});

export const getProjects = async (req, res, next) => {
  try {
    const { status, stage, search, departmentModule, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status) where.status = String(status);
    if (stage) where.currentStage = String(stage);
    if (departmentModule) {
      const mod = String(departmentModule).trim().toLowerCase();
      where.milestones = {
        some: {
          OR: [
            { departmentModule: { equals: mod, mode: 'insensitive' } },
            { stageCode: { contains: mod, mode: 'insensitive' } },
            { title: { contains: mod, mode: 'insensitive' } }
          ]
        }
      };
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { projectId: { contains: q, mode: 'insensitive' } },
        { workOrderNumber: { contains: q, mode: 'insensitive' } },
        { projectName: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { machineModel: { contains: q, mode: 'insensitive' } },
        { customerPoNumber: { contains: q, mode: 'insensitive' } }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const take = Number(limit) || 50;

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          milestones: {
            orderBy: { order: 'asc' },
            include: { subStages: { orderBy: { order: 'asc' } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      projects: projects.map(formatProject)
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableCustomerPos = async (req, res, next) => {
  try {
    const customerPos = await prisma.customerPo.findMany({
      where: {
        status: { in: ['RECEIVED', 'OA_ISSUED'] }
      },
      include: {
        items: { orderBy: { slNo: 'asc' } }
      },
      orderBy: [{ poDate: 'desc' }, { createdAt: 'desc' }],
      take: 50
    });

    res.status(200).json({
      success: true,
      count: customerPos.length,
      customerPos: customerPos.map((po) => ({
        ...po,
        _id: po.id,
        items: (po.items || []).map((it) => ({ ...it, _id: it.id }))
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: { firstName: 'asc' }
    });

    res.status(200).json({
      success: true,
      users: users.map((u) => ({
        _id: u.id,
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        department: u.department,
        roleName: u.role?.name || ''
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);

    const project = await prisma.project.findFirst({
      where: isUuid ? { id } : { projectId: id.toUpperCase() },
      include: {
        milestones: {
          orderBy: [{ order: 'asc' }, { baselineDate: 'asc' }],
          include: {
            subStages: { orderBy: { order: 'asc' } }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.status(200).json({
      success: true,
      project: formatProject(project),
      milestones: (project.milestones || []).map(formatMilestone)
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const config = await ensureProjectSetupConfig(req.user);
    const policy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const currentYear = new Date().getFullYear();
    const count = await prisma.project.count();
    const seq = (Number(policy.projectStartSeq) || 1001) + count;
    const prjPrefix = (policy.projectPrefix || 'PRJ').toUpperCase();
    const woPrefix = (policy.workOrderPrefix || 'WO').toUpperCase();

    const projectId = req.body.projectId || `${prjPrefix}-${currentYear}-${seq}`;
    const workOrderNumber = req.body.workOrderNumber || `${woPrefix}-${currentYear}-${seq}`;

    const {
      customerPoId,
      projectName,
      customerName,
      machineModel,
      productDescription,
      deliveryCommitmentDate,
      quotationRef,
      contractValue = { currency: 'INR', amount: 0, exchangeRate: 1, baseAmountINR: 0 },
      startDate = new Date(),
      targetDispatchDate,
      plantLocation,
      stages
    } = req.body;

    let resolvedCustomerName = customerName || '';
    let resolvedMachineModel = machineModel || '';
    let resolvedProductDescription = productDescription || '';
    let resolvedContractValue = contractValue;
    let resolvedCommitmentDate = deliveryCommitmentDate ? new Date(deliveryCommitmentDate) : null;
    let resolvedDispatchDate = targetDispatchDate;
    let customerPoUuid = null;
    let customerPoNumber = '';
    let linkedLeadId = null;

    if (customerPoId && UUID_REGEX.test(String(customerPoId))) {
      const poDoc = await prisma.customerPo.findUnique({
        where: { id: String(customerPoId) },
        include: { items: { orderBy: { slNo: 'asc' } } }
      });

      if (poDoc) {
        customerPoUuid = poDoc.id;
        customerPoNumber = poDoc.poNumber;
        linkedLeadId = poDoc.leadId;
        resolvedCustomerName = customerName || poDoc.companyName || poDoc.customerName;

        const poItemModels = (poDoc.items || [])
          .filter((it) => it.qtyType !== 'EXTRA')
          .map((it) => it.modelCode || it.description)
          .filter(Boolean)
          .join(', ');
        resolvedMachineModel = machineModel || poItemModels || 'Precision Winding Machine';

        if (!resolvedProductDescription && poDoc.items?.length > 0) {
          resolvedProductDescription = poDoc.items
            .map((it) => {
              const parts = [];
              if (it.modelCode) parts.push(`Model: ${it.modelCode}`);
              if (it.description) parts.push(it.description);
              if (it.specifications) parts.push(it.specifications);
              if (it.quantity) parts.push(`Qty: ${it.quantity} ${it.uom || 'Nos'}`);
              return parts.join(' — ');
            })
            .join('\n');
        }

        if (poDoc.deliveryCommitmentDate) {
          resolvedCommitmentDate = poDoc.deliveryCommitmentDate;
          if (!targetDispatchDate) {
            resolvedDispatchDate = poDoc.deliveryCommitmentDate;
          }
        }

        if (poDoc.totalAmount && (!contractValue.amount || Number(contractValue.amount) === 0)) {
          resolvedContractValue = {
            currency: poDoc.totalAmount.currency || 'INR',
            amount: Number(poDoc.totalAmount.amount || 0),
            exchangeRate: Number(poDoc.totalAmount.exchangeRate || 1.0),
            baseAmountINR: Number(poDoc.totalAmount.baseAmountINR || poDoc.totalAmount.amount || 0)
          };
        }
      }
    }

    const calculatedBaseAmount =
      Math.round(
        Number(resolvedContractValue.amount || 0) * Number(resolvedContractValue.exchangeRate || 1.0) * 100
      ) / 100;

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';
    const parsedStartDate = new Date(startDate);
    const parsedTargetDispatchDate = resolvedDispatchDate
      ? new Date(resolvedDispatchDate)
      : (resolvedCommitmentDate || new Date(parsedStartDate.getTime() + 90 * 24 * 60 * 60 * 1000));

    const project = await prisma.project.create({
      data: {
        projectId,
        workOrderNumber,
        projectName: projectName || `${resolvedCustomerName} — ${resolvedMachineModel}`,
        customerName: resolvedCustomerName,
        machineModel: resolvedMachineModel,
        productDescription: resolvedProductDescription,
        customerPoId: customerPoUuid,
        customerPoNumber,
        quotationRef: quotationRef || '',
        contractValue: {
          currency: resolvedContractValue.currency || 'INR',
          amount: Number(resolvedContractValue.amount || 0),
          exchangeRate: Number(resolvedContractValue.exchangeRate || 1.0),
          baseAmountINR: calculatedBaseAmount
        },
        startDate: parsedStartDate,
        targetDispatchDate: parsedTargetDispatchDate,
        deliveryCommitmentDate: resolvedCommitmentDate,
        plantLocation: plantLocation || 'Main Works - Unit 1',
        projectManagerId: req.user?.id || null,
        projectManagerName: actorName,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    if (customerPoUuid) {
      await prisma.customerPo.update({
        where: { id: customerPoUuid },
        data: {
          status: 'PROJECT_CONVERTED',
          convertedProjectId: project.projectId,
          convertedAt: new Date(),
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      if (linkedLeadId && UUID_REGEX.test(String(linkedLeadId))) {
        await prisma.lead.update({
          where: { id: String(linkedLeadId) },
          data: {
            stage: 'IN_PRODUCTION',
            convertedProjectId: project.projectId,
            updatedById: req.user?.id || null,
            updatedByName: actorName,
            stageHistory: {
              create: [
                {
                  fromStage: 'WON',
                  toStage: 'IN_PRODUCTION',
                  note: `Master Project ${project.projectId} (${project.workOrderNumber}) kicked off in Project Setup.`,
                  createdById: req.user?.id || null,
                  createdByName: actorName,
                  updatedById: req.user?.id || null,
                  updatedByName: actorName
                }
              ]
            }
          }
        }).catch(() => {});
      }
    }

    // Create ONLY the stages provided by the user (strictly zero default fallback or auto-seeding)
    const stageTemplates = Array.isArray(stages) ? stages : [];
    let createdMilestonesCount = 0;

    for (let idx = 0; idx < stageTemplates.length; idx++) {
      const s = stageTemplates[idx];
      const stageCode = (s.stageCode || s.stage || 'CUSTOM_STAGE').toUpperCase();
      const offsetDays = Number(s.daysOffset ?? s.standardDaysOffset ?? (idx + 1) * 12);
      const targetDate = s.targetDate
        ? new Date(s.targetDate)
        : new Date(parsedStartDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);

      const stageMaster = await prisma.stageMaster.findFirst({
        where: { stageCode }
      });
      const deptModule = s.departmentModule || stageMaster?.departmentModule || 'project-setup';

      await prisma.milestone.create({
        data: {
          projectRefId: project.id,
          projectId: project.projectId,
          title: s.title || s.stageName || stageMaster?.title || stageCode,
          stage: stageCode,
          stageCode,
          departmentModule: deptModule,
          order: Number(s.order ?? s.defaultOrder ?? idx + 1),
          leadRole: s.leadRole || stageMaster?.leadRole || 'Project Manager',
          weightPercent: Number(s.weightPercent ?? stageMaster?.weightPercent ?? 10),
          completionPercent: 0,
          baselineDate: targetDate,
          projectedDate: targetDate,
          status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          notes: s.notes || '',
          remarks: [
            {
              text: s.notes ? `Stage initialized: ${s.notes}` : 'Stage initialized on Project Kickoff.',
              authorName: actorName,
              authorRole: actorRole,
              authorId: req.user?.id || null,
              createdAt: new Date().toISOString()
            }
          ],
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
      createdMilestonesCount++;
    }

    await logAuditEvent({
      req,
      action: 'PROJECT_CREATED',
      module: 'project-setup',
      entityId: project.id,
      entityType: 'Project',
      notes: `Master Project ${project.projectId} (${project.workOrderNumber}) created for ${project.customerName}`
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
          include: { subStages: { orderBy: { order: 'asc' } } }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: `All set! Master Project ${project.projectId} (${project.workOrderNumber}) created with ${createdMilestonesCount} department stages.`,
      project: formatProject(fullProject),
      milestonesCount: createdMilestonesCount
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentStage, status, notes } = req.body;
    const isUuid = UUID_REGEX.test(id);

    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { projectId: id.toUpperCase() }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        currentStage: currentStage ?? existing.currentStage,
        status: status ?? existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Great! Project stage updated.',
      project: formatProject(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);
    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { projectId: id.toUpperCase() }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';
    const {
      projectName,
      customerName,
      machineModel,
      productDescription,
      deliveryCommitmentDate,
      targetDispatchDate,
      plantLocation,
      contractValue,
      status,
      notes,
      stages
    } = req.body;

    let resolvedContractValue = existing.contractValue;
    if (contractValue && typeof contractValue === 'object') {
      resolvedContractValue = {
        currency: contractValue.currency || existing.contractValue?.currency || 'INR',
        amount: Number(contractValue.amount ?? existing.contractValue?.amount ?? 0),
        exchangeRate: Number(contractValue.exchangeRate ?? existing.contractValue?.exchangeRate ?? 1),
        baseAmountINR: Math.round(Number(contractValue.amount || 0) * Number(contractValue.exchangeRate || 1) * 100) / 100
      };
    }

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        projectName: projectName !== undefined ? String(projectName).trim() : existing.projectName,
        customerName: customerName !== undefined ? String(customerName).trim() : existing.customerName,
        machineModel: machineModel !== undefined ? String(machineModel).trim() : existing.machineModel,
        productDescription: productDescription !== undefined ? String(productDescription).trim() : existing.productDescription,
        deliveryCommitmentDate: deliveryCommitmentDate !== undefined ? (deliveryCommitmentDate ? new Date(deliveryCommitmentDate) : null) : existing.deliveryCommitmentDate,
        targetDispatchDate: targetDispatchDate !== undefined ? (targetDispatchDate ? new Date(targetDispatchDate) : existing.targetDispatchDate) : existing.targetDispatchDate,
        plantLocation: plantLocation !== undefined ? String(plantLocation).trim() : existing.plantLocation,
        contractValue: resolvedContractValue,
        status: status !== undefined ? String(status).trim() : existing.status,
        notes: notes !== undefined ? String(notes).trim() : existing.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    if (Array.isArray(stages)) {
      const currentMilestones = await prisma.milestone.findMany({
        where: { projectId: existing.projectId }
      });
      const incomingCodes = new Set(
        stages.map((s) => (s.stageCode || s.stage || '').toUpperCase()).filter(Boolean)
      );

      // Remove stages deleted by the user in edit mode
      for (const cm of currentMilestones) {
        if (!incomingCodes.has(cm.stageCode.toUpperCase())) {
          await prisma.milestone.delete({ where: { id: cm.id } });
        }
      }

      // Update existing stages or create newly added stages
      for (let idx = 0; idx < stages.length; idx++) {
        const s = stages[idx];
        const stageCode = (s.stageCode || s.stage || '').toUpperCase();
        if (!stageCode) continue;

        const targetDate = s.targetDate ? new Date(s.targetDate) : new Date();
        const existingMilestone = currentMilestones.find(
          (cm) => cm.stageCode.toUpperCase() === stageCode
        );

        if (existingMilestone) {
          await prisma.milestone.update({
            where: { id: existingMilestone.id },
            data: {
              title: s.title || s.stageName || existingMilestone.title,
              order: idx + 1,
              leadRole: s.leadRole || existingMilestone.leadRole,
              weightPercent: Number(s.weightPercent ?? existingMilestone.weightPercent),
              notes: s.notes !== undefined ? String(s.notes).trim() : existingMilestone.notes,
              baselineDate: s.targetDate ? new Date(s.targetDate) : existingMilestone.baselineDate,
              projectedDate: s.targetDate ? new Date(s.targetDate) : existingMilestone.projectedDate,
              status: s.status !== undefined ? String(s.status).trim() : existingMilestone.status,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        } else {
          const stageMaster = await prisma.stageMaster.findFirst({ where: { stageCode } });
          const deptModule = s.departmentModule || stageMaster?.departmentModule || 'project-setup';
          await prisma.milestone.create({
            data: {
              projectRefId: existing.id,
              projectId: existing.projectId,
              title: s.title || s.stageName || stageMaster?.title || stageCode,
              stage: stageCode,
              stageCode,
              departmentModule: deptModule,
              order: idx + 1,
              leadRole: s.leadRole || stageMaster?.leadRole || 'Project Manager',
              weightPercent: Number(s.weightPercent ?? stageMaster?.weightPercent ?? 10),
              completionPercent: 0,
              baselineDate: targetDate,
              projectedDate: targetDate,
              status: s.status || 'NOT_STARTED',
              notes: s.notes || '',
              remarks: [
                {
                  text: s.notes ? `Stage added: ${s.notes}` : 'Stage added to Project.',
                  authorName: actorName,
                  authorRole: actorRole,
                  authorId: req.user?.id || null,
                  createdAt: new Date().toISOString()
                }
              ],
              createdById: req.user?.id || null,
              createdByName: actorName,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    }

    await logAuditEvent({
      req,
      action: 'PROJECT_UPDATED',
      module: 'project-setup',
      entityId: updated.id,
      entityType: 'Project',
      notes: `Project ${updated.projectId} (${updated.workOrderNumber}) updated.`
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: updated.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
          include: { subStages: { orderBy: { order: 'asc' } } }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: `All set! Project ${updated.workOrderNumber} updated successfully.`,
      project: formatProject(fullProject)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);
    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { projectId: id.toUpperCase() }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';

    if (existing.customerPoId) {
      await prisma.customerPo.update({
        where: { id: existing.customerPoId },
        data: {
          status: 'RECEIVED',
          convertedProjectId: null,
          convertedAt: null,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      }).catch(() => {});
    }

    await prisma.project.delete({
      where: { id: existing.id }
    });

    await logAuditEvent({
      req,
      action: 'PROJECT_DELETED',
      module: 'project-setup',
      entityId: existing.id,
      entityType: 'Project',
      notes: `Project ${existing.projectId} (${existing.workOrderNumber}) deleted.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Project ${existing.workOrderNumber} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
