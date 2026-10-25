import { User } from './auth';

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'TECHNICAL_REVIEW'
  | 'QUOTATION_PREPARED'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST';

export type LeadPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface LeadProductLine {
  productId?: string;
  modelCode: string;
  modelName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  specifications?: string;
  customToolingNotes?: string;
}

export interface Lead {
  _id: string;
  id?: string;
  leadNumber: string;
  customerName: string;
  companyName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  country?: string;
  source: string;
  priority: LeadPriority;
  stage: LeadStage;
  products: LeadProductLine[];
  estimatedValueINR: number;
  assignedTo?: Pick<User, '_id' | 'firstName' | 'lastName' | 'email'>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerPoStatus =
  | 'PENDING_ADVANCE'
  | 'ADVANCE_CLEARED'
  | 'COMMITTED_TO_PROJECT'
  | 'CANCELLED';

export interface CustomerPoItem {
  _id?: string;
  itemCode?: string;
  modelCode?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: any;
  taxRate?: number;
  taxAmount?: any;
  lineTotal: any;
  specifications?: string;
}

export interface CustomerPo {
  _id: string;
  id?: string;
  poNumber?: string;
  customerPoNumber?: string;
  poDate: string;
  customerId?: string;
  customerName: string;
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  gstin?: string;
  leadId?: string | Lead;
  quotationId?: string;
  items?: CustomerPoItem[];
  subtotalAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalTaxAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalAmountINR?: number;
  advanceAmount?: { amount: number; currency: string; baseAmountINR?: number };
  advanceAmountINR?: number;
  advancePercentage?: number;
  advanceRequiredPercent?: number;
  isAdvanceReceived?: boolean;
  advanceReceived?: boolean;
  advanceTransactionRef?: string;
  advanceReceivedDate?: string;
  paymentTerms?: string;
  deliveryCommitmentDate?: string;
  deliveryDueDate?: string;
  s3DocumentKey?: string;
  s3DocumentName?: string;
  presignedDownloadUrl?: string;
  pdfUrl?: string;
  photos?: string[];
  status: any;
  convertedProjectId?: string;
  convertedToProjectId?: string;
  convertedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  modelCode: string;
  modelName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
}

export interface Quotation {
  _id: string;
  quoteNumber: string;
  leadId: string | Lead;
  customerName: string;
  companyName: string;
  items: QuotationItem[];
  subtotalINR: number;
  taxAmountINR: number;
  grandTotalINR: number;
  currency: string;
  exchangeRate: number;
  paymentTerms: string;
  deliveryWeeks: number;
  validityDays: number;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REVISED' | 'DECLINED';
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalSpecification {
  parameter: string;
  value: string;
}

export interface ProductCategory {
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface MachineCatalogProduct {
  _id?: string;
  modelCode: string;
  modelName: string;
  category: string;
  photos?: string[];
  photoUrl: string;
  catalogUrl?: string;
  catalogName?: string;
  description: string;
  price?: number;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP' | string;
  basePriceINR?: number;
  basePriceUSD?: number;
  basePriceEUR?: number;
  basePriceGBP?: number;
  technicalSpecifications?: TechnicalSpecification[];
  standardLeadWeeks?: number;
  wireRange?: string;
  maxRpm?: number;
  controllerType?: string;
  motorPower?: string;
  dimensions?: string;
  weightKg?: number;
  features?: string[];
  isActive?: boolean;
}

export interface CompanyBillingInfo {
  companyName: string;
  tagline: string;
  worksAddress: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  pan: string;
  bankName: string;
  bankBranch: string;
  accountNumber: string;
  ifscCode: string;
  swiftCode: string;
  authorizedSignatory: string;
  standardTerms: string;
}

export interface LeadSourceCredential {
  name: string;
  slug: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    glusrKey?: string;
    mobileNumber?: string;
    profileId?: string;
    webhookUrl?: string;
    webhookSecret?: string;
    syncFrequencyMinutes?: number;
    syncStatus?: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    autoSyncEnabled?: boolean;
  };
}

export interface CrmMasters {
  categories?: ProductCategory[];
  machines: MachineCatalogProduct[];
  sources: LeadSourceCredential[];
  lossReasons: string[];
  paymentTerms: string[];
  exchangeRates: Record<string, number>;
  companyBillingInfo: CompanyBillingInfo;
}

export interface CustomerContactPerson {
  _id?: string;
  name: string;
  designation?: string;
  department?: string;
  mobile: string;
  phone?: string;
  email: string;
  isPrimary?: boolean;
}

export interface CustomerAddress {
  attention?: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  stateCode?: string;
  pincode: string;
  country: string;
}

export interface CustomerShippingAddress {
  sameAsBilling?: boolean;
  consigneeName?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  country?: string;
}

export interface CustomerBankDetails {
  accountName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  branchName?: string;
  swiftCode?: string;
  accountType?: 'CURRENT' | 'SAVINGS' | 'CASH_CREDIT' | 'OVERDRAFT';
}

export interface Customer {
  _id: string;
  customerCode: string;
  companyName: string;
  displayName?: string;
  customerType?: string;
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'STRATEGIC' | 'STANDARD';
  industry?: string;
  website?: string;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';
  paymentTerms?: string;
  creditPeriodDays?: number;
  creditLimitINR?: number;
  priceListDiscountPercent?: number;

  billingAddress: CustomerAddress;
  shippingAddress?: CustomerShippingAddress;

  primaryContact: {
    name: string;
    designation?: string;
    department?: string;
    mobile: string;
    phone?: string;
    email: string;
  };

  additionalContacts?: CustomerContactPerson[];

  gstin?: string;
  pan?: string;
  cin?: string;
  tan?: string;
  msmeRegistrationNo?: string;
  taxRegistrationType?: 'REGULAR_GST' | 'COMPOSITION' | 'SEZ_DEVELOPER' | 'DEEMED_EXPORT' | 'OVERSEAS_EXPORT';

  bankDetails?: CustomerBankDetails;

  notes?: string;
  specialShippingInstructions?: string;

  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'PROSPECT';
  isActive?: boolean;
  createdBy?: { _id: string; name: string; email: string };
  updatedBy?: { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface GetCustomersParams {
  search?: string;
  status?: string;
  customerType?: string;
  tier?: string;
  state?: string;
  country?: string;
  currency?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}


