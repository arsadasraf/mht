import { logAuditEvent } from '../../../services/audit.service.js';

let dummyQuotations = [];

export const getQuotations = async (req, res, next) => {
  try {
    const { rfqNumber } = req.query;
    let list = dummyQuotations;
    if (rfqNumber) {
      list = list.filter((q) => q.rfqNumber === rfqNumber);
    }
    res.status(200).json({ success: true, count: list.length, quotations: list });
  } catch (error) {
    next(error);
  }
};

export const createQuotation = async (req, res, next) => {
  try {
    const quote = {
      id: `vq-${Date.now()}`,
      ...req.body,
      status: 'RECEIVED',
      receivedDate: new Date().toISOString().split('T')[0]
    };
    dummyQuotations.unshift(quote);
    res.status(201).json({ success: true, message: 'Vendor quotation recorded.', quotation: quote });
  } catch (error) {
    next(error);
  }
};
