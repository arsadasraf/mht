import mongoose from 'mongoose';

const GateEntrySchema = new mongoose.Schema(
  {
    gateEntryNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    poNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    projectId: {
      type: String,
      required: true,
      trim: true,
      index: true
      // Linked to Unique Project ID Spine
    },
    vendorName: {
      type: String,
      required: true
    },
    challanOrInvoiceNumber: {
      type: String,
      required: true
    },
    vehicleNumber: {
      type: String,
      trim: true
    },
    itemsCount: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ['QUARANTINE_HOLD', 'IN_QC_INSPECTION', 'QC_CLEARED', 'REJECTED_AT_GATE'],
      default: 'QUARANTINE_HOLD'
    },
    inwardDate: {
      type: Date,
      default: Date.now
    },
    securityGuardName: {
      type: String
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

export const GateEntry = mongoose.model('GateEntry', GateEntrySchema);
