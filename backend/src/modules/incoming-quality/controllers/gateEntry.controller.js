import { GateEntry } from '../models/gateEntry.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getGateEntries = async (req, res, next) => {
  try {
    const { status, projectId, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (projectId) query.projectId = projectId.toUpperCase();
    if (search) {
      query.$or = [
        { gateEntryNumber: { $regex: search, $options: 'i' } },
        { poNumber: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ];
    }

    const entries = await GateEntry.find(query).sort({ inwardDate: -1 });
    res.status(200).json({ success: true, count: entries.length, gateEntries: entries });
  } catch (error) {
    next(error);
  }
};

export const createGateEntry = async (req, res, next) => {
  try {
    const count = await GateEntry.countDocuments();
    const gateEntryNumber = `GE-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const { poNumber, projectId, vendorName, challanOrInvoiceNumber, vehicleNumber, itemsCount, notes } = req.body;

    const entry = new GateEntry({
      gateEntryNumber,
      poNumber: poNumber.toUpperCase(),
      projectId: projectId.toUpperCase(),
      vendorName,
      challanOrInvoiceNumber,
      vehicleNumber,
      itemsCount: Number(itemsCount || 1),
      status: 'QUARANTINE_HOLD', // Mandatory initial quarantine hold
      notes,
      securityGuardName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'Security Gate',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await entry.save();

    await logAuditEvent({
      req,
      action: 'GATE_ENTRY_LOGGED',
      module: 'incoming-quality',
      entityId: entry._id,
      entityType: 'GateEntry',
      notes: `Inward gate entry ${gateEntryNumber} logged for PO ${poNumber}. Status: QUARANTINE_HOLD`
    });

    res.status(201).json({ success: true, message: 'Gate entry created in quarantine hold.', gateEntry: entry });
  } catch (error) {
    next(error);
  }
};
