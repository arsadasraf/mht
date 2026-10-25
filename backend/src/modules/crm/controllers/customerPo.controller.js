import { CustomerPo } from '../models/customerPo.model.js';
import { Quotation } from '../models/quotation.model.js';
import { Lead } from '../models/lead.model.js';
import { Project } from '../../project-setup/models/project.model.js';
import { Milestone } from '../../project-setup/models/milestone.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { getPresignedDownloadUrl, getPresignedUploadUrl } from '../../../config/s3.config.js';

/**
 * Get all Customer POs with search, status, and date range filters
 */
export const getCustomerPos = async (req, res, next) => {
  try {
    const { status, search, fromDate, toDate, page = 1, limit = 50 } = req.query;
    const query = {};

    if (status && status !== 'ALL') query.status = status;

    if (fromDate && toDate) {
      query.poDate = { $gte: new Date(fromDate), $lte: new Date(toDate) };
    }

    if (search) {
      query.$or = [
        { poNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { convertedProjectId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await CustomerPo.countDocuments(query);
    const customerPos = await CustomerPo.find(query)
      .populate('quotationId', 'quoteNumber totalAmount status')
      .populate('leadId', 'leadNumber customerName companyName')
      .populate('createdBy', 'firstName lastName')
      .sort({ poDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    // Attach short-lived presigned download URLs for uploaded S3 documents
    const enriched = await Promise.all(
      customerPos.map(async (po) => {
        if (po.s3DocumentKey) {
          try {
            po.presignedDownloadUrl = await getPresignedDownloadUrl(po.s3DocumentKey, 900);
          } catch (e) {
            console.warn(`Presigned URL error for ${po.s3DocumentKey}:`, e.message);
          }
        }
        return po;
      })
    );

    res.status(200).json({ success: true, total, page: Number(page), customerPos: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single Customer PO by ID
 */
export const getCustomerPoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerPo = await CustomerPo.findById(id)
      .populate('quotationId')
      .populate('leadId')
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!customerPo) {
      return res.status(404).json({ success: false, message: 'Customer PO not found.' });
    }

    if (customerPo.s3DocumentKey) {
      customerPo.presignedDownloadUrl = await getPresignedDownloadUrl(customerPo.s3DocumentKey, 900);
    }

    res.status(200).json({ success: true, customerPo });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Customer PO entry
 */
export const createCustomerPo = async (req, res, next) => {
  try {
    const {
      poNumber,
      poDate,
      customerId,
      quotationId,
      leadId,
      customerName,
      companyName,
      contactEmail,
      contactPhone,
      billingAddress,
      gstin,
      items,
      subtotalAmount,
      totalTaxAmount,
      totalAmount,
      deliveryCommitmentDate,
      s3DocumentKey,
      pdfUrl,
      photos,
      notes,
      paymentTerms
    } = req.body;

    if (!poNumber || !poDate || !customerName || !companyName || !deliveryCommitmentDate) {
      return res.status(400).json({
        success: false,
        message: 'PO Number, PO Date, Customer Name, Company Name, and Delivery Commitment Date are required.'
      });
    }

    // Validate that at least one PO document (PDF or Photo) is attached
    const hasPdf = Boolean(pdfUrl?.trim() || s3DocumentKey?.trim());
    const validPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
    if (!hasPdf && validPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please attach at least one PO document — either the signed PO PDF or at least one PO photo.'
      });
    }

    // Check duplicate PO number
    const existing = await CustomerPo.findOne({ poNumber: poNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer PO Number "${poNumber}" already exists in the system.`
      });
    }

    const currency = totalAmount?.currency || 'INR';
    const exRate = Number(totalAmount?.exchangeRate || 1.0);

    let calculatedSubtotal = 0;
    let calculatedTax = 0;

    // Format line items with taxes
    const formattedItems = (items || []).map((it, idx) => {
      const q = Number(it.quantity || 1);
      const uPrice = Number(it.unitPrice?.amount ?? it.unitPrice ?? 0);
      const baseTotal = Math.round(q * uPrice);
      const tRate = Number(it.taxRate !== undefined ? it.taxRate : 18);
      const tAmount = Number(it.taxAmount?.amount ?? Math.round((baseTotal * tRate) / 100));
      const lTotal = Number(it.lineTotal?.amount ?? it.lineTotal ?? (baseTotal + tAmount));

      calculatedSubtotal += baseTotal;
      calculatedTax += tAmount;

      return {
        itemCode: it.itemCode || `ITEM-${idx + 1}`,
        modelCode: it.modelCode || '',
        description: it.description || 'Custom Machine / Part',
        hsnCode: it.hsnCode || '84798100',
        quantity: q,
        unitPrice: {
          currency,
          amount: uPrice,
          exchangeRate: exRate,
          baseAmountINR: Math.round(uPrice * exRate)
        },
        taxRate: tRate,
        taxAmount: {
          currency,
          amount: tAmount,
          exchangeRate: exRate,
          baseAmountINR: Math.round(tAmount * exRate)
        },
        lineTotal: {
          currency,
          amount: lTotal,
          exchangeRate: exRate,
          baseAmountINR: Math.round(lTotal * exRate)
        },
        specifications: it.specifications || ''
      };
    });

    const finalSubtotalVal = Number(subtotalAmount?.amount ?? calculatedSubtotal);
    const finalTaxVal = Number(totalTaxAmount?.amount ?? calculatedTax);
    const finalGrandTotalVal = Number(totalAmount?.amount ?? (finalSubtotalVal + finalTaxVal));

    const customerPo = new CustomerPo({
      poNumber: poNumber.toUpperCase().trim(),
      poDate: new Date(poDate),
      customerId: customerId || undefined,
      quotationId: quotationId || undefined,
      leadId: leadId || undefined,
      customerName,
      companyName,
      contactEmail: contactEmail || '',
      contactPhone: contactPhone || '',
      billingAddress: billingAddress || '',
      gstin: gstin || '',
      items: formattedItems,
      subtotalAmount: {
        currency,
        amount: finalSubtotalVal,
        exchangeRate: exRate,
        baseAmountINR: Math.round(finalSubtotalVal * exRate)
      },
      totalTaxAmount: {
        currency,
        amount: finalTaxVal,
        exchangeRate: exRate,
        baseAmountINR: Math.round(finalTaxVal * exRate)
      },
      totalAmount: {
        currency,
        amount: finalGrandTotalVal,
        exchangeRate: exRate,
        baseAmountINR: Math.round(finalGrandTotalVal * exRate)
      },
      paymentTerms: paymentTerms || 'Payment as per mutually agreed terms',
      deliveryCommitmentDate: new Date(deliveryCommitmentDate),
      s3DocumentKey: s3DocumentKey || '',
      pdfUrl: pdfUrl || '',
      photos: validPhotos,
      notes: notes || '',
      status: 'RECEIVED',
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await customerPo.save();

    // If linked to quotation, update quotation status
    if (quotationId) {
      await Quotation.findByIdAndUpdate(quotationId, {
        status: 'ACCEPTED',
        'poDetails.poNumber': poNumber.toUpperCase().trim(),
        'poDetails.poDate': new Date(poDate),
        'poDetails.targetDeliveryDate': new Date(deliveryCommitmentDate),
        updatedBy: req.user?._id
      });
    }

    // If linked to lead, transition lead stage to WON
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, {
        stage: 'WON',
        status: 'CONVERTED',
        updatedBy: req.user?._id
      });
    }

    await logAuditEvent({
      req,
      action: 'CUSTOMER_PO_CREATED',
      module: 'crm',
      entityId: customerPo._id,
      entityType: 'CustomerPo',
      notes: `Customer PO ${poNumber} recorded for ${companyName}. Total Value: ${currency} ${amountVal}`
    });

    res.status(201).json({
      success: true,
      message: 'Customer PO successfully recorded.',
      customerPo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Customer PO details
 */
export const updateCustomerPo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await CustomerPo.findById(id);
    if (!po) {
      return res.status(404).json({ success: false, message: 'Customer PO not found.' });
    }

    if (po.status === 'PROJECT_CONVERTED') {
      return res.status(400).json({
        success: false,
        message: 'Locked: This Customer PO has already been converted into a Live Project Spine.'
      });
    }

    Object.assign(po, req.body);
    po.updatedBy = req.user?._id;
    await po.save();

    res.status(200).json({ success: true, message: 'Customer PO updated successfully.', customerPo: po });
  } catch (error) {
    next(error);
  }
};

/**
 * 1-Click Handover: Convert Customer PO to Master Project Setup (PRJ-XXXX / WO-XXXX)
 */
export const convertCustomerPoToProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const customerPo = await CustomerPo.findById(id);
    if (!customerPo) {
      return res.status(404).json({ success: false, message: 'Customer PO not found.' });
    }

    if (customerPo.status === 'PROJECT_CONVERTED' && customerPo.convertedProjectId) {
      return res.status(400).json({
        success: false,
        message: `Already Converted: This PO is already assigned to Project Spine ID "${customerPo.convertedProjectId}".`
      });
    }

    // Mint sequential Project ID (PRJ-YYYY-XXXX) and Work Order Number (WO-YYYY-XXXX)
    const year = new Date().getFullYear();
    const count = await Project.countDocuments();
    const sequential = String(count + 1).padStart(4, '0');
    const projectId = `PRJ-${year}-${sequential}`;
    const workOrderNumber = `WO-${year}-${sequential}`;

    const primaryModel = customerPo.items?.[0]?.modelCode || customerPo.items?.[0]?.description || 'Custom Precision SPM';
    const projectName = `${customerPo.companyName} — ${primaryModel} Execution`;

    const project = new Project({
      projectId,
      workOrderNumber,
      projectName,
      customerName: customerPo.companyName || customerPo.customerName,
      machineModel: primaryModel,
      quotationRef: customerPo.quotationId || undefined,
      contractValue: customerPo.totalAmount,
      startDate: new Date(),
      targetDispatchDate: customerPo.deliveryCommitmentDate,
      currentStage: 'DESIGN_BOM',
      overallProgressPercent: 5,
      isHardLocked: false,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await project.save();

    // Initialize Baseline Milestones for the Project Setup Spine
    const defaultMilestones = [
      { name: '1. 3-Level BOM Architecture & 3D CAD Freeze', stageKey: 'DESIGN_BOM', weightPercent: 20, targetDays: 14 },
      { name: '2. Sourcing & Net Purchase Demand Release', stageKey: 'PURCHASE_DEMAND', weightPercent: 20, targetDays: 28 },
      { name: '3. Incoming Quality Inspection & Clearance', stageKey: 'INCOMING_QC', weightPercent: 15, targetDays: 42 },
      { name: '4. Stores Hard Allocation Lock', stageKey: 'STORE_ALLOCATION', weightPercent: 15, targetDays: 49 },
      { name: '5. Mechanical & Electrical Assembly Dry Run', stageKey: 'PRODUCTION_ASSEMBLY', weightPercent: 15, targetDays: 63 },
      { name: '6. Zero-Snag Clearance & Dispatch Release', stageKey: 'DISPATCH_RELEASE', weightPercent: 15, targetDays: 70 }
    ];

    const milestoneDocs = defaultMilestones.map((m, index) => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + m.targetDays);
      return {
        projectId,
        milestoneName: m.name,
        stageKey: m.stageKey,
        sequenceOrder: index + 1,
        weightPercent: m.weightPercent,
        targetCompletionDate: targetDate,
        status: index === 0 ? 'IN_PROGRESS' : 'PENDING',
        signOffRole: 'Manager',
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      };
    });

    await Milestone.insertMany(milestoneDocs);

    // Update Customer PO status
    customerPo.status = 'PROJECT_CONVERTED';
    customerPo.convertedProjectId = projectId;
    customerPo.convertedAt = new Date();
    customerPo.updatedBy = req.user?._id;
    await customerPo.save();

    // Sync with linked quotation and lead
    if (customerPo.quotationId) {
      await Quotation.findByIdAndUpdate(customerPo.quotationId, {
        status: 'ACCEPTED',
        convertedProjectId: projectId,
        convertedAt: new Date(),
        updatedBy: req.user?._id
      });
    }

    if (customerPo.leadId) {
      await Lead.findByIdAndUpdate(customerPo.leadId, {
        stage: 'WON',
        status: 'CONVERTED',
        convertedProjectId: projectId,
        convertedAt: new Date(),
        updatedBy: req.user?._id
      });
    }

    await logAuditEvent({
      req,
      action: 'CUSTOMER_PO_CONVERTED_TO_PROJECT',
      module: 'crm',
      entityId: customerPo._id,
      entityType: 'CustomerPo',
      notes: `Customer PO ${customerPo.poNumber} converted to Master Project ${projectId} (${workOrderNumber}) for ${customerPo.companyName}`
    });

    res.status(200).json({
      success: true,
      message: `Customer PO successfully converted into Project Setup Spine: ${projectId} (${workOrderNumber}).`,
      projectId,
      workOrderNumber,
      project
    });
  } catch (error) {
    next(error);
  }
};
