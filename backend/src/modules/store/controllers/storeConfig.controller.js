import { prisma } from '../../../config/db.config.js';
import { logAuditEvent } from '../../../services/audit.service.js';

const getActorName = (user) => {
  if (!user) return 'System';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email || 'System';
};

export const DEFAULT_STORE_COMPANY_PROFILE = {
  legalEntityName: 'Machine House - Winding Technologies Pvt Ltd',
  tagline: 'House of Innovations.....',
  cin: 'U29253PN2015PTC155421',
  pan: 'AACCM8892K',
  gstin: '27AACCM8892K1Z8',
  registeredOffice: 'Plot No. 44, Electronic Zone, MIDC Bhosari, Pune - 411026, Maharashtra, India',
  unit1Plant: 'Plot No. 12/B, Industrial Sector 7, Chakan Industrial Area, Pune - 410501, Maharashtra, India',
  billingEmail: 'accounts@machinehouse.in',
  storesEmail: 'stores@machinehouse.in',
  purchaseEmail: 'purchase@machinehouse.in',
  phone: '+91 20 2712 4490',
  bankName: 'HDFC Bank Ltd',
  bankBranch: 'Bhosari Industrial Branch, Pune',
  accountNumber: '50200028479218',
  ifscCode: 'HDFC0001824',
  authorizedSignatory: 'Arshad Asraf',
  signatoryDesignation: 'Managing Director & Plant Head',
  logoUrl: '/branding/mh_logo_plate.png',
  iconUrl: '/branding/mh_icon.png',
  standardDcTerms: [
    '1. Goods dispatched under this Delivery Challan (DC) remain the property of Machine House - Winding Technologies until received and acknowledged.',
    '2. Any discrepancy or damage in transit must be reported in writing within 24 hours of delivery.',
    '3. For job work / vendor processing, processed materials must be returned along with scrap generated as per standard BOM ratio.',
    '4. Store inwards are subject to physical verification, heat number/serial traceability, and IQC acceptance before final GRN sign-off.',
    '5. Gate pass and vehicle acknowledgment copy must be signed and stamped by the receiving party upon unloading.'
  ]
};

export const DEFAULT_STORE_PREFIX_POLICY = {
  grnPrefix: 'GRN',
  dcPrefix: 'DC',
  mrPrefix: 'MR',
  binPrefix: 'BIN'
};

export const DEFAULT_STORE_TIME_POLICY = {
  allowGrnEdit: true,
  allowGrnDelete: true,
  grnEditWindowHours: 48,
  grnDeleteWindowHours: 24,
  allowAdminOverride: true,
  preventNegativeStockOnReversal: true
};

export const ensureStoreConfig = async (user = null) => {
  const actorName = getActorName(user);
  let config = await prisma.storeConfig.findUnique({
    where: { configKey: 'GLOBAL_STORE_CONFIG' }
  });
  if (!config) {
    config = await prisma.storeConfig.create({
      data: {
        configKey: 'GLOBAL_STORE_CONFIG',
        prefixLockPolicy: DEFAULT_STORE_PREFIX_POLICY,
        companyProfile: DEFAULT_STORE_COMPANY_PROFILE,
        timePolicy: DEFAULT_STORE_TIME_POLICY,
        createdById: user?.id || null,
        createdByName: actorName,
        updatedById: user?.id || null,
        updatedByName: actorName
      }
    });
  }
  return config;
};

export const getStoreConfig = async (req, res, next) => {
  try {
    const config = await ensureStoreConfig(req.user);
    res.status(200).json({
      success: true,
      prefixLockPolicy: {
        ...DEFAULT_STORE_PREFIX_POLICY,
        ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {})
      },
      companyProfile: {
        ...DEFAULT_STORE_COMPANY_PROFILE,
        ...(typeof config.companyProfile === 'object' ? config.companyProfile : {})
      },
      timePolicy: {
        ...DEFAULT_STORE_TIME_POLICY,
        ...(typeof config.timePolicy === 'object' ? config.timePolicy : {})
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateStoreConfig = async (req, res, next) => {
  try {
    const config = await ensureStoreConfig(req.user);
    const actorName = getActorName(req.user);

    const nextPolicy = {
      ...DEFAULT_STORE_PREFIX_POLICY,
      ...(typeof config.prefixLockPolicy === 'object' ? config.prefixLockPolicy : {}),
      ...(req.body.prefixLockPolicy || {})
    };
    const nextCompany = {
      ...DEFAULT_STORE_COMPANY_PROFILE,
      ...(typeof config.companyProfile === 'object' ? config.companyProfile : {}),
      ...(req.body.companyProfile || {})
    };
    const nextTime = {
      ...DEFAULT_STORE_TIME_POLICY,
      ...(typeof config.timePolicy === 'object' ? config.timePolicy : {}),
      ...(req.body.timePolicy || {})
    };

    const updated = await prisma.storeConfig.update({
      where: { id: config.id },
      data: {
        prefixLockPolicy: nextPolicy,
        companyProfile: nextCompany,
        timePolicy: nextTime,
        updatedById: req.user?.id || null,
        updatedByName: actorName
      }
    });

    await logAuditEvent({
      req,
      action: 'STORE_CONFIG_UPDATED',
      module: 'store',
      entityId: updated.id,
      entityType: 'StoreConfig',
      notes: 'Store company profile, time policy, and prefix settings updated'
    });

    res.status(200).json({
      success: true,
      message: 'All set! Store settings and time policy saved.',
      prefixLockPolicy: updated.prefixLockPolicy,
      companyProfile: updated.companyProfile,
      timePolicy: updated.timePolicy
    });
  } catch (error) {
    next(error);
  }
};

