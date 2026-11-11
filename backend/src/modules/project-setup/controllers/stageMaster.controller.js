import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const DEFAULT_PROJECT_SETUP_POLICY = {
  projectPrefix: 'PRJ',
  workOrderPrefix: 'WO',
  projectStartSeq: 1001,
  requireRemarkOnStageMove: true,
  lockBaselineDatesAfterKickoff: false,
  autoCreateDepartmentSubStages: true
};

export const DEFAULT_MAIN_STAGE_MASTERS = [
  {
    stageCode: 'PROJECT_SETUP',
    stageName: 'Project Kickoff & Charter Sign-off',
    departmentModule: 'project-setup',
    defaultOrder: 1,
    leadRole: 'Project Manager',
    standardDaysOffset: 5,
    weightPercent: 10,
    description: 'Master Work Order charter, baseline timeline, and department handover.'
  },
  {
    stageCode: 'DESIGN_BOM',
    stageName: '3-Level Hierarchical BOM & CAD Freeze',
    departmentModule: 'design',
    defaultOrder: 2,
    leadRole: 'Lead Design Engineer',
    standardDaysOffset: 15,
    weightPercent: 15,
    description: 'Attach Assembly Machine to Project, release 2D/3D CAD versions and BOM.'
  },
  {
    stageCode: 'PROCUREMENT',
    stageName: 'BOM Net Demand Sourced & Outward POs Released',
    departmentModule: 'purchase',
    defaultOrder: 3,
    leadRole: 'Purchase Officer',
    standardDaysOffset: 35,
    weightPercent: 15,
    description: 'Vendor RFQ, quotation comparison, and outward PO release for RM/BO/Components.'
  },
  {
    stageCode: 'STORE_GRN',
    stageName: 'Material Inward GRN & Store Rack Allocation',
    departmentModule: 'store',
    defaultOrder: 4,
    leadRole: 'Store Manager',
    standardDaysOffset: 45,
    weightPercent: 10,
    description: 'Inward GRN generation, quarantine holding, and hard project rack allocation.'
  },
  {
    stageCode: 'INCOMING_QC',
    stageName: 'Incoming GRN Quality Inspection & Clearance',
    departmentModule: 'quality',
    defaultOrder: 5,
    leadRole: 'Quality Engineer',
    standardDaysOffset: 50,
    weightPercent: 10,
    description: 'Mandatory incoming QC inspection for every GRN before store rack release.'
  },
  {
    stageCode: 'PRODUCTION_ASSEMBLY',
    stageName: 'Mechanical, Electrical & Controls Assembly',
    departmentModule: 'production-trial',
    defaultOrder: 6,
    leadRole: 'Production Engineer',
    standardDaysOffset: 75,
    weightPercent: 20,
    description: 'Store material request/issue, sub-assembly, main machine assembly, and wiring.'
  },
  {
    stageCode: 'MACHINE_TRIAL',
    stageName: 'Internal Dry/Wet Run Trial & Zero-Snag Clearance',
    departmentModule: 'production-trial',
    defaultOrder: 7,
    leadRole: 'Commissioning Engineer',
    standardDaysOffset: 85,
    weightPercent: 10,
    description: 'Dry run, wire winding trial, PDI inspection, and 100% snag resolution.'
  },
  {
    stageCode: 'DISPATCH_READY',
    stageName: 'Packing List, Pre-Dispatch Gate Pass & Dispatch',
    departmentModule: 'dispatch',
    defaultOrder: 8,
    leadRole: 'Dispatch Officer',
    standardDaysOffset: 90,
    weightPercent: 10,
    description: 'Packing list generation, shipping dossier, dispatch, and After-Sales handover.'
  }
];

