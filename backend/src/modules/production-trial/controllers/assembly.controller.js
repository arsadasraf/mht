import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const DEFAULT_ASSEMBLY_STAGES = [
  { sequenceOrder: 1, subAssemblyGroup: 'Main Frame', stageName: 'Base Frame Fabrication & Leveling' },
  { sequenceOrder: 2, subAssemblyGroup: 'Spindle Headstock', stageName: 'Headstock Spindle & Optical Turns Sensor Sub-Assembly' },
  { sequenceOrder: 3, subAssemblyGroup: 'Traverse Assembly', stageName: 'Ball Screw Servo Traverse & Wire Guide Integration' },
  { sequenceOrder: 4, subAssemblyGroup: 'Control Panel', stageName: '16-Bit Microprocessor Controller Wiring & Interlocks' }
];

export const getAssemblyStages = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const cleanPrj = projectId ? String(projectId).toUpperCase().trim() : 'PRJ-2026-1001';
    const actorName = getActorName(req.user);

    let stages = await prisma.assemblyStage.findMany({
      where: { projectId: cleanPrj },
      orderBy: { sequenceOrder: 'asc' }
    });

    if (stages.length === 0 && cleanPrj) {
      for (const s of DEFAULT_ASSEMBLY_STAGES) {
        await prisma.assemblyStage.create({
          data: {
            projectId: cleanPrj,
            sequenceOrder: s.sequenceOrder,
            subAssemblyGroup: s.subAssemblyGroup,
            stageName: s.stageName,
            status: 'PENDING',
            progressPercentage: 0,
            createdById: req.user?.id || null,
            createdByName: actorName,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }
      stages = await prisma.assemblyStage.findMany({
        where: { projectId: cleanPrj },
        orderBy: { sequenceOrder: 'asc' }
      });
    }

    res.status(200).json({
      success: true,
      count: stages.length,
      stages: stages.map((st) => ({ ...st, _id: st.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssemblyStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { progressPercentage, status, notes, signOff } = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.assemblyStage.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Assembly stage not found.' });
    }

    const data = {
      updatedById: req.user?.id || null,
      updatedByName: actorName
    };

    if (progressPercentage !== undefined) data.progressPercentage = Number(progressPercentage);
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;

    if (signOff) {
      data.status = 'GATE_PASSED';
      data.progressPercentage = 100;
      data.gateChecklistPassed = true;
      data.stageGateSignOffById = req.user?.id || null;
      data.stageGateSignOffName = actorName;
      data.stageGateSignOffAt = new Date();
    }

    const stage = await prisma.assemblyStage.update({
      where: { id },
      data
    });

    await logAuditEvent({
      req,
      action: 'ASSEMBLY_STAGE_UPDATED',
      module: 'production-trial',
      entityId: stage.id,
      entityType: 'AssemblyStage',
      notes: `Stage ${stage.subAssemblyGroup} on project ${stage.projectId} updated: ${stage.status} (${stage.progressPercentage}%)`
    });

    res.status(200).json({
      success: true,
      message: 'All set! Assembly stage updated.',
      stage: { ...stage, _id: stage.id }
    });
  } catch (error) {
    next(error);
  }
};
