import mongoose from 'mongoose';
import { MonetaryAmountSchema } from '../../../models/shared.schemas.js';

const QuotationItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, default: 'BASE-UNIT', trim: true },
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: MonetaryAmountSchema, required: true },
    lineTotal: { type: MonetaryAmountSchema, required: true }
  },
  { _id: true }
);

const QuotationSchema = new mongoose.Schema(
  {
    quoteNumber: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true
    },
    revision: {
      type: Number,
      default: 0
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    companyName: {
      type: String,
      default: '',
      trim: true
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true
    },
    gstin: {
      type: String,
      default: '',
      trim: true
    },
    machineModel: {
      type: String,
      required: true,
      trim: true
    },
    items: [QuotationItemSchema],
    subtotal: {
      type: MonetaryAmountSchema,
      required: true
    },
    taxRatePercent: {
      type: Number,
      default: 18, // 18% GST standard in India, 0 for export
      min: 0
    },
    taxAmount: {
      type: MonetaryAmountSchema,
      required: true
    },
    totalAmount: {
      type: MonetaryAmountSchema,
      required: true
    },
    validUntil: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'SENT_TO_CLIENT', 'ACCEPTED', 'REJECTED'],
      default: 'DRAFT'
    },
    paymentTerms: {
      type: String,
      default: '30% Advance with PO, 60% Before Dispatch, 10% Post Commissioning'
    },
    deliveryWeeks: {
      type: Number,
      default: 8
    },
    warrantyMonths: {
      type: Number,
      default: 12
    },
    // Enterprise PO Gate Details (filled when won)
    poDetails: {
      poNumber: { type: String, trim: true },
      poDate: { type: Date },
      advanceAmount: { type: MonetaryAmountSchema },
      advanceTransactionRef: { type: String, trim: true },
      targetDeliveryDate: { type: Date },
      notes: { type: String }
    },
    convertedProjectId: {
      type: String, // PRJ-XXXX reference in Project Setup
      trim: true
    },
    convertedAt: {
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

// Auto-generate Quote Number if not present
QuotationSchema.pre('validate', async function (next) {
  if (!this.quoteNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Quotation').countDocuments();
    const sequential = String(count + 1).padStart(4, '0');
    this.quoteNumber = `QT-${year}-${sequential}`;
  }
  next();
});

export const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);
