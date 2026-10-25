import { Customer } from '../models/customer.model.js';

/**
 * Generate next sequential Customer Code (e.g. CUST-1001)
 */
async function generateNextCustomerCode() {
  const lastCustomer = await Customer.findOne({ customerCode: /^CUST-\d+$/ })
    .sort({ customerCode: -1 })
    .collation({ locale: 'en', numericOrdering: true });

  if (!lastCustomer || !lastCustomer.customerCode) {
    return 'CUST-1001';
  }

  const match = lastCustomer.customerCode.match(/^CUST-(\d+)$/);
  if (match) {
    const nextNum = parseInt(match[1], 10) + 1;
    return `CUST-${nextNum}`;
  }

  const count = await Customer.countDocuments();
  return `CUST-${1000 + count + 1}`;
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
      state,
      country,
      currency,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page,
      limit
    } = req.query;

    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (customerType && customerType !== 'ALL') {
      query.customerType = customerType;
    }

    if (tier && tier !== 'ALL') {
      query.tier = tier;
    }

    if (state && state !== 'ALL') {
      query['billingAddress.state'] = new RegExp(`^${state.trim()}$`, 'i');
    }

    if (country && country !== 'ALL') {
      query['billingAddress.country'] = new RegExp(`^${country.trim()}$`, 'i');
    }

    if (currency && currency !== 'ALL') {
      query.currency = currency;
    }

    if (search && search.trim()) {
      const s = search.trim();
      const regex = new RegExp(s, 'i');
      query.$or = [
        { customerCode: regex },
        { companyName: regex },
        { displayName: regex },
        { gstin: regex },
        { pan: regex },
        { 'primaryContact.name': regex },
        { 'primaryContact.email': regex },
        { 'primaryContact.mobile': regex },
        { 'billingAddress.city': regex },
        { 'billingAddress.state': regex },
        { 'billingAddress.pincode': regex }
      ];
    }

    const sortOption = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    };

    const total = await Customer.countDocuments(query);

    let customersQuery = Customer.find(query)
      .sort(sortOption)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (page && limit) {
      const p = Math.max(1, parseInt(page, 10));
      const l = Math.max(1, parseInt(limit, 10));
      customersQuery = customersQuery.skip((p - 1) * l).limit(l);
      const customers = await customersQuery;

      return res.status(200).json({
        success: true,
        customers,
        total,
        page: p,
        pages: Math.ceil(total / l)
      });
    }

    // Default: return all matching records for client-side Excel grid filtering
    const customers = await customersQuery;

    res.status(200).json({
      success: true,
      customers,
      total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get customer by ID or Customer Code
 * GET /api/v1/crm/customers/:id
 */
export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let customer;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      customer = await Customer.findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
    } else {
      customer = await Customer.findOne({ customerCode: id.toUpperCase() })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email');
    }

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    res.status(200).json({
      success: true,
      customer
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
    const data = { ...req.body };

    // Auto-generate customerCode if missing
    if (!data.customerCode || !data.customerCode.trim()) {
      data.customerCode = await generateNextCustomerCode();
    } else {
      data.customerCode = data.customerCode.trim().toUpperCase();
    }

    // Check duplicate code
    const existingCode = await Customer.findOne({ customerCode: data.customerCode });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Customer code "${data.customerCode}" is already in use. Please specify a unique code.`
      });
    }

    // Check duplicate Company Name (case-insensitive)
    if (data.companyName) {
      const existingName = await Customer.findOne({
        companyName: new RegExp(`^${data.companyName.trim()}$`, 'i')
      });
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: `A customer named "${data.companyName.trim()}" already exists in the directory.`
        });
      }
    }

    // Normalizations
    if (data.gstin) data.gstin = data.gstin.trim().toUpperCase();
    if (data.pan) data.pan = data.pan.trim().toUpperCase();
    if (data.bankDetails?.ifscCode) data.bankDetails.ifscCode = data.bankDetails.ifscCode.trim().toUpperCase();

    // Universal Action Tracking
    data.createdBy = req.user?._id;
    data.updatedBy = req.user?._id;

    const newCustomer = await Customer.create(data);

    res.status(201).json({
      success: true,
      message: `Customer "${newCustomer.companyName}" (${newCustomer.customerCode}) created successfully.`,
      customer: newCustomer
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
    const data = { ...req.body };

    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    // If customerCode changed, check duplicate
    if (data.customerCode && data.customerCode.trim().toUpperCase() !== customer.customerCode) {
      const newCode = data.customerCode.trim().toUpperCase();
      const existingCode = await Customer.findOne({
        customerCode: newCode,
        _id: { $ne: id }
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          message: `Customer code "${newCode}" is already used by another customer.`
        });
      }
      data.customerCode = newCode;
    }

    // If companyName changed, check duplicate
    if (data.companyName && data.companyName.trim().toLowerCase() !== customer.companyName.toLowerCase()) {
      const existingName = await Customer.findOne({
        companyName: new RegExp(`^${data.companyName.trim()}$`, 'i'),
        _id: { $ne: id }
      });
      if (existingName) {
        return res.status(400).json({
          success: false,
          message: `A customer named "${data.companyName.trim()}" already exists.`
        });
      }
    }

    // Normalizations
    if (data.gstin) data.gstin = data.gstin.trim().toUpperCase();
    if (data.pan) data.pan = data.pan.trim().toUpperCase();
    if (data.bankDetails?.ifscCode) data.bankDetails.ifscCode = data.bankDetails.ifscCode.trim().toUpperCase();

    // Track updater
    data.updatedBy = req.user?._id;

    Object.assign(customer, data);
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer "${customer.companyName}" updated successfully.`,
      customer
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
    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.'
      });
    }

    const companyName = customer.companyName;
    const customerCode = customer.customerCode;

    await Customer.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Customer "${companyName}" (${customerCode}) deleted permanently from master directory.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Import Customers from Excel / CSV
 * POST /api/v1/crm/customers/bulk-import
 */
