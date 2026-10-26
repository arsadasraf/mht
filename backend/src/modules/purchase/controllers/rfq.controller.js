import { logAuditEvent } from '../../../services/audit.service.js';

// In-memory data store until full Mongoose model integration
let dummyRfqs = [];

export const getRfqs = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    let list = dummyRfqs;
    if (projectId) {
      list = list.filter((r) => r.projectId === projectId);
    }
    res.status(200).json({ success: true, count: list.length, rfqs: list });
  } catch (error) {
    next(error);
  }
};

export const createRfq = async (req, res, next) => {
  try {
    const { title, projectId, submissionDeadline, items, notes } = req.body;
    const newRfq = {
      id: `rfq-${Date.now()}`,
      rfqNumber: `RFQ-${new Date().getFullYear()}-${String(dummyRfqs.length + 1).padStart(4, '0')}`,
      projectId: projectId || '',
      title: title || 'Component Sourcing RFQ',
      vendorCount: 0,
      itemCount: items?.length || 0,
      submissionDeadline: submissionDeadline || '',
      status: 'SENT',
      notes,
      createdAt: new Date().toISOString().split('T')[0]
    };

    dummyRfqs.unshift(newRfq);

    await logAuditEvent({
      req,
      action: 'OUTWARD_RFQ_CREATED',
      module: 'purchase',
      entityId: newRfq.id,
      entityType: 'RFQ',
      afterData: newRfq,
      notes: `Outward RFQ ${newRfq.rfqNumber} dispatched to vendors`
    });

    res.status(201).json({ success: true, message: 'All set! Outward RFQ created and sent to vendors.', rfq: newRfq });
  } catch (error) {
    next(error);
  }
};
