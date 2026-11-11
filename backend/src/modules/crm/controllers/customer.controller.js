import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

const customerInclude = {
  additionalContacts: {
    orderBy: { createdAt: 'asc' }
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  }
};

/**
 * Formats a Prisma Customer record to include `_id` and `createdBy`/`updatedBy` display names.
 */
const formatCustomer = (customer) => {
  if (!customer) return null;
  const createdByName =
    customer.createdBy
      ? `${customer.createdBy.firstName} ${customer.createdBy.lastName}`.trim()
      : customer.createdByName || 'System';
  const updatedByName =
    customer.updatedBy
      ? `${customer.updatedBy.firstName} ${customer.updatedBy.lastName}`.trim()
      : customer.updatedByName || createdByName;

  return {
    ...customer,
    _id: customer.id,
    createdByName,
    updatedByName,
    additionalContacts: (customer.additionalContacts || []).map((c) => ({
      ...c,
      _id: c.id
    })),
    createdBy: customer.createdBy
      ? {
          _id: customer.createdBy.id,
          id: customer.createdBy.id,
          name: `${customer.createdBy.firstName} ${customer.createdBy.lastName}`.trim(),
          email: customer.createdBy.email,
          department: customer.createdBy.department
        }
      : customer.createdByName
      ? {
          _id: customer.createdById || '',
          id: customer.createdById || '',
          name: customer.createdByName,
          email: ''
        }
      : null,
    updatedBy: customer.updatedBy
      ? {
          _id: customer.updatedBy.id,
          id: customer.updatedBy.id,
          name: `${customer.updatedBy.firstName} ${customer.updatedBy.lastName}`.trim(),
          email: customer.updatedBy.email,
          department: customer.updatedBy.department
        }
      : customer.updatedByName
      ? {
          _id: customer.updatedById || '',
          id: customer.updatedById || '',
          name: customer.updatedByName,
          email: ''
        }
      : null
  };
};

/**
 * Normalizes GSTIN -> PAN & State Code and syncs Shipping Address when `sameAsBilling` is true.
 */
const normalizeCustomerPayload = (data) => {
  const normalized = { ...data };

  if (normalized.gstin) {
    normalized.gstin = normalized.gstin.trim().toUpperCase();
    if (normalized.gstin.length === 15 && !normalized.pan) {
      normalized.pan = normalized.gstin.substring(2, 12).toUpperCase();
    }
    if (normalized.gstin.length >= 2 && normalized.billingAddress && !normalized.billingAddress.stateCode) {
      normalized.billingAddress = {
        ...normalized.billingAddress,
        stateCode: normalized.gstin.substring(0, 2)
      };
    }
  }

  if (normalized.pan) normalized.pan = normalized.pan.trim().toUpperCase();
  if (normalized.cin) normalized.cin = normalized.cin.trim().toUpperCase();
  if (normalized.tan) normalized.tan = normalized.tan.trim().toUpperCase();

  if (normalized.shippingAddress?.sameAsBilling && normalized.billingAddress) {
    normalized.shippingAddress = {
      ...normalized.shippingAddress,
      sameAsBilling: true,
      addressLine1: normalized.billingAddress.addressLine1 || '',
      addressLine2: normalized.billingAddress.addressLine2 || '',
      landmark: normalized.billingAddress.landmark || '',
      city: normalized.billingAddress.city || '',
      state: normalized.billingAddress.state || '',
      stateCode: normalized.billingAddress.stateCode || '',
      pincode: normalized.billingAddress.pincode || '',
      country: normalized.billingAddress.country || 'India'
    };
  }

  return normalized;
};

/**
 * Generates next sequential Customer Code (e.g. CUST-1001, CUST-1002)
 */
