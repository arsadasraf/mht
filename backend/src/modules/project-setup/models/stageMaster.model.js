import mongoose from 'mongoose';

const StageMasterSchema = new mongoose.Schema(
  {
    stageCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    stageName: {
      type: String,
      required: true,
      trim: true
    },
    defaultOrder: {
      type: Number,
      required: true,
      default: 1
    },
    leadRole: {
      type: String,
      default: 'Project Manager',
      trim: true
    },
    standardDaysOffset: {
      type: Number,
      default: 14
    },
    weightPercent: {
      type: Number,
      default: 15
    },
    description: {
      type: String,
      default: '',
      trim: true
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

export const StageMaster = mongoose.model('StageMaster', StageMasterSchema);
