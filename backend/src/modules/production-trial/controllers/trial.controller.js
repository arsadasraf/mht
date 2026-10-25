import { MachineTrial } from '../models/machineTrial.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getMachineTrials = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();

    const trials = await MachineTrial.find(query)
      .populate('trialEngineer', 'firstName lastName')
      .populate('snags.assignedTo', 'firstName lastName')
      .populate('snags.qcVerifiedBy', 'firstName lastName')
      .sort({ trialDate: -1 });

    res.status(200).json({ success: true, count: trials.length, trials });
  } catch (error) {
    next(error);
  }
};

export const createMachineTrial = async (req, res, next) => {
  try {
    const count = await MachineTrial.countDocuments();
    const trialRunNumber = `TR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const { projectId, trialType, parametersChecked = [], snags = [], notes } = req.body;

    const hasOpenSnags = snags.length > 0;
    const trialVerdict = hasOpenSnags ? 'FAIL_SNAGS_PENDING' : 'PASS_TRIAL_CLEARED';

    const formattedSnags = snags.map((snag, idx) => ({
      snagNumber: `SNG-${projectId.toUpperCase()}-${String(idx + 1).padStart(3, '0')}`,
      title: snag.title,
      severity: snag.severity || 'MAJOR',
      status: 'OPEN',
      assignedTo: snag.assignedTo,
      rootCauseNotes: snag.rootCauseNotes
    }));

    const trial = new MachineTrial({
      trialRunNumber,
      projectId: projectId.toUpperCase(),
      trialType,
      parametersChecked,
      snags: formattedSnags,
      trialVerdict,
      trialEngineer: req.user?._id,
      notes,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await trial.save();

    await logAuditEvent({
      req,
      action: 'MACHINE_TRIAL_RECORDED',
      module: 'production-trial',
      entityId: trial._id,
      entityType: 'MachineTrial',
      notes: `Trial ${trialRunNumber} recorded for project ${projectId}. Verdict: ${trialVerdict}, Snags: ${formattedSnags.length}`
    });

    res.status(201).json({ success: true, message: 'Machine trial recorded.', trial });
  } catch (error) {
    next(error);
  }
};

export const updateSnagStatus = async (req, res, next) => {
  try {
    const { trialId, snagId } = req.params;
    const { status, rectificationDetails } = req.body;

    const trial = await MachineTrial.findById(trialId);
    if (!trial) {
      return res.status(404).json({ success: false, message: 'Trial record not found.' });
    }

    const snag = trial.snags.id(snagId);
    if (!snag) {
      return res.status(404).json({ success: false, message: 'Snag item not found in trial.' });
    }

    if (status) snag.status = status;
    if (rectificationDetails) snag.rectificationDetails = rectificationDetails;

    if (status === 'VERIFIED_QC') {
      snag.qcVerifiedBy = req.user?._id;
      snag.qcVerifiedAt = new Date();
    }

    // Check if all snags across trial are VERIFIED_QC
    const allPassed = trial.snags.every((s) => s.status === 'VERIFIED_QC');
    if (allPassed) {
      trial.trialVerdict = 'PASS_TRIAL_CLEARED';
    }

    trial.updatedBy = req.user?._id;
    await trial.save();

    await logAuditEvent({
      req,
      action: 'SNAG_STATUS_UPDATED',
      module: 'production-trial',
      entityId: trial._id,
      entityType: 'MachineTrial',
      notes: `Snag ${snag.snagNumber} on project ${trial.projectId} marked as ${status}`
    });

    res.status(200).json({ success: true, message: `Snag updated to ${status}.`, trial, snag });
  } catch (error) {
    next(error);
  }
};