async function generateNextCustomerCode() {
  const allCodes = await prisma.customer.findMany({
    where: {
      customerCode: { startsWith: 'CUST-' }
    },
    select: { customerCode: true }
  });

  let maxNum = 1000;
  for (const row of allCodes) {
    const match = row.customerCode?.match(/^CUST-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `CUST-${maxNum + 1}`;
}

/**
 * Get all customers with search, filter, and sorting
 * GET /api/v1/crm/customers
 */
export const getCustomers = async (req, res, next) => {
  try {
    const {
      search,
      status,
      customerType,
      tier,
      currency,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page,
      limit
    } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (customerType && customerType !== 'ALL') {
      where.customerType = customerType;
    }
    if (tier && tier !== 'ALL') {
      where.tier = tier;
    }
    if (currency && currency !== 'ALL') {
      where.currency = currency;
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { customerCode: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { displayName: { contains: s, mode: 'insensitive' } },
        { gstin: { contains: s, mode: 'insensitive' } },
        { pan: { contains: s, mode: 'insensitive' } },
        { briefAboutCustomerBusiness: { contains: s, mode: 'insensitive' } },
        { anyOtherInformation: { contains: s, mode: 'insensitive' } }
      ];
    }

    const allowedSortFields = ['createdAt', 'updatedAt', 'customerCode', 'companyName', 'gstin', 'currency'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy = { [safeSortBy]: sortOrder === 'asc' ? 'asc' : 'desc' };

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.max(1, parseInt(limit, 10));

      const [total, rawCustomers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          include: customerInclude,
          orderBy,
          skip: (p - 1) * l,
          take: l
        })
      ]);

      return res.status(200).json({
        success: true,
        customers: rawCustomers.map(formatCustomer),
        total,
        page: p,
        pages: Math.ceil(total / l)
      });
    }

    const [total, rawCustomers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: customerInclude,
        orderBy
      })
    ]);

    res.status(200).json({
      success: true,
      customers: rawCustomers.map(formatCustomer),
      total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer by ID (UUID) or Customer Code (CUST-XXXX)
 * GET /api/v1/crm/customers/:id
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let customer;

    if (UUID_REGEX.test(id)) {
      customer = await prisma.customer.findUnique({
        where: { id },
        include: customerInclude
      });
    } else {
      customer = await prisma.customer.findUnique({
        where: { customerCode: id.toUpperCase() },
        include: customerInclude
      });
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    res.status(200).json({
      success: true,
      customer: formatCustomer(customer)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new customer
 * POST /api/v1/crm/customers
 */
export const createCustomer = async (req, res, next) => {
  try {
    const data = normalizeCustomerPayload(req.body);

    if (!data.customerCode || !data.customerCode.trim()) {
      data.customerCode = await generateNextCustomerCode();
    } else {
      data.customerCode = data.customerCode.trim().toUpperCase();
    }

    // Check duplicate code
    const existingCode = await prisma.customer.findUnique({
      where: { customerCode: data.customerCode }
    });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Customer code "${data.customerCode}" is already in use. Please enter a unique code.`
      });
    }

    // Check duplicate Company Name (case-insensitive)
    const existingName = await prisma.customer.findFirst({
      where: {
        companyName: { equals: data.companyName.trim(), mode: 'insensitive' }
      }
    });
    if (existingName) {
      return res.status(400).json({
        success: false,
        message: `A customer named "${data.companyName.trim()}" already exists in the directory.`
      });
    }

    const contactsToCreate = (data.additionalContacts || [])
      .filter((c) => c && c.name && c.name.trim())
      .map((c) => ({
        name: c.name.trim(),
        designation: c.designation?.trim() || '',
        department: c.department?.trim() || '',
        mobile: c.mobile?.trim() || '',
        phone: c.phone?.trim() || '',
        email: c.email?.trim().toLowerCase() || '',
        isPrimary: Boolean(c.isPrimary)
      }));

    const newCustomer = await prisma.customer.create({
      data: {
        customerCode: data.customerCode,
        companyName: data.companyName.trim(),
        displayName: data.displayName || '',
        customerType: data.customerType || 'TRANSFORMER_OEM',
        tier: data.tier || 'STANDARD',
        industry: data.industry || 'Electrical & Power Machinery',
        website: data.website || '',
        briefAboutCustomerBusiness: data.briefAboutCustomerBusiness || '',
        anyOtherInformation: data.anyOtherInformation || '',
        currency: data.currency || 'INR',
        paymentTerms:
          data.paymentTerms || '30% Advance, 60% Against Proforma, 10% Post Commissioning',
        creditPeriodDays: Number(data.creditPeriodDays) || 30,
        creditLimitINR: Number(data.creditLimitINR) || 0,
        priceListDiscountPercent: Number(data.priceListDiscountPercent) || 0,
        billingAddress: data.billingAddress,
        shippingAddress: data.shippingAddress || { sameAsBilling: true },
        primaryContact: data.primaryContact,
        bankDetails: data.bankDetails || {},
        gstin: data.gstin || '',
        pan: data.pan || '',
        cin: data.cin || '',
        tan: data.tan || '',
        msmeRegistrationNo: data.msmeRegistrationNo || '',
        taxRegistrationType: data.taxRegistrationType || 'REGULAR_GST',
        notes: data.notes || '',
        specialShippingInstructions: data.specialShippingInstructions || '',
        status: data.status || 'ACTIVE',
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        createdById: req.user?.id || null,
        createdByName: getActorName(req.user),
        updatedById: req.user?.id || null,
        updatedByName: getActorName(req.user),
        additionalContacts: {
          create: contactsToCreate
        }
      },
      include: customerInclude
    });

    const formatted = formatCustomer(newCustomer);

    await logAuditEvent({
      req,
      action: 'CUSTOMER_CREATED',
      module: 'crm',
      entityId: newCustomer.id,
      entityType: 'Customer',
      afterData: {
        customerCode: newCustomer.customerCode,
        companyName: newCustomer.companyName,
        gstin: newCustomer.gstin
      },
      notes: `Customer ${newCustomer.companyName} (${newCustomer.customerCode}) created.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Customer "${newCustomer.companyName}" (${newCustomer.customerCode}) saved successfully.`,
      customer: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing customer
 * PUT /api/v1/crm/customers/:id
 */
export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: customerInclude
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    const data = normalizeCustomerPayload({
      ...existingCustomer,
      ...req.body,
      billingAddress: req.body.billingAddress ?? existingCustomer.billingAddress,
      shippingAddress: req.body.shippingAddress ?? existingCustomer.shippingAddress,
      primaryContact: req.body.primaryContact ?? existingCustomer.primaryContact,
      bankDetails: req.body.bankDetails ?? existingCustomer.bankDetails
    });

    // Check duplicate customerCode if changed
    if (data.customerCode && data.customerCode.toUpperCase() !== existingCustomer.customerCode) {
      const newCode = data.customerCode.trim().toUpperCase();
      const duplicateCode = await prisma.customer.findFirst({
        where: {
          customerCode: newCode,
          id: { not: id }
        }
      });
      if (duplicateCode) {
        return res.status(400).json({
          success: false,
          message: `Customer code "${newCode}" is already used by another customer.`
        });
      }
      data.customerCode = newCode;
    }

    // Check duplicate companyName if changed
    if (
      data.companyName &&
      data.companyName.trim().toLowerCase() !== existingCustomer.companyName.toLowerCase()
    ) {
      const duplicateName = await prisma.customer.findFirst({
        where: {
          companyName: { equals: data.companyName.trim(), mode: 'insensitive' },
          id: { not: id }
        }
      });
      if (duplicateName) {
        return res.status(400).json({
          success: false,
          message: `A customer named "${data.companyName.trim()}" already exists.`
        });
      }
    }

    const updatePayload = {
      customerCode: data.customerCode,
      companyName: data.companyName?.trim(),
      displayName: data.displayName ?? existingCustomer.displayName,
      customerType: data.customerType ?? existingCustomer.customerType,
      tier: data.tier ?? existingCustomer.tier,
      industry: data.industry ?? existingCustomer.industry,
      website: data.website ?? existingCustomer.website,
      briefAboutCustomerBusiness:
        req.body.briefAboutCustomerBusiness !== undefined
          ? req.body.briefAboutCustomerBusiness
          : existingCustomer.briefAboutCustomerBusiness,
      anyOtherInformation:
        req.body.anyOtherInformation !== undefined
          ? req.body.anyOtherInformation
          : existingCustomer.anyOtherInformation,
      currency: data.currency ?? existingCustomer.currency,
      paymentTerms: data.paymentTerms ?? existingCustomer.paymentTerms,
      creditPeriodDays:
        data.creditPeriodDays !== undefined
          ? Number(data.creditPeriodDays)
          : existingCustomer.creditPeriodDays,
      creditLimitINR:
        data.creditLimitINR !== undefined
          ? Number(data.creditLimitINR)
          : existingCustomer.creditLimitINR,
      priceListDiscountPercent:
        data.priceListDiscountPercent !== undefined
          ? Number(data.priceListDiscountPercent)
          : existingCustomer.priceListDiscountPercent,
      billingAddress: data.billingAddress,
      shippingAddress: data.shippingAddress,
      primaryContact: data.primaryContact,
      bankDetails: data.bankDetails,
      gstin: data.gstin ?? existingCustomer.gstin,
      pan: data.pan ?? existingCustomer.pan,
      cin: data.cin ?? existingCustomer.cin,
      tan: data.tan ?? existingCustomer.tan,
      msmeRegistrationNo: data.msmeRegistrationNo ?? existingCustomer.msmeRegistrationNo,
      taxRegistrationType: data.taxRegistrationType ?? existingCustomer.taxRegistrationType,
      notes: data.notes ?? existingCustomer.notes,
      specialShippingInstructions:
        data.specialShippingInstructions ?? existingCustomer.specialShippingInstructions,
      status: data.status ?? existingCustomer.status,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : existingCustomer.isActive,
      updatedById: req.user?.id || null,
      updatedByName: getActorName(req.user)
    };

    if (Array.isArray(req.body.additionalContacts)) {
      const contactsToCreate = req.body.additionalContacts
        .filter((c) => c && c.name && c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          designation: c.designation?.trim() || '',
          department: c.department?.trim() || '',
          mobile: c.mobile?.trim() || '',
          phone: c.phone?.trim() || '',
          email: c.email?.trim().toLowerCase() || '',
          isPrimary: Boolean(c.isPrimary)
        }));

      updatePayload.additionalContacts = {
        deleteMany: {},
        create: contactsToCreate
      };
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updatePayload,
      include: customerInclude
    });

    const formatted = formatCustomer(updatedCustomer);

    await logAuditEvent({
      req,
      action: 'CUSTOMER_UPDATED',
      module: 'crm',
      entityId: updatedCustomer.id,
      entityType: 'Customer',
      beforeData: {
        customerCode: existingCustomer.customerCode,
        companyName: existingCustomer.companyName
      },
      afterData: {
        customerCode: updatedCustomer.customerCode,
        companyName: updatedCustomer.companyName
      },
      notes: `Customer "${updatedCustomer.companyName}" updated.`
    });

    res.status(200).json({
      success: true,
      message: `Great! Customer "${updatedCustomer.companyName}" updated successfully.`,
      customer: formatted
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a customer
 * DELETE /api/v1/crm/customers/:id
 */
export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({ where: { id } });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    await prisma.customer.delete({ where: { id } });

    await logAuditEvent({
      req,
      action: 'CUSTOMER_DELETED',
      module: 'crm',
      entityId: id,
      entityType: 'Customer',
      beforeData: { customerCode: customer.customerCode, companyName: customer.companyName },
      notes: `Customer "${customer.companyName}" (${customer.customerCode}) deleted.`
    });

    res.status(200).json({
      success: true,
      message: `Customer "${customer.companyName}" (${customer.customerCode}) removed from directory.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Import Customers from Excel
 * POST /api/v1/crm/customers/bulk-import
 */
export const bulkImportCustomers = async (req, res, next) => {
  try {
    const rawCustomers = req.body.customers;
    if (!Array.isArray(rawCustomers) || rawCustomers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No customer rows found in the uploaded file.'
      });
    }

    const importedCustomers = [];
    const errors = [];
    let skippedCount = 0;

    for (let i = 0; i < rawCustomers.length; i++) {
      const row = rawCustomers[i];
      const rowNum = i + 1;

      const companyName = String(
        row.companyName || row['Company Name *'] || row['Company Name'] || row.Company || ''
      ).trim();

      if (!companyName) {
        errors.push({ row: rowNum, error: 'Company Name is missing' });
        skippedCount++;
        continue;
      }

      const existing = await prisma.customer.findFirst({
        where: { companyName: { equals: companyName, mode: 'insensitive' } }
      });
      if (existing) {
        errors.push({ row: rowNum, error: `Customer "${companyName}" already exists` });
        skippedCount++;
        continue;
      }

      let customerCode = String(
        row.customerCode || row['Customer Code'] || row.Code || ''
      )
        .trim()
        .toUpperCase();

      if (!customerCode) {
        customerCode = await generateNextCustomerCode();
      } else {
        const codeExists = await prisma.customer.findUnique({ where: { customerCode } });
        if (codeExists) {
          customerCode = await generateNextCustomerCode();
        }
      }

      const addressLine1 = String(
        row.addressLine1 ||
          row['Address Line 1 *'] ||
          row['Address Line 1'] ||
          row.Address ||
          row.billingAddress?.addressLine1 ||
          'Industrial Area'
      ).trim();
      const addressLine2 = String(
        row.addressLine2 || row['Address Line 2'] || row.billingAddress?.addressLine2 || ''
      ).trim();
      const city = String(
        row.city || row['City *'] || row.City || row.billingAddress?.city || 'Bengaluru'
      ).trim();
      const state = String(
        row.state || row['State *'] || row.State || row.billingAddress?.state || 'Karnataka'
      ).trim();
      const pincode = String(
        row.pincode ||
          row['PIN Code *'] ||
          row['PIN Code'] ||
          row.PIN ||
          row['Postal Code'] ||
          row.billingAddress?.pincode ||
          '560058'
      ).trim();
      const country = String(
        row.country || row.Country || row.billingAddress?.country || 'India'
      ).trim();

      const contactName = String(
        row.contactPerson ||
          row['Primary Contact Person *'] ||
          row['Primary Contact Person'] ||
          row['Contact Person'] ||
          row.primaryContact?.name ||
          `${companyName} Purchase`
      ).trim();
      const designation = String(
        row.designation ||
          row.Designation ||
          row['Contact Designation'] ||
          row.primaryContact?.designation ||
          'Purchase Manager'
      ).trim();
      const mobile = String(
        row.mobile ||
          row['Mobile *'] ||
          row.Mobile ||
          row.Phone ||
          row.primaryContact?.mobile ||
          '+91 9800000000'
      ).trim();
      const email = String(
        row.email ||
          row.Email ||
          row['Contact Email'] ||
          row.primaryContact?.email ||
          `purchase@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
      )
        .toLowerCase()
        .trim();

      const gstin = String(
        row.gstin || row['GSTIN *'] || row.GSTIN || row['GST Number'] || ''
      )
        .trim()
        .toUpperCase();
      let pan = String(row.pan || row.PAN || row['PAN Number'] || '')
        .trim()
        .toUpperCase();
      if (!pan && gstin.length === 15) {
        pan = gstin.substring(2, 12);
      }

      const bankName = String(
        row.bankName || row['Bank Name'] || row.bankDetails?.bankName || ''
      ).trim();
      const accountNumber = String(
        row.accountNumber || row['Account Number'] || row.bankDetails?.accountNumber || ''
      ).trim();
      const ifscCode = String(
        row.ifscCode || row['IFSC Code'] || row.bankDetails?.ifscCode || ''
      )
        .trim()
        .toUpperCase();

      const briefAboutCustomerBusiness = String(
        row.briefAboutCustomerBusiness ||
          row['Brief About Customer Business'] ||
          row['brief about customer business'] ||
          row['breif about customer business'] ||
          ''
      ).trim();

      const anyOtherInformation = String(
        row.anyOtherInformation ||
          row['Any Other Information'] ||
          row['any other information'] ||
          ''
      ).trim();

      const rawTier = String(row.tier || row.Tier || 'STANDARD')
        .toUpperCase()
        .trim();
      const rawCurrency = String(row.currency || row.Currency || 'INR')
        .toUpperCase()
        .trim();

      const tier = ['TIER_1', 'TIER_2', 'TIER_3', 'STRATEGIC', 'STANDARD'].includes(rawTier)
        ? rawTier
        : 'STANDARD';
      const currency = ['INR', 'USD', 'EUR', 'GBP', 'JPY'].includes(rawCurrency)
        ? rawCurrency
        : 'INR';

      try {
        const created = await prisma.customer.create({
          data: {
            customerCode,
            companyName,
            displayName: String(row.displayName || row['Trade Display Name'] || '').trim(),
            customerType: String(row.customerType || row['Customer Type'] || 'TRANSFORMER_OEM').trim(),
            tier,
            industry: String(row.industry || row.Industry || 'Electrical & Power Machinery').trim(),
            website: String(row.website || row.Website || '').trim(),
            briefAboutCustomerBusiness,
            anyOtherInformation,
            currency,
            paymentTerms: String(
              row.paymentTerms ||
                row['Payment Terms'] ||
                '30% Advance, 60% Against Proforma, 10% Post Commissioning'
            ).trim(),
            creditPeriodDays: parseInt(row.creditPeriodDays || row['Credit Days'] || 30, 10) || 30,
            creditLimitINR: parseFloat(row.creditLimitINR || row['Credit Limit INR'] || 0) || 0,
            billingAddress: {
              attention: contactName,
              addressLine1,
              addressLine2,
              city,
              state,
              stateCode: gstin.length >= 2 ? gstin.substring(0, 2) : '',
              pincode,
              country
            },
            shippingAddress: {
              sameAsBilling: true,
              consigneeName: companyName,
              addressLine1,
              addressLine2,
              city,
              state,
              stateCode: gstin.length >= 2 ? gstin.substring(0, 2) : '',
              pincode,
              country
            },
            primaryContact: {
              name: contactName,
              designation,
              department: 'Procurement',
              mobile,
              phone: '',
              email
            },
            bankDetails: {
              accountName: companyName,
              bankName,
              accountNumber,
              ifscCode,
              branchName: '',
              swiftCode: '',
              accountType: 'CURRENT'
            },
            gstin,
            pan,
            status: 'ACTIVE',
            isActive: true,
            createdById: req.user?.id || null,
            createdByName: getActorName(req.user),
            updatedById: req.user?.id || null,
            updatedByName: getActorName(req.user)
          },
          include: customerInclude
        });

        importedCustomers.push(formatCustomer(created));
      } catch (err) {
        errors.push({ row: rowNum, error: err.message || 'Validation failed on record' });
        skippedCount++;
      }
    }

    await logAuditEvent({
      req,
      action: 'CUSTOMER_BULK_IMPORT',
      module: 'crm',
      entityType: 'Customer',
      afterData: { importedCount: importedCustomers.length, skippedCount },
      notes: `Bulk imported ${importedCustomers.length} customers (${skippedCount} skipped).`
    });

    res.status(200).json({
      success: true,
      message: `All set! Imported ${importedCustomers.length} customers (${skippedCount} skipped).`,
      importedCount: importedCustomers.length,
      skippedCount,
      errors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all customers (Clear Directory)
 * DELETE /api/v1/crm/customers
 */
export const deleteAllCustomers = async (req, res, next) => {
  try {
    const count = await prisma.customer.count();
    await prisma.customer.deleteMany({});

    await logAuditEvent({
      req,
      action: 'CUSTOMERS_CLEARED_ALL',
      module: 'crm',
      entityType: 'Customer',
      notes: `Cleared all ${count} customer records from master directory.`
    });

    res.status(200).json({
      success: true,
      message: `All ${count} customers removed from the master directory.`
    });
  } catch (error) {
    next(error);
  }
};
