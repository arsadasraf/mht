import mongoose from 'mongoose';

const ServiceTicketSchema = new mongoose.Schema(
  {
    ticketNumber: {
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
      // Hard linked to Unique Project ID Spine
    },
    customerName: {
      type: String,
      required: true
    },
    serviceType: {
      type: String,
      enum: ['COMMISSIONING_SUPPORT', 'WARRANTY_CLAIM', 'PREVENTIVE_MAINTENANCE', 'SPARE_PARTS_REQUEST', 'EMERGENCY_BREAKDOWN'],
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL_LINE_STOPPAGE'],
      default: 'MEDIUM'
    },
    warrantyStatus: {
      type: String,
      enum: ['UNDER_WARRANTY', 'OUT_OF_WARRANTY', 'AMC_ACTIVE'],
      default: 'UNDER_WARRANTY'
    },
    status: {
      type: String,
      enum: ['LOGGED', 'ENGINEER_DISPATCHED', 'SPARE_DISPATCHED', 'RESOLVED_CLOSED'],
      default: 'LOGGED'
    },
    fieldEngineer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionNotes: {
      type: String
    },
    resolvedAt: {
      type: Date
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

export const ServiceTicket = mongoose.model('ServiceTicket', ServiceTicketSchema);
