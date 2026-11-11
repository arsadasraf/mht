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

export const getFgItems = async (req, res, next) => {
  try {
    const { search, classification, category, isActive } = req.query;

    const where = {};
    if (classification && classification !== 'ALL') {
      where.classification = classification.toUpperCase();
    }
    if (category && category !== 'ALL') {
      where.OR = [
        { categoryCode: { equals: category, mode: 'insensitive' } },
        { categoryName: { equals: category, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    }
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { categoryName: { contains: q, mode: 'insensitive' } },
        { revision: { contains: q, mode: 'insensitive' } },
        { hsnCode: { contains: q, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.fgItemMaster.findMany({
      where,
      orderBy: [
        { name: 'asc' },
        { revision: 'desc' }
      ]
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

export const createFgItem = async (req, res, next) => {
  try {
    const {
      name,
      classification,
      categoryCode,
      categoryName,
      revision,
      description,
      uom,
      hsnCode,
      photos,
      photoUrl,
      pdfUrl,
      pdfName,
      bomItems
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
    const existing = await prisma.fgItemMaster.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        revision: { equals: cleanRevision, mode: 'insensitive' }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `An FG item with name "${cleanName}" and revision "${cleanRevision}" already exists. Please choose a different revision code.`
      });
    }

    // Classification must be one of: COMPONENT, SUB_ASSEMBLY, ASSEMBLY
    const validClassifications = ['COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'];
    let resolvedClassification = (classification || 'COMPONENT').toUpperCase().replace(/[-\s]/g, '_');
    if (!validClassifications.includes(resolvedClassification)) {
      resolvedClassification = 'COMPONENT';
    }

    const normalizedPhotos = Array.isArray(photos) ? photos.filter(Boolean) : (photoUrl ? [photoUrl] : []);
    const primaryPhoto = photoUrl || (normalizedPhotos.length > 0 ? normalizedPhotos[0] : null);
    const normalizedBomItems = Array.isArray(bomItems) ? bomItems : [];

    const item = await prisma.fgItemMaster.create({
      data: {
        name: cleanName,
        classification: resolvedClassification,
        categoryCode: (categoryCode || '').trim(),
        categoryName: (categoryName || '').trim(),
        revision: cleanRevision,
        description: (description || '').trim(),
        uom: (uom || 'NOS').trim(),
        hsnCode: (hsnCode || '8479').trim(),
        photos: normalizedPhotos,
        photoUrl: primaryPhoto,
        pdfUrl: pdfUrl ? String(pdfUrl).trim() : null,
        pdfName: pdfName ? String(pdfName).trim() : null,
        bomItems: normalizedBomItems,
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
      entity: 'FgItemMaster',
      entityId: item.id,
      details: { name: item.name, classification: item.classification, revision: item.revision }
    });

    res.status(201).json({
      success: true,
      message: `All set! FG Item "${item.name}" (${item.revision}) created successfully.`,
      item: { ...item, _id: item.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateFgItem = async (req, res, next) => {
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
      classification,
      categoryCode,
      categoryName,
      revision,
      description,
      uom,
      hsnCode,
      isActive,
      photos,
      photoUrl,
      pdfUrl,
      pdfName,
      bomItems
    } = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.fgItemMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'FG item not found.'
      });
    }

    let cleanName = existing.name;
    if (name && name.trim()) {
      cleanName = name.trim();
    }
    let cleanRevision = existing.revision;
    if (revision && revision.trim()) {
      cleanRevision = revision.trim();
    }

    // Verify name + revision uniqueness excluding current item
    const duplicate = await prisma.fgItemMaster.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
        revision: { equals: cleanRevision, mode: 'insensitive' },
        id: { not: id }
      }
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `An item with name "${cleanName}" and revision "${cleanRevision}" already exists. Name and revision must be uniquely paired.`
      });
    }

    let resolvedClassification = existing.classification;
    if (classification) {
      const c = classification.toUpperCase().replace(/[-\s]/g, '_');
      if (['COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'].includes(c)) {
        resolvedClassification = c;
      }
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

    const updated = await prisma.fgItemMaster.update({
      where: { id },
      data: {
        name: cleanName,
        classification: resolvedClassification,
        categoryCode: categoryCode !== undefined ? categoryCode.trim() : existing.categoryCode,
        categoryName: categoryName !== undefined ? categoryName.trim() : existing.categoryName,
        revision: cleanRevision,
        description: description !== undefined ? description.trim() : existing.description,
        uom: uom !== undefined ? uom.trim() : existing.uom,
        hsnCode: hsnCode !== undefined ? hsnCode.trim() : existing.hsnCode,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        photos: updatedPhotos,
        photoUrl: updatedPhotoUrl,
        pdfUrl: pdfUrl !== undefined ? (pdfUrl ? String(pdfUrl).trim() : null) : existing.pdfUrl,
        pdfName: pdfName !== undefined ? (pdfName ? String(pdfName).trim() : null) : existing.pdfName,
        bomItems: bomItems !== undefined ? (Array.isArray(bomItems) ? bomItems : []) : existing.bomItems,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      action: 'UPDATE',
      entity: 'FgItemMaster',
      entityId: updated.id,
      details: { name: updated.name, revision: updated.revision, classification: updated.classification }
    });

    // Propagate name and description changes to attached BOMs
    if (existing.name !== updated.name || existing.description !== updated.description) {
      await propagateItemNameChange(updated.id, existing.name, updated.name, updated.description || '');
    }

    res.status(200).json({
      success: true,
      message: `All set! FG Item "${updated.name}" updated successfully.`,
      item: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const createFgRevision = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id;
    const { revision, changeNotes } = req.body;
    const actorName = getActorName(req.user);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Base item ID is required to create a new revision.'
      });
    }

    const baseItem = await prisma.fgItemMaster.findUnique({
      where: { id }
    });

    if (!baseItem) {
      return res.status(404).json({
        success: false,
        message: 'Base FG item not found.'
      });
    }

    // Determine new revision code
    let newRevision = (revision || '').trim();
    if (!newRevision) {
      // Auto increment e.g. Rev 1.0 -> Rev 2.0 or Rev A -> Rev B
      const match = baseItem.revision.match(/Rev\s*(\d+(\.\d+)?)/i);
      if (match) {
        const nextNum = (parseFloat(match[1]) + 1).toFixed(1);
        newRevision = `Rev ${nextNum}`;
      } else {
        newRevision = `${baseItem.revision}.1`;
      }
    }

    // Check duplicate (name, newRevision)
    const exists = await prisma.fgItemMaster.findFirst({
      where: {
        name: { equals: baseItem.name, mode: 'insensitive' },
        revision: { equals: newRevision, mode: 'insensitive' }
      }
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Revision "${newRevision}" already exists for item "${baseItem.name}". Please specify a distinct revision.`
      });
    }

    // Clone base item specs and BOM into new revision
    const newItem = await prisma.fgItemMaster.create({
      data: {
        name: baseItem.name,
        classification: baseItem.classification,
        categoryCode: baseItem.categoryCode,
        categoryName: baseItem.categoryName,
        revision: newRevision,
        description: baseItem.description,
        uom: baseItem.uom,
        hsnCode: baseItem.hsnCode,
        photos: baseItem.photos,
        photoUrl: baseItem.photoUrl,
        pdfUrl: baseItem.pdfUrl,
        pdfName: baseItem.pdfName,
        bomItems: baseItem.bomItems,
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
      action: 'REVISION_CREATE',
      entity: 'FgItemMaster',
      entityId: newItem.id,
      details: {
        baseItemId: baseItem.id,
        name: newItem.name,
        oldRevision: baseItem.revision,
        newRevision: newItem.revision,
        changeNotes: changeNotes || ''
      }
    });

    res.status(201).json({
      success: true,
      message: `Great! New revision "${newItem.revision}" created for "${newItem.name}".`,
      item: { ...newItem, _id: newItem.id }
    });
  } catch (error) {
    next(error);
  }
};

export const getFgWhereUsed = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.fgItemMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'FG Item not found.'
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

export const deleteFgItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const actorName = getActorName(req.user);

    const existing = await prisma.fgItemMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'FG Item not found.'
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
      const updated = await prisma.fgItemMaster.update({
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
        entity: 'FgItemMaster',
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
    await prisma.fgItemMaster.delete({
      where: { id }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      action: 'PERMANENT_DELETE',
      entity: 'FgItemMaster',
      entityId: id,
      details: { name: existing.name }
    });

    return res.status(200).json({
      success: true,
      isDeleted: true,
      message: `All set! FG Item "${existing.name}" deleted permanently from the master catalog.`
    });
  } catch (error) {
    next(error);
  }
};

export const bulkImportFgItems = async (req, res, next) => {
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
    const existingItems = await prisma.fgItemMaster.findMany({
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
          reason: 'Part Number / Item Name is compulsory and cannot be blank.'
        });
        continue;
      }

      const key = `${rawName.toLowerCase()}:::${rawRevision.toLowerCase()}`;

      // 1. In-file duplicate
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

      // 2. Active duplicate in database
      if (activeKeySet.has(key)) {
        skippedItems.push({
          row: rowNumber,
          name: rawName,
          revision: rawRevision,
          reason: `FG Item with Part "${rawName}" and Revision "${rawRevision}" already exists and is active in the system.`
        });
        continue;
      }

      const classification = String(row.classification || 'COMPONENT').toUpperCase().trim();
      const validClass = ['COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'].includes(classification)
        ? classification
        : 'COMPONENT';

      const rowCategoryCode = String(row.categoryCode || row.category || '').trim();
      const rowCategoryName = String(row.categoryName || row.category || '').trim();
      const rowDescription = String(row.description || '').trim();
      const rowUom = String(row.uom || 'Nos').trim();
      const rowHsnCode = String(row.hsnCode || '8479').trim();

      // 3. Previously deleted/deactivated item -> Reactivate & update with new file data!
      if (inactiveMap.has(key)) {
        const inactiveRec = inactiveMap.get(key);
        itemsToReactivate.push({
          id: inactiveRec.id,
          name: rawName,
          categoryName: rowCategoryName,
          data: {
            isActive: true,
            classification: validClass,
            description: rowDescription,
            categoryCode: rowCategoryCode,
            categoryName: rowCategoryName,
            uom: rowUom,
            hsnCode: rowHsnCode,
            updatedById: req.user?.id || null,
            updatedByName: actorName
          }
        });
        continue;
      }

      // 4. Brand new item to insert
      validToInsert.push({
        name: rawName,
        classification: validClass,
        revision: rawRevision,
        categoryCode: rowCategoryCode,
        categoryName: rowCategoryName,
        description: rowDescription,
        uom: rowUom,
        hsnCode: rowHsnCode,
        bomItems: [],
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
          description: 'Auto-created via FG item bulk import',
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
            source: 'FG_BULK_IMPORT'
          }
        });
      }
    }

    // Reactivate and update previously deleted items
    for (const reactivateItem of itemsToReactivate) {
      await prisma.fgItemMaster.update({
        where: { id: reactivateItem.id },
        data: reactivateItem.data
      });
    }

    // Insert brand new items
    if (validToInsert.length > 0) {
      await prisma.fgItemMaster.createMany({
        data: validToInsert
      });
    }

    const totalImported = validToInsert.length + itemsToReactivate.length;

    if (totalImported > 0) {
      await logAuditEvent({
        userId: req.user?.id,
        userName: actorName,
        action: 'BULK_IMPORT',
        entityType: 'FG_ITEM_MASTER',
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

