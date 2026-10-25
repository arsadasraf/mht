import { Project } from '../models/project.model.js';
import { Milestone } from '../models/milestone.model.js';
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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, page: Number(page), projects });
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
      .populate('createdBy', 'firstName lastName');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const milestones = await Milestone.find({ projectId: project.projectId }).sort({ baselineDate: 1 });

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
      plantLocation
    } = req.body;

    const project = new Project({
      projectId,
      workOrderNumber,
      projectName,
      customerName,
      machineModel,
      quotationRef,
      contractValue: {
        currency: contractValue.currency || 'INR',
        amount: Number(contractValue.amount || 0),
        exchangeRate: Number(contractValue.exchangeRate || 1.0),
        baseAmountINR: Math.round(Number(contractValue.amount || 0) * Number(contractValue.exchangeRate || 1.0) * 100) / 100
      },
      startDate,
      targetDispatchDate: targetDispatchDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Default 90-day lead time
      projectManager,
      leadDesignEngineer,
      leadProductionEngineer,
      plantLocation: plantLocation || 'Main Works - Unit 1',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await project.save();

    // Auto-seed standard 7-stage baseline milestones for the project spine
    const standardStages = [
      { stage: 'DESIGN_BOM', title: '3-Level Hierarchical BOM & CAD Freeze', daysOffset: 14 },
      { stage: 'PROCUREMENT', title: 'BOM Net Demand Sourced & POs Released', daysOffset: 35 },
      { stage: 'INCOMING_QC', title: 'Critical Inward Gate Inspection & QC Pass', daysOffset: 50 },
      { stage: 'STORE_ALLOCATION', title: 'Hard Stock Allocation Locked to Project', daysOffset: 55 },
      { stage: 'PRODUCTION_ASSEMBLY', title: 'Mechanical & Electrical Assembly Sign-off', daysOffset: 75 },
      { stage: 'MACHINE_TRIAL', title: 'Internal Dry/Wet Run Trial Passed (Zero Snags)', daysOffset: 85 },
      { stage: 'DISPATCH_READY', title: 'Zero-Snag Block Verification & Dossier Sign-off', daysOffset: 90 }
    ];

    const milestonesToCreate = standardStages.map((s) => {
      const milestoneDate = new Date(new Date(startDate).getTime() + s.daysOffset * 24 * 60 * 60 * 1000);
      return {
        projectId: project.projectId,
        title: s.title,
        stage: s.stage,
        baselineDate: milestoneDate,
        projectedDate: milestoneDate,
        status: 'PENDING',
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      };
    });

    await Milestone.insertMany(milestonesToCreate);

    await logAuditEvent({
      req,
      action: 'PROJECT_CREATED',
      module: 'project-setup',
      entityId: project._id,
      entityType: 'Project',
      notes: `Master Project Spine minted: ${project.projectId} (${project.workOrderNumber}) for ${project.customerName}`
    });

    res.status(201).json({ success: true, message: 'Project and baseline schedule created successfully.', project });
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
