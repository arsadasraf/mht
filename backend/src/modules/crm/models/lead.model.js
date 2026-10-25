import mongoose from 'mongoose';
import { MonetaryAmountSchema } from '../../../models/shared.schemas.js';

const LeadSchema = new mongoose.Schema(
  {
    leadNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true
    },
    queryId: {
      type: String, // IndiaMART / TradeIndia external inquiry ID
      sparse: true,
      trim: true
    },
    source: {
      type: String,
      default: 'DIRECT_SALES',
      trim: true
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    companyName: {
      type: String,
      required: true,
      trim: true
    },
    contactEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      default: 'Bengaluru',
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    },
    machineModel: {
      type: String,
      default: 'MHT-2100',
      trim: true
    },
    machineRequirement: {
      type: String,
      default: 'Precision Coil Winding Automation',
      trim: true
    },
    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId },
        modelCode: { type: String, required: true, trim: true },
        modelName: { type: String, required: true, trim: true },
        quantity: { type: Number, default: 1, min: 1 },
        unitPrice: { type: MonetaryAmountSchema },
        lineTotal: { type: MonetaryAmountSchema },
        specifications: { type: String, default: '', trim: true },
        customToolingNotes: { type: String, default: '', trim: true }
      }
    ],
    technicalSpecs: {
      wireRange: { type: String, default: '' },
      targetRpm: { type: Number, default: 0 },
      toolingNeeds: { type: String, default: '' }
    },
    estimatedValue: {
      type: MonetaryAmountSchema,
      default: () => ({
        currency: 'INR',
        amount: 250000,
        exchangeRate: 1.0,
        baseAmountINR: 250000
      })
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    stage: {
      type: String,
      enum: ['NEW', 'TECHNICAL_REVIEW', 'QUOTE_PREPARED', 'NEGOTIATION', 'WON', 'LOST'],
      default: 'NEW'
    },
    status: {
      type: String,
      enum: ['NEW', 'UNDER_REVIEW', 'QUOTATION_SENT', 'CONVERTED', 'LOST'],
      default: 'NEW'
    },
    lossReason: {
      type: String,
      default: ''
    },
    convertedProjectId: {
      type: String, // PRJ-XXXX reference if converted
      trim: true
    },
    convertedAt: {
      type: Date
    },
    notes: {
      type: String,
      default: ''
    },
    assignedTo: {
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

// Auto-generate Lead Number if not present
LeadSchema.pre('validate', async function (next) {
  if (!this.leadNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Lead').countDocuments();
    const sequential = String(count + 1).padStart(4, '0');
    this.leadNumber = `LD-${year}-${sequential}`;
  }
  next();
});

export const Lead = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
