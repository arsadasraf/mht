import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import {
  ensureDefaultStageMasters,
  ensureProjectSetupConfig,
  DEFAULT_PROJECT_SETUP_POLICY
} from './stageMaster.controller.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatSubStage = (ss) => ({
  ...ss,
  _id: ss.id
});

export const formatMilestone = (m) => ({
  ...m,
  _id: m.id,
  notes: m.notes || '',
  remarks: Array.isArray(m.remarks) ? m.remarks : [],
  subStages: Array.isArray(m.subStages) ? m.subStages.map(formatSubStage) : [],
  signOffBy: m.signOffByName
    ? {
        _id: m.signOffById,
        firstName: m.signOffByName.split(' ')[0] || m.signOffByName,
        lastName: m.signOffByName.split(' ').slice(1).join(' ') || ''
      }
    : null
});

export const computeBomSummaryHelper = (items = [], attachedDrawings = [], rawSummary = {}) => {
  let assemblyCount = 0;
  let subAssemblyCount = 0;
  let componentCount = 0;
  let buyCount = 0;
  let makeCount = 0;
  let drawingsCount = attachedDrawings.length;
  let estimatedTotalCostINR = 0;

  for (const it of items) {
    const t = String(it.itemType || it.classification || '').toUpperCase();
    if (t === 'ASSEMBLY' || t === 'FG') assemblyCount++;
    else if (t === 'SUB_ASSEMBLY') subAssemblyCount++;
    else componentCount++;

    const mob = String(it.makeOrBuy || '').toUpperCase();
    if (mob === 'BUY') buyCount++;
    else makeCount++;

    const qty = Number(it.quantityPerMachine || it.baseQty) || 1;
    const rate = Number(it.standardRateINR || it.rate || it.unitRate) || 0;
    estimatedTotalCostINR += qty * rate;
  }

  return {
    totalItems: items.length,
    assemblyCount,
    subAssemblyCount,
    componentCount,
    buyCount,
    makeCount,
    drawingsCount: Math.max(drawingsCount, Number(rawSummary?.drawingsCount) || 0),
    estimatedTotalCostINR:
      Math.round(estimatedTotalCostINR * 100) / 100 || Number(rawSummary?.estimatedTotalCostINR) || 0,
    ...(typeof rawSummary === 'object' && rawSummary !== null ? rawSummary : {}),
    attachedDrawings
  };
};

export const resolveAttachedDrawings = (bomDoc, bomItems = []) => {
  if (!bomDoc) return [];
  const rawList =
    Array.isArray(bomDoc.attachedDrawings) && bomDoc.attachedDrawings.length > 0
      ? bomDoc.attachedDrawings
      : Array.isArray(bomDoc.summary?.attachedDrawings) && bomDoc.summary.attachedDrawings.length > 0
      ? bomDoc.summary.attachedDrawings
      : [];

  if (rawList.length > 0) return rawList;

  const synthesized = [];
  const seenCodes = new Set();

  if (bomDoc.attachedAssemblyCode || bomDoc.attachedDrawingNumber) {
    const code = bomDoc.attachedAssemblyCode || bomDoc.attachedDrawingNumber;
    seenCodes.add(String(code).toUpperCase());
    synthesized.push({
      id: bomDoc.id,
      itemCode: code,
      drawingNumber: bomDoc.attachedDrawingNumber || code,
      itemName: bomDoc.attachedAssemblyName || code,
      classification: bomDoc.attachedDrawingType || 'ASSEMBLY',
      revision: bomDoc.revision || 'REV-0',
      approvalStatus: bomDoc.approvalStatus || (bomDoc.isFrozen ? 'APPROVED' : 'DRAFT'),
      isFrozen: Boolean(bomDoc.isFrozen)
    });
  }

  for (const it of bomItems) {
    const code = it.drawingNumber || it.itemCode;
    const type = String(it.itemType || it.classification || '').toUpperCase();
    if (code && (type === 'ASSEMBLY' || type === 'SUB_ASSEMBLY') && !seenCodes.has(String(code).toUpperCase())) {
      seenCodes.add(String(code).toUpperCase());
      synthesized.push({
        id: it.id || code,
        itemCode: code,
        drawingNumber: code,
        itemName: it.itemName || code,
        classification: type,
        revision: it.versionCode || it.revision || bomDoc.revision || 'REV-0',
        approvalStatus: bomDoc.approvalStatus || (bomDoc.isFrozen ? 'APPROVED' : 'DRAFT'),
        isFrozen: Boolean(bomDoc.isFrozen),
        primaryPdfUrl: it.drawingPdfUrl || it.primaryPdfUrl || ''
      });
    }
  }

  return synthesized;
};

export const formatProject = (p, poDoc = null, bomDoc = null, rateLookupMap = null) => {
  const rawBomItems = Array.isArray(bomDoc?.items) ? bomDoc.items : [];
  const bomItems = rateLookupMap
    ? rawBomItems.map((it) => {
        const currentRate = Number(it.standardRateINR || it.rate || it.unitRate || 0);
        if (currentRate > 0) return it;
        const code = String(it.itemCode || it.drawingNumber || '').trim().toUpperCase();
        const fallbackRate = code ? rateLookupMap.get(code) || 0 : 0;
        return fallbackRate > 0 ? { ...it, standardRateINR: fallbackRate } : it;
      })
    : rawBomItems;

  const attachedDrawings = resolveAttachedDrawings(bomDoc, bomItems);
  const isAttached = Boolean(
    bomDoc && (attachedDrawings.length > 0 || bomItems.length > 0 || bomDoc.attachedAssemblyCode)
  );
  const isBomLocked = Boolean(bomDoc?.isFrozen || bomDoc?.approvalStatus === 'LOCKED_FREEZE');
  const bomStatus = isBomLocked
    ? 'LOCKED_FREEZE'
    : bomDoc?.approvalStatus || (isAttached ? 'DRAFT' : 'NOT_ATTACHED');
  const computedSummary = bomDoc
    ? computeBomSummaryHelper(bomItems, attachedDrawings, bomDoc.summary)
    : null;

  return {
    ...p,
    _id: p.id,
    projectId: p.workOrderNumber || p.projectId,
    workOrderNumber: p.workOrderNumber || p.projectId,
    productDescription: p.productDescription || '',
    deliveryCommitmentDate: p.deliveryCommitmentDate || null,
    costCenter: p.contractValue?.costCenter || 'Modification',
    techSpec: p.contractValue?.techSpec || 'NA',
    poReceiptDate: poDoc?.poDate || p.contractValue?.poReceiptDate || null,
    poItems: Array.isArray(poDoc?.items) && poDoc.items.length > 0
      ? poDoc.items
      : Array.isArray(p.contractValue?.poItems)
      ? p.contractValue.poItems
      : [],
    revisions: Array.isArray(p.contractValue?.revisions) ? p.contractValue.revisions : [],
    approvedById: p.approvedById || p.contractValue?.approvedById || null,
    approvedByName: p.approvedByName || p.contractValue?.approvedByName || '',
    approvedAt: p.approvedAt || p.contractValue?.approvedAt || null,
    customerPoRef: p.customerPoNumber
      ? {
          _id: p.customerPoId,
          poNumber: p.customerPoNumber,
          poDate: poDoc?.poDate || p.contractValue?.poReceiptDate || null,
          totalAmount: p.contractValue
        }
      : null,
    milestones: Array.isArray(p.milestones) ? p.milestones.map(formatMilestone) : undefined,
    // Real-Time Global Drawing BOM & BOQ Attachment Info
    bomAttached: isAttached,
    bomStatus,
    isBomLocked,
    attachedDrawingsCount: attachedDrawings.length,
    attachedDrawings,
    bomSummary: computedSummary,
    bomItems,
    bomId: bomDoc?.id || null,
    bomNumber: bomDoc?.bomNumber || null,
    bomRevision: bomDoc?.revision || 'REV-0',
    attachedAssemblyCode: bomDoc?.attachedAssemblyCode || p.attachedAssemblyCode || '',
    attachedAssemblyName: bomDoc?.attachedAssemblyName || p.attachedAssemblyName || '',
    bomApprovedByName: bomDoc?.approvedByName || '',
    bomApprovedAt: bomDoc?.approvedAt || null
  };
};

