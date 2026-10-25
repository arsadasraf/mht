import mongoose from 'mongoose';

const InventoryItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ['RAW_MATERIAL', 'ELECTRICAL_COMPONENTS', 'PNEUMATICS_HYDRAULICS', 'FASTENERS_BEARINGS', 'MACHINED_PARTS', 'CONSUMABLES'],
      default: 'MACHINED_PARTS'
    },
    baseUom: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    alternateUom: {
      type: String,
      uppercase: true,
      trim: true
    },
    conversionRatio: {
      type: Number,
      default: 1.0 // 1 alternateUom = conversionRatio * baseUom
    },
    binLocation: {
      type: String,
      default: 'BIN-GEN-01'
    },
    // The 4 Core ETO Inventory Buckets (Normalized strictly to baseUom)
    buckets: {
      ordered: { type: Number, default: 0, min: 0 },
      inQc: { type: Number, default: 0, min: 0 },
      accepted: { type: Number, default: 0, min: 0 },
      issued: { type: Number, default: 0, min: 0 }
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0 // Hard locked to specific Project IDs
    },
    minSafetyStock: {
      type: Number,
      default: 0
    },
    unitCostINR: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

export const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);
