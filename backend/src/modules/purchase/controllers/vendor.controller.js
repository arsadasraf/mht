import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const DEFAULT_PURCHASE_PREFIX_POLICY = {
  vendorPrefix: 'VND',
  rfqPrefix: 'RFQ',
  inwardQuotePrefix: 'VQT',
  poPrefix: 'PO',
  billPrefix: 'PB',
  lockPoAfterApproval: true,
  requireThreeQuotesAboveThreshold: false
};

export const DEFAULT_VENDORS = [
  {
    vendorCode: 'VND-0001',
    name: 'Hiwin Motion Controls India Pvt Ltd',
    category: 'MACHINED_PARTS',
    contactPerson: 'Suresh Menon',
    email: 'sales@hiwinindia.com',
    phone: '+91 80 4125 8890',
    gstin: '29AABCH1234F1Z5',
    paymentTermsDays: 30,
    rating: 4.9
  },
  {
    vendorCode: 'VND-0002',
    name: 'Apex Specialty Steels & Alloys',
    category: 'RAW_MATERIAL',
    contactPerson: 'Vikram Hegde',
    email: 'orders@apexsteels.in',
    phone: '+91 98450 22310',
    gstin: '29AAECA9982K1Z1',
    paymentTermsDays: 45,
    rating: 4.7
  },
  {
    vendorCode: 'VND-0003',
    name: 'ElectroDrive Microprocessor Systems',
    category: 'ELECTRICAL_COMPONENTS',
    contactPerson: 'Ananya Rao',
    email: 'support@electrodrive.in',
    phone: '+91 80 2678 1190',
    gstin: '29AADCE5512P1Z8',
    paymentTermsDays: 30,
    rating: 4.8
  }
];

export const DEFAULT_PRICE_AGREEMENTS = [
  {
    itemCode: 'BO-BALLSCREW-1605',
    description: 'Hiwin Precision Ground Ball Screw Rod 1605',
    itemType: 'BO',
    category: 'MACHINED_PARTS',
    vendorCode: 'VND-0001',
    vendorName: 'Hiwin Motion Controls India Pvt Ltd',
    unitPrice: 14500,
    uom: 'Nos',
    moq: 1,
    leadTimeDays: 7,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31'
  },
  {
    itemCode: 'BO-CONTROLLER-16BIT',
    description: '16-Bit Microprocessor Winding Controller Unit',
    itemType: 'BO',
    category: 'ELECTRICAL_COMPONENTS',
    vendorCode: 'VND-0003',
    vendorName: 'ElectroDrive Microprocessor Systems',
    unitPrice: 38000,
    uom: 'Nos',
    moq: 1,
    leadTimeDays: 10,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31'
  },
  {
    itemCode: 'RM-EN24-ROD-40',
    description: 'EN24 Alloy Steel Round Bar Dia 40mm',
    itemType: 'RM',
    category: 'RAW_MATERIAL',
    vendorCode: 'VND-0002',
    vendorName: 'Apex Specialty Steels & Alloys',
    unitPrice: 145,
    uom: 'Kg',
    moq: 25,
    leadTimeDays: 5,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31'
  },
  {
    itemCode: 'RM-MS-PLATE-16',
    description: 'IS 2062 Grade B MS Base Plate 16mm',
    itemType: 'RM',
    category: 'RAW_MATERIAL',
    vendorCode: 'VND-0002',
    vendorName: 'Apex Specialty Steels & Alloys',
    unitPrice: 78,
    uom: 'Kg',
    moq: 100,
    leadTimeDays: 4,
    effectiveFrom: '2026-01-01',
    effectiveTo: '2026-12-31'
  }
];

