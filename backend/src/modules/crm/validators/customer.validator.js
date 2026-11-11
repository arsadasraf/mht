import { z } from 'zod';

const customerTierEnum = z.enum(['TIER_1', 'TIER_2', 'TIER_3', 'STRATEGIC', 'STANDARD']);
const customerCurrencyEnum = z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']);
const taxRegistrationTypeEnum = z.enum([
  'REGULAR_GST',
  'COMPOSITION',
  'SEZ_DEVELOPER',
  'DEEMED_EXPORT',
  'OVERSEAS_EXPORT'
]);
const customerStatusEnum = z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED', 'PROSPECT']);
const bankAccountTypeEnum = z.enum(['CURRENT', 'SAVINGS', 'CASH_CREDIT', 'OVERDRAFT']);

const billingAddressSchema = z.object({
  attention: z.string().trim().optional().default(''),
  addressLine1: z
    .string({ required_error: 'Please enter the billing address (Line 1).' })
    .trim()
    .min(1, 'Please enter the billing address (Line 1).'),
  addressLine2: z.string().trim().optional().default(''),
  landmark: z.string().trim().optional().default(''),
  city: z
    .string({ required_error: 'Please enter the billing city.' })
    .trim()
    .min(1, 'Please enter the billing city.'),
  state: z
    .string({ required_error: 'Please enter the billing state.' })
    .trim()
    .min(1, 'Please enter the billing state.'),
  stateCode: z.string().trim().optional().default(''),
  pincode: z
    .string({ required_error: 'Please enter the billing PIN / postal code.' })
    .trim()
    .min(1, 'Please enter the billing PIN / postal code.'),
  country: z.string().trim().optional().default('India')
});

const shippingAddressSchema = z
  .object({
    sameAsBilling: z.boolean().optional().default(true),
    consigneeName: z.string().trim().optional().default(''),
    addressLine1: z.string().trim().optional().default(''),
    addressLine2: z.string().trim().optional().default(''),
    landmark: z.string().trim().optional().default(''),
    city: z.string().trim().optional().default(''),
    state: z.string().trim().optional().default(''),
    stateCode: z.string().trim().optional().default(''),
    pincode: z.string().trim().optional().default(''),
    country: z.string().trim().optional().default('India')
  })
  .optional()
  .default({ sameAsBilling: true });

const primaryContactSchema = z.object({
  name: z
    .string({ required_error: 'Please enter the primary contact person name.' })
    .trim()
    .min(1, 'Please enter the primary contact person name.'),
  designation: z.string().trim().optional().default('Head of Purchase'),
  department: z.string().trim().optional().default('Procurement'),
  mobile: z
    .string({ required_error: 'Please enter the primary contact mobile number.' })
    .trim()
    .min(1, 'Please enter the primary contact mobile number.'),
  phone: z.string().trim().optional().default(''),
  email: z
    .string({ required_error: 'Please enter the primary contact email address.' })
    .trim()
    .email('Please enter a valid email address for the primary contact.')
    .transform((val) => val.toLowerCase())
});

const additionalContactSchema = z.object({
  id: z.string().optional(),
  _id: z.string().optional(),
  name: z.string().trim().min(1, 'Additional contact name cannot be empty.'),
  designation: z.string().trim().optional().default(''),
  department: z.string().trim().optional().default(''),
  mobile: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
  email: z.string().trim().optional().default(''),
  isPrimary: z.boolean().optional().default(false)
});

const bankDetailsSchema = z
  .object({
    accountName: z.string().trim().optional().default(''),
    bankName: z.string().trim().optional().default(''),
    accountNumber: z.string().trim().optional().default(''),
    ifscCode: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    branchName: z.string().trim().optional().default(''),
    swiftCode: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    accountType: bankAccountTypeEnum.optional().default('CURRENT')
  })
  .optional()
  .default({});

