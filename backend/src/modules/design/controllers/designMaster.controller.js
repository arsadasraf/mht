import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const DEFAULT_DESIGN_PREFIX_POLICY = {
  rmPrefix: 'RM',
  boPrefix: 'BO',
  componentPrefix: 'CMP',
  subAssemblyPrefix: 'SUB',
  assemblyPrefix: 'ASM',
  bomPrefix: 'BOM',
  ecoPrefix: 'ECO',
  lockBomOnFreeze: true,
  autoSendNetDemandToPurchase: true
};

export const ensureDefaultDesignMasters = async (user = null) => {
  const actorName = getActorName(user);
  let config = await prisma.designMasterConfig.findUnique({
    where: { configKey: 'GLOBAL_DESIGN_MASTER_CONFIG' }
  });
  if (!config) {
    config = await prisma.designMasterConfig.create({
      data: {
        configKey: 'GLOBAL_DESIGN_MASTER_CONFIG',
        prefixLockPolicy: DEFAULT_DESIGN_PREFIX_POLICY,
        createdById: user?.id || null,
        createdByName: actorName,
        updatedById: user?.id || null,
        updatedByName: actorName
      }
    });
  }
  return config;
};

const formatDesignItem = (it) => ({
  ...it,
  _id: it.id,
  childItems: Array.isArray(it.childItems) ? it.childItems : [],
  fileVersions: Array.isArray(it.fileVersions)
    ? it.fileVersions.map((fv) => ({ ...fv, _id: fv.id }))
    : []
});

