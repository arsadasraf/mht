import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatDispatch = (d) => ({
  ...d,
  _id: d.id,
  packingList: Array.isArray(d.packingList) ? d.packingList : []
});

export const getDispatchOrders = async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    const cleanPrj = projectId ? String(projectId).toUpperCase().trim() : '';
    const actorName = getActorName(req.user);

    if (cleanPrj) {
      const existing = await prisma.dispatchOrder.findUnique({ where: { projectId: cleanPrj } });
      if (!existing) {
        const count = await prisma.dispatchOrder.count();
        await prisma.dispatchOrder.create({
          data: {
            dispatchNumber: `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
            projectId: cleanPrj,
            status: 'PRE_DISPATCH_HOLD',
            zeroSnagVerified: false,
            packingList: [
              { boxNumber: 'CRATE-01', description: 'Main Winding Machine Unit', grossWeightKg: 850, dimensionsCm: '180x120x150' },
              { boxNumber: 'CRATE-02', description: 'Control Panel, Wire Tensioner & Mandrel Accessories', grossWeightKg: 140, dimensionsCm: '90x70x110' }
            ],
            createdById: req.user?.id || null,
            createdByName: actorName,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }
    }

    const where = {};
    if (cleanPrj) where.projectId = cleanPrj;
    if (status) where.status = String(status);

    const orders = await prisma.dispatchOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      dispatchOrders: orders.map(formatDispatch)
    });
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
    const cleanPrj = String(projectId).toUpperCase().trim();
    const actorName = getActorName(req.user);

    const trials = await prisma.machineTrial.findMany({
      where: { projectId: cleanPrj }
    });

    const openSnags = [];
    trials.forEach((trial) => {
      const snags = Array.isArray(trial.snags) ? trial.snags : [];
      snags.forEach((snag) => {
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

    let dispatch = await prisma.dispatchOrder.findUnique({ where: { projectId: cleanPrj } });
    if (!dispatch) {
      const count = await prisma.dispatchOrder.count();
      dispatch = await prisma.dispatchOrder.create({
        data: {
          dispatchNumber: `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`,
          projectId: cleanPrj,
          status: isZeroSnags ? 'PRE_DISPATCH_HOLD' : 'SNAG_BLOCKED',
          zeroSnagVerified: isZeroSnags,
          zeroSnagVerifiedAt: isZeroSnags ? new Date() : null,
          zeroSnagVerifiedById: isZeroSnags ? req.user?.id || null : null,
          zeroSnagVerifiedByName: isZeroSnags ? actorName : '',
          packingList: [
            { boxNumber: 'CRATE-01', description: 'Main Winding Machine Unit', grossWeightKg: 850, dimensionsCm: '180x120x150' }
          ],
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    } else {
      dispatch = await prisma.dispatchOrder.update({
        where: { projectId: cleanPrj },
        data: {
          zeroSnagVerified: isZeroSnags,
          zeroSnagVerifiedAt: isZeroSnags ? new Date() : null,
          zeroSnagVerifiedById: isZeroSnags ? req.user?.id || null : null,
          zeroSnagVerifiedByName: isZeroSnags ? actorName : '',
          status: isZeroSnags
            ? dispatch.status === 'SNAG_BLOCKED'
              ? 'PRE_DISPATCH_HOLD'
              : dispatch.status
            : 'SNAG_BLOCKED',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    res.status(200).json({
      success: true,
      projectId: cleanPrj,
      zeroSnagCleared: isZeroSnags,
      unresolvedSnagsCount: openSnags.length,
      unresolvedSnags: openSnags,
      dispatch: formatDispatch(dispatch),
      message: isZeroSnags
        ? 'All set! Zero-Snag Verification PASSED: 100% of snags verified by QC. Ready for gate pass unlock.'
        : `Just a heads up: ${openSnags.length} unresolved snag(s) must be rectified and QC-verified before gate pass can unlock.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Issue Gate Pass & Dispatch Machine:
 * Strictly blocked if zeroSnagVerified is false.
 * Automatically updates Project stage, syncs CRM Lead Kanban card to DISPATCHED,
 * and initializes an After-Sales Commissioning & Warranty Dossier!
 */
export const issueGatePass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { shippingAddress, transporterName, vehicleNumber, lrNumber, commercialClearanceGiven, packingList } = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.dispatchOrder.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Dispatch order not found.' });
    }

    if (!existing.zeroSnagVerified) {
      return res.status(403).json({
        success: false,
        code: 'ZERO_SNAG_BLOCK',
        message: 'Just a heads up: this machine has pending QC snags before dispatch can unlock. 100% of snags must be QC-verified first.'
      });
    }

    const count = await prisma.dispatchOrder.count({ where: { gatePassNumber: { not: null } } });
    const gatePassNumber = existing.gatePassNumber || `GP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const dispatch = await prisma.dispatchOrder.update({
      where: { id },
      data: {
        gatePassNumber,
        status: 'GATE_PASS_UNLOCKED',
        shippingAddress: shippingAddress ?? existing.shippingAddress,
        transporterName: transporterName ?? existing.transporterName,
        vehicleNumber: vehicleNumber ?? existing.vehicleNumber,
        lrNumber: lrNumber ?? existing.lrNumber,
        commercialClearanceGiven: commercialClearanceGiven !== undefined ? Boolean(commercialClearanceGiven) : true,
        packingList: Array.isArray(packingList) ? packingList : existing.packingList,
        dispatchedAt: new Date(),
        dispatchedById: req.user?.id || null,
        dispatchedByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // 1. Update Project Setup currentStage -> DISPATCH_READY
    const prj = await prisma.project.findUnique({ where: { projectId: dispatch.projectId } });
    if (prj) {
      await prisma.project.update({
        where: { projectId: dispatch.projectId },
        data: {
          currentStage: 'DISPATCH_READY',
          status: 'COMPLETED',
          actualDispatchDate: new Date(),
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      // 2. Sync CRM Lead Kanban Stage -> DISPATCHED
      let leadIdToUpdate = null;
      if (prj.customerPoId) {
        const cpo = await prisma.customerPo.findUnique({ where: { id: prj.customerPoId } }).catch(() => null);
        if (cpo?.leadId) leadIdToUpdate = cpo.leadId;
      }
      if (leadIdToUpdate) {
        const lead = await prisma.lead.findUnique({ where: { id: leadIdToUpdate } }).catch(() => null);
        if (lead) {
          const history = Array.isArray(lead.stageHistory) ? [...lead.stageHistory] : [];
          history.push({
            fromStage: lead.stage,
            toStage: 'DISPATCHED',
            note: `Machine Dispatched under Gate Pass ${gatePassNumber} (${dispatch.projectId})`,
            changedBy: actorName,
            changedAt: new Date().toISOString()
          });
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              stage: 'DISPATCHED',
              stageHistory: history,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    }

    // 3. Auto-create After-Sales Commissioning & 12-Month Warranty Dossier Ticket
    const existingTicket = await prisma.serviceTicket.findFirst({
      where: { projectId: dispatch.projectId, serviceType: 'COMMISSIONING' }
    });
    if (!existingTicket) {
      const tCount = await prisma.serviceTicket.count();
      await prisma.serviceTicket.create({
        data: {
          ticketNumber: `TKT-${new Date().getFullYear()}-${String(tCount + 1).padStart(4, '0')}`,
          projectId: dispatch.projectId,
          customerName: prj?.customerName || 'Client',
          serviceType: 'COMMISSIONING',
          title: `Installation, Commissioning & 12-Month Warranty Activation (${gatePassNumber})`,
          description: `Auto-generated upon Gate Pass ${gatePassNumber} unlock for ${prj?.projectName || dispatch.projectId}.`,
          severity: 'MEDIUM',
          status: 'OPEN',
          warrantyStatus: 'UNDER_WARRANTY',
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    await logAuditEvent({
      req,
      action: 'GATE_PASS_ISSUED',
      module: 'dispatch',
      entityId: dispatch.id,
      entityType: 'DispatchOrder',
      notes: `Gate Pass ${gatePassNumber} issued for project ${dispatch.projectId}. Zero-Snag verified & CRM synced to DISPATCHED.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Gate Pass ${gatePassNumber} unlocked, CRM Kanban moved to DISPATCHED, and After-Sales Warranty Dossier activated.`,
      dispatch: formatDispatch(dispatch)
    });
  } catch (error) {
    next(error);
  }
};
