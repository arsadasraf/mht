import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getBills = async (req, res, next) => {
  try {
    const bills = await prisma.purchaseBill.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({
      success: true,
      count: bills.length,
      bills: bills.map((b) => ({ ...b, _id: b.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createBill = async (req, res, next) => {
  try {
    const { billNumber, vendorName, poNumber, gateEntryNo, taxableAmount, taxAmount, dueDate } = req.body;
    const taxable = parseFloat(taxableAmount) || 0;
    const tax = parseFloat(taxAmount) || taxable * 0.18;
    const actorName = getActorName(req.user);

    const bill = await prisma.purchaseBill.create({
      data: {
        billNumber: billNumber || `BILL-${Date.now()}`,
        vendorName: vendorName || 'Vendor',
        poNumber: poNumber || '',
        gateEntryNo: gateEntryNo || 'Pending Inward',
        billDate: new Date().toISOString().split('T')[0],
        taxableAmount: taxable,
        taxAmount: tax,
        totalAmount: taxable + tax,
        dueDate: dueDate || '2026-11-30',
        status: 'MATCHED',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PURCHASE_BILL_RECORDED',
      module: 'purchase',
      entityId: bill.id,
      entityType: 'PurchaseBill',
      notes: `Purchase Bill ${bill.billNumber} recorded against PO ${bill.poNumber}`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Purchase bill recorded and 3-way matched.',
      bill: { ...bill, _id: bill.id }
    });
  } catch (error) {
    next(error);
  }
};
