import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { ensureDefaultDesignMasters } from './designMaster.controller.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const calculateBomSummary = (items = []) => {
  let assemblyCount = 0;
  let subAssemblyCount = 0;
  let componentCount = 0;
  let buyCount = 0;
  let makeCount = 0;
  let drawingsCount = 0;
  let estimatedTotalCostINR = 0;

  for (const it of items) {
    const t = String(it.itemType || '').toUpperCase();
    if (t === 'ASSEMBLY' || t === 'FG') assemblyCount++;
    else if (t === 'SUB_ASSEMBLY') subAssemblyCount++;
    else componentCount++;

    const mob = String(it.makeOrBuy || '').toUpperCase();
    if (mob === 'BUY') buyCount++;
    else makeCount++;

    if (it.drawingNumber || it.drawingPdfUrl || it.primaryPdfUrl || it.pdfUrl) drawingsCount++;

    const qty = Number(it.quantityPerMachine || it.baseQty) || 1;
    const rate = Number(it.standardRateINR) || 0;
    estimatedTotalCostINR += qty * rate;
  }

  return {
    totalItems: items.length,
    assemblyCount,
    subAssemblyCount,
    componentCount,
    buyCount,
    makeCount,
    drawingsCount,
    estimatedTotalCostINR: Math.round(estimatedTotalCostINR * 100) / 100
  };
};

const formatBom = (b) => {
  const items = Array.isArray(b.items) ? b.items : [];
  const attachedDrawings =
    Array.isArray(b.attachedDrawings) && b.attachedDrawings.length > 0
      ? b.attachedDrawings
      : Array.isArray(b.summary?.attachedDrawings)
      ? b.summary.attachedDrawings
      : [];

  const rawSummary =
    typeof b.summary === 'object' && b.summary !== null ? b.summary : {};

  const summary = {
    ...calculateBomSummary(items),
    ...rawSummary,
    attachedDrawings
  };

  const primaryDrawing = attachedDrawings[0] || null;

  return {
    ...b,
    _id: b.id,
    assemblyCode: b.attachedAssemblyCode || primaryDrawing?.itemCode || '',
    assemblyName: b.attachedAssemblyName || primaryDrawing?.itemName || '',
    attachedDrawingType: b.attachedDrawingType || primaryDrawing?.classification || 'ASSEMBLY',
    attachedDrawingNumber: b.attachedDrawingNumber || primaryDrawing?.drawingNumber || '',
    attachedDrawings,
    approvalStatus: b.approvalStatus || (b.isFrozen ? 'LOCKED_FREEZE' : 'DRAFT'),
    rejectionReason: b.rejectionReason || '',
    summary,
    items
  };
};

/**
 * Universal Master Drawing Finder:
 * Checks FgItemMaster (Design Drawings / Assemblies / Sub-Assemblies / Components),
 * RmItemMaster (Raw Materials & Buyouts), and DesignItemMaster.
 */