export const getDesignMasters = async (req, res, next) => {
  try {
    const config = await ensureDefaultDesignMasters(req.user);
    const { itemType, search } = req.query;
    const where = { isActive: true };
    if (itemType) {
      const typeUpper = String(itemType).toUpperCase();
      if (typeUpper === 'FG') {
        where.itemType = { in: ['FG', 'ASSEMBLY'] };
      } else {
        where.itemType = typeUpper;
      }
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { itemCode: { contains: q, mode: 'insensitive' } },
        { itemName: { contains: q, mode: 'insensitive' } },
        { drawingNumber: { contains: q, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.designItemMaster.findMany({
      where,
      include: {
        fileVersions: { orderBy: { versionNumber: 'desc' } }
      },
      orderBy: [{ itemType: 'asc' }, { itemCode: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: items.length,
      items: items.map(formatDesignItem),
      prefixLockPolicy: {
        ...DEFAULT_DESIGN_PREFIX_POLICY,
        ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDesignTeamUsers = async (req, res, next) => {
  try {
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      include: { role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
    });

    // Filter users who have Design module access or belong to Design Engineering
    const designUsers = allUsers.filter((u) => {
      if (u.isSuperAdmin) return true;
      if (u.department === 'DESIGN_ENGINEERING') return true;

      const roleSlug = u.role?.slug || '';
      if (roleSlug === 'super-admin' || roleSlug === 'design-engineer') return true;

      const roleRoutes = Array.isArray(u.role?.allowedRoutes) ? u.role.allowedRoutes : [];
      const userRoutes = Array.isArray(u.allowedRoutes) ? u.allowedRoutes : [];
      const combined = [...roleRoutes, ...userRoutes];

      if (combined.includes('*')) return true;
      return combined.some((r) => r === '/design' || r.startsWith('/design/'));
    });

    const formatted = designUsers.map((u) => {
      const roleName = u.role?.name || (u.isSuperAdmin ? 'Super Admin' : 'Design Engineer');
      const isLead =
        u.role?.slug === 'design-engineer' ||
        u.role?.slug === 'super-admin' ||
        u.department === 'DESIGN_ENGINEERING';

      return {
        id: u.id,
        _id: u.id,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.contactPhone || '+91 98454 44962',
        department: u.department,
        departmentLabel: u.department === 'DESIGN_ENGINEERING' ? 'Design & Engineering' : u.department,
        roleName,
        roleSlug: u.role?.slug || '',
        plantLocation: u.plantLocation || 'Main Works - Unit 1 (Bengaluru)',
        isOnline: Boolean(u.isOnline),
        lastActiveAt: u.lastActiveAt || u.updatedAt,
        isSuperAdmin: Boolean(u.isSuperAdmin),
        designation: isLead ? 'Lead Design Engineer' : roleName,
        accessBadge: u.isSuperAdmin
          ? 'Super Admin (Unrestricted)'
          : isLead
          ? 'Lead Design & CAD Distribution'
          : 'Design Module Operator'
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      users: formatted
    });
  } catch (error) {
    next(error);
  }
};

export const getDesignCategories = async (req, res, next) => {
  try {
    const { search, isActive, includeInactive } = req.query;

    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true' || isActive === true;
    } else if (includeInactive !== 'true') {
      where.isActive = true;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }

    const categories = await prisma.designCategoryMaster.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      count: categories.length,
      categories: categories.map((c) => ({ ...c, _id: c.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const createDesignCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const actorName = getActorName(req.user);

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category Name is compulsory.'
      });
    }

    const cleanName = name.trim();

    // Check unique name (case-insensitive)
    const existing = await prisma.designCategoryMaster.findFirst({
      where: {
        name: { equals: cleanName, mode: 'insensitive' }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A category with the name "${cleanName}" already exists. Name must be unique.`
      });
    }

    const created = await prisma.designCategoryMaster.create({
      data: {
        name: cleanName,
        description: (description || '').trim(),
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
      entity: 'DesignCategoryMaster',
      entityId: created.id,
      details: { name: created.name }
    });

    res.status(201).json({
      success: true,
      message: `All set! Category "${created.name}" created successfully.`,
      category: { ...created, _id: created.id }
    });
  } catch (error) {
    next(error);
  }
};

export const updateDesignCategory = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Category ID is required for update.'
      });
    }

    const { name, description, isActive } = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.designCategoryMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    let cleanName = existing.name;
    if (name && name.trim()) {
      cleanName = name.trim();
      if (cleanName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await prisma.designCategoryMaster.findFirst({
          where: {
            name: { equals: cleanName, mode: 'insensitive' },
            id: { not: id }
          }
        });
        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `A category with the name "${cleanName}" already exists. Name must be unique.`
          });
        }
      }
    }

    const updated = await prisma.designCategoryMaster.update({
      where: { id },
      data: {
        name: cleanName,
        description: description !== undefined ? description.trim() : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      userId: req.user?.id,
      userName: actorName,
      action: 'UPDATE',
      entity: 'DesignCategoryMaster',
      entityId: updated.id,
      details: { name: updated.name, changes: req.body }
    });

    res.status(200).json({
      success: true,
      message: `All set! Category "${updated.name}" updated successfully.`,
      category: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDesignCategory = async (req, res, next) => {
  try {
    const id = req.params.id || req.body.id;
    const actorName = getActorName(req.user);

    const existing = await prisma.designCategoryMaster.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    const updated = await prisma.designCategoryMaster.update({
      where: { id },
      data: {
        isActive: !existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: updated.isActive
        ? `Category "${updated.name}" activated.`
        : `Category "${updated.name}" deactivated.`,
      category: { ...updated, _id: updated.id }
    });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateDesignItem = async (req, res, next) => {
  try {
    const body = req.body;
    const actorName = getActorName(req.user);

    if (!body.itemCode || !body.itemName) {
      return res.status(400).json({
        success: false,
        message: 'Item Code and Item Name are required.'
      });
    }

    const code = String(body.itemCode).toUpperCase().trim();
    const itemType = String(body.itemType || 'COMPONENT').toUpperCase();

    const saved = await prisma.designItemMaster.upsert({
      where: { itemCode: code },
      update: {
        itemName: body.itemName.trim(),
        itemType,
        category: body.category || 'Mechanical',
        subAssemblyGroup: body.subAssemblyGroup || '',
        makeOrBuy: body.makeOrBuy || (['RM', 'BO'].includes(itemType) ? 'BUY' : 'MAKE'),
        baseUom: body.baseUom || 'Nos',
        altUom: body.altUom || body.baseUom || 'Nos',
        conversionRatio: Number(body.conversionRatio) || 1,
        hsnCode: body.hsnCode || '8479',
        standardRateINR: Number(body.standardRateINR) || 0,
        drawingNumber: body.drawingNumber || '',
        specifications: body.specifications || '',
        primaryPhotoUrl: body.primaryPhotoUrl || '/branding/mh_icon.png',
        primaryPdfUrl: body.primaryPdfUrl || '',
        primaryCadUrl: body.primaryCadUrl || '',
        childItems: Array.isArray(body.childItems) ? body.childItems : undefined,
        isActive: true,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      create: {
        itemCode: code,
        itemName: body.itemName.trim(),
        itemType,
        category: body.category || 'Mechanical',
        subAssemblyGroup: body.subAssemblyGroup || '',
        makeOrBuy: body.makeOrBuy || (['RM', 'BO'].includes(itemType) ? 'BUY' : 'MAKE'),
        baseUom: body.baseUom || 'Nos',
        altUom: body.altUom || body.baseUom || 'Nos',
        conversionRatio: Number(body.conversionRatio) || 1,
        hsnCode: body.hsnCode || '8479',
        standardRateINR: Number(body.standardRateINR) || 0,
        drawingNumber: body.drawingNumber || '',
        currentVersion: 'v1',
        specifications: body.specifications || '',
        primaryPhotoUrl: body.primaryPhotoUrl || '/branding/mh_icon.png',
        primaryPdfUrl: body.primaryPdfUrl || '',
        primaryCadUrl: body.primaryCadUrl || '',
        childItems: Array.isArray(body.childItems) ? body.childItems : [],
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: {
        fileVersions: { orderBy: { versionNumber: 'desc' } }
      }
    });

    res.status(200).json({
      success: true,
      message: `All set! ${saved.itemType} Master '${saved.itemCode}' saved.`,
      item: formatDesignItem(saved)
    });
  } catch (error) {
    next(error);
  }
};

export const addDesignItemFileVersion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      fileCategory = 'PDF_2D', // PHOTO, PDF_2D, CAD_3D, SPEC_SHEET
      fileName,
      fileUrl = '',
      s3Key = '',
      mimeType = 'application/pdf',
      changeNotes = ''
    } = req.body;

    const item = await prisma.designItemMaster.findUnique({
      where: { id },
      include: { fileVersions: { orderBy: { versionNumber: 'desc' } } }
    });

    if (!item) {
      return res.status(404).json({ success: false, message: 'Design item master not found.' });
    }

    const actorName = getActorName(req.user);
    const highestVer = item.fileVersions?.[0]?.versionNumber || 0;
    const nextVerNum = highestVer + 1;
    const nextVerCode = `v${nextVerNum}`;

    await prisma.designItemFileVersion.updateMany({
      where: { designItemId: item.id, fileCategory },
      data: { isLatestVersion: false }
    });

    const newVer = await prisma.designItemFileVersion.create({
      data: {
        designItemId: item.id,
        itemCode: item.itemCode,
        versionNumber: nextVerNum,
        versionCode: nextVerCode,
        fileCategory,
        fileName: fileName || `${item.itemCode}_${nextVerCode}.pdf`,
        fileUrl,
        s3Key,
        mimeType,
        changeNotes: changeNotes || `Uploaded ${nextVerCode} (${fileCategory})`,
        isLatestVersion: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    const updatedItem = await prisma.designItemMaster.update({
      where: { id: item.id },
      data: {
        currentVersion: nextVerCode,
        ...(fileCategory === 'PHOTO' && fileUrl ? { primaryPhotoUrl: fileUrl } : {}),
        ...(fileCategory === 'PDF_2D' && fileUrl ? { primaryPdfUrl: fileUrl } : {}),
        ...(fileCategory === 'CAD_3D' && fileUrl ? { primaryCadUrl: fileUrl } : {}),
        updatedById: req.user?.id || null,
        updatedByName: actorName
      },
      include: { fileVersions: { orderBy: { versionNumber: 'desc' } } }
    });

    await logAuditEvent({
      req,
      action: 'DESIGN_FILE_VERSION_RELEASED',
      module: 'design',
      entityId: item.id,
      entityType: 'DesignItemMaster',
      notes: `New ${fileCategory} version ${nextVerCode} released for ${item.itemCode}`
    });

    res.status(201).json({
      success: true,
      message: `All set! Version ${nextVerCode} saved for ${item.itemCode}.`,
      version: { ...newVer, _id: newVer.id },
      item: formatDesignItem(updatedItem)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDesignItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.designItemMaster.delete({ where: { id } });
    res.status(200).json({ success: true, message: 'Design item master removed.' });
  } catch (error) {
    next(error);
  }
};

export const updateDesignMasterConfig = async (req, res, next) => {
  try {
    const config = await ensureDefaultDesignMasters(req.user);
    const actorName = getActorName(req.user);
    const nextPolicy = {
      ...DEFAULT_DESIGN_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {}),
      ...(req.body.prefixLockPolicy || req.body || {})
    };

    const updated = await prisma.designMasterConfig.update({
      where: { id: config.id },
      data: {
        prefixLockPolicy: nextPolicy,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'All set! Design prefixes and lock policy saved.',
      prefixLockPolicy: updated.prefixLockPolicy
    });
  } catch (error) {
    next(error);
  }
};

