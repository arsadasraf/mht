import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { getPresignedDownloadUrl, getS3Client } from '../../../config/s3.config.js';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import {
  ensureDefaultStageMasters,
  ensureProjectSetupConfig,
  DEFAULT_PROJECT_SETUP_POLICY
} from '../../project-setup/controllers/stageMaster.controller.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DEFAULT_TERMS_AND_CONDITIONS = {
  priceBasis: 'Ex-Works Bangalore',
  tax: 'GST - 18% Extra',
  delivery: '8 weeks from the date of P.O. Along with advance.',
  paymentTerms: '50% Advance along with purchase order\n50% Before dispatch',
  installationAndCommissioning: 'Inclusive',
  freight: 'To buyer',
  packaging: 'Inclusive',
  insurance: 'To buyer',
  validity: '30 Days',
  warranty: '12 Months from the date of installation',
  modeOfPayment: 'Online'
};

export const DEFAULT_MH_BANK_DETAILS = {
  accountName: 'Machine House Technologies',
  bankName: 'HDFC',
  branch: 'Hulimavu Branch',
  accountNo: '50200017432572',
  ifscCode: 'HDFC0004117',
  gstNo: '29AENPR8339C1ZZ'
};

export const DEFAULT_MH_SIGNATORY = {
  forCompany: 'Machine House Technologies',
  signatoryName: 'Roshan M P',
  signatoryPhone: '9845444962',
  companyAddress:
    '#3 Muniyappa Building, Hommadevanahalli, Kempegowda Road, Basavanapura, Gottigere Post, Bangalore – 560083',
  companyPhone: '+91 98454 44962',
  companyEmail: 'marketing@machinehousetechnologies.com',
  companyWebsite: 'www.machinehousewindingtechnologies.com'
};

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

const customerPoInclude = {
  items: {
    orderBy: { slNo: 'asc' }
  },
  customer: {
    select: {
      id: true,
      customerCode: true,
      companyName: true,
      gstin: true,
      primaryContact: true,
      billingAddress: true,
      shippingAddress: true
    }
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  }
};

/**
 * Generates next Order Acceptance Number based on Master prefix + 4-digit date (DDMM) + last 4 digits of PO (e.g. OA-0811-1048)
 */
async function generateNextOrderAcceptanceNumber(poNumber = '') {
  try {
    const config = await prisma.crmMasterConfig.findUnique({
      where: { configKey: 'GLOBAL_CRM_CONFIG' }
    });
    const prefix = (config?.prefixLockPolicy?.orderAcceptancePrefix || 'OA').trim().replace(/-+$/, '');

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const date4Digits = `${dd}${mm}`;

    const numericOnly = String(poNumber || '').replace(/\D/g, '');
    const po4Digits = (numericOnly.length >= 4 ? numericOnly.slice(-4) : numericOnly.padStart(4, '0')) || '1001';

    const baseOaNumber = `${prefix}-${date4Digits}-${po4Digits}`;

    const existing = await prisma.customerPo.findFirst({
      where: { orderAcceptanceNumber: baseOaNumber }
    });

    if (!existing) {
      return baseOaNumber;
    }

    let counter = 1;
    while (counter < 100) {
      const candidate = `${baseOaNumber}-${counter}`;
      const found = await prisma.customerPo.findFirst({
        where: { orderAcceptanceNumber: candidate }
      });
      if (!found) return candidate;
      counter++;
    }
    return `${baseOaNumber}-${Date.now().toString().slice(-4)}`;
  } catch (err) {
    const now = new Date();
    const ddmm = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const digits = String(poNumber || '').replace(/\D/g, '').slice(-4).padStart(4, '0') || '1001';
    return `OA-${ddmm}-${digits}`;
  }
}

/**
 * Formats a Prisma CustomerPo record for 1:1 frontend compatibility
 */
