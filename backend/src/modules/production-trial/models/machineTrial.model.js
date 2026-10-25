import mongoose from 'mongoose';

const SnagItemSchema = new mongoose.Schema(
  {
    snagNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'MAJOR', 'MINOR'],
      required: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_RECTIFICATION', 'RESOLVED', 'VERIFIED_QC'],
      default: 'OPEN'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rootCauseNotes: {
      type: String
    },
    rectificationDetails: {
      type: String
    },
    qcVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    qcVerifiedAt: {
      type: Date
    }
  },
  { _id: true, timestamps: true }
);

const MachineTrialSchema = new mongoose.Schema(
  {
    trialRunNumber: {
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
    trialType: {
      type: String,
      enum: ['DRY_RUN', 'WET_RUN_LOAD', 'FAT_INTERNAL', 'CLIENT_FAT_ACCEPTANCE'],
      required: true
    },
    parametersChecked: [
      {
        parameter: { type: String, required: true },
        standardValue: { type: String, required: true },
        measuredValue: { type: String, required: true },
        verdict: { type: String, enum: ['PASS', 'FAIL'], default: 'PASS' }
      }
    ],
    snags: [SnagItemSchema],
    trialVerdict: {
      type: String,
      enum: ['PASS_TRIAL_CLEARED', 'FAIL_SNAGS_PENDING', 'IN_PROGRESS'],
      default: 'IN_PROGRESS'
    },
    trialEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    trialDate: {
      type: Date,
      default: Date.now
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

export const MachineTrial = mongoose.model('MachineTrial', MachineTrialSchema);
