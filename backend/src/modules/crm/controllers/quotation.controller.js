import { Quotation } from '../models/quotation.model.js';
import { Lead } from '../models/lead.model.js';
import { Project } from '../../project-setup/models/project.model.js';
import { Milestone } from '../../project-setup/models/milestone.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

/**
 * Get all quotations with search and filters
 */
export const getQuotations = async (req, res, next) => {
  try {
    const { status, leadId, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (leadId) query.leadId = leadId;

    if (search) {
      query.$or = [
        { quoteNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { machineModel: { $regex: search, $options: 'i' } },
        { 'poDetails.poNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Quotation.countDocuments(query);
    const quotations = await Quotation.find(query)
      .populate('leadId', 'leadNumber customerName companyName contactPhone contactEmail stage')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, page: Number(page), quotations });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single quotation by ID
 */
export const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id)
      .populate('leadId')
      .populate('createdBy', 'firstName lastName email');

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    res.status(200).json({ success: true, quotation });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper to compute dual currency amounts
 */
const normalizeDualCurrency = (amount, currency = 'INR', exchangeRate = 1.0) => {
  const num = Number(amount || 0);
  const rate = Number(exchangeRate || 1.0);
  const baseINR = currency === 'INR' ? num : Math.round(num * rate * 100) / 100;
  return {
    currency,
    amount: Math.round(num * 100) / 100,
    exchangeRate: rate,
    baseAmountINR: baseINR
  };
};

/**
 * Create a new commercial quotation
 */
export const createQuotation = async (req, res, next) => {
  try {
    const {
      leadId,
      customerName,
      companyName,
      contactEmail,
      contactPhone,
      gstin,
      machineModel,
      items = [],
      taxRatePercent = 18,
      currency = 'INR',
      exchangeRate = 1.0,
      validUntil,
      paymentTerms,
      deliveryWeeks = 8,
      warrantyMonths = 12
    } = req.body;

    const count = await Quotation.countDocuments();
    const year = new Date().getFullYear();
    const sequential = String(count + 1).padStart(4, '0');
    const quoteNumber = `QT-${year}-${sequential}`;

    // Normalize item pricing
    const computedItems = items.map((item, idx) => {
      const unitAmt = Number(item.unitPrice?.amount ?? item.unitPrice ?? 0);
      const qty = Number(item.quantity || 1);
      const lineAmt = Math.round(unitAmt * qty * 100) / 100;

      return {
        itemCode: item.itemCode || `ITEM-${idx + 1}`,
        description: item.description || 'Custom Tooling & Assembly',
        quantity: qty,
        unitPrice: normalizeDualCurrency(unitAmt, currency, exchangeRate),
        lineTotal: normalizeDualCurrency(lineAmt, currency, exchangeRate)
      };
    });

    const subtotalRaw = computedItems.reduce((acc, curr) => acc + curr.lineTotal.amount, 0);
    const subtotalINR = computedItems.reduce((acc, curr) => acc + curr.lineTotal.baseAmountINR, 0);

    const taxAmountRaw = Math.round(((subtotalRaw * Number(taxRatePercent)) / 100) * 100) / 100;
    const taxAmountINR = Math.round(((subtotalINR * Number(taxRatePercent)) / 100) * 100) / 100;

    const totalRaw = Math.round((subtotalRaw + taxAmountRaw) * 100) / 100;
    const totalINR = Math.round((subtotalINR + taxAmountINR) * 100) / 100;

    const quotation = new Quotation({
      quoteNumber,
      leadId: leadId || undefined,
      customerName,
      companyName: companyName || customerName,
      contactEmail,
      contactPhone,
      gstin,
      machineModel,
      items: computedItems,
      subtotal: {
        currency,
        amount: subtotalRaw,
        exchangeRate,
        baseAmountINR: subtotalINR
      },
      taxRatePercent: Number(taxRatePercent),
      taxAmount: {
        currency,
        amount: taxAmountRaw,
        exchangeRate,
        baseAmountINR: taxAmountINR
      },
      totalAmount: {
        currency,
        amount: totalRaw,
        exchangeRate,
        baseAmountINR: totalINR
      },
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: paymentTerms || '30% Advance with PO, 60% Before Dispatch, 10% Post Commissioning',
      deliveryWeeks: Number(deliveryWeeks),
      warrantyMonths: Number(warrantyMonths),
      status: 'SENT_TO_CLIENT',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await quotation.save();

    // If linked to lead, transition lead stage to QUOTE_PREPARED
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, {
        stage: 'QUOTE_PREPARED',
        status: 'QUOTATION_SENT',
        updatedBy: req.user?._id
      });
    }

    await logAuditEvent({
      req,
      action: 'QUOTATION_CREATED',
      module: 'crm',
      entityId: quotation._id,
      entityType: 'Quotation',
      notes: `Quotation ${quoteNumber} generated for ${customerName}. Total: ${currency} ${quotation.totalAmount.amount} (₹${quotation.totalAmount.baseAmountINR})`
    });

    res.status(201).json({ success: true, message: 'Commercial quotation created successfully.', quotation });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quotation details
 */
export const updateQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    if (quotation.status === 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Locked: This quotation has already been accepted with a Client PO and converted to a live Project.'
      });
    }

    Object.assign(quotation, req.body);
    quotation.updatedBy = req.user?._id;
    await quotation.save();

    res.status(200).json({ success: true, message: 'Quotation updated successfully.', quotation });
  } catch (error) {
    next(error);
  }
};

/**
 * Enterprise PO Gate: Convert Quotation to Master Project Setup (PRJ-XXXX / WO-XXXX)
 */
export const convertQuotationToProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      poNumber,
      poDate,
      advanceAmount,
      advanceTransactionRef,
      targetDeliveryDate,
      notes
    } = req.body;

    // Strict validation of Enterprise PO Entry fields
    if (!poNumber || !poDate || !advanceAmount || !advanceTransactionRef || !targetDeliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing mandatory Enterprise PO Entry details. Client PO Number, PO Date, Advance Amount, Transaction Ref, and Target Delivery Date are strictly required to mint a Project.'
      });
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }

    if (quotation.status === 'ACCEPTED' && quotation.convertedProjectId) {
      return res.status(400).json({
        success: false,
        message: `This quotation was already converted into Project ${quotation.convertedProjectId}.`
      });
    }

    const year = new Date().getFullYear();
    const projCount = await Project.countDocuments();
    const seq = String(projCount + 1).padStart(4, '0');
    const projectId = `PRJ-${year}-${seq}`;
    const workOrderNumber = `WO-${year}-${seq}`;

    const parsedAdvance = Number(advanceAmount.amount || advanceAmount);
    const advanceCurrency = advanceAmount.currency || quotation.totalAmount.currency || 'INR';
    const advanceRate = Number(advanceAmount.exchangeRate || quotation.totalAmount.exchangeRate || 1.0);

    const poDetails = {
      poNumber: poNumber.trim(),
      poDate: new Date(poDate),
      advanceAmount: normalizeDualCurrency(parsedAdvance, advanceCurrency, advanceRate),
      advanceTransactionRef: advanceTransactionRef.trim(),
      targetDeliveryDate: new Date(targetDeliveryDate),
      notes: notes || ''
    };

    // 1. Create Master Project
    const project = new Project({
      projectId,
      workOrderNumber,
      projectName: `${quotation.companyName || quotation.customerName} - ${quotation.machineModel}`,
      customerName: quotation.customerName,
      machineModel: quotation.machineModel,
      quotationRef: quotation._id,
      contractValue: quotation.totalAmount,
      startDate: new Date(),
      targetDispatchDate: new Date(targetDeliveryDate),
      currentStage: 'PROJECT_SETUP',
      status: 'ON_TRACK',
      plantLocation: 'Main Works - Unit 1',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await project.save();

    // 2. Provision Standard ETO Lifecycle Milestones
    const standardStages = [
      { stage: 'PROJECT_SETUP', title: 'Work Order Confirmation & Kickoff', daysOffset: 3 },
      { stage: 'DESIGN_BOM', title: 'Engineering CAD & Hierarchical BOM Freeze', daysOffset: 14 },
      { stage: 'PROCUREMENT', title: 'Net Demand Sourcing & Critical PO Issuance', daysOffset: 28 },
      { stage: 'INCOMING_QC', title: 'Quarantine Inward & Precision Inspection Clearance', daysOffset: 38 },
      { stage: 'STORE_ALLOCATION', title: 'Hard Project Kitting & Store Bin Hard-Lock', daysOffset: 42 },
      { stage: 'PRODUCTION_ASSEMBLY', title: 'Mechanical & Electrical Sub-Assembly Completion', daysOffset: 52 },
      { stage: 'MACHINE_TRIAL', title: 'Dry Run & Wet Winding Performance Trials', daysOffset: 58 },
      { stage: 'DISPATCH_READY', title: 'Zero-Snag Clearance & Final Gate Pass Dossier', daysOffset: Math.max(62, Math.floor((new Date(targetDeliveryDate) - Date.now()) / (1000 * 60 * 60 * 24))) }
    ];

    const milestonesToInsert = standardStages.map((st) => {
      const targetDate = new Date(Date.now() + st.daysOffset * 24 * 60 * 60 * 1000);
      return {
        projectId: project.projectId,
        title: st.title,
        stage: st.stage,
        baselineDate: targetDate,
        projectedDate: targetDate,
        status: st.stage === 'PROJECT_SETUP' ? 'IN_PROGRESS' : 'PENDING',
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      };
    });

    await Milestone.insertMany(milestonesToInsert);

    // 3. Mark Quotation Accepted with PO Details
    quotation.status = 'ACCEPTED';
    quotation.poDetails = poDetails;
    quotation.convertedProjectId = project.projectId;
    quotation.convertedAt = new Date();
    quotation.updatedBy = req.user?._id;
    await quotation.save();

    // 4. Update Lead status and stage to WON
    if (quotation.leadId) {
      await Lead.findByIdAndUpdate(quotation.leadId, {
        stage: 'WON',
        status: 'CONVERTED',
        convertedProjectId: project.projectId,
        convertedAt: new Date(),
        updatedBy: req.user?._id
      });
    }

    // 5. Audit Trail
    await logAuditEvent({
      req,
      action: 'PO_ACCEPTED_PROJECT_CREATED',
      module: 'crm',
      entityId: project._id,
      entityType: 'Project',
      notes: `Enterprise PO Gate passed: Client PO #${poNumber} confirmed. Project ${project.projectId} (${workOrderNumber}) minted with advance ${advanceCurrency} ${parsedAdvance}`
    });

    res.status(201).json({
      success: true,
      message: `Client PO verified! Master Project ${project.projectId} and Work Order ${workOrderNumber} created successfully.`,
      project,
      quotation
    });
  } catch (error) {
    next(error);
  }
};
