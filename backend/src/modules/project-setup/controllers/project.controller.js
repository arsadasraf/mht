import { Project } from '../models/project.model.js';
import { Milestone } from '../models/milestone.model.js';
import { StageMaster } from '../models/stageMaster.model.js';
import { CustomerPo } from '../../crm/models/customerPo.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getProjects = async (req, res, next) => {
  try {
    const { status, stage, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (stage) query.currentStage = stage;
    if (search) {
      query.$or = [
        { projectId: { $regex: search, $options: 'i' } },
        { workOrderNumber: { $regex: search, $options: 'i' } },
        { projectName: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { machineModel: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('projectManager', 'firstName lastName email')
      .populate('leadDesignEngineer', 'firstName lastName')
      .populate('leadProductionEngineer', 'firstName lastName')
      .populate('customerPoRef', 'poNumber poDate totalAmount')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, page: Number(page), projects });
  } catch (error) {
    next(error);
  }
};

export const getAvailableCustomerPos = async (req, res, next) => {
  try {
    const customerPos = await CustomerPo.find({
      status: { $in: ['RECEIVED', 'VERIFIED'] }
    })
      .select('poNumber customerName companyName items totalAmount currency deliveryCommitmentDate poDate status')
      .sort({ poDate: -1, createdAt: -1 })
      .limit(30)
      .lean();

    res.status(200).json({ success: true, count: customerPos.length, customerPos });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await Project.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { projectId: id.toUpperCase() }]
    })
      .populate('projectManager', 'firstName lastName email')
      .populate('leadDesignEngineer', 'firstName lastName email')
      .populate('leadProductionEngineer', 'firstName lastName email')
      .populate('customerPoRef', 'poNumber poDate totalAmount')
      .populate('createdBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const milestones = await Milestone.find({ projectId: project.projectId })
      .populate('signOffBy', 'firstName lastName email')
      .sort({ order: 1, baselineDate: 1 });

    res.status(200).json({ success: true, project, milestones });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const count = await Project.countDocuments();
    const padded = String(count + 1).padStart(3, '0');
    const projectId = req.body.projectId || `PRJ-${currentYear}-${padded}`;
    const workOrderNumber = req.body.workOrderNumber || `WO-${currentYear}-${padded}`;

    const {
      creationMode, // 'CUSTOMER_PO' or 'DIRECT'
      customerPoId,
      projectName,
      customerName,
      machineModel,
      quotationRef,
      contractValue = { currency: 'INR', amount: 0, exchangeRate: 1, baseAmountINR: 0 },
      startDate = new Date(),
      targetDispatchDate,
      projectManager,
      leadDesignEngineer,
      leadProductionEngineer,
      plantLocation,
      stages // optional custom array of stages selected by user
    } = req.body;

    let resolvedCustomerName = customerName;
    let resolvedMachineModel = machineModel;
    let resolvedContractValue = contractValue;
    let resolvedDispatchDate = targetDispatchDate;
    let customerPoRef = null;
    let customerPoNumber = '';

    // If based on customer PO, link and auto-extract parameters if not overridden
    if (customerPoId) {
      const poDoc = await CustomerPo.findById(customerPoId);
      if (poDoc) {
        customerPoRef = poDoc._id;
        customerPoNumber = poDoc.poNumber;
        resolvedCustomerName = customerName || poDoc.companyName || poDoc.customerName;
        const poItemModel = poDoc.items?.[0]?.modelCode || poDoc.items?.[0]?.description;
        resolvedMachineModel = machineModel || poItemModel || 'Precision Winding Machine';
        if (!targetDispatchDate && poDoc.deliveryCommitmentDate) {
          resolvedDispatchDate = poDoc.deliveryCommitmentDate;
        }
        if (poDoc.totalAmount && (!contractValue.amount || Number(contractValue.amount) === 0)) {
          resolvedContractValue = {
            currency: poDoc.totalAmount.currency || 'INR',
            amount: poDoc.totalAmount.amount || 0,
            exchangeRate: poDoc.totalAmount.exchangeRate || 1.0,
            baseAmountINR: poDoc.totalAmount.baseAmountINR || poDoc.totalAmount.amount || 0
          };
        }
      }
    }

    const calculatedBaseAmount =
      Math.round(
        Number(resolvedContractValue.amount || 0) *
        Number(resolvedContractValue.exchangeRate || 1.0) *
        100
      ) / 100;

    const project = new Project({
      projectId,
      workOrderNumber,
      projectName: projectName || `${resolvedCustomerName} — ${resolvedMachineModel}`,
      customerName: resolvedCustomerName,
      machineModel: resolvedMachineModel,
      customerPoRef,
      customerPoNumber,
      quotationRef,
      contractValue: {
        currency: resolvedContractValue.currency || 'INR',
        amount: Number(resolvedContractValue.amount || 0),
        exchangeRate: Number(resolvedContractValue.exchangeRate || 1.0),
        baseAmountINR: calculatedBaseAmount
      },
      startDate: new Date(startDate),
      targetDispatchDate: resolvedDispatchDate
        ? new Date(resolvedDispatchDate)
        : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Default 90 days
      projectManager,
      leadDesignEngineer,
      leadProductionEngineer,
      plantLocation: plantLocation || 'Main Works - Unit 1',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await project.save();

    // If linked to Customer PO, mark PO as converted
    if (customerPoRef) {
      await CustomerPo.findByIdAndUpdate(customerPoRef, {
        status: 'PROJECT_CONVERTED',
        convertedProjectId: project.projectId,
        convertedAt: new Date(),
        updatedBy: req.user?._id
      });
    }

    // Determine Stages to Initialize:
    // 1. If explicit stages passed by user
    // 2. Else fetch active StageMaster records
    // 3. Fallback to default 8 stages
    let milestonesToCreate = [];

    const authorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'System'
      : 'System';
    const authorRole = req.user?.role?.name || 'Project Manager';

    if (Array.isArray(stages) && stages.length > 0) {
      milestonesToCreate = stages.map((s, idx) => {
        const offset = s.daysOffset ? Number(s.daysOffset) : (idx + 1) * 12;
        const targetDate = s.targetDate
          ? new Date(s.targetDate)
          : new Date(new Date(project.startDate).getTime() + offset * 24 * 60 * 60 * 1000);

        return {
          projectId: project.projectId,
          title: s.title || s.stageName,
          stage: s.stage || s.stageCode || 'CUSTOM_STAGE',
          stageCode: s.stageCode || s.stage || 'CUSTOM_STAGE',
          order: s.order ? Number(s.order) : idx + 1,
          leadRole: s.leadRole || 'Project Manager',
          weightPercent: s.weightPercent ? Number(s.weightPercent) : 10,
          baselineDate: targetDate,
          projectedDate: targetDate,
          status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          remarks: [
            {
              text: 'Stage initialized.',
              authorName,
              authorRole,
              authorId: req.user?._id,
              createdAt: new Date()
            }
          ],
          createdBy: req.user?._id,
          updatedBy: req.user?._id
        };
      });
    } else {
      // Query Stage Master
      const activeStageMasters = await StageMaster.find({ isActive: true }).sort({ defaultOrder: 1 });

      if (activeStageMasters && activeStageMasters.length > 0) {
        milestonesToCreate = activeStageMasters.map((sm, idx) => {
          const targetDate = new Date(
            new Date(project.startDate).getTime() + (sm.standardDaysOffset || (idx + 1) * 12) * 24 * 60 * 60 * 1000
          );
          return {
            projectId: project.projectId,
            title: sm.stageName,
            stage: sm.stageCode,
            stageCode: sm.stageCode,
            order: sm.defaultOrder || idx + 1,
            leadRole: sm.leadRole || 'Project Manager',
            weightPercent: sm.weightPercent || 10,
            baselineDate: targetDate,
            projectedDate: targetDate,
            status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
            remarks: [
              {
                text: 'Stage initialized.',
                authorName,
                authorRole,
                authorId: req.user?._id,
                createdAt: new Date()
              }
            ],
            createdBy: req.user?._id,
            updatedBy: req.user?._id
          };
        });
      } else {
        // Fallback default stages
        const defaultStages = [
          { stage: 'PROJECT_SETUP', title: 'Project Kickoff & Charter Sign-off', daysOffset: 7, role: 'Project Manager' },
          { stage: 'DESIGN_BOM', title: '3-Level Hierarchical BOM & CAD Freeze', daysOffset: 14, role: 'Lead Design Engineer' },
          { stage: 'PROCUREMENT', title: 'BOM Net Demand Sourced & POs Released', daysOffset: 35, role: 'Purchase Officer' },
          { stage: 'INCOMING_QC', title: 'Critical Inward Gate Inspection & QC Pass', daysOffset: 50, role: 'Quality Engineer' },
          { stage: 'STORE_ALLOCATION', title: 'Hard Stock Allocation Locked to Project', daysOffset: 55, role: 'Store Manager' },
          { stage: 'PRODUCTION_ASSEMBLY', title: 'Mechanical & Electrical Assembly Sign-off', daysOffset: 75, role: 'Production Engineer' },
          { stage: 'MACHINE_TRIAL', title: 'Internal Dry/Wet Run Trial Passed (Zero Snags)', daysOffset: 85, role: 'Commissioning Engineer' },
          { stage: 'DISPATCH_READY', title: 'Zero-Snag Block Verification & Dossier Sign-off', daysOffset: 90, role: 'Plant Head' }
        ];

        milestonesToCreate = defaultStages.map((s, idx) => {
          const milestoneDate = new Date(new Date(project.startDate).getTime() + s.daysOffset * 24 * 60 * 60 * 1000);
          return {
            projectId: project.projectId,
            title: s.title,
            stage: s.stage,
            stageCode: s.stage,
            order: idx + 1,
            leadRole: s.role,
            weightPercent: 12.5,
            baselineDate: milestoneDate,
            projectedDate: milestoneDate,
            status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
            remarks: [
              {
                text: 'Stage initialized.',
                authorName,
                authorRole,
                authorId: req.user?._id,
                createdAt: new Date()
              }
            ],
            createdBy: req.user?._id,
            updatedBy: req.user?._id
          };
        });
      }
    }

    if (milestonesToCreate.length > 0) {
      await Milestone.insertMany(milestonesToCreate);
    }

    await logAuditEvent({
      req,
      action: 'PROJECT_CREATED',
      module: 'project-setup',
      entityId: project._id,
      entityType: 'Project',
      notes: `Master Project Spine minted: ${project.projectId} (${project.workOrderNumber}) for ${project.customerName}. Mode: ${creationMode || (customerPoId ? 'CUSTOMER_PO' : 'DIRECT')}`
    });

    res.status(201).json({
      success: true,
      message: 'Project and baseline schedule created successfully.',
      project,
      milestonesCount: milestonesToCreate.length
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentStage, status } = req.body;

    const project = await Project.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { projectId: id.toUpperCase() }]
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const previousStage = project.currentStage;
    if (currentStage) project.currentStage = currentStage;
    if (status) project.status = status;
    project.updatedBy = req.user?._id;

    await project.save();

    await logAuditEvent({
      req,
      action: 'PROJECT_STAGE_UPDATED',
      module: 'project-setup',
      entityId: project._id,
      entityType: 'Project',
      beforeData: { currentStage: previousStage },
      afterData: { currentStage: project.currentStage, status: project.status },
      notes: `Project ${project.projectId} transitioned from ${previousStage} to ${project.currentStage}`
    });

    res.status(200).json({ success: true, message: `Project advanced to stage ${project.currentStage}.`, project });
  } catch (error) {
    next(error);
  }
};
