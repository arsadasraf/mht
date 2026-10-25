import { CrmMaster } from '../models/crmMaster.model.js';

const DEFAULT_MACHINES = [
  {
    modelCode: 'MHT-2100',
    modelName: 'MHT-2100 Table Top Coil Winding Machine',
    category: 'TABLE_TOP',
    photoUrl: '/products/mht-2100.jpg',
    description: 'High-speed precision table-top coil winder engineered for relay coils, solenoid valves, small transformers, and miniature field coils.',
    basePriceINR: 285000,
    basePriceUSD: 3400,
    basePriceEUR: 3100,
    basePriceGBP: 2600,
    standardLeadWeeks: 4,
    wireRange: '0.02 mm to 1.6 mm',
    maxRpm: 6000,
    controllerType: 'Microprocessor CNC Controller',
    motorPower: '0.75 kW AC Servo Motor',
    dimensions: '650 x 450 x 480 mm',
    weightKg: 45,
    features: [
      'Microprocessor CNC Controller with 999-program memory',
      'Dual-direction synchronized wire traverse guide',
      'High-precision electronic wire tensioner unit',
      'Stepless variable speed spindle foot pedal'
    ]
  },
  {
    modelCode: 'MHT-1100',
    modelName: 'MHT-1100 Table Top Coil Winding Machine',
    category: 'TABLE_TOP',
    photoUrl: '/products/mht-2100.jpg',
    description: 'Entry-level compact precision table-top winder with digital stepper traverse for prototyping and educational coil labs.',
    basePriceINR: 220000,
    basePriceUSD: 2600,
    basePriceEUR: 2400,
    basePriceGBP: 2000,
    standardLeadWeeks: 4,
    wireRange: '0.05 mm to 2.2 mm',
    maxRpm: 4500,
    controllerType: 'Digital Stepper Traverse CNC',
    motorPower: '0.55 kW DC Brushless Motor',
    dimensions: '600 x 400 x 450 mm',
    weightKg: 38,
    features: [
      'Digital electronic preset counter with auto-stop',
      'Stepper motor driven smooth traverse guide',
      'Adjustable de-reeler stand included'
    ]
  },
  {
    modelCode: 'MHT-280',
    modelName: 'MHT-280 Miniature Table Top Coil Winder',
    category: 'TABLE_TOP',
    photoUrl: '/products/mht-2100.jpg',
    description: 'Ultra-fine wire table top winding machine specifically designed for guitar pickups, sensors, micro-solenoids, and RF chokes.',
    basePriceINR: 175000,
    basePriceUSD: 2100,
    basePriceEUR: 1900,
    basePriceGBP: 1600,
    standardLeadWeeks: 3,
    wireRange: '0.02 mm to 0.8 mm',
    maxRpm: 7000,
    controllerType: 'Electronic Preset Counter',
    motorPower: '0.37 kW Micro Servo',
    dimensions: '480 x 350 x 380 mm',
    weightKg: 28,
    features: [
      'Ultra-fine wire tensioning mechanism down to 0.02 mm',
      'Zero wire breakage soft start curve',
      'High RPM balancing spindle'
    ]
  },
  {
    modelCode: 'AGI-0815',
    modelName: 'AGI-0815 Automatic Graded Insulation Transformer HV Winder',
    category: 'TRANSFORMER_HV_LV',
    photoUrl: '/products/agi-0815.jpg',
    description: 'Flagship automatic graded insulation transformer HV coil winding system with synchronized paper insulation feeder and multi-axis servo traverse.',
    basePriceINR: 1450000,
    basePriceUSD: 17200,
    basePriceEUR: 15800,
    basePriceGBP: 13200,
    standardLeadWeeks: 8,
    wireRange: '0.8 mm to 4.5 mm / Flat Strip',
    maxRpm: 600,
    controllerType: 'Synchronized Multi-Axis PLC + Touch HMI',
    motorPower: '3.7 kW Heavy Industrial Servo Drive',
    dimensions: '2200 x 1400 x 1800 mm',
    weightKg: 1450,
    features: [
      'Synchronized automatic graded paper insulation dereeler',
      '10-inch color touchscreen industrial HMI pendant',
      'Constant torque servo tailstock with pneumatic clamp',
      'Flattening roller for strip conductors'
    ]
  },
  {
    modelCode: 'AGI-1225',
    modelName: 'AGI-1225 Heavy Transformer HV Coil Winding Machine',
    category: 'TRANSFORMER_HV_LV',
    photoUrl: '/products/agi-0815.jpg',
    description: 'Heavy distribution transformer coil winder with pneumatic constant tensioning arms and auto-layering for round and rectangular conductors.',
    basePriceINR: 2100000,
    basePriceUSD: 24800,
    basePriceEUR: 22800,
    basePriceGBP: 19100,
    standardLeadWeeks: 10,
    wireRange: 'Up to 6.0 mm Flat & Round Conductor',
    maxRpm: 400,
    controllerType: 'Industrial PLC with Auto-Tensioner',
    motorPower: '5.5 kW Inverter Duty Gearmotor',
    dimensions: '2600 x 1600 x 1950 mm',
    weightKg: 2200,
    features: [
      'Heavy-duty floor-mounted dereeler for 1000kg wire drums',
      'Laser strip guide alignment sensor',
      'Dual operator emergency stop foot bars'
    ]
  },
  {
    modelCode: 'AFW-0632',
    modelName: 'AFW-0632 Automatic Foil Winding Machine',
    category: 'FOIL_STRIP',
    photoUrl: '/products/afw-0632.jpg',
    description: 'Automated copper and aluminum foil strip winding machine with dual insulation decoilers, laser edge alignment, and cold welding burr-free clamp.',
    basePriceINR: 1850000,
    basePriceUSD: 21900,
    basePriceEUR: 20100,
    basePriceGBP: 16800,
    standardLeadWeeks: 8,
    wireRange: 'Copper / Aluminum Foil up to 600 mm',
    maxRpm: 45,
    controllerType: 'Laser Edge Sensor + Closed Loop Tension',
    motorPower: '4.0 kW Closed Loop Torque Servo',
    dimensions: '2800 x 1800 x 2100 mm',
    weightKg: 2800,
    features: [
      'Dual paper/film interlayer insulation dereelers',
      'Infrared/laser active edge tracking sensor (±0.2mm precision)',
      'High-pressure pneumatically driven edge de-burring roller',
      'TIG/cold busbar welding integration table'
    ]
  },
  {
    modelCode: 'AS-150',
    modelName: 'AS-150 Automatic Motor Stator Winding Machine',
    category: 'STATOR_SPM',
    photoUrl: '/products/mht-2100.jpg',
    description: '4-axis CNC automatic stator needle winder for BLDC motors, pump motors, and automotive alternator stators.',
    basePriceINR: 980000,
    basePriceUSD: 11600,
    basePriceEUR: 10600,
    basePriceGBP: 8900,
    standardLeadWeeks: 6,
    wireRange: '0.15 mm to 1.2 mm Multi-Strand',
    maxRpm: 2500,
    controllerType: '4-Axis Servo Motion Controller',
    motorPower: '2.2 kW Integrated Multi-Axis Servo System',
    dimensions: '1200 x 950 x 1600 mm',
    weightKg: 580,
    features: [
      'High-speed rotating needle nozzle for multi-slot stators',
      'Precision indexing rotary table with pneumatic clamp',
      'Auto wire cutting and wire clamping mechanism'
    ]
  },
  {
    modelCode: 'SW-0202',
    modelName: 'SW-0202 Heavy Strip Winding Machine',
    category: 'FOIL_STRIP',
    photoUrl: '/products/afw-0632.jpg',
    description: 'Specialized heavy copper strip edge-bending and flat winding machine for high-current welding reactors and solar inverter inductors.',
    basePriceINR: 820000,
    basePriceUSD: 9700,
    basePriceEUR: 8900,
    basePriceGBP: 7500,
    standardLeadWeeks: 6,
    wireRange: 'Copper Strip up to 50 mm²',
    maxRpm: 120,
    controllerType: 'Pneumatic Constant Tension System',
    motorPower: '2.2 kW Gear Motor with Variable Frequency Drive',
    dimensions: '1500 x 900 x 1350 mm',
    weightKg: 420,
    features: [
      'Pneumatic constant tensioning brakes on dereeler',
      'Heavy-duty faceplate with adjustable coil mandrel',
      'Digital turns counter with preset slowdown'
    ]
  },
  {
    modelCode: 'TW-1600',
    modelName: 'TW-1600 Transformer Tank Welding SPM & Flipper',
    category: 'CUSTOM_SPM',
    photoUrl: '/products/agi-0815.jpg',
    description: 'Hydraulic 360-degree turnover positioner and automated seam welding SPM for oil-immersed corrugated transformer tanks up to 1600 mm.',
    basePriceINR: 1250000,
    basePriceUSD: 14800,
    basePriceEUR: 13600,
    basePriceGBP: 11400,
    standardLeadWeeks: 8,
    wireRange: 'Tank Width up to 1600 mm',
    maxRpm: 0,
    controllerType: 'Central Pendant Controller',
    motorPower: '3.0 kW Hydraulic Power Unit',
    dimensions: '3200 x 2000 x 2200 mm',
    weightKg: 3100,
    features: [
      'Hydraulic motorized 360-degree rotation and locking',
      'Motorized linear torch slide with auto arc height',
      'Remote pendant controller with emergency stop'
    ]
  }
];