export const findMasterDrawing = async (identifier) => {
  if (!identifier) return null;
  const clean = String(identifier).trim();

  // 1. Check FgItemMaster (by id or by name)
  const fg = await prisma.fgItemMaster.findFirst({
    where: {
      OR: [
        { id: clean.length === 36 ? clean : undefined },
        { name: { equals: clean, mode: 'insensitive' } }
      ],
      isActive: true
    }
  });

  if (fg) {
    return {
      source: 'FG',
      id: fg.id,
      itemCode: fg.name,
      itemName: fg.description ? `${fg.name} — ${fg.description}` : fg.name,
      classification: (fg.classification || 'COMPONENT').toUpperCase(),
      itemType: (fg.classification || 'COMPONENT').toUpperCase(),
      category: fg.categoryName || 'Design Drawing',
      subAssemblyGroup: fg.categoryName || '',
      revision: fg.revision || 'Rev 1.0',
      description: fg.description || '',
      uom: fg.uom || 'Nos',
      baseUom: fg.uom || 'Nos',
      hsnCode: fg.hsnCode || '8479',
      drawingNumber: fg.name,
      primaryPdfUrl: fg.pdfUrl || '',
      primaryPhotoUrl: fg.photoUrl || (Array.isArray(fg.photos) && fg.photos[0]) || '',
      bomItems: Array.isArray(fg.bomItems) ? fg.bomItems : [],
      standardRateINR: 0
    };
  }

  // 2. Check RmItemMaster (by id or by name)
  const rm = await prisma.rmItemMaster.findFirst({
    where: {
      OR: [
        { id: clean.length === 36 ? clean : undefined },
        { name: { equals: clean, mode: 'insensitive' } }
      ],
      isActive: true
    }
  });

  if (rm) {
    return {
      source: 'RM',
      id: rm.id,
      itemCode: rm.name,
      itemName: rm.description ? `${rm.name} — ${rm.description}` : rm.name,
      classification: 'COMPONENT',
      itemType: 'RM',
      category: rm.categoryName || 'Raw Material',
      subAssemblyGroup: rm.categoryName || '',
      revision: rm.revision || 'Rev 1.0',
      description: rm.description || '',
      uom: rm.uom || 'Kg',
      baseUom: rm.uom || 'Kg',
      hsnCode: rm.hsnCode || '7228',
      drawingNumber: rm.name,
      primaryPdfUrl: rm.pdfUrl || '',
      primaryPhotoUrl: rm.photoUrl || '',
      bomItems: [],
      standardRateINR: rm.standardRateINR || 0
    };
  }

  // 3. Check DesignItemMaster
  const dm = await prisma.designItemMaster.findFirst({
    where: {
      OR: [
        { id: clean.length === 36 ? clean : undefined },
        { itemCode: { equals: clean, mode: 'insensitive' } },
        { itemName: { equals: clean, mode: 'insensitive' } }
      ],
      isActive: true
    }
  });

  if (dm) {
    return {
      source: 'DESIGN_MASTER',
      id: dm.id,
      itemCode: dm.itemCode,
      itemName: dm.itemName,
      classification: (dm.itemType || 'COMPONENT').toUpperCase(),
      itemType: (dm.itemType || 'COMPONENT').toUpperCase(),
      category: dm.category || 'Mechanical',
      subAssemblyGroup: dm.subAssemblyGroup || '',
      revision: dm.currentVersion || 'v1',
      description: dm.specifications || '',
      uom: dm.baseUom || 'Nos',
      baseUom: dm.baseUom || 'Nos',
      hsnCode: dm.hsnCode || '8479',
      drawingNumber: dm.drawingNumber || dm.itemCode,
      primaryPdfUrl: dm.primaryPdfUrl || '',
      primaryPhotoUrl: dm.primaryPhotoUrl || '',
      childItems: Array.isArray(dm.childItems) ? dm.childItems : [],
      standardRateINR: dm.standardRateINR || 0
    };
  }

  return null;
};

export const getBoms = async (req, res, next) => {
  try {
    const { projectId, search } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (search) where.bomNumber = { contains: String(search), mode: 'insensitive' };

    const boms = await prisma.bom.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      count: boms.length,
      boms: boms.map(formatBom)
    });
  } catch (error) {
    next(error);
  }
};

