import mongoose from 'mongoose';

const EcoSchema = new mongoose.Schema(
  {
    ecoNumber: {
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
      // Linked to Unique Project ID Spine
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    reasonForChange: {
      type: String,
      required: true
    },
    changeType: {
      type: String,
      enum: ['DIMENSIONAL_CHANGE', 'MATERIAL_SUBSTITUTION', 'OBSOLESCENCE', 'SAFETY_UPGRADE', 'CLIENT_REQUEST'],
      required: true
    },
    affectedItemCodes: [
      {
        type: String,
        uppercase: true,
        trim: true
      }
    ],
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED_FREEZE', 'REJECTED', 'IMPLEMENTED'],
      default: 'SUBMITTED'
    },
    freezeActionTaken: {
      type: Boolean,
      default: false // Set to true when automated PO line & store stock freeze is executed
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    approvalNotes: {
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

export const Eco = mongoose.model('Eco', EcoSchema);
