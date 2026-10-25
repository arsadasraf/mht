import mongoose from 'mongoose';
import { DualQuantitySchema, MonetaryAmountSchema } from '../../../models/shared.schemas.js';

const PoLineItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    itemName: {
      type: String,
      required: true
    },
    quantity: {
      type: DualQuantitySchema,
      required: true
    },
    unitPrice: {
      type: MonetaryAmountSchema,
      required: true
    },
    lineTotal: {
      type: MonetaryAmountSchema,
      required: true
    },
    expectedDeliveryDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'FROZEN_ECO', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
      default: 'OPEN'
    }
  },
  { _id: true }
);

const PurchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    projectId: {
      type: String,
      required: true,
      trim: true,
      index: true
      // Hard linked to the Unique Project ID Spine (PRJ-XXXX)
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true
    },
    items: [PoLineItemSchema],
    totalAmount: {
      type: MonetaryAmountSchema,
      required: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED_TO_VENDOR', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    notes: {
      type: String
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

export const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);
