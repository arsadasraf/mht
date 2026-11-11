import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import {
  ensureCrmMasterConfig,
  DEFAULT_CRM_PREFIX_LOCK_POLICY,
  DEFAULT_COMPANY_BILLING_INFO
} from './crmMaster.controller.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

const quotationInclude = {
  lead: {
    select: {
      id: true,
      leadNumber: true,
      customerName: true,
      companyName: true,
      contactPhone: true,
      contactEmail: true,
      stage: true
    }
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  }
};

const normalizeDualCurrency = (amount, currency = 'INR', exchangeRate = 1.0) => {
  const num = Number(amount || 0);
  const rate = Number(exchangeRate || 1.0);
  const baseINR = currency === 'INR' ? num : Math.round(num * rate * 100) / 100;
  return {
    currency,
    amount: Math.round(num * 100) / 100,
    exchangeRate: rate,
    baseAmountINR: baseINR
  };
};

const formatQuotation = (q, revisionCount = 1) => {
  if (!q) return null;
  const createdByName = q.createdBy
    ? `${q.createdBy.firstName} ${q.createdBy.lastName}`.trim()
    : q.createdByName || 'System';
  const updatedByName = q.updatedBy
    ? `${q.updatedBy.firstName} ${q.updatedBy.lastName}`.trim()
    : q.updatedByName || createdByName;

  const subINR = Number(q.subtotal?.baseAmountINR ?? q.subtotal?.amount ?? 0);
  const taxINR = Number(q.taxAmount?.baseAmountINR ?? q.taxAmount?.amount ?? 0);
  const grandINR = Number(q.totalAmount?.baseAmountINR ?? q.totalAmount?.amount ?? subINR + taxINR);

  return {
    ...q,
    _id: q.id,
    leadId: q.lead ? { ...q.lead, _id: q.lead.id } : q.leadId,
    subtotalINR: subINR,
    taxAmountINR: taxINR,
    grandTotalINR: grandINR,
    revisionCount,
    createdByName,
    updatedByName,
    gstCategory: q.gstCategory || 'INTRA_STATE',
    isGstIncluded: Boolean(q.isGstIncluded),
    packingType: q.packingType || 'INCLUDED',
    packingValue: Number(q.packingValue || 0),
    isPackingGstApplicable: q.isPackingGstApplicable !== false,
    packingAmount: q.packingAmount || null,
    transportationType: q.transportationType || 'BUYER_ACTUALS',
    transportationValue: Number(q.transportationValue || 0),
    isTransportationGstApplicable: q.isTransportationGstApplicable !== false,
    transportationAmount: q.transportationAmount || null,
    termsAndConditions: q.termsAndConditions || null,
    bankDetails: q.bankDetails || null,
    signatory: q.signatory || null,
    shippingAddress: q.shippingAddress || '',
    createdBy: q.createdBy
      ? {
          _id: q.createdBy.id,
          id: q.createdBy.id,
          name: `${q.createdBy.firstName} ${q.createdBy.lastName}`.trim(),
          email: q.createdBy.email
        }
      : { _id: q.createdById || '', id: q.createdById || '', name: createdByName, email: '' },
    updatedBy: q.updatedBy
      ? {
          _id: q.updatedBy.id,
          id: q.updatedBy.id,
          name: `${q.updatedBy.firstName} ${q.updatedBy.lastName}`.trim(),
          email: q.updatedBy.email
        }
      : { _id: q.updatedById || '', id: q.updatedById || '', name: updatedByName, email: '' }
  };
};

/**
 * Generates next sequential Base Quotation Number (e.g. QT-2026-1001)
 */