const formatCustomerPo = async (po) => {
  if (!po) return null;

  const createdByName = po.createdBy
    ? `${po.createdBy.firstName} ${po.createdBy.lastName}`.trim()
    : po.createdByName || 'System';
  const updatedByName = po.updatedBy
    ? `${po.updatedBy.firstName} ${po.updatedBy.lastName}`.trim()
    : po.updatedByName || createdByName;

  let presignedDownloadUrl = po.pdfUrl && !po.pdfUrl.startsWith('blob:') ? po.pdfUrl : '';
  if (po.s3DocumentKey) {
    try {
      const client = getS3Client();
      if (client) {
        // Validate object actually exists in S3 before dispensing signed URL to avoid NoSuchKey XML errors
        const headCmd = new HeadObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME || 'aws-mht',
          Key: po.s3DocumentKey
        });
        await client.send(headCmd);
        presignedDownloadUrl = await getPresignedDownloadUrl(po.s3DocumentKey, 900);
      } else {
        presignedDownloadUrl = po.pdfUrl && !po.pdfUrl.startsWith('blob:') ? po.pdfUrl : '';
      }
    } catch {
      // If object does not exist in S3 (e.g. upload never finished or was deleted), safely fallback to po.pdfUrl
      presignedDownloadUrl = po.pdfUrl && !po.pdfUrl.startsWith('blob:') ? po.pdfUrl : '';
    }
  }

  return {
    ...po,
    _id: po.id,
    customerPoNumber: po.poNumber,
    presignedDownloadUrl,
    createdByName,
    updatedByName,
    termsAndConditions: {
      ...DEFAULT_TERMS_AND_CONDITIONS,
      ...(typeof po.termsAndConditions === 'object' && po.termsAndConditions ? po.termsAndConditions : {})
    },
    bankDetails: {
      ...DEFAULT_MH_BANK_DETAILS,
      ...(typeof po.bankDetails === 'object' && po.bankDetails ? po.bankDetails : {})
    },
    signatory: {
      ...DEFAULT_MH_SIGNATORY,
      ...(typeof po.signatory === 'object' && po.signatory ? po.signatory : {})
    },
    items: (po.items || []).map((it) => ({
      ...it,
      _id: it.id,
      lineTotal: it.totalAmount
    })),
    createdBy: po.createdBy
      ? {
          _id: po.createdBy.id,
          id: po.createdBy.id,
          name: `${po.createdBy.firstName} ${po.createdBy.lastName}`.trim(),
          email: po.createdBy.email,
          department: po.createdBy.department
        }
      : { _id: po.createdById || '', id: po.createdById || '', name: createdByName, email: '' },
    updatedBy: po.updatedBy
      ? {
          _id: po.updatedBy.id,
          id: po.updatedBy.id,
          name: `${po.updatedBy.firstName} ${po.updatedBy.lastName}`.trim(),
          email: po.updatedBy.email,
          department: po.updatedBy.department
        }
      : { _id: po.updatedById || '', id: po.updatedById || '', name: updatedByName, email: '' }
  };
};

/**
 * Normalizes line items and computes financials
 */
const normalizeItemsAndTotals = (body) => {
  const currency = body.currency || body.totalAmount?.currency || 'INR';
  const exchangeRate = Number(body.exchangeRate || body.totalAmount?.exchangeRate || 1.0);
  const isLumpSumTotal = Boolean(body.isLumpSumTotal);

  let calculatedSubtotal = 0;
  let calculatedTax = 0;

  const formattedItems = (body.items || []).map((it, idx) => {
    const qtyType = ['NUMERIC', 'EXTRA', 'INCLUDED'].includes(it.qtyType)
      ? it.qtyType
      : String(it.qtyLabel || '').toUpperCase() === 'EXTRA'
      ? 'EXTRA'
      : 'NUMERIC';

    const quantity = qtyType === 'EXTRA' ? 0 : Math.max(0, Number(it.quantity ?? 1));
    const qtyLabel =
      qtyType === 'EXTRA'
        ? 'Extra'
        : qtyType === 'INCLUDED'
        ? 'Included'
        : String(it.qtyLabel || quantity || '1');

    const uom = qtyType === 'EXTRA' ? it.uom || '' : it.uom || 'No.';

    const rawUnitPrice =
      typeof it.unitPrice === 'object' && it.unitPrice !== null
        ? Number(it.unitPrice.amount || 0)
        : Number(it.unitPrice || 0);

    const taxRate = Number(it.taxRate !== undefined ? it.taxRate : 18);

    const rawTotalAmount =
      typeof it.totalAmount === 'object' && it.totalAmount !== null
        ? Number(it.totalAmount.amount || 0)
        : typeof it.lineTotal === 'object' && it.lineTotal !== null
        ? Number(it.lineTotal.amount || 0)
        : Number(it.totalAmount ?? it.lineTotal ?? 0);

    const baseLinePrice = qtyType === 'NUMERIC' ? Math.round(quantity * rawUnitPrice) : 0;
    const taxAmount =
      typeof it.taxAmount === 'object' && it.taxAmount !== null
        ? Number(it.taxAmount.amount || 0)
        : Math.round((baseLinePrice * taxRate) / 100);

    const totalAmount =
      rawTotalAmount > 0 && baseLinePrice === 0 ? rawTotalAmount : baseLinePrice + taxAmount;

    if (qtyType === 'NUMERIC') {
      calculatedSubtotal += baseLinePrice > 0 ? baseLinePrice : rawTotalAmount;
      calculatedTax += taxAmount;
    }

    return {
      slNo: Number(it.slNo || idx + 1),
      itemCode: (it.itemCode || `ITEM-${idx + 1}`).trim(),
      modelCode: (it.modelCode || '').trim(),
      description: (it.description || 'Machine / Part').trim(),
      specifications: (it.specifications || '').trim(),
      hsnCode: (it.hsnCode || '8479').trim(),
      qtyType,
      quantity,
      qtyLabel,
      uom,
      unitPrice: rawUnitPrice,
      taxRate,
      taxAmount,
      totalAmount
    };
  });

  const rawSubtotal =
    typeof body.subtotalAmount === 'object' && body.subtotalAmount !== null
      ? Number(body.subtotalAmount.amount ?? calculatedSubtotal)
      : Number(body.subtotalAmount ?? calculatedSubtotal);

  const rawTax =
    typeof body.totalTaxAmount === 'object' && body.totalTaxAmount !== null
      ? Number(body.totalTaxAmount.amount ?? calculatedTax)
      : Number(body.totalTaxAmount ?? calculatedTax);

  const rawGrandTotal =
    typeof body.totalAmount === 'object' && body.totalAmount !== null
      ? Number(body.totalAmount.amount ?? rawSubtotal + rawTax)
      : Number(body.totalAmount ?? rawSubtotal + rawTax);

  const finalSubtotal = isLumpSumTotal && rawSubtotal > 0 ? rawSubtotal : calculatedSubtotal || rawSubtotal;
  const finalTax = isLumpSumTotal && rawTax >= 0 ? rawTax : calculatedTax || rawTax;
  const finalGrandTotal =
    isLumpSumTotal && rawGrandTotal > 0 ? rawGrandTotal : finalSubtotal + finalTax || rawGrandTotal;

  return {
    currency,
    exchangeRate,
    isLumpSumTotal,
    formattedItems,
    subtotalAmount: {
      currency,
      amount: finalSubtotal,
      exchangeRate,
      baseAmountINR: Math.round(finalSubtotal * exchangeRate)
    },
    totalTaxAmount: {
      currency,
      amount: finalTax,
      exchangeRate,
      baseAmountINR: Math.round(finalTax * exchangeRate)
    },
    totalAmount: {
      currency,
      amount: finalGrandTotal,
      exchangeRate,
      baseAmountINR: Math.round(finalGrandTotal * exchangeRate)
    }
  };
};

