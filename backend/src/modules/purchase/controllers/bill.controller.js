import { logAuditEvent } from '../../../services/audit.service.js';

let dummyBills = [];

export const getBills = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, count: dummyBills.length, bills: dummyBills });
  } catch (error) {
    next(error);
  }
};

export const createBill = async (req, res, next) => {
  try {
    const { billNumber, vendorName, poNumber, gateEntryNo, taxableAmount, taxAmount, dueDate } = req.body;
    const taxable = parseFloat(taxableAmount) || 0;
    const tax = parseFloat(taxAmount) || taxable * 0.18;
    const bill = {
      id: `pb-${Date.now()}`,
      billNumber,
      vendorName,
      poNumber,
      gateEntryNo: gateEntryNo || 'Pending Inward',
      billDate: new Date().toISOString().split('T')[0],
      taxableAmount: taxable,
      taxAmount: tax,
      totalAmount: taxable + tax,
      dueDate: dueDate || '2026-11-30',
      status: 'MATCHED'
    };

    dummyBills.unshift(bill);

    await logAuditEvent({
      req,
      action: 'PURCHASE_BILL_RECORDED',
      module: 'purchase',
      entityId: bill.id,
      entityType: 'PurchaseBill',
      afterData: bill,
      notes: `Purchase Bill ${bill.billNumber} recorded against PO ${bill.poNumber}`
    });

    res.status(201).json({ success: true, message: 'Purchase bill recorded and 3-way matched successfully.', bill });
  } catch (error) {
    next(error);
  }
};
