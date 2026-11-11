import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const DEFAULT_STORE_PREFIX_POLICY = {
  grnPrefix: 'GRN',
  mrPrefix: 'MR',
  dcPrefix: 'DC',
  allocationPrefix: 'ALC',
  requireIncomingQcBeforeAccept: true,
  hardLockAcceptedStockToProject: true
};

export const DEFAULT_STORE_LOCATIONS = [
  { binCode: 'BIN-RM-A01', zoneName: 'Zone A (Raw Steel)', rackNumber: 'R-01', shelfLevel: 'Ground', storageType: 'RM', capacityInfo: '2000 Kg' },
  { binCode: 'BIN-BO-B01', zoneName: 'Zone B (Linear Motion)', rackNumber: 'R-02', shelfLevel: 'L1', storageType: 'BO', capacityInfo: '500 Kg' },
  { binCode: 'BIN-BO-B02', zoneName: 'Zone B (PLC & Controls)', rackNumber: 'R-03', shelfLevel: 'L2', storageType: 'BO', capacityInfo: '300 Kg' },
  { binCode: 'BIN-CMP-C01', zoneName: 'Zone C (Machined Parts)', rackNumber: 'R-04', shelfLevel: 'L1', storageType: 'COMPONENT', capacityInfo: '800 Kg' },
  { binCode: 'BIN-SUB-D01', zoneName: 'Zone D (Sub-Assemblies)', rackNumber: 'R-05', shelfLevel: 'L1', storageType: 'SUB_ASSEMBLY', capacityInfo: '1500 Kg' }
];

export const ensureDefaultStoreMasters = async (user = null) => {
  const actorName = getActorName(user);
  const locCount = await prisma.storeLocationMaster.count();
  if (locCount === 0) {
    for (const loc of DEFAULT_STORE_LOCATIONS) {
      await prisma.storeLocationMaster.upsert({
        where: { binCode: loc.binCode },
        update: {},
        create: {
          ...loc,
          createdById: user?.id || null,
          createdByName: actorName,
          updatedById: user?.id || null,
          updatedByName: actorName
        }
      });
    }
  }

  let config = await prisma.storeConfig.findUnique({
    where: { configKey: 'GLOBAL_STORE_CONFIG' }
  });
  if (!config) {
    config = await prisma.storeConfig.create({
      data: {
        configKey: 'GLOBAL_STORE_CONFIG',
        prefixLockPolicy: DEFAULT_STORE_PREFIX_POLICY,
        createdById: user?.id || null,
        createdByName: actorName,
        updatedById: user?.id || null,
        updatedByName: actorName
      }
    });
  }
  return config;
};

const formatInventoryItem = (it) => ({
  ...it,
  _id: it.id,
  buckets: {
    ordered: it.orderedQty || 0,
    inQc: it.inQcQty || 0,
    accepted: it.acceptedQty || 0,
    issued: it.issuedQty || 0
  }
});