export const ensurePurchaseConfig = async (user = null) => {
  const actorName = getActorName(user);
  let config = await prisma.purchaseConfig.findUnique({
    where: { configKey: 'GLOBAL_PURCHASE_CONFIG' }
  });
  if (!config) {
    config = await prisma.purchaseConfig.create({
      data: {
        configKey: 'GLOBAL_PURCHASE_CONFIG',
        prefixLockPolicy: DEFAULT_PURCHASE_PREFIX_POLICY,
        companyProfile: {
          legalEntityName: 'Machine House Technologies',
          address: '#3 Muniyappa Building, Hommadevanahalli, Kempegowda Road, Basavanapura, Gottigere Post, Bangalore – 560083',
          gstin: '29AENPR8339C1ZZ',
          phone: '+91 98454 44962',
          email: 'marketing@machinehousetechnologies.com'
        },
        createdById: user?.id || null,
        createdByName: actorName,
        updatedById: user?.id || null,
        updatedByName: actorName
      }
    });
  }
  return config;
};

// Alias export for backward compatibility across purchase controllers
export const ensureDefaultVendorsAndPrices = ensurePurchaseConfig;

const formatVendor = (v) => ({ ...v, _id: v.id });
const formatPrice = (p) => ({ ...p, _id: p.id });

