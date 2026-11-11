import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatTrial = (t) => ({
  ...t,
  _id: t.id,
  parametersChecked: Array.isArray(t.parametersChecked) ? t.parametersChecked : [],
  snags: Array.isArray(t.snags) ? t.snags : []
});

export const getMachineTrials = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();

    const trials = await prisma.machineTrial.findMany({
      where,
      orderBy: { trialDate: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: trials.length,
      trials: trials.map(formatTrial)
    });
  } catch (error) {
    next(error);
  }
};

export const createMachineTrial = async (req, res, next) => {
  try {
    const count = await prisma.machineTrial.count();
    const trialRunNumber = `TR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const { projectId, trialType = 'DRY_RUN', parametersChecked = [], snags = [], notes = '' } = req.body;
    const cleanPrj = String(projectId || 'PRJ-2026-1001').toUpperCase().trim();

    const formattedSnags = (Array.isArray(snags) ? snags : []).map((snag, idx) => ({
      _id: snag._id || `snag-${Date.now()}-${idx}`,
      id: snag.id || `snag-${Date.now()}-${idx}`,
      snagNumber: `SNG-${cleanPrj}-${String(idx + 1).padStart(3, '0')}`,
      title: snag.title || 'Trial Snag',
      severity: snag.severity || 'MAJOR',
      status: snag.status || 'OPEN',
      assignedTo: snag.assignedTo || actorName,
      rootCauseNotes: snag.rootCauseNotes || ''
    }));

    const hasOpenSnags = formattedSnags.some((s) => s.status !== 'VERIFIED_QC');
    const trialVerdict = hasOpenSnags ? 'FAIL_SNAGS_PENDING' : 'PASS_TRIAL_CLEARED';

    const trial = await prisma.machineTrial.create({
      data: {
        trialRunNumber,
        projectId: cleanPrj,
        trialType,
        parametersChecked: Array.isArray(parametersChecked) ? parametersChecked : [],
        snags: formattedSnags,
        trialVerdict,
        trialEngineerId: req.user?.id || null,
        trialEngineerName: actorName,
        notes,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'MACHINE_TRIAL_RECORDED',
      module: 'production-trial',
      entityId: trial.id,
      entityType: 'MachineTrial',
      notes: `Trial ${trialRunNumber} recorded for project ${cleanPrj}. Verdict: ${trialVerdict}, Snags: ${formattedSnags.length}`
    });

    res.status(201).json({
      success: true,
      message: `All set! Machine trial ${trialRunNumber} recorded.`,
      trial: formatTrial(trial)
    });
  } catch (error) {
    next(error);
  }
};

export const updateSnagStatus = async (req, res, next) => {
  try {
    const { trialId, snagId } = req.params;
    const { status, rectificationDetails } = req.body;
    const actorName = getActorName(req.user);

    const trial = await prisma.machineTrial.findUnique({ where: { id: trialId } });
    if (!trial) {
      return res.status(404).json({ success: false, message: 'Trial record not found.' });
    }

    const snags = Array.isArray(trial.snags) ? [...trial.snags] : [];
    const idx = snags.findIndex((s) => s._id === snagId || s.id === snagId || s.snagNumber === snagId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Snag item not found in trial.' });
    }

    const updatedSnag = {
      ...snags[idx],
      ...(status ? { status } : {}),
      ...(rectificationDetails ? { rectificationDetails } : {}),
      ...(status === 'VERIFIED_QC'
        ? {
            qcVerifiedByName: actorName,
            qcVerifiedAt: new Date().toISOString()
          }
        : {})
    };
    snags[idx] = updatedSnag;

    const allPassed = snags.every((s) => s.status === 'VERIFIED_QC');
    const nextVerdict = allPassed ? 'PASS_TRIAL_CLEARED' : 'FAIL_SNAGS_PENDING';

    const updatedTrial = await prisma.machineTrial.update({
      where: { id: trialId },
      data: {
        snags,
        trialVerdict: nextVerdict,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'SNAG_STATUS_UPDATED',
      module: 'production-trial',
      entityId: updatedTrial.id,
      entityType: 'MachineTrial',
      notes: `Snag ${updatedSnag.snagNumber} on project ${updatedTrial.projectId} marked as ${status}`
    });

    res.status(200).json({
      success: true,
      message: `All set! Snag updated to ${status}.`,
      trial: formatTrial(updatedTrial),
      snag: updatedSnag
    });
  } catch (error) {
    next(error);
  }
};
