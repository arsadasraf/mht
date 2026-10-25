import mongoose from 'mongoose';
import { MonetaryAmountSchema } from '../../../models/shared.schemas.js';

const ProjectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
      // Format: PRJ-XXXX (e.g. PRJ-2026-001) - The Central Reference Spine
    },
    workOrderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
      // Format: WO-XXXX
    },
    projectName: {
      type: String,
      required: true,
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    machineModel: {
      type: String,
      required: true,
      trim: true
    },
    quotationRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation'
    },
    contractValue: {
      type: MonetaryAmountSchema,
      required: true
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    targetDispatchDate: {
      type: Date,
      required: true
    },
    actualDispatchDate: {
      type: Date
    },
    currentStage: {
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
        'DISPATCHED',
        'AFTER_SALES'
      ],
      default: 'PROJECT_SETUP'
    },
    status: {
      type: String,
      enum: ['ON_TRACK', 'DELAYED', 'FROZEN_ECO', 'COMPLETED', 'ON_HOLD'],
      default: 'ON_TRACK'
    },
    projectManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    leadDesignEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    leadProductionEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    plantLocation: {
      type: String,
      default: 'Main Works - Unit 1'
    },
    revisionNumber: {
      type: Number,
      default: 1
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

export const Project = mongoose.model('Project', ProjectSchema);
