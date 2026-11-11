import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { ensureDefaultDesignMasters } from './designMaster.controller.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

const formatBom = (b) => ({
  ...b,
  _id: b.id,
  assemblyCode: b.attachedAssemblyCode,
  assemblyName: b.attachedAssemblyName,
  items: Array.isArray(b.items) ? b.items : []
});

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
        message: `No BOM found yet for Project ID ${cleanPrj}. Attach an Assembly Machine or add BOM items to begin.`
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

    let bom;
    if (!existing) {
      const count = await prisma.bom.count();
      const bomNumber = `BOM-${cleanPrj}-${String(count + 1).padStart(3, '0')}`;

      bom = await prisma.bom.create({
        data: {
          projectId: cleanPrj,
          bomNumber,
          revision,
          attachedAssemblyCode: assemblyCode || '',
          attachedAssemblyName: assemblyName || '',
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
 * Attach an Assembly Machine Master to a Project:
 * Expands the 3-level / 5-tier hierarchy (Level 1 Assembly -> Level 2 Sub-Assemblies -> Level 3 Components / BO / RM)
 * into the Project's BOM, updates Project.attachedAssemblyCode, and prepares Net Demand for Purchase.
 */
export const attachAssemblyToProject = async (req, res, next) => {
  try {
    await ensureDefaultDesignMasters(req.user);
    const { projectId, assemblyCode, machineQuantity = 1 } = req.body;

    if (!projectId || !assemblyCode) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and Assembly Machine Code are required.'
      });
    }

    const cleanPrj = String(projectId).toUpperCase().trim();
    const cleanAsm = String(assemblyCode).toUpperCase().trim();
    const qtyMultiplier = Math.max(1, Number(machineQuantity) || 1);
    const actorName = getActorName(req.user);

    const allMasters = await prisma.designItemMaster.findMany({
      where: { isActive: true }
    });
    const masterMap = new Map(allMasters.map((m) => [m.itemCode.toUpperCase(), m]));

    const rootAssembly = masterMap.get(cleanAsm);
    if (!rootAssembly) {
      return res.status(404).json({
        success: false,
        message: `Assembly Master '${cleanAsm}' not found in Design Masters.`
      });
    }

    const expandedItems = [];

    // Level 1: Root Assembly Machine
    expandedItems.push({
      level: 1,
      parentItemCode: null,
      itemCode: rootAssembly.itemCode,
      itemName: rootAssembly.itemName,
      itemType: rootAssembly.itemType || 'ASSEMBLY',
      category: rootAssembly.category || 'Complete Machine Assembly',
      subAssemblyGroup: rootAssembly.subAssemblyGroup || 'Main Machine',
      makeOrBuy: rootAssembly.makeOrBuy || 'MAKE',
      quantityPerMachine: qtyMultiplier,
      baseQty: qtyMultiplier,
      baseUom: rootAssembly.baseUom || 'Nos',
      altQty: qtyMultiplier * (rootAssembly.conversionRatio || 1),
      altUom: rootAssembly.altUom || 'Nos',
      conversionRatio: rootAssembly.conversionRatio || 1,
      drawingNumber: rootAssembly.drawingNumber || '',
      versionCode: rootAssembly.currentVersion || 'v1',
      standardRateINR: rootAssembly.standardRateINR || 0,
      ecoStatus: 'ACTIVE',
      ecoReference: null
    });

    const directChildren = Array.isArray(rootAssembly.childItems) ? rootAssembly.childItems : [];
    for (const child of directChildren) {
      const childMaster = masterMap.get(String(child.itemCode || '').toUpperCase()) || {};
      const childType = childMaster.itemType || child.itemType || 'SUB_ASSEMBLY';
      const childQty = (Number(child.quantity) || 1) * qtyMultiplier;
      const isSubAsm = childType === 'SUB_ASSEMBLY';

      expandedItems.push({
        level: isSubAsm ? 2 : 3,
        parentItemCode: rootAssembly.itemCode,
        itemCode: childMaster.itemCode || child.itemCode,
        itemName: childMaster.itemName || child.itemName,
        itemType: childType,
        category: childMaster.category || childType,
        subAssemblyGroup: childMaster.subAssemblyGroup || child.subAssemblyGroup || 'Sub-Assembly',
        makeOrBuy: childMaster.makeOrBuy || child.makeOrBuy || (['RM', 'BO'].includes(childType) ? 'BUY' : 'MAKE'),
        quantityPerMachine: childQty,
        baseQty: childQty,
        baseUom: childMaster.baseUom || child.uom || 'Nos',
        altQty: childQty * (childMaster.conversionRatio || 1),
        altUom: childMaster.altUom || child.uom || 'Nos',
        conversionRatio: childMaster.conversionRatio || 1,
        drawingNumber: childMaster.drawingNumber || child.drawingNumber || '',
        versionCode: childMaster.currentVersion || 'v1',
        standardRateINR: childMaster.standardRateINR || 0,
        ecoStatus: 'ACTIVE',
        ecoReference: null
      });

      // Expand Level 3 children inside Sub-Assembly
      const grandChildren = Array.isArray(childMaster.childItems) ? childMaster.childItems : [];
      for (const gc of grandChildren) {
        const gcMaster = masterMap.get(String(gc.itemCode || '').toUpperCase()) || {};
        const gcType = gcMaster.itemType || gc.itemType || 'COMPONENT';
        const gcQty = (Number(gc.quantity) || 1) * childQty;

        expandedItems.push({
          level: 3,
          parentItemCode: childMaster.itemCode || child.itemCode,
          itemCode: gcMaster.itemCode || gc.itemCode,
          itemName: gcMaster.itemName || gc.itemName,
          itemType: gcType,
          category: gcMaster.category || gcType,
          subAssemblyGroup: gcMaster.subAssemblyGroup || gc.subAssemblyGroup || child.subAssemblyGroup || 'Components',
          makeOrBuy: gcMaster.makeOrBuy || gc.makeOrBuy || (['RM', 'BO'].includes(gcType) ? 'BUY' : 'MAKE'),
          quantityPerMachine: gcQty,
          baseQty: gcQty,
          baseUom: gcMaster.baseUom || gc.uom || 'Nos',
          altQty: gcQty * (gcMaster.conversionRatio || 1),
          altUom: gcMaster.altUom || gc.uom || 'Nos',
          conversionRatio: gcMaster.conversionRatio || 1,
          drawingNumber: gcMaster.drawingNumber || gc.drawingNumber || '',
          versionCode: gcMaster.currentVersion || 'v1',
          standardRateINR: gcMaster.standardRateINR || 0,
          ecoStatus: 'ACTIVE',
          ecoReference: null
        });
      }
    }

    const existing = await prisma.bom.findUnique({ where: { projectId: cleanPrj } });
    let bom;

    if (!existing) {
      const count = await prisma.bom.count();
      const bomNumber = `BOM-${cleanPrj}-${String(count + 1).padStart(3, '0')}`;

      bom = await prisma.bom.create({
        data: {
          projectId: cleanPrj,
          bomNumber,
          revision: 'REV-0',
          attachedAssemblyCode: rootAssembly.itemCode,
          attachedAssemblyName: rootAssembly.itemName,
          approvedById: req.user?.id || null,
          approvedByName: actorName,
          approvedAt: new Date(),
          items: expandedItems,
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
          attachedAssemblyCode: rootAssembly.itemCode,
          attachedAssemblyName: rootAssembly.itemName,
          approvedById: req.user?.id || null,
          approvedByName: actorName,
          approvedAt: new Date(),
          items: expandedItems,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    // Update Project record if it exists
    const projectRecord = await prisma.project.findUnique({ where: { projectId: cleanPrj } });
    if (projectRecord) {
      await prisma.project.update({
        where: { projectId: cleanPrj },
        data: {
          attachedAssemblyCode: rootAssembly.itemCode,
          attachedAssemblyName: rootAssembly.itemName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    await logAuditEvent({
      req,
      action: 'ASSEMBLY_ATTACHED_TO_PROJECT',
      module: 'design',
      entityId: bom.id,
      entityType: 'Bom',
      notes: `Attached Assembly Machine '${rootAssembly.itemCode}' (${expandedItems.length} BOM nodes) to Project ${cleanPrj} and released net demand to Purchase.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Assembly '${rootAssembly.itemCode}' attached to ${cleanPrj} (${expandedItems.length} BOM nodes released to Purchase).`,
      bom: formatBom(bom)
    });
  } catch (error) {
    next(error);
  }
};