async function generateNextBaseQuoteNumber(user) {
  const config = await ensureCrmMasterConfig(user);
  const policy = {
    ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
    ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
  };
  const prefix = (policy.quotationPrefix || 'QT-').trim().toUpperCase();
  const startSeq = Number(policy.quotationStartSeq) || 1001;
  const year = new Date().getFullYear();

  const distinctRoots = await prisma.quotation.findMany({
    where: { revisionNumber: 0 },
    select: { baseQuoteNumber: true }
  });
  const nextNum = Math.max(startSeq + distinctRoots.length, distinctRoots.length + 1);
  return `${prefix}${year}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * Computes items and totals for a Quotation with comprehensive PO-style commercial configuration
 */
const buildQuotationFinancials = ({
  items = [],
  taxRatePercent = 18,
  currency = 'INR',
  exchangeRate = 1.0,
  packingType = 'INCLUDED',
  packingValue = 0,
  isPackingGstApplicable = true,
  transportationType = 'BUYER_ACTUALS',
  transportationValue = 0,
  isTransportationGstApplicable = true,
  gstCategory = 'INTRA_STATE',
  isGstIncluded = false
} = {}) => {
  const computedItems = (items || []).map((item, idx) => {
    const unitAmt = Number(item.unitPrice?.amount ?? item.unitPrice ?? 0);
    const qtyType = item.qtyType || 'STANDARD';
    const qty = qtyType === 'EXTRA' ? 0 : Number(item.quantity || 1);
    const lineAmt = qtyType === 'EXTRA' ? 0 : Math.round(unitAmt * qty * 100) / 100;

    return {
      itemCode: item.itemCode || `ITEM-${idx + 1}`,
      modelCode: item.modelCode || '',
      modelName: item.modelName || item.description || 'Machine Unit',
      description: item.description || item.modelName || 'Custom Winding Machine',
      hsnCode: item.hsnCode || '8479',
      qtyType,
      quantity: qty,
      qtyLabel: qtyType === 'EXTRA' ? 'Extra' : qtyType === 'INCLUDED' ? 'Included' : String(qty),
      uom: qtyType === 'EXTRA' ? '' : (item.uom || 'No.'),
      specifications: item.specifications || '',
      unitPrice: normalizeDualCurrency(unitAmt, currency, exchangeRate),
      lineTotal: normalizeDualCurrency(lineAmt, currency, exchangeRate),
      totalPrice: lineAmt
    };
  });

  const subtotalRaw = computedItems.reduce((acc, curr) => acc + curr.lineTotal.amount, 0);

  // Packing
  let packingAmountRaw = 0;
  if (packingType === 'PERCENT') {
    packingAmountRaw = Math.round(((subtotalRaw * Number(packingValue || 0)) / 100) * 100) / 100;
  } else if (packingType === 'FIXED') {
    packingAmountRaw = Number(packingValue || 0);
  }

  // Transportation
  let transportationAmountRaw = 0;
  if (transportationType === 'FIXED') {
    transportationAmountRaw = Number(transportationValue || 0);
  }

  // Taxable Base
  const taxablePacking = isPackingGstApplicable ? packingAmountRaw : 0;
  const taxableFreight = isTransportationGstApplicable ? transportationAmountRaw : 0;

  let taxableBase = subtotalRaw + taxablePacking + taxableFreight;
  let taxAmountRaw = 0;
  let totalRaw = 0;

  if (isGstIncluded) {
    const gross = subtotalRaw + packingAmountRaw + transportationAmountRaw;
    taxableBase = Math.round((gross / (1 + Number(taxRatePercent) / 100)) * 100) / 100;
    taxAmountRaw = Math.round((gross - taxableBase) * 100) / 100;
    totalRaw = gross;
  } else {
    taxAmountRaw = Math.round(((taxableBase * Number(taxRatePercent)) / 100) * 100) / 100;
    totalRaw = Math.round((subtotalRaw + packingAmountRaw + transportationAmountRaw + taxAmountRaw) * 100) / 100;
  }

  // Split
  const cgstRaw = gstCategory === 'INTRA_STATE' ? Math.round((taxAmountRaw / 2) * 100) / 100 : 0;
  const sgstRaw = gstCategory === 'INTRA_STATE' ? Math.round((taxAmountRaw - cgstRaw) * 100) / 100 : 0;
  const igstRaw = gstCategory === 'INTER_STATE' ? taxAmountRaw : 0;

  return {
    computedItems,
    itemsSubtotal: normalizeDualCurrency(subtotalRaw, currency, exchangeRate),
    subtotal: normalizeDualCurrency(subtotalRaw, currency, exchangeRate),
    packingAmount: normalizeDualCurrency(packingAmountRaw, currency, exchangeRate),
    transportationAmount: normalizeDualCurrency(transportationAmountRaw, currency, exchangeRate),
    taxAmount: normalizeDualCurrency(taxAmountRaw, currency, exchangeRate),
    totalAmount: normalizeDualCurrency(totalRaw, currency, exchangeRate),
    cgstAmount: normalizeDualCurrency(cgstRaw, currency, exchangeRate),
    sgstAmount: normalizeDualCurrency(sgstRaw, currency, exchangeRate),
    igstAmount: normalizeDualCurrency(igstRaw, currency, exchangeRate)
  };
};

/**
 * GET /api/v1/crm/deals
 */
export const getQuotations = async (req, res, next) => {
  try {
    const { status, leadId, includeAllRevisions, search, page = 1, limit = 50 } = req.query;
    const where = {};

    if (includeAllRevisions !== 'true') {
      where.isLatestRevision = true;
    }

    if (status && status !== 'ALL') where.status = status;
    if (leadId && UUID_REGEX.test(leadId)) where.leadId = leadId;

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { quoteNumber: { contains: s, mode: 'insensitive' } },
        { baseQuoteNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { machineModel: { contains: s, mode: 'insensitive' } }
      ];
    }

    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 50);

    const [total, rawQuotations] = await Promise.all([
      prisma.quotation.count({ where }),
      prisma.quotation.findMany({
        where,
        include: quotationInclude,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (p - 1) * l,
        take: l
      })
    ]);

    // Count total revisions per baseQuoteNumber
    const baseNumbers = [...new Set(rawQuotations.map((q) => q.baseQuoteNumber))];
    const revCounts = await prisma.quotation.groupBy({
      by: ['baseQuoteNumber'],
      where: { baseQuoteNumber: { in: baseNumbers } },
      _count: { id: true }
    });
    const revMap = Object.fromEntries(revCounts.map((r) => [r.baseQuoteNumber, r._count.id]));

    const quotations = rawQuotations.map((q) => formatQuotation(q, revMap[q.baseQuoteNumber] || 1));

    res.status(200).json({
      success: true,
      total,
      page: p,
      quotations
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/crm/deals/:id
 */
export const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: quotationInclude
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const allRevisions = await prisma.quotation.findMany({
      where: { baseQuoteNumber: quotation.baseQuoteNumber },
      include: quotationInclude,
      orderBy: { revisionNumber: 'desc' }
    });

    res.status(200).json({
      success: true,
      quotation: formatQuotation(quotation, allRevisions.length),
      revisions: allRevisions.map((r) => formatQuotation(r, allRevisions.length))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/crm/deals/:id/revisions
 * Returns full immutable revision history (R0, R1, R2...) for any quotation
 */
export const getQuotationRevisions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const target = await prisma.quotation.findUnique({ where: { id } });
    if (!target) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const revisions = await prisma.quotation.findMany({
      where: { baseQuoteNumber: target.baseQuoteNumber },
      include: quotationInclude,
      orderBy: { revisionNumber: 'desc' }
    });

    res.status(200).json({
      success: true,
      baseQuoteNumber: target.baseQuoteNumber,
      revisions: revisions.map((r) => formatQuotation(r, revisions.length))
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/deals
 * Creates initial Quotation (R0)
 */
export const createQuotation = async (req, res, next) => {
  try {
    const body = req.body;
    const actorName = getActorName(req.user);

    const config = await ensureCrmMasterConfig(req.user);
    const companySnapshot = {
      ...DEFAULT_COMPANY_BILLING_INFO,
      ...(typeof config.companyBillingInfo === 'object' ? config.companyBillingInfo : {})
    };

    const baseQuoteNumber = await generateNextBaseQuoteNumber(req.user);
    const quoteNumber = `${baseQuoteNumber}-R0`;

    const currency = body.currency || 'INR';
    const exchangeRate = Number(body.exchangeRate || 1.0);
    const taxRatePercent = Number(body.taxRatePercent ?? 18);
    const gstCategory = body.gstCategory || 'INTRA_STATE';
    const isGstIncluded = Boolean(body.isGstIncluded);
    const packingType = body.packingType || 'INCLUDED';
    const packingValue = Number(body.packingValue || 0);
    const isPackingGstApplicable = body.isPackingGstApplicable !== false;
    const transportationType = body.transportationType || 'BUYER_ACTUALS';
    const transportationValue = Number(body.transportationValue || 0);
    const isTransportationGstApplicable = body.isTransportationGstApplicable !== false;

    const {
      computedItems,
      subtotal,
      packingAmount,
      transportationAmount,
      taxAmount,
      totalAmount
    } = buildQuotationFinancials({
      items: body.items || [],
      taxRatePercent,
      currency,
      exchangeRate,
      packingType,
      packingValue,
      isPackingGstApplicable,
      transportationType,
      transportationValue,
      isTransportationGstApplicable,
      gstCategory,
      isGstIncluded
    });

    const primaryMachine =
      body.machineModel ||
      computedItems.map((i) => i.modelCode || i.modelName).filter(Boolean).join(', ') ||
      'MHT-1100';

    const quotation = await prisma.quotation.create({
      data: {
        quoteNumber,
        baseQuoteNumber,
        revisionNumber: 0,
        revisionCode: 'R0',
        isLatestRevision: true,
        revisionNotes: body.revisionNotes || 'Initial Commercial Quotation (R0)',
        leadId: body.leadId && UUID_REGEX.test(String(body.leadId)) ? String(body.leadId) : null,
        customerName: (body.customerName || body.companyName || 'Customer').trim(),
        companyName: (body.companyName || body.customerName || 'Company').trim(),
        contactEmail: (body.contactEmail || '').trim(),
        contactPhone: (body.contactPhone || '').trim(),
        billingAddress: (body.billingAddress || '').trim(),
        shippingAddress: (body.shippingAddress || body.billingAddress || '').trim(),
        gstin: (body.gstin || '').trim().toUpperCase(),
        machineModel: primaryMachine,
        items: computedItems,
        subtotal,
        taxRatePercent,
        taxAmount,
        totalAmount,
        currency,
        exchangeRate,
        gstCategory,
        isGstIncluded,
        packingType,
        packingValue,
        isPackingGstApplicable,
        packingAmount,
        transportationType,
        transportationValue,
        isTransportationGstApplicable,
        transportationAmount,
        termsAndConditions: body.termsAndConditions || null,
        bankDetails: body.bankDetails || null,
        signatory: body.signatory || null,
        validUntil: body.validUntil
          ? new Date(body.validUntil)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentTerms:
          body.paymentTerms || '50% Advance along with purchase order, 50% Before dispatch',
        deliveryWeeks: Number(body.deliveryWeeks ?? 8),
        warrantyMonths: Number(body.warrantyMonths ?? 12),
        notes: (body.notes || '').trim(),
        companySnapshot,
        status: 'SENT_TO_CLIENT',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: quotationInclude
    });

    // If linked to a Lead, transition stage to QUOTE_PREPARED and log stage history
    if (quotation.leadId) {
      const existingLead = await prisma.lead.findUnique({ where: { id: quotation.leadId } });
      if (existingLead) {
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            stage: 'QUOTE_PREPARED',
            status: 'QUOTATION_SENT',
            updatedById: req.user?.id || null,
            updatedByName: actorName,
            stageHistory: {
              create: [
                {
                  fromStage: existingLead.stage,
                  toStage: 'QUOTE_PREPARED',
                  note: `Quotation ${quoteNumber} generated and sent.`,
                  createdById: req.user?.id || null,
                  createdByName: actorName,
                  updatedById: req.user?.id || null,
                  updatedByName: actorName
                }
              ]
            },
            followUpNotes: {
              create: [
                {
                  stage: 'QUOTE_PREPARED',
                  note: `Quotation ${quoteNumber} (${currency} ${totalAmount.amount.toLocaleString('en-IN')}) created.`,
                  createdById: req.user?.id || null,
                  createdByName: actorName,
                  updatedById: req.user?.id || null,
                  updatedByName: actorName
                }
              ]
            }
          }
        });
      }
    }

    await logAuditEvent({
      req,
      action: 'QUOTATION_CREATED',
      module: 'crm',
      entityId: quotation.id,
      entityType: 'Quotation',
      notes: `Quotation ${quoteNumber} generated for ${quotation.companyName}.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Quotation "${quoteNumber}" created successfully.`,
      quotation: formatQuotation(quotation, 1)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/deals/:id/revise (or PUT /api/v1/crm/deals/:id)
 * Creates a new Immutable Quotation Revision (R1, R2, R3...) while preserving the previous revision snapshot!
 */
export const createQuotationRevision = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.quotation.findUnique({
      where: { id },
      include: quotationInclude
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const config = await ensureCrmMasterConfig(req.user);
    const policy = {
      ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    if (
      (existing.isLocked || (policy.lockQuotationOnPoReceived && existing.status === 'ACCEPTED')) &&
      !req.user?.isSuperAdmin
    ) {
      return res.status(400).json({
        success: false,
        message: 'Just a heads up: this quotation is locked because a Customer PO has already been accepted against it.'
      });
    }

    // Find highest revision number for this baseQuoteNumber
    const latestRevRow = await prisma.quotation.findFirst({
      where: { baseQuoteNumber: existing.baseQuoteNumber },
      orderBy: { revisionNumber: 'desc' }
    });

    const nextRevNum = (latestRevRow?.revisionNumber ?? existing.revisionNumber ?? 0) + 1;
    const nextRevCode = `R${nextRevNum}`;
    const nextQuoteNumber = `${existing.baseQuoteNumber}-${nextRevCode}`;

    const currency = body.currency || existing.currency || 'INR';
    const exchangeRate = Number(body.exchangeRate ?? existing.exchangeRate ?? 1.0);
    const taxRatePercent = Number(body.taxRatePercent ?? existing.taxRatePercent ?? 18);
    const gstCategory = body.gstCategory ?? existing.gstCategory ?? 'INTRA_STATE';
    const isGstIncluded = body.isGstIncluded !== undefined ? Boolean(body.isGstIncluded) : Boolean(existing.isGstIncluded);
    const packingType = body.packingType ?? existing.packingType ?? 'INCLUDED';
    const packingValue = Number(body.packingValue ?? existing.packingValue ?? 0);
    const isPackingGstApplicable = body.isPackingGstApplicable !== undefined ? Boolean(body.isPackingGstApplicable) : existing.isPackingGstApplicable !== false;
    const transportationType = body.transportationType ?? existing.transportationType ?? 'BUYER_ACTUALS';
    const transportationValue = Number(body.transportationValue ?? existing.transportationValue ?? 0);
    const isTransportationGstApplicable = body.isTransportationGstApplicable !== undefined ? Boolean(body.isTransportationGstApplicable) : existing.isTransportationGstApplicable !== false;

    const {
      computedItems,
      subtotal,
      packingAmount,
      transportationAmount,
      taxAmount,
      totalAmount
    } = buildQuotationFinancials({
      items: body.items ?? existing.items ?? [],
      taxRatePercent,
      currency,
      exchangeRate,
      packingType,
      packingValue,
      isPackingGstApplicable,
      transportationType,
      transportationValue,
      isTransportationGstApplicable,
      gstCategory,
      isGstIncluded
    });

    const companySnapshot = {
      ...DEFAULT_COMPANY_BILLING_INFO,
      ...(typeof config.companyBillingInfo === 'object' ? config.companyBillingInfo : {})
    };

    // Mark all older revisions of this baseQuoteNumber as isLatestRevision: false and status: REVISED
    await prisma.quotation.updateMany({
      where: { baseQuoteNumber: existing.baseQuoteNumber },
      data: {
        isLatestRevision: false,
        status: 'REVISED'
      }
    });

    const newRevision = await prisma.quotation.create({
      data: {
        quoteNumber: nextQuoteNumber,
        baseQuoteNumber: existing.baseQuoteNumber,
        revisionNumber: nextRevNum,
        revisionCode: nextRevCode,
        isLatestRevision: true,
        revisionNotes:
          (body.revisionNotes || body.notes || `Revised from ${existing.revisionCode} to ${nextRevCode}`).trim(),
        parentQuotationId: existing.parentQuotationId || existing.id,
        leadId: existing.leadId,
        customerName: (body.customerName ?? existing.customerName).trim(),
        companyName: (body.companyName ?? existing.companyName).trim(),
        contactEmail: (body.contactEmail ?? existing.contactEmail).trim(),
        contactPhone: (body.contactPhone ?? existing.contactPhone).trim(),
        billingAddress: (body.billingAddress ?? existing.billingAddress).trim(),
        shippingAddress: (body.shippingAddress ?? existing.shippingAddress ?? body.billingAddress ?? existing.billingAddress ?? '').trim(),
        gstin: (body.gstin ?? existing.gstin).trim().toUpperCase(),
        machineModel:
          body.machineModel ||
          computedItems.map((i) => i.modelCode || i.modelName).filter(Boolean).join(', ') ||
          existing.machineModel,
        items: computedItems,
        subtotal,
        taxRatePercent,
        taxAmount,
        totalAmount,
        currency,
        exchangeRate,
        gstCategory,
        isGstIncluded,
        packingType,
        packingValue,
        isPackingGstApplicable,
        packingAmount,
        transportationType,
        transportationValue,
        isTransportationGstApplicable,
        transportationAmount,
        termsAndConditions: body.termsAndConditions ?? existing.termsAndConditions ?? null,
        bankDetails: body.bankDetails ?? existing.bankDetails ?? null,
        signatory: body.signatory ?? existing.signatory ?? null,
        validUntil: body.validUntil ? new Date(body.validUntil) : existing.validUntil,
        paymentTerms: body.paymentTerms ?? existing.paymentTerms,
        deliveryWeeks: Number(body.deliveryWeeks ?? existing.deliveryWeeks),
        warrantyMonths: Number(body.warrantyMonths ?? existing.warrantyMonths),
        notes: (body.notes ?? existing.notes).trim(),
        companySnapshot,
        status: 'SENT_TO_CLIENT',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: quotationInclude
    });

    // Log on linked Lead timeline
    if (newRevision.leadId) {
      await prisma.leadFollowUpNote.create({
        data: {
          leadId: newRevision.leadId,
          stage: 'NEGOTIATION',
          note: `Quotation Revised to ${nextQuoteNumber} (${nextRevCode}): ${newRevision.revisionNotes}`,
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    await logAuditEvent({
      req,
      action: 'QUOTATION_REVISED',
      module: 'crm',
      entityId: newRevision.id,
      entityType: 'Quotation',
      beforeData: { quoteNumber: existing.quoteNumber, totalAmount: existing.totalAmount },
      afterData: { quoteNumber: newRevision.quoteNumber, totalAmount: newRevision.totalAmount },
      notes: `Quotation revised from ${existing.quoteNumber} to ${newRevision.quoteNumber}.`
    });

    res.status(201).json({
      success: true,
      message: `All set! New revision "${newRevision.quoteNumber}" (${nextRevCode}) created and saved.`,
      quotation: formatQuotation(newRevision, nextRevNum + 1)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/crm/deals/:id
 * If body.createRevision is true or items/pricing changed, creates a new immutable revision;
 * if only status is being toggled (e.g. ACCEPTED / DECLINED), updates the status.
 */
export const updateQuotation = async (req, res, next) => {
  try {
    if (req.body.createRevision || Array.isArray(req.body.items)) {
      return createQuotationRevision(req, res, next);
    }

    const { id } = req.params;
    const existing = await prisma.quotation.findUnique({ where: { id }, include: quotationInclude });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const actorName = getActorName(req.user);
    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: req.body.status ?? existing.status,
        notes: req.body.notes ?? existing.notes,
        paymentTerms: req.body.paymentTerms ?? existing.paymentTerms,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: quotationInclude
    });

    res.status(200).json({
      success: true,
      message: 'Great! Quotation updated.',
      quotation: formatQuotation(updated)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/deals/:id/convert-po
 */
export const convertQuotationToProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { poNumber, poDate, targetDeliveryDate, notes } = req.body;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: quotationInclude
    });
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    const year = new Date().getFullYear();
    const count = await prisma.customerPo.count();
    const projectId = `PRJ-${year}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        isLocked: true,
        poDetails: { poNumber, poDate, targetDeliveryDate, notes },
        convertedProjectId: projectId,
        convertedAt: new Date(),
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: quotationInclude
    });

    if (quotation.leadId) {
      await prisma.lead.update({
        where: { id: quotation.leadId },
        data: {
          stage: 'WON',
          status: 'CONVERTED',
          isLocked: true,
          convertedProjectId: projectId,
          convertedAt: new Date(),
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    res.status(201).json({
      success: true,
      message: `All set! Quotation accepted and linked to Project ${projectId}.`,
      quotation: formatQuotation(updated),
      project: { projectId }
    });
  } catch (error) {
    next(error);
  }
};
