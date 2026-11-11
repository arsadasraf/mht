import { z } from 'zod';

const poItemSchema = z.object({
  id: z.string().optional(),
  slNo: z.coerce.number().int().min(1).optional(),
  itemCode: z.string().trim().optional().default(''),
  modelCode: z.string().trim().optional().default(''),
  description: z.string().trim().min(1, 'Item description is required'),
  specifications: z.string().optional().default(''),
  hsnCode: z.string().trim().optional().default('8479'),
  qtyType: z.enum(['NUMERIC', 'EXTRA', 'INCLUDED']).optional().default('NUMERIC'),
  quantity: z.coerce.number().min(0).optional().default(1),
  qtyLabel: z.string().trim().optional().default('1'),
  uom: z.string().trim().optional().default('No.'),
  unitPrice: z.union([
    z.coerce.number().min(0),
    z.object({
      amount: z.coerce.number().min(0).default(0),
      currency: z.string().optional(),
      exchangeRate: z.coerce.number().optional(),
      baseAmountINR: z.coerce.number().optional()
    })
  ]).optional().default(0),
  taxRate: z.coerce.number().min(0).max(100).optional().default(18),
  taxAmount: z.union([
    z.coerce.number().min(0),
    z.object({
      amount: z.coerce.number().min(0).default(0)
    })
  ]).optional().default(0),
  totalAmount: z.union([
    z.coerce.number().min(0),
    z.object({
      amount: z.coerce.number().min(0).default(0)
    })
  ]).optional().default(0),
  lineTotal: z.union([
    z.coerce.number().min(0),
    z.object({
      amount: z.coerce.number().min(0).default(0)
    })
  ]).optional()
});

const termsAndConditionsSchema = z.object({
  priceBasis: z.string().optional().default('Ex-Works Bangalore'),
  tax: z.string().optional().default('GST - 18% Extra'),
  delivery: z.string().optional().default('8 weeks from the date of P.O. Along with advance.'),
  paymentTerms: z.string().optional().default('50% Advance along with purchase order\n50% Before dispatch'),
  installationAndCommissioning: z.string().optional().default('Inclusive'),
  freight: z.string().optional().default('To buyer'),
  packaging: z.string().optional().default('Inclusive'),
  insurance: z.string().optional().default('To buyer'),
  validity: z.string().optional().default('30 Days'),
  warranty: z.string().optional().default('12 Months from the date of installation'),
  modeOfPayment: z.string().optional().default('Online')
}).optional();

const bankDetailsSchema = z.object({
  accountName: z.string().optional().default('Machine House Technologies'),
  bankName: z.string().optional().default('HDFC'),
  branch: z.string().optional().default('Hulimavu Branch'),
  accountNo: z.string().optional().default('50200017432572'),
  ifscCode: z.string().optional().default('HDFC0004117'),
  gstNo: z.string().optional().default('29AENPR8339C1ZZ')
}).optional();

const signatorySchema = z.object({
  forCompany: z.string().optional().default('Machine House Technologies'),
  signatoryName: z.string().optional().default('Roshan M P'),
  signatoryPhone: z.string().optional().default('9845444962'),
  companyAddress: z.string().optional().default('#3 Muniyappa Building, Hommadevanahalli, Kempegowda Road, Basavanapura, Gottigere Post, Bangalore – 560083'),
  companyPhone: z.string().optional().default('+91 98454 44962'),
  companyEmail: z.string().optional().default('marketing@machinehousetechnologies.com'),
  companyWebsite: z.string().optional().default('www.machinehousewindingtechnologies.com')
}).optional();

export const createCustomerPoSchema = z.object({
  body: z.object({
    poNumber: z.string().trim().min(1, 'Purchase Order Number is required'),
    poDate: z.string().min(1, 'Purchase Order Date is required'),
    orderAcceptanceNumber: z.string().trim().optional(),
    orderAcceptanceDate: z.string().optional(),
    deliveryCommitmentDate: z.string().optional().nullable(),

    customerId: z.string().optional().nullable(),
    quotationId: z.string().optional().nullable(),
    leadId: z.string().optional().nullable(),

    companyName: z.string().trim().min(1, 'Customer / Company Name is required'),
    customerName: z.string().trim().optional().default(''),
    contactEmail: z.string().trim().optional().default(''),
    contactPhone: z.string().trim().optional().default(''),
    gstin: z.string().trim().optional().default(''),
    billingAddress: z.string().trim().optional().default(''),
    shippingAddress: z.string().trim().optional().default(''),

    items: z.array(poItemSchema).min(1, 'At least one machine or line item is required'),

    currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'JPY']).optional().default('INR'),
    exchangeRate: z.coerce.number().positive().optional().default(1.0),
    isLumpSumTotal: z.boolean().optional().default(false),
    subtotalAmount: z.any().optional(),
    totalTaxAmount: z.any().optional(),
    totalAmount: z.any().optional(),

    technicalSpecifications: z.string().optional().default(''),
    termsAndConditions: termsAndConditionsSchema,
    bankDetails: bankDetailsSchema,
    signatory: signatorySchema,

    paymentTerms: z.string().optional().default('50% Advance along with purchase order, 50% Before dispatch'),
    s3DocumentKey: z.string().optional().default(''),
    pdfUrl: z.string().optional().default(''),
    photos: z.array(z.string()).optional().default([]),
    notes: z.string().optional().default(''),
    status: z
      .enum([
        'RECEIVED',
        'OA_ISSUED',
        'WORK_ORDER_CREATED',
        'PROJECT_CONVERTED',
        'IN_PROGRESS',
        'DISPATCHED',
        'COMMISSIONED',
        'CANCELLED'
      ])
      .optional()
      .default('RECEIVED'),
    oaStatus: z.enum(['DRAFT', 'OA_SENT', 'OA_ACKNOWLEDGED']).optional().default('DRAFT')
  })
});

export const updateCustomerPoSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: createCustomerPoSchema.shape.body.partial()
});

export const updateOrderAcceptanceStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: z.object({
    oaStatus: z.enum(['DRAFT', 'OA_SENT', 'OA_ACKNOWLEDGED']),
    oaSentToEmail: z.string().optional().default(''),
    notes: z.string().optional().default('')
  })
});