export const DEFAULT_DEPARTMENT_SUB_STAGE_MASTERS = [
  {
    subStageCode: 'DES_GA_LAYOUT',
    subStageName: 'General Arrangement (GA) Drawing & Client Approval',
    departmentModule: 'design',
    parentStageCode: 'DESIGN_BOM',
    defaultOrder: 1,
    standardDays: 4,
    weightPercent: 30,
    description: 'Prepare overall machine footprint and obtain technical clearance.'
  },
  {
    subStageCode: 'DES_SUB_ASSEMBLY_CAD',
    subStageName: 'Sub-Assembly & Part Component 3D/2D Drawings',
    departmentModule: 'design',
    parentStageCode: 'DESIGN_BOM',
    defaultOrder: 2,
    standardDays: 6,
    weightPercent: 40,
    description: 'Complete versioned drawings for machined components and sub-assemblies.'
  },
  {
    subStageCode: 'DES_BOM_RELEASE',
    subStageName: 'Attach Machine Assembly & Freeze Master BOM',
    departmentModule: 'design',
    parentStageCode: 'DESIGN_BOM',
    defaultOrder: 3,
    standardDays: 3,
    weightPercent: 30,
    description: 'Link Assembly Machine to Project and release net demand to Purchase.'
  },
  {
    subStageCode: 'PUR_RFQ_QUOTES',
    subStageName: 'Vendor RFQ & Price Comparison',
    departmentModule: 'purchase',
    parentStageCode: 'PROCUREMENT',
    defaultOrder: 1,
    standardDays: 5,
    weightPercent: 40,
    description: 'Float RFQs or apply approved vendor price list for BOM items.'
  },
  {
    subStageCode: 'PUR_PO_RELEASE',
    subStageName: 'Outward Purchase Order Release & Expediting',
    departmentModule: 'purchase',
    parentStageCode: 'PROCUREMENT',
    defaultOrder: 2,
    standardDays: 10,
    weightPercent: 60,
    description: 'Issue outward POs to vendors and track material delivery.'
  },
  {
    subStageCode: 'PROD_MECH_ASSEMBLY',
    subStageName: 'Base Frame, Ball Screw & Mechanical Sub-Assembly',
    departmentModule: 'production-trial',
    parentStageCode: 'PRODUCTION_ASSEMBLY',
    defaultOrder: 1,
    standardDays: 10,
    weightPercent: 50,
    description: 'Mechanical structure, spindle, traverse drive, and tensioner assembly.'
  },
  {
    subStageCode: 'PROD_ELEC_CONTROLS',
    subStageName: 'PLC Control Panel Wiring & Servo Integration',
    departmentModule: 'production-trial',
    parentStageCode: 'PRODUCTION_ASSEMBLY',
    defaultOrder: 2,
    standardDays: 8,
    weightPercent: 50,
    description: 'Microprocessor controller wiring, turns sensing disc, and safety interlocks.'
  },
  {
    subStageCode: 'DISP_PACKING_PDI',
    subStageName: 'Final PDI Verification & Crate Packing List',
    departmentModule: 'dispatch',
    parentStageCode: 'DISPATCH_READY',
    defaultOrder: 1,
    standardDays: 3,
    weightPercent: 100,
    description: 'Verify zero open snags, generate crate packing list, and issue gate pass.'
  }
];

const formatStageMaster = (sm) => ({
  ...sm,
  _id: sm.id
});

const formatSubStageMaster = (ssm) => ({
  ...ssm,
  _id: ssm.id,
  name: ssm.subStageName
});