export const getVendors = async (req, res, next) => {
  try {
    const config = await ensurePurchaseConfig(req.user);
    const { category, type, priority, search, includeInactive } = req.query;
    const where = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }
    if (category) where.category = String(category);
    if (type) where.type = String(type);
    if (priority) where.priority = String(priority);
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { vendorCode: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { contactPerson: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { gstin: { contains: q, mode: 'insensitive' } },
        { natureOfWork: { contains: q, mode: 'insensitive' } },
        { type: { contains: q, mode: 'insensitive' } }
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    const priceAgreements = await prisma.vendorPriceAgreement.findMany({
      where: { isActive: true },
      orderBy: [{ itemCode: 'asc' }, { unitPrice: 'asc' }]
    });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors: vendors.map(formatVendor),
      priceAgreements: priceAgreements.map(formatPrice),
      prefixLockPolicy: {
        ...DEFAULT_PURCHASE_PREFIX_POLICY,
        ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
      },
      companyProfile: config.companyProfile
    });
  } catch (error) {
    next(error);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const config = await ensurePurchaseConfig(req.user);
    const policy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
    };

    const {
      name,
      type = 'MANUFACTURER',
      natureOfWork = '',
      priority = 'P1 - High',
      address = '',
      email = '',
      phone = '',
      contactPerson = '',
      gstin = '',
      paymentTerm = '30 Days Net',
      category = 'ELECTRICAL_COMPONENTS',
      paymentTermsDays = 30,
      rating = 4.5
    } = req.body;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Vendor Name is required.' });
    }

    const count = await prisma.vendor.count();
    const vendorCode = req.body.vendorCode || `${policy.vendorPrefix || 'VND'}-${String(count + 1).padStart(4, '0')}`;
    const actorName = getActorName(req.user);

    const vendor = await prisma.vendor.create({
      data: {
        vendorCode: String(vendorCode).toUpperCase().trim(),
        name: trimmedName,
        type: String(type || 'MANUFACTURER').trim(),
        natureOfWork: String(natureOfWork || '').trim(),
        priority: String(priority || 'P1 - High').trim(),
        address: String(address || '').trim(),
        email: String(email || '').trim(),
        phone: String(phone || '').trim(),
        contactPerson: String(contactPerson || '').trim(),
        gstin: String(gstin || '').trim().toUpperCase(),
        paymentTerm: String(paymentTerm || '30 Days Net').trim(),
        category,
        paymentTermsDays: Number(paymentTermsDays) || 30,
        rating: Number(rating) || 4.5,
        isActive: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'VENDOR_CREATED',
      module: 'purchase',
      entityId: vendor.id,
      entityType: 'Vendor',
      notes: `Vendor ${vendor.vendorCode} (${vendor.name}) created.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Vendor ${vendor.name} saved successfully.`,
      vendor: formatVendor(vendor)
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vendor record not found.' });
    }

    const actorName = getActorName(req.user);
    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        name: req.body.name !== undefined ? String(req.body.name).trim() : existing.name,
        type: req.body.type !== undefined ? String(req.body.type).trim() : existing.type,
        natureOfWork: req.body.natureOfWork !== undefined ? String(req.body.natureOfWork).trim() : existing.natureOfWork,
        priority: req.body.priority !== undefined ? String(req.body.priority).trim() : existing.priority,
        address: req.body.address !== undefined ? String(req.body.address).trim() : existing.address,
        email: req.body.email !== undefined ? String(req.body.email).trim() : existing.email,
        phone: req.body.phone !== undefined ? String(req.body.phone).trim() : existing.phone,
        contactPerson: req.body.contactPerson !== undefined ? String(req.body.contactPerson).trim() : existing.contactPerson,
        gstin: req.body.gstin !== undefined ? String(req.body.gstin).trim().toUpperCase() : existing.gstin,
        paymentTerm: req.body.paymentTerm !== undefined ? String(req.body.paymentTerm).trim() : existing.paymentTerm,
        category: req.body.category !== undefined ? req.body.category : existing.category,
        paymentTermsDays: req.body.paymentTermsDays !== undefined ? Number(req.body.paymentTermsDays) : existing.paymentTermsDays,
        rating: req.body.rating !== undefined ? Number(req.body.rating) : existing.rating,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'VENDOR_UPDATED',
      module: 'purchase',
      entityId: updated.id,
      entityType: 'Vendor',
      notes: `Vendor ${updated.vendorCode} (${updated.name}) updated.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Vendor ${updated.name} updated successfully.`,
      vendor: formatVendor(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.vendor.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Vendor record not found.' });
    }

    const actorName = getActorName(req.user);
    // Toggle active state to preserve historical integrity
    const nextStatus = !existing.isActive;
    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        isActive: nextStatus,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: nextStatus ? 'VENDOR_ACTIVATED' : 'VENDOR_DEACTIVATED',
      module: 'purchase',
      entityId: updated.id,
      entityType: 'Vendor',
      notes: `Vendor ${updated.vendorCode} (${updated.name}) ${nextStatus ? 'activated' : 'deactivated'}.`
    });

    res.status(200).json({
      success: true,
      message: `Vendor ${updated.name} ${nextStatus ? 'activated' : 'deactivated'}.`,
      vendor: formatVendor(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const getPriceAgreements = async (req, res, next) => {
  try {
    const { itemType, search, vendorCode, isPreferred } = req.query;
    const where = { isActive: true };

    if (itemType) {
      const typeStr = String(itemType).toUpperCase();
      if (typeStr === 'RM_BO' || typeStr === 'RM-BO' || typeStr === 'RM' || typeStr === 'BO') {
        where.itemType = { in: ['RM_BO', 'RM', 'BO'] };
      } else if (typeStr === 'FG' || typeStr === 'COMPONENT' || typeStr === 'SUB_ASSEMBLY' || typeStr === 'ASSEMBLY') {
        where.itemType = { in: ['FG', 'COMPONENT', 'SUB_ASSEMBLY', 'ASSEMBLY'] };
      } else {
        where.itemType = typeStr;
      }
    }

    if (vendorCode) {
      where.vendorCode = String(vendorCode);
    }

    if (isPreferred !== undefined) {
      where.isPreferred = isPreferred === 'true';
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { itemCode: { contains: q, mode: 'insensitive' } },
        { itemName: { contains: q, mode: 'insensitive' } },
        { vendorName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }

    const agreements = await prisma.vendorPriceAgreement.findMany({
      where,
      orderBy: [{ isPreferred: 'desc' }, { updatedAt: 'desc' }]
    });

    res.status(200).json({
      success: true,
      count: agreements.length,
      priceAgreements: agreements.map(formatPrice)
    });
  } catch (error) {
    next(error);
  }
};

export const createVendorPriceAgreement = async (req, res, next) => {
  try {
    const body = req.body;
    const actorName = getActorName(req.user);

    if (!body.itemCode && !body.itemName) {
      return res.status(400).json({
        success: false,
        message: 'Item identifier is required.'
      });
    }

    const itemCode = String(body.itemCode || body.itemName).trim();
    const itemName = String(body.itemName || body.itemCode || itemCode).trim();
    const itemType = String(body.itemType || 'RM_BO').toUpperCase();
    const isPreferred = body.isPreferred !== undefined ? Boolean(body.isPreferred) : true;
    const unitPrice = Number(body.unitPrice) || 0;
    const taxRatePercent = Number(body.taxRatePercent) || 18;
    const conversionRatio = body.conversionRatio !== undefined && body.conversionRatio !== null ? Number(body.conversionRatio) : 1;
    const equivalentRate = body.equivalentRate !== undefined && body.equivalentRate !== null ? Number(body.equivalentRate) : (conversionRatio && conversionRatio > 0 ? unitPrice / conversionRatio : unitPrice);

    // If preferred is selected, unset other agreements for this item
    if (isPreferred) {
      await prisma.vendorPriceAgreement.updateMany({
        where: { itemCode, isActive: true },
        data: { isPreferred: false }
      });

      // Sync standardRateINR in RmItemMaster if it exists
      try {
        await prisma.rmItemMaster.updateMany({
          where: { name: itemCode },
          data: { standardRateINR: unitPrice, updatedAt: new Date() }
        });
      } catch (err) {
        // Silently proceed if not in RM master
      }
    }

    const item = await prisma.vendorPriceAgreement.create({
      data: {
        itemCode,
        itemName,
        description: String(body.description || itemName).trim(),
        itemType,
        category: String(body.category || '').trim(),
        vendorCode: String(body.vendorCode || '').trim(),
        vendorName: String(body.vendorName || '').trim(),
        unitPrice,
        taxRatePercent,
        currency: String(body.currency || 'INR').trim(),
        uom: String(body.uom || 'Nos').trim(),
        secondaryUom: body.secondaryUom ? String(body.secondaryUom).trim() : null,
        conversionRatio,
        equivalentRate,
        moq: Number(body.moq) || 1,
        leadTimeDays: Number(body.leadTimeDays) || 7,
        effectiveFrom: String(body.effectiveFrom || '').trim(),
        effectiveTo: String(body.effectiveTo || '').trim(),
        isPreferred,
        remarks: String(body.remarks || '').trim(),
        isActive: true,
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PRICE_AGREEMENT_CREATED',
      module: 'purchase',
      entityId: item.id,
      entityType: 'VendorPriceAgreement',
      notes: `Price agreement for ${item.itemCode} at ₹${item.unitPrice} created.`
    });

    res.status(201).json({
      success: true,
      message: `All set! Price for ${item.itemName || item.itemCode} saved successfully.`,
      priceAgreement: formatPrice(item)
    });
  } catch (error) {
    next(error);
  }
};

export const updateVendorPriceAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const actorName = getActorName(req.user);

    const existing = await prisma.vendorPriceAgreement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Price agreement record not found.' });
    }

    const isPreferred = body.isPreferred !== undefined ? Boolean(body.isPreferred) : existing.isPreferred;
    const unitPrice = body.unitPrice !== undefined ? Number(body.unitPrice) : existing.unitPrice;
    const conversionRatio = body.conversionRatio !== undefined ? Number(body.conversionRatio) : existing.conversionRatio;
    const equivalentRate = body.equivalentRate !== undefined ? Number(body.equivalentRate) : (conversionRatio && conversionRatio > 0 ? unitPrice / conversionRatio : existing.equivalentRate);

    // If preferred is selected, unset other agreements for this item
    if (isPreferred && !existing.isPreferred) {
      await prisma.vendorPriceAgreement.updateMany({
        where: { itemCode: existing.itemCode, id: { not: id }, isActive: true },
        data: { isPreferred: false }
      });
    }

    if (isPreferred) {
      try {
        await prisma.rmItemMaster.updateMany({
          where: { name: existing.itemCode },
          data: { standardRateINR: unitPrice, updatedAt: new Date() }
        });
      } catch (err) {
        // Silently proceed
      }
    }

    const updated = await prisma.vendorPriceAgreement.update({
      where: { id },
      data: {
        itemName: body.itemName !== undefined ? String(body.itemName).trim() : existing.itemName,
        description: body.description !== undefined ? String(body.description).trim() : existing.description,
        itemType: body.itemType !== undefined ? String(body.itemType).toUpperCase() : existing.itemType,
        category: body.category !== undefined ? String(body.category).trim() : existing.category,
        vendorCode: body.vendorCode !== undefined ? String(body.vendorCode).trim() : existing.vendorCode,
        vendorName: body.vendorName !== undefined ? String(body.vendorName).trim() : existing.vendorName,
        unitPrice,
        taxRatePercent: body.taxRatePercent !== undefined ? Number(body.taxRatePercent) : existing.taxRatePercent,
        currency: body.currency !== undefined ? String(body.currency).trim() : existing.currency,
        uom: body.uom !== undefined ? String(body.uom).trim() : existing.uom,
        secondaryUom: body.secondaryUom !== undefined ? (body.secondaryUom ? String(body.secondaryUom).trim() : null) : existing.secondaryUom,
        conversionRatio,
        equivalentRate,
        moq: body.moq !== undefined ? Number(body.moq) : existing.moq,
        leadTimeDays: body.leadTimeDays !== undefined ? Number(body.leadTimeDays) : existing.leadTimeDays,
        effectiveFrom: body.effectiveFrom !== undefined ? String(body.effectiveFrom).trim() : existing.effectiveFrom,
        effectiveTo: body.effectiveTo !== undefined ? String(body.effectiveTo).trim() : existing.effectiveTo,
        isPreferred,
        remarks: body.remarks !== undefined ? String(body.remarks).trim() : existing.remarks,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PRICE_AGREEMENT_UPDATED',
      module: 'purchase',
      entityId: updated.id,
      entityType: 'VendorPriceAgreement',
      notes: `Price agreement for ${updated.itemCode} updated to ₹${updated.unitPrice}.`
    });

    res.status(200).json({
      success: true,
      message: `All set! Price for ${updated.itemName || updated.itemCode} updated successfully.`,
      priceAgreement: formatPrice(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const deleteVendorPriceAgreement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await prisma.vendorPriceAgreement.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Price agreement record not found.' });
    }

    const actorName = getActorName(req.user);
    const updated = await prisma.vendorPriceAgreement.update({
      where: { id },
      data: {
        isActive: false,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'PRICE_AGREEMENT_DELETED',
      module: 'purchase',
      entityId: updated.id,
      entityType: 'VendorPriceAgreement',
      notes: `Price agreement for ${updated.itemCode} deleted.`
    });

    res.status(200).json({
      success: true,
      message: `Price agreement removed successfully.`,
      priceAgreement: formatPrice(updated)
    });
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseConfig = async (req, res, next) => {
  try {
    const config = await ensurePurchaseConfig(req.user);
    const actorName = getActorName(req.user);

    const nextPolicy = {
      ...DEFAULT_PURCHASE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {}),
      ...(req.body.prefixLockPolicy || {})
    };
    const nextCompany = {
      ...(typeof config.companyProfile === 'object' ? config.companyProfile : {}),
      ...(req.body.companyProfile || {})
    };

    const updated = await prisma.purchaseConfig.update({
      where: { id: config.id },
      data: {
        prefixLockPolicy: nextPolicy,
        companyProfile: nextCompany,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    res.status(200).json({
      success: true,
      message: 'All set! Purchase settings and prefix policy saved.',
      prefixLockPolicy: updated.prefixLockPolicy,
      companyProfile: updated.companyProfile
    });
  } catch (error) {
    next(error);
  }
};