export const generateNextWorkOrderNumber = async (policy = {}) => {
  const currentYear = new Date().getFullYear();
  const woPrefix = String(policy.workOrderPrefix || 'WO')
    .trim()
    .replace(/-+$/, '')
    .toUpperCase() || 'WO';
  const startSeq = Number(policy.workOrderStartSeq || policy.projectStartSeq) || 1001;

  const existingProjects = await prisma.project.findMany({
    select: { workOrderNumber: true, projectId: true }
  });

  let maxSeq = startSeq - 1;
  const usedNumbers = new Set();

  for (const prj of existingProjects) {
    const wo = String(prj.workOrderNumber || '').trim().toUpperCase();
    const pid = String(prj.projectId || '').trim().toUpperCase();
    if (wo) usedNumbers.add(wo);
    if (pid) usedNumbers.add(pid);

    const match = wo.match(/(\d+)$/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= startSeq && num < 1000000 && num > maxSeq) {
        maxSeq = num;
      }
    }
  }

  let nextSeq = Math.max(maxSeq + 1, startSeq + existingProjects.length);
  let candidate = `${woPrefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  while (usedNumbers.has(candidate)) {
    nextSeq++;
    candidate = `${woPrefix}-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
  }
  return candidate;
};

/**
 * Checks whether Edit or Delete is permitted under the Master Time Policy (0 to Unlimited hours).
 */
export const checkTimeWindowAllowed = (project, policy = {}, actionType = 'EDIT') => {
  const isEdit = actionType === 'EDIT';
  const mode = isEdit
    ? String(policy.editTimeLimitMode || 'UNLIMITED').toUpperCase()
    : String(policy.deleteTimeLimitMode || 'UNLIMITED').toUpperCase();

  if (mode === 'UNLIMITED') {
    return { allowed: true };
  }

  const limitHours = Number(
    isEdit ? policy.editTimeLimitHours ?? 0 : policy.deleteTimeLimitHours ?? 0
  );
  const actionLabel = isEdit ? 'editing' : 'deleting';

  if (isNaN(limitHours) || limitHours <= 0) {
    return {
      allowed: false,
      message: `Just a heads up: ${actionLabel} Work Orders is locked (0 hours time limit) per the Project Setup Master Time Policy.`
    };
  }

  const createdAtMs = project.createdAt ? new Date(project.createdAt).getTime() : Date.now();
  const elapsedHours = (Date.now() - createdAtMs) / (1000 * 60 * 60);

  if (elapsedHours > limitHours) {
    return {
      allowed: false,
      message: `Just a heads up: the ${limitHours}-hour time window for ${actionLabel} Work Order "${project.workOrderNumber}" has expired.`
    };
  }

  return { allowed: true };
};

