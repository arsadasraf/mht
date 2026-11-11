import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';
import {
  checkItemBOMAttachments,
  checkItemPastTransactions,
  propagateItemNameChange
} from '../services/itemGovernance.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const getRmItems = async (req, res, next) => {
  try {
    const { search, category, isActive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    } else {
      where.isActive = true;
    }

    if (category && category !== 'ALL') {
      where.OR = [
        { categoryCode: String(category).trim() },
        { categoryName: { contains: String(category).trim(), mode: 'insensitive' } }
      ];
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { categoryName: { contains: q, mode: 'insensitive' } },
        { hsnCode: { contains: q, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.rmItemMaster.findMany({
      where,
      orderBy: [{ name: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: items.length,
      data: items.map((it) => ({ ...it, _id: it.id })),
      items: items.map((it) => ({ ...it, _id: it.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createRmItem = async (req, res, next) => {
  try {
    const {
      name,
      revision,
      description,
      make,
      categoryCode,
      categoryName,
      uom,
      hsnCode,
      standardRateINR,
      photos,
      photoUrl,
      pdfUrl,
      pdfName
    } = req.body;
    const actorName = getActorName(req.user);

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Item Name is compulsory.'
      });
    }

    const cleanName = name.trim();
    const cleanRevision = (revision || 'Rev 1.0').trim();

    // Check unique (name, revision) constraint
    const existing = await prisma.rmItemMaster.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        revision: { equals: cleanRevision, mode: 'insensitive' }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An RM/BO item with name "${cleanName}" and revision "${cleanRevision}" already exists.`
      });
    }

    // Resolve Category Name
    let resolvedCategoryCode = (categoryCode || '').trim();
    let resolvedCategoryName = (categoryName || '').trim();
    if (!resolvedCategoryName && resolvedCategoryCode) {
      resolvedCategoryName = resolvedCategoryCode;
    }

    const normalizedPhotos = Array.isArray(photos) ? photos.filter(Boolean) : (photoUrl ? [photoUrl] : []);
    const primaryPhoto = photoUrl || (normalizedPhotos.length > 0 ? normalizedPhotos[0] : null);

    const item = await prisma.rmItemMaster.create({
      data: {
        name: cleanName,
        revision: cleanRevision,
        description: (description || '').trim(),
        make: (make || '').trim(),
        categoryCode: resolvedCategoryCode,
        categoryName: resolvedCategoryName,
        uom: (uom || 'Nos').trim(),
        hsnCode: (hsnCode || '7228').trim(),
        standardRateINR: Number(standardRateINR) || 0,
        photos: normalizedPhotos,
        photoUrl: primaryPhoto,
        pdfUrl: pdfUrl ? String(pdfUrl).trim() : null,
        pdfName: pdfName ? String(pdfName).trim() : null,
        isActive: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      action: 'CREATE',
      entity: 'RmItemMaster',
      entityId: item.id,
      details: { name: item.name, make: item.make, category: item.categoryName }
    });

    res.status(201).json({
      success: true,
      message: `All set! Raw Material "${item.name}" created successfully.`,
      item: { ...item, _id: item.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateRmItem = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Item ID is required for update.'
      });
    }

    const {
      name,
      description,
      make,
      categoryCode,
      categoryName,
      uom,
      hsnCode,
      standardRateINR,
      isActive,
      photos,
      photoUrl,
      pdfUrl,
      pdfName
    } = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.rmItemMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Item not found.'
      });
    }

    let cleanName = existing.name;
    if (name && name.trim()) {
      cleanName = name.trim();
      // Verify name uniqueness excluding current item
      const duplicate = await prisma.rmItemMaster.findFirst({
        where: {
          name: { equals: cleanName, mode: 'insensitive' },
          id: { not: id }
        }
      });

      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another item with the name "${cleanName}" already exists. Name must be unique.`
        });
      }
    }

    let resolvedCategoryCode = categoryCode !== undefined ? categoryCode.trim() : existing.categoryCode;
    let resolvedCategoryName = categoryName !== undefined ? categoryName.trim() : existing.categoryName;
    if (!resolvedCategoryName && resolvedCategoryCode) {
      resolvedCategoryName = resolvedCategoryCode;
    }

    let updatedPhotos = existing.photos;
    if (photos !== undefined) {
      updatedPhotos = Array.isArray(photos) ? photos.filter(Boolean) : [photos];
    }
    let updatedPhotoUrl = existing.photoUrl;
    if (photoUrl !== undefined) {
      updatedPhotoUrl = photoUrl;
    } else if (photos !== undefined && updatedPhotos.length > 0) {
      updatedPhotoUrl = updatedPhotos[0];
    }

    const updated = await prisma.rmItemMaster.update({
      where: { id },
      data: {
        name: cleanName,
        description: description !== undefined ? description.trim() : existing.description,
        make: make !== undefined ? make.trim() : existing.make,
        categoryCode: resolvedCategoryCode,
        categoryName: resolvedCategoryName,
        uom: uom !== undefined ? uom.trim() : existing.uom,
        hsnCode: hsnCode !== undefined ? hsnCode.trim() : existing.hsnCode,
        standardRateINR: standardRateINR !== undefined ? Number(standardRateINR) : existing.standardRateINR,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        photos: updatedPhotos,
        photoUrl: updatedPhotoUrl,
        pdfUrl: pdfUrl !== undefined ? (pdfUrl ? String(pdfUrl).trim() : null) : existing.pdfUrl,
        pdfName: pdfName !== undefined ? (pdfName ? String(pdfName).trim() : null) : existing.pdfName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      action: 'UPDATE',
      entity: 'RmItemMaster',
      entityId: updated.id,
      details: { name: updated.name, make: updated.make, changes: req.body }
    });

    // Propagate name and description changes to attached BOMs
    if (existing.name !== updated.name || existing.description !== updated.description) {
      await propagateItemNameChange(updated.id, existing.name, updated.name, updated.description);
    }

    res.status(200).json({
      success: true,
      message: `All set! Raw Material "${updated.name}" updated successfully.`,
      item: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const getRmWhereUsed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.rmItemMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Raw Material not found.'
      });
    }

    const bomCheck = await checkItemBOMAttachments(id, existing.name);
    const txCheck = await checkItemPastTransactions(id, existing.name);

    res.status(200).json({
      success: true,
      item: { id: existing.id, _id: existing.id, name: existing.name, revision: existing.revision },
      bomCheck,
      txCheck
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRmItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.rmItemMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Raw Material not found.'
      });
    }

    // Step 1: Check BOM Attachments (Case 1)
    const bomCheck = await checkItemBOMAttachments(id, existing.name);
    if (bomCheck.isAttached) {
      const bomNames = bomCheck.attachments.map((a) => a.assemblyName || a.name).join(', ');
      return res.status(400).json({
        success: false,
        isBlocked: true,
        message: `This item cannot be deleted or deactivated because it is attached to ${bomCheck.count} BOM(s): ${bomNames}. Please remove it from those BOMs first.`,
        attachments: bomCheck.attachments
      });
    }

    // Step 2: Check Past Transactions (Case 2)
    const txCheck = await checkItemPastTransactions(id, existing.name);
    if (txCheck.hasTransactions) {
      // Soft-deactivate to preserve historical integrity while blocking future transactions
      const updated = await prisma.rmItemMaster.update({
        where: { id },
        data: {
          isActive: false,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }
      });

      await logAuditEvent({
        userId: req.user?.id,
        userName: actorName,
        action: 'DEACTIVATE_DUE_TO_TRANSACTIONS',
        entity: 'RmItemMaster',
        entityId: updated.id,
        details: { name: updated.name, txSummary: txCheck.summary }
      });

      return res.status(200).json({
        success: true,
        isDeactivated: true,
        message: `This item cannot be permanently deleted because past transactions exist (${txCheck.summary}). It has been deactivated to prevent future transactions while preserving historical records.`,
        item: { ...updated, _id: updated.id }
      });
    }

    // Step 3: Zero BOM attachments & Zero past transactions (Case 3) -> Permanent Delete
    await prisma.rmItemMaster.delete({
      where: { id }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      action: 'PERMANENT_DELETE',
      entity: 'RmItemMaster',
      entityId: id,
      details: { name: existing.name }
    });

    return res.status(200).json({
      success: true,
      isDeleted: true,
      message: `All set! Raw Material "${existing.name}" deleted permanently from the master catalog.`
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportRmItems = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items provided for import.'
      });
    }

    const actorName = getActorName(req.user);

    // Fetch existing records from DB (both active and inactive) for duplicate checking & restore
    const existingItems = await prisma.rmItemMaster.findMany({
      select: { id: true, name: true, revision: true, isActive: true }
    });

    const activeKeySet = new Set();
    const inactiveMap = new Map();

    for (const it of existingItems) {
      const key = `${it.name.trim().toLowerCase()}:::${(it.revision || 'Rev 1.0').trim().toLowerCase()}`;
      if (it.isActive) {
        activeKeySet.add(key);
      } else {
        inactiveMap.set(key, it);
      }
    }

    const validToInsert = [];
    const itemsToReactivate = [];
    const skippedItems = [];
    const seenBatchKeys = new Set();

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const rowNumber = row.rowNumber || i + 1;
      const rawName = String(row.name || row.itemName || row.partNumber || '').trim();
      const rawRevision = String(row.revision || 'Rev 1.0').trim();

      if (!rawName) {
        skippedItems.push({
          row: rowNumber,
          name: '(Empty Name)',
          revision: rawRevision,
          reason: 'Item Name / Part Number is required and cannot be empty.'
        });
        continue;
      }

      const key = `${rawName.toLowerCase()}:::${rawRevision.toLowerCase()}`;

      // 1. Check within-file duplicates
      if (seenBatchKeys.has(key)) {
        skippedItems.push({
          row: rowNumber,
          name: rawName,
          revision: rawRevision,
          reason: `Duplicate row in uploaded file (Part "${rawName}", Revision "${rawRevision}").`
        });
        continue;
      }

      seenBatchKeys.add(key);

      // 2. Check active duplicates
      if (activeKeySet.has(key)) {
        skippedItems.push({
          row: rowNumber,
          name: rawName,
          revision: rawRevision,
          reason: `Item with Part "${rawName}" and Revision "${rawRevision}" already exists and is active in the system.`
        });
        continue;
      }

      const rowCategoryCode = String(row.categoryCode || row.category || '').trim();
      const rowCategoryName = String(row.categoryName || row.category || '').trim();
      const rowDescription = String(row.description || '').trim();
      const rowMake = String(row.make || '').trim();
      const rowUom = String(row.uom || 'Nos').trim();
      const rowHsnCode = String(row.hsnCode || '7228').trim();
      const rowRate = parseFloat(row.standardRateINR || row.rate || 0) || 0;

      // 3. Previously deleted/deactivated item -> Reactivate & update with new file data!
      if (inactiveMap.has(key)) {
        const inactiveRec = inactiveMap.get(key);
        itemsToReactivate.push({
          id: inactiveRec.id,
          name: rawName,
          categoryName: rowCategoryName,
          data: {
            isActive: true,
            description: rowDescription,
            make: rowMake,
            categoryCode: rowCategoryCode,
            categoryName: rowCategoryName,
            uom: rowUom,
            hsnCode: rowHsnCode,
            standardRateINR: rowRate,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
        continue;
      }

      // 4. Brand new item to insert
      validToInsert.push({
        name: rawName,
        revision: rawRevision,
        description: rowDescription,
        make: rowMake,
        categoryCode: rowCategoryCode,
        categoryName: rowCategoryName,
        uom: rowUom,
        hsnCode: rowHsnCode,
        standardRateINR: rowRate,
        isActive: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      });
    }

    // Auto-create missing categories in design_category_masters (from both new and reactivated items)
    const distinctCategories = Array.from(
      new Set(
        [...validToInsert, ...itemsToReactivate]
          .map((it) => (it.categoryName || it.data?.categoryName)?.trim())
          .filter((c) => Boolean(c) && c.length > 0)
      )
    );

    let createdCategoriesCount = 0;
    const createdCategories = [];

    if (distinctCategories.length > 0) {
      const existingCategories = await prisma.designCategoryMaster.findMany({
        select: { name: true }
      });
      const existingCategorySet = new Set(
        existingCategories.map((c) => c.name.trim().toLowerCase())
      );

      const newCategoriesToInsert = distinctCategories
        .filter((cat) => !existingCategorySet.has(cat.toLowerCase()))
        .map((cat) => ({
          name: cat,
          description: 'Auto-created via RM & BO bulk import',
          isActive: true,
          createdById: req.user?.id || null,
          createdByName: actorName,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        }));

      if (newCategoriesToInsert.length > 0) {
        await prisma.designCategoryMaster.createMany({
          data: newCategoriesToInsert,
          skipDuplicates: true
        });
        createdCategoriesCount = newCategoriesToInsert.length;
        newCategoriesToInsert.forEach((nc) => createdCategories.push(nc.name));

        await logAuditEvent({
          userId: req.user?.id,
          userName: actorName,
          action: 'BULK_AUTO_CREATE_CATEGORY',
          entityType: 'DESIGN_CATEGORY_MASTER',
          details: {
            createdCategories,
            source: 'RM_BO_BULK_IMPORT'
          }
        });
      }
    }

    // Reactivate and update previously deleted items
    for (const reactivateItem of itemsToReactivate) {
      await prisma.rmItemMaster.update({
        where: { id: reactivateItem.id },
        data: reactivateItem.data
      });
    }

    // Insert brand new items
    if (validToInsert.length > 0) {
      await prisma.rmItemMaster.createMany({
        data: validToInsert
      });
    }

    const totalImported = validToInsert.length + itemsToReactivate.length;

    if (totalImported > 0) {
      await logAuditEvent({
        userId: req.user?.id,
        userName: actorName,
        action: 'BULK_IMPORT',
        entityType: 'RM_ITEM_MASTER',
        details: {
          insertedCount: validToInsert.length,
          restoredCount: itemsToReactivate.length,
          importedCount: totalImported,
          skippedCount: skippedItems.length,
          createdCategoriesCount
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Import processed. ${totalImported} item(s) imported (${validToInsert.length} new, ${itemsToReactivate.length} restored), ${skippedItems.length} duplicate/invalid item(s) skipped.`,
      importedCount: totalImported,
      newCount: validToInsert.length,
      restoredCount: itemsToReactivate.length,
      skippedCount: skippedItems.length,
      skippedItems,
      createdCategoriesCount,
      createdCategories
    });
  } catch (error) {
    next(error);
  }
};
