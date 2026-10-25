import mongoose from 'mongoose';

const AssemblyStageSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      trim: true,
      index: true
      // Linked to Unique Project ID Spine
    },
    subAssemblyGroup: {
      type: String,
      required: true,
      trim: true // e.g. "Main Frame & Gantry", "Spindle Assembly", "Pneumatic Manifold", "Wiring & PLC Console"
    },
    sequenceOrder: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'READY_FOR_STAGE_GATE', 'GATE_PASSED', 'SNAG_BLOCKED'],
      default: 'NOT_STARTED'
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    technicianAssigned: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    stageGateSignOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    stageGateSignOffAt: {
      type: Date
    },
    gateChecklistPassed: {
      type: Boolean,
      default: false
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

export const AssemblyStage = mongoose.model('AssemblyStage', AssemblyStageSchema);
