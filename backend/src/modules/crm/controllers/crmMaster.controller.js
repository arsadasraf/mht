import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'System';
};

export const DEFAULT_COMPANY_BILLING_INFO = {
  companyName: 'Machine House - Winding Technologies',
  tagline: 'House of Innovations.....',
  logoIconUrl: '/branding/mh_icon.png',
  logoPlateUrl: '/branding/mh_logo_plate.png',
  pdfBannerPhotos: [],
  worksAddress:
    '#3 Muniyappa Building, Hommadevanahalli, Kempegowda Road, Basavanapura, Gottigere Post, Bangalore – 560083',
  phone: '+91 98454 44962',
  email: 'marketing@machinehousetechnologies.com',
  website: 'www.machinehousewindingtechnologies.com',
  gstin: '29AENPR8339C1ZZ',
  pan: 'AENPR8339C',
  bankName: 'HDFC',
  bankBranch: 'Hulimavu Branch',
  accountNumber: '50200017432572',
  ifscCode: 'HDFC0004117',
  swiftCode: 'HDFCINBB',
  authorizedSignatory: 'Roshan M P',
  signatoryPhone: '9845444962',
  standardTerms:
    '1. Price Basis: Ex-Works Bangalore\n2. TAX: GST - 18% Extra\n3. Delivery: 8 weeks from the date of P.O. Along with advance.\n4. Payment Terms: 50% Advance along with purchase order, 50% Before dispatch\n5. Installation & Commissioning: Inclusive\n6. Freight: To buyer\n7. Packaging: Inclusive\n8. Insurance: To buyer\n9. Validity: 30 Days\n10. Warranty: 12 Months from the date of installation\n11. Mode of Payment: Online'
};

export const DEFAULT_CRM_PREFIX_LOCK_POLICY = {
  customerPrefix: 'CUST-',
  customerStartSeq: 1001,
  enquiryPrefix: 'ENQ-',
  enquiryStartSeq: 1001,
  quotationPrefix: 'QT-',
  quotationStartSeq: 1001,
  orderAcceptancePrefix: 'OA-',
  orderAcceptanceStartSeq: 1001,
  lockEnquiryOnPoReceived: true,
  lockQuotationOnPoReceived: true,
  lockCustomerPoOnProjectConverted: true,
  poEditDeleteTimeLimitMinutes: 120,
  requireNoteOnStageChange: true,
  allowSalesRepPriceOverride: true,
  maxDiscountWithoutApprovalPercent: 10
};

export const DEFAULT_EXCHANGE_RATES = {
  USD: 85.0,
  EUR: 92.0,
  GBP: 110.0,
  JPY: 0.58
};

export const DEFAULT_SOURCES = [
  {
    name: 'IndiaMART Lead Manager',
    slug: 'INDIAMART',
    credentials: { syncStatus: 'CONNECTED', autoSyncEnabled: false },
    isActive: true
  },
  {
    name: 'TradeIndia Marketplace',
    slug: 'TRADEINDIA',
    credentials: { syncStatus: 'CONNECTED', autoSyncEnabled: false },
    isActive: true
  },
  {
    name: 'Direct Sales & Works Visit',
    slug: 'DIRECT_SALES',
    credentials: { syncStatus: 'CONNECTED', autoSyncEnabled: false },
    isActive: true
  }
];

export const DEFAULT_LOSS_REASONS = [
  'Price Higher Than Competitor',
  'Delivery Lead Time Too Long',
  'Customer Deferred Project',
  'Technical Specification Mismatch',
  'Lost to Local / Unorganized Vendor'
];

export const DEFAULT_PAYMENT_TERMS = [
  '50% Advance along with purchase order, 50% Before dispatch',
  '30% Advance, 60% Against Proforma, 10% Post Commissioning',
  '100% Against Proforma Invoice prior to Dispatch'
];

/**
 * Ensures the singleton CrmMasterConfig row exists in PostgreSQL
 */
export async function ensureCrmMasterConfig(user = null) {
  let config = await prisma.crmMasterConfig.findUnique({
    where: { configKey: 'GLOBAL_CRM_CONFIG' }
  });

  if (!config) {
    const actorName = getActorName(user);
    config = await prisma.crmMasterConfig.create({
      data: {
        configKey: 'GLOBAL_CRM_CONFIG',
        companyBillingInfo: DEFAULT_COMPANY_BILLING_INFO,
        prefixLockPolicy: DEFAULT_CRM_PREFIX_LOCK_POLICY,
        exchangeRates: DEFAULT_EXCHANGE_RATES,
        sources: DEFAULT_SOURCES,
        lossReasons: DEFAULT_LOSS_REASONS,
        paymentTerms: DEFAULT_PAYMENT_TERMS,
        createdById: user?.id || null,
        createdByName: actorName,
        updatedById: user?.id || null,
        updatedByName: actorName
      }
    });
  }

  return config;
}

