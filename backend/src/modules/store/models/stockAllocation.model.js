import mongoose from 'mongoose';

const StockAllocationSchema = new mongoose.Schema(
  {
    allocationNumber: {
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
      // Hard locked to the Unique Project ID Spine (PRJ-XXXX)
    },
    itemCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    allocatedQty: {
      type: Number,
      required: true,
      min: 0.001
    },
    baseUom: {
      type: String,
      required: true,
      uppercase: true
    },
    status: {
      type: String,
      enum: ['HARD_LOCKED', 'TRANSFER_REQUESTED', 'TRANSFERRED', 'ISSUED_TO_SHOPFLOOR'],
      default: 'HARD_LOCKED'
    },
    transferRequestedToProject: {
      type: String,
      trim: true
    },
    managerialApprovalBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    managerialApprovalNotes: {
      type: String
    },
    allocatedBy: {
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

export const StockAllocation = mongoose.model('StockAllocation', StockAllocationSchema);
