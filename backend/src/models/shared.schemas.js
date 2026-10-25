import mongoose from 'mongoose';

/**
 * Dual Currency Monetary Schema
 * Stores both transaction currency and converted base INR value with permanently locked exchange rate.
 */
export const MonetaryAmountSchema = new mongoose.Schema(
  {
    currency: {
      type: String,
      required: true,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      set: (val) => Math.round(val * 100) / 100
    },
    exchangeRate: {
      type: Number,
      required: true,
      default: 1.0,
      min: 0.0001
    },
    baseAmountINR: {
      type: Number,
      required: true,
      min: 0,
      set: (val) => Math.round(val * 100) / 100
    }
  },
  { _id: false }
);

/**
 * Dual Unit Quantity Schema
 * Stores both Base UOM and Alternate UOM quantities with conversion factor.
 */
export const DualQuantitySchema = new mongoose.Schema(
  {
    baseQty: {
      type: Number,
      required: true,
      min: 0
    },
    baseUom: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    altQty: {
      type: Number,
      min: 0
    },
    altUom: {
      type: String,
      uppercase: true,
      trim: true
    },
    conversionRatio: {
      type: Number,
      min: 0.000001
    }
  },
  { _id: false }
);

/**
 * Status Transition Audit History
 */
export const StatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    }
  },
  { _id: false }
);