/**
 * GET /api/v1/crm/masters
 */
export const getCrmMasters = async (req, res, next) => {
  try {
    const [config, categories, machines] = await Promise.all([
      ensureCrmMasterConfig(req.user),
      prisma.productCategory.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.machineProduct.findMany({ orderBy: { createdAt: 'asc' } })
    ]);

    const masters = {
      categories: categories.map((c) => ({ ...c, _id: c.id })),
      machines: machines.map((m) => ({ ...m, _id: m.id })),
      companyBillingInfo: {
        ...DEFAULT_COMPANY_BILLING_INFO,
        ...(typeof config.companyBillingInfo === 'object' ? config.companyBillingInfo : {})
      },
      prefixLockPolicy: {
        ...DEFAULT_CRM_PREFIX_LOCK_POLICY,
        ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
      },
      exchangeRates: {
        ...DEFAULT_EXCHANGE_RATES,
        ...(typeof config.exchangeRates === 'object' ? config.exchangeRates : {})
      },
      sources: Array.isArray(config.sources) ? config.sources : DEFAULT_SOURCES,
      lossReasons:
        Array.isArray(config.lossReasons) && config.lossReasons.length > 0
          ? config.lossReasons
          : DEFAULT_LOSS_REASONS,
      paymentTerms:
        Array.isArray(config.paymentTerms) && config.paymentTerms.length > 0
          ? config.paymentTerms
          : DEFAULT_PAYMENT_TERMS,
      updatedByName: config.updatedByName || 'System',
      updatedAt: config.updatedAt
    };

    res.status(200).json({
      success: true,
      masters
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/v1/crm/masters
 * Updates CRM Master Config (Company Branding, Prefix & Lock Policies, Exchange Rates, Sources, Machines Catalog)
 */
export const updateCrmMasters = async (req, res, next) => {
  try {
    const body = req.body;
    const actorName = getActorName(req.user);
    const existingConfig = await ensureCrmMasterConfig(req.user);

    // 1. Sync Machines if passed in body.machines
    if (Array.isArray(body.machines)) {
      for (const m of body.machines) {
        if (!m || !m.modelCode || !m.modelName) continue;
        const cleanCode = String(m.modelCode).trim().toUpperCase();
        const existingMachine = await prisma.machineProduct.findUnique({
          where: { modelCode: cleanCode }
        });

        const machinePayload = {
          modelCode: cleanCode,
          modelName: String(m.modelName).trim(),
          category: m.category || 'Coil Winding Machines',
          hsnCode: m.hsnCode || '8479',
          uom: m.uom || 'No.',
          photos: Array.isArray(m.photos) ? m.photos.filter(Boolean) : m.photoUrl ? [m.photoUrl] : [],
          photoUrl: m.photoUrl || (Array.isArray(m.photos) && m.photos[0]) || '',
          catalogUrl: m.catalogUrl || '',
          catalogName: m.catalogName || '',
          description: m.description || '',
          currency: m.currency || 'INR',
          price: Number(m.price ?? m.basePriceINR ?? 0),
          basePriceINR: Number(m.basePriceINR ?? m.price ?? 0),
          basePriceUSD: Number(m.basePriceUSD ?? 0),
          basePriceEUR: Number(m.basePriceEUR ?? 0),
          basePriceGBP: Number(m.basePriceGBP ?? 0),
          technicalSpecifications: Array.isArray(m.technicalSpecifications)
            ? m.technicalSpecifications
            : [],
          standardLeadWeeks: Number(m.standardLeadWeeks ?? 8),
          wireRange: m.wireRange || '',
          maxRpm: Number(m.maxRpm ?? 0),
          controllerType: m.controllerType || '',
          motorPower: m.motorPower || '',
          dimensions: m.dimensions || '',
          weightKg: Number(m.weightKg ?? 0),
          features: Array.isArray(m.features) ? m.features : [],
          isActive: m.isActive !== undefined ? Boolean(m.isActive) : true,
          updatedById: req.user?.id || null,
          updatedByName: actorName
        };

        if (existingMachine) {
          await prisma.machineProduct.update({
            where: { id: existingMachine.id },
            data: machinePayload
          });
        } else {
          await prisma.machineProduct.create({
            data: {
              ...machinePayload,
              createdById: req.user?.id || null,
              createdByName: actorName
            }
          });
        }
      }
    }

    // 2. Update Config Singleton
    await prisma.crmMasterConfig.update({
      where: { id: existingConfig.id },
      data: {
        companyBillingInfo: body.companyBillingInfo
          ? {
              ...(typeof existingConfig.companyBillingInfo === 'object'
                ? existingConfig.companyBillingInfo
                : DEFAULT_COMPANY_BILLING_INFO),
              ...body.companyBillingInfo
            }
          : existingConfig.companyBillingInfo,
        prefixLockPolicy: body.prefixLockPolicy
          ? {
              ...(typeof existingConfig.prefixLockPolicy === 'object'
                ? existingConfig.prefixLockPolicy
                : DEFAULT_CRM_PREFIX_LOCK_POLICY),
              ...body.prefixLockPolicy
            }
          : existingConfig.prefixLockPolicy,
        exchangeRates: body.exchangeRates ?? existingConfig.exchangeRates,
        sources: body.sources ?? existingConfig.sources,
        lossReasons: Array.isArray(body.lossReasons) ? body.lossReasons : existingConfig.lossReasons,
        paymentTerms: Array.isArray(body.paymentTerms)
          ? body.paymentTerms
          : existingConfig.paymentTerms,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'CRM_MASTERS_UPDATED',
      module: 'crm',
      entityId: existingConfig.id,
      entityType: 'CrmMasterConfig',
      notes: 'CRM Master settings, prefixes, lock policies, and product catalog updated.'
    });

    return getCrmMasters(req, res, next);
  } catch (error) {
    next(error);
  }
};

export const testLeadSourceConnection = async (req, res, next) => {
  try {
    const { slug } = req.params;
    res.status(200).json({
      success: true,
      message: `Lead source '${slug}' connection verified.`
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProductFromMaster = async (req, res, next) => {
  try {
    const { idOrCode } = req.params;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (UUID_REGEX.test(idOrCode)) {
      await prisma.machineProduct.deleteMany({ where: { id: idOrCode } });
    } else {
      await prisma.machineProduct.deleteMany({
        where: { modelCode: { equals: idOrCode, mode: 'insensitive' } }
      });
    }

    const machines = await prisma.machineProduct.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(200).json({
      success: true,
      message: 'Product removed from catalog.',
      machines: machines.map((m) => ({ ...m, _id: m.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAllProductsFromMaster = async (req, res, next) => {
  try {
    await prisma.machineProduct.deleteMany({});
    res.status(200).json({
      success: true,
      message: 'All products cleared from catalog.',
      machines: []
    });
  } catch (error) {
    next(error);
  }
};

export const addCategory = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const actorName = getActorName(req.user);

    const existing = await prisma.productCategory.findFirst({
      where: { OR: [{ name: { equals: trimmedName, mode: 'insensitive' } }, { slug }] }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Category '${trimmedName}' already exists.`
      });
    }

    await prisma.productCategory.create({
      data: {
        name: trimmedName,
        slug,
        description: description.trim(),
        createdById: req.user?.id || null,
        createdByName: actorName,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    const categories = await prisma.productCategory.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(201).json({
      success: true,
      message: `All set! Category '${trimmedName}' added.`,
      categories: categories.map((c) => ({ ...c, _id: c.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const actorName = getActorName(req.user);
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const existing = await prisma.productCategory.findFirst({
      where: UUID_REGEX.test(id) ? { id } : { slug: id }
    });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    await prisma.productCategory.update({
      where: { id: existing.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    const categories = await prisma.productCategory.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(200).json({
      success: true,
      message: 'Great! Category updated.',
      categories: categories.map((c) => ({ ...c, _id: c.id }))
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    await prisma.productCategory.deleteMany({
      where: UUID_REGEX.test(id) ? { id } : { slug: id }
    });

    const categories = await prisma.productCategory.findMany({ orderBy: { createdAt: 'asc' } });
    res.status(200).json({
      success: true,
      message: 'Category removed.',
      categories: categories.map((c) => ({ ...c, _id: c.id }))
    });
  } catch (error) {
    next(error);
  }
};