export const bulkImportCustomers = async (req, res, next) => {
  try {
    const rawCustomers = req.body.customers;
    if (!Array.isArray(rawCustomers) || rawCustomers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No customer data provided for bulk import.'
      });
    }

    const importedCustomers = [];
    const errors = [];
    let skippedCount = 0;

    for (let i = 0; i < rawCustomers.length; i++) {
      const row = rawCustomers[i];
      const rowNum = i + 1;

      // Extract Company Name
      const companyName = (row.companyName || row['Company Name'] || row.Company || '').trim();
      if (!companyName) {
        errors.push({ row: rowNum, error: 'Company Name is missing' });
        skippedCount++;
        continue;
      }

      // Check if duplicate company name already exists in database
      const existing = await Customer.findOne({
        companyName: new RegExp(`^${companyName}$`, 'i')
      });
      if (existing) {
        errors.push({ row: rowNum, error: `Customer "${companyName}" already exists in directory` });
        skippedCount++;
        continue;
      }

      // Customer Code
      let customerCode = (row.customerCode || row['Customer Code'] || row.Code || '').trim().toUpperCase();
      if (!customerCode) {
        customerCode = await generateNextCustomerCode();
      } else {
        const codeExists = await Customer.findOne({ customerCode });
        if (codeExists) {
          customerCode = await generateNextCustomerCode();
        }
      }

      // Address fields
      const addressLine1 = (row.addressLine1 || row['Address Line 1'] || row.Address || row.billingAddress?.addressLine1 || 'Peenya Industrial Area').trim();
      const addressLine2 = (row.addressLine2 || row['Address Line 2'] || row.billingAddress?.addressLine2 || '').trim();
      const city = (row.city || row.City || row.billingAddress?.city || 'Bengaluru').trim();
      const state = (row.state || row.State || row.billingAddress?.state || 'Karnataka').trim();
      const pincode = (row.pincode || row.PIN || row['PIN Code'] || row['Postal Code'] || row.billingAddress?.pincode || '560058').toString().trim();
      const country = (row.country || row.Country || row.billingAddress?.country || 'India').trim();

      // Contact fields
      const contactName = (row.contactPerson || row['Primary Contact Person'] || row['Contact Person'] || row['Contact Name'] || row.primaryContact?.name || companyName + ' Purchase').trim();
      const designation = (row.designation || row.Designation || row['Contact Designation'] || row.primaryContact?.designation || 'Purchase Manager').trim();
      const mobile = (row.mobile || row.Mobile || row.Phone || row['Contact Mobile'] || row.primaryContact?.mobile || '+91 9800000000').toString().trim();
      const email = (row.email || row.Email || row['Contact Email'] || row.primaryContact?.email || 'purchase@' + companyName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com').toLowerCase().trim();

      // GST / PAN
      const gstin = (row.gstin || row.GSTIN || row['GST Number'] || '').trim().toUpperCase();
      let pan = (row.pan || row.PAN || row['PAN Number'] || '').trim().toUpperCase();
      if (!pan && gstin.length === 15) {
        pan = gstin.substring(2, 12);
      }

      // Bank Details
      const bankName = (row.bankName || row['Bank Name'] || row.bankDetails?.bankName || '').trim();
      const accountNumber = (row.accountNumber || row['Account Number'] || row.bankDetails?.accountNumber || '').toString().trim();
      const ifscCode = (row.ifscCode || row['IFSC Code'] || row.bankDetails?.ifscCode || '').trim().toUpperCase();

      // Commercial & Categorization
      const customerType = (row.customerType || row['Customer Type'] || row.Category || 'Transformer OEM').trim();
      const tier = (row.tier || row.Tier || 'STANDARD').toUpperCase().trim();
      const currency = (row.currency || row.Currency || 'INR').toUpperCase().trim();
      const paymentTerms = (row.paymentTerms || row['Payment Terms'] || '30% Advance, 60% Against Proforma, 10% Post Commissioning').trim();

      const newCustomerData = {
        customerCode,
        companyName,
        displayName: (row.displayName || row['Trade Display Name'] || row.Alias || '').trim(),
        customerType,
        tier: ['TIER_1', 'TIER_2', 'TIER_3', 'STRATEGIC', 'STANDARD'].includes(tier) ? tier : 'STANDARD',
        industry: (row.industry || row.Industry || 'Electrical & Power Machinery').trim(),
        website: (row.website || row.Website || '').trim(),
        currency: ['INR', 'USD', 'EUR', 'GBP', 'JPY'].includes(currency) ? currency : 'INR',
        paymentTerms,
        creditPeriodDays: parseInt(row.creditPeriodDays || row['Credit Days'] || 30, 10) || 30,
        creditLimitINR: parseInt(row.creditLimitINR || row['Credit Limit INR'] || 0, 10) || 0,

        billingAddress: {
          attention: contactName,
          addressLine1,
          addressLine2,
          city,
          state,
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
          pincode,
          country
        },

        primaryContact: {
          name: contactName,
          designation,
          mobile,
          email
        },

        gstin,
        pan,
        bankDetails: {
          bankName,
          accountNumber,
          ifscCode,
          accountType: 'CURRENT'
        },

        status: 'ACTIVE',
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      };

      try {
        const created = await Customer.create(newCustomerData);
        importedCustomers.push(created);
      } catch (err) {
        errors.push({ row: rowNum, error: err.message || 'Validation failed on record' });
        skippedCount++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk import completed: ${importedCustomers.length} customers imported, ${skippedCount} skipped.`,
      importedCount: importedCustomers.length,
      skippedCount,
      errors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all customers (Clear Catalog)
 * DELETE /api/v1/crm/customers
 */
export const deleteAllCustomers = async (req, res, next) => {
  try {
    const count = await Customer.countDocuments();
    await Customer.deleteMany({});

    res.status(200).json({
      success: true,
      message: `All ${count} customers permanently deleted from master directory.`
    });
  } catch (error) {
    next(error);
  }
};

