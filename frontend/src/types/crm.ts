import { User } from './auth';

export type LeadStage =
  | 'NEW'
  | 'CONTACTED'
  | 'TECHNICAL_REVIEW'
  | 'QUOTATION_PREPARED'
  | 'QUOTE_PREPARED'
  | 'NEGOTIATION'
  | 'WON'
  | 'IN_PRODUCTION'
  | 'DISPATCHED'
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

export interface LeadFollowUpNote {
  _id?: string;
  id?: string;
  leadId?: string;
  stageAtNote: string;
  note: string;
  nextFollowUpDate?: string | null;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeadStageHistory {
  _id?: string;
  id?: string;
  leadId?: string;
  fromStage?: string | null;
  toStage: string;
  transitionNote: string;
  createdById?: string;
  createdByName?: string;
  changedByName?: string;
  changedAt?: string;
  createdAt: string;
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
  assignedTo?: Pick<User, '_id' | 'firstName' | 'lastName' | 'email'> | { _id: string; name?: string; email?: string };
  notes?: string;
  followUpNotes?: LeadFollowUpNote[];
  stageHistory?: LeadStageHistory[];
  convertedProjectId?: string;
  createdByName?: string;
  updatedByName?: string;
  createdBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  updatedBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  createdAt: string;
  updatedAt: string;
}

export type OrderAcceptanceStatus = 'DRAFT' | 'OA_SENT' | 'OA_ACKNOWLEDGED';

export type CustomerPoStatus =
  | 'RECEIVED'
  | 'OA_ISSUED'
  | 'WORK_ORDER_CREATED'
  | 'PROJECT_CONVERTED'
  | 'IN_PROGRESS'
  | 'DISPATCHED'
  | 'COMMISSIONED'
  | 'CANCELLED'
  | 'PENDING_ADVANCE'
  | 'ADVANCE_CLEARED'
  | 'COMMITTED_TO_PROJECT';

export const CUSTOMER_PO_LIFECYCLE_STAGES: {
  value: CustomerPoStatus;
  label: string;
  badgeClass: string;
}[] = [
  { value: 'RECEIVED', label: 'Received', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  { value: 'OA_ISSUED', label: 'OA Issued', badgeClass: 'bg-sky-50 text-sky-700 border-sky-300' },
  { value: 'WORK_ORDER_CREATED', label: 'Work Order Created', badgeClass: 'bg-purple-50 text-purple-700 border-purple-300' },
  { value: 'IN_PROGRESS', label: 'In Progress', badgeClass: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'DISPATCHED', label: 'Dispatched', badgeClass: 'bg-blue-50 text-blue-700 border-blue-300' },
  { value: 'COMMISSIONED', label: 'Commissioned', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  { value: 'CANCELLED', label: 'Cancelled', badgeClass: 'bg-red-50 text-red-700 border-red-300' }
];

export type PoItemQtyType = 'NUMERIC' | 'EXTRA' | 'INCLUDED';

export interface CustomerPoItem {
  _id?: string;
  id?: string;
  slNo?: number;
  itemCode?: string;
  modelCode?: string;
  description: string;
  specifications?: string;
  hsnCode?: string;
  qtyType?: PoItemQtyType;
  quantity: number;
  qtyLabel?: string;
  uom?: string;
  unitPrice: any;
  taxRate?: number;
  taxAmount?: any;
  totalAmount?: any;
  lineTotal?: any;
}

export interface OrderAcceptanceTerms {
  priceBasis: string;
  tax: string;
  delivery: string;
  paymentTerms: string;
  installationAndCommissioning: string;
  freight: string;
  packaging: string;
  insurance: string;
  validity: string;
  warranty: string;
  modeOfPayment: string;
}

export interface OrderAcceptanceBankDetails {
  accountName: string;
  bankName: string;
  branch: string;
  accountNo: string;
  ifscCode: string;
  gstNo: string;
}

export interface OrderAcceptanceSignatory {
  forCompany: string;
  signatoryName: string;
  signatoryPhone: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
}

export interface CustomerPo {
  _id: string;
  id?: string;
  poNumber: string;
  customerPoNumber?: string;
  poDate: string;
  orderAcceptanceNumber?: string;
  orderAcceptanceDate?: string;
  deliveryCommitmentDate?: string;
  deliveryDueDate?: string;
  customerId?: string;
  customerName: string;
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  leadId?: string | Lead;
  quotationId?: string;
  items?: CustomerPoItem[];
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';
  exchangeRate?: number;
  isLumpSumTotal?: boolean;
  subtotalAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalTaxAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalAmountINR?: number;
  technicalSpecifications?: string;
  termsAndConditions?: OrderAcceptanceTerms;
  bankDetails?: OrderAcceptanceBankDetails;
  signatory?: OrderAcceptanceSignatory;
  paymentTerms?: string;
  s3DocumentKey?: string;
  s3DocumentName?: string;
  presignedDownloadUrl?: string;
  pdfUrl?: string;
  photos?: string[];
  oaStatus?: OrderAcceptanceStatus;
  oaSentAt?: string;
  oaSentToEmail?: string;
  oaAcknowledgedAt?: string;
  status: any;
  convertedProjectId?: string;
  convertedToProjectId?: string;
  convertedAt?: string;
  notes?: string;
  createdByName?: string;
  updatedByName?: string;
  createdBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  updatedBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  createdAt: string;
  updatedAt: string;
}

export interface QuotationItem {
  itemCode?: string;
  modelCode?: string;
  modelName?: string;
  description?: string;
  hsnCode?: string;
  qtyType?: 'STANDARD' | 'INCLUDED' | 'EXTRA';
  quantity: number;
  qtyLabel?: string;
  uom?: string;
  unitPrice: number;
  totalPrice?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  specifications?: string;
}

export interface Quotation {
  _id: string;
  id?: string;
  quoteNumber: string;
  baseQuoteNumber?: string;
  revisionNumber?: number;
  revisionCode?: string;
  isLatestRevision?: boolean;
  parentQuotationId?: string;
  revisionNotes?: string;
  revisionCount?: number;
  revisions?: Quotation[];
  leadId: string | Lead;
  customerName: string;
  companyName: string;
  contactEmail?: string;
  contactPhone?: string;
  billingAddress?: string;
  shippingAddress?: string;
  gstin?: string;
  items: QuotationItem[];
  subtotalINR: number;
  taxAmountINR: number;
  grandTotalINR: number;
  subtotalAmount?: { amount: number; currency: string; baseAmountINR?: number };
  taxAmount?: { amount: number; currency: string; baseAmountINR?: number };
  totalAmount?: { amount: number; currency: string; baseAmountINR?: number };
  currency: string;
  exchangeRate: number;
  taxRatePercent?: number;
  gstCategory?: 'INTRA_STATE' | 'INTER_STATE';
  isGstIncluded?: boolean;
  packingType?: 'INCLUDED' | 'PERCENT' | 'FIXED';
  packingValue?: number;
  isPackingGstApplicable?: boolean;
  packingAmount?: { amount: number; currency: string; baseAmountINR?: number };
  transportationType?: 'BUYER_ACTUALS' | 'INCLUDED' | 'FIXED';
  transportationValue?: number;
  isTransportationGstApplicable?: boolean;
  transportationAmount?: { amount: number; currency: string; baseAmountINR?: number };
  paymentTerms: string;
  deliveryWeeks: number;
  validityDays?: number;
  validUntil?: string;
  warrantyMonths?: number;
  notes?: string;
  termsAndConditions?: any;
  bankDetails?: any;
  signatory?: any;
  companySnapshot?: Partial<CompanyBillingInfo>;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REVISED' | 'DECLINED' | 'SUPERSEDED' | 'PO_RECEIVED' | 'EXPIRED' | 'REJECTED';
  createdByName?: string;
  updatedByName?: string;
  createdBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  updatedBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalSpecification {
  parameter: string;
  value: string;
}

export interface ProductCategory {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  createdByName?: string;
  updatedByName?: string;
}

export interface MachineCatalogProduct {
  _id?: string;
  id?: string;
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
  createdByName?: string;
  updatedByName?: string;
  createdAt?: string;
  updatedAt?: string;
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
  logoIconUrl?: string;
  logoPlateUrl?: string;
  pdfHeaderBannerUrl?: string;
  pdfPhotos?: string[];
}

export interface CrmPrefixLockPolicy {
  customerPrefix: string;
  customerStartSeq: number;
  enquiryPrefix: string;
  enquiryStartSeq: number;
  quotationPrefix: string;
  quotationStartSeq: number;
  orderAcceptancePrefix: string;
  orderAcceptanceStartSeq: number;
  requireNoteOnStageChange: boolean;
  lockEnquiryOnPoReceived: boolean;
  lockQuotationOnPoReceived: boolean;
  lockCustomerPoOnProjectConverted: boolean;
  poEditDeleteTimeLimitMinutes?: number;
  allowEditSentQuotationWithoutRevision: boolean;
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
  prefixLockPolicy?: CrmPrefixLockPolicy;
  createdByName?: string;
  updatedByName?: string;
  updatedAt?: string;
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
  id?: string;
  customerCode: string;
  companyName: string;
  displayName?: string;
  customerType?: string;
  tier?: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'STRATEGIC' | 'STANDARD';
  industry?: string;
  website?: string;
  briefAboutCustomerBusiness?: string;
  anyOtherInformation?: string;
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
  createdByName?: string;
  updatedByName?: string;
  createdBy?: { _id: string; id?: string; name: string; email: string; department?: string };
  updatedBy?: { _id: string; id?: string; name: string; email: string; department?: string };
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


