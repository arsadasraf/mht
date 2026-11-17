import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { ensureDefaultVendorsAndPrices, DEFAULT_PURCHASE_PREFIX_POLICY } from './vendor.controller.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatPo = (po, grnRecordsMap = {}) => {
  const totalAmount = (typeof po.totalAmount === 'object' && po.totalAmount !== null) ? po.totalAmount : {};
  return {
    ...po,
    _id: po.id,
    vendorId: po.vendorId
      ? {
          _id: po.vendorId,
          id: po.vendorId,
          vendorCode: po.vendorCode,
          name: po.vendorName
        }
      : {
          vendorCode: po.vendorCode || 'VND-0001',
          name: po.vendorName || 'Approved Vendor'
        },
    items: Array.isArray(po.items) ? po.items : [],
    comments: Array.isArray(totalAmount.comments) ? totalAmount.comments : [],
    grnHistory: grnRecordsMap[po.poNumber] || []
  };
};

export const checkTimeWindowAllowed = (po, policy, actionType) => {
  const isEdit = actionType === 'EDIT';
  const mode = isEdit ? (policy.editTimeLimitMode || 'UNLIMITED') : (policy.deleteTimeLimitMode || 'UNLIMITED');
  const limitHours = Number(isEdit ? policy.editTimeLimitHours : policy.deleteTimeLimitHours) || 0;

  if (mode === 'UNLIMITED') return { allowed: true };

  const label = isEdit ? 'editing' : 'deleting';
  if (limitHours === 0) {
    return {
      allowed: false,
      message: `Just a heads up: ${label} Outward POs is locked (0 hours limit) in Purchase > Masters > Approval & Time Policy.`
    };
  }

  const createdMs = po.createdAt ? new Date(po.createdAt).getTime() : Date.now();
  const elapsedHours = (Date.now() - createdMs) / (1000 * 60 * 60);

  if (elapsedHours > limitHours) {
    return {
      allowed: false,
      message: `Just a heads up: the ${label} time window for this Outward PO has expired (${limitHours}h limit configured in Master).`
    };
  }

  return { allowed: true };
};

