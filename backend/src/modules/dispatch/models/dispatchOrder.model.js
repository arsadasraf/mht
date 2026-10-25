import mongoose from 'mongoose';

const DispatchOrderSchema = new mongoose.Schema(
  {
    dispatchNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
      // Hard linked to Unique Project ID Spine
    },
    workOrderNumber: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true
    },
    shippingAddress: {
      type: String,
      required: true
    },
    transporterName: {
      type: String
    },
    lrNumber: {
      type: String,
      trim: true
    },
    vehicleNumber: {
      type: String,
      trim: true
    },
    // Absolute Zero-Snag Block Verification
    zeroSnagVerified: {
      type: Boolean,
      default: false
    },
    zeroSnagVerifiedAt: {
      type: Date
    },
    zeroSnagVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    commercialClearanceGiven: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['PRE_DISPATCH_HOLD', 'SNAG_BLOCKED', 'GATE_PASS_UNLOCKED', 'DISPATCHED_IN_TRANSIT', 'DELIVERED'],
      default: 'PRE_DISPATCH_HOLD'
    },
    gatePassNumber: {
      type: String,
      trim: true
    },
    dossierDocuments: [
      {
        docType: {
          type: String,
          enum: ['INSPECTION_CERTIFICATE', 'PACKING_LIST', 'E_WAY_BILL', 'OPERATOR_MANUAL', 'ELECTRICAL_SCHEMATICS', 'FAT_SIGN_OFF']
        },
        fileKey: String,
        verified: { type: Boolean, default: false }
      }
    ],
    actualDispatchDate: {
      type: Date
    },
    dispatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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

export const DispatchOrder = mongoose.model('DispatchOrder', DispatchOrderSchema);
