import mongoose from 'mongoose';
import { DualQuantitySchema } from '../../../models/shared.schemas.js';

const DefectLogSchema = new mongoose.Schema(
  {
    defectType: {
      type: String,
      enum: ['DIMENSIONAL_OUT_OF_TOLERANCE', 'SURFACE_SCRATCH_FINISH', 'MATERIAL_HARDNESS_FAIL', 'THREAD_BURR_DAMAGE', 'COATING_DEFECT', 'WRONG_SPECIFICATION'],
      required: true
    },
    rootCause: {
      type: String,
      enum: ['SUPPLIER_MACHINING_ERROR', 'POOR_PACKAGING_TRANSIT', 'HEAT_TREATMENT_ERROR', 'RAW_MATERIAL_FLAW', 'UNSPECIFIED'],
      default: 'SUPPLIER_MACHINING_ERROR'
    },
    severity: {
      type: String,
      enum: ['MINOR', 'MAJOR', 'CRITICAL'],
      default: 'MAJOR'
    },
    photoKeys: [String] // S3 keys for defect photos
  },
  { _id: false }
);

const QcInspectionSchema = new mongoose.Schema(
  {
    inspectionNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    gateEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GateEntry',
      required: true
    },
    projectId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    poNumber: {
      type: String,
      required: true,
      trim: true
    },
    itemCode: {
      type: String,
      required: true,
      uppercase: true
    },
    itemName: {
      type: String,
      required: true
    },
    receivedQty: {
      type: DualQuantitySchema,
      required: true
    },
    acceptedQty: {
      type: DualQuantitySchema,
      required: true
    },
    rejectedQty: {
      type: DualQuantitySchema,
      required: true
    },
    reworkQty: {
      type: DualQuantitySchema,
      required: true
    },
    overallVerdict: {
      type: String,
      enum: ['ACCEPTED', 'CONDITIONALLY_ACCEPTED', 'REJECTED_RTV', 'REWORK_INTERNAL'],
      required: true
    },
    defects: [DefectLogSchema],
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    inspectedAt: {
      type: Date,
      default: Date.now
    },
    inspectorRemarks: {
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

export const QcInspection = mongoose.model('QcInspection', QcInspectionSchema);