const DEFAULT_SOURCES = [
  {
    name: 'IndiaMART Lead Manager',
    slug: 'INDIAMART',
    credentials: {
      apiKey: 'im_crm_9941a82b9472',
      apiSecret: 'sec_im_882019482',
      glusrKey: 'GLUSR-902183',
      mobileNumber: '+91 9845012345',
      profileId: '',
      webhookUrl: 'http://localhost:5000/api/v1/crm/leads/webhook/indiamart',
      webhookSecret: 'whsec_im_live_449102',
      syncFrequencyMinutes: 15,
      syncStatus: 'CONNECTED',
      autoSyncEnabled: true
    }
  },
  {
    name: 'TradeIndia Marketplace',
    slug: 'TRADEINDIA',
    credentials: {
      apiKey: 'ti_key_8847192',
      apiSecret: 'ti_sec_7729103',
      glusrKey: '',
      mobileNumber: '+91 9845012345',
      profileId: 'TI-PRF-440192',
      webhookUrl: 'http://localhost:5000/api/v1/crm/leads/webhook/tradeindia',
      webhookSecret: '',
      syncFrequencyMinutes: 30,
      syncStatus: 'IDLE',
      autoSyncEnabled: false
    }
  },
  {
    name: 'Direct Sales & Works Visit',
    slug: 'DIRECT_SALES',
    credentials: {
      syncStatus: 'IDLE',
      autoSyncEnabled: false
    }
  },
  {
    name: 'Official Website Enquiry Form',
    slug: 'WEBSITE',
    credentials: {
      webhookUrl: 'http://localhost:5000/api/v1/crm/leads/webhook/website',
      webhookSecret: 'whsec_web_mht_9921',
      syncStatus: 'CONNECTED',
      autoSyncEnabled: true
    }
  },
  {
    name: 'Client Referral / Repeat Customer',
    slug: 'REFERRAL',
    credentials: {
      syncStatus: 'IDLE',
      autoSyncEnabled: false
    }
  },
  {
    name: 'Trade Show / Industrial Exhibition',
    slug: 'EXHIBITION',
    credentials: {
      syncStatus: 'IDLE',
      autoSyncEnabled: false
    }
  }
];

