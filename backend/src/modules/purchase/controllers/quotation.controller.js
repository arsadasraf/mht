import { prisma } from '../../../config/db.config.js';
import { ensureDefaultVendorsAndPrices, DEFAULT_PURCHASE_PREFIX_POLICY } from './vendor.controller.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getQuotations = async (req, res, next) => {
  try {
    const { rfqNumber, projectId } = req.query;
    const where = {};
    if (rfqNumber) where.rfqNumber = String(rfqNumber);
    if (projectId) where.projectId = String(projectId).toUpperCase();

    const list = await prisma.inwardVendorQuotation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: list.length,
      quotations: list.map((q) => ({ ...q, _id: q.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createQuotation = async (req, res, next) => {
  try {
    const config = await ensureDefaultVendorsAndPrices(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };
    const count = await prisma.inwardVendorQuotation.count();
    const quoteNumber = req.body.quoteNumber || `${policy.inwardQuotePrefix || 'VQT'}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const quote = await prisma.inwardVendorQuotation.create({
      data: {
        quoteNumber,
        rfqNumber: req.body.rfqNumber || '',
        projectId: req.body.projectId ? String(req.body.projectId).toUpperCase() : '',
        vendorName: req.body.vendorName || 'Vendor',
        quotedAmount: Number(req.body.quotedAmount) || 0,
        leadTimeDays: Number(req.body.leadTimeDays) || 14,
        paymentTerms: req.body.paymentTerms || '30 Days',
        status: 'RECEIVED',
        receivedDate: req.body.receivedDate || new Date().toISOString().split('T')[0],
        items: Array.isArray(req.body.items) ? req.body.items : [],
        notes: req.body.notes || '',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(201).json({
      success: true,
      message: 'All set! Vendor quotation recorded.',
      quotation: { ...quote, _id: quote.id }
    });
  } catch (error) {
    next(error);
  }
};
