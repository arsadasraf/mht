import mongoose from 'mongoose';

const ProductCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true }
  },
  { _id: true, timestamps: true }
);

const MachinePresetSchema = new mongoose.Schema(
  {
    modelCode: { type: String, required: true, uppercase: true, trim: true },
    modelName: { type: String, required: true, trim: true },
    category: {
      type: String,
      default: 'General',
      trim: true
    },
    photos: [{ type: String, trim: true }],
    photoUrl: {
      type: String,
      default: '/branding/mh_icon.png',
      trim: true
    },
    catalogUrl: {
      type: String,
      default: '',
      trim: true
    },
    catalogName: {
      type: String,
      default: '',
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    price: { type: Number, default: 0, min: 0 },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP'],
      default: 'INR'
    },
    basePriceINR: { type: Number, default: 0, min: 0 },
    basePriceUSD: { type: Number, default: 0, min: 0 },
    basePriceEUR: { type: Number, default: 0, min: 0 },
    basePriceGBP: { type: Number, default: 0, min: 0 },
    technicalSpecifications: [
      {
        parameter: { type: String, trim: true, default: '' },
        value: { type: String, trim: true, default: '' }
      }
    ],
    standardLeadWeeks: { type: Number, default: 6, min: 1 },
    wireRange: { type: String, default: '', trim: true },
    maxRpm: { type: Number, default: 3000 },
    controllerType: { type: String, default: '', trim: true },
    motorPower: { type: String, default: '', trim: true },
    dimensions: { type: String, default: '', trim: true },
    weightKg: { type: Number, default: 0 },
    features: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true }
  },
  { _id: true, timestamps: true }
);

const LeadSourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, uppercase: true, trim: true },
    credentials: {
      apiKey: { type: String, default: '', trim: true },
      apiSecret: { type: String, default: '', trim: true },
      glusrKey: { type: String, default: '', trim: true },
      mobileNumber: { type: String, default: '', trim: true },
      profileId: { type: String, default: '', trim: true },
      webhookUrl: { type: String, default: '', trim: true },
      webhookSecret: { type: String, default: '', trim: true },
      syncFrequencyMinutes: { type: Number, default: 15 },
      lastSyncedAt: { type: Date },
      syncStatus: {
        type: String,
        enum: ['IDLE', 'CONNECTED', 'SYNCING', 'ERROR'],
        default: 'IDLE'
      },
      autoSyncEnabled: { type: Boolean, default: false }
    },
    isActive: { type: Boolean, default: true }
  },
  { _id: true }
);

const LossReasonSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true, trim: true },
    category: { type: String, default: 'COMMERCIAL', trim: true },
    isActive: { type: Boolean, default: true }
  },
  { _id: true }
);

const PaymentTermSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    advancePercent: { type: Number, default: 30, min: 0, max: 100 },
    dispatchPercent: { type: Number, default: 60, min: 0, max: 100 },
    commissioningPercent: { type: Number, default: 10, min: 0, max: 100 },
    warrantyMonths: { type: Number, default: 12 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true }
  },
  { _id: true }
);

const CompanyBillingInfoSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'Machine House - Winding Technologies',
      trim: true
    },
    tagline: {
      type: String,
      default: 'House of Innovations.....',
      trim: true
    },
    worksAddress: {
      type: String,
      default: 'No. 3, Muniyappa Building, Hommadevanahalli, Gottigere Post, Bengaluru - 560083, Karnataka, India',
      trim: true
    },
    phone: {
      type: String,
      default: '+91 8047640100 / +91 9845012345',
      trim: true
    },
    email: {
      type: String,
      default: 'sales@machinehousetechnologies.in',
      trim: true
    },
    website: {
      type: String,
      default: 'www.machinehousetechnologies.in',
      trim: true
    },
    gstin: {
      type: String,
      default: '29AAACM1234F1Z5',
      trim: true
    },
    pan: {
      type: String,
      default: 'AAACM1234F',
      trim: true
    },
    bankName: {
      type: String,
      default: 'State Bank of India',
      trim: true
    },
    bankBranch: {
      type: String,
      default: 'Peenya Industrial Estate Branch, Bengaluru',
      trim: true
    },
    accountNumber: {
      type: String,
      default: '39482019283',
      trim: true
    },
    ifscCode: {
      type: String,
      default: 'SBIN0040182',
      trim: true
    },
    swiftCode: {
      type: String,
      default: 'SBININBB482',
      trim: true
    },
    authorizedSignatory: {
      type: String,
      default: 'For Machine House Technologies — Authorized Signatory',
      trim: true
    },
    standardTerms: {
      type: String,
      default: '1. Prices are Ex-Works Bengaluru.\n2. Taxes: GST 18% extra as applicable.\n3. Payment: 30% advance with PO, 60% against proforma invoice before dispatch, 10% after site commissioning or 30 days.\n4. Delivery: 4-8 weeks from date of technically & commercially clear order and advance receipt.\n5. Warranty: 12 months from the date of dispatch against manufacturing defects.\n6. Jurisdiction: Subject to Bengaluru judicial jurisdiction only.'
    }
  },
  { _id: false }
);

const CrmMasterSchema = new mongoose.Schema(
  {
    categories: [ProductCategorySchema],
    machines: [MachinePresetSchema],
    sources: [LeadSourceSchema],
    lossReasons: [LossReasonSchema],
    paymentTerms: [PaymentTermSchema],
    exchangeRates: {
      USD: { type: Number, default: 85.0 },
      EUR: { type: Number, default: 92.0 },
      GBP: { type: Number, default: 110.0 },
      JPY: { type: Number, default: 0.58 }
    },
    companyBillingInfo: {
      type: CompanyBillingInfoSchema,
      default: () => ({})
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

export const CrmMaster = mongoose.models.CrmMaster || mongoose.model('CrmMaster', CrmMasterSchema);
