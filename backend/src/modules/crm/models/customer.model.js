import mongoose from 'mongoose';

const ContactPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    designation: { type: String, default: '', trim: true },
    department: { type: String, default: '', trim: true },
    mobile: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    isPrimary: { type: Boolean, default: false }
  },
  { _id: true }
);

const AddressSchema = new mongoose.Schema(
  {
    attention: { type: String, default: '', trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, default: '', trim: true },
    landmark: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    stateCode: { type: String, default: '', trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  { _id: false }
);

const ShippingAddressSchema = new mongoose.Schema(
  {
    sameAsBilling: { type: Boolean, default: true },
    consigneeName: { type: String, default: '', trim: true },
    addressLine1: { type: String, default: '', trim: true },
    addressLine2: { type: String, default: '', trim: true },
    landmark: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    stateCode: { type: String, default: '', trim: true },
    pincode: { type: String, default: '', trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  { _id: false }
);

const BankDetailsSchema = new mongoose.Schema(
  {
    accountName: { type: String, default: '', trim: true },
    bankName: { type: String, default: '', trim: true },
    accountNumber: { type: String, default: '', trim: true },
    ifscCode: { type: String, default: '', trim: true, uppercase: true },
    branchName: { type: String, default: '', trim: true },
    swiftCode: { type: String, default: '', trim: true, uppercase: true },
    accountType: {
      type: String,
      enum: ['CURRENT', 'SAVINGS', 'CASH_CREDIT', 'OVERDRAFT'],
      default: 'CURRENT'
    }
  },
  { _id: false }
);

const CustomerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    displayName: {
      type: String,
      default: '',
      trim: true
    },
    customerType: {
      type: String,
      default: 'TRANSFORMER_OEM',
      trim: true,
      index: true
    },
    tier: {
      type: String,
      enum: ['TIER_1', 'TIER_2', 'TIER_3', 'STRATEGIC', 'STANDARD'],
      default: 'STANDARD'
    },
    industry: {
      type: String,
      default: 'Electrical & Power Machinery',
      trim: true
    },
    website: {
      type: String,
      default: '',
      trim: true
    },
    currency: {
      type: String,
      enum: ['INR', 'USD', 'EUR', 'GBP', 'JPY'],
      default: 'INR'
    },
    paymentTerms: {
      type: String,
      default: '30% Advance, 60% Against Proforma, 10% Post Commissioning',
      trim: true
    },
    creditPeriodDays: {
      type: Number,
      default: 30,
      min: 0
    },
    creditLimitINR: {
      type: Number,
      default: 0,
      min: 0
    },
    priceListDiscountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // Address Details
    billingAddress: {
      type: AddressSchema,
      required: true
    },
    shippingAddress: {
      type: ShippingAddressSchema,
      default: () => ({ sameAsBilling: true })
    },

    // Primary Contact Details
    primaryContact: {
      name: { type: String, required: true, trim: true },
      designation: { type: String, default: 'Purchase Manager', trim: true },
      department: { type: String, default: 'Procurement', trim: true },
      mobile: { type: String, required: true, trim: true },
      phone: { type: String, default: '', trim: true },
      email: { type: String, required: true, trim: true, lowercase: true }
    },

    // Additional Contact Persons
    additionalContacts: [ContactPersonSchema],

    // Tax & Compliance Details
    gstin: {
      type: String,
      default: '',
      trim: true,
      uppercase: true,
      index: true
    },
    pan: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    cin: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    tan: {
      type: String,
      default: '',
      trim: true,
      uppercase: true
    },
    msmeRegistrationNo: {
      type: String,
      default: '',
      trim: true
    },
    taxRegistrationType: {
      type: String,
      enum: ['REGULAR_GST', 'COMPOSITION', 'SEZ_DEVELOPER', 'DEEMED_EXPORT', 'OVERSEAS_EXPORT'],
      default: 'REGULAR_GST'
    },

    // Bank Details
    bankDetails: {
      type: BankDetailsSchema,
      default: () => ({})
    },

    // Operational Notes & Instructions
    notes: {
      type: String,
      default: '',
      trim: true
    },
    specialShippingInstructions: {
      type: String,
      default: '',
      trim: true
    },

    // Status
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'BLOCKED', 'PROSPECT'],
      default: 'ACTIVE',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    },

    // Universal Action Tracking (Directives)
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

// Pre-save hook: auto-extract PAN from GSTIN if PAN is blank
CustomerSchema.pre('save', function (next) {
  if (this.gstin && this.gstin.length === 15 && !this.pan) {
    this.pan = this.gstin.substring(2, 12).toUpperCase();
  }
  if (this.shippingAddress?.sameAsBilling && this.billingAddress) {
    this.shippingAddress.addressLine1 = this.billingAddress.addressLine1;
    this.shippingAddress.addressLine2 = this.billingAddress.addressLine2;
    this.shippingAddress.landmark = this.billingAddress.landmark;
    this.shippingAddress.city = this.billingAddress.city;
    this.shippingAddress.state = this.billingAddress.state;
    this.shippingAddress.stateCode = this.billingAddress.stateCode;
    this.shippingAddress.pincode = this.billingAddress.pincode;
    this.shippingAddress.country = this.billingAddress.country;
  }
  next();
});

export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export default Customer;
