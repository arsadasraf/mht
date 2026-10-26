import mongoose from 'mongoose';

const RemarkSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true
    },
    authorName: {
      type: String,
      default: 'System User',
      trim: true
    },
    authorRole: {
      type: String,
      default: 'Engineer',
      trim: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
);

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
      required: true,
      trim: true
    },
    stageCode: {
      type: String,
      trim: true
    },
    order: {
      type: Number,
      default: 1
    },
    leadRole: {
      type: String,
      default: 'Project Manager',
      trim: true
    },
    weightPercent: {
      type: Number,
      default: 10
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
      enum: ['NOT_STARTED', 'PENDING', 'IN_PROGRESS', 'ON_HOLD', 'BLOCKED', 'COMPLETED'],
      default: 'NOT_STARTED'
    },
    remarks: [RemarkSchema],
    signOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signOffNotes: {
      type: String,
      trim: true
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
