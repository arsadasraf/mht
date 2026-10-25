import { Lead } from '../models/lead.model.js';
import { Quotation } from '../models/quotation.model.js';
import { logAuditEvent } from '../../../services/audit.service.js';

/**
 * Get leads with advanced filtering, stage filter, and search
 */
export const getLeads = async (req, res, next) => {
  try {
    const { stage, status, priority, source, machineModel, search, page = 1, limit = 100 } = req.query;
    const query = {};

    if (stage) query.stage = stage;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (source) query.source = source;
    if (machineModel) query.machineModel = machineModel;

    if (search) {
      query.$or = [
        { leadNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
        { contactPhone: { $regex: search, $options: 'i' } },
        { contactEmail: { $regex: search, $options: 'i' } },
        { queryId: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({ success: true, total, page: Number(page), leads });
  } catch (error) {
    next(error);
  }
};

/**
 * Get CRM Pipeline Overview & Forecast KPIs
 */
export const getCrmOverview = async (req, res, next) => {
  try {
    const { dateScope, fromDate, toDate, assignedTo, source } = req.query;
    const leadQuery = {};
    const quoteQuery = {};

    // User filter
    if (assignedTo && assignedTo !== 'ALL') {
      leadQuery.assignedTo = assignedTo;
      quoteQuery.createdBy = assignedTo;
    }

    // Source filter
    if (source && source !== 'ALL') {
      leadQuery.source = source;
    }

    // Date range filter
    const now = new Date();
    let start, end;

    if (fromDate && toDate) {
      start = new Date(fromDate);
      end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
    } else if (dateScope === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateScope === 'yesterday') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (dateScope === 'this_week') {
      const day = now.getDay() || 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
      end = new Date();
    } else if (dateScope === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date();
    } else if (dateScope === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }

    if (start && end) {
      leadQuery.createdAt = { $gte: start, $lte: end };
      quoteQuery.createdAt = { $gte: start, $lte: end };
    }

    const allLeads = await Lead.find(leadQuery).populate('assignedTo', 'firstName lastName email').lean();
    const allQuotations = await Quotation.find(quoteQuery).lean();

    const totalLeads = allLeads.length;
    let openPipelineValueINR = 0;
    let wonValueINR = 0;
    let totalWon = 0;
    let totalLost = 0;
    let indiaMartCount = 0;

    const stageDistribution = {
      NEW: 0,
      TECHNICAL_REVIEW: 0,
      QUOTE_PREPARED: 0,
      NEGOTIATION: 0,
      WON: 0,
      LOST: 0
    };

    const sourceDistribution = {};
    const lossReasons = {};
    const machinePopularity = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stalledAlerts = [];

    allLeads.forEach((ld) => {
      // Stage count
      if (stageDistribution[ld.stage] !== undefined) {
        stageDistribution[ld.stage]++;
      } else {
        stageDistribution.NEW++;
      }

      // Value calculation
      const val = ld.estimatedValue?.baseAmountINR || ld.estimatedValue?.amount || 0;
      if (['NEW', 'TECHNICAL_REVIEW', 'QUOTE_PREPARED', 'NEGOTIATION'].includes(ld.stage)) {
        openPipelineValueINR += val;
      }
      if (ld.stage === 'WON') {
        wonValueINR += val;
        totalWon++;
      }
      if (ld.stage === 'LOST') {
        totalLost++;
        if (ld.lossReason) {
          lossReasons[ld.lossReason] = (lossReasons[ld.lossReason] || 0) + 1;
        }
      }

      // Sources
      const src = ld.source || 'DIRECT_SALES';
      sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
      if (src === 'INDIAMART') indiaMartCount++;

      // Machine Model
      const model = ld.machineModel || 'MHT-2100';
      machinePopularity[model] = (machinePopularity[model] || 0) + 1;

      // Stalled Alert (> 30 days old and still in active pipeline)
      if (
        new Date(ld.createdAt) < thirtyDaysAgo &&
        !['WON', 'LOST'].includes(ld.stage)
      ) {
        stalledAlerts.push({
          _id: ld._id,
          leadNumber: ld.leadNumber,
          customerName: ld.customerName,
          companyName: ld.companyName,
          stage: ld.stage,
          daysOpen: Math.floor((Date.now() - new Date(ld.createdAt)) / (1000 * 60 * 60 * 24)),
          estimatedValueINR: val
        });
      }
    });

    const closedDeals = totalWon + totalLost;
    const winRatePercent = closedDeals > 0 ? Math.round((totalWon / closedDeals) * 100) : 0;
    const avgDealSizeINR = totalWon > 0 ? Math.round(wonValueINR / totalWon) : Math.round(openPipelineValueINR / (totalLeads || 1));

    // Sort stalled alerts by oldest first, top 10
    stalledAlerts.sort((a, b) => b.daysOpen - a.daysOpen);

    res.status(200).json({
      success: true,
      metrics: {
        totalLeads,
        openPipelineValueINR,
        wonValueINR,
        winRatePercent,
        avgDealSizeINR,
        indiaMartCount,
        totalQuotations: allQuotations.length
      },
      stageDistribution,
      sourceDistribution,
      lossReasons,
      machinePopularity,
      stalledAlerts: stalledAlerts.slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new single lead
 */
export const createLead = async (req, res, next) => {
  try {
    const count = await Lead.countDocuments();
    const year = new Date().getFullYear();
    const sequential = String(count + 1).padStart(4, '0');
    const leadNumber = `LD-${year}-${sequential}`;

    const products = Array.isArray(req.body.products) ? req.body.products : [];
    let calculatedEstAmount = 0;
    let estRate = Number(req.body.estimatedValue?.exchangeRate || 1.0);
    let estCurrency = req.body.estimatedValue?.currency || 'INR';

    if (products.length > 0) {
      products.forEach((p) => {
        const lineTotal = Number(p.lineTotal?.amount || (Number(p.quantity || 1) * Number(p.unitPrice?.amount || p.unitPrice || 0)));
        calculatedEstAmount += lineTotal;
      });
    }

    const estAmount = calculatedEstAmount > 0 
      ? calculatedEstAmount 
      : Number(req.body.estimatedValue?.amount || req.body.estimatedValue || 250000);

    const primaryMachineModel = products.length > 0 
      ? products.map(p => p.modelCode || p.modelName).join(', ') 
      : (req.body.machineModel || 'MHT-2100');

    const lead = new Lead({
      ...req.body,
      leadNumber,
      machineModel: primaryMachineModel,
      products,
      estimatedValue: {
        currency: estCurrency,
        amount: estAmount,
        exchangeRate: estRate,
        baseAmountINR: Math.round(estAmount * estRate)
      },
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    await lead.save();

    await logAuditEvent({
      req,
      action: 'LEAD_CREATED',
      module: 'crm',
      entityId: lead._id,
      entityType: 'Lead',
      notes: `Lead ${leadNumber} created for ${lead.companyName} (${lead.customerName})`
    });

    res.status(201).json({ success: true, message: 'Lead created successfully.', lead });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a lead by ID
 */
export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    if (req.body.estimatedValue) {
      const estAmount = Number(req.body.estimatedValue?.amount || req.body.estimatedValue || 0);
      const estRate = Number(req.body.estimatedValue?.exchangeRate || lead.estimatedValue?.exchangeRate || 1.0);
      const estCurrency = req.body.estimatedValue?.currency || lead.estimatedValue?.currency || 'INR';
      req.body.estimatedValue = {
        currency: estCurrency,
        amount: estAmount,
        exchangeRate: estRate,
        baseAmountINR: Math.round(estAmount * estRate)
      };
    }

    Object.assign(lead, req.body);
    lead.updatedBy = req.user?._id;
    await lead.save();

    res.status(200).json({ success: true, message: 'Lead updated successfully.', lead });
  } catch (error) {
    next(error);
  }
};

/**
 * Update lead stage (Kanban drag-and-drop or pipeline step)
 */
export const updateLeadStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lossReason, notes } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const previousStage = lead.stage;
    lead.stage = stage;
    if (stage === 'LOST' && lossReason) {
      lead.lossReason = lossReason;
    }
    if (notes) {
      lead.notes = lead.notes ? `${lead.notes}\n[${new Date().toLocaleDateString()}] ${notes}` : notes;
    }
    lead.updatedBy = req.user?._id;
    await lead.save();

    await logAuditEvent({
      req,
      action: 'LEAD_STAGE_CHANGED',
      module: 'crm',
      entityId: lead._id,
      entityType: 'Lead',
      notes: `Lead ${lead.leadNumber} transitioned from ${previousStage} to ${stage}`
    });

    res.status(200).json({ success: true, message: `Lead moved to ${stage}.`, lead });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk Import Leads with Dry-Run Validation and IndiaMART Auto-Mapping
 */
export const bulkImportLeads = async (req, res, next) => {
  try {
    const rawRows = req.body.rows || req.body.leads || (Array.isArray(req.body) ? req.body : []);
    const dryRun = req.body.dryRun === true || req.body.dryRun === 'true';
    const defaultSource = req.body.defaultSource || 'INDIAMART';

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bulk import payload. Expected a non-empty array of rows.'
      });
    }

    // Pre-fetch existing emails, phones, and queryIds to detect duplicates in one fast query
    const existingLeads = await Lead.find(
      {},
      { contactEmail: 1, contactPhone: 1, queryId: 1, leadNumber: 1 }
    ).lean();

    const existingEmails = new Set(existingLeads.map((l) => (l.contactEmail || '').toLowerCase()).filter(Boolean));
    const existingPhones = new Set(existingLeads.map((l) => (l.contactPhone || '').replace(/\D/g, '')).filter(Boolean));
    const existingQueryIds = new Set(existingLeads.map((l) => (l.queryId || '').trim()).filter(Boolean));

    const batchEmails = new Set();
    const batchPhones = new Set();
    const batchQueryIds = new Set();

    const preview = [];
    const validLeadsToInsert = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    let currentCount = await Lead.countDocuments();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // IndiaMART, Excel template with asterisks (*), and generic column mapping
      const customerName = (
        row['Customer Name *'] ||
        row['Customer Name'] ||
        row['Sender Name *'] ||
        row['Sender Name'] ||
        row.customerName ||
        row.Name ||
        row['Contact Name *'] ||
        row['Contact Name'] ||
        ''
      ).trim();

      const companyName = (
        row['Company Name *'] ||
        row['Company Name'] ||
        row.companyName ||
        row.Company ||
        customerName ||
        'Proprietorship'
      ).trim();

      const rawPhone = String(
        row['Mobile / Phone *'] ||
        row['Mobile / Phone'] ||
        row['Mobile *'] ||
        row.Mobile ||
        row['Phone *'] ||
        row.Phone ||
        row.contactPhone ||
        row['Mobile No'] ||
        row['Mobile Number'] ||
        ''
      ).trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');

      const contactEmail = (
        row['Contact Email'] ||
        row['Contact Email *'] ||
        row['Email'] ||
        row['Email *'] ||
        row.contactEmail ||
        row['Sender Email'] ||
        ''
      ).toLowerCase().trim();

      const queryId = String(
        row['Query ID (Optional)'] ||
        row['Query ID'] ||
        row.queryId ||
        row['Inquiry ID'] ||
        ''
      ).trim();

      const machineRequirement = (
        row['Machine / Product Name *'] ||
        row['Machine / Product Name'] ||
        row['Product Name *'] ||
        row['Product Name'] ||
        row.machineRequirement ||
        row['Subject'] ||
        row.Requirement ||
        'Coil Winding Machine Inquiry'
      ).trim();

      const city = (row['City'] || row.city || 'Bengaluru').trim();
      const country = (row['Country'] || row.country || 'India').trim();
      const source = (row['Source'] || row.source || defaultSource).trim();
      const estValue = Number(row['Estimated Value (₹)'] || row['Estimated Value'] || row.estimatedValue || 250000);

      // Validation for compulsory fields
      const errors = [];
      if (!customerName) errors.push('Customer Name * is compulsory.');
      if (!companyName) errors.push('Company Name * is compulsory.');
      if (!rawPhone && !contactEmail) errors.push('Mobile / Phone * is compulsory.');
      if (!machineRequirement) errors.push('Machine / Product Name * is compulsory.');

      // Duplicate detection
      let isDuplicate = false;
      let duplicateReason = '';

      if (cleanPhone && (existingPhones.has(cleanPhone) || batchPhones.has(cleanPhone))) {
        isDuplicate = true;
        duplicateReason = `Duplicate phone number: ${rawPhone}`;
      } else if (contactEmail && (existingEmails.has(contactEmail) || batchEmails.has(contactEmail))) {
        isDuplicate = true;
        duplicateReason = `Duplicate email address: ${contactEmail}`;
      } else if (queryId && (existingQueryIds.has(queryId) || batchQueryIds.has(queryId))) {
        isDuplicate = true;
        duplicateReason = `Duplicate Query ID: ${queryId}`;
      }

      if (errors.length > 0) {
        invalidCount++;
        preview.push({
          rowNumber: i + 1,
          customerName: customerName || '—',
          companyName: companyName || '—',
          contactPhone: rawPhone || '—',
          contactEmail: contactEmail || '—',
          machineRequirement: machineRequirement || '—',
          status: 'INVALID',
          message: errors.join(' ')
        });
      } else if (isDuplicate) {
        duplicateCount++;
        preview.push({
          rowNumber: i + 1,
          customerName,
          companyName,
          contactPhone: rawPhone,
          contactEmail,
          machineRequirement,
          status: 'DUPLICATE',
          message: duplicateReason
        });
      } else {
        validCount++;
        if (cleanPhone) batchPhones.add(cleanPhone);
        if (contactEmail) batchEmails.add(contactEmail);
        if (queryId) batchQueryIds.add(queryId);

        currentCount++;
        const leadNumber = `LD-${currentYear}-${String(currentCount).padStart(4, '0')}`;

        const validRecord = {
          leadNumber,
          queryId: queryId || undefined,
          source,
          customerName,
          companyName,
          contactPhone: rawPhone,
          contactEmail: contactEmail || `inquiry.${cleanPhone || Date.now()}@example.com`,
          city,
          country,
          machineModel: row.machineModel || 'MHT-2100',
          machineRequirement,
          estimatedValue: {
            currency: 'INR',
            amount: estValue,
            exchangeRate: 1.0,
            baseAmountINR: estValue
          },
          priority: row.priority || 'MEDIUM',
          stage: 'NEW',
          status: 'NEW',
          createdBy: req.user?._id,
          updatedBy: req.user?._id
        };

        validLeadsToInsert.push(validRecord);
        preview.push({
          rowNumber: i + 1,
          customerName,
          companyName,
          contactPhone: rawPhone,
          contactEmail,
          status: 'VALID',
          assignedLeadNumber: leadNumber,
          message: 'Ready for insertion'
        });
      }
    }

    if (dryRun) {
      return res.status(200).json({
        success: true,
        dryRun: true,
        summary: {
          totalRows: rawRows.length,
          totalProcessed: rawRows.length,
          validCount,
          duplicateCount,
          invalidCount
        },
        preview
      });
    }

    // Commit to database
    if (validLeadsToInsert.length > 0) {
      const inserted = await Lead.insertMany(validLeadsToInsert);

      await logAuditEvent({
        req,
        action: 'LEADS_BULK_IMPORTED',
        module: 'crm',
        entityId: inserted[0]._id,
        entityType: 'Lead',
        notes: `Bulk imported ${inserted.length} leads from ${defaultSource}. Duplicates skipped: ${duplicateCount}, Invalid: ${invalidCount}`
      });

      return res.status(201).json({
        success: true,
        dryRun: false,
        message: `Successfully imported ${inserted.length} new leads.`,
        summary: {
          totalRows: rawRows.length,
          totalProcessed: rawRows.length,
          importedCount: inserted.length,
          validCount: inserted.length,
          duplicateCount,
          invalidCount
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        dryRun: false,
        message: 'No valid rows found to import. All rows were either duplicates or invalid.'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lead
 */
export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    await Lead.findByIdAndDelete(id);

    await logAuditEvent({
      req,
      action: 'LEAD_DELETED',
      module: 'crm',
      entityId: lead._id,
      entityType: 'Lead',
      notes: `Lead ${lead.leadNumber} (${lead.companyName}) removed.`
    });

    res.status(200).json({ success: true, message: 'Lead removed successfully.' });
  } catch (error) {
    next(error);
  }
};
