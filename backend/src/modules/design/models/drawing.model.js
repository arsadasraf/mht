import mongoose from 'mongoose';

const DrawingSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      trim: true,
      index: true
      // Hard linked to Unique Project ID
    },
    drawingNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    revision: {
      type: String,
      default: 'R0',
      uppercase: true
    },
    category: {
      type: String,
      enum: ['MECHANICAL', 'ELECTRICAL_SCHEMATIC', 'PNEUMATIC', 'HYDRAULIC', 'GENERAL_ARRANGEMENT'],
      default: 'MECHANICAL'
    },
    fileKey: {
      type: String,
      required: true // S3 Key or local storage key
    },
    fileName: {
      type: String,
      required: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileSizeBytes: {
      type: Number,
      required: true
    },
    isWatermarkedForViewing: {
      type: Boolean,
      default: true
    },
    ecoStatus: {
      type: String,
      enum: ['RELEASED', 'UNDER_ECO', 'OBSOLETE'],
      default: 'RELEASED'
    },
    uploadedBy: {
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

export const Drawing = mongoose.model('Drawing', DrawingSchema);
