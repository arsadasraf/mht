import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { ensureDefaultVendorsAndPrices, DEFAULT_PURCHASE_PREFIX_POLICY } from './vendor.controller.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatPo = (po) => ({
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
  items: Array.isArray(po.items) ? po.items : []
});

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

    res.status(200).json({
      success: true,
      count: pos.length,
      purchaseOrders: pos.map(formatPo)
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
      projectId,
      vendorId,
      vendorCode = '',
      vendorName = '',
      items = [],
      currency = 'INR',
      exchangeRate = 1.0,
      notes = ''
    } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required to create an Outward Purchase Order.'
      });
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `${policy.poPrefix || 'PO'}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
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

    const computedItems = (Array.isArray(items) ? items : []).map((item) => {
      const unitAmount = Number(item.unitPrice?.amount ?? item.unitPrice ?? item.rate ?? 0);
      const itemRate = Number(item.unitPrice?.exchangeRate || exchangeRate || 1.0);
      const itemCurrency = item.unitPrice?.currency || currency;
      const unitBaseINR = Math.round(unitAmount * itemRate * 100) / 100;

      const baseQty = Number(item.quantity?.baseQty ?? item.quantity ?? 1);
      const lineAmount = Math.round(unitAmount * baseQty * 100) / 100;
      const lineBaseINR = Math.round(unitBaseINR * baseQty * 100) / 100;

      return {
        itemCode: String(item.itemCode || '').toUpperCase(),
        itemName: item.itemName || item.description || item.itemCode,
        itemType: item.itemType || 'BO',
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
        expectedDeliveryDate: item.expectedDeliveryDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'OPEN'
      };
    });

    const totalRaw = computedItems.reduce((acc, curr) => acc + curr.lineTotal.amount, 0);
    const totalINR = computedItems.reduce((acc, curr) => acc + curr.lineTotal.baseAmountINR, 0);

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        projectId: String(projectId).toUpperCase().trim(),
        vendorId: vendorId || null,
        vendorCode: resolvedVendorCode || 'VND-0001',
        vendorName: resolvedVendorName || 'Hiwin Motion Controls India Pvt Ltd',
        status: 'APPROVED',
        isLocked: Boolean(policy.lockPoAfterApproval),
        items: computedItems,
        totalAmount: {
          currency,
          amount: Math.round(totalRaw * 100) / 100,
          exchangeRate,
          baseAmountINR: Math.round(totalINR * 100) / 100
        },
        notes,
        approvedById: req.user?.id || null,
        approvedByName: actorName,
        approvedAt: new Date(),
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
      notes: `PO ${poNumber} created for project ${po.projectId}. Total: ₹${totalINR}`
    });

    res.status(201).json({
      success: true,
      message: `All set! Outward PO ${poNumber} created.`,
      purchaseOrder: formatPo(po)
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
        totalBuyItems: 0,
        itemsRequiringProcurement: 0,
        demandMatrix: []
      });
    }

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
      totalBuyItems: buyItems.length,
      itemsRequiringProcurement: netDemandList.filter((d) => d.requiresProcurement).length,
      demandMatrix: netDemandList
    });
  } catch (error) {
    next(error);
  }
};
