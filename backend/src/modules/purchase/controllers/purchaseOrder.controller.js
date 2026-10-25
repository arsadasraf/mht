import { PurchaseOrder } from '../models/purchaseOrder.model.js';
import { Bom } from '../../design/models/bom.model.js';
import { InventoryItem } from '../../store/models/inventoryItem.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getPurchaseOrders = async (req, res, next) => {
  try {
    const { projectId, status, search } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId.toUpperCase();
    if (status) query.status = status;
    if (search) query.poNumber = { $regex: search, $options: 'i' };

    const pos = await PurchaseOrder.find(query)
      .populate('vendorId', 'vendorCode name email')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: pos.length, purchaseOrders: pos });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseOrder = async (req, res, next) => {
  try {
    const { projectId, vendorId, items, currency = 'INR', exchangeRate = 1.0, notes } = req.body;

    const count = await PurchaseOrder.countDocuments();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Normalize Dual Currency for items and total
    const computedItems = (items || []).map((item) => {
      const unitAmount = Number(item.unitPrice?.amount || item.unitPrice || 0);
      const itemRate = Number(item.unitPrice?.exchangeRate || exchangeRate || 1.0);
      const itemCurrency = item.unitPrice?.currency || currency;
      const unitBaseINR = Math.round(unitAmount * itemRate * 100) / 100;

      const baseQty = Number(item.quantity?.baseQty || item.quantity || 1);
      const lineAmount = Math.round(unitAmount * baseQty * 100) / 100;
      const lineBaseINR = Math.round(unitBaseINR * baseQty * 100) / 100;

      return {
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: {
          baseQty,
          baseUom: item.quantity?.baseUom || 'NOS',
          altQty: item.quantity?.altQty || baseQty,
          altUom: item.quantity?.altUom || item.quantity?.baseUom || 'NOS',
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
        expectedDeliveryDate: item.expectedDeliveryDate || new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        status: 'OPEN'
      };
    });

    const totalRaw = computedItems.reduce((acc, curr) => acc + curr.lineTotal.amount, 0);
    const totalINR = computedItems.reduce((acc, curr) => acc + curr.lineTotal.baseAmountINR, 0);

    const po = new PurchaseOrder({
      poNumber,
      projectId: projectId.toUpperCase(),
      vendorId,
      items: computedItems,
      totalAmount: {
        currency,
        amount: Math.round(totalRaw * 100) / 100,
        exchangeRate,
        baseAmountINR: Math.round(totalINR * 100) / 100
      },
      notes,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await po.save();

    await logAuditEvent({
      req,
      action: 'PO_CREATED',
      module: 'purchase',
      entityId: po._id,
      entityType: 'PurchaseOrder',
      notes: `PO ${poNumber} created for project ${projectId}. Total: ${currency} ${po.totalAmount.amount} (INR: ₹${po.totalAmount.baseAmountINR})`
    });

    res.status(201).json({ success: true, message: 'Purchase Order created successfully.', purchaseOrder: po });
  } catch (error) {
    next(error);
  }
};

/**
 * BOM-Driven Net Purchase Demand Calculation:
 * Gross BOM Demand minus Available Unreserved Inventory in Store.
 */
export const calculateNetDemand = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const bom = await Bom.findOne({ projectId: projectId.toUpperCase() });

    if (!bom || !bom.items || bom.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No active BOM found for Project ID ${projectId} to calculate net demand.`
      });
    }

    // Filter items where makeOrBuy === 'BUY'
    const buyItems = bom.items.filter((i) => i.makeOrBuy === 'BUY');

    // Get current stock items for comparison
    const itemCodes = buyItems.map((i) => i.itemCode);
    const inventoryList = await InventoryItem.find({ itemCode: { $in: itemCodes } });

    const inventoryMap = new Map();
    inventoryList.forEach((inv) => {
      // Unreserved = Accepted stock bucket minus already reserved quantity
      const unreserved = Math.max(0, (inv.buckets?.accepted || 0) - (inv.reservedQuantity || 0));
      inventoryMap.set(inv.itemCode, {
        unreserved,
        baseUom: inv.baseUom,
        buckets: inv.buckets
      });
    });

    const netDemandList = buyItems.map((item) => {
      const grossDemand = item.quantity?.baseQty || 0;
      const invData = inventoryMap.get(item.itemCode) || { unreserved: 0, baseUom: item.quantity?.baseUom || 'NOS' };
      const availableUnreserved = invData.unreserved;
      const netPurchaseDemand = Math.max(0, grossDemand - availableUnreserved);

      return {
        itemCode: item.itemCode,
        itemName: item.itemName,
        subAssemblyGroup: item.subAssemblyGroup,
        baseUom: item.quantity?.baseUom,
        grossBomDemand: grossDemand,
        availableUnreservedStock: availableUnreserved,
        netPurchaseDemand,
        unitCostEstimate: item.estimatedUnitCost,
        ecoStatus: item.ecoStatus,
        requiresProcurement: netPurchaseDemand > 0
      };
    });

    res.status(200).json({
      success: true,
      projectId: projectId.toUpperCase(),
      totalBuyItems: buyItems.length,
      itemsRequiringProcurement: netDemandList.filter((d) => d.requiresProcurement).length,
      demandMatrix: netDemandList
    });
  } catch (error) {
    next(error);
  }
};
