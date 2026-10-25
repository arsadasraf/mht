import mongoose from 'mongoose';
import { MonetaryAmountSchema } from '../../../models/shared.schemas.js';

const CustomerPoItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, default: 'BASE-UNIT', trim: true },
    modelCode: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    hsnCode: { type: String, default: '', trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: MonetaryAmountSchema, required: true },
    taxRate: { type: Number, default: 18, min: 0 },
    taxAmount: { type: MonetaryAmountSchema },
    lineTotal: { type: MonetaryAmountSchema, required: true },
    specifications: { type: String, default: '', trim: true }
  },
  { _id: true }
);

const CustomerPoSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    poDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead'
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quotation'
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
      default: '',
      trim: true
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true
    },
    billingAddress: {
      type: String,
      default: '',
      trim: true
    },
    gstin: {
      type: String,
      default: '',
      trim: true
    },
    items: [CustomerPoItemSchema],
    subtotalAmount: {
      type: MonetaryAmountSchema
    },
    totalTaxAmount: {
      type: MonetaryAmountSchema
    },
    totalAmount: {
      type: MonetaryAmountSchema,
      required: true
    },
    advanceRequiredPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    advanceAmount: {
      type: MonetaryAmountSchema
    },
    advanceReceived: {
      type: Boolean,
      default: false
    },
    advanceTransactionRef: {
      type: String,
      default: '',
      trim: true
    },
    advanceReceivedDate: {
      type: Date
    },
    paymentTerms: {
      type: String,
      default: '30% Advance with PO, 60% before dispatch, 10% after commissioning'
    },
    deliveryCommitmentDate: {
      type: Date,
      required: true
    },
    s3DocumentKey: {
      type: String,
      default: '',
      trim: true
    },
    s3DocumentUrl: {
      type: String,
      default: '',
      trim: true
    },
    pdfUrl: {
      type: String,
      default: '',
      trim: true
    },
    photos: [{
      type: String,
      trim: true
    }],
    status: {
      type: String,
      enum: ['RECEIVED', 'VERIFIED', 'PROJECT_CONVERTED', 'CANCELLED'],
      default: 'RECEIVED'
    },
    convertedProjectId: {
      type: String, // PRJ-XXXX reference in Project Setup Spine
      trim: true
    },
    convertedAt: {
      type: Date
    },
    notes: {
      type: String,
      default: '',
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

export const CustomerPo = mongoose.models.CustomerPo || mongoose.model('CustomerPo', CustomerPoSchema);