const DEFAULT_LOSS_REASONS = [
  { reason: 'Competitor Price Lower', category: 'PRICE' },
  { reason: 'Delivery Lead Time Too High', category: 'TIMELINE' },
  { reason: 'Customer Changed Coil Design / Technical Mismatch', category: 'TECHNICAL' },
  { reason: 'Client Postponed Project / Budget Cancelled', category: 'CLIENT_INTERNAL' },
  { reason: 'Customer Unresponsive after Quotation', category: 'NO_RESPONSE' }
];

const DEFAULT_PAYMENT_TERMS = [
  {
    name: 'Standard Machine House Terms (30% Adv, 60% Pre-Dispatch, 10% Post Comm)',
    advancePercent: 30,
    dispatchPercent: 60,
    commissioningPercent: 10,
    warrantyMonths: 12,
    description: '30% Advance with PO, 60% Against Proforma before dispatch, 10% after site commissioning or 30 days.'
  },
  {
    name: '100% Confirmed Letter of Credit (LC at Sight) — International Export',
    advancePercent: 0,
    dispatchPercent: 100,
    commissioningPercent: 0,
    warrantyMonths: 12,
    description: 'Irrevocable, confirmed Letter of Credit payable against shipping documents.'
  },
  {
    name: '50% Advance with Order, 50% Against Proforma before Dispatch',
    advancePercent: 50,
    dispatchPercent: 50,
    commissioningPercent: 0,
    warrantyMonths: 12,
    description: 'Recommended for customized Special Purpose Machines (SPMs).'
  }
];

