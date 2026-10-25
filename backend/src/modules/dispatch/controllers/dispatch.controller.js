import { DispatchOrder } from '../models/dispatchOrder.model.js';
import { MachineTrial } from '../../production-trial/models/machineTrial.model.js';
import { Project } from '../../project-setup/models/project.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getDispatchOrders = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (status) query.status = status;

    const orders = await DispatchOrder.find(query)
      .populate('zeroSnagVerifiedBy', 'firstName lastName')
      .populate('dispatchedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, dispatchOrders: orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Absolute Zero-Snag Verification:
 * Checks every snag recorded during machine trials. 100% must be in 'VERIFIED_QC' state.
 */
export const verifyZeroSnags = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const trials = await MachineTrial.find({ projectId: projectId.toUpperCase() });

    const openSnags = [];
    trials.forEach((trial) => {
      trial.snags.forEach((snag) => {
        if (snag.status !== 'VERIFIED_QC') {
          openSnags.push({
            snagNumber: snag.snagNumber,
            title: snag.title,
            severity: snag.severity,
            status: snag.status,
            trialRun: trial.trialRunNumber
          });
        }
      });
    });

    const isZeroSnags = openSnags.length === 0;

    let dispatch = await DispatchOrder.findOne({ projectId: projectId.toUpperCase() });
    if (dispatch) {
      if (isZeroSnags) {
        dispatch.zeroSnagVerified = true;
        dispatch.zeroSnagVerifiedAt = new Date();
        dispatch.zeroSnagVerifiedBy = req.user?._id;
        if (dispatch.status === 'SNAG_BLOCKED') {
          dispatch.status = 'PRE_DISPATCH_HOLD';
        }
      } else {
        dispatch.zeroSnagVerified = false;
        dispatch.status = 'SNAG_BLOCKED';
      }
      dispatch.updatedBy = req.user?._id;
      await dispatch.save();
    }

    res.status(200).json({
      success: true,
      projectId: projectId.toUpperCase(),
      zeroSnagCleared: isZeroSnags,
      unresolvedSnagsCount: openSnags.length,
      unresolvedSnags: openSnags,
      message: isZeroSnags
        ? 'Zero-Snag Verification PASSED: 100% of snags verified by QC. Ready for gate pass unlock.'
        : `Zero-Snag Block ACTIVE: ${openSnags.length} unresolved snag(s) must be rectified and QC-verified before gate pass can unlock.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Issue Gate Pass:
 * Strictly blocked if zeroSnagVerified is false.
 */
export const issueGatePass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shippingAddress, transporterName, vehicleNumber, lrNumber, commercialClearanceGiven } = req.body;

    const dispatch = await DispatchOrder.findById(id);
    if (!dispatch) {
      return res.status(404).json({ success: false, message: 'Dispatch order not found.' });
    }

    // STRICT ZERO-SNAG ENFORCEMENT
    if (!dispatch.zeroSnagVerified) {
      return res.status(403).json({
        success: false,
        code: 'ZERO_SNAG_BLOCK',
        message: 'STRICT SYSTEM BLOCK: Cannot issue gate pass. Absolute Zero-Snag rule requires 100% QC sign-off on all machine snags prior to dispatch.'
      });
    }

    const count = await DispatchOrder.countDocuments({ gatePassNumber: { $exists: true, $ne: null } });
    const gatePassNumber = `GP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    dispatch.gatePassNumber = gatePassNumber;
    dispatch.status = 'GATE_PASS_UNLOCKED';
    if (shippingAddress) dispatch.shippingAddress = shippingAddress;
    if (transporterName) dispatch.transporterName = transporterName;
    if (vehicleNumber) dispatch.vehicleNumber = vehicleNumber;
    if (lrNumber) dispatch.lrNumber = lrNumber;
    if (commercialClearanceGiven !== undefined) dispatch.commercialClearanceGiven = commercialClearanceGiven;

    dispatch.updatedBy = req.user?._id;
    await dispatch.save();

    // Update project stage
    await Project.findOneAndUpdate(
      { projectId: dispatch.projectId },
      { currentStage: 'DISPATCH_READY', updatedBy: req.user?._id }
    );

    await logAuditEvent({
      req,
      action: 'GATE_PASS_ISSUED',
      module: 'dispatch',
      entityId: dispatch._id,
      entityType: 'DispatchOrder',
      notes: `Gate Pass ${gatePassNumber} issued for project ${dispatch.projectId}. Absolute Zero-Snag passed.`
    });

    res.status(200).json({
      success: true,
      message: `Gate Pass ${gatePassNumber} unlocked successfully. Zero-Snag verified.`,
      dispatch
    });
  } catch (error) {
    next(error);
  }
};
