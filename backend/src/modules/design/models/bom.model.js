import mongoose from 'mongoose';
import { DualQuantitySchema, MonetaryAmountSchema } from '../../../models/shared.schemas.js';

const BomItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    itemName: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: Number,
      required: true,
      enum: [1, 2, 3] // 1: Machine Level, 2: Sub-Assembly, 3: Component/Part
    },
    parentItemCode: {
      type: String, // null for level 1
      trim: true,
      uppercase: true
    },
    subAssemblyGroup: {
      type: String, // e.g. "Spindle Head Unit", "Pneumatic Clamping", "Rotary Indexer"
      trim: true
    },
    quantity: {
      type: DualQuantitySchema,
      required: true
    },
    makeOrBuy: {
      type: String,
      enum: ['MAKE', 'BUY'],
      required: true
    },
    drawingNumber: {
      type: String,
      trim: true
    },
    materialGrade: {
      type: String,
      trim: true
    },
    estimatedUnitCost: {
      type: MonetaryAmountSchema
    },
    ecoStatus: {
      type: String,
      enum: ['ACTIVE', 'FROZEN_ECO', 'OBSOLETE'],
      default: 'ACTIVE'
    },
    ecoReference: {
      type: String
    }
  },
  { _id: true }
);

const BomSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      trim: true,
      index: true
      // Hard linked to the Unique Project ID Spine (PRJ-XXXX)
    },
    bomNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    revision: {
      type: String,
      default: 'REV-0'
    },
    isFrozen: {
      type: Boolean,
      default: false
    },
    items: [BomItemSchema],
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
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

export const Bom = mongoose.model('Bom', BomSchema);