/**
 * GET /api/v1/crm/customer-pos
 */
export const getCustomerPos = async (req, res, next) => {
  try {
    const { status, oaStatus, search, fromDate, toDate, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      if (status === 'WORK_ORDER_CREATED') {
        where.status = { in: ['WORK_ORDER_CREATED', 'PROJECT_CONVERTED'] };
      } else {
        where.status = status;
      }
    }
    if (oaStatus && oaStatus !== 'ALL') {
      where.oaStatus = oaStatus;
    }
    if (fromDate && toDate) {
      where.poDate = {
        gte: new Date(fromDate),
        lte: new Date(toDate)
      };
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { poNumber: { contains: s, mode: 'insensitive' } },
        { orderAcceptanceNumber: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { billingAddress: { contains: s, mode: 'insensitive' } },
        { gstin: { contains: s, mode: 'insensitive' } },
        { convertedProjectId: { contains: s, mode: 'insensitive' } }
      ];
    }

    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 50);

    const [total, rawPos] = await Promise.all([
      prisma.customerPo.count({ where }),
      prisma.customerPo.findMany({
        where,
        include: customerPoInclude,
        orderBy: [{ poDate: 'desc' }, { createdAt: 'desc' }],
        skip: (p - 1) * l,
        take: l
      })
    ]);

    const customerPos = await Promise.all(rawPos.map(formatCustomerPo));

    res.status(200).json({
      success: true,
      total,
      page: p,
      customerPos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/crm/customer-pos/:id
 */
export const getCustomerPoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let po = null;

    if (UUID_REGEX.test(id)) {
      po = await prisma.customerPo.findUnique({
        where: { id },
        include: customerPoInclude
      });
    } else {
      po = await prisma.customerPo.findFirst({
        where: {
          OR: [
            { poNumber: { equals: id, mode: 'insensitive' } },
            { orderAcceptanceNumber: { equals: id, mode: 'insensitive' } }
          ]
        },
        include: customerPoInclude
      });
    }

    if (!po) {
      return res.status(404).json({
        success: false,
        message: 'Customer Purchase Order not found.'
      });
    }

    res.status(200).json({
      success: true,
      customerPo: await formatCustomerPo(po)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/customer-pos
 */
export const createCustomerPo = async (req, res, next) => {
  try {
    const body = req.body;
    const cleanPoNumber = body.poNumber.trim().toUpperCase();

    const existingPo = await prisma.customerPo.findUnique({
      where: { poNumber: cleanPoNumber }
    });
    if (existingPo) {
      return res.status(400).json({
        success: false,
        message: `Purchase Order "${cleanPoNumber}" is already recorded in the system.`
      });
    }

    let orderAcceptanceNumber = null;
    let orderAcceptanceDate = null;
    if (body.orderAcceptanceNumber?.trim()) {
      orderAcceptanceNumber = body.orderAcceptanceNumber.trim().toUpperCase();
      const existingOa = await prisma.customerPo.findUnique({
        where: { orderAcceptanceNumber }
      });
      if (existingOa) {
        orderAcceptanceNumber = await generateNextOrderAcceptanceNumber();
      }
      orderAcceptanceDate = body.orderAcceptanceDate ? new Date(body.orderAcceptanceDate) : new Date();
    }

    const {
      currency,
      exchangeRate,
      isLumpSumTotal,
      formattedItems,
      subtotalAmount,
      totalTaxAmount,
      totalAmount
    } = normalizeItemsAndTotals(body);

    const termsAndConditions = {
      ...DEFAULT_TERMS_AND_CONDITIONS,
      ...(body.termsAndConditions || {})
    };
    if (body.paymentTerms && !body.termsAndConditions?.paymentTerms) {
      termsAndConditions.paymentTerms = body.paymentTerms;
    }

    const bankDetails = {
      ...DEFAULT_MH_BANK_DETAILS,
      ...(body.bankDetails || {})
    };

    const signatory = {
      ...DEFAULT_MH_SIGNATORY,
      ...(body.signatory || {})
    };

    const actorName = getActorName(req.user);

    const newPo = await prisma.customerPo.create({
      data: {
        poNumber: cleanPoNumber,
        poDate: new Date(body.poDate),
        orderAcceptanceNumber,
        orderAcceptanceDate,
        deliveryCommitmentDate: body.deliveryCommitmentDate ? new Date(body.deliveryCommitmentDate) : null,
        status: body.status || (orderAcceptanceNumber ? 'OA_ISSUED' : 'RECEIVED'),
        customerId: body.customerId && UUID_REGEX.test(body.customerId) ? body.customerId : null,
        quotationId: body.quotationId || null,
        leadId: body.leadId || null,
        companyName: body.companyName.trim(),
        customerName: (body.customerName || body.companyName).trim(),
        contactEmail: (body.contactEmail || '').trim(),
        contactPhone: (body.contactPhone || '').trim(),
        gstin: (body.gstin || '').trim().toUpperCase(),
        billingAddress: (body.billingAddress || '').trim(),
        shippingAddress: (body.shippingAddress || body.billingAddress || '').trim(),
        currency,
        exchangeRate,
        isLumpSumTotal,
        subtotalAmount,
        totalTaxAmount,
        totalAmount,
        technicalSpecifications: (body.technicalSpecifications || '').trim(),
        termsAndConditions,
        bankDetails,
        signatory,
        paymentTerms: termsAndConditions.paymentTerms || body.paymentTerms || '',
        s3DocumentKey: body.s3DocumentKey || '',
        pdfUrl: body.pdfUrl || '',
        photos: Array.isArray(body.photos) ? body.photos.filter(Boolean) : [],
        notes: (body.notes || '').trim(),
        oaStatus: body.oaStatus || 'DRAFT',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName,
        items: {
          create: formattedItems
        }
      },
      include: customerPoInclude
    });

    const formatted = await formatCustomerPo(newPo);

    await logAuditEvent({
      req,
      action: 'CUSTOMER_PO_CREATED',
      module: 'crm',
      entityId: newPo.id,
      entityType: 'CustomerPo',
      afterData: {
        poNumber: newPo.poNumber,
        orderAcceptanceNumber: newPo.orderAcceptanceNumber,
        companyName: newPo.companyName,
        totalAmount: newPo.totalAmount
      },
      notes: `Customer PO ${newPo.poNumber} (${newPo.orderAcceptanceNumber}) created for ${newPo.companyName}.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Customer PO "${newPo.poNumber}" and Order Acceptance "${newPo.orderAcceptanceNumber}" saved successfully.`,
      customerPo: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/crm/customer-pos/:id
 */
export const updateCustomerPo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingPo = await prisma.customerPo.findUnique({
      where: { id },
      include: customerPoInclude
    });

    if (!existingPo) {
      return res.status(404).json({
        success: false,
        message: 'Customer Purchase Order not found.'
      });
    }

    if (existingPo.status === 'PROJECT_CONVERTED' || existingPo.status === 'WORK_ORDER_CREATED') {
      return res.status(400).json({
        success: false,
        message: 'Just a heads up: this Customer PO has already been converted into a live Project and cannot be modified.'
      });
    }

    // Check Time Lock Window from Master Policy
    const crmConfig = await prisma.crmMasterConfig.findUnique({
      where: { configKey: 'GLOBAL_CRM_CONFIG' }
    });
    const prefixPolicy = crmConfig?.prefixLockPolicy || {};
    const limitMinutes = Number(prefixPolicy.poEditDeleteTimeLimitMinutes) || 120;
    const createdAtTime = new Date(existingPo.createdAt).getTime();
    const isTimeExpired = Date.now() - createdAtTime > limitMinutes * 60 * 1000;
    const isOnlyStatusUpdate = Object.keys(req.body).every((k) => k === 'status' || k === 'id');

    if (isTimeExpired && !isOnlyStatusUpdate) {
      return res.status(403).json({
        success: false,
        message: `Just a heads up: the ${limitMinutes}-minute edit window for this Customer PO has expired. It is now locked as per company policy.`
      });
    }

    const body = req.body;
    const mergedBody = {
      ...existingPo,
      ...body,
      items: body.items ?? existingPo.items
    };

    if (body.poNumber && body.poNumber.trim().toUpperCase() !== existingPo.poNumber) {
      const cleanPo = body.poNumber.trim().toUpperCase();
      const dup = await prisma.customerPo.findFirst({
        where: { poNumber: cleanPo, id: { not: id } }
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Purchase Order "${cleanPo}" is already used by another order.`
        });
      }
      mergedBody.poNumber = cleanPo;
    }

    const {
      currency,
      exchangeRate,
      isLumpSumTotal,
      formattedItems,
      subtotalAmount,
      totalTaxAmount,
      totalAmount
    } = normalizeItemsAndTotals(mergedBody);

    const termsAndConditions = {
      ...DEFAULT_TERMS_AND_CONDITIONS,
      ...(typeof existingPo.termsAndConditions === 'object' ? existingPo.termsAndConditions : {}),
      ...(body.termsAndConditions || {})
    };

    const bankDetails = {
      ...DEFAULT_MH_BANK_DETAILS,
      ...(typeof existingPo.bankDetails === 'object' ? existingPo.bankDetails : {}),
      ...(body.bankDetails || {})
    };

    const signatory = {
      ...DEFAULT_MH_SIGNATORY,
      ...(typeof existingPo.signatory === 'object' ? existingPo.signatory : {}),
      ...(body.signatory || {})
    };

    const actorName = getActorName(req.user);

    const updatedPo = await prisma.customerPo.update({
      where: { id },
      data: {
        poNumber: mergedBody.poNumber,
        poDate: body.poDate ? new Date(body.poDate) : existingPo.poDate,
        orderAcceptanceDate: body.orderAcceptanceDate
          ? new Date(body.orderAcceptanceDate)
          : existingPo.orderAcceptanceDate,
        deliveryCommitmentDate:
          body.deliveryCommitmentDate !== undefined
            ? body.deliveryCommitmentDate
              ? new Date(body.deliveryCommitmentDate)
              : null
            : existingPo.deliveryCommitmentDate,
        customerId:
          body.customerId !== undefined
            ? body.customerId && UUID_REGEX.test(body.customerId)
              ? body.customerId
              : null
            : existingPo.customerId,
        companyName: body.companyName ? body.companyName.trim() : existingPo.companyName,
        customerName:
          body.customerName !== undefined ? body.customerName.trim() : existingPo.customerName,
        contactEmail:
          body.contactEmail !== undefined ? body.contactEmail.trim() : existingPo.contactEmail,
        contactPhone:
          body.contactPhone !== undefined ? body.contactPhone.trim() : existingPo.contactPhone,
        gstin: body.gstin !== undefined ? body.gstin.trim().toUpperCase() : existingPo.gstin,
        billingAddress:
          body.billingAddress !== undefined ? body.billingAddress.trim() : existingPo.billingAddress,
        shippingAddress:
          body.shippingAddress !== undefined
            ? body.shippingAddress.trim()
            : existingPo.shippingAddress,
        currency,
        exchangeRate,
        isLumpSumTotal,
        subtotalAmount,
        totalTaxAmount,
        totalAmount,
        technicalSpecifications:
          body.technicalSpecifications !== undefined
            ? body.technicalSpecifications.trim()
            : existingPo.technicalSpecifications,
        termsAndConditions,
        bankDetails,
        signatory,
        paymentTerms: termsAndConditions.paymentTerms || existingPo.paymentTerms,
        s3DocumentKey: body.s3DocumentKey ?? existingPo.s3DocumentKey,
        pdfUrl: body.pdfUrl ?? existingPo.pdfUrl,
        photos: Array.isArray(body.photos) ? body.photos.filter(Boolean) : existingPo.photos,
        notes: body.notes !== undefined ? body.notes.trim() : existingPo.notes,
        orderAcceptanceNumber:
          body.orderAcceptanceNumber !== undefined
            ? body.orderAcceptanceNumber
              ? body.orderAcceptanceNumber.trim().toUpperCase()
              : null
            : existingPo.orderAcceptanceNumber,
        status: body.status ?? existingPo.status,
        oaStatus: body.oaStatus ?? existingPo.oaStatus,
        updatedById: req.user?.id || null,
        updatedByName: actorName,
        ...(Array.isArray(body.items)
          ? {
              items: {
                deleteMany: {},
                create: formattedItems
              }
            }
          : {})
      },
      include: customerPoInclude
    });

    const formatted = await formatCustomerPo(updatedPo);

    await logAuditEvent({
      req,
      action: 'CUSTOMER_PO_UPDATED',
      module: 'crm',
      entityId: updatedPo.id,
      entityType: 'CustomerPo',
      beforeData: { poNumber: existingPo.poNumber, companyName: existingPo.companyName },
      afterData: { poNumber: updatedPo.poNumber, companyName: updatedPo.companyName },
      notes: `Customer PO ${updatedPo.poNumber} (${updatedPo.orderAcceptanceNumber}) updated.`
    });

    res.status(200).json({
      success: true,
      message: `Great! Customer PO "${updatedPo.poNumber}" and Order Acceptance updated successfully.`,
      customerPo: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/customer-pos/:id/order-acceptance
 * Updates Order Acceptance Status (DRAFT -> OA_SENT -> OA_ACKNOWLEDGED)
 */
export const updateOrderAcceptanceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { oaStatus, oaSentToEmail, notes } = req.body;

    const existingPo = await prisma.customerPo.findUnique({
      where: { id },
      include: customerPoInclude
    });

    if (!existingPo) {
      return res.status(404).json({
        success: false,
        message: 'Customer Purchase Order not found.'
      });
    }

    const actorName = getActorName(req.user);
    const now = new Date();

    const updateData = {
      oaStatus,
      updatedById: req.user?.id || null,
      updatedByName: actorName
    };

    if (oaStatus === 'OA_SENT') {
      updateData.oaSentAt = now;
      updateData.oaSentToEmail = (oaSentToEmail || existingPo.contactEmail || '').trim();
      if (existingPo.status === 'RECEIVED') {
        updateData.status = 'OA_ISSUED';
      }
    } else if (oaStatus === 'OA_ACKNOWLEDGED') {
      updateData.oaAcknowledgedAt = now;
      if (!existingPo.oaSentAt) updateData.oaSentAt = now;
      if (existingPo.status === 'RECEIVED') {
        updateData.status = 'OA_ISSUED';
      }
    }

    if (notes) {
      updateData.notes = existingPo.notes ? `${existingPo.notes}\n${notes}` : notes;
    }

    const updatedPo = await prisma.customerPo.update({
      where: { id },
      data: updateData,
      include: customerPoInclude
    });

    const formatted = await formatCustomerPo(updatedPo);

    await logAuditEvent({
      req,
      action: `ORDER_ACCEPTANCE_${oaStatus}`,
      module: 'crm',
      entityId: updatedPo.id,
      entityType: 'CustomerPo',
      beforeData: { oaStatus: existingPo.oaStatus },
      afterData: { oaStatus: updatedPo.oaStatus, oaSentToEmail: updatedPo.oaSentToEmail },
      notes: `Order Acceptance ${updatedPo.orderAcceptanceNumber} marked as ${oaStatus}.`
    });

    const friendlyMsg =
      oaStatus === 'OA_SENT'
        ? `All set! Order Acceptance "${updatedPo.orderAcceptanceNumber}" marked as sent${
            updatedPo.oaSentToEmail ? ` to ${updatedPo.oaSentToEmail}` : ''
          }.`
        : oaStatus === 'OA_ACKNOWLEDGED'
        ? `Great! Order Acceptance "${updatedPo.orderAcceptanceNumber}" marked as acknowledged by the customer.`
        : `Order Acceptance "${updatedPo.orderAcceptanceNumber}" status updated to Draft.`;

    res.status(200).json({
      success: true,
      message: friendlyMsg,
      customerPo: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/customer-pos/:id/generate-oa
 * Generate formal Order Acceptance with committed delivery date & OA number
 */
export const generateOrderAcceptance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryCommitmentDate, orderAcceptanceDate, orderAcceptanceNumber, notes } = req.body;

    const existingPo = await prisma.customerPo.findUnique({
      where: { id },
      include: customerPoInclude
    });

    if (!existingPo) {
      return res.status(404).json({
        success: false,
        message: 'Customer Purchase Order not found.'
      });
    }

    let finalOaNumber = orderAcceptanceNumber?.trim().toUpperCase();
    if (!finalOaNumber) {
      finalOaNumber =
        existingPo.orderAcceptanceNumber || (await generateNextOrderAcceptanceNumber(existingPo.poNumber));
    } else if (finalOaNumber !== existingPo.orderAcceptanceNumber) {
      const dup = await prisma.customerPo.findFirst({
        where: { orderAcceptanceNumber: finalOaNumber, id: { not: id } }
      });
      if (dup) {
        finalOaNumber = await generateNextOrderAcceptanceNumber(existingPo.poNumber);
      }
    }

    const updatedPo = await prisma.customerPo.update({
      where: { id },
      data: {
        orderAcceptanceNumber: finalOaNumber,
        orderAcceptanceDate: orderAcceptanceDate ? new Date(orderAcceptanceDate) : new Date(),
        deliveryCommitmentDate: deliveryCommitmentDate
          ? new Date(deliveryCommitmentDate)
          : existingPo.deliveryCommitmentDate,
        notes: typeof notes === 'string' ? notes : existingPo.notes,
        status: 'OA_ISSUED',
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user)
      },
      include: customerPoInclude
    });

    await logAuditEvent({
      req,
      action: 'ORDER_ACCEPTANCE_GENERATED',
      module: 'crm',
      entityId: updatedPo.id,
      entityType: 'CustomerPo',
      afterData: {
        poNumber: updatedPo.poNumber,
        orderAcceptanceNumber: updatedPo.orderAcceptanceNumber,
        deliveryCommitmentDate: updatedPo.deliveryCommitmentDate,
        status: updatedPo.status
      }
    });

    res.status(200).json({
      success: true,
      message: `All set! Order Acceptance "${finalOaNumber}" generated successfully.`,
      customerPo: await formatCustomerPo(updatedPo)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/crm/customer-pos/:id
 */
export const deleteCustomerPo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingPo = await prisma.customerPo.findUnique({ where: { id } });

    if (!existingPo) {
      return res.status(404).json({
        success: false,
        message: 'Customer Purchase Order not found.'
      });
    }

    if (existingPo.status === 'PROJECT_CONVERTED' || existingPo.status === 'WORK_ORDER_CREATED') {
      return res.status(400).json({
        success: false,
        message: 'Just a heads up: converted Project POs cannot be deleted.'
      });
    }

    // Check Time Lock Window from Master Policy
    const crmConfig = await prisma.crmMasterConfig.findUnique({
      where: { configKey: 'GLOBAL_CRM_CONFIG' }
    });
    const prefixPolicy = crmConfig?.prefixLockPolicy || {};
    const limitMinutes = Number(prefixPolicy.poEditDeleteTimeLimitMinutes) || 120;
    const createdAtTime = new Date(existingPo.createdAt).getTime();
    const isTimeExpired = Date.now() - createdAtTime > limitMinutes * 60 * 1000;

    if (isTimeExpired) {
      return res.status(403).json({
        success: false,
        message: `Just a heads up: the ${limitMinutes}-minute delete window for this Customer PO has expired. It can no longer be deleted as per company policy.`
      });
    }

    await prisma.customerPo.delete({ where: { id } });

    await logAuditEvent({
      req,
      action: 'CUSTOMER_PO_DELETED',
      module: 'crm',
      entityId: id,
      entityType: 'CustomerPo',
      beforeData: {
        poNumber: existingPo.poNumber,
        orderAcceptanceNumber: existingPo.orderAcceptanceNumber,
        companyName: existingPo.companyName
      },
      notes: `Customer PO ${existingPo.poNumber} (${existingPo.orderAcceptanceNumber}) deleted.`
    });

    res.status(200).json({
      success: true,
      message: `Customer PO "${existingPo.poNumber}" removed successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/customer-pos/:id/convert-project
 * 1-Click Handover: Convert Customer PO to Master Project Setup (PRJ-YYYY-XXXX / WO-YYYY-XXXX)
 */
export const convertCustomerPoToProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerPo = await prisma.customerPo.findUnique({
      where: { id },
      include: customerPoInclude
    });

    if (!customerPo) {
      return res.status(404).json({
        success: false,
        message: 'Customer Purchase Order not found.'
      });
    }

    if ((customerPo.status === 'PROJECT_CONVERTED' || customerPo.status === 'WORK_ORDER_CREATED') && customerPo.convertedProjectId) {
      return res.status(400).json({
        success: false,
        message: `This PO is already assigned to Project ID "${customerPo.convertedProjectId}".`
      });
    }

    await ensureDefaultStageMasters(req.user);
    const config = await ensureProjectSetupConfig(req.user);
    const policy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const year = new Date().getFullYear();
    const projectCount = await prisma.project.count();
    const seq = (Number(policy.projectStartSeq) || 1001) + projectCount;
    const projectId = `${(policy.projectPrefix || 'PRJ').toUpperCase()}-${year}-${seq}`;
    const workOrderNumber = `${(policy.workOrderPrefix || 'WO').toUpperCase()}-${year}-${seq}`;

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';

    const poModels = (customerPo.items || [])
      .filter((it) => it.qtyType !== 'EXTRA')
      .map((it) => it.modelCode || it.description)
      .filter(Boolean)
      .join(', ');
    const machineModel = poModels || 'Precision Winding Machine';
    const startDate = new Date();
    const targetDispatchDate = customerPo.deliveryCommitmentDate
      ? new Date(customerPo.deliveryCommitmentDate)
      : new Date(startDate.getTime() + 56 * 24 * 60 * 60 * 1000);

    const createdProject = await prisma.project.create({
      data: {
        projectId,
        workOrderNumber,
        projectName: `${customerPo.companyName} — ${machineModel}`,
        customerName: customerPo.companyName || customerPo.customerName,
        machineModel,
        customerPoId: customerPo.id,
        customerPoNumber: customerPo.poNumber,
        quotationRef: customerPo.quotationId || '',
        contractValue: customerPo.totalAmount || { currency: 'INR', amount: 0, exchangeRate: 1, baseAmountINR: 0 },
        startDate,
        targetDispatchDate,
        plantLocation: 'Main Works - Unit 1',
        projectManagerId: req.user?.id || null,
        projectManagerName: actorName,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    const stageTemplates = await prisma.stageMaster.findMany({
      where: { isActive: true },
      orderBy: { defaultOrder: 'asc' }
    });
    const allSubStageMasters = await prisma.departmentSubStageMaster.findMany({
      where: { isActive: true },
      orderBy: { defaultOrder: 'asc' }
    });

    for (let idx = 0; idx < stageTemplates.length; idx++) {
      const s = stageTemplates[idx];
      const offsetDays = Number(s.standardDaysOffset ?? (idx + 1) * 10);
      const targetDate = new Date(startDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);
      const matchingSubs = allSubStageMasters.filter((ssm) => ssm.parentStageCode === s.stageCode);

      await prisma.milestone.create({
        data: {
          projectRefId: createdProject.id,
          projectId: createdProject.projectId,
          title: s.stageName,
          stage: s.stageCode,
          stageCode: s.stageCode,
          departmentModule: s.departmentModule || 'project-setup',
          order: s.defaultOrder || idx + 1,
          leadRole: s.leadRole || 'Project Manager',
          weightPercent: s.weightPercent || 10,
          completionPercent: 0,
          baselineDate: targetDate,
          projectedDate: targetDate,
          status: idx === 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
          remarks: [
            {
              text: `Stage initialized from Customer PO ${customerPo.poNumber} (${customerPo.orderAcceptanceNumber}).`,
              authorName: actorName,
              authorRole: actorRole,
              authorId: req.user?.id || null,
              createdAt: new Date().toISOString()
            }
          ],
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName,
          subStages:
            matchingSubs.length > 0
              ? {
                  create: matchingSubs.map((ssm, sIdx) => ({
                    projectId: createdProject.projectId,
                    departmentModule: ssm.departmentModule,
                    subStageCode: ssm.subStageCode,
                    title: ssm.subStageName,
                    order: ssm.defaultOrder || sIdx + 1,
                    baselineStartDate: startDate,
                    targetEndDate: targetDate,
                    status: 'NOT_STARTED',
                    completionPercent: 0,
                    remarks: [],
                    createdById: req.user?.id || null,
                    createdByName: actorName,
                    updatedById: req.user?.id || null,
                    updatedByName: actorName
                  }))
                }
              : undefined
        }
      });
    }

    const updatedPo = await prisma.customerPo.update({
      where: { id },
      data: {
        status: 'WORK_ORDER_CREATED',
        convertedProjectId: projectId,
        convertedAt: new Date(),
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: customerPoInclude
    });

    await logAuditEvent({
      req,
      action: 'CUSTOMER_PO_CONVERTED_TO_PROJECT',
      module: 'crm',
      entityId: updatedPo.id,
      entityType: 'CustomerPo',
      afterData: { projectId, workOrderNumber },
      notes: `Customer PO ${updatedPo.poNumber} converted to Master Project ${projectId} (${workOrderNumber}) for ${updatedPo.companyName}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Customer PO converted to Project Setup: ${projectId} (${workOrderNumber}).`,
      projectId,
      workOrderNumber,
      project: createdProject,
      customerPo: await formatCustomerPo(updatedPo)
    });
  } catch (error) {
    next(error);
  }
};
