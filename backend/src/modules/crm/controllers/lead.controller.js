import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { ensureCrmMasterConfig, DEFAULT_CRM_PREFIX_LOCK_POLICY } from './crmMaster.controller.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

const leadInclude = {
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  },
  updatedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, department: true }
  },
  followUpNotes: {
    orderBy: { createdAt: 'desc' }
  },
  stageHistory: {
    orderBy: { createdAt: 'desc' }
  }
};

const formatLead = (lead) => {
  if (!lead) return null;
  const createdByName = lead.createdBy
    ? `${lead.createdBy.firstName} ${lead.createdBy.lastName}`.trim()
    : lead.createdByName || 'System';
  const updatedByName = lead.updatedBy
    ? `${lead.updatedBy.firstName} ${lead.updatedBy.lastName}`.trim()
    : lead.updatedByName || createdByName;

  const estVal =
    typeof lead.estimatedValue === 'object' && lead.estimatedValue !== null
      ? lead.estimatedValue
      : { currency: 'INR', amount: Number(lead.estimatedValue || 0), exchangeRate: 1, baseAmountINR: Number(lead.estimatedValue || 0) };

  return {
    ...lead,
    _id: lead.id,
    email: lead.contactEmail,
    phone: lead.contactPhone,
    estimatedValueINR: estVal.baseAmountINR ?? estVal.amount ?? 0,
    createdByName,
    updatedByName,
    assignedTo: lead.assignedTo
      ? {
          _id: lead.assignedTo.id,
          id: lead.assignedTo.id,
          firstName: lead.assignedTo.firstName,
          lastName: lead.assignedTo.lastName,
          email: lead.assignedTo.email
        }
      : null,
    createdBy: lead.createdBy
      ? {
          _id: lead.createdBy.id,
          id: lead.createdBy.id,
          name: `${lead.createdBy.firstName} ${lead.createdBy.lastName}`.trim(),
          email: lead.createdBy.email
        }
      : { _id: lead.createdById || '', id: lead.createdById || '', name: createdByName, email: '' },
    updatedBy: lead.updatedBy
      ? {
          _id: lead.updatedBy.id,
          id: lead.updatedBy.id,
          name: `${lead.updatedBy.firstName} ${lead.updatedBy.lastName}`.trim(),
          email: lead.updatedBy.email
        }
      : { _id: lead.updatedById || '', id: lead.updatedById || '', name: updatedByName, email: '' },
    followUpNotes: (lead.followUpNotes || []).map((n) => ({ ...n, _id: n.id })),
    stageHistory: (lead.stageHistory || []).map((h) => ({ ...h, _id: h.id }))
  };
};

/**
 * Generates sequential Enquiry / Lead Number using configured prefix in CRM Masters
 */
async function generateNextLeadNumber(user) {
  const config = await ensureCrmMasterConfig(user);
  const policy = {
    ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
    ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
  };
  const prefix = (policy.enquiryPrefix || 'ENQ-').trim().toUpperCase();
  const startSeq = Number(policy.enquiryStartSeq) || 1001;
  const year = new Date().getFullYear();

  const count = await prisma.lead.count();
  const nextNum = Math.max(startSeq + count, count + 1);
  return `${prefix}${year}-${String(nextNum).padStart(4, '0')}`;
}

/**
 * GET /api/v1/crm/leads
 */
