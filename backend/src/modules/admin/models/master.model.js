import mongoose from 'mongoose';

const MasterSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ['CURRENCY', 'UOM', 'PLANT', 'DEFECT_CODE', 'CAD_TYPE', 'LEAD_SOURCE'],
      uppercase: true
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    // For Currency category
    symbol: {
      type: String
    },
    exchangeRateToINR: {
      type: Number,
      default: 1.0
    },
    isBaseCurrency: {
      type: Boolean,
      default: false
    },
    // For UOM category
    isFractional: {
      type: Boolean,
      default: false // false = discrete (Nos/Pcs), true = continuous (Kg/Meters)
    },
    isActive: {
      type: Boolean,
      default: true
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

MasterSchema.index({ category: 1, code: 1 }, { unique: true });

export const Master = mongoose.models.Master || mongoose.model('Master', MasterSchema);
