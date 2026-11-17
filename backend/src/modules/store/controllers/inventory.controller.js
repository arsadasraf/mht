import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import { generateUniqueSequenceCode } from '../../../utils/sequenceGenerator.js';

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

export const DEFAULT_STORE_TIME_POLICY = {
  allowGrnEdit: true,
  allowGrnDelete: true,
  grnEditWindowHours: 48,
  grnDeleteWindowHours: 24,
  allowIssueEdit: true,
  allowIssueDelete: true,
  issueEditWindowHours: 48,
  issueDeleteWindowHours: 24,
  allowAdminOverride: true,
  preventNegativeStockOnReversal: true
};

export const ensureDefaultStoreMasters = async (user = null) => {
  const actorName = getActorName(user);
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

const findPriceAgreement = (code, name, type, rev, priceAgreements) => {
  if (!priceAgreements || priceAgreements.length === 0) return null;
  const normCode = String(code || '').toUpperCase().trim();
  const normName = String(name || '').toUpperCase().trim();
  const normRev = String(rev || '').toUpperCase().trim();

  return (
    priceAgreements.find((pa) => {
      const paCode = String(pa.itemCode || '').toUpperCase().trim();
      const paName = String(pa.itemName || '').toUpperCase().trim();
      const isCodeMatch =
        paCode === normCode ||
        paName === normCode ||
        paCode === normName ||
        (normName && paName === normName);
      if (!isCodeMatch) return false;

      if (pa.revisionNumber && String(pa.revisionNumber).trim()) {
        const paRev = String(pa.revisionNumber).toUpperCase().trim();
        if (paRev !== normRev) return false;
      }
      return true;
    }) || null
  );
};

const getTop5Transactions = (code, allGrns, allMrs, unitRate) => {
  const normCode = String(code || '').toUpperCase().trim();
  const recentInwards = [];
  if (Array.isArray(allGrns)) {
    for (const grn of allGrns) {
      const items = Array.isArray(grn.items) ? grn.items : [];
      const match = items.find((it) => {
        const itCode = String(it.itemCode || it.drawingNumber || it.itemName || '').toUpperCase().trim();
        return itCode === normCode;
      });
      if (match) {
        const recQty = Number(match.receivedQty || match.qty || 0);
        const accQty = Number(match.acceptedQty ?? recQty);
        const rate = Number(match.unitRate || match.rate || unitRate || 0);
        recentInwards.push({
          grnNumber: grn.grnNumber,
          vendorName: grn.vendorName || 'Vendor',
          invoiceNo: grn.invoiceNo || '—',
          date: grn.receivedDate || grn.createdAt,
          receivedQty: recQty,
          acceptedQty: accQty,
          unitRate: rate,
          totalAmount: recQty * rate,
          uom: match.uom || match.baseUom || 'Nos'
        });
        if (recentInwards.length >= 5) break;
      }
    }
  }

  const recentOutwards = [];
  if (Array.isArray(allMrs)) {
    for (const mr of allMrs) {
      const items = Array.isArray(mr.items) ? mr.items : [];
      const match = items.find((it) => {
        const itCode = String(it.itemCode || it.drawingNumber || it.itemName || '').toUpperCase().trim();
        return itCode === normCode;
      });
      if (match) {
        const issuedQty = Number(match.quantity ?? match.requestedQty ?? match.issuedQty ?? 0);
        recentOutwards.push({
          mrNumber: mr.mrNumber,
          projectId: mr.projectId || 'General',
          department: mr.department || 'PRODUCTION',
          date: mr.updatedAt || mr.createdAt,
          issuedQty,
          unitRate,
          totalAmount: issuedQty * unitRate,
          uom: match.uom || 'Nos'
        });
        if (recentOutwards.length >= 5) break;
      }
    }
  }

  return { recentInwards, recentOutwards };
};

/**
 * Automatically reclassifies historical store_inventory_items
 * so any drawing numbers (DWG-*, or matching Drawing/FgItemMaster) are marked as DRAWING.
 */
export const sanitizeHistoricalInventory = async () => {
  try {
    const [drawings, fgMasters] = await Promise.all([
      prisma.drawing.findMany({ select: { drawingNumber: true } }),
      prisma.fgItemMaster.findMany({ select: { name: true } })
    ]);
    const drawingCodes = [
      ...drawings.map((d) => d.drawingNumber.toUpperCase().trim()),
      ...fgMasters.map((f) => f.name.toUpperCase().trim())
    ].filter(Boolean);

    await prisma.inventoryItem.updateMany({
      where: {
        OR: [
          { itemCode: { startsWith: 'DWG-' } },
          { itemCode: { startsWith: 'dwg-' } },
          { category: 'FG' },
          ...(drawingCodes.length > 0 ? [{ itemCode: { in: drawingCodes } }] : [])
        ],
        itemType: { not: 'DRAWING' }
      },
      data: {
        itemType: 'DRAWING',
        category: 'DRAWING'
      }
    });
  } catch (err) {
    console.warn('Historical inventory sanitization non-fatal error:', err.message);
  }
};

export const getInventoryItems = async (req, res, next) => {
  try {
    await ensureDefaultStoreMasters(req.user);
    await sanitizeHistoricalInventory();
    const { category = 'RM_BO', search, page = 1 } = req.query;
    const catStr = String(category).toUpperCase().trim();

    // 1. Drawings Inventory: Fetched directly from Design Drawings Master (FgItemMaster, Drawing & DesignFgMasters)
    if (catStr === 'DRAWING' || catStr === 'DRAWINGS') {
      const [fgMasters, drawings, designFgMasters, rmMastersList, storeInvItems, priceAgreements, allGrns, allMrs] = await Promise.all([
        prisma.fgItemMaster.findMany({
          orderBy: [{ name: 'asc' }, { revision: 'desc' }]
        }),
        prisma.drawing.findMany({
          orderBy: { drawingNumber: 'asc' }
        }),
        prisma.designItemMaster.findMany({
          where: { itemType: { in: ['COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'] } },
          orderBy: { itemCode: 'asc' }
        }),
        prisma.rmItemMaster.findMany({
          select: { name: true }
        }),
        prisma.inventoryItem.findMany({
          where: {
            OR: [
              { itemType: 'DRAWING' },
              { category: 'DRAWING' },
              { category: 'FG' },
              { itemCode: { startsWith: 'DWG-' } },
              { itemCode: { startsWith: 'dwg-' } }
            ]
          }
        }),
        prisma.vendorPriceAgreement.findMany({
          where: { isActive: true },
          orderBy: [{ isPreferred: 'desc' }, { unitPrice: 'asc' }]
        }),
        prisma.grnRecord.findMany({
          select: {
            id: true,
            grnNumber: true,
            vendorName: true,
            invoiceNo: true,
            receivedDate: true,
            createdAt: true,
            items: true
          },
          orderBy: { createdAt: 'desc' },
          take: 100
        }),
        prisma.storeMaterialRequest.findMany({
          select: {
            id: true,
            mrNumber: true,
            projectId: true,
            department: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            items: true
          },
          where: { status: 'ISSUED' },
          orderBy: { updatedAt: 'desc' },
          take: 100
        })
      ]);

      const rmCodeSet = new Set(rmMastersList.map((r) => r.name.toUpperCase().trim()));

      const storeInvMap = new Map();
      storeInvItems.forEach((si) => {
        storeInvMap.set(si.itemCode.toUpperCase().trim(), si);
      });

      const mergedMap = new Map();

      // 1. Process FG Item Masters (Design Drawings from Design Master /design/masters/fg)
      fgMasters.forEach((fg) => {
        const code = fg.name.toUpperCase().trim();
        if (rmCodeSet.has(code)) return; // Strictly exclude RM items
        const key = `${code}_${(fg.revision || 'REV 1.0').toUpperCase()}`;
        const inv = storeInvMap.get(code);

        const agreement = findPriceAgreement(fg.name, fg.description, 'FG', fg.revision, priceAgreements);
        const unitRate = agreement ? Number(agreement.unitPrice) : 0;
        const stock = inv?.acceptedQty || 0;
        const wipStock = inv?.issuedQty || 0;
        const { recentInwards, recentOutwards } = getTop5Transactions(fg.name, allGrns, allMrs, unitRate);

        mergedMap.set(key, {
          id: fg.id,
          _id: fg.id,
          itemCode: fg.name,
          drawingNumber: fg.name,
          itemName: fg.description || fg.name,
          title: fg.description || fg.name,
          revision: fg.revision || 'Rev 1.0',
          versionNumber: 1,
          category: fg.categoryName || fg.classification || 'Design Drawing',
          classification: fg.classification || 'COMPONENT',
          make: fg.make || '',
          projectId: '',
          status: 'RELEASED',
          isReleased: true,
          fileUrl: fg.pdfUrl || '',
          fileName: fg.pdfName || (fg.pdfUrl ? `${fg.name}.pdf` : ''),
          pdfUrl: fg.pdfUrl || '',
          pdfName: fg.pdfName || '',
          photoUrl: fg.photoUrl || (fg.photos && fg.photos[0]) || '',
          itemType: 'DRAWING',
          baseUom: fg.uom || 'Nos',
          locationName: inv?.locationName || inv?.binLocation || 'Unassigned',
          binLocation: inv?.locationName || inv?.binLocation || 'Unassigned',
          stock,
          orderedQty: inv?.orderedQty || 0,
          inQcQty: inv?.inQcQty || 0,
          acceptedQty: stock,
          issuedQty: wipStock,
          wipStock,
          unitRate,
          rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
          availableValue: stock * unitRate,
          wipValue: wipStock * unitRate,
          totalValuation: (stock + wipStock) * unitRate,
          recentInwards,
          recentOutwards,
          reservedQuantity: inv?.reservedQuantity || 0,
          buckets: {
            ordered: inv?.orderedQty || 0,
            inQc: inv?.inQcQty || 0,
            accepted: stock,
            issued: wipStock
          },
          createdAt: fg.createdAt,
          updatedAt: fg.updatedAt,
          createdByName: fg.createdByName || 'Design Master',
          updatedByName: inv?.updatedByName || fg.updatedByName || 'Store'
        });
      });

      // 2. Process Drawing records (from CAD Drawings)
      drawings.forEach((dw) => {
        const code = dw.drawingNumber.toUpperCase().trim();
        if (rmCodeSet.has(code)) return; // Strictly exclude RM items
        const key = `${code}_${(dw.revision || 'V1').toUpperCase()}`;
        if (!mergedMap.has(key)) {
          const inv = storeInvMap.get(code);

          const agreement = findPriceAgreement(dw.drawingNumber, dw.title, 'FG', dw.revision, priceAgreements);
          const unitRate = agreement ? Number(agreement.unitPrice) : 0;
          const stock = inv?.acceptedQty || 0;
          const wipStock = inv?.issuedQty || 0;
          const { recentInwards, recentOutwards } = getTop5Transactions(dw.drawingNumber, allGrns, allMrs, unitRate);

          mergedMap.set(key, {
            id: dw.id,
            _id: dw.id,
            itemCode: dw.drawingNumber,
            drawingNumber: dw.drawingNumber,
            itemName: dw.title,
            title: dw.title,
            revision: dw.revision || 'v1',
            versionNumber: dw.versionNumber || 1,
            category: dw.category || '2D_MANUFACTURING',
            classification: 'DRAWING',
            make: '',
            projectId: dw.projectId || '',
            status: dw.status || 'DRAFT',
            isReleased: dw.isReleased || false,
            fileUrl: dw.fileUrl || '',
            fileName: dw.fileName || '',
            pdfUrl: dw.fileUrl || '',
            pdfName: dw.fileName || '',
            photoUrl: '',
            itemType: 'DRAWING',
            baseUom: 'Nos',
            locationName: inv?.locationName || inv?.binLocation || 'Unassigned',
            binLocation: inv?.locationName || inv?.binLocation || 'Unassigned',
            stock,
            orderedQty: inv?.orderedQty || 0,
            inQcQty: inv?.inQcQty || 0,
            acceptedQty: stock,
            issuedQty: wipStock,
            wipStock,
            unitRate,
            rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
            availableValue: stock * unitRate,
            wipValue: wipStock * unitRate,
            totalValuation: (stock + wipStock) * unitRate,
            recentInwards,
            recentOutwards,
            reservedQuantity: inv?.reservedQuantity || 0,
            buckets: {
              ordered: inv?.orderedQty || 0,
              inQc: inv?.inQcQty || 0,
              accepted: stock,
              issued: wipStock
            },
            createdAt: dw.createdAt,
            updatedAt: dw.updatedAt,
            createdByName: dw.createdByName || 'Design Master',
            updatedByName: inv?.updatedByName || dw.updatedByName || 'Store'
          });
        }
      });

      // 3. Process Design Item Masters of type COMPONENT / SUB_ASSEMBLY / ASSEMBLY
      designFgMasters.forEach((dm) => {
        const code = dm.itemCode.toUpperCase().trim();
        if (rmCodeSet.has(code)) return; // Strictly exclude RM items
        const key = `${code}_${(dm.currentVersion || 'V1').toUpperCase()}`;
        if (!mergedMap.has(key)) {
          const inv = storeInvMap.get(code);
          const agreement = findPriceAgreement(dm.itemCode, dm.itemName, dm.itemType, dm.currentVersion, priceAgreements);
          const unitRate = agreement ? Number(agreement.unitPrice) : (Number(dm.standardRateINR) || 0);
          const stock = inv?.acceptedQty || 0;
          const wipStock = inv?.issuedQty || 0;
          const { recentInwards, recentOutwards } = getTop5Transactions(dm.itemCode, allGrns, allMrs, unitRate);

          mergedMap.set(key, {
            id: dm.id,
            _id: dm.id,
            itemCode: dm.itemCode,
            drawingNumber: dm.drawingNumber || dm.itemCode,
            itemName: dm.itemName,
            title: dm.itemName,
            revision: dm.currentVersion || 'v1',
            versionNumber: 1,
            category: dm.category || dm.itemType || 'Design Drawing',
            classification: dm.itemType,
            make: dm.specifications || '',
            projectId: '',
            status: 'RELEASED',
            isReleased: true,
            fileUrl: dm.primaryPdfUrl || '',
            fileName: dm.drawingNumber ? `${dm.drawingNumber}.pdf` : '',
            pdfUrl: dm.primaryPdfUrl || '',
            pdfName: dm.drawingNumber || '',
            photoUrl: dm.primaryPhotoUrl || '',
            itemType: 'DRAWING',
            baseUom: dm.baseUom || 'Nos',
            locationName: inv?.locationName || inv?.binLocation || 'Unassigned',
            binLocation: inv?.locationName || inv?.binLocation || 'Unassigned',
            stock,
            orderedQty: inv?.orderedQty || 0,
            inQcQty: inv?.inQcQty || 0,
            acceptedQty: stock,
            issuedQty: wipStock,
            wipStock,
            unitRate,
            rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
            availableValue: stock * unitRate,
            wipValue: wipStock * unitRate,
            totalValuation: (stock + wipStock) * unitRate,
            recentInwards,
            recentOutwards,
            reservedQuantity: inv?.reservedQuantity || 0,
            buckets: {
              ordered: inv?.orderedQty || 0,
              inQc: inv?.inQcQty || 0,
              accepted: stock,
              issued: wipStock
            },
            createdAt: dm.createdAt,
            updatedAt: dm.updatedAt,
            createdByName: dm.createdByName || 'Design Master',
            updatedByName: inv?.updatedByName || dm.updatedByName || 'Store'
          });
        }
      });

      // 4. Also include any standalone InventoryItem records that are DRAWINGS
      storeInvItems.forEach((si) => {
        const code = si.itemCode.toUpperCase().trim();
        if (rmCodeSet.has(code)) return;
        const key = `${code}_REV 1.0`;
        const exists = Array.from(mergedMap.values()).some(
          (m) => m.itemCode.toUpperCase().trim() === code || m.drawingNumber?.toUpperCase().trim() === code
        );
        if (!exists) {
          const agreement = findPriceAgreement(si.itemCode, si.itemName, 'FG', 'Rev 1.0', priceAgreements);
          const unitRate = agreement ? Number(agreement.unitPrice) : 0;
          const stock = si.acceptedQty || 0;
          const wipStock = si.issuedQty || 0;
          const { recentInwards, recentOutwards } = getTop5Transactions(si.itemCode, allGrns, allMrs, unitRate);

          mergedMap.set(key, {
            id: si.id,
            _id: si.id,
            itemCode: si.itemCode,
            drawingNumber: si.itemCode,
            itemName: si.itemName,
            title: si.itemName,
            revision: 'Rev 1.0',
            versionNumber: 1,
            category: si.category || 'DRAWING',
            classification: 'DRAWING',
            make: '',
            projectId: '',
            status: 'RELEASED',
            isReleased: true,
            fileUrl: '',
            fileName: '',
            pdfUrl: '',
            pdfName: '',
            photoUrl: '',
            itemType: 'DRAWING',
            baseUom: si.baseUom || 'Nos',
            locationName: si.locationName || si.binLocation || 'Unassigned',
            binLocation: si.locationName || si.binLocation || 'Unassigned',
            stock,
            orderedQty: si.orderedQty || 0,
            inQcQty: si.inQcQty || 0,
            acceptedQty: stock,
            issuedQty: wipStock,
            wipStock,
            unitRate,
            rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
            availableValue: stock * unitRate,
            wipValue: wipStock * unitRate,
            totalValuation: (stock + wipStock) * unitRate,
            recentInwards,
            recentOutwards,
            reservedQuantity: si.reservedQuantity || 0,
            buckets: {
              ordered: si.orderedQty || 0,
              inQc: si.inQcQty || 0,
              accepted: stock,
              issued: wipStock
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
            it.drawingNumber.toLowerCase().includes(q) ||
            it.title.toLowerCase().includes(q) ||
            it.locationName.toLowerCase().includes(q) ||
            it.revision.toLowerCase().includes(q) ||
            (it.category && it.category.toLowerCase().includes(q)) ||
            (it.make && it.make.toLowerCase().includes(q))
        );
      }

      return res.status(200).json({
        success: true,
        total: items.length,
        page: Number(page),
        items
      });
    }

    if (catStr === 'FG' || catStr === 'FINISHED_GOODS') {
      // Finished Goods from Design Master
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
          locationName: inv?.locationName || inv?.binLocation || 'FG Store (Bay 1)',
          binLocation: inv?.locationName || inv?.binLocation || 'FG Store (Bay 1)',
          stock: inv?.acceptedQty || 0,
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
            locationName: inv?.locationName || inv?.binLocation || 'FG Store (Bay 1)',
            binLocation: inv?.locationName || inv?.binLocation || 'FG Store (Bay 1)',
            stock: inv?.acceptedQty || 0,
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
            it.locationName.toLowerCase().includes(q)
        );
      }

      return res.status(200).json({
        success: true,
        total: items.length,
        page: Number(page),
        items
      });
    }

    // 2. Default: Fetch RM & BO Items directly from Design Master (Strict RM & BO only)
    const [
      rmMasters,
      designMasters,
      drawingRecords,
      fgMasterRecords,
      designFgRecords,
      storeInvItems,
      priceAgreements,
      allGrns,
      allMrs
    ] = await Promise.all([
      prisma.rmItemMaster.findMany({
        orderBy: [{ name: 'asc' }, { revision: 'desc' }]
      }),
      prisma.designItemMaster.findMany({
        where: { itemType: { in: ['RM', 'BO'] } },
        orderBy: { itemCode: 'asc' }
      }),
      prisma.drawing.findMany({ select: { drawingNumber: true } }),
      prisma.fgItemMaster.findMany({ select: { name: true } }),
      prisma.designItemMaster.findMany({
        where: { itemType: { in: ['COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'] } },
        select: { itemCode: true }
      }),
      prisma.inventoryItem.findMany(),
      prisma.vendorPriceAgreement.findMany({
        where: { isActive: true },
        orderBy: [{ isPreferred: 'desc' }, { unitPrice: 'asc' }]
      }),
      prisma.grnRecord.findMany({
        select: {
          id: true,
          grnNumber: true,
          vendorName: true,
          invoiceNo: true,
          receivedDate: true,
          createdAt: true,
          items: true
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      }),
      prisma.storeMaterialRequest.findMany({
        select: {
          id: true,
          mrNumber: true,
          projectId: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          items: true
        },
        where: { status: 'ISSUED' },
        orderBy: { updatedAt: 'desc' },
        take: 100
      })
    ]);

    const drawingCodeSet = new Set([
      ...drawingRecords.map((d) => d.drawingNumber.toUpperCase().trim()),
      ...fgMasterRecords.map((f) => f.name.toUpperCase().trim()),
      ...designFgRecords.map((df) => df.itemCode.toUpperCase().trim())
    ]);

    const storeInvMap = new Map();
    storeInvItems.forEach((si) => {
      storeInvMap.set(si.itemCode.toUpperCase().trim(), si);
    });

    const mergedMap = new Map();

    // Process unified RM / BO Item Masters (Strictly excluding Drawings & CAD models)
    rmMasters.forEach((rm) => {
      const code = rm.name.toUpperCase().trim();
      if (drawingCodeSet.has(code) || code.startsWith('DWG-')) return;
      const inv = storeInvMap.get(code);
      const isBo =
        rm.categoryCode?.toUpperCase().includes('BO') ||
        rm.categoryName?.toUpperCase().includes('BOUGHT') ||
        rm.uom?.toUpperCase() === 'NOS';
      const itemType = isBo ? 'BO' : 'RM';

      const agreement = findPriceAgreement(rm.name, rm.description, 'RM_BO', rm.revision, priceAgreements);
      const unitRate = agreement ? Number(agreement.unitPrice) : (Number(rm.standardRateINR) || 0);
      const stock = inv?.acceptedQty || 0;
      const wipStock = inv?.issuedQty || 0;
      const { recentInwards, recentOutwards } = getTop5Transactions(rm.name, allGrns, allMrs, unitRate);

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
        locationName: inv?.locationName || inv?.binLocation || 'Unassigned',
        binLocation: inv?.locationName || inv?.binLocation || 'Unassigned',
        stock,
        minSafetyStock: inv?.minSafetyStock || 0,
        standardRateINR: rm.standardRateINR || 0,
        unitRate,
        rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
        availableValue: stock * unitRate,
        wipStock,
        wipValue: wipStock * unitRate,
        totalValuation: (stock + wipStock) * unitRate,
        recentInwards,
        recentOutwards,
        hsnCode: rm.hsnCode || '',
        revision: rm.revision || 'Rev 1.0',
        photoUrl: rm.photoUrl || (rm.photos && rm.photos[0]) || '',
        pdfUrl: rm.pdfUrl || '',
        pdfName: rm.pdfName || '',
        orderedQty: inv?.orderedQty || 0,
        inQcQty: inv?.inQcQty || 0,
        acceptedQty: stock,
        issuedQty: wipStock,
        reservedQuantity: inv?.reservedQuantity || 0,
        buckets: {
          ordered: inv?.orderedQty || 0,
          inQc: inv?.inQcQty || 0,
          accepted: stock,
          issued: wipStock
        },
        createdAt: rm.createdAt,
        updatedAt: rm.updatedAt,
        createdByName: rm.createdByName || 'Design Master',
        updatedByName: inv?.updatedByName || rm.updatedByName || 'Store'
      });
    });

    // Process Design Item Masters (Strictly RM & BO only)
    designMasters.forEach((dm) => {
      const code = dm.itemCode.toUpperCase().trim();
      if (drawingCodeSet.has(code) || code.startsWith('DWG-')) return;
      if (!mergedMap.has(code)) {
        const inv = storeInvMap.get(code);

        const agreement = findPriceAgreement(dm.itemCode, dm.itemName, dm.itemType, dm.currentVersion, priceAgreements);
        const unitRate = agreement ? Number(agreement.unitPrice) : (Number(dm.standardRateINR) || 0);
        const stock = inv?.acceptedQty || 0;
        const wipStock = inv?.issuedQty || 0;
        const { recentInwards, recentOutwards } = getTop5Transactions(dm.itemCode, allGrns, allMrs, unitRate);

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
          locationName: inv?.locationName || inv?.binLocation || 'Unassigned',
          binLocation: inv?.locationName || inv?.binLocation || 'Unassigned',
          stock,
          minSafetyStock: inv?.minSafetyStock || 0,
          standardRateINR: dm.standardRateINR || 0,
          unitRate,
          rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
          availableValue: stock * unitRate,
          wipValue: wipStock * unitRate,
          totalValuation: (stock + wipStock) * unitRate,
          recentInwards,
          recentOutwards,
          hsnCode: '',
          revision: dm.currentVersion || 'v1',
          photoUrl: dm.primaryPhotoUrl || '',
          pdfUrl: dm.primaryPdfUrl || '',
          pdfName: dm.drawingNumber || '',
          orderedQty: inv?.orderedQty || 0,
          inQcQty: inv?.inQcQty || 0,
          acceptedQty: stock,
          issuedQty: wipStock,
          reservedQuantity: inv?.reservedQuantity || 0,
          buckets: {
            ordered: inv?.orderedQty || 0,
            inQc: inv?.inQcQty || 0,
            accepted: stock,
            issued: wipStock
          },
          createdAt: dm.createdAt,
          updatedAt: dm.updatedAt,
          createdByName: dm.createdByName || 'Design Master',
          updatedByName: inv?.updatedByName || dm.updatedByName || 'Store'
        });
      }
    });

    // Also include any standalone InventoryItem records that are strictly RM / BO
    storeInvItems.forEach((si) => {
      const code = si.itemCode.toUpperCase().trim();
      if (
        !mergedMap.has(code) &&
        si.category !== 'FG' &&
        si.category !== 'DRAWING' &&
        si.itemType !== 'DRAWING' &&
        !drawingCodeSet.has(code) &&
        !code.startsWith('DWG-')
      ) {
        const agreement = findPriceAgreement(si.itemCode, si.itemName, si.category, 'Rev 1.0', priceAgreements);
        const unitRate = agreement ? Number(agreement.unitPrice) : 0;
        const stock = si.acceptedQty || 0;
        const wipStock = si.issuedQty || 0;
        const { recentInwards, recentOutwards } = getTop5Transactions(si.itemCode, allGrns, allMrs, unitRate);

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
          locationName: si.locationName || si.binLocation || 'Unassigned',
          binLocation: si.locationName || si.binLocation || 'Unassigned',
          stock,
          minSafetyStock: si.minSafetyStock || 0,
          standardRateINR: 0,
          unitRate,
          rateSource: agreement?.vendorName || (unitRate > 0 ? 'Standard Base Rate' : 'Unassigned'),
          availableValue: stock * unitRate,
          wipValue: wipStock * unitRate,
          totalValuation: (stock + wipStock) * unitRate,
          recentInwards,
          recentOutwards,
          hsnCode: '',
          revision: 'Rev 1.0',
          photoUrl: '',
          pdfUrl: '',
          pdfName: '',
          orderedQty: si.orderedQty || 0,
          inQcQty: si.inQcQty || 0,
          acceptedQty: stock,
          issuedQty: wipStock,
          reservedQuantity: si.reservedQuantity || 0,
          buckets: {
            ordered: si.orderedQty || 0,
            inQc: si.inQcQty || 0,
            accepted: stock,
            issued: wipStock
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
          (it.locationName && it.locationName.toLowerCase().includes(q)) ||
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
 * Assign Storage Location to an RM/BO item or Design Drawing:
 * Validates the location exists in Location Master and updates locationName.
 * STRICT BUSINESS RULE: Stock increases ONLY via GRN - this operation strictly updates physical location!
 */
export const assignItemLocation = async (req, res, next) => {
  try {
    const { itemCode, itemType = 'RM_BO', locationName, itemName = '' } = req.body;
    if (!itemCode || !locationName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both the item identifier and location name.'
      });
    }

    const trimmedCode = String(itemCode).trim().toUpperCase();
    const trimmedLoc = String(locationName).trim();
    const actorName = getActorName(req.user);

    // Verify location exists in storeLocationMaster and is active
    const locExists = await prisma.storeLocationMaster.findFirst({
      where: {
        locationName: { equals: trimmedLoc, mode: 'insensitive' },
        isActive: true
      }
    });

    if (!locExists) {
      return res.status(404).json({
        success: false,
        message: `Storage location "${trimmedLoc}" was not found or is inactive. Please pick a valid location from Location Master.`
      });
    }

    const normalizedType = itemType === 'DRAWING' ? 'DRAWING' : 'RM_BO';

    // Strictly update locationName (and binLocation for fallback). Do NOT modify stock or bucket counts!
    const inventoryRecord = await prisma.inventoryItem.upsert({
      where: { itemCode: trimmedCode },
      update: {
        locationName: locExists.locationName,
        binLocation: locExists.locationName,
        itemType: normalizedType,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      create: {
        itemCode: trimmedCode,
        itemName: itemName || trimmedCode,
        category: normalizedType === 'DRAWING' ? 'DRAWING' : 'BO',
        itemType: normalizedType,
        locationName: locExists.locationName,
        binLocation: locExists.locationName,
        baseUom: 'Nos',
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'ITEM_LOCATION_ASSIGNED',
      module: 'store',
      entityId: inventoryRecord.id,
      entityType: 'InventoryItem',
      notes: `Location "${locExists.locationName}" assigned to ${trimmedCode} (${normalizedType}).`
    });

    res.status(200).json({
      success: true,
      message: `All set! Assigned location "${locExists.locationName}" to ${trimmedCode}.`,
      item: formatInventoryItem(inventoryRecord)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Next Auto-Generated GRN Number based on Prefix Policy
 */
export const getNextGrnNumber = async (req, res, next) => {
  try {
    const config = await ensureDefaultStoreMasters(req.user);
    const policy = {
      ...DEFAULT_STORE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };
    const prefix = policy.grnPrefix || 'GRN';
    const padLength = Number(policy.padLength || 4);
    const nextCode = await generateUniqueSequenceCode({
      model: 'grnRecord',
      field: 'grnNumber',
      prefix: `${prefix}-${new Date().getFullYear()}-`,
      startSeq: 1,
      padLength
    });
    res.status(200).json({ success: true, nextGrnNumber: nextCode, prefix, padLength });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Open Outward Purchase Orders for a Vendor (with PO Items & Balance Quantities)
 */
export const getOpenPurchaseOrders = async (req, res, next) => {
  try {
    const { vendorId, vendorName } = req.query;
    const where = {
      status: { in: ['APPROVED', 'PARTIALLY_RECEIVED'] }
    };
    if (vendorId) {
      where.vendorId = vendorId;
    } else if (vendorName) {
      where.vendorName = { equals: String(vendorName).trim(), mode: 'insensitive' };
    }

    const openPos = await prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const poNumbers = openPos.map((p) => p.poNumber);
    const existingGrns = await prisma.grnRecord.findMany({
      where: { poNumber: { in: poNumbers } }
    });

    const receivedMap = new Map();
    existingGrns.forEach((grn) => {
      const pNum = (grn.poNumber || '').toUpperCase();
      if (!receivedMap.has(pNum)) receivedMap.set(pNum, {});
      const pMap = receivedMap.get(pNum);
      if (Array.isArray(grn.items)) {
        grn.items.forEach((it) => {
          const c = String(it.itemCode || it.name || '').toUpperCase();
          pMap[c] = (pMap[c] || 0) + Number(it.receivedQty || it.quantity || 0);
        });
      }
    });

    const formattedPos = openPos.map((po) => {
      const pNum = po.poNumber.toUpperCase();
      const pMap = receivedMap.get(pNum) || {};
      const rawItems = Array.isArray(po.items) ? po.items : [];
      const itemsWithBalance = rawItems.map((it) => {
        const c = String(it.itemCode || it.name || '').toUpperCase();
        const ordered = Number(typeof it.quantity === 'object' ? it.quantity?.baseQty : it.quantity || 0);
        const alreadyReceived = pMap[c] || 0;
        const balance = Math.max(0, ordered - alreadyReceived);
        return {
          itemCode: it.itemCode || it.name || '',
          itemName: it.itemName || it.description || it.name || '',
          revision: it.revision || 'Rev 1.0',
          make: it.make || '',
          orderedQty: ordered,
          alreadyReceivedQty: alreadyReceived,
          balanceQty: balance,
          baseUom: it.uom || it.baseUom || 'Nos',
          unitRate: Number(it.rate || it.unitRate || it.standardRateINR || 0),
          taxPercent: Number(it.taxPercent || it.gstRate || 18)
        };
      });

      return {
        id: po.id,
        _id: po.id,
        poNumber: po.poNumber,
        projectId: po.projectId,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        status: po.status,
        createdAt: po.createdAt,
        items: itemsWithBalance,
        totalItemsCount: itemsWithBalance.length
      };
    });

    res.status(200).json({
      success: true,
      openPurchaseOrders: formattedPos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Inward GRN:
 * Places received items into Store 'inQc' quarantine bucket or available stock,
 * and automatically creates a GateEntry in Quality!
 */
export const createGrn = async (req, res, next) => {
  try {
    const config = await ensureDefaultStoreMasters(req.user);
    const policy = {
      ...DEFAULT_STORE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const actorName = getActorName(req.user);

    const {
      grnNumber: customGrnNumber,
      grnType = 'BO',
      poNumber = '',
      poId = null,
      projectId = '',
      vendorId = null,
      vendorName = 'Approved Vendor',
      invoiceNo = '',
      invoiceDate = null,
      receivedDate = new Date(),
      binLocation = 'General Store',
      items = [],
      itemCode,
      itemName,
      receivedQty = 1,
      baseUom = 'Nos',
      unitRate = 0,
      taxableSubtotal = 0,
      totalItemTax = 0,
      transportationCharges = 0,
      transportationGstPercent = 0,
      transportationGstAmount = 0,
      packingCharges = 0,
      packingGstPercent = 0,
      packingGstAmount = 0,
      roundOff = 0,
      grandTotal = 0,
      notes = '',
      qcGate = 'DIRECT_ACCEPTED'
    } = req.body;

    let finalGrnNumber = customGrnNumber ? String(customGrnNumber).trim().toUpperCase() : '';

    if (finalGrnNumber) {
      // Layer 2: Pre-save duplicate check
      const existing = await prisma.grnRecord.findUnique({
        where: { grnNumber: finalGrnNumber }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `GRN Number "${finalGrnNumber}" already exists. Please choose a unique number.`
        });
      }
    } else {
      // Layer 1: Collision-free auto-generation
      finalGrnNumber = await generateUniqueSequenceCode({
        model: 'grnRecord',
        field: 'grnNumber',
        prefix: `${policy.grnPrefix || 'GRN'}-${new Date().getFullYear()}-`,
        startSeq: 1,
        padLength: Number(policy.padLength || 4)
      });
    }

    const normalizedItems =
      Array.isArray(items) && items.length > 0
        ? items
        : itemCode
        ? [{
            itemCode,
            itemName: itemName || itemCode,
            receivedQty: Number(receivedQty) || 1,
            baseUom,
            unitRate: Number(unitRate) || 0,
            subtotal: (Number(receivedQty) || 1) * (Number(unitRate) || 0)
          }]
        : [];

    const cleanPrj = String(projectId || '').toUpperCase().trim();
    const cleanPo = String(poNumber || '').toUpperCase().trim();
    const isDirectAccepted = qcGate === 'DIRECT_ACCEPTED';

    const grn = await prisma.grnRecord.create({
      data: {
        grnNumber: finalGrnNumber,
        grnType,
        poNumber: cleanPo,
        poId: poId || null,
        projectId: cleanPrj,
        vendorId: vendorId || null,
        vendorName,
        invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        binLocation,
        qcStatus: isDirectAccepted ? 'QC_ACCEPTED' : 'PENDING_IQC',
        items: normalizedItems,
        taxableSubtotal: Number(taxableSubtotal) || 0,
        totalItemTax: Number(totalItemTax) || 0,
        transportationCharges: Number(transportationCharges) || 0,
        transportationGstPercent: Number(transportationGstPercent) || 0,
        transportationGstAmount: Number(transportationGstAmount) || 0,
        packingCharges: Number(packingCharges) || 0,
        packingGstPercent: Number(packingGstPercent) || 0,
        packingGstAmount: Number(packingGstAmount) || 0,
        roundOff: Number(roundOff) || 0,
        grandTotal: Number(grandTotal) || 0,
        notes,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    // Automatically update Purchase Order status if linked PO exists
    if (cleanPo) {
      try {
        const po = await prisma.purchaseOrder.findFirst({
          where: { poNumber: cleanPo }
        });
        if (po) {
          const allGrns = await prisma.grnRecord.findMany({
            where: { poNumber: cleanPo }
          });
          let totalReceivedQty = 0;
          allGrns.forEach((g) => {
            if (Array.isArray(g.items)) {
              g.items.forEach((it) => {
                totalReceivedQty += Number(it.receivedQty || it.quantity || 0);
              });
            }
          });
          let totalOrderedQty = 0;
          if (Array.isArray(po.items)) {
            po.items.forEach((it) => {
              const q = typeof it.quantity === 'object' ? it.quantity?.baseQty : it.quantity;
              totalOrderedQty += Number(q || 0);
            });
          }
          const nextPoStatus =
            totalReceivedQty >= totalOrderedQty && totalOrderedQty > 0
              ? 'FULL_RECEIVED'
              : 'PARTIALLY_RECEIVED';
          await prisma.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: nextPoStatus,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      } catch (err) {
        console.warn('Auto PO status update from GRN non-fatal error:', err.message);
      }
    }

    // Update Store Inventory ('acceptedQty' or 'inQcQty') & Location
    for (const it of normalizedItems) {
      const code = String(it.itemCode || it.name || '').toUpperCase().trim();
      if (!code) continue;
      const qty = Number(it.receivedQty ?? it.quantity ?? 1);
      const uom = String(it.baseUom || it.uom || 'Nos').toUpperCase();
      const loc = String(it.locationName || binLocation || 'General Store').trim();

      const rawType = String(it.itemType || '').toUpperCase().trim();
      const rawCat = String(it.category || grnType || '').toUpperCase().trim();
      const isDrawing =
        rawType === 'DRAWING' ||
        rawCat === 'DRAWING' ||
        rawCat === 'DRAWINGS' ||
        rawCat === 'FG' ||
        code.startsWith('DWG-');

      const targetItemType = isDrawing ? 'DRAWING' : 'RM_BO';
      const targetCategory = isDrawing ? 'DRAWING' : (rawCat && rawCat !== 'DRAWING' ? rawCat : 'BO');

      await prisma.inventoryItem.upsert({
        where: { itemCode: code },
        update: {
          ...(isDirectAccepted
            ? { acceptedQty: { increment: qty } }
            : { inQcQty: { increment: qty } }),
          locationName: loc,
          binLocation: loc,
          itemType: targetItemType,
          category: targetCategory,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        },
        create: {
          itemCode: code,
          itemName: it.itemName || it.description || code,
          category: targetCategory,
          itemType: targetItemType,
          baseUom: uom,
          alternateUom: uom,
          locationName: loc,
          binLocation: loc,
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
    const gateEntryNumber = await generateUniqueSequenceCode({
      model: 'gateEntry',
      field: 'gateEntryNumber',
      prefix: `GE-${new Date().getFullYear()}-`,
      startSeq: 1,
      padLength: 4
    });
    const gateEntry = await prisma.gateEntry.create({
      data: {
        gateEntryNumber,
        grnNumber: finalGrnNumber,
        poNumber: cleanPo,
        projectId: cleanPrj,
        vendorName,
        challanOrInvoiceNumber: invoiceNo || finalGrnNumber,
        itemsCount: normalizedItems.length || 1,
        status: isDirectAccepted ? 'QC_ACCEPTED' : 'QUARANTINE_HOLD',
        securityGuardName: actorName,
        notes: notes || `Auto-created from GRN ${finalGrnNumber}`,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'GRN_CREATED',
      module: 'store',
      entityId: grn.id,
      entityType: 'GrnRecord',
      notes: `GRN ${finalGrnNumber} created with ${normalizedItems.length} items (Total: ₹${grandTotal}).`
    });

    res.status(201).json({
      success: true,
      message: `All set! GRN ${finalGrnNumber} inwarded successfully (${isDirectAccepted ? 'Available Stock' : 'Quarantine Hold'}).`,
      grn: { ...grn, _id: grn.id },
      gateEntry: { ...gateEntry, _id: gateEntry.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Inward GRN Records for GRN History Ledger:
 * Supports search, vendor filter, status filter, and pagination.
 * Also returns active Store Time Policy so frontend can render lock indicators.
 */
export const getGrnRecords = async (req, res, next) => {
  try {
    const { search, vendorName, poNumber, qcStatus, page = 1, limit = 50 } = req.query;
    const where = {};

    if (vendorName) where.vendorName = { contains: String(vendorName).trim(), mode: 'insensitive' };
    if (poNumber) where.poNumber = { contains: String(poNumber).trim(), mode: 'insensitive' };
    if (qcStatus) where.qcStatus = String(qcStatus).trim();

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { grnNumber: { contains: q, mode: 'insensitive' } },
        { vendorName: { contains: q, mode: 'insensitive' } },
        { invoiceNo: { contains: q, mode: 'insensitive' } },
        { poNumber: { contains: q, mode: 'insensitive' } },
        { projectId: { contains: q, mode: 'insensitive' } }
      ];
    }

    const [total, grns, config] = await Promise.all([
      prisma.grnRecord.count({ where }),
      prisma.grnRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      prisma.storeConfig.findUnique({
        where: { configKey: 'GLOBAL_STORE_CONFIG' }
      })
    ]);

    const timePolicy = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config?.timePolicy === 'object' ? config.timePolicy : {})
    };

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      grns: grns.map((g) => ({ ...g, _id: g.id })),
      timePolicy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single GRN Record by ID
 */
export const getGrnRecordById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const grn = await prisma.grnRecord.findUnique({
      where: { id }
    });

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found.'
      });
    }

    res.status(200).json({
      success: true,
      grn: { ...grn, _id: grn.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update / Edit Existing GRN:
 * 1. Checks Time Policy edit window (locks if window expired).
 * 2. Reverses previous quantities from Store Inventory & PO.
 * 3. Applies new line item quantities & rates to Store Inventory & PO.
 * 4. Recalculates taxes/totals and logs full audit trail.
 */
export const updateGrnRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existingGrn = await prisma.grnRecord.findUnique({
      where: { id }
    });

    if (!existingGrn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found.'
      });
    }

    // Check Store Master Time Policy
    const config = await prisma.storeConfig.findUnique({
      where: { configKey: 'GLOBAL_STORE_CONFIG' }
    });
    const timePolicy = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config?.timePolicy === 'object' ? config.timePolicy : {})
    };

    const userRole = String(req.user?.role || '').toUpperCase();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const ageHours = (Date.now() - new Date(existingGrn.createdAt).getTime()) / (1000 * 60 * 60);

    if (!timePolicy.allowGrnEdit && !(timePolicy.allowAdminOverride && isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'Editing GRN records is locked by Store Master Time Policy.'
      });
    }

    if (
      timePolicy.grnEditWindowHours > 0 &&
      ageHours > timePolicy.grnEditWindowHours &&
      !(timePolicy.allowAdminOverride && isAdmin)
    ) {
      return res.status(403).json({
        success: false,
        message: `Edit locked: The allowable edit window of ${timePolicy.grnEditWindowHours} hours has expired. Please contact an Administrator.`
      });
    }

    const {
      vendorId,
      vendorName,
      invoiceNo,
      invoiceDate,
      receivedDate,
      binLocation,
      items = [],
      taxableSubtotal,
      totalItemTax,
      transportationCharges,
      transportationGstPercent,
      transportationGstAmount,
      packingCharges,
      packingGstPercent,
      packingGstAmount,
      roundOff,
      grandTotal,
      notes,
      qcGate
    } = req.body;

    const oldItems = Array.isArray(existingGrn.items) ? existingGrn.items : [];
    const newItems = Array.isArray(items) ? items : [];
    const wasDirectAccepted = existingGrn.qcStatus === 'QC_ACCEPTED' || existingGrn.qcStatus === 'DIRECT_ACCEPTED';
    const isNowDirectAccepted = qcGate ? qcGate === 'DIRECT_ACCEPTED' : wasDirectAccepted;

    // STEP 1: Reverse previous quantities from inventory
    for (const oldIt of oldItems) {
      const code = String(oldIt.itemCode || oldIt.name || '').toUpperCase().trim();
      if (!code) continue;
      const oldQty = Number(oldIt.receivedQty ?? oldIt.quantity ?? 1);

      const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
      if (inv) {
        if (wasDirectAccepted) {
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              acceptedQty: Math.max(0, (inv.acceptedQty || 0) - oldQty),
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        } else {
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              inQcQty: Math.max(0, (inv.inQcQty || 0) - oldQty),
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    }

    // STEP 2: Apply updated quantities to inventory
    for (const newIt of newItems) {
      const code = String(newIt.itemCode || newIt.name || '').toUpperCase().trim();
      if (!code) continue;
      const newQty = Number(newIt.receivedQty ?? newIt.quantity ?? 1);
      const loc = String(newIt.locationName || binLocation || existingGrn.binLocation || 'General Store').trim();
      const uom = String(newIt.baseUom || newIt.uom || 'Nos').toUpperCase();

      const rawType = String(newIt.itemType || '').toUpperCase().trim();
      const rawCat = String(newIt.category || existingGrn.grnType || '').toUpperCase().trim();
      const isDrawing =
        rawType === 'DRAWING' ||
        rawCat === 'DRAWING' ||
        rawCat === 'DRAWINGS' ||
        rawCat === 'FG' ||
        code.startsWith('DWG-');

      const targetItemType = isDrawing ? 'DRAWING' : 'RM_BO';
      const targetCategory = isDrawing ? 'DRAWING' : (rawCat && rawCat !== 'DRAWING' ? rawCat : 'BO');

      await prisma.inventoryItem.upsert({
        where: { itemCode: code },
        update: {
          ...(isNowDirectAccepted
            ? { acceptedQty: { increment: newQty } }
            : { inQcQty: { increment: newQty } }),
          locationName: loc,
          binLocation: loc,
          itemType: targetItemType,
          category: targetCategory,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        },
        create: {
          itemCode: code,
          itemName: newIt.itemName || newIt.description || code,
          category: targetCategory,
          itemType: targetItemType,
          baseUom: uom,
          alternateUom: uom,
          locationName: loc,
          binLocation: loc,
          acceptedQty: isNowDirectAccepted ? newQty : 0,
          inQcQty: isNowDirectAccepted ? 0 : newQty,
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    // STEP 3: Re-evaluate Purchase Order status if PO linked
    const poNum = existingGrn.poNumber;
    if (poNum) {
      try {
        const po = await prisma.purchaseOrder.findFirst({ where: { poNumber: poNum } });
        if (po) {
          const allGrns = await prisma.grnRecord.findMany({ where: { poNumber: poNum } });
          let totalReceivedQty = 0;
          allGrns.forEach((g) => {
            if (g.id === existingGrn.id) {
              newItems.forEach((it) => {
                totalReceivedQty += Number(it.receivedQty || it.quantity || 0);
              });
            } else if (Array.isArray(g.items)) {
              g.items.forEach((it) => {
                totalReceivedQty += Number(it.receivedQty || it.quantity || 0);
              });
            }
          });

          let totalOrderedQty = 0;
          if (Array.isArray(po.items)) {
            po.items.forEach((it) => {
              const q = typeof it.quantity === 'object' ? it.quantity?.baseQty : it.quantity;
              totalOrderedQty += Number(q || 0);
            });
          }

          const nextPoStatus =
            totalReceivedQty >= totalOrderedQty && totalOrderedQty > 0
              ? 'FULL_RECEIVED'
              : totalReceivedQty > 0
              ? 'PARTIALLY_RECEIVED'
              : 'APPROVED';

          await prisma.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: nextPoStatus,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      } catch (err) {
        console.warn('PO status re-balance on GRN update non-fatal error:', err.message);
      }
    }

    // STEP 4: Update GrnRecord in database
    const updatedGrn = await prisma.grnRecord.update({
      where: { id: existingGrn.id },
      data: {
        vendorId: vendorId !== undefined ? (vendorId || null) : existingGrn.vendorId,
        vendorName: vendorName || existingGrn.vendorName,
        invoiceNo: invoiceNo !== undefined ? invoiceNo : existingGrn.invoiceNo,
        invoiceDate: invoiceDate ? new Date(invoiceDate) : existingGrn.invoiceDate,
        receivedDate: receivedDate ? new Date(receivedDate) : existingGrn.receivedDate,
        binLocation: binLocation || existingGrn.binLocation,
        qcStatus: isNowDirectAccepted ? 'QC_ACCEPTED' : 'PENDING_IQC',
        items: newItems,
        taxableSubtotal: taxableSubtotal !== undefined ? Number(taxableSubtotal) : existingGrn.taxableSubtotal,
        totalItemTax: totalItemTax !== undefined ? Number(totalItemTax) : existingGrn.totalItemTax,
        transportationCharges: transportationCharges !== undefined ? Number(transportationCharges) : existingGrn.transportationCharges,
        transportationGstPercent: transportationGstPercent !== undefined ? Number(transportationGstPercent) : existingGrn.transportationGstPercent,
        transportationGstAmount: transportationGstAmount !== undefined ? Number(transportationGstAmount) : existingGrn.transportationGstAmount,
        packingCharges: packingCharges !== undefined ? Number(packingCharges) : existingGrn.packingCharges,
        packingGstPercent: packingGstPercent !== undefined ? Number(packingGstPercent) : existingGrn.packingGstPercent,
        packingGstAmount: packingGstAmount !== undefined ? Number(packingGstAmount) : existingGrn.packingGstAmount,
        roundOff: roundOff !== undefined ? Number(roundOff) : existingGrn.roundOff,
        grandTotal: grandTotal !== undefined ? Number(grandTotal) : existingGrn.grandTotal,
        notes: notes !== undefined ? notes : existingGrn.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'STORE_GRN_UPDATED',
      module: 'store',
      entityId: updatedGrn.id,
      entityType: 'GrnRecord',
      notes: `GRN ${updatedGrn.grnNumber} updated with ${newItems.length} items. Stock and PO re-balanced.`
    });

    res.status(200).json({
      success: true,
      message: `All set! GRN ${updatedGrn.grnNumber} updated and stock re-balanced.`,
      grn: { ...updatedGrn, _id: updatedGrn.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete GRN with Full Stock Reversal:
 * 1. Checks Time Policy deletion window & Admin override.
 * 2. Checks Stock Integrity (prevent negative stock if already issued).
 * 3. Safely decrements stock from inventory.
 * 4. Restores Outward PO line item balances.
 * 5. Removes linked Quality GateEntry and GrnRecord.
 */
export const deleteGrnRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const grn = await prisma.grnRecord.findUnique({
      where: { id }
    });

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN record not found.'
      });
    }

    // Check Store Master Time Policy
    const config = await prisma.storeConfig.findUnique({
      where: { configKey: 'GLOBAL_STORE_CONFIG' }
    });
    const timePolicy = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config?.timePolicy === 'object' ? config.timePolicy : {})
    };

    const userRole = String(req.user?.role || '').toUpperCase();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const ageHours = (Date.now() - new Date(grn.createdAt).getTime()) / (1000 * 60 * 60);

    if (!timePolicy.allowGrnDelete && !(timePolicy.allowAdminOverride && isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'GRN deletion is locked by Store Master Time Policy.'
      });
    }

    if (
      timePolicy.grnDeleteWindowHours > 0 &&
      ageHours > timePolicy.grnDeleteWindowHours &&
      !(timePolicy.allowAdminOverride && isAdmin)
    ) {
      return res.status(403).json({
        success: false,
        message: `Deletion locked: The allowable deletion window of ${timePolicy.grnDeleteWindowHours} hours has expired. Please contact an Administrator.`
      });
    }

    const items = Array.isArray(grn.items) ? grn.items : [];
    const wasDirectAccepted = grn.qcStatus === 'QC_ACCEPTED' || grn.qcStatus === 'DIRECT_ACCEPTED';

    // Stock Integrity Guard: Verify that reversing won't push stock into negative
    if (timePolicy.preventNegativeStockOnReversal) {
      for (const it of items) {
        const code = String(it.itemCode || it.name || '').toUpperCase().trim();
        if (!code) continue;
        const qty = Number(it.receivedQty ?? it.quantity ?? 1);

        const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
        if (inv) {
          const currentAvailable = wasDirectAccepted ? (inv.acceptedQty || 0) : (inv.inQcQty || 0);
          if (currentAvailable < qty) {
            return res.status(400).json({
              success: false,
              message: `Cannot delete GRN: Reversing "${code}" requires ${qty} ${inv.baseUom}, but only ${currentAvailable} ${inv.baseUom} is currently available in store. Items have already been issued to production.`
            });
          }
        }
      }
    }

    // STEP 1: Decrement reversed stock from inventory
    for (const it of items) {
      const code = String(it.itemCode || it.name || '').toUpperCase().trim();
      if (!code) continue;
      const qty = Number(it.receivedQty ?? it.quantity ?? 1);

      const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
      if (inv) {
        if (wasDirectAccepted) {
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              acceptedQty: Math.max(0, (inv.acceptedQty || 0) - qty),
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        } else {
          await prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              inQcQty: Math.max(0, (inv.inQcQty || 0) - qty),
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    }

    // STEP 2: Restore Outward Purchase Order balances if PO linked
    const poNum = grn.poNumber;
    if (poNum) {
      try {
        const po = await prisma.purchaseOrder.findFirst({ where: { poNumber: poNum } });
        if (po) {
          const otherGrns = await prisma.grnRecord.findMany({
            where: {
              poNumber: poNum,
              id: { not: grn.id }
            }
          });

          let otherReceivedQty = 0;
          otherGrns.forEach((og) => {
            if (Array.isArray(og.items)) {
              og.items.forEach((it) => {
                otherReceivedQty += Number(it.receivedQty || it.quantity || 0);
              });
            }
          });

          let totalOrderedQty = 0;
          if (Array.isArray(po.items)) {
            po.items.forEach((it) => {
              const q = typeof it.quantity === 'object' ? it.quantity?.baseQty : it.quantity;
              totalOrderedQty += Number(q || 0);
            });
          }

          const nextPoStatus =
            otherReceivedQty >= totalOrderedQty && totalOrderedQty > 0
              ? 'FULL_RECEIVED'
              : otherReceivedQty > 0
              ? 'PARTIALLY_RECEIVED'
              : 'APPROVED';

          await prisma.purchaseOrder.update({
            where: { id: po.id },
            data: {
              status: nextPoStatus,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      } catch (err) {
        console.warn('PO balance restore on GRN deletion non-fatal error:', err.message);
      }
    }

    // STEP 3: Remove linked Quality GateEntry (if any)
    try {
      await prisma.gateEntry.deleteMany({
        where: { grnNumber: grn.grnNumber }
      });
    } catch (err) {
      console.warn('Linked GateEntry removal non-fatal error:', err.message);
    }

    // STEP 4: Delete the GrnRecord
    await prisma.grnRecord.delete({
      where: { id: grn.id }
    });

    await logAuditEvent({
      req,
      action: 'STORE_GRN_DELETED',
      module: 'store',
      entityId: grn.id,
      entityType: 'GrnRecord',
      notes: `GRN ${grn.grnNumber} deleted. Stock reversed and PO balance restored.`
    });

    res.status(200).json({
      success: true,
      message: `All set! GRN ${grn.grnNumber} deleted and stock reversed successfully.`
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

/**
 * Get attached BOM items for an Open Work Order / Project with Live Store Inventory Stock
 */
export const getWorkOrderBomItems = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const clean = String(projectId || '').trim();

    // Check if clean is a valid UUID format before querying the id field
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);

    // Find project by id (UUID), projectId, or workOrderNumber
    const project = await prisma.project.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ id: clean }] : []),
          { projectId: clean.toUpperCase() },
          { workOrderNumber: clean.toUpperCase() }
        ]
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: `Work Order or Project ${clean} not found.`
      });
    }

    // Load BOM for the project
    const bom = await prisma.bom.findUnique({
      where: { projectId: project.projectId }
    });

    const bomItems = bom && Array.isArray(bom.items) ? bom.items : [];

    // Preload inventory items to attach live stock
    const invItems = await prisma.inventoryItem.findMany();
    const invMap = new Map();
    invItems.forEach((inv) => {
      invMap.set(inv.itemCode.toUpperCase().trim(), inv);
    });

    const enrichedItems = bomItems.map((it, idx) => {
      const code = String(it.itemCode || it.drawingNumber || it.name || '').toUpperCase().trim();
      const inv = invMap.get(code);
      const liveStock = inv ? Number(inv.acceptedQty || 0) : 0;
      const plannedQty = Number(it.quantity ?? it.plannedQty ?? it.qty ?? 1);
      const uom = String(it.uom || it.baseUom || 'Nos');
      return {
        id: `bom-${idx}-${code}`,
        itemCode: code,
        itemName: it.itemName || it.description || it.name || code,
        description: it.description || '',
        revision: it.revision || it.currentVersion || 'Rev 1.0',
        make: it.make || it.specifications || '',
        uom,
        plannedQty,
        liveAvailableStock: liveStock,
        itemType: it.itemType || (code.startsWith('DWG-') ? 'DRAWING' : 'BO')
      };
    });

    return res.status(200).json({
      success: true,
      projectId: project.projectId,
      workOrderNumber: project.workOrderNumber,
      projectName: project.projectName,
      customerName: project.customerName,
      machineModel: project.machineModel,
      hasBom: Boolean(bom && bomItems.length > 0),
      items: enrichedItems
    });
  } catch (error) {
    next(error);
  }
};

export const getMaterialRequests = async (req, res, next) => {
  try {
    const { projectId, status, search } = req.query;
    const where = {};
    if (projectId) where.projectId = String(projectId).toUpperCase();
    if (status) {
      if (status === 'PENDING') where.status = 'PENDING';
      else if (status === 'ISSUED') where.status = 'ISSUED';
      else where.status = status;
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { mrNumber: { contains: q, mode: 'insensitive' } },
        { projectId: { contains: q, mode: 'insensitive' } },
        { requestedBy: { contains: q, mode: 'insensitive' } }
      ];
    }
    const list = await prisma.storeMaterialRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const config = await prisma.storeConfig.findUnique({
      where: { configKey: 'GLOBAL_STORE_CONFIG' }
    });
    const timePolicy = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config?.timePolicy === 'object' ? config.timePolicy : {})
    };

    res.status(200).json({
      success: true,
      count: list.length,
      materialRequests: list.map((m) => ({ ...m, _id: m.id })),
      timePolicy
    });
  } catch (error) {
    next(error);
  }
};

export const createMaterialRequest = async (req, res, next) => {
  try {
    const mrNumber = await generateUniqueSequenceCode({
      model: 'storeMaterialRequest',
      field: 'mrNumber',
      prefix: `MR-${new Date().getFullYear()}-`,
      startSeq: 1,
      padLength: 4
    });
    const actorName = getActorName(req.user);

    const { projectId, department = 'PRODUCTION', items = [], notes = '' } = req.body;
    const mr = await prisma.storeMaterialRequest.create({
      data: {
        mrNumber,
        projectId: String(projectId || 'WO-2026-1001').toUpperCase().trim(),
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
    // Verify all requested quantities do not exceed live available stock
    for (const it of reqItems) {
      const code = String(it.itemCode || '').toUpperCase().trim();
      const qty = Number(it.quantity ?? it.requestedQty ?? 1);
      if (!code || qty <= 0) continue;
      const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
      if (!inv || (inv.acceptedQty || 0) < qty) {
        return res.status(400).json({
          success: false,
          message: `Cannot issue ${code}: requested ${qty} Nos exceeds live available stock (${inv?.acceptedQty || 0} Nos).`
        });
      }
    }

    // Deduct stock from Bucket 3 (acceptedQty) and move to Bucket 4 (issuedQty)
    for (const it of reqItems) {
      const code = String(it.itemCode || '').toUpperCase().trim();
      const qty = Number(it.quantity ?? it.requestedQty ?? 1);
      if (!code || qty <= 0) continue;
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

export const updateMaterialRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);
    const existingMr = await prisma.storeMaterialRequest.findUnique({ where: { id } });
    if (!existingMr) {
      return res.status(404).json({ success: false, message: 'Material Request not found.' });
    }

    const { department, notes, items = [] } = req.body;

    // If PENDING, update freely
    if (existingMr.status !== 'ISSUED') {
      const updated = await prisma.storeMaterialRequest.update({
        where: { id },
        data: {
          ...(department ? { department } : {}),
          ...(notes !== undefined ? { notes } : {}),
          items: Array.isArray(items) ? items : existingMr.items,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
      return res.status(200).json({
        success: true,
        message: `All set! Material Request ${existingMr.mrNumber} updated successfully.`,
        materialRequest: { ...updated, _id: updated.id }
      });
    }

    // If ISSUED, enforce Time Policy & rebalance stock
    const config = await prisma.storeConfig.findUnique({
      where: { configKey: 'GLOBAL_STORE_CONFIG' }
    });
    const timePolicy = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config?.timePolicy === 'object' ? config.timePolicy : {})
    };

    const userRole = String(req.user?.role || '').toUpperCase();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const ageHours = (Date.now() - new Date(existingMr.updatedAt || existingMr.createdAt).getTime()) / (1000 * 60 * 60);

    if (!timePolicy.allowIssueEdit && !(timePolicy.allowAdminOverride && isAdmin)) {
      return res.status(403).json({
        success: false,
        message: 'Editing issued materials is restricted by Store Master Time Policy.'
      });
    }

    if (
      timePolicy.issueEditWindowHours > 0 &&
      ageHours > timePolicy.issueEditWindowHours &&
      !(timePolicy.allowAdminOverride && isAdmin)
    ) {
      return res.status(403).json({
        success: false,
        message: `Edit locked: The allowable edit window of ${timePolicy.issueEditWindowHours} hours has expired. Please contact an Administrator.`
      });
    }

    // Rebalance stock differences between old items and new items
    const oldItems = Array.isArray(existingMr.items) ? existingMr.items : [];
    const newItems = Array.isArray(items) ? items : oldItems;

    const oldMap = new Map();
    oldItems.forEach((it) => {
      const c = String(it.itemCode || '').toUpperCase().trim();
      const q = Number(it.quantity ?? it.requestedQty ?? 0);
      oldMap.set(c, (oldMap.get(c) || 0) + q);
    });

    const newMap = new Map();
    newItems.forEach((it) => {
      const c = String(it.itemCode || '').toUpperCase().trim();
      const q = Number(it.quantity ?? it.requestedQty ?? 0);
      newMap.set(c, (newMap.get(c) || 0) + q);
    });

    const allCodes = new Set([...oldMap.keys(), ...newMap.keys()]);
    for (const code of allCodes) {
      if (!code) continue;
      const oldQ = oldMap.get(code) || 0;
      const newQ = newMap.get(code) || 0;
      const diff = newQ - oldQ;

      if (diff > 0) {
        const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
        if (!inv || (inv.acceptedQty || 0) < diff) {
          return res.status(400).json({
            success: false,
            message: `Cannot increase quantity for ${code}: requested additional ${diff} Nos exceeds live available stock (${inv?.acceptedQty || 0} Nos).`
          });
        }
      }
    }

    for (const code of allCodes) {
      if (!code) continue;
      const oldQ = oldMap.get(code) || 0;
      const newQ = newMap.get(code) || 0;
      const diff = newQ - oldQ;
      if (diff !== 0) {
        const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
        if (inv) {
          await prisma.inventoryItem.update({
            where: { itemCode: code },
            data: {
              acceptedQty: Math.max(0, (inv.acceptedQty || 0) - diff),
              issuedQty: Math.max(0, (inv.issuedQty || 0) + diff),
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
        }
      }
    }

    const updated = await prisma.storeMaterialRequest.update({
      where: { id },
      data: {
        ...(department ? { department } : {}),
        ...(notes !== undefined ? { notes } : {}),
        items: newItems,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    return res.status(200).json({
      success: true,
      message: `All set! Material Issue ${existingMr.mrNumber} updated and stock re-balanced.`,
      materialRequest: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMaterialRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);
    const existingMr = await prisma.storeMaterialRequest.findUnique({ where: { id } });
    if (!existingMr) {
      return res.status(404).json({ success: false, message: 'Material Request not found.' });
    }

    // If PENDING, delete freely
    if (existingMr.status !== 'ISSUED') {
      await prisma.storeMaterialRequest.delete({ where: { id } });
      return res.status(200).json({
        success: true,
        message: `Material Request ${existingMr.mrNumber} removed successfully.`
      });
    }

    // If ISSUED, enforce Time Policy & rollback stock
    const config = await prisma.storeConfig.findUnique({
      where: { configKey: 'GLOBAL_STORE_CONFIG' }
    });
    const timePolicy = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config?.timePolicy === 'object' ? config.timePolicy : {})
    };

    const userRole = String(req.user?.role || '').toUpperCase();
    const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
    const ageHours = (Date.now() - new Date(existingMr.updatedAt || existingMr.createdAt).getTime()) / (1000 * 60 * 60);

    if (
      (!timePolicy.allowIssueDelete || timePolicy.issueDeleteWindowHours === -1) &&
      !(timePolicy.allowAdminOverride && isAdmin)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Deleting material issues is locked by Store Master Time Policy.'
      });
    }

    if (
      timePolicy.issueDeleteWindowHours > 0 &&
      ageHours > timePolicy.issueDeleteWindowHours &&
      !(timePolicy.allowAdminOverride && isAdmin)
    ) {
      return res.status(403).json({
        success: false,
        message: `Deletion locked: The allowable deletion window of ${timePolicy.issueDeleteWindowHours} hours has expired. Please contact an Administrator.`
      });
    }

    // Rollback stock: reverse issuedQty back to acceptedQty
    const items = Array.isArray(existingMr.items) ? existingMr.items : [];
    for (const it of items) {
      const code = String(it.itemCode || '').toUpperCase().trim();
      const qty = Number(it.quantity ?? it.requestedQty ?? 1);
      if (!code || qty <= 0) continue;

      const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
      if (inv) {
        await prisma.inventoryItem.update({
          where: { itemCode: code },
          data: {
            acceptedQty: (inv.acceptedQty || 0) + qty,
            issuedQty: Math.max(0, (inv.issuedQty || 0) - qty),
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }
    }

    await prisma.storeMaterialRequest.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `All set! Material Issue ${existingMr.mrNumber} deleted and stock rolled back to available inventory.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Work Orders with active materials issued to them (Shopfloor WIP tracking)
 */
export const getWorkOrderWipSummary = async (req, res, next) => {
  try {
    const { status, search } = req.query;

    // Fetch all Material Requests with status ISSUED or CONSUMED
    const mrWhere = {};
    if (status) {
      mrWhere.status = status;
    } else {
      mrWhere.status = { in: ['ISSUED', 'CONSUMED'] };
    }

    const allMrs = await prisma.storeMaterialRequest.findMany({
      where: mrWhere,
      orderBy: { createdAt: 'desc' }
    });

    // Load all projects to attach customer, machine model, etc.
    const allProjects = await prisma.project.findMany();
    const projectMap = new Map();
    allProjects.forEach((p) => {
      if (p.projectId) projectMap.set(p.projectId.toUpperCase().trim(), p);
      if (p.workOrderNumber) projectMap.set(p.workOrderNumber.toUpperCase().trim(), p);
      if (p.id) projectMap.set(p.id, p);
    });

    // Load price rate map from RM and BO masters for WIP valuation
    const [rmList, boList] = await Promise.all([
      prisma.rmItemMaster ? prisma.rmItemMaster.findMany() : [],
      prisma.designItemMaster ? prisma.designItemMaster.findMany() : []
    ]);
    const priceMap = new Map();
    rmList.forEach((it) => {
      const code = String(it.itemCode || '').toUpperCase().trim();
      if (code) priceMap.set(code, Number(it.pricePerUnit || it.rate || 0));
    });
    boList.forEach((it) => {
      const code = String(it.itemCode || '').toUpperCase().trim();
      if (code) priceMap.set(code, Number(it.pricePerUnit || it.rate || 0));
    });

    // Group MRs by Work Order (projectId)
    const woGroupMap = new Map();
    for (const mr of allMrs) {
      const rawPid = String(mr.projectId || '').trim();
      const woKey = rawPid.toUpperCase() || 'UNASSIGNED';
      const proj = projectMap.get(woKey) || projectMap.get(rawPid);

      if (!woGroupMap.has(woKey)) {
        woGroupMap.set(woKey, {
          projectId: proj?.projectId || woKey,
          workOrderNumber: proj?.workOrderNumber || woKey,
          projectName: proj?.projectName || woKey,
          customerName: proj?.customerName || 'Standard Production',
          machineModel: proj?.machineModel || 'General Assembly',
          currentStage: proj?.currentStage || 'PRODUCTION',
          materialRequests: [],
          issuedItemsMap: new Map(),
          activeIssuedQty: 0,
          consumedQty: 0,
          wipValuation: 0,
          status: 'CONSUMED' // will turn IN_ASSEMBLY if any MR is ISSUED
        });
      }

      const group = woGroupMap.get(woKey);
      group.materialRequests.push({ ...mr, _id: mr.id });

      const isIssued = mr.status === 'ISSUED';
      if (isIssued) {
        group.status = 'IN_ASSEMBLY';
      }

      const items = Array.isArray(mr.items) ? mr.items : [];
      items.forEach((it) => {
        const code = String(it.itemCode || '').toUpperCase().trim();
        const qty = Number(it.quantity ?? it.requestedQty ?? 0);
        const uom = String(it.uom || 'Nos');
        const rate = priceMap.get(code) || Number(it.pricePerUnit || it.rate || 0);

        if (isIssued) {
          group.activeIssuedQty += qty;
          group.wipValuation += qty * rate;

          if (!group.issuedItemsMap.has(code)) {
            group.issuedItemsMap.set(code, {
              itemCode: code,
              itemName: it.itemName || code,
              uom,
              issuedQty: 0,
              rate,
              totalValue: 0,
              mrNumbers: []
            });
          }
          const itemAgg = group.issuedItemsMap.get(code);
          itemAgg.issuedQty += qty;
          itemAgg.totalValue += qty * rate;
          if (!itemAgg.mrNumbers.includes(mr.mrNumber)) {
            itemAgg.mrNumbers.push(mr.mrNumber);
          }
        } else {
          group.consumedQty += qty;
        }
      });
    }

    // Convert map to list
    let result = Array.from(woGroupMap.values()).map((g) => ({
      projectId: g.projectId,
      workOrderNumber: g.workOrderNumber,
      projectName: g.projectName,
      customerName: g.customerName,
      machineModel: g.machineModel,
      currentStage: g.currentStage,
      status: g.status, // 'IN_ASSEMBLY' | 'CONSUMED'
      totalDistinctParts: g.issuedItemsMap.size,
      activeIssuedQty: g.activeIssuedQty,
      consumedQty: g.consumedQty,
      wipValuation: Math.round(g.wipValuation * 100) / 100,
      materialRequestsCount: g.materialRequests.length,
      materialRequests: g.materialRequests,
      issuedItems: Array.from(g.issuedItemsMap.values())
    }));

    // Apply search if present
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.workOrderNumber.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.machineModel.toLowerCase().includes(q)
      );
    }

    // Sort active ones first, then by workOrderNumber
    result.sort((a, b) => {
      if (a.status === 'IN_ASSEMBLY' && b.status !== 'IN_ASSEMBLY') return -1;
      if (a.status !== 'IN_ASSEMBLY' && b.status === 'IN_ASSEMBLY') return 1;
      return b.activeIssuedQty - a.activeIssuedQty;
    });

    res.status(200).json({
      success: true,
      count: result.length,
      workOrders: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete Work Order Assembly & Consume WIP Inventory
 * (Optionally consumes specific MRs, or all active ISSUED MRs for that Work Order)
 * Does NOT return stock to Store (Bucket 3 untouched; Bucket 4 issuedQty reduced).
 */
export const completeWorkOrderWip = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { mrIds = [], notes = '' } = req.body;
    const actorName = getActorName(req.user);
    const cleanWo = String(projectId || '').trim().toUpperCase();

    // Find all matching ISSUED MRs for this Work Order
    const where = {
      projectId: { equals: cleanWo, mode: 'insensitive' },
      status: 'ISSUED'
    };
    if (Array.isArray(mrIds) && mrIds.length > 0) {
      where.id = { in: mrIds };
    }

    const mrsToConsume = await prisma.storeMaterialRequest.findMany({ where });

    if (mrsToConsume.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No active issued materials found for Work Order ${cleanWo} to consume.`
      });
    }

    // Item-level reduction from Bucket 4 (issuedQty)
    const consumedItemsSummary = [];
    for (const mr of mrsToConsume) {
      const items = Array.isArray(mr.items) ? mr.items : [];
      for (const it of items) {
        const code = String(it.itemCode || '').toUpperCase().trim();
        const qty = Number(it.quantity ?? it.requestedQty ?? 0);
        if (!code || qty <= 0) continue;

        const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
        if (inv) {
          const nextIssued = Math.max(0, (inv.issuedQty || 0) - qty);
          await prisma.inventoryItem.update({
            where: { itemCode: code },
            data: {
              issuedQty: nextIssued,
              updatedById: req.user?.id || null,
              updatedByName: actorName
            }
          });
          consumedItemsSummary.push({ itemCode: code, qty });
        }
      }

      // Mark MR as CONSUMED
      await prisma.storeMaterialRequest.update({
        where: { id: mr.id },
        data: {
          status: 'CONSUMED',
          notes: notes ? `${mr.notes ? mr.notes + ' | ' : ''}Consumed: ${notes}` : mr.notes,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `All set! Work Order ${cleanWo} assembly completed. ${consumedItemsSummary.length} line items consumed and cleared from WIP.`,
      consumedRequestsCount: mrsToConsume.length,
      mrNumbers: mrsToConsume.map((m) => m.mrNumber)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Consume a specific Material Request from Shopfloor WIP
 */
export const consumeMaterialRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes = '' } = req.body;
    const actorName = getActorName(req.user);

    const mr = await prisma.storeMaterialRequest.findUnique({ where: { id } });
    if (!mr) {
      return res.status(404).json({ success: false, message: 'Material request not found.' });
    }
    if (mr.status !== 'ISSUED') {
      return res.status(400).json({
        success: false,
        message: `Material Request ${mr.mrNumber} is not in ISSUED status (current: ${mr.status}).`
      });
    }

    const items = Array.isArray(mr.items) ? mr.items : [];
    for (const it of items) {
      const code = String(it.itemCode || '').toUpperCase().trim();
      const qty = Number(it.quantity ?? it.requestedQty ?? 0);
      if (!code || qty <= 0) continue;

      const inv = await prisma.inventoryItem.findUnique({ where: { itemCode: code } });
      if (inv) {
        await prisma.inventoryItem.update({
          where: { itemCode: code },
          data: {
            issuedQty: Math.max(0, (inv.issuedQty || 0) - qty),
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
      }
    }

    const updated = await prisma.storeMaterialRequest.update({
      where: { id },
      data: {
        status: 'CONSUMED',
        notes: notes ? `${mr.notes ? mr.notes + ' | ' : ''}Consumed: ${notes}` : mr.notes,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    return res.status(200).json({
      success: true,
      message: `All set! Materials for ${mr.mrNumber} consumed in assembly and cleared from WIP.`,
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
    const dcNumber = await generateUniqueSequenceCode({
      model: 'storeDeliveryChallan',
      field: 'dcNumber',
      prefix: `DC-${new Date().getFullYear()}-`,
      startSeq: 1,
      padLength: 4
    });
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