export const getBomByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const cleanPrj = String(projectId).toUpperCase().trim();

    const bom = await prisma.bom.findUnique({
      where: { projectId: cleanPrj }
    });

    if (!bom) {
      return res.status(404).json({
        success: false,
        message: `No BOM found yet for Work Order ${cleanPrj}. Attach an Assembly Machine or add BOM items to begin.`
      });
    }

    res.status(200).json({
      success: true,
      bom: formatBom(bom)
    });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateBom = async (req, res, next) => {
  try {
    const { projectId, items, revision = 'REV-0', assemblyCode, assemblyName, status } = req.body;
    if (!projectId || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'projectId and items array are required.'
      });
    }

    const cleanPrj = String(projectId).toUpperCase().trim();
    const actorName = getActorName(req.user);

    const existing = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });

    if (existing && existing.isFrozen && existing.approvalStatus === 'LOCKED_FREEZE') {
      return res.status(400).json({
        success: false,
        message:
          'This BOM is permanently locked. Any design updates or modifications strictly require an Engineering Change Request (ECO).'
      });
    }

    const summary = calculateBomSummary(items);

    let bom;
    if (!existing) {
      const bomNumber = await generateUniqueSequenceCode({
        model: 'bom',
        field: 'bomNumber',
        prefix: `BOM-${cleanPrj}-`,
        startSeq: 1,
        padLength: 3
      });

      bom = await prisma.bom.create({
        data: {
          projectId: cleanPrj,
          bomNumber,
          revision,
          attachedAssemblyCode: assemblyCode || '',
          attachedAssemblyName: assemblyName || '',
          approvalStatus: 'DRAFT',
          summary,
          items,
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    } else {
      bom = await prisma.bom.update({
        where: { projectId: cleanPrj },
        data: {
          items,
          summary,
          revision: revision || existing.revision,
          attachedAssemblyCode: assemblyCode !== undefined ? assemblyCode : existing.attachedAssemblyCode,
          attachedAssemblyName: assemblyName !== undefined ? assemblyName : existing.attachedAssemblyName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    await logAuditEvent({
      req,
      action: 'BOM_SAVED',
      module: 'design',
      entityId: bom.id,
      entityType: 'Bom',
      notes: `Hierarchical BOM saved for Project ${cleanPrj}. Total items: ${items.length}`
    });

    res.status(200).json({
      success: true,
      message: `All set! BOM saved for ${cleanPrj}.`,
      bom: formatBom(bom)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Universal Drawing Attachment to Work Order:
 * Supports attaching MULTIPLE drawings (Assemblies, Sub-Assemblies, Components).
 * Automatically looks up FgItemMaster, RmItemMaster, and DesignItemMaster.
 */
export const attachDrawingToProject = async (req, res, next) => {
  try {
    const config = await ensureDefaultDesignMasters(req.user);
    const policy = config?.prefixLockPolicy || {};

    const {
      projectId,
      itemCode,
      assemblyCode,
      drawingType,
      machineQuantity = 1,
      mode = 'APPEND' // Default to APPEND so multiple drawings can be added!
    } = req.body;

    const targetCode = itemCode || assemblyCode;
    if (!projectId || !targetCode) {
      return res.status(400).json({
        success: false,
        message: 'Work Order Number and Drawing / Item Code from Master are required.'
      });
    }

    const cleanPrj = String(projectId).toUpperCase().trim();
    const qtyMultiplier = Math.max(1, Number(machineQuantity) || 1);
    const actorName = getActorName(req.user);

    const existingBom = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });
    if (existingBom && existingBom.isFrozen && existingBom.approvalStatus === 'LOCKED_FREEZE') {
      return res.status(400).json({
        success: false,
        message:
          'This Work Order is permanently locked. Any drawing modification strictly requires an Engineering Change Request (ECO).'
      });
    }

    // Look up drawing across all master tables
    const rootMaster = await findMasterDrawing(targetCode);
    if (!rootMaster) {
      return res.status(404).json({
        success: false,
        message: `Design Item / Drawing '${targetCode}' was not found in Design Masters or FG Items.`
      });
    }

    const resolvedType = (drawingType || rootMaster.classification || rootMaster.itemType || 'ASSEMBLY').toUpperCase();
    const drawingId = `DRG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Build the new drawing record for attachedDrawings list
    const newDrawingRecord = {
      drawingId,
      masterId: rootMaster.id,
      itemCode: rootMaster.itemCode,
      itemName: rootMaster.description ? `${rootMaster.itemCode} — ${rootMaster.description}` : rootMaster.itemName,
      classification: resolvedType,
      drawingNumber: rootMaster.drawingNumber || rootMaster.itemCode,
      revision: rootMaster.revision || 'Rev 1.0',
      description: rootMaster.description || '',
      quantity: qtyMultiplier,
      baseUom: rootMaster.baseUom || 'Nos',
      pdfUrl: rootMaster.primaryPdfUrl || '',
      photoUrl: rootMaster.primaryPhotoUrl || '',
      attachedAt: new Date().toISOString(),
      attachedByName: actorName
    };

    // Expand items based on type
    const newExpandedItems = [];

    const buildNode = ({
      level,
      parentCode,
      master,
      qty,
      overrideType
    }) => ({
      id: `${master.itemCode || 'ITEM'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attachedDrawingId: drawingId,
      level,
      parentItemCode: parentCode,
      itemCode: master.itemCode,
      itemName: master.itemName,
      itemType: overrideType || master.itemType || master.classification || 'COMPONENT',
      category: master.category || 'Mechanical',
      subAssemblyGroup: master.subAssemblyGroup || '',
      makeOrBuy: master.makeOrBuy || (['RM', 'BO'].includes(master.itemType) ? 'BUY' : 'MAKE'),
      quantityPerMachine: qty,
      baseQty: qty,
      baseUom: master.baseUom || master.uom || 'Nos',
      altQty: qty * (master.conversionRatio || 1),
      altUom: master.altUom || master.uom || 'Nos',
      conversionRatio: master.conversionRatio || 1,
      drawingNumber: master.drawingNumber || master.itemCode || '',
      versionCode: master.revision || master.currentVersion || 'v1',
      drawingPdfUrl: master.primaryPdfUrl || master.pdfUrl || '',
      drawingPhotoUrl: master.primaryPhotoUrl || master.photoUrl || '',
      drawingCadUrl: master.primaryCadUrl || '',
      standardRateINR: master.standardRateINR || 0,
      totalCostINR: Math.round(qty * (master.standardRateINR || 0) * 100) / 100,
      ecoStatus: 'ACTIVE',
      ecoReference: null
    });

    if (resolvedType === 'ASSEMBLY' || resolvedType === 'FG') {
      newExpandedItems.push(
        buildNode({
          level: 1,
          parentCode: null,
          master: rootMaster,
          qty: qtyMultiplier,
          overrideType: 'ASSEMBLY'
        })
      );

      // Expand bomItems if defined in FgItemMaster
      const directChildren = rootMaster.bomItems || rootMaster.childItems || [];
      for (const child of directChildren) {
        const childCode = child.itemName || child.itemCode || child.name;
        const childMaster = (await findMasterDrawing(childCode)) || {
          itemCode: childCode,
          itemName: child.description || childCode,
          itemType: child.itemType === 'RM-BO' ? 'BO' : 'SUB_ASSEMBLY',
          classification: child.itemType === 'RM-BO' ? 'BO' : 'SUB_ASSEMBLY',
          makeOrBuy: child.itemType === 'RM-BO' ? 'BUY' : 'MAKE',
          baseUom: child.uom || 'Nos',
          drawingNumber: childCode
        };

        const childType = childMaster.classification || childMaster.itemType || 'SUB_ASSEMBLY';
        const childQty = (Number(child.quantity) || 1) * qtyMultiplier;
        const isSubAsm = childType === 'SUB_ASSEMBLY';

        newExpandedItems.push(
          buildNode({
            level: isSubAsm ? 2 : 3,
            parentCode: rootMaster.itemCode,
            master: childMaster,
            qty: childQty,
            overrideType: childType
          })
        );
      }
    } else if (resolvedType === 'SUB_ASSEMBLY') {
      newExpandedItems.push(
        buildNode({
          level: 2,
          parentCode: existingBom?.attachedAssemblyCode || null,
          master: rootMaster,
          qty: qtyMultiplier,
          overrideType: 'SUB_ASSEMBLY'
        })
      );

      const subChildren = rootMaster.bomItems || rootMaster.childItems || [];
      for (const sc of subChildren) {
        const scCode = sc.itemName || sc.itemCode || sc.name;
        const scMaster = (await findMasterDrawing(scCode)) || {
          itemCode: scCode,
          itemName: sc.description || scCode,
          itemType: 'COMPONENT',
          classification: 'COMPONENT',
          baseUom: sc.uom || 'Nos',
          drawingNumber: scCode
        };
        const scQty = (Number(sc.quantity) || 1) * qtyMultiplier;

        newExpandedItems.push(
          buildNode({
            level: 3,
            parentCode: rootMaster.itemCode,
            master: scMaster,
            qty: scQty,
            overrideType: 'COMPONENT'
          })
        );
      }
    } else {
      // Level 3 Component
      newExpandedItems.push(
        buildNode({
          level: 3,
          parentCode: existingBom?.attachedAssemblyCode || null,
          master: rootMaster,
          qty: qtyMultiplier,
          overrideType: resolvedType
        })
      );
    }

    // Maintain attachedDrawings array
    const existingDrawings =
      Array.isArray(existingBom?.attachedDrawings) && existingBom.attachedDrawings.length > 0
        ? existingBom.attachedDrawings
        : Array.isArray(existingBom?.summary?.attachedDrawings)
        ? existingBom.summary.attachedDrawings
        : [];

    let currentDrawings = [...existingDrawings];
    let currentItems = Array.isArray(existingBom?.items) ? [...existingBom.items] : [];

    if (mode === 'REPLACE') {
      currentDrawings = [newDrawingRecord];
      currentItems = newExpandedItems;
    } else {
      // APPEND mode: add or update drawing in attachedDrawings
      const existingIdx = currentDrawings.findIndex((d) => d.itemCode.toUpperCase() === rootMaster.itemCode.toUpperCase());
      if (existingIdx >= 0) {
        currentDrawings[existingIdx] = newDrawingRecord;
        // replace old items of this drawing
        currentItems = currentItems.filter(
          (i) => i.attachedDrawingId !== currentDrawings[existingIdx].drawingId && i.itemCode !== rootMaster.itemCode
        );
      } else {
        currentDrawings.push(newDrawingRecord);
      }
      currentItems = [...currentItems, ...newExpandedItems];
    }

    const summary = {
      ...calculateBomSummary(currentItems),
      attachedDrawings: currentDrawings
    };

    // Approval Policy Check
    const approvalRequired = policy.approvalRequired !== false;
    let nextApprovalStatus = 'PENDING_APPROVAL';
    let isFrozen = false;
    let approvedAt = null;
    let approvedByName = '';

    if (!approvalRequired) {
      nextApprovalStatus = policy.lockMode === 'IMMEDIATE_ON_APPROVAL' ? 'LOCKED_FREEZE' : 'APPROVED';
      isFrozen = policy.lockMode === 'IMMEDIATE_ON_APPROVAL';
      approvedAt = new Date();
      approvedByName = actorName;
    }

    const primaryAsm = currentDrawings.find((d) => d.classification === 'ASSEMBLY') || currentDrawings[0];

    let bom;
    if (!existingBom) {
      const bomNumber = await generateUniqueSequenceCode({
        model: 'bom',
        field: 'bomNumber',
        prefix: `BOM-${cleanPrj}-`,
        startSeq: 1,
        padLength: 3
      });

      bom = await prisma.bom.create({
        data: {
          projectId: cleanPrj,
          bomNumber,
          revision: 'REV-0',
          attachedAssemblyCode: primaryAsm?.itemCode || rootMaster.itemCode,
          attachedAssemblyName: primaryAsm?.itemName || rootMaster.itemName,
          attachedDrawingType: primaryAsm?.classification || resolvedType,
          attachedDrawingNumber: primaryAsm?.drawingNumber || rootMaster.drawingNumber || '',
          approvalStatus: nextApprovalStatus,
          isFrozen,
          approvedAt,
          approvedByName,
          rejectionReason: '',
          summary,
          items: currentItems,
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    } else {
      bom = await prisma.bom.update({
        where: { projectId: cleanPrj },
        data: {
          attachedAssemblyCode: primaryAsm?.itemCode || existingBom.attachedAssemblyCode || rootMaster.itemCode,
          attachedAssemblyName: primaryAsm?.itemName || existingBom.attachedAssemblyName || rootMaster.itemName,
          attachedDrawingType: primaryAsm?.classification || existingBom.attachedDrawingType || resolvedType,
          attachedDrawingNumber: primaryAsm?.drawingNumber || existingBom.attachedDrawingNumber || '',
          approvalStatus: nextApprovalStatus,
          isFrozen,
          approvedAt,
          approvedByName,
          rejectionReason: '',
          summary,
          items: currentItems,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    // Update Project record if it exists
    const projectRecord = await prisma.project.findUnique({ where: { projectId: cleanPrj } });
    if (projectRecord) {
      const nextStatus =
        projectRecord.status === 'APPROVED' || projectRecord.status === 'ASSIGNED_TO_DEPARTMENT'
          ? 'IN_PROGRESS'
          : projectRecord.status;
      await prisma.project.update({
        where: { projectId: cleanPrj },
        data: {
          status: nextStatus,
          attachedAssemblyCode: primaryAsm?.itemCode || rootMaster.itemCode,
          attachedAssemblyName: primaryAsm?.itemName || rootMaster.itemName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    await logAuditEvent({
      req,
      action: 'DRAWING_ATTACHED_TO_PROJECT',
      module: 'design',
      entityId: bom.id,
      entityType: 'Bom',
      notes: `Attached Master Drawing '${rootMaster.itemCode}' (${resolvedType}) to Work Order ${cleanPrj}. Total drawings: ${currentDrawings.length}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Drawing '${rootMaster.itemCode}' added to Work Order ${cleanPrj} (${currentDrawings.length} drawings total).`,
      bom: formatBom(bom)
    });
  } catch (error) {
    next(error);
  }
};

// Backwards-compatible alias for existing frontend callers
export const attachAssemblyToProject = attachDrawingToProject;

/**
 * Remove an attached drawing from a Work Order:
 * Removes the drawing record from attachedDrawings and its nodes from items.
 */
export const removeAttachedDrawing = async (req, res, next) => {
  try {
    const { projectId, drawingId, itemCode } = req.body;
    if (!projectId || (!drawingId && !itemCode)) {
      return res.status(400).json({
        success: false,
        message: 'projectId and drawingId or itemCode are required.'
      });
    }

    const cleanPrj = String(projectId).toUpperCase().trim();
    const actorName = getActorName(req.user);

    const existingBom = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });
    if (!existingBom) {
      return res.status(404).json({ success: false, message: `BOM not found for ${cleanPrj}.` });
    }

    if (existingBom.isFrozen && existingBom.approvalStatus === 'LOCKED_FREEZE') {
      return res.status(400).json({
        success: false,
        message: 'This BOM is permanently locked. Removal strictly requires an Engineering Change Request (ECO).'
      });
    }

    const currentDrawings =
      Array.isArray(existingBom.attachedDrawings) && existingBom.attachedDrawings.length > 0
        ? existingBom.attachedDrawings
        : Array.isArray(existingBom.summary?.attachedDrawings)
        ? existingBom.summary.attachedDrawings
        : [];
    const currentItems = Array.isArray(existingBom.items) ? existingBom.items : [];

    const targetDrawing = currentDrawings.find(
      (d) => (drawingId && d.drawingId === drawingId) || (itemCode && d.itemCode.toUpperCase() === itemCode.toUpperCase())
    );

    const targetCode = targetDrawing?.itemCode || itemCode;
    const targetDrgId = targetDrawing?.drawingId || drawingId;

    const remainingDrawings = currentDrawings.filter(
      (d) => d.drawingId !== targetDrgId && (!targetCode || d.itemCode.toUpperCase() !== targetCode.toUpperCase())
    );

    const remainingItems = currentItems.filter(
      (i) => i.attachedDrawingId !== targetDrgId && (!targetCode || (i.itemCode !== targetCode && i.parentItemCode !== targetCode))
    );

    const summary = {
      ...calculateBomSummary(remainingItems),
      attachedDrawings: remainingDrawings
    };
    const primaryAsm = remainingDrawings.find((d) => d.classification === 'ASSEMBLY') || remainingDrawings[0];

    const updatedBom = await prisma.bom.update({
      where: { projectId: cleanPrj },
      data: {
        attachedAssemblyCode: primaryAsm?.itemCode || '',
        attachedAssemblyName: primaryAsm?.itemName || '',
        attachedDrawingType: primaryAsm?.classification || 'ASSEMBLY',
        attachedDrawingNumber: primaryAsm?.drawingNumber || '',
        items: remainingItems,
        summary,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'DRAWING_REMOVED_FROM_PROJECT',
      module: 'design',
      entityId: updatedBom.id,
      entityType: 'Bom',
      notes: `Removed drawing '${targetCode}' from Work Order ${cleanPrj}. Remaining drawings: ${remainingDrawings.length}.`
    });

    res.status(200).json({
      success: true,
      message: `Drawing removed from Work Order ${cleanPrj}.`,
      bom: formatBom(updatedBom)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve BOM & Drawing for Work Order:
 * Transitions status to LOCKED_FREEZE, sets isFrozen=true, records approver,
 * and permanently locks the tree (changes strictly require ECO/ECR).
 */
export const approveBom = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const cleanPrj = String(projectId).toUpperCase().trim();
    const actorName = getActorName(req.user);

    const existing = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `No BOM found for Work Order ${cleanPrj}.`
      });
    }

    const items = Array.isArray(existing.items) ? existing.items : [];
    const summary = calculateBomSummary(items);

    const updated = await prisma.bom.update({
      where: { projectId: cleanPrj },
      data: {
        approvalStatus: 'LOCKED_FREEZE',
        isFrozen: true,
        approvedById: req.user?.id || null,
        approvedByName: actorName,
        approvedAt: new Date(),
        rejectionReason: '',
        summary,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'BOM_APPROVED_AND_LOCKED',
      module: 'design',
      entityId: updated.id,
      entityType: 'Bom',
      notes: `Approved and permanently locked BOM for Work Order ${cleanPrj} by ${actorName}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! BOM approved and permanently locked for Work Order ${cleanPrj}.`,
      bom: formatBom(updated)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject BOM & Drawing for Work Order:
 * Returns status to REJECTED with reason so the design engineer can revise.
 */
export const rejectBom = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { rejectionReason } = req.body;
    const cleanPrj = String(projectId).toUpperCase().trim();
    const actorName = getActorName(req.user);

    const existing = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `No BOM found for Work Order ${cleanPrj}.`
      });
    }

    const updated = await prisma.bom.update({
      where: { projectId: cleanPrj },
      data: {
        approvalStatus: 'REJECTED',
        isFrozen: false,
        rejectionReason: rejectionReason || 'Requires revision by design engineer',
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'BOM_REJECTED',
      module: 'design',
      entityId: updated.id,
      entityType: 'Bom',
      notes: `BOM rejected for Work Order ${cleanPrj} by ${actorName}. Reason: ${rejectionReason || 'Requires revision'}`
    });

    res.status(200).json({
      success: true,
      message: `BOM returned for revision: ${rejectionReason || 'Requires revision'}`,
      bom: formatBom(updated)
    });
  } catch (error) {
    next(error);
  }
};