export const getLeads = async (req, res, next) => {
  try {
    const { stage, status, priority, source, machineModel, search, page = 1, limit = 100 } = req.query;
    const where = {};

    if (stage && stage !== 'ALL') where.stage = stage;
    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;
    if (source && source !== 'ALL') where.source = source;
    if (machineModel && machineModel !== 'ALL') where.machineModel = { contains: machineModel, mode: 'insensitive' };

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { leadNumber: { contains: s, mode: 'insensitive' } },
        { customerName: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { contactPhone: { contains: s, mode: 'insensitive' } },
        { contactEmail: { contains: s, mode: 'insensitive' } },
        { queryId: { contains: s, mode: 'insensitive' } },
        { machineRequirement: { contains: s, mode: 'insensitive' } }
      ];
    }

    const p = Math.max(1, Number(page) || 1);
    const l = Math.max(1, Number(limit) || 100);

    const [total, rawLeads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * l,
        take: l
      })
    ]);

    res.status(200).json({
      success: true,
      total,
      page: p,
      leads: rawLeads.map(formatLead)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/crm/leads/overview
 */
export const getCrmOverview = async (req, res, next) => {
  try {
    const { dateScope, fromDate, toDate, assignedTo, source } = req.query;
    const leadWhere = {};
    const quoteWhere = { isLatestRevision: true };

    if (assignedTo && assignedTo !== 'ALL' && UUID_REGEX.test(assignedTo)) {
      leadWhere.assignedToId = assignedTo;
      quoteWhere.createdById = assignedTo;
    }

    if (source && source !== 'ALL') {
      leadWhere.source = source;
    }

    const now = new Date();
    let start, end;

    if (fromDate && toDate) {
      start = new Date(fromDate);
      end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
    } else if (dateScope === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateScope === 'this_week') {
      const day = now.getDay() || 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
      end = new Date();
    } else if (dateScope === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date();
    }

    if (start && end) {
      leadWhere.createdAt = { gte: start, lte: end };
      quoteWhere.createdAt = { gte: start, lte: end };
    }

    const [allLeads, allQuotations] = await Promise.all([
      prisma.lead.findMany({ where: leadWhere, include: leadInclude }),
      prisma.quotation.findMany({ where: quoteWhere })
    ]);

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
      IN_PRODUCTION: 0,
      DISPATCHED: 0,
      LOST: 0
    };

    const sourceDistribution = {};
    const lossReasons = {};
    const machinePopularity = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const stalledAlerts = [];

    allLeads.forEach((ld) => {
      const st = ld.stage === 'QUOTATION_PREPARED' ? 'QUOTE_PREPARED' : ld.stage;
      if (stageDistribution[st] !== undefined) {
        stageDistribution[st]++;
      } else {
        stageDistribution.NEW++;
      }

      const val = Number(ld.estimatedValue?.baseAmountINR ?? ld.estimatedValue?.amount ?? 0);
      if (['NEW', 'CONTACTED', 'TECHNICAL_REVIEW', 'QUOTE_PREPARED', 'QUOTATION_PREPARED', 'NEGOTIATION'].includes(ld.stage)) {
        openPipelineValueINR += val;
      }
      if (['WON', 'IN_PRODUCTION', 'DISPATCHED'].includes(ld.stage)) {
        wonValueINR += val;
        totalWon++;
      }
      if (ld.stage === 'LOST') {
        totalLost++;
        if (ld.lossReason) {
          lossReasons[ld.lossReason] = (lossReasons[ld.lossReason] || 0) + 1;
        }
      }

      const src = ld.source || 'DIRECT_SALES';
      sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
      if (src === 'INDIAMART') indiaMartCount++;

      const model = ld.machineModel || 'MHT-2100';
      machinePopularity[model] = (machinePopularity[model] || 0) + 1;

      if (new Date(ld.createdAt) < thirtyDaysAgo && !['WON', 'IN_PRODUCTION', 'DISPATCHED', 'LOST'].includes(ld.stage)) {
        stalledAlerts.push({
          _id: ld.id,
          leadNumber: ld.leadNumber,
          customerName: ld.customerName,
          companyName: ld.companyName,
          stage: ld.stage,
          daysOpen: Math.floor((Date.now() - new Date(ld.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          estimatedValueINR: val
        });
      }
    });

    const closedDeals = totalWon + totalLost;
    const winRatePercent = closedDeals > 0 ? Math.round((totalWon / closedDeals) * 100) : 0;
    const avgDealSizeINR =
      totalWon > 0 ? Math.round(wonValueINR / totalWon) : Math.round(openPipelineValueINR / (totalLeads || 1));

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
 * POST /api/v1/crm/leads
 */
export const createLead = async (req, res, next) => {
  try {
    const body = req.body;
    const actorName = getActorName(req.user);
    const leadNumber = await generateNextLeadNumber(req.user);

    const products = Array.isArray(body.products) ? body.products : [];
    let calculatedEstAmount = 0;
    const estRate = Number(body.estimatedValue?.exchangeRate || 1.0);
    const estCurrency = body.estimatedValue?.currency || 'INR';

    if (products.length > 0) {
      products.forEach((p) => {
        const lineTotal = Number(
          p.lineTotal?.amount ?? p.lineTotal ?? Number(p.quantity || 1) * Number(p.unitPrice?.amount ?? p.unitPrice ?? 0)
        );
        calculatedEstAmount += lineTotal;
      });
    }

    const estAmount =
      calculatedEstAmount > 0
        ? calculatedEstAmount
        : Number(body.estimatedValue?.amount ?? body.estimatedValueINR ?? body.estimatedValue ?? 250000);

    const primaryMachineModel =
      products.length > 0
        ? products.map((p) => p.modelCode || p.modelName).join(', ')
        : body.machineModel || 'MHT-2100';

    const initialStage = body.stage || 'NEW';
    const initialNote = (body.notes || '').trim();

    const newLead = await prisma.lead.create({
      data: {
        leadNumber,
        queryId: body.queryId || null,
        source: body.source || 'DIRECT_SALES',
        customerName: (body.customerName || body.companyName || 'Client').trim(),
        companyName: (body.companyName || body.customerName || 'Company').trim(),
        contactPhone: (body.contactPhone || body.phone || '').trim(),
        contactEmail: (body.contactEmail || body.email || '').trim().toLowerCase(),
        city: (body.city || 'Bengaluru').trim(),
        state: (body.state || 'Karnataka').trim(),
        country: (body.country || 'India').trim(),
        gstin: (body.gstin || '').trim().toUpperCase(),
        machineModel: primaryMachineModel,
        machineRequirement: (body.machineRequirement || primaryMachineModel).trim(),
        products,
        estimatedValue: {
          currency: estCurrency,
          amount: estAmount,
          exchangeRate: estRate,
          baseAmountINR: Math.round(estAmount * estRate)
        },
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(body.priority) ? body.priority : 'MEDIUM',
        stage: initialStage,
        status: 'NEW',
        notes: initialNote,
        assignedToId:
          body.assignedTo && UUID_REGEX.test(String(body.assignedTo)) ? String(body.assignedTo) : req.user?.id || null,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName,
        ...(initialNote
          ? {
              followUpNotes: {
                create: [
                  {
                    stage: initialStage,
                    note: initialNote,
                    createdById: req.user?.id || null,
                    createdByName: actorName,
                    updatedById: req.user?.id || null,
                    updatedByName: actorName
                  }
                ]
              }
            }
          : {}),
        stageHistory: {
          create: [
            {
              fromStage: 'ENQUIRY_CREATED',
              toStage: initialStage,
              note: initialNote || 'Enquiry registered in CRM.',
              createdById: req.user?.id || null,
              createdByName: actorName,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          ]
        }
      },
      include: leadInclude
    });

    await logAuditEvent({
      req,
      action: 'LEAD_CREATED',
      module: 'crm',
      entityId: newLead.id,
      entityType: 'Lead',
      notes: `Enquiry ${leadNumber} created for ${newLead.companyName} (${newLead.customerName}).`
    });

    res.status(201).json({
      success: true,
      message: `All set! Enquiry "${leadNumber}" created successfully.`,
      lead: formatLead(newLead)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/crm/leads/:id
 */
export const updateLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const config = await ensureCrmMasterConfig(req.user);
    const policy = {
      ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    if (
      (existing.isLocked ||
        (policy.lockEnquiryOnPoReceived && ['WON', 'IN_PRODUCTION', 'DISPATCHED'].includes(existing.stage))) &&
      !req.user?.isSuperAdmin
    ) {
      return res.status(400).json({
        success: false,
        message: 'Just a heads up: this enquiry is locked by CRM Lock Policy because a PO is already received.'
      });
    }

    const body = req.body;
    const actorName = getActorName(req.user);

    let estimatedValue = existing.estimatedValue;
    if (body.estimatedValue !== undefined || body.estimatedValueINR !== undefined) {
      const estAmount = Number(body.estimatedValue?.amount ?? body.estimatedValueINR ?? body.estimatedValue ?? 0);
      const estRate = Number(body.estimatedValue?.exchangeRate ?? existing.estimatedValue?.exchangeRate ?? 1.0);
      const estCurrency = body.estimatedValue?.currency ?? existing.estimatedValue?.currency ?? 'INR';
      estimatedValue = {
        currency: estCurrency,
        amount: estAmount,
        exchangeRate: estRate,
        baseAmountINR: Math.round(estAmount * estRate)
      };
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        customerName: body.customerName !== undefined ? body.customerName.trim() : existing.customerName,
        companyName: body.companyName !== undefined ? body.companyName.trim() : existing.companyName,
        contactPhone:
          body.contactPhone !== undefined
            ? body.contactPhone.trim()
            : body.phone !== undefined
            ? body.phone.trim()
            : existing.contactPhone,
        contactEmail:
          body.contactEmail !== undefined
            ? body.contactEmail.trim().toLowerCase()
            : body.email !== undefined
            ? body.email.trim().toLowerCase()
            : existing.contactEmail,
        city: body.city ?? existing.city,
        state: body.state ?? existing.state,
        country: body.country ?? existing.country,
        gstin: body.gstin !== undefined ? body.gstin.trim().toUpperCase() : existing.gstin,
        source: body.source ?? existing.source,
        machineModel: body.machineModel ?? existing.machineModel,
        machineRequirement: body.machineRequirement ?? existing.machineRequirement,
        products: Array.isArray(body.products) ? body.products : existing.products,
        estimatedValue,
        priority: body.priority ?? existing.priority,
        notes: body.notes ?? existing.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: leadInclude
    });

    res.status(200).json({
      success: true,
      message: 'Great! Enquiry details updated.',
      lead: formatLead(updated)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/crm/leads/:id/stage
 * Moves Enquiry across Kanban stages ("Enquiry to Dispatch") with mandatory transition note & stage history log
 */
export const updateLeadStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage, lossReason = '', notes = '', transitionNote = '' } = req.body;

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const config = await ensureCrmMasterConfig(req.user);
    const policy = {
      ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const cleanNote = String(notes || transitionNote || '').trim();
    if (policy.requireNoteOnStageChange && existing.stage !== stage && !cleanNote && !lossReason) {
      return res.status(400).json({
        success: false,
        message: 'Please add a stage transition note before moving this enquiry to the next stage.'
      });
    }

    const actorName = getActorName(req.user);
    const previousStage = existing.stage;
    const finalNote = cleanNote || (lossReason ? `Lost Reason: ${lossReason}` : `Moved from ${previousStage} to ${stage}`);

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        stage,
        ...(stage === 'LOST' && lossReason ? { lossReason } : {}),
        notes: existing.notes
          ? `${existing.notes}\n[${new Date().toLocaleDateString('en-IN')} - ${actorName}] (${stage}): ${finalNote}`
          : `[${new Date().toLocaleDateString('en-IN')} - ${actorName}] (${stage}): ${finalNote}`,
        isLocked: policy.lockEnquiryOnPoReceived && ['WON', 'IN_PRODUCTION', 'DISPATCHED'].includes(stage),
        updatedById: req.user?.id || null,
        updatedByName: actorName,
        stageHistory: {
          create: [
            {
              fromStage: previousStage,
              toStage: stage,
              note: finalNote,
              lossReason: stage === 'LOST' ? lossReason : '',
              createdById: req.user?.id || null,
              createdByName: actorName,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          ]
        },
        followUpNotes: {
          create: [
            {
              stage,
              note: `[Stage Moved: ${previousStage} → ${stage}] ${finalNote}`,
              createdById: req.user?.id || null,
              createdByName: actorName,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          ]
        }
      },
      include: leadInclude
    });

    await logAuditEvent({
      req,
      action: 'LEAD_STAGE_CHANGED',
      module: 'crm',
      entityId: updated.id,
      entityType: 'Lead',
      beforeData: { stage: previousStage },
      afterData: { stage, note: finalNote },
      notes: `Enquiry ${updated.leadNumber} moved from ${previousStage} to ${stage} by ${actorName}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Enquiry moved to ${stage}.`,
      lead: formatLead(updated)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/leads/:id/notes
 * Adds an unlimited Follow-Up Note inside the current Kanban stage with timestamp & user name
 */
export const addLeadFollowUpNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, nextFollowUp } = req.body;

    const cleanNote = String(note || '').trim();
    if (!cleanNote) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a follow-up note.'
      });
    }

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    const actorName = getActorName(req.user);

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        notes: existing.notes
          ? `${existing.notes}\n[${new Date().toLocaleDateString('en-IN')} - ${actorName}] (${existing.stage}): ${cleanNote}`
          : `[${new Date().toLocaleDateString('en-IN')} - ${actorName}] (${existing.stage}): ${cleanNote}`,
        updatedById: req.user?.id || null,
        updatedByName: actorName,
        followUpNotes: {
          create: [
            {
              stage: existing.stage,
              note: cleanNote,
              nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
              createdById: req.user?.id || null,
              createdByName: actorName,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          ]
        }
      },
      include: leadInclude
    });

    res.status(201).json({
      success: true,
      message: 'All set! Follow-up note logged.',
      lead: formatLead(updated)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/crm/leads/bulk-import
 */
export const bulkImportLeads = async (req, res, next) => {
  try {
    const rawRows = req.body.rows || req.body.leads || (Array.isArray(req.body) ? req.body : []);
    const dryRun = req.body.dryRun === true || req.body.dryRun === 'true';
    const defaultSource = req.body.defaultSource || 'INDIAMART';
    const actorName = getActorName(req.user);

    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No enquiry rows found in the uploaded file.'
      });
    }

    const config = await ensureCrmMasterConfig(req.user);
    const policy = {
      ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };
    const prefix = (policy.enquiryPrefix || 'ENQ-').trim().toUpperCase();
    const startSeq = Number(policy.enquiryStartSeq) || 1001;

    const existingLeads = await prisma.lead.findMany({
      select: { contactEmail: true, contactPhone: true, queryId: true }
    });

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

    let currentCount = await prisma.lead.count();
    const currentYear = new Date().getFullYear();

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      const customerName = String(
        row['Customer Name *'] ||
          row['Customer Name'] ||
          row['Sender Name *'] ||
          row['Sender Name'] ||
          row.customerName ||
          row.Name ||
          row['Contact Name'] ||
          ''
      ).trim();

      const companyName = String(
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
          ''
      ).trim();
      const cleanPhone = rawPhone.replace(/\D/g, '');

      const contactEmail = String(
        row['Contact Email'] || row['Email'] || row.contactEmail || row['Sender Email'] || ''
      )
        .toLowerCase()
        .trim();

      const queryId = String(row['Query ID (Optional)'] || row['Query ID'] || row.queryId || '').trim();

      const machineRequirement = String(
        row['Machine / Product Name *'] ||
          row['Machine / Product Name'] ||
          row['Product Name'] ||
          row.machineRequirement ||
          row['Subject'] ||
          'Coil Winding Machine Inquiry'
      ).trim();

      const city = String(row['City'] || row.city || 'Bengaluru').trim();
      const country = String(row['Country'] || row.country || 'India').trim();
      const source = String(row['Source'] || row.source || defaultSource).trim();
      const estValue = Number(row['Estimated Value (₹)'] || row['Estimated Value'] || row.estimatedValue || 250000);

      const errors = [];
      if (!customerName) errors.push('Customer Name is required.');
      if (!companyName) errors.push('Company Name is required.');
      if (!rawPhone && !contactEmail) errors.push('Mobile / Phone or Email is required.');

      let isDuplicate = false;
      let duplicateReason = '';

      if (cleanPhone && (existingPhones.has(cleanPhone) || batchPhones.has(cleanPhone))) {
        isDuplicate = true;
        duplicateReason = `Duplicate phone: ${rawPhone}`;
      } else if (contactEmail && (existingEmails.has(contactEmail) || batchEmails.has(contactEmail))) {
        isDuplicate = true;
        duplicateReason = `Duplicate email: ${contactEmail}`;
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
          machineRequirement,
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
        const nextNum = Math.max(startSeq + currentCount - 1, currentCount);
        const leadNumber = `${prefix}${currentYear}-${String(nextNum).padStart(4, '0')}`;

        validLeadsToInsert.push({
          leadNumber,
          queryId: queryId || null,
          source,
          customerName,
          companyName,
          contactPhone: rawPhone,
          contactEmail: contactEmail || '',
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
          priority: 'MEDIUM',
          stage: 'NEW',
          status: 'NEW',
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        });

        preview.push({
          rowNumber: i + 1,
          customerName,
          companyName,
          contactPhone: rawPhone,
          contactEmail,
          status: 'VALID',
          assignedLeadNumber: leadNumber,
          message: 'Ready for import'
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

    if (validLeadsToInsert.length > 0) {
      await prisma.lead.createMany({ data: validLeadsToInsert });

      await logAuditEvent({
        req,
        action: 'LEADS_BULK_IMPORTED',
        module: 'crm',
        entityId: validLeadsToInsert[0].leadNumber,
        entityType: 'Lead',
        notes: `Bulk imported ${validLeadsToInsert.length} enquiries.`
      });

      return res.status(201).json({
        success: true,
        dryRun: false,
        message: `All set! Imported ${validLeadsToInsert.length} new enquiries successfully.`,
        summary: {
          totalRows: rawRows.length,
          totalProcessed: rawRows.length,
          importedCount: validLeadsToInsert.length,
          validCount: validLeadsToInsert.length,
          duplicateCount,
          invalidCount
        }
      });
    }

    return res.status(400).json({
      success: false,
      dryRun: false,
      message: 'No valid rows found to import.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/crm/leads/:id
 */
export const deleteLead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Enquiry not found.' });
    }

    await prisma.lead.delete({ where: { id } });

    await logAuditEvent({
      req,
      action: 'LEAD_DELETED',
      module: 'crm',
      entityId: id,
      entityType: 'Lead',
      notes: `Enquiry ${existing.leadNumber} (${existing.companyName}) removed.`
    });

    res.status(200).json({
      success: true,
      message: `Enquiry "${existing.leadNumber}" removed.`
    });
  } catch (error) {
    next(error);
  }
};