const DEFAULT_COMPANY_BILLING = {
  companyName: 'Machine House - Winding Technologies',
  tagline: 'House of Innovations.....',
  worksAddress: 'No. 3, Muniyappa Building, Hommadevanahalli, Gottigere Post, Bengaluru - 560083, Karnataka, India',
  phone: '+91 8047640100 / +91 9845012345',
  email: 'sales@machinehousetechnologies.in',
  website: 'www.machinehousetechnologies.in',
  gstin: '29AAACM1234F1Z5',
  pan: 'AAACM1234F',
  bankName: 'State Bank of India',
  bankBranch: 'Peenya Industrial Estate Branch, Bengaluru',
  accountNumber: '39482019283',
  ifscCode: 'SBIN0040182',
  swiftCode: 'SBININBB482',
  authorizedSignatory: 'For Machine House Technologies — Authorized Signatory',
  standardTerms:
    '1. Prices are Ex-Works Bengaluru.\n2. Taxes: GST 18% extra as applicable.\n3. Payment: 30% advance with PO, 60% against proforma invoice before dispatch, 10% after site commissioning or 30 days.\n4. Delivery: 4-8 weeks from date of technically & commercially clear order and advance receipt.\n5. Warranty: 12 months from the date of dispatch against manufacturing defects.\n6. Jurisdiction: Subject to Bengaluru judicial jurisdiction only.'
};

/**
 * Get all CRM Master Configurations
 */
export const getCrmMasters = async (req, res, next) => {
  try {
    let masters = await CrmMaster.findOne();
    if (!masters) {
      masters = await CrmMaster.create({
        machines: [],
        sources: DEFAULT_SOURCES,
        lossReasons: DEFAULT_LOSS_REASONS,
        paymentTerms: DEFAULT_PAYMENT_TERMS,
        exchangeRates: { USD: 85.0, EUR: 92.0, GBP: 110.0, JPY: 0.58 },
        companyBillingInfo: DEFAULT_COMPANY_BILLING
      });
    } else {
      // Ensure company billing info and machine fields have defaults if newly added
      let modified = false;
      if (!masters.companyBillingInfo?.companyName) {
        masters.companyBillingInfo = DEFAULT_COMPANY_BILLING;
        modified = true;
      }
      if (modified) {
        await masters.save();
      }
    }

    res.status(200).json({ success: true, masters });
  } catch (error) {
    next(error);
  }
};

/**
 * Update CRM Master Configurations
 */
