import { InventoryItem } from '../models/inventoryItem.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

export const getInventoryItems = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { itemCode: { $regex: search, $options: 'i' } },
        { itemName: { $regex: search, $options: 'i' } },
        { binLocation: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await InventoryItem.countDocuments(query);
    const items = await InventoryItem.find(query)
      .sort({ itemCode: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, page: Number(page), items });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateItem = async (req, res, next) => {
  try {
    const { itemCode, itemName, category, baseUom, alternateUom, conversionRatio, binLocation, minSafetyStock } = req.body;

    let item = await InventoryItem.findOne({ itemCode: itemCode.toUpperCase() });
    if (!item) {
      item = new InventoryItem({
        itemCode: itemCode.toUpperCase(),
        itemName,
        category,
        baseUom: baseUom.toUpperCase(),
        alternateUom: alternateUom ? alternateUom.toUpperCase() : undefined,
        conversionRatio: Number(conversionRatio || 1.0),
        binLocation: binLocation || 'BIN-GEN-01',
        minSafetyStock: Number(minSafetyStock || 0),
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      });
    } else {
      if (itemName) item.itemName = itemName;
      if (category) item.category = category;
      if (baseUom) item.baseUom = baseUom.toUpperCase();
      if (alternateUom) item.alternateUom = alternateUom.toUpperCase();
      if (conversionRatio) item.conversionRatio = Number(conversionRatio);
      if (binLocation) item.binLocation = binLocation;
      if (minSafetyStock !== undefined) item.minSafetyStock = Number(minSafetyStock);
      item.updatedBy = req.user?._id;
    }

    await item.save();

    await logAuditEvent({
      req,
      action: 'INVENTORY_ITEM_SAVED',
      module: 'store',
      entityId: item._id,
      entityType: 'InventoryItem',
      notes: `Item ${item.itemCode} (${item.itemName}) saved in store ledger.`
    });

    res.status(200).json({ success: true, message: 'Inventory item saved.', item });
  } catch (error) {
    next(error);
  }
};
