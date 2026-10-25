import mongoose from 'mongoose';

const MilestoneSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      ref: 'Project',
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    stage: {
      type: String,
      enum: [
        'PROJECT_SETUP',
        'DESIGN_BOM',
        'PROCUREMENT',
        'INCOMING_QC',
        'STORE_ALLOCATION',
        'PRODUCTION_ASSEMBLY',
        'MACHINE_TRIAL',
        'DISPATCH_READY',
        'DISPATCHED'
      ],
      required: true
    },
    baselineDate: {
      type: Date,
      required: true
    },
    projectedDate: {
      type: Date,
      required: true
    },
    actualCompletionDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'],
      default: 'PENDING'
    },
    signOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signOffNotes: {
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

export const Milestone = mongoose.model('Milestone', MilestoneSchema);