export const ensureDefaultStageMasters = async (user = null) => {
  const count = await prisma.stageMaster.count();
  const actorName = getActorName(user);
  if (count === 0) {
    for (const st of DEFAULT_MAIN_STAGE_MASTERS) {
      await prisma.stageMaster.upsert({
        where: { stageCode: st.stageCode },
        update: {},
        create: {
          ...st,
          createdById: user?.id || null,
          createdByName: actorName,
          updatedById: user?.id || null,
          updatedByName: actorName
        }
      });
    }
  }

  const subCount = await prisma.departmentSubStageMaster.count();
  if (subCount === 0) {
    for (const sst of DEFAULT_DEPARTMENT_SUB_STAGE_MASTERS) {
      await prisma.departmentSubStageMaster.upsert({
        where: { subStageCode: sst.subStageCode },
        update: {},
        create: {
          ...sst,
          createdById: user?.id || null,
          createdByName: actorName,
          updatedById: user?.id || null,
          updatedByName: actorName
        }
      });
    }
  }
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
    await ensureDefaultStageMasters(req.user);
    const config = await ensureProjectSetupConfig(req.user);

    const { includeInactive, departmentModule } = req.query;
    const where = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    if (departmentModule) {
      where.departmentModule = String(departmentModule);
    }

    const stages = await prisma.stageMaster.findMany({
      where,
      orderBy: [{ defaultOrder: 'asc' }, { createdAt: 'asc' }]
    });

    const subStages = await prisma.departmentSubStageMaster.findMany({
      where: departmentModule ? { departmentModule: String(departmentModule) } : {},
      orderBy: [{ parentStageCode: 'asc' }, { defaultOrder: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: stages.length,
      stages: stages.map(formatStageMaster),
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

    if (!stageCode || !stageName) {
      return res.status(400).json({
        success: false,
        message: 'Stage Code and Stage Name are required.'
      });
    }

    const normalizedCode = stageCode.toUpperCase().trim().replace(/\s+/g, '_');
    const existing = await prisma.stageMaster.findUnique({ where: { stageCode: normalizedCode } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Stage Code '${normalizedCode}' already exists.`
      });
    }

    const actorName = getActorName(req.user);

    const stage = await prisma.stageMaster.create({
      data: {
        stageCode: normalizedCode,
        stageName: stageName.trim(),
        departmentModule: String(departmentModule || 'project-setup'),
        defaultOrder: Number(defaultOrder) || 1,
        leadRole: leadRole || 'Project Manager',
        standardDaysOffset: Number(standardDaysOffset) || 14,
        weightPercent: Number(weightPercent) || 10,
        description: description || '',
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
      notes: `Stage Master created: ${stage.stageCode} (${stage.stageName})`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Stage Master created.',
      stage: formatStageMaster(stage)
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

    const actorName = getActorName(req.user);

    const stage = await prisma.stageMaster.update({
      where: { id },
      data: {
        stageName: stageName !== undefined ? stageName.trim() : existing.stageName,
        departmentModule: departmentModule !== undefined ? String(departmentModule) : existing.departmentModule,
        defaultOrder: defaultOrder !== undefined ? Number(defaultOrder) : existing.defaultOrder,
        leadRole: leadRole !== undefined ? leadRole : existing.leadRole,
        standardDaysOffset: standardDaysOffset !== undefined ? Number(standardDaysOffset) : existing.standardDaysOffset,
        weightPercent: weightPercent !== undefined ? Number(weightPercent) : existing.weightPercent,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Great! Stage Master updated.',
      stage: formatStageMaster(stage)
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

    const actorName = getActorName(req.user);
    const stage = await prisma.stageMaster.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Stage Master deactivated.',
      stage: formatStageMaster(stage)
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

    const actorName = getActorName(req.user);

    const created = await prisma.departmentSubStageMaster.upsert({
      where: { subStageCode: normalizedCode },
      update: {
        subStageName: finalName,
        departmentModule,
        parentStageCode,
        defaultOrder: Number(defaultOrder) || 1,
        standardDays: Number(standardDays) || 5,
        weightPercent: Number(weightPercent) || 20,
        description: description || '',
        isActive: true,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      create: {
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
    const finalName = req.body.name !== undefined 
      ? req.body.name.trim() 
      : (req.body.subStageName !== undefined ? req.body.subStageName.trim() : existing.subStageName);

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

    res.status(200).json({
      success: true,
      message: 'All set! Project Setup prefix and lock policies saved.',
      prefixLockPolicy: updated.prefixLockPolicy
    });
  } catch (error) {
    next(error);
  }
};