export const createCustomerSchema = z.object({
  body: z.object({
    customerCode: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    companyName: z
      .string({ required_error: 'Please enter the company legal name.' })
      .trim()
      .min(2, 'Company name must be at least 2 characters.'),
    displayName: z.string().trim().optional().default(''),
    customerType: z.string().trim().optional().default('TRANSFORMER_OEM'),
    tier: customerTierEnum.optional().default('STANDARD'),
    industry: z.string().trim().optional().default('Electrical & Power Machinery'),
    website: z.string().trim().optional().default(''),

    // New Business Profile & Additional Information Fields
    briefAboutCustomerBusiness: z.string().trim().optional().default(''),
    anyOtherInformation: z.string().trim().optional().default(''),

    currency: customerCurrencyEnum.optional().default('INR'),
    paymentTerms: z
      .string()
      .trim()
      .optional()
      .default('30% Advance, 60% Against Proforma, 10% Post Commissioning'),
    creditPeriodDays: z.coerce.number().int().min(0).optional().default(30),
    creditLimitINR: z.coerce.number().min(0).optional().default(0),
    priceListDiscountPercent: z.coerce.number().min(0).max(100).optional().default(0),

    billingAddress: billingAddressSchema,
    shippingAddress: shippingAddressSchema,
    primaryContact: primaryContactSchema,
    additionalContacts: z.array(additionalContactSchema).optional().default([]),

    gstin: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    pan: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    cin: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    tan: z
      .string()
      .trim()
      .optional()
      .default('')
      .transform((val) => val.toUpperCase()),
    msmeRegistrationNo: z.string().trim().optional().default(''),
    taxRegistrationType: taxRegistrationTypeEnum.optional().default('REGULAR_GST'),

    bankDetails: bankDetailsSchema,

    notes: z.string().trim().optional().default(''),
    specialShippingInstructions: z.string().trim().optional().default(''),
    status: customerStatusEnum.optional().default('ACTIVE'),
    isActive: z.boolean().optional().default(true)
  })
});

export const updateCustomerSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid customer ID format.')
  }),
  body: z.object({
    customerCode: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val !== undefined ? val.toUpperCase() : undefined)),
    companyName: z.string().trim().min(2, 'Company name must be at least 2 characters.').optional(),
    displayName: z.string().trim().optional(),
    customerType: z.string().trim().optional(),
    tier: customerTierEnum.optional(),
    industry: z.string().trim().optional(),
    website: z.string().trim().optional(),

    // New Business Profile & Additional Information Fields
    briefAboutCustomerBusiness: z.string().trim().optional(),
    anyOtherInformation: z.string().trim().optional(),

    currency: customerCurrencyEnum.optional(),
    paymentTerms: z.string().trim().optional(),
    creditPeriodDays: z.coerce.number().int().min(0).optional(),
    creditLimitINR: z.coerce.number().min(0).optional(),
    priceListDiscountPercent: z.coerce.number().min(0).max(100).optional(),

    billingAddress: billingAddressSchema.optional(),
    shippingAddress: shippingAddressSchema.optional(),
    primaryContact: primaryContactSchema.optional(),
    additionalContacts: z.array(additionalContactSchema).optional(),

    gstin: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val !== undefined ? val.toUpperCase() : undefined)),
    pan: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val !== undefined ? val.toUpperCase() : undefined)),
    cin: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val !== undefined ? val.toUpperCase() : undefined)),
    tan: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val !== undefined ? val.toUpperCase() : undefined)),
    msmeRegistrationNo: z.string().trim().optional(),
    taxRegistrationType: taxRegistrationTypeEnum.optional(),

    bankDetails: bankDetailsSchema.optional(),

    notes: z.string().trim().optional(),
    specialShippingInstructions: z.string().trim().optional(),
    status: customerStatusEnum.optional(),
    isActive: z.boolean().optional()
  })
});

export const bulkImportCustomersSchema = z.object({
  body: z.object({
    customers: z
      .array(z.record(z.string(), z.any()))
      .min(1, 'Please provide at least one customer row to import.')
  })
});