export const getProjects = async (req, res, next) => {
  try {
    const { status, stage, search, departmentModule, approvedOnly, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status) {
      where.status = String(status);
    } else if (departmentModule || approvedOnly === 'true') {
      // Unapproved Work Orders (status === 'CREATED') must NEVER be shown in downstream department modules
      where.status = { not: 'CREATED' };
    }

    if (stage) where.currentStage = String(stage);
    if (departmentModule) {
      const mod = String(departmentModule).trim().toLowerCase();
      // For approved projects, department modules should see all active/approved Work Orders.
      // If approvedOnly is true, or if department is production/purchase/dispatch,
      // include projects whose milestones match OR projects that are active/approved in the system.
      if (approvedOnly !== 'true' && mod !== 'production' && mod !== 'purchase' && mod !== 'dispatch') {
        where.milestones = {
          some: {
            OR: [
              { departmentModule: { equals: mod, mode: 'insensitive' } },
              { stageCode: { contains: mod, mode: 'insensitive' } },
              { title: { contains: mod, mode: 'insensitive' } }
            ]
          }
        };
      }
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { projectId: { contains: q, mode: 'insensitive' } },
        { workOrderNumber: { contains: q, mode: 'insensitive' } },
        { projectName: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { machineModel: { contains: q, mode: 'insensitive' } },
        { customerPoNumber: { contains: q, mode: 'insensitive' } }
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const take = Number(limit) || 50;

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          milestones: {
            orderBy: { order: 'asc' },
            include: { subStages: { orderBy: { order: 'asc' } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    const poIds = Array.from(
      new Set(projects.map((p) => p.customerPoId).filter((id) => id && UUID_REGEX.test(String(id))))
    );
    const poMap = new Map();
    if (poIds.length > 0) {
      const pos = await prisma.customerPo
        .findMany({
          where: { id: { in: poIds } },
          include: { items: { orderBy: { slNo: 'asc' } } }
        })
        .catch(() => []);
      pos.forEach((po) => poMap.set(po.id, po));
    }

    // Batch lookup BOM & BOQ attached data for projects
    const projectKeys = Array.from(
      new Set(
        projects
          .flatMap((p) => [p.projectId, p.workOrderNumber])
          .filter(Boolean)
          .flatMap((k) => {
            const raw = String(k).trim();
            return [raw, raw.toUpperCase()];
          })
      )
    );
    const bomMap = new Map();
    if (projectKeys.length > 0) {
      const boms = await prisma.bom
        .findMany({
          where: {
            OR: [
              { projectId: { in: projectKeys } },
              { bomNumber: { in: projectKeys } }
            ]
          }
        })
        .catch(() => []);
      boms.forEach((b) => {
        if (b.projectId) {
          bomMap.set(b.projectId, b);
          bomMap.set(String(b.projectId).trim().toUpperCase(), b);
        }
        if (b.bomNumber) {
          bomMap.set(b.bomNumber, b);
          bomMap.set(String(b.bomNumber).trim().toUpperCase(), b);
        }
      });
    }

    const rateLookupMap = new Map();
    if (bomMap.size > 0) {
      const [rmList, dmList, paList, poList, grnList] = await Promise.all([
        prisma.rmItemMaster.findMany({ where: { isActive: true } }).catch(() => []),
        prisma.designItemMaster.findMany({ where: { isActive: true } }).catch(() => []),
        prisma.vendorPriceAgreement.findMany({ where: { isActive: true }, orderBy: { isPreferred: 'desc' } }).catch(() => []),
        prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }).catch(() => []),
        prisma.grnRecord.findMany({ orderBy: { receivedDate: 'desc' }, take: 100 }).catch(() => [])
      ]);
      rmList.forEach((r) => {
        const c = String(r.name || '').trim().toUpperCase();
        if (c && Number(r.standardRateINR) > 0) rateLookupMap.set(c, Number(r.standardRateINR));
      });
      dmList.forEach((d) => {
        const c = String(d.itemCode || '').trim().toUpperCase();
        if (c && Number(d.standardRateINR) > 0 && !rateLookupMap.has(c)) rateLookupMap.set(c, Number(d.standardRateINR));
      });
      paList.forEach((pa) => {
        const c = String(pa.itemCode || '').trim().toUpperCase();
        const pr = Number(pa.unitPrice || pa.equivalentRate || 0);
        if (c && pr > 0 && !rateLookupMap.has(c)) rateLookupMap.set(c, pr);
      });
      poList.forEach((po) => {
        (Array.isArray(po.items) ? po.items : []).forEach((it) => {
          const c = String(it.itemCode || it.partCode || it.name || '').trim().toUpperCase();
          const pr = Number(it.unitPrice || it.rate || 0);
          if (c && pr > 0 && !rateLookupMap.has(c)) rateLookupMap.set(c, pr);
        });
      });
      grnList.forEach((g) => {
        (Array.isArray(g.items) ? g.items : []).forEach((it) => {
          const c = String(it.itemCode || it.name || '').trim().toUpperCase();
          const pr = Number(it.unitRate || it.unitPrice || it.rate || 0);
          if (c && pr > 0 && !rateLookupMap.has(c)) rateLookupMap.set(c, pr);
        });
      });
    }

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      projects: projects.map((p) => {
        const k1 = String(p.projectId || '').trim().toUpperCase();
        const k2 = String(p.workOrderNumber || '').trim().toUpperCase();
        return formatProject(
          p,
          p.customerPoId ? poMap.get(p.customerPoId) : null,
          bomMap.get(p.projectId) ||
            bomMap.get(p.workOrderNumber) ||
            bomMap.get(k1) ||
            bomMap.get(k2) ||
            null,
          rateLookupMap
        );
      })
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableCustomerPos = async (req, res, next) => {
  try {
    const [activeProjects, rawPos] = await Promise.all([
      prisma.project.findMany({
        select: { customerPoId: true, customerPoNumber: true, projectId: true }
      }),
      prisma.customerPo.findMany({
        where: {
          status: 'OA_ISSUED',
          orderAcceptanceNumber: { not: null },
          convertedProjectId: null
        },
        include: {
          items: { orderBy: { slNo: 'asc' } }
        },
        orderBy: [{ poDate: 'desc' }, { createdAt: 'desc' }],
        take: 100
      })
    ]);

    const usedPoIds = new Set(activeProjects.map((p) => p.customerPoId).filter(Boolean));
    const usedPoNumbers = new Set(
      activeProjects.map((p) => (p.customerPoNumber || '').trim().toUpperCase()).filter(Boolean)
    );

    const customerPos = rawPos.filter((po) => {
      if (!po.orderAcceptanceNumber || !String(po.orderAcceptanceNumber).trim()) return false;
      if (usedPoIds.has(po.id)) return false;
      if (po.poNumber && usedPoNumbers.has(po.poNumber.trim().toUpperCase())) return false;
      return true;
    });

    res.status(200).json({
      success: true,
      count: customerPos.length,
      customerPos: customerPos.map((po) => ({
        ...po,
        _id: po.id,
        items: (po.items || []).map((it) => ({ ...it, _id: it.id }))
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: { firstName: 'asc' }
    });

    res.status(200).json({
      success: true,
      users: users.map((u) => ({
        _id: u.id,
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        email: u.email,
        department: u.department,
        roleName: u.role?.name || ''
      }))
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);
    const upperId = String(id).trim().toUpperCase();

    const project = await prisma.project.findFirst({
      where: isUuid
        ? { id }
        : {
            OR: [{ workOrderNumber: upperId }, { projectId: upperId }]
          },
      include: {
        milestones: {
          orderBy: [{ order: 'asc' }, { baselineDate: 'asc' }],
          include: {
            subStages: { orderBy: { order: 'asc' } }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Work Order / Project not found.' });
    }

    let poDoc = null;
    if (project.customerPoId && UUID_REGEX.test(String(project.customerPoId))) {
      poDoc = await prisma.customerPo.findUnique({
        where: { id: String(project.customerPoId) },
        include: { items: { orderBy: { slNo: 'asc' } } }
      });
    }

    // Lookup BOM & BOQ attached data
    const pKey1 = String(project.projectId || '').trim();
    const pKey2 = String(project.workOrderNumber || '').trim();
    const bomDoc = await prisma.bom
      .findFirst({
        where: {
          OR: [
            { projectId: { equals: pKey1, mode: 'insensitive' } },
            { projectId: { equals: pKey2, mode: 'insensitive' } },
            { bomNumber: { equals: pKey1, mode: 'insensitive' } },
            { bomNumber: { equals: pKey2, mode: 'insensitive' } }
          ]
        }
      })
      .catch(() => null);

    res.status(200).json({
      success: true,
      project: formatProject(project, poDoc, bomDoc),
      milestones: (project.milestones || []).map(formatMilestone)
    });
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req, res, next) => {
  try {
    const config = await ensureProjectSetupConfig(req.user);
    const policy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const rawWoInput = (req.body.workOrderNumber || req.body.projectId || '').trim().toUpperCase();
    const workOrderNumber = rawWoInput || (await generateNextWorkOrderNumber(policy));
    const projectId = workOrderNumber;

    const duplicateWo = await prisma.project.findFirst({
      where: {
        OR: [{ workOrderNumber }, { projectId: workOrderNumber }]
      }
    });
    if (duplicateWo) {
      return res.status(400).json({
        success: false,
        message: `Just a heads up: Work Order Number "${workOrderNumber}" is already in use. Please enter a unique Work Order Number.`
      });
    }

    const {
      customerPoId,
      projectName,
      customerName,
      machineModel,
      productDescription,
      deliveryCommitmentDate,
      quotationRef,
      contractValue = { currency: 'INR', amount: 0, exchangeRate: 1, baseAmountINR: 0 },
      startDate = new Date(),
      targetDispatchDate,
      plantLocation,
      costCenter,
      techSpec,
      stages
    } = req.body;

    let resolvedCustomerName = customerName || '';
    let resolvedMachineModel = machineModel || '';
    let resolvedProductDescription = productDescription || '';
    let resolvedContractValue = contractValue;
    let resolvedCommitmentDate = deliveryCommitmentDate ? new Date(deliveryCommitmentDate) : null;
    let resolvedDispatchDate = targetDispatchDate;
    let customerPoUuid = null;
    let customerPoNumber = '';
    let linkedLeadId = null;
    let resolvedPoReceiptDate = null;
    let resolvedPoItems = [];

    if (customerPoId && UUID_REGEX.test(String(customerPoId))) {
      const poDoc = await prisma.customerPo.findUnique({
        where: { id: String(customerPoId) },
        include: { items: { orderBy: { slNo: 'asc' } } }
      });

      if (poDoc) {
        if (!poDoc.orderAcceptanceNumber || !String(poDoc.orderAcceptanceNumber).trim() || poDoc.status === 'RECEIVED') {
          return res.status(400).json({
            success: false,
            message: `Just a heads up: please generate the Order Acceptance (OA) for Customer PO "${poDoc.poNumber}" in CRM before creating a Project.`
          });
        }

        const existingPrjForPo = await prisma.project.findFirst({
          where: {
            OR: [
              { customerPoId: poDoc.id },
              ...(poDoc.poNumber ? [{ customerPoNumber: poDoc.poNumber }] : [])
            ]
          }
        });
        if (existingPrjForPo) {
          return res.status(400).json({
            success: false,
            message: `Just a heads up: Work Order "${existingPrjForPo.workOrderNumber}" is already created for Customer PO "${poDoc.poNumber}".`
          });
        }

        customerPoUuid = poDoc.id;
        customerPoNumber = poDoc.poNumber;
        linkedLeadId = poDoc.leadId;
        resolvedPoReceiptDate = poDoc.poDate ? new Date(poDoc.poDate).toISOString() : null;
        resolvedPoItems = (poDoc.items || []).map((it, idx) => ({
          slNo: it.slNo || idx + 1,
          partId: it.modelCode || '',
          rev: '',
          description: [it.description, it.specifications].filter(Boolean).join(' — '),
          qty: Number(it.quantity || 1),
          unit: it.uom || 'Nos.'
        }));
        resolvedCustomerName = customerName || poDoc.companyName || poDoc.customerName;

        const poItemModels = (poDoc.items || [])
          .filter((it) => it.qtyType !== 'EXTRA')
          .map((it) => it.modelCode || it.description)
          .filter(Boolean)
          .join(', ');
        resolvedMachineModel = machineModel || poItemModels || 'Precision Winding Machine';

        if (!resolvedProductDescription && poDoc.items?.length > 0) {
          resolvedProductDescription = poDoc.items
            .map((it) => {
              const parts = [];
              if (it.modelCode) parts.push(`Model: ${it.modelCode}`);
              if (it.description) parts.push(it.description);
              if (it.specifications) parts.push(it.specifications);
              if (it.quantity) parts.push(`Qty: ${it.quantity} ${it.uom || 'Nos'}`);
              return parts.join(' — ');
            })
            .join('\n');
        }

        if (poDoc.deliveryCommitmentDate) {
          resolvedCommitmentDate = poDoc.deliveryCommitmentDate;
          if (!targetDispatchDate) {
            resolvedDispatchDate = poDoc.deliveryCommitmentDate;
          }
        }

        if (poDoc.totalAmount && (!contractValue.amount || Number(contractValue.amount) === 0)) {
          resolvedContractValue = {
            currency: poDoc.totalAmount.currency || 'INR',
            amount: Number(poDoc.totalAmount.amount || 0),
            exchangeRate: Number(poDoc.totalAmount.exchangeRate || 1.0),
            baseAmountINR: Number(poDoc.totalAmount.baseAmountINR || poDoc.totalAmount.amount || 0)
          };
        }
      }
    }

    const calculatedBaseAmount =
      Math.round(
        Number(resolvedContractValue.amount || 0) * Number(resolvedContractValue.exchangeRate || 1.0) * 100
      ) / 100;

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';
    const parsedStartDate = new Date(startDate);
    const parsedTargetDispatchDate = resolvedDispatchDate
      ? new Date(resolvedDispatchDate)
      : (resolvedCommitmentDate || new Date(parsedStartDate.getTime() + 90 * 24 * 60 * 60 * 1000));

    const stageTemplates = Array.isArray(stages) ? stages : [];
    const approverIds = Array.isArray(policy.approverUserIds) ? policy.approverUserIds.filter(Boolean) : [];
    const requiresApproval = approverIds.length > 0;
    const initialStatus = requiresApproval
      ? 'CREATED'
      : stageTemplates.length > 0
      ? 'ASSIGNED_TO_DEPARTMENT'
      : 'APPROVED';

    const project = await prisma.project.create({
      data: {
        projectId,
        workOrderNumber,
        projectName: projectName || `${resolvedCustomerName} — ${resolvedMachineModel}`,
        customerName: resolvedCustomerName,
        machineModel: resolvedMachineModel,
        productDescription: resolvedProductDescription,
        customerPoId: customerPoUuid,
        customerPoNumber,
        quotationRef: quotationRef || '',
        contractValue: {
          currency: resolvedContractValue.currency || 'INR',
          amount: Number(resolvedContractValue.amount || 0),
          exchangeRate: Number(resolvedContractValue.exchangeRate || 1.0),
          baseAmountINR: calculatedBaseAmount,
          costCenter: costCenter !== undefined ? String(costCenter).trim() : 'Modification',
          techSpec: techSpec !== undefined ? String(techSpec).trim() : 'NA',
          poReceiptDate: resolvedPoReceiptDate,
          poItems: resolvedPoItems,
          revisions: [],
          approvedById: requiresApproval ? null : req.user?.id || null,
          approvedByName: requiresApproval ? '' : `${actorName} (Auto-Approved)`,
          approvedAt: requiresApproval ? null : new Date().toISOString()
        },
        startDate: parsedStartDate,
        targetDispatchDate: parsedTargetDispatchDate,
        deliveryCommitmentDate: resolvedCommitmentDate,
        status: initialStatus,
        plantLocation: plantLocation || 'Main Works - Unit 1',
        projectManagerId: req.user?.id || null,
        projectManagerName: actorName,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    if (customerPoUuid) {
      await prisma.customerPo.update({
        where: { id: customerPoUuid },
        data: {
          status: 'WORK_ORDER_CREATED',
          convertedProjectId: project.workOrderNumber,
          convertedAt: new Date(),
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      let targetLeadId = linkedLeadId && UUID_REGEX.test(String(linkedLeadId)) ? String(linkedLeadId) : null;
      if (!targetLeadId && resolvedCustomerName) {
        const matchedLead = await prisma.lead.findFirst({
          where: {
            companyName: { equals: resolvedCustomerName, mode: 'insensitive' },
            stage: { in: ['WON', 'NEGOTIATION', 'QUOTE_PREPARED', 'QUOTATION_PREPARED'] }
          },
          orderBy: { updatedAt: 'desc' }
        }).catch(() => null);
        if (matchedLead) targetLeadId = matchedLead.id;
      }

      if (targetLeadId) {
        await prisma.lead.update({
          where: { id: targetLeadId },
          data: {
            stage: 'IN_PRODUCTION',
            convertedProjectId: project.workOrderNumber,
            updatedById: req.user?.id || null,
            updatedByName: actorName,
            stageHistory: {
              create: [
                {
                  fromStage: 'WON',
                  toStage: 'IN_PRODUCTION',
                  note: `Work Order ${project.workOrderNumber} kicked off in Project Setup.`,
                  createdById: req.user?.id || null,
                  createdByName: actorName,
                  updatedById: req.user?.id || null,
                  updatedByName: actorName
                }
              ]
            }
          }
        }).catch(() => {});
      }
    }

    // Create ONLY the stages provided by the user (strictly zero default fallback or auto-seeding)
    let createdMilestonesCount = 0;

    for (let idx = 0; idx < stageTemplates.length; idx++) {
      const s = stageTemplates[idx];
      const stageCode = (s.stageCode || s.stage || 'CUSTOM_STAGE').toUpperCase();
      const offsetDays = Number(s.daysOffset ?? s.standardDaysOffset ?? (idx + 1) * 12);
      const targetDate = s.targetDate
        ? new Date(s.targetDate)
        : new Date(parsedStartDate.getTime() + offsetDays * 24 * 60 * 60 * 1000);

      const stageMaster = await prisma.stageMaster.findFirst({
        where: { stageCode }
      });
      const deptModule = s.departmentModule || stageMaster?.departmentModule || 'project-setup';

      await prisma.milestone.create({
        data: {
          projectRefId: project.id,
          projectId: project.projectId,
          title: s.title || s.stageName || stageMaster?.title || stageCode,
          stage: stageCode,
          stageCode,
          departmentModule: deptModule,
          order: Number(s.order ?? s.defaultOrder ?? idx + 1),
          leadRole: s.leadRole || stageMaster?.leadRole || 'Project Manager',
          weightPercent: Number(s.weightPercent ?? stageMaster?.weightPercent ?? 10),
          completionPercent: 0,
          baselineDate: targetDate,
          projectedDate: targetDate,
          status: 'NOT_STARTED',
          notes: s.notes || '',
          remarks: [
            {
              text: s.notes ? `Stage initialized: ${s.notes}` : 'Stage initialized on Project Kickoff.',
              authorName: actorName,
              authorRole: actorRole,
              authorId: req.user?.id || null,
              createdAt: new Date().toISOString()
            }
          ],
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
      createdMilestonesCount++;
    }

    await logAuditEvent({
      req,
      action: 'PROJECT_CREATED',
      module: 'project-setup',
      entityId: project.id,
      entityType: 'Project',
      notes: `Work Order ${project.workOrderNumber} created for ${project.customerName}`
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
          include: { subStages: { orderBy: { order: 'asc' } } }
        }
      }
    });

    const statusLabel =
      initialStatus === 'CREATED'
        ? 'awaiting approval'
        : initialStatus === 'ASSIGNED_TO_DEPARTMENT'
        ? 'auto-approved & assigned to departments'
        : 'auto-approved';

    res.status(201).json({
      success: true,
      message: `All set! Work Order ${project.workOrderNumber} created (${statusLabel}) with ${createdMilestonesCount} department stage(s).`,
      project: formatProject(fullProject),
      milestonesCount: createdMilestonesCount
    });
  } catch (error) {
    next(error);
  }
};

export const approveProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);
    const upperId = String(id).trim().toUpperCase();

    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { OR: [{ workOrderNumber: upperId }, { projectId: upperId }] },
      include: { milestones: { orderBy: { order: 'asc' } } }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Work Order not found.' });
    }

    const config = await ensureProjectSetupConfig(req.user);
    const policy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const approverIds = Array.isArray(policy.approverUserIds)
      ? policy.approverUserIds.filter(Boolean)
      : [];

    if (approverIds.length > 0 && !approverIds.includes(req.user?.id)) {
      return res.status(403).json({
        success: false,
        message: 'Just a heads up: only users assigned in Project Setup > Masters > Approval are authorized to approve this Work Order.'
      });
    }

    const actorName = getActorName(req.user);
    const milestonesCount = existing.milestones?.length || 0;
    const nextStatus = milestonesCount > 0 ? 'ASSIGNED_TO_DEPARTMENT' : 'APPROVED';
    const approvedAtIso = new Date().toISOString();

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        contractValue: {
          ...(typeof existing.contractValue === 'object' ? existing.contractValue : {}),
          approvedById: req.user?.id || null,
          approvedByName: actorName,
          approvedAt: approvedAtIso
        },
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
          include: { subStages: { orderBy: { order: 'asc' } } }
        }
      }
    });

    await logAuditEvent({
      req,
      action: 'PROJECT_APPROVED',
      module: 'project-setup',
      entityId: updated.id,
      entityType: 'Project',
      notes: `Work Order ${updated.workOrderNumber} approved by ${actorName}. Status: ${nextStatus}`
    });

    let poDoc = null;
    if (updated.customerPoId && UUID_REGEX.test(String(updated.customerPoId))) {
      poDoc = await prisma.customerPo.findUnique({
        where: { id: String(updated.customerPoId) },
        include: { items: { orderBy: { slNo: 'asc' } } }
      }).catch(() => null);
    }

    const bomDoc = await prisma.bom.findFirst({
      where: {
        OR: [
          { projectId: { equals: String(updated.projectId || '').trim(), mode: 'insensitive' } },
          { projectId: { equals: String(updated.workOrderNumber || '').trim(), mode: 'insensitive' } }
        ]
      }
    }).catch(() => null);

    res.status(200).json({
      success: true,
      message:
        nextStatus === 'ASSIGNED_TO_DEPARTMENT'
          ? `All set! Work Order ${updated.workOrderNumber} approved and assigned to ${milestonesCount} department stage(s).`
          : `All set! Work Order ${updated.workOrderNumber} approved.`,
      project: formatProject(updated, poDoc, bomDoc)
    });
  } catch (error) {
    next(error);
  }
};

export const updateProjectStage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { currentStage, status, notes } = req.body;
    const isUuid = UUID_REGEX.test(id);
    const upperId = String(id).trim().toUpperCase();

    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { OR: [{ workOrderNumber: upperId }, { projectId: upperId }] }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Work Order not found.' });
    }

    const actorName = getActorName(req.user);

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        currentStage: currentStage ?? existing.currentStage,
        status: status ?? existing.status,
        notes: notes !== undefined ? notes : existing.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'Great! Work Order stage updated.',
      project: formatProject(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);
    const upperId = String(id).trim().toUpperCase();
    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { OR: [{ workOrderNumber: upperId }, { projectId: upperId }] }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Work Order not found.' });
    }

    const config = await ensureProjectSetupConfig(req.user);
    const policy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };
    const editTimeCheck = checkTimeWindowAllowed(existing, policy, 'EDIT');
    if (!editTimeCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: editTimeCheck.message
      });
    }

    const actorName = getActorName(req.user);
    const actorRole = req.user?.role?.name || 'Project Manager';
    const {
      workOrderNumber: rawNewWo,
      projectName,
      customerName,
      machineModel,
      productDescription,
      deliveryCommitmentDate,
      targetDispatchDate,
      plantLocation,
      costCenter,
      techSpec,
      contractValue,
      status,
      notes,
      stages
    } = req.body;

    const nextWorkOrderNumber =
      rawNewWo !== undefined && String(rawNewWo).trim()
        ? String(rawNewWo).trim().toUpperCase()
        : existing.workOrderNumber;

    if (nextWorkOrderNumber !== existing.workOrderNumber || nextWorkOrderNumber !== existing.projectId) {
      const dup = await prisma.project.findFirst({
        where: {
          id: { not: existing.id },
          OR: [{ workOrderNumber: nextWorkOrderNumber }, { projectId: nextWorkOrderNumber }]
        }
      });
      if (dup) {
        return res.status(400).json({
          success: false,
          message: `Just a heads up: Work Order Number "${nextWorkOrderNumber}" is already used by another project.`
        });
      }
    }

    let resolvedContractValue = {
      ...(typeof existing.contractValue === 'object' ? existing.contractValue : {})
    };
    if (contractValue && typeof contractValue === 'object') {
      resolvedContractValue = {
        ...resolvedContractValue,
        currency: contractValue.currency || existing.contractValue?.currency || 'INR',
        amount: Number(contractValue.amount ?? existing.contractValue?.amount ?? 0),
        exchangeRate: Number(contractValue.exchangeRate ?? existing.contractValue?.exchangeRate ?? 1),
        baseAmountINR: Math.round(Number(contractValue.amount || 0) * Number(contractValue.exchangeRate || 1) * 100) / 100
      };
    }
    if (costCenter !== undefined) {
      resolvedContractValue.costCenter = String(costCenter).trim() || 'Modification';
    }
    if (techSpec !== undefined) {
      resolvedContractValue.techSpec = String(techSpec).trim() || 'NA';
    }

    const oldProjectId = existing.projectId;
    const oldWoNumber = existing.workOrderNumber;

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        workOrderNumber: nextWorkOrderNumber,
        projectId: nextWorkOrderNumber,
        projectName: projectName !== undefined ? String(projectName).trim() : existing.projectName,
        customerName: customerName !== undefined ? String(customerName).trim() : existing.customerName,
        machineModel: machineModel !== undefined ? String(machineModel).trim() : existing.machineModel,
        productDescription: productDescription !== undefined ? String(productDescription).trim() : existing.productDescription,
        deliveryCommitmentDate: deliveryCommitmentDate !== undefined ? (deliveryCommitmentDate ? new Date(deliveryCommitmentDate) : null) : existing.deliveryCommitmentDate,
        targetDispatchDate: targetDispatchDate !== undefined ? (targetDispatchDate ? new Date(targetDispatchDate) : existing.targetDispatchDate) : existing.targetDispatchDate,
        plantLocation: plantLocation !== undefined ? String(plantLocation).trim() : existing.plantLocation,
        contractValue: resolvedContractValue,
        status: status !== undefined ? String(status).trim() : existing.status,
        notes: notes !== undefined ? String(notes).trim() : existing.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // Propagate Work Order Number change to child records if edited
    if (nextWorkOrderNumber !== oldProjectId || nextWorkOrderNumber !== oldWoNumber) {
      const oldRefs = Array.from(new Set([oldProjectId, oldWoNumber].filter(Boolean)));
      await prisma.milestone.updateMany({
        where: { OR: [{ projectRefId: existing.id }, { projectId: { in: oldRefs } }] },
        data: { projectId: nextWorkOrderNumber }
      }).catch(() => {});
      await prisma.departmentSubStage.updateMany({
        where: { projectId: { in: oldRefs } },
        data: { projectId: nextWorkOrderNumber }
      }).catch(() => {});
      await prisma.customerPo.updateMany({
        where: {
          OR: [
            ...(existing.customerPoId ? [{ id: existing.customerPoId }] : []),
            { convertedProjectId: { in: oldRefs } }
          ]
        },
        data: { convertedProjectId: nextWorkOrderNumber }
      }).catch(() => {});
      await prisma.lead.updateMany({
        where: { convertedProjectId: { in: oldRefs } },
        data: { convertedProjectId: nextWorkOrderNumber }
      }).catch(() => {});
    }

    if (Array.isArray(stages)) {
      const currentMilestones = await prisma.milestone.findMany({
        where: { projectRefId: existing.id }
      });
      const incomingCodes = new Set(
        stages.map((s) => (s.stageCode || s.stage || '').toUpperCase()).filter(Boolean)
      );

      // Remove stages deleted by the user in edit mode
      for (const cm of currentMilestones) {
        if (!incomingCodes.has(cm.stageCode.toUpperCase())) {
          await prisma.milestone.delete({ where: { id: cm.id } });
        }
      }

      // Update existing stages or create newly added stages
      for (let idx = 0; idx < stages.length; idx++) {
        const s = stages[idx];
        const stageCode = (s.stageCode || s.stage || '').toUpperCase();
        if (!stageCode) continue;

        const targetDate = s.targetDate ? new Date(s.targetDate) : new Date();
        const existingMilestone = currentMilestones.find(
          (cm) => cm.stageCode.toUpperCase() === stageCode
        );

        if (existingMilestone) {
          await prisma.milestone.update({
            where: { id: existingMilestone.id },
            data: {
              title: s.title || s.stageName || existingMilestone.title,
              order: idx + 1,
              leadRole: s.leadRole || existingMilestone.leadRole,
              weightPercent: Number(s.weightPercent ?? existingMilestone.weightPercent),
              notes: s.notes !== undefined ? String(s.notes).trim() : existingMilestone.notes,
              baselineDate: s.targetDate ? new Date(s.targetDate) : existingMilestone.baselineDate,
              projectedDate: s.targetDate ? new Date(s.targetDate) : existingMilestone.projectedDate,
              status: s.status !== undefined ? String(s.status).trim() : existingMilestone.status,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        } else {
          const stageMaster = await prisma.stageMaster.findFirst({ where: { stageCode } });
          const deptModule = s.departmentModule || stageMaster?.departmentModule || 'project-setup';
          await prisma.milestone.create({
            data: {
              projectRefId: existing.id,
              projectId: updated.workOrderNumber,
              title: s.title || s.stageName || stageMaster?.title || stageCode,
              stage: stageCode,
              stageCode,
              departmentModule: deptModule,
              order: idx + 1,
              leadRole: s.leadRole || stageMaster?.leadRole || 'Project Manager',
              weightPercent: Number(s.weightPercent ?? stageMaster?.weightPercent ?? 10),
              completionPercent: 0,
              baselineDate: targetDate,
              projectedDate: targetDate,
              status: s.status || 'NOT_STARTED',
              notes: s.notes || '',
              remarks: [
                {
                  text: s.notes ? `Stage added: ${s.notes}` : 'Stage added to Project.',
                  authorName: actorName,
                  authorRole: actorRole,
                  authorId: req.user?.id || null,
                  createdAt: new Date().toISOString()
                }
              ],
              createdById: req.user?.id || null,
              createdByName: actorName,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    }

    // If project is already approved (not in CREATED pending-approval state), sync status with stages
    if (status === undefined && existing.status !== 'CREATED') {
      const latestMilestones = await prisma.milestone.findMany({
        where: { projectRefId: existing.id }
      });
      let syncedStatus = existing.status;
      if (latestMilestones.length === 0) {
        syncedStatus = 'APPROVED';
      } else {
        const doneCount = latestMilestones.filter((m) => m.status === 'COMPLETED').length;
        const activeCount = latestMilestones.filter(
          (m) => m.status === 'IN_PROGRESS' || m.status === 'COMPLETED' || (m.completionPercent || 0) > 0
        ).length;
        if (doneCount === latestMilestones.length) {
          syncedStatus = 'COMPLETED';
        } else if (activeCount > 0) {
          syncedStatus = 'IN_PROGRESS';
        } else {
          syncedStatus = 'ASSIGNED_TO_DEPARTMENT';
        }
      }
      if (syncedStatus !== updated.status) {
        await prisma.project.update({
          where: { id: existing.id },
          data: { status: syncedStatus }
        });
      }
    }

    await logAuditEvent({
      req,
      action: 'PROJECT_UPDATED',
      module: 'project-setup',
      entityId: updated.id,
      entityType: 'Project',
      notes: `Work Order ${updated.workOrderNumber} updated.`
    });

    const fullProject = await prisma.project.findUnique({
      where: { id: updated.id },
      include: {
        milestones: {
          orderBy: { order: 'asc' },
          include: { subStages: { orderBy: { order: 'asc' } } }
        }
      }
    });

    const bomDoc = await prisma.bom.findFirst({
      where: {
        OR: [
          { projectId: { equals: String(fullProject?.projectId || '').trim(), mode: 'insensitive' } },
          { projectId: { equals: String(fullProject?.workOrderNumber || '').trim(), mode: 'insensitive' } }
        ]
      }
    }).catch(() => null);

    res.status(200).json({
      success: true,
      message: `All set! Work Order ${updated.workOrderNumber} updated successfully.`,
      project: formatProject(fullProject, null, bomDoc)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_REGEX.test(id);
    const upperId = String(id).trim().toUpperCase();
    const existing = await prisma.project.findFirst({
      where: isUuid ? { id } : { OR: [{ workOrderNumber: upperId }, { projectId: upperId }] }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Work Order not found.' });
    }

    const config = await ensureProjectSetupConfig(req.user);
    const policy = {
      ...DEFAULT_PROJECT_SETUP_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };
    const deleteTimeCheck = checkTimeWindowAllowed(existing, policy, 'DELETE');
    if (!deleteTimeCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: deleteTimeCheck.message
      });
    }

    const actorName = getActorName(req.user);

    const poOrConditions = [
      ...(existing.customerPoId && UUID_REGEX.test(String(existing.customerPoId)) ? [{ id: existing.customerPoId }] : []),
      ...(existing.projectId ? [{ convertedProjectId: existing.projectId }] : []),
      ...(existing.workOrderNumber ? [{ convertedProjectId: existing.workOrderNumber }] : []),
      ...(existing.customerPoNumber ? [{ poNumber: existing.customerPoNumber }] : [])
    ];

    const linkedLeadIds = new Set();

    if (poOrConditions.length > 0) {
      const linkedPos = await prisma.customerPo.findMany({
        where: { OR: poOrConditions }
      }).catch(() => []);

      for (const po of linkedPos) {
        const revertStatus =
          po.orderAcceptanceNumber && String(po.orderAcceptanceNumber).trim()
            ? 'OA_ISSUED'
            : 'RECEIVED';

        await prisma.customerPo.update({
          where: { id: po.id },
          data: {
            status: revertStatus,
            convertedProjectId: null,
            convertedAt: null,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        }).catch(() => {});

        if (po.leadId && UUID_REGEX.test(String(po.leadId))) {
          linkedLeadIds.add(String(po.leadId));
        }
      }
    }

    const leadsByProject = await prisma.lead.findMany({
      where: {
        convertedProjectId: {
          in: Array.from(new Set([existing.projectId, existing.workOrderNumber].filter(Boolean)))
        }
      }
    }).catch(() => []);
    leadsByProject.forEach((ld) => linkedLeadIds.add(ld.id));

    for (const ldId of linkedLeadIds) {
      await prisma.lead.update({
        where: { id: ldId },
        data: {
          stage: 'WON',
          convertedProjectId: null,
          updatedById: req.user?.id || null,
          updatedByName: actorName,
          stageHistory: {
            create: [
              {
                fromStage: 'IN_PRODUCTION',
                toStage: 'WON',
                note: `Work Order ${existing.workOrderNumber} was deleted; reverted to OA / Won stage.`,
                createdById: req.user?.id || null,
                createdByName: actorName,
                updatedById: req.user?.id || null,
                updatedByName: actorName
              }
            ]
          }
        }
      }).catch(() => {});
    }

    await prisma.project.delete({
      where: { id: existing.id }
    });

    await logAuditEvent({
      req,
      action: 'PROJECT_DELETED',
      module: 'project-setup',
      entityId: existing.id,
      entityType: 'Project',
      notes: `Work Order ${existing.workOrderNumber} deleted.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Work Order ${existing.workOrderNumber} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Real-Time Project Costing Dashboard Aggregation
 * Combines Contract Value, BOM & BOQ Estimated Cost (Make vs Buy),
 * Vendor PO Committed Cost, Store GRN Landed Cost, and WIP Issued Material Cost.
 */
export const getProjectCostingDashboard = async (req, res, next) => {
  try {
    const [
      projects,
      customerPos,
      boms,
      purchaseOrders,
      grns,
      materialRequests,
      rmMasters,
      designMasters,
      priceAgreements
    ] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'desc' }
      }),
      prisma.customerPo.findMany().catch(() => []),
      prisma.bom.findMany().catch(() => []),
      prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.grnRecord.findMany({ orderBy: { receivedDate: 'desc' } }).catch(() => []),
      prisma.storeMaterialRequest.findMany({ orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.rmItemMaster.findMany({ where: { isActive: true } }).catch(() => []),
      prisma.designItemMaster.findMany({ where: { isActive: true } }).catch(() => []),
      prisma.vendorPriceAgreement.findMany({ where: { isActive: true }, orderBy: { isPreferred: 'desc' } }).catch(() => [])
    ]);

    // Build Master Standard Rate Lookup Map (by itemCode / name)
    const rateMap = new Map();
    rmMasters.forEach((rm) => {
      const code = String(rm.name || '').trim().toUpperCase();
      if (code && Number(rm.standardRateINR) > 0) {
        rateMap.set(code, Number(rm.standardRateINR));
      }
    });
    designMasters.forEach((dm) => {
      const code = String(dm.itemCode || '').trim().toUpperCase();
      if (code && Number(dm.standardRateINR) > 0 && !rateMap.has(code)) {
        rateMap.set(code, Number(dm.standardRateINR));
      }
    });
    priceAgreements.forEach((pa) => {
      const code = String(pa.itemCode || '').trim().toUpperCase();
      const price = Number(pa.unitPrice || pa.equivalentRate || 0);
      if (code && price > 0 && !rateMap.has(code)) {
        rateMap.set(code, price);
      }
    });

    // Also capture latest actual PO & GRN unit prices per itemCode
    const poRateMap = new Map();
    purchaseOrders.forEach((po) => {
      const items = Array.isArray(po.items) ? po.items : [];
      items.forEach((it) => {
        const code = String(it.itemCode || it.partCode || it.name || '').trim().toUpperCase();
        const rate = Number(it.unitPrice || it.rate || it.standardRateINR || 0);
        if (code && rate > 0 && !poRateMap.has(code)) {
          poRateMap.set(code, rate);
        }
      });
    });
    grns.forEach((grn) => {
      const items = Array.isArray(grn.items) ? grn.items : [];
      items.forEach((it) => {
        const code = String(it.itemCode || it.name || '').trim().toUpperCase();
        const rate = Number(it.unitRate || it.unitPrice || it.rate || 0);
        if (code && rate > 0 && !poRateMap.has(code)) {
          poRateMap.set(code, rate);
        }
      });
    });

    // Map Customer POs
    const cpoMap = new Map();
    customerPos.forEach((cpo) => {
      cpoMap.set(cpo.id, cpo);
    });

    // Map BOMs by uppercase projectId / bomNumber
    const bomMap = new Map();
    boms.forEach((b) => {
      if (b.projectId) bomMap.set(String(b.projectId).trim().toUpperCase(), b);
      if (b.bomNumber) bomMap.set(String(b.bomNumber).trim().toUpperCase(), b);
    });

    let portfolioContractValueINR = 0;
    let portfolioEstimatedBomCostINR = 0;
    let portfolioCommittedPoCostINR = 0;
    let portfolioInwardGrnCostINR = 0;
    let portfolioWipIssuedCostINR = 0;

    const projectCostingRows = projects.map((p) => {
      const woKey = String(p.workOrderNumber || p.projectId || '').trim().toUpperCase();
      const prjKey = String(p.projectId || p.workOrderNumber || '').trim().toUpperCase();
      const poDoc = p.customerPoId ? cpoMap.get(p.customerPoId) : null;
      const bomDoc = bomMap.get(woKey) || bomMap.get(prjKey) || null;

      // 1. Contract Revenue
      const contractValueINR =
        Number(p.contractValue?.amount) ||
        Number(poDoc?.totalAmount) ||
        Number(poDoc?.subtotal) ||
        0;

      // 2. BOM & BOQ Costing
      const rawBomItems = Array.isArray(bomDoc?.items) ? bomDoc.items : [];
      const attachedDrawings = resolveAttachedDrawings(bomDoc, rawBomItems);

      let estimatedBomCostINR = 0;
      let makeEstimatedCostINR = 0;
      let buyEstimatedCostINR = 0;

      const itemizedBomCosting = rawBomItems.map((it, idx) => {
        const code = String(it.itemCode || it.drawingNumber || it.name || `ITEM-${idx + 1}`).trim();
        const upperCode = code.toUpperCase();
        const qty = Number(it.quantityPerMachine ?? it.baseQty ?? it.qty ?? 1) || 1;
        const inlineRate = Number(it.standardRateINR ?? it.rate ?? it.unitPrice ?? 0) || 0;
        const masterRate = rateMap.get(upperCode) || 0;
        const latestPoRate = poRateMap.get(upperCode) || 0;
        const effectiveRateINR = inlineRate > 0 ? inlineRate : masterRate > 0 ? masterRate : latestPoRate;
        const lineTotalINR = Math.round(qty * effectiveRateINR * 100) / 100;
        const makeOrBuy = String(it.makeOrBuy || 'BUY').toUpperCase();

        estimatedBomCostINR += lineTotalINR;
        if (makeOrBuy === 'MAKE') {
          makeEstimatedCostINR += lineTotalINR;
        } else {
          buyEstimatedCostINR += lineTotalINR;
        }

        return {
          id: it.id || `${code}_${idx}`,
          index: idx,
          slNo: idx + 1,
          level: Number(it.level) || 1,
          parentItemCode: it.parentItemCode || null,
          itemCode: code,
          itemName: it.itemName || it.description || code,
          itemType: String(it.itemType || it.classification || 'COMPONENT').toUpperCase(),
          category: it.category || it.subAssemblyGroup || 'General',
          revision: it.versionCode || it.revision || 'Rev 1.0',
          makeOrBuy,
          uom: it.uom || it.baseUom || 'Nos',
          quantityPerMachine: qty,
          standardRateINR: inlineRate || masterRate,
          latestPoRateINR: latestPoRate,
          effectiveRateINR,
          lineTotalINR
        };
      });

      if (estimatedBomCostINR === 0 && Number(bomDoc?.summary?.estimatedTotalCostINR) > 0) {
        estimatedBomCostINR = Number(bomDoc.summary.estimatedTotalCostINR);
      }

      // 3. Committed Vendor Purchase Orders for this Work Order
      const matchedPos = purchaseOrders.filter((po) => {
        const poPrj = String(po.projectId || '').trim().toUpperCase();
        return poPrj === woKey || poPrj === prjKey;
      });

      const projectPoNumbers = new Set();
      let committedPoCostINR = 0;
      const poLedger = matchedPos.map((po) => {
        if (po.poNumber) projectPoNumbers.add(String(po.poNumber).trim().toUpperCase());
        const poItems = Array.isArray(po.items) ? po.items : [];
        const itemsSum = poItems.reduce(
          (acc, it) => acc + (Number(it.quantity || it.qty || 0) * Number(it.unitPrice || it.rate || 0)),
          0
        );
        const amountINR =
          Number(po.totalAmount?.baseAmountINR) ||
          Number(po.totalAmount?.amount) ||
          itemsSum ||
          0;
        committedPoCostINR += amountINR;
        return {
          id: po.id,
          poNumber: po.poNumber,
          vendorName: po.vendorName || 'Vendor',
          status: po.status,
          itemsCount: poItems.length,
          amountINR: Math.round(amountINR * 100) / 100,
          createdAt: po.createdAt
        };
      });

      // 4. Inward Store GRN Landed Cost for this Work Order
      const matchedGrns = grns.filter((grn) => {
        const grnPrj = String(grn.projectId || '').trim().toUpperCase();
        const grnPo = String(grn.poNumber || '').trim().toUpperCase();
        return (
          (grnPrj && (grnPrj === woKey || grnPrj === prjKey)) ||
          (grnPo && projectPoNumbers.has(grnPo))
        );
      });

      let inwardGrnCostINR = 0;
      let grnLogisticsCostINR = 0;
      const grnLedger = matchedGrns.map((grn) => {
        const grandTotal = Number(grn.grandTotal || grn.taxableSubtotal || 0);
        const logistics =
          Number(grn.transportationCharges || 0) +
          Number(grn.transportationGstAmount || 0) +
          Number(grn.packingCharges || 0) +
          Number(grn.packingGstAmount || 0);
        inwardGrnCostINR += grandTotal;
        grnLogisticsCostINR += logistics;
        return {
          id: grn.id,
          grnNumber: grn.grnNumber,
          poNumber: grn.poNumber || 'Direct GRN',
          vendorName: grn.vendorName || 'Vendor',
          qcStatus: grn.qcStatus,
          taxableSubtotal: Number(grn.taxableSubtotal || 0),
          logisticsINR: Math.round(logistics * 100) / 100,
          grandTotal: Math.round(grandTotal * 100) / 100,
          receivedDate: grn.receivedDate
        };
      });

      // 5. WIP Material Issued Cost (Store Material Requests)
      const matchedMrs = materialRequests.filter((mr) => {
        const mrPrj = String(mr.projectId || '').trim().toUpperCase();
        return mrPrj === woKey || mrPrj === prjKey;
      });

      let wipIssuedCostINR = 0;
      const wipLedger = matchedMrs.map((mr) => {
        const mrItems = Array.isArray(mr.items) ? mr.items : [];
        let mrCost = 0;
        mrItems.forEach((it) => {
          const code = String(it.itemCode || it.name || '').trim().toUpperCase();
          const issuedQty = Number(it.issuedQty ?? it.requestedQty ?? it.qty ?? 0);
          const rate =
            Number(it.unitRate || it.standardRateINR || 0) ||
            poRateMap.get(code) ||
            rateMap.get(code) ||
            0;
          mrCost += issuedQty * rate;
        });
        wipIssuedCostINR += mrCost;
        return {
          id: mr.id,
          mrNumber: mr.mrNumber,
          department: mr.department,
          requestedBy: mr.requestedBy,
          status: mr.status,
          itemsCount: mrItems.length,
          issuedCostINR: Math.round(mrCost * 100) / 100,
          createdAt: mr.createdAt
        };
      });

      // 6. Effective Actual/Projected Cost & Margin Calculations
      const actualRecognizedCostINR = Math.max(inwardGrnCostINR, committedPoCostINR, wipIssuedCostINR);
      const baselineCostForMarginINR =
        actualRecognizedCostINR > 0 ? actualRecognizedCostINR : estimatedBomCostINR;
      const projectedMarginINR = Math.round((contractValueINR - baselineCostForMarginINR) * 100) / 100;
      const projectedMarginPercent =
        contractValueINR > 0
          ? Math.round(((contractValueINR - baselineCostForMarginINR) / contractValueINR) * 1000) / 10
          : 0;
      const bomVsActualVarianceINR =
        actualRecognizedCostINR > 0
          ? Math.round((estimatedBomCostINR - actualRecognizedCostINR) * 100) / 100
          : 0;

      const isBomAttached = Boolean(
        bomDoc && (attachedDrawings.length > 0 || rawBomItems.length > 0 || bomDoc.attachedAssemblyCode)
      );
      const isBomLocked = Boolean(bomDoc?.isFrozen || bomDoc?.approvalStatus === 'LOCKED_FREEZE');
      const bomStatus = isBomLocked
        ? 'LOCKED_FREEZE'
        : bomDoc?.approvalStatus || (isBomAttached ? 'DRAFT' : 'NOT_ATTACHED');

      let costHealth = 'HEALTHY';
      if (contractValueINR > 0 && baselineCostForMarginINR > contractValueINR) {
        costHealth = 'OVERRUN';
      } else if (
        (estimatedBomCostINR > 0 && actualRecognizedCostINR > estimatedBomCostINR * 1.1) ||
        (contractValueINR > 0 && projectedMarginPercent < 12)
      ) {
        costHealth = 'AT_RISK';
      }

      portfolioContractValueINR += contractValueINR;
      portfolioEstimatedBomCostINR += estimatedBomCostINR;
      portfolioCommittedPoCostINR += committedPoCostINR;
      portfolioInwardGrnCostINR += inwardGrnCostINR;
      portfolioWipIssuedCostINR += wipIssuedCostINR;

      return {
        id: p.id,
        _id: p.id,
        workOrderNumber: p.workOrderNumber || p.projectId,
        projectId: p.workOrderNumber || p.projectId,
        projectName: p.projectName,
        customerName: p.customerName,
        customerPoNumber: p.customerPoNumber || poDoc?.poNumber || '',
        machineModel: p.machineModel,
        status: p.status,
        currentStage: p.currentStage,
        deliveryCommitmentDate: p.deliveryCommitmentDate || p.targetDispatchDate,
        // BOM Status
        bomAttached: isBomAttached,
        isBomLocked,
        bomStatus,
        bomNumber: bomDoc?.bomNumber || null,
        bomRevision: bomDoc?.revision || 'REV-0',
        attachedDrawingsCount: attachedDrawings.length,
        attachedDrawings,
        bomItemsCount: rawBomItems.length,
        // Financial Metrics
        contractValueINR: Math.round(contractValueINR * 100) / 100,
        estimatedBomCostINR: Math.round(estimatedBomCostINR * 100) / 100,
        makeEstimatedCostINR: Math.round(makeEstimatedCostINR * 100) / 100,
        buyEstimatedCostINR: Math.round(buyEstimatedCostINR * 100) / 100,
        committedPoCostINR: Math.round(committedPoCostINR * 100) / 100,
        inwardGrnCostINR: Math.round(inwardGrnCostINR * 100) / 100,
        grnLogisticsCostINR: Math.round(grnLogisticsCostINR * 100) / 100,
        wipIssuedCostINR: Math.round(wipIssuedCostINR * 100) / 100,
        actualRecognizedCostINR: Math.round(actualRecognizedCostINR * 100) / 100,
        projectedMarginINR,
        projectedMarginPercent,
        bomVsActualVarianceINR,
        costHealth,
        // Detailed Ledgers for Dossier Modal
        itemizedBomCosting,
        poLedger,
        grnLedger,
        wipLedger,
        createdByName: p.createdByName || 'System',
        updatedByName: p.updatedByName || 'System',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    const portfolioEffectiveCostINR = Math.max(
      portfolioInwardGrnCostINR,
      portfolioCommittedPoCostINR,
      portfolioEstimatedBomCostINR
    );
    const portfolioProjectedMarginINR =
      Math.round((portfolioContractValueINR - portfolioEffectiveCostINR) * 100) / 100;
    const portfolioMarginPercent =
      portfolioContractValueINR > 0
        ? Math.round(((portfolioContractValueINR - portfolioEffectiveCostINR) / portfolioContractValueINR) * 1000) / 10
        : 0;

    res.status(200).json({
      success: true,
      summary: {
        totalProjects: projectCostingRows.length,
        bomAttachedCount: projectCostingRows.filter((r) => r.bomAttached).length,
        portfolioContractValueINR: Math.round(portfolioContractValueINR * 100) / 100,
        portfolioEstimatedBomCostINR: Math.round(portfolioEstimatedBomCostINR * 100) / 100,
        portfolioCommittedPoCostINR: Math.round(portfolioCommittedPoCostINR * 100) / 100,
        portfolioInwardGrnCostINR: Math.round(portfolioInwardGrnCostINR * 100) / 100,
        portfolioWipIssuedCostINR: Math.round(portfolioWipIssuedCostINR * 100) / 100,
        portfolioProjectedMarginINR,
        portfolioMarginPercent
      },
      projects: projectCostingRows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update BOM & BOQ Item Prices Directly from Project Costing Dashboard
 * PATCH /api/v1/project-setup/projects/:id/bom-prices
 */
export const updateProjectBomItemPrices = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one item price update.'
      });
    }

    const isUuid = UUID_REGEX.test(id);
    const upperId = String(id).trim().toUpperCase();

    const project = await prisma.project.findFirst({
      where: isUuid ? { id } : { OR: [{ workOrderNumber: upperId }, { projectId: upperId }] }
    });

    const pKey1 = String(project?.projectId || upperId).trim();
    const pKey2 = String(project?.workOrderNumber || upperId).trim();

    const bomDoc = await prisma.bom.findFirst({
      where: {
        OR: [
          { projectId: { equals: pKey1, mode: 'insensitive' } },
          { projectId: { equals: pKey2, mode: 'insensitive' } },
          { bomNumber: { equals: pKey1, mode: 'insensitive' } },
          { bomNumber: { equals: pKey2, mode: 'insensitive' } }
        ]
      }
    });

    if (!bomDoc) {
      return res.status(404).json({
        success: false,
        message: `No BOM record found for Work Order ${pKey2}. Please attach a BOM or drawing first.`
      });
    }

    const actorName = getActorName(req.user);
    const existingItems = Array.isArray(bomDoc.items) ? [...bomDoc.items] : [];

    // Build lookup by index, id, and itemCode
    const byIndex = new Map();
    const byId = new Map();
    const byCode = new Map();

    updates.forEach((u) => {
      const rate = Math.max(0, Number(u.standardRateINR ?? u.rate ?? u.unitPrice ?? 0) || 0);
      if (u.index !== undefined && u.index !== null) {
        byIndex.set(Number(u.index), rate);
      }
      if (u.itemId) {
        byId.set(String(u.itemId), rate);
      }
      if (u.itemCode) {
        byCode.set(String(u.itemCode).trim().toUpperCase(), rate);
      }
    });

    let updatedCount = 0;
    const updatedItems = existingItems.map((it, idx) => {
      const code = String(it.itemCode || it.drawingNumber || it.name || '').trim().toUpperCase();
      const itemId = String(it.id || `${code}_${idx}`);

      let newRate = null;
      if (byIndex.has(idx)) {
        newRate = byIndex.get(idx);
      } else if (byId.has(itemId)) {
        newRate = byId.get(itemId);
      } else if (code && byCode.has(code)) {
        newRate = byCode.get(code);
      }

      if (newRate !== null && newRate !== undefined) {
        updatedCount++;
        const qty = Number(it.quantityPerMachine ?? it.baseQty ?? it.qty ?? 1) || 1;
        return {
          ...it,
          standardRateINR: newRate,
          totalCostINR: Math.round(qty * newRate * 100) / 100
        };
      }
      return it;
    });

    const attachedDrawings = resolveAttachedDrawings(bomDoc, updatedItems);
    const updatedSummary = computeBomSummaryHelper(updatedItems, attachedDrawings, bomDoc.summary);

    const updatedBom = await prisma.bom.update({
      where: { id: bomDoc.id },
      data: {
        items: updatedItems,
        summary: updatedSummary,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PROJECT_BOM_PRICES_UPDATED',
      module: 'project-setup',
      entityId: updatedBom.id,
      entityType: 'Bom',
      notes: `Updated ${updatedCount} BOM item price(s) for Work Order ${pKey2}. Est. BOM Cost: INR ${updatedSummary.estimatedTotalCostINR}`
    });

    res.status(200).json({
      success: true,
      message: `All set! ${updatedCount} BOM item price(s) saved for ${pKey2}.`,
      bom: updatedBom
    });
  } catch (error) {
    next(error);
  }
};