export const getPurchaseOrders = async (req, res, next) => {
  try {
    await ensureDefaultVendorsAndPrices(req.user);
    const { projectId, status, search } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (status) where.status = String(status);
    if (search) where.poNumber = { contains: String(search), mode: 'insensitive' };

    const pos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const poNumbers = pos.map((p) => p.poNumber).filter(Boolean);
    let grnRecordsMap = {};
    if (poNumbers.length > 0) {
      const grns = await prisma.grnRecord.findMany({
        where: { poNumber: { in: poNumbers } },
        orderBy: { createdAt: 'desc' }
      }).catch(() => []);
      grns.forEach((g) => {
        if (!grnRecordsMap[g.poNumber]) grnRecordsMap[g.poNumber] = [];
        grnRecordsMap[g.poNumber].push(g);
      });
    }

    res.status(200).json({
      success: true,
      count: pos.length,
      purchaseOrders: pos.map((p) => formatPo(p, grnRecordsMap))
    });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (req, res, next) => {
  try {
    const config = await ensureDefaultVendorsAndPrices(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const {
      poNumber: submittedPoNumber,
      poType = 'BO',
      poDate = new Date().toISOString().split('T')[0],
      projectId,
      vendorId,
      vendorCode = '',
      vendorName = '',
      items = [],
      currency = 'INR',
      exchangeRate = 1.0,
      freightTransportMode = 'Road Freight',
      freightAmount: rawFreight = 0,
      freightTaxable = true,
      packagingType = 'Standard Packaging',
      packagingAmount: rawPackaging = 0,
      packagingTaxable = true,
      taxType = 'INTRA_STATE',
      gstRate: rawGstRate = 18,
      paymentTerms = '30 Days Net',
      deliveryPlant = 'Machine House Unit 1, Chakan, Pune',
      deliverySchedule = '',
      notes = ''
    } = req.body;

    const resolvedProjectId = projectId ? String(projectId).toUpperCase().trim() : 'GENERAL-STOCK';

    // 4-Layer Duplicate Check & Sequence Generation
    let poNumber = '';
    if (submittedPoNumber && String(submittedPoNumber).trim()) {
      const cleanCandidate = String(submittedPoNumber).trim().toUpperCase();
      const existing = await prisma.purchaseOrder.findUnique({ where: { poNumber: cleanCandidate } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `PO Number "${cleanCandidate}" is already in use. Please enter or generate a unique PO number.`
        });
      }
      poNumber = cleanCandidate;
    } else {
      poNumber = await generateUniqueSequenceCode({
        model: 'purchaseOrder',
        field: 'poNumber',
        prefix: `${policy.poPrefix || 'PO'}-${new Date().getFullYear()}-`,
        startSeq: 1,
        padLength: 4
      });
    }

    const actorName = getActorName(req.user);

    let resolvedVendorCode = vendorCode;
    let resolvedVendorName = vendorName;

    if (vendorId && (!resolvedVendorName || !resolvedVendorCode)) {
      const v = await prisma.vendor.findUnique({ where: { id: vendorId } }).catch(() => null);
      if (v) {
        resolvedVendorCode = v.vendorCode;
        resolvedVendorName = v.name;
      }
    }

    const computedItems = (Array.isArray(items) ? items : []).map((item, idx) => {
      const unitAmount = Number(item.unitPrice?.amount ?? item.unitPrice ?? item.rate ?? 0);
      const itemRate = Number(item.unitPrice?.exchangeRate || exchangeRate || 1.0);
      const itemCurrency = item.unitPrice?.currency || currency;
      const unitBaseINR = Math.round(unitAmount * itemRate * 100) / 100;

      const baseQty = Number(item.quantity?.baseQty ?? item.quantity ?? item.qty ?? 1);
      const lineAmount = Math.round(unitAmount * baseQty * 100) / 100;
      const lineBaseINR = Math.round(unitBaseINR * baseQty * 100) / 100;

      return {
        itemCode: String(item.itemCode || `ITEM-${idx + 1}`).toUpperCase(),
        itemName: item.itemName || item.name || item.description || item.itemCode || 'Purchase Item',
        description: item.description || item.specification || '',
        itemType: item.itemType || poType || 'BO',
        hsnCode: item.hsnCode || item.hsnSac || '84799090',
        count: Number(item.count || 0),
        quantity: {
          baseQty,
          baseUom: item.quantity?.baseUom || item.uom || 'Nos',
          altQty: item.quantity?.altQty || baseQty,
          altUom: item.quantity?.altUom || item.quantity?.baseUom || item.uom || 'Nos',
          conversionRatio: item.quantity?.conversionRatio || 1
        },
        unitPrice: {
          currency: itemCurrency,
          amount: unitAmount,
          exchangeRate: itemRate,
          baseAmountINR: unitBaseINR
        },
        lineTotal: {
          currency: itemCurrency,
          amount: lineAmount,
          exchangeRate: itemRate,
          baseAmountINR: lineBaseINR
        },
        expectedDeliveryDate: item.expectedDeliveryDate || deliverySchedule || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OPEN'
      };
    });

    const itemsSubtotal = Math.round(computedItems.reduce((acc, curr) => acc + curr.lineTotal.amount, 0) * 100) / 100;
    const freightAmount = Math.max(0, Number(rawFreight) || 0);
    const packagingAmount = Math.max(0, Number(rawPackaging) || 0);
    const gstRate = Number(rawGstRate) || 0;

    // Compute Taxable Base
    let taxableBase = itemsSubtotal;
    if (freightTaxable) taxableBase += freightAmount;
    if (packagingTaxable) taxableBase += packagingAmount;
    taxableBase = Math.round(taxableBase * 100) / 100;

    // Compute Taxes
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (taxType === 'INTRA_STATE') {
      const halfRate = gstRate / 2;
      cgstAmount = Math.round((taxableBase * (halfRate / 100)) * 100) / 100;
      sgstAmount = Math.round((taxableBase * (halfRate / 100)) * 100) / 100;
    } else {
      igstAmount = Math.round((taxableBase * (gstRate / 100)) * 100) / 100;
    }

    const totalBeforeRound = itemsSubtotal + freightAmount + packagingAmount + cgstAmount + sgstAmount + igstAmount;
    const grandTotal = Math.round(totalBeforeRound);
    const roundOff = Math.round((grandTotal - totalBeforeRound) * 100) / 100;

    const isApprovalRequired = Array.isArray(policy.approverUserIds) && policy.approverUserIds.length > 0;
    const initialStatus = isApprovalRequired ? 'CREATED' : 'APPROVED';
    const approvedById = isApprovalRequired ? null : (req.user?.id || null);
    const approvedByName = isApprovalRequired ? '' : actorName;
    const approvedAt = isApprovalRequired ? null : new Date();

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId: resolvedProjectId,
        vendorId: vendorId || null,
        vendorCode: resolvedVendorCode || 'VND-0001',
        vendorName: resolvedVendorName || 'Hiwin Motion Controls India Pvt Ltd',
        status: initialStatus,
        isLocked: Boolean(policy.lockPoAfterApproval && initialStatus === 'APPROVED'),
        items: computedItems,
        totalAmount: {
          currency,
          amount: grandTotal,
          exchangeRate,
          baseAmountINR: grandTotal,
          itemsSubtotal,
          freightAmount,
          freightTransportMode,
          freightTaxable,
          packagingAmount,
          packagingType,
          packagingTaxable,
          taxableBase,
          taxType,
          gstRate,
          cgstAmount,
          sgstAmount,
          igstAmount,
          roundOff,
          grandTotal,
          poType,
          poDate,
          paymentTerms,
          deliveryPlant,
          deliverySchedule,
          comments: []
        },
        notes,
        approvedById,
        approvedByName,
        approvedAt,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PO_CREATED',
      module: 'purchase',
      entityId: po.id,
      entityType: 'PurchaseOrder',
      notes: `PO ${poNumber} created for project ${po.projectId} (${poType}, status: ${initialStatus}). Total: ₹${grandTotal}`
    });

    res.status(201).json({
      success: true,
      message: `All set! Outward PO ${poNumber} created with status: ${initialStatus}.`,
      purchaseOrder: formatPo(po)
    });
  } catch (error) {
    next(error);
  }
};