export const getInventoryItems = async (req, res, next) => {
  try {
    await ensureDefaultStoreMasters(req.user);
    const { category = 'RM_BO', search, page = 1 } = req.query;
    const catStr = String(category).toUpperCase().trim();

    if (catStr === 'FG' || catStr === 'FINISHED_GOODS') {
      // 1. Fetch Finished Goods from Design Master
      const [fgMasters, designFgMasters, storeInvItems] = await Promise.all([
        prisma.fgItemMaster.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }),
        prisma.designItemMaster.findMany({
          where: { isActive: true, itemType: { in: ['SUB_ASSEMBLY', 'ASSEMBLY'] } },
          orderBy: { itemCode: 'asc' }
        }),
        prisma.inventoryItem.findMany({
          where: { category: 'FG' }
        })
      ]);

      const storeInvMap = new Map();
      storeInvItems.forEach((si) => {
        storeInvMap.set(si.itemCode.toUpperCase(), si);
      });

      const mergedMap = new Map();

      // Process FG Item Masters
      fgMasters.forEach((fg) => {
        const code = fg.name.toUpperCase();
        const inv = storeInvMap.get(code);
        mergedMap.set(code, {
          id: fg.id,
          _id: fg.id,
          itemCode: fg.name,
          itemName: fg.description || fg.name,
          category: 'FG',
          classification: fg.classification || 'MACHINE',
          categoryName: fg.categoryName || 'Finished Goods',
          revision: fg.revision || 'v1',
          baseUom: fg.uom || 'Nos',
          binLocation: inv?.binLocation || 'FG Store (Bay 1)',
          minSafetyStock: inv?.minSafetyStock || 0,
          standardRateINR: inv?.standardRateINR || 0,
          photoUrl: fg.photoUrl || '',
          pdfUrl: fg.pdfUrl || '',
          pdfName: fg.pdfName || '',
          orderedQty: inv?.orderedQty || 0,
          inQcQty: inv?.inQcQty || 0,
          acceptedQty: inv?.acceptedQty || 0,
          issuedQty: inv?.issuedQty || 0,
          reservedQuantity: inv?.reservedQuantity || 0,
          buckets: {
            ordered: inv?.orderedQty || 0,
            inQc: inv?.inQcQty || 0,
            accepted: inv?.acceptedQty || 0,
            issued: inv?.issuedQty || 0
          },
          createdAt: fg.createdAt,
          updatedAt: fg.updatedAt,
          createdByName: fg.createdByName || 'Design Master',
          updatedByName: fg.updatedByName || 'Store'
        });
      });

      // Process Design Item Masters of type SUB_ASSEMBLY / ASSEMBLY
      designFgMasters.forEach((dm) => {
        const code = dm.itemCode.toUpperCase();
        if (!mergedMap.has(code)) {
          const inv = storeInvMap.get(code);
          mergedMap.set(code, {
            id: dm.id,
            _id: dm.id,
            itemCode: dm.itemCode,
            itemName: dm.itemName,
            category: 'FG',
            classification: dm.itemType,
            categoryName: dm.category || 'Finished Goods',
            revision: dm.currentVersion || 'v1',
            baseUom: dm.baseUom || 'Nos',
            binLocation: inv?.binLocation || 'FG Store (Bay 1)',
            minSafetyStock: inv?.minSafetyStock || 0,
            standardRateINR: dm.standardRateINR || inv?.standardRateINR || 0,
            photoUrl: dm.primaryPhotoUrl || '',
            pdfUrl: dm.primaryPdfUrl || '',
            pdfName: dm.drawingNumber || '',
            orderedQty: inv?.orderedQty || 0,
            inQcQty: inv?.inQcQty || 0,
            acceptedQty: inv?.acceptedQty || 0,
            issuedQty: inv?.issuedQty || 0,
            reservedQuantity: inv?.reservedQuantity || 0,
            buckets: {
              ordered: inv?.orderedQty || 0,
              inQc: inv?.inQcQty || 0,
              accepted: inv?.acceptedQty || 0,
              issued: inv?.issuedQty || 0
            },
            createdAt: dm.createdAt,
            updatedAt: dm.updatedAt,
            createdByName: dm.createdByName || 'Design Master',
            updatedByName: dm.updatedByName || 'Store'
          });
        }
      });

      let items = Array.from(mergedMap.values());

      if (search) {
        const q = String(search).trim().toLowerCase();
        items = items.filter(
          (it) =>
            it.itemCode.toLowerCase().includes(q) ||
            it.itemName.toLowerCase().includes(q) ||
            it.binLocation.toLowerCase().includes(q)
        );
      }

      return res.status(200).json({
        success: true,
        total: items.length,
        page: Number(page),
        items
      });
    }

    // 2. Default: Fetch RM & BO Items directly from Design Master
    const [rmMasters, designMasters, storeInvItems] = await Promise.all([
      prisma.rmItemMaster.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      }),
      prisma.designItemMaster.findMany({
        where: { isActive: true, itemType: { in: ['RM', 'BO', 'COMPONENT'] } },
        orderBy: { itemCode: 'asc' }
      }),
      prisma.inventoryItem.findMany()
    ]);

    const storeInvMap = new Map();
    storeInvItems.forEach((si) => {
      storeInvMap.set(si.itemCode.toUpperCase(), si);
    });

    const mergedMap = new Map();

    // Process unified RM / BO Item Masters
    rmMasters.forEach((rm) => {
      const code = rm.name.toUpperCase();
      const inv = storeInvMap.get(code);
      const isBo =
        rm.categoryCode?.toUpperCase().includes('BO') ||
        rm.categoryName?.toUpperCase().includes('BOUGHT') ||
        rm.uom?.toUpperCase() === 'NOS';
      const itemType = isBo ? 'BO' : 'RM';

      mergedMap.set(code, {
        id: rm.id,
        _id: rm.id,
        itemCode: rm.name,
        itemName: rm.description || rm.name,
        itemType,
        make: rm.make || '',
        category: rm.categoryName || (isBo ? 'Bought Out' : 'Raw Material'),
        categoryCode: rm.categoryCode || '',
        baseUom: rm.uom || (isBo ? 'Nos' : 'Kg'),
        binLocation: inv?.binLocation || (isBo ? 'BIN-BO-B01' : 'BIN-RM-A01'),
        minSafetyStock: inv?.minSafetyStock || 0,
        standardRateINR: rm.standardRateINR || 0,
        photoUrl: rm.photoUrl || (rm.photos && rm.photos[0]) || '',
        pdfUrl: rm.pdfUrl || '',
        pdfName: rm.pdfName || '',
        orderedQty: inv?.orderedQty || 0,
        inQcQty: inv?.inQcQty || 0,
        acceptedQty: inv?.acceptedQty || 0,
        issuedQty: inv?.issuedQty || 0,
        reservedQuantity: inv?.reservedQuantity || 0,
        buckets: {
          ordered: inv?.orderedQty || 0,
          inQc: inv?.inQcQty || 0,
          accepted: inv?.acceptedQty || 0,
          issued: inv?.issuedQty || 0
        },
        createdAt: rm.createdAt,
        updatedAt: rm.updatedAt,
        createdByName: rm.createdByName || 'Design Master',
        updatedByName: rm.updatedByName || 'Store'
      });
    });

    // Process Design Item Masters (Components, Electrical, Hardware)
    designMasters.forEach((dm) => {
      const code = dm.itemCode.toUpperCase();
      if (!mergedMap.has(code)) {
        const inv = storeInvMap.get(code);
        mergedMap.set(code, {
          id: dm.id,
          _id: dm.id,
          itemCode: dm.itemCode,
          itemName: dm.itemName,
          itemType: dm.itemType === 'RM' ? 'RM' : 'BO',
          make: dm.specifications || '',
          category: dm.category || 'Mechanical Components',
          categoryCode: '',
          baseUom: dm.baseUom || 'Nos',
          binLocation: inv?.binLocation || 'BIN-BO-B01',
          minSafetyStock: inv?.minSafetyStock || 0,
          standardRateINR: dm.standardRateINR || 0,
          photoUrl: dm.primaryPhotoUrl || '',
          pdfUrl: dm.primaryPdfUrl || '',
          pdfName: dm.drawingNumber || '',
          orderedQty: inv?.orderedQty || 0,
          inQcQty: inv?.inQcQty || 0,
          acceptedQty: inv?.acceptedQty || 0,
          issuedQty: inv?.issuedQty || 0,
          reservedQuantity: inv?.reservedQuantity || 0,
          buckets: {
            ordered: inv?.orderedQty || 0,
            inQc: inv?.inQcQty || 0,
            accepted: inv?.acceptedQty || 0,
            issued: inv?.issuedQty || 0
          },
          createdAt: dm.createdAt,
          updatedAt: dm.updatedAt,
          createdByName: dm.createdByName || 'Design Master',
          updatedByName: dm.updatedByName || 'Store'
        });
      }
    });

    // Also include any standalone InventoryItem records that are not in Design Master
    storeInvItems.forEach((si) => {
      const code = si.itemCode.toUpperCase();
      if (!mergedMap.has(code) && si.category !== 'FG') {
        mergedMap.set(code, {
          id: si.id,
          _id: si.id,
          itemCode: si.itemCode,
          itemName: si.itemName,
          itemType: si.category === 'RM' ? 'RM' : 'BO',
          make: '',
          category: si.category,
          categoryCode: '',
          baseUom: si.baseUom || 'Nos',
          binLocation: si.binLocation || 'BIN-GEN-01',
          minSafetyStock: si.minSafetyStock || 0,
          standardRateINR: 0,
          photoUrl: '',
          pdfUrl: '',
          pdfName: '',
          orderedQty: si.orderedQty || 0,
          inQcQty: si.inQcQty || 0,
          acceptedQty: si.acceptedQty || 0,
          issuedQty: si.issuedQty || 0,
          reservedQuantity: si.reservedQuantity || 0,
          buckets: {
            ordered: si.orderedQty || 0,
            inQc: si.inQcQty || 0,
            accepted: si.acceptedQty || 0,
            issued: si.issuedQty || 0
          },
          createdAt: si.createdAt,
          updatedAt: si.updatedAt,
          createdByName: si.createdByName || 'Store',
          updatedByName: si.updatedByName || 'Store'
        });
      }
    });

    let items = Array.from(mergedMap.values());

    if (search) {
      const q = String(search).trim().toLowerCase();
      items = items.filter(
        (it) =>
          it.itemCode.toLowerCase().includes(q) ||
          it.itemName.toLowerCase().includes(q) ||
          it.binLocation.toLowerCase().includes(q) ||
          (it.category && it.category.toLowerCase().includes(q))
      );
    }

    res.status(200).json({
      success: true,
      total: items.length,
      page: Number(page),
      items
    });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateItem = async (req, res, next) => {
  try {
    const { itemCode, itemName, category = 'BO', baseUom = 'Nos', alternateUom, conversionRatio, binLocation, minSafetyStock } = req.body;
    const code = String(itemCode).toUpperCase().trim();
    const actorName = getActorName(req.user);

    const item = await prisma.inventoryItem.upsert({
      where: { itemCode: code },
      update: {
        itemName: itemName || code,
        category,
        baseUom: String(baseUom).toUpperCase(),
        alternateUom: alternateUom ? String(alternateUom).toUpperCase() : String(baseUom).toUpperCase(),
        conversionRatio: Number(conversionRatio || 1),
        binLocation: binLocation || 'BIN-BO-B01',
        minSafetyStock: Number(minSafetyStock || 0),
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      create: {
        itemCode: code,
        itemName: itemName || code,
        category,
        baseUom: String(baseUom).toUpperCase(),
        alternateUom: alternateUom ? String(alternateUom).toUpperCase() : String(baseUom).toUpperCase(),
        conversionRatio: Number(conversionRatio || 1),
        binLocation: binLocation || 'BIN-BO-B01',
        minSafetyStock: Number(minSafetyStock || 0),
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'INVENTORY_ITEM_SAVED',
      module: 'store',
      entityId: item.id,
      entityType: 'InventoryItem',
      notes: `Item ${item.itemCode} (${item.itemName}) saved in store ledger.`
    });

    res.status(200).json({
      success: true,
      message: 'All set! Inventory item saved.',
      item: formatInventoryItem(item)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Inward GRN:
 * Places received items into Store 'inQc' quarantine bucket AND automatically creates a GateEntry in Quality!
 */
export const createGrn = async (req, res, next) => {
  try {
    const config = await ensureDefaultStoreMasters(req.user);
    const policy = {
      ...DEFAULT_STORE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const count = await prisma.grnRecord.count();
    const grnNumber = `${policy.grnPrefix || 'GRN'}-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const {
      grnType = 'BO',
      poNumber = '',
      projectId = '',
      vendorName = 'Approved Vendor',
      invoiceNo = '',
      binLocation = 'BIN-BO-B01',
      items = [],
      itemCode,
      itemName,
      receivedQty = 1,
      baseUom = 'Nos',
      notes = '',
      qcGate = 'DIRECT_ACCEPTED'
    } = req.body;

    const normalizedItems =
      Array.isArray(items) && items.length > 0
        ? items
        : itemCode
        ? [{ itemCode, itemName: itemName || itemCode, receivedQty: Number(receivedQty) || 1, baseUom }]
        : [];

    const cleanPrj = String(projectId || '').toUpperCase().trim();
    const cleanPo = String(poNumber || '').toUpperCase().trim();
    const isDirectAccepted = qcGate === 'DIRECT_ACCEPTED';

    const grn = await prisma.grnRecord.create({
      data: {
        grnNumber,
        grnType,
        poNumber: cleanPo,
        projectId: cleanPrj,
        vendorName,
        invoiceNo,
        binLocation,
        qcStatus: isDirectAccepted ? 'QC_ACCEPTED' : 'PENDING_IQC',
        items: normalizedItems,
        notes,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // Update Store 4-Bucket Inventory ('acceptedQty' or 'inQcQty')
    for (const it of normalizedItems) {
      const code = String(it.itemCode).toUpperCase().trim();
      const qty = Number(it.receivedQty ?? it.quantity ?? 1);
      const uom = String(it.baseUom || it.uom || 'Nos').toUpperCase();

      await prisma.inventoryItem.upsert({
        where: { itemCode: code },
        update: {
          ...(isDirectAccepted
            ? { acceptedQty: { increment: qty } }
            : { inQcQty: { increment: qty } }),
          binLocation: binLocation || 'BIN-BO-B01',
          updatedById: req.user?.id || null,
          updatedByName: actorName
        },
        create: {
          itemCode: code,
          itemName: it.itemName || code,
          category: grnType,
          baseUom: uom,
          alternateUom: uom,
          binLocation: binLocation || 'BIN-BO-B01',
          acceptedQty: isDirectAccepted ? qty : 0,
          inQcQty: isDirectAccepted ? 0 : qty,
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    // Auto-create Quarantine Gate Entry for Incoming Quality Inspection
    const geCount = await prisma.gateEntry.count();
    const gateEntryNumber = `GE-${new Date().getFullYear()}-${String(geCount + 1).padStart(4, '0')}`;
    const gateEntry = await prisma.gateEntry.create({
      data: {
        gateEntryNumber,
        grnNumber,
        poNumber: cleanPo,
        projectId: cleanPrj,
        vendorName,
        challanOrInvoiceNumber: invoiceNo || grnNumber,
        itemsCount: normalizedItems.length || 1,
        status: 'QUARANTINE_HOLD',
        securityGuardName: actorName,
        notes: notes || `Auto-created from GRN ${grnNumber}`,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(201).json({
      success: true,
      message: `All set! GRN ${grnNumber} logged in Quarantine Hold (${gateEntryNumber}) awaiting Incoming Quality Inspection.`,
      grn: { ...grn, _id: grn.id },
      gateEntry: { ...gateEntry, _id: gateEntry.id }
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreMasters = async (req, res, next) => {
  try {
    const config = await ensureDefaultStoreMasters(req.user);
    const locations = await prisma.storeLocationMaster.findMany({
      where: { isActive: true },
      orderBy: { binCode: 'asc' }
    });
    const grns = await prisma.grnRecord.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      locations: locations.map((l) => ({ ...l, _id: l.id })),
      grns: grns.map((g) => ({ ...g, _id: g.id })),
      prefixLockPolicy: config.prefixLockPolicy
    });
  } catch (error) {
    next(error);
  }
};

export const createStoreMaster = async (req, res, next) => {
  try {
    const actorName = getActorName(req.user);
    if (req.body.prefixLockPolicy) {
      const config = await ensureDefaultStoreMasters(req.user);
      const updated = await prisma.storeConfig.update({
        where: { id: config.id },
        data: {
          prefixLockPolicy: {
            ...DEFAULT_STORE_PREFIX_POLICY,
            ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {}),
            ...req.body.prefixLockPolicy
          },
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
      return res.status(200).json({
        success: true,
        message: 'All set! Store prefix and lock policy saved.',
        prefixLockPolicy: updated.prefixLockPolicy
      });
    }

    const { binCode, zoneName, rackNumber, shelfLevel, storageType, capacityInfo } = req.body;
    const loc = await prisma.storeLocationMaster.upsert({
      where: { binCode: String(binCode || `BIN-${Date.now()}`).toUpperCase().trim() },
      update: {
        zoneName: zoneName || 'Zone A',
        rackNumber: rackNumber || 'R-01',
        shelfLevel: shelfLevel || 'L1',
        storageType: storageType || 'BO',
        capacityInfo: capacityInfo || '500 Kg',
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      create: {
        binCode: String(binCode || `BIN-${Date.now()}`).toUpperCase().trim(),
        zoneName: zoneName || 'Zone A',
        rackNumber: rackNumber || 'R-01',
        shelfLevel: shelfLevel || 'L1',
        storageType: storageType || 'BO',
        capacityInfo: capacityInfo || '500 Kg',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(201).json({
      success: true,
      message: `All set! Store Location ${loc.binCode} saved.`,
      location: { ...loc, _id: loc.id }
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialRequests = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    const list = await prisma.storeMaterialRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json({
      success: true,
      count: list.length,
      materialRequests: list.map((m) => ({ ...m, _id: m.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createMaterialRequest = async (req, res, next) => {
  try {
    const count = await prisma.storeMaterialRequest.count();
    const mrNumber = `MR-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const { projectId, department = 'PRODUCTION', items = [], notes = '' } = req.body;
    const mr = await prisma.storeMaterialRequest.create({
      data: {
        mrNumber,
        projectId: String(projectId || 'PRJ-2026-1001').toUpperCase().trim(),
        department,
        requestedBy: actorName,
        status: 'PENDING',
        items: Array.isArray(items) ? items : [],
        notes,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(201).json({
      success: true,
      message: `All set! Material Request ${mrNumber} submitted to Store.`,
      materialRequest: { ...mr, _id: mr.id }
    });
  } catch (error) {
    next(error);
  }
};

export const issueMaterialRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const mr = await prisma.storeMaterialRequest.findUnique({ where: { id } });
    if (!mr) {
      return res.status(404).json({ success: false, message: 'Material request not found.' });
    }

    const reqItems = Array.isArray(mr.items) ? mr.items : [];
    for (const it of reqItems) {
      const code = String(it.itemCode).toUpperCase().trim();
      const qty = Number(it.quantity ?? it.requestedQty ?? 1);
      const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
      if (inv) {
        const nextAcc = Math.max(0, (inv.acceptedQty || 0) - qty);
        const nextRes = Math.max(0, (inv.reservedQuantity || 0) - qty);
        await prisma.inventoryItem.update({
          where: { itemCode: code },
          data: {
            acceptedQty: nextAcc,
            reservedQuantity: nextRes,
            issuedQty: (inv.issuedQty || 0) + qty,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }
    }

    const updated = await prisma.storeMaterialRequest.update({
      where: { id },
      data: {
        status: 'ISSUED',
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: `All set! Materials issued to Production for ${mr.mrNumber}.`,
      materialRequest: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const getDeliveryChallans = async (req, res, next) => {
  try {
    const list = await prisma.storeDeliveryChallan.findMany({ orderBy: { createdAt: 'desc' } });
    res.status(200).json({
      success: true,
      count: list.length,
      challans: list.map((c) => ({ ...c, _id: c.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createDeliveryChallan = async (req, res, next) => {
  try {
    const count = await prisma.storeDeliveryChallan.count();
    const dcNumber = `DC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const dc = await prisma.storeDeliveryChallan.create({
      data: {
        dcNumber,
        dcType: req.body.dcType || 'RETURNABLE',
        projectId: req.body.projectId || '',
        vendorName: req.body.vendorName || 'Vendor',
        purpose: req.body.purpose || 'Job Work',
        status: 'DISPATCHED',
        items: Array.isArray(req.body.items) ? req.body.items : [],
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(201).json({
      success: true,
      message: `All set! Delivery Challan ${dcNumber} created.`,
      challan: { ...dc, _id: dc.id }
    });
  } catch (error) {
    next(error);
  }
};