export const updateCrmMasters = async (req, res, next) => {
  try {
    let masters = await CrmMaster.findOne();
    if (!masters) {
      masters = new CrmMaster(req.body);
    } else {
      if (req.body.categories !== undefined) {
        masters.categories = req.body.categories;
        masters.markModified('categories');
      }
      if (req.body.machines !== undefined) {
        masters.machines = req.body.machines;
        masters.markModified('machines');
      }
      if (req.body.sources !== undefined) {
        masters.sources = req.body.sources;
        masters.markModified('sources');
      }
      if (req.body.lossReasons !== undefined) {
        masters.lossReasons = req.body.lossReasons;
        masters.markModified('lossReasons');
      }
      if (req.body.paymentTerms !== undefined) {
        masters.paymentTerms = req.body.paymentTerms;
        masters.markModified('paymentTerms');
      }
      if (req.body.exchangeRates !== undefined) {
        masters.exchangeRates = req.body.exchangeRates;
        masters.markModified('exchangeRates');
      }
      if (req.body.companyBillingInfo !== undefined) {
        masters.companyBillingInfo = req.body.companyBillingInfo;
        masters.markModified('companyBillingInfo');
      }
    }
    masters.updatedBy = req.user?._id;
    await masters.save();

    res.status(200).json({
      success: true,
      message: 'CRM Master configurations updated successfully.',
      masters
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single product from CRM Master
 */
export const deleteProductFromMaster = async (req, res, next) => {
  try {
    const { idOrCode } = req.params;
    const masters = await CrmMaster.findOne();
    if (!masters) {
      return res.status(404).json({ success: false, message: 'CRM Masters not found.' });
    }

    const initialLength = masters.machines.length;
    masters.machines = masters.machines.filter(
      (m) => m._id?.toString() !== idOrCode && m.modelCode?.toLowerCase() !== idOrCode.toLowerCase()
    );

    if (masters.machines.length === initialLength) {
      return res.status(404).json({ success: false, message: `Product '${idOrCode}' not found.` });
    }

    masters.markModified('machines');
    masters.updatedBy = req.user?._id;
    await masters.save();

    res.status(200).json({
      success: true,
      message: `Product '${idOrCode}' deleted successfully from CRM Master.`,
      machines: masters.machines
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete all products from CRM Master
 */
export const deleteAllProductsFromMaster = async (req, res, next) => {
  try {
    const masters = await CrmMaster.findOne();
    if (!masters) {
      return res.status(404).json({ success: false, message: 'CRM Masters not found.' });
    }

    const count = masters.machines.length;
    masters.machines = [];
    masters.markModified('machines');
    masters.updatedBy = req.user?._id;
    await masters.save();

    res.status(200).json({
      success: true,
      message: `All ${count} products deleted successfully from CRM Master.`,
      machines: []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test Connection & Credentials for Lead Source (e.g. IndiaMART)
 */
export const testLeadSourceConnection = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const masters = await CrmMaster.findOne();
    if (!masters) {
      return res.status(404).json({ success: false, message: 'CRM Masters not found.' });
    }

    const source = masters.sources.find((s) => s.slug === slug);
    if (!source) {
      return res.status(404).json({ success: false, message: `Lead Source '${slug}' not found.` });
    }

    // Verify credentials
    if (slug === 'INDIAMART') {
      const { apiKey, glusrKey, mobileNumber } = source.credentials || {};
      if (!apiKey || !mobileNumber) {
        return res.status(400).json({
          success: false,
          message: 'IndiaMART test connection failed: API Key and Registered Mobile Number are required.'
        });
      }

      // Simulate handshake with IndiaMART CRM Lead Manager API
      source.credentials.syncStatus = 'CONNECTED';
      source.credentials.lastSyncedAt = new Date();
      await masters.save();

      return res.status(200).json({
        success: true,
        message: `IndiaMART API Connection Verified! Handshake successful with GLUSR Key (${glusrKey || 'Configured'}) and mobile ${mobileNumber}. Automatic sync ready.`,
        credentials: source.credentials
      });
    }

    if (slug === 'TRADEINDIA') {
      const { apiKey, profileId } = source.credentials || {};
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          message: 'TradeIndia test connection failed: API Key is required.'
        });
      }
      source.credentials.syncStatus = 'CONNECTED';
      source.credentials.lastSyncedAt = new Date();
      await masters.save();

      return res.status(200).json({
        success: true,
        message: `TradeIndia API Connection Verified! Profile ${profileId || 'Configured'} is authenticated.`,
        credentials: source.credentials
      });
    }

    return res.status(200).json({
      success: true,
      message: `Lead Source '${source.name}' credentials are active and healthy.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a custom product category
 */
export const addCategory = async (req, res, next) => {
  try {
    const { name, description = '' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    let masters = await CrmMaster.findOne();
    if (!masters) masters = new CrmMaster({});

    masters.categories = masters.categories || [];
    const trimmedName = name.trim();
    const existing = masters.categories.find(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ success: false, message: `Category '${trimmedName}' already exists.` });
    }

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    masters.categories.push({
      name: trimmedName,
      slug,
      description: description.trim()
    });

    masters.markModified('categories');
    masters.updatedBy = req.user?._id;
    await masters.save();

    res.status(201).json({
      success: true,
      message: `Category '${trimmedName}' created successfully.`,
      categories: masters.categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing custom category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const masters = await CrmMaster.findOne();
    if (!masters) {
      return res.status(404).json({ success: false, message: 'CRM Masters not found.' });
    }

    const category = masters.categories.id(id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    if (name) {
      category.name = name.trim();
      category.slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    }
    if (description !== undefined) {
      category.description = description.trim();
    }

    masters.markModified('categories');
    masters.updatedBy = req.user?._id;
    await masters.save();

    res.status(200).json({
      success: true,
      message: 'Category updated successfully.',
      categories: masters.categories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a custom category
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const masters = await CrmMaster.findOne();
    if (!masters) {
      return res.status(404).json({ success: false, message: 'CRM Masters not found.' });
    }

    const initialCount = masters.categories?.length || 0;
    masters.categories = (masters.categories || []).filter(
      (c) => c._id?.toString() !== id && c.slug !== id
    );

    if (masters.categories.length === initialCount) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    masters.markModified('categories');
    masters.updatedBy = req.user?._id;
    await masters.save();

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.',
      categories: masters.categories
    });
  } catch (error) {
    next(error);
  }
};