export const approvePurchaseOrder = async (req, res, next) => {
  try {
    const config = await ensureDefaultVendorsAndPrices(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Outward Purchase Order not found.' });
    }

    if (po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'FULL_RECEIVED') {
      return res.status(400).json({ success: false, message: `Outward PO ${po.poNumber} is already ${po.status}.` });
    }

    const approverIds = Array.isArray(policy.approverUserIds) ? policy.approverUserIds : [];
    const userId = req.user?.id;
    const userRole = String(req.user?.role || req.user?.roleName || '').toUpperCase();
    const isSuperAdmin = userRole.includes('ADMIN') || userRole.includes('DIRECTOR');

    if (approverIds.length > 0 && !approverIds.includes(userId) && !isSuperAdmin) {
      const names = (policy.approverUsers || []).map((u) => u.name).filter(Boolean).join(', ') || 'Assigned Approvers';
      return res.status(403).json({
        success: false,
        message: `Approval Restricted: Only assigned approver(s) (${names}) can approve this Outward PO.`
      });
    }

    const actorName = getActorName(req.user);
    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: userId || null,
        approvedByName: actorName,
        approvedAt: new Date(),
        updatedById: userId || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PO_APPROVED',
      module: 'purchase',
      entityId: po.id,
      entityType: 'PurchaseOrder',
      notes: `Outward PO ${po.poNumber} approved by ${actorName}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Outward PO ${po.poNumber} approved successfully.`,
      purchaseOrder: formatPo(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['CREATED', 'APPROVED', 'PARTIALLY_RECEIVED', 'FULL_RECEIVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status "${status}". Allowed: ${validStatuses.join(', ')}`
      });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Outward Purchase Order not found.' });
    }

    const actorName = getActorName(req.user);
    const updateData = {
      status,
      updatedById: req.user?.id || null,
      updatedByName: actorName
    };
    if (status === 'APPROVED' && !po.approvedAt) {
      updateData.approvedAt = new Date();
      updateData.approvedById = req.user?.id || null;
      updateData.approvedByName = actorName;
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData
    });

    await logAuditEvent({
      req,
      action: 'PO_STATUS_UPDATED',
      module: 'purchase',
      entityId: po.id,
      entityType: 'PurchaseOrder',
      notes: `Outward PO ${po.poNumber} status updated to ${status} by ${actorName}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Outward PO status updated to ${status}.`,
      purchaseOrder: formatPo(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const addPurchaseOrderComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ success: false, message: 'Follow-up comment cannot be empty.' });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Outward Purchase Order not found.' });
    }

    const actorName = getActorName(req.user);
    const userRole = req.user?.roleName || req.user?.role || 'Staff';
    const totalAmount = (typeof po.totalAmount === 'object' && po.totalAmount !== null) ? po.totalAmount : {};
    const existingComments = Array.isArray(totalAmount.comments) ? totalAmount.comments : [];

    const newComment = {
      id: `comm-${Date.now()}`,
      commentText: String(comment).trim(),
      userId: req.user?.id || null,
      userName: actorName,
      userRole,
      createdAt: new Date().toISOString()
    };

    const updatedTotalAmount = {
      ...totalAmount,
      comments: [newComment, ...existingComments]
    };

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        totalAmount: updatedTotalAmount,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PO_COMMENT_ADDED',
      module: 'purchase',
      entityId: po.id,
      entityType: 'PurchaseOrder',
      notes: `Follow-up note added to PO ${po.poNumber} by ${actorName}.`
    });

    res.status(201).json({
      success: true,
      message: 'All set! Follow-up comment posted.',
      comment: newComment,
      purchaseOrder: formatPo(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrderGrnHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return res.status(404).json({ success: false, message: 'Outward Purchase Order not found.' });
    }

    const grnRecords = await prisma.grnRecord.findMany({
      where: { poNumber: po.poNumber },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    const gateEntries = await prisma.gateEntry.findMany({
      where: { poNumber: po.poNumber },
      orderBy: { createdAt: 'desc' }
    }).catch(() => []);

    res.status(200).json({
      success: true,
      poNumber: po.poNumber,
      grnRecords,
      gateEntries
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const config = await ensureDefaultVendorsAndPrices(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Outward Purchase Order not found.' });
    }

    // Check receipt status
    if (po.status === 'FULL_RECEIVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot edit Outward PO ${po.poNumber} because all items have already been received.`
      });
    }

    // Enforce Master Time Policy
    const timeCheck = checkTimeWindowAllowed(po, policy, 'EDIT');
    if (!timeCheck.allowed) {
      return res.status(403).json({ success: false, message: timeCheck.message });
    }

    const {
      freightTransportMode,
      freightAmount,
      freightTaxable,
      packagingType,
      packagingAmount,
      packagingTaxable,
      taxType,
      gstRate,
      paymentTerms,
      deliveryPlant,
      deliverySchedule,
      notes,
      items
    } = req.body;

    const actorName = getActorName(req.user);
    const prevTotalAmount = (typeof po.totalAmount === 'object' && po.totalAmount !== null) ? po.totalAmount : {};

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        notes: notes !== undefined ? notes : po.notes,
        items: items !== undefined ? items : po.items,
        totalAmount: {
          ...prevTotalAmount,
          freightTransportMode: freightTransportMode !== undefined ? freightTransportMode : prevTotalAmount.freightTransportMode,
          freightAmount: freightAmount !== undefined ? freightAmount : prevTotalAmount.freightAmount,
          freightTaxable: freightTaxable !== undefined ? freightTaxable : prevTotalAmount.freightTaxable,
          packagingType: packagingType !== undefined ? packagingType : prevTotalAmount.packagingType,
          packagingAmount: packagingAmount !== undefined ? packagingAmount : prevTotalAmount.packagingAmount,
          packagingTaxable: packagingTaxable !== undefined ? packagingTaxable : prevTotalAmount.packagingTaxable,
          taxType: taxType !== undefined ? taxType : prevTotalAmount.taxType,
          gstRate: gstRate !== undefined ? gstRate : prevTotalAmount.gstRate,
          paymentTerms: paymentTerms !== undefined ? paymentTerms : prevTotalAmount.paymentTerms,
          deliveryPlant: deliveryPlant !== undefined ? deliveryPlant : prevTotalAmount.deliveryPlant,
          deliverySchedule: deliverySchedule !== undefined ? deliverySchedule : prevTotalAmount.deliverySchedule
        },
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PO_UPDATED',
      module: 'purchase',
      entityId: po.id,
      entityType: 'PurchaseOrder',
      notes: `Outward PO ${po.poNumber} updated by ${actorName}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Outward PO ${po.poNumber} updated.`,
      purchaseOrder: formatPo(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const deletePurchaseOrder = async (req, res, next) => {
  try {
    const config = await ensureDefaultVendorsAndPrices(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Outward Purchase Order not found.' });
    }

    // Check receipt status
    if (po.status === 'PARTIALLY_RECEIVED' || po.status === 'FULL_RECEIVED') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Outward PO ${po.poNumber} because items have already been received at the plant.`
      });
    }

    // Enforce Master Time Policy
    const timeCheck = checkTimeWindowAllowed(po, policy, 'DELETE');
    if (!timeCheck.allowed) {
      return res.status(403).json({ success: false, message: timeCheck.message });
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    await logAuditEvent({
      req,
      action: 'PO_DELETED',
      module: 'purchase',
      entityId: po.id,
      entityType: 'PurchaseOrder',
      notes: `Outward PO ${po.poNumber} deleted by ${getActorName(req.user)}.`
    });

    res.status(200).json({
      success: true,
      message: `Outward PO ${po.poNumber} has been removed successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * BOM-Driven Net Purchase Demand Calculation:
 * Gross BOM Demand (for BUY items) minus Available Unreserved Inventory in Store,
 * enriched with Multi-Vendor Price Agreements.
 */
export const calculateNetDemand = async (req, res, next) => {
  try {
    await ensureDefaultVendorsAndPrices(req.user);
    const { projectId } = req.params;
    const cleanPrj = String(projectId).toUpperCase().trim();

    const bom = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });

    if (!bom || !Array.isArray(bom.items) || bom.items.length === 0) {
      return res.status(200).json({
        success: true,
        projectId: cleanPrj,
        isApproved: false,
        approvalStatus: 'NO_BOM',
        totalBuyItems: 0,
        itemsRequiringProcurement: 0,
        demandMatrix: []
      });
    }

    const approvalStatus = bom.approvalStatus || (bom.isFrozen ? 'LOCKED_FREEZE' : 'DRAFT');
    const isApproved = approvalStatus === 'LOCKED_FREEZE' || approvalStatus === 'APPROVED' || bom.isFrozen;

    const buyItems = bom.items.filter((i) => String(i.makeOrBuy).toUpperCase() === 'BUY');
    const priceAgreements = await prisma.vendorPriceAgreement.findMany({
      where: { isActive: true }
    });

    // Check Store Inventory if InventoryItem table exists
    let inventoryMap = new Map();
    if (prisma.inventoryItem) {
      const itemCodes = buyItems.map((i) => i.itemCode);
      const inventoryList = await prisma.inventoryItem.findMany({
        where: { itemCode: { in: itemCodes } }
      }).catch(() => []);
      inventoryList.forEach((inv) => {
        const acceptedQty = Number(inv.acceptedQty ?? inv.buckets?.accepted ?? 0);
        const reservedQty = Number(inv.reservedQuantity ?? 0);
        const unreserved = Math.max(0, acceptedQty - reservedQty);
        inventoryMap.set(inv.itemCode, { unreserved, baseUom: inv.baseUom });
      });
    }

    const netDemandList = buyItems.map((item) => {
      const grossDemand = Number(item.baseQty ?? item.quantity?.baseQty ?? item.quantityPerMachine ?? 1);
      const baseUom = item.baseUom || item.quantity?.baseUom || 'Nos';
      const invData = inventoryMap.get(item.itemCode) || { unreserved: 0, baseUom };
      const availableUnreserved = invData.unreserved;
      const netPurchaseDemand = Math.max(0, grossDemand - availableUnreserved);

      const matchingPrices = priceAgreements.filter(
        (pa) => pa.itemCode.toUpperCase() === String(item.itemCode).toUpperCase()
      );
      const bestAgreement = matchingPrices[0] || null;

      return {
        itemCode: item.itemCode,
        itemName: item.itemName,
        itemType: item.itemType || 'BO',
        subAssemblyGroup: item.subAssemblyGroup,
        baseUom,
        grossBomDemand: grossDemand,
        availableUnreservedStock: availableUnreserved,
        netPurchaseDemand,
        unitCostEstimate: bestAgreement?.unitPrice || item.standardRateINR || 0,
        preferredVendorName: bestAgreement?.vendorName || 'Open Sourcing',
        preferredVendorCode: bestAgreement?.vendorCode || '',
        ecoStatus: item.ecoStatus || 'ACTIVE',
        requiresProcurement: netPurchaseDemand > 0 && item.ecoStatus !== 'FROZEN_ECO'
      };
    });

    res.status(200).json({
      success: true,
      projectId: cleanPrj,
      isApproved,
      approvalStatus,
      attachedAssemblyCode: bom.attachedAssemblyCode || '',
      attachedDrawingNumber: bom.attachedDrawingNumber || '',
      totalBuyItems: buyItems.length,
      itemsRequiringProcurement: netDemandList.filter((d) => d.requiresProcurement).length,
      demandMatrix: netDemandList
    });
  } catch (error) {
    next(error);
  }
};
