import { logAuditEvent } from '../../../services/audit.service.js';

// In-Memory Master Data Store with Realistic Industrial Seed Presets
let masterStore = {
  vendors: [
    { id: 'v-1', code: 'VND-001', name: 'Siemens Automation India Ltd', category: 'ELECTRICAL', rating: 4.8, city: 'Pune', gstin: '27AABCS1429B1Z1', phone: '+91 20 6712 0000', email: 'sales@siemens.com', status: 'ACTIVE' },
    { id: 'v-2', code: 'VND-002', name: 'SKF India Bearings Ltd', category: 'BEARINGS_FASTENERS', rating: 4.9, city: 'Pune', gstin: '27AAACS4412K1Z9', phone: '+91 20 2747 4301', email: 'orders@skf.com', status: 'ACTIVE' },
    { id: 'v-3', code: 'VND-003', name: 'Festo Pneumatics Pvt Ltd', category: 'PNEUMATICS', rating: 4.7, city: 'Bangalore', gstin: '29AABCF9921M1Z4', phone: '+91 80 2289 4000', email: 'info@festo.in', status: 'ACTIVE' },
    { id: 'v-4', code: 'VND-004', name: 'Hiwin Precision Motion Tech', category: 'MECHANICAL', rating: 4.6, city: 'Chennai', gstin: '33AABCH3321L1Z2', phone: '+91 44 4290 8800', email: 'support@hiwin.in', status: 'ACTIVE' }
  ],
  customers: [
    { id: 'c-1', code: 'CUST-001', name: 'ABB Power Products & Systems India', segment: 'Heavy Electrical', city: 'Vadodara', gstin: '24AABCA1122K1Z5', contactPerson: 'Rajesh Mehta', phone: '+91 265 264 2100', email: 'procure@abb.com', status: 'ACTIVE' },
    { id: 'c-2', code: 'CUST-002', name: 'Bharat Heavy Electricals Ltd (BHEL)', segment: 'Power Generation', city: 'Bhopal', gstin: '23AAACB2233M1Z8', contactPerson: 'Sanjay Sharma', phone: '+91 755 250 0100', email: 'bhel_tender@bhel.in', status: 'ACTIVE' },
    { id: 'c-3', code: 'CUST-003', name: 'Schneider Electric India Pvt Ltd', segment: 'Energy Management', city: 'Hyderabad', gstin: '36AAACS4455P1Z3', contactPerson: 'Priya Iyer', phone: '+91 40 4456 7000', email: 'supplychain@schneider.com', status: 'ACTIVE' }
  ],
  locations: [
    { id: 'loc-1', plant: 'Unit 1 Bhosari', warehouse: 'Raw Material Store', zone: 'Aisle A', rack: 'R-01', bin: 'BIN-A101', capacity: '10 Ton', status: 'ACTIVE' },
    { id: 'loc-2', plant: 'Unit 1 Bhosari', warehouse: 'Bought-Out Store', zone: 'Aisle B', rack: 'R-04', bin: 'BIN-B205', capacity: '500 Pcs', status: 'ACTIVE' },
    { id: 'loc-3', plant: 'Unit 1 Bhosari', warehouse: 'Quarantine Yard', zone: 'Inward QC Area', rack: 'Q-01', bin: 'BIN-QC-01', capacity: 'Open Floor', status: 'ACTIVE' },
    { id: 'loc-4', plant: 'Unit 2 Chakan', warehouse: 'Subassembly Bay', zone: 'Shopfloor Line 1', rack: 'SA-01', bin: 'BIN-SA-04', capacity: '10 Units', status: 'ACTIVE' },
    { id: 'loc-5', plant: 'Unit 2 Chakan', warehouse: 'Finished Goods Bay', zone: 'Pre-Dispatch Staging', rack: 'FG-01', bin: 'BIN-FG-01', capacity: '4 Machines', status: 'ACTIVE' }
  ],
  categories: [
    { id: 'cat-1', code: 'RAW_MAT', name: 'Raw Material & Metals', type: 'RM', description: 'Alloy steels, EN8/EN19 rods, aluminum plates, SS304 sheets', count: 18, status: 'ACTIVE' },
    { id: 'cat-2', code: 'BO_ELEC', name: 'Bought-Out Electrical & Automation', type: 'BO', description: 'Servo motors, VFD drives, PLCs, sensors, HMIs, SMPS', count: 42, status: 'ACTIVE' },
    { id: 'cat-3', code: 'BO_MECH', name: 'Bought-Out Mechanical & Motion', type: 'BO', description: 'Planetary gearboxes, linear guideways, ball screws, couplings', count: 26, status: 'ACTIVE' },
    { id: 'cat-4', code: 'BO_PNU', name: 'Pneumatics & Fluid Power', type: 'BO', description: 'Air cylinders, solenoid valves, FRL units, air tubes, fittings', count: 31, status: 'ACTIVE' },
    { id: 'cat-5', code: 'MACH_PART', name: 'Machined & Fabricated Components', type: 'COMPONENT', description: 'Custom CNC turned shafts, milled base plates, brackets, housings', count: 64, status: 'ACTIVE' },
    { id: 'cat-6', code: 'SUB_ASSY', name: 'Engineered Subassemblies', type: 'SUBASSEMBLY', description: 'Coil winding heads, servo tensioners, turret indexers, wire guides', count: 12, status: 'ACTIVE' },
    { id: 'cat-7', code: 'FIN_MACH', name: 'Complete Machine Assemblies', type: 'ASSEMBLY', description: 'Fully assembled coil winders, linear gantry platforms, test rigs', count: 6, status: 'ACTIVE' }
  ],
  rmItems: [
    { id: 'rm-1', itemCode: 'RM-EN8-050', name: 'EN8 Bright Steel Round Bar 50mm Dia', grade: 'EN8 / AISI 1040', uom: 'KG', standardCostINR: 85, hsn: '72283029', minStock: 250, currentStock: 480, status: 'ACTIVE' },
    { id: 'rm-2', itemCode: 'RM-EN19-075', name: 'EN19 Annealed Alloy Steel Rod 75mm Dia', grade: 'EN19 / AISI 4140', uom: 'KG', standardCostINR: 145, hsn: '72283029', minStock: 150, currentStock: 220, status: 'ACTIVE' },
    { id: 'rm-3', itemCode: 'RM-AL6061-T6', name: 'Aluminum 6061-T6 Plate 25mm Thick', grade: 'Al 6061-T6', uom: 'KG', standardCostINR: 320, hsn: '76061200', minStock: 100, currentStock: 175, status: 'ACTIVE' },
    { id: 'rm-4', itemCode: 'RM-SS304-03', name: 'Stainless Steel SS304 Sheet 3mm', grade: 'SS 304', uom: 'KG', standardCostINR: 280, hsn: '72199090', minStock: 80, currentStock: 110, status: 'ACTIVE' }
  ],
  boItems: [
    { id: 'bo-1', itemCode: 'BO-SRV-750W', name: '750W AC Servo Motor with Brake', make: 'Siemens / Delta', category: 'BO_ELEC', uom: 'SET', standardCostINR: 65000, hsn: '85015290', requiresQc: true, status: 'ACTIVE' },
    { id: 'bo-2', itemCode: 'BO-GBX-010', name: 'Planetary Gearbox 10:1 Ratio Backlash <3arcmin', make: 'Apex / Wittenstein', category: 'BO_MECH', uom: 'NOS', standardCostINR: 57500, hsn: '84834000', requiresQc: true, status: 'ACTIVE' },
    { id: 'bo-3', itemCode: 'BO-LNR-25', name: 'Linear Rail Guideway 25mm x 1200mm Long', make: 'Hiwin / THK', category: 'BO_MECH', uom: 'SET', standardCostINR: 12800, hsn: '84821010', requiresQc: true, status: 'ACTIVE' },
    { id: 'bo-4', itemCode: 'BO-VLV-52', name: '5/2 Way Double Solenoid Valve 24VDC', make: 'Festo / SMC', category: 'BO_PNU', uom: 'NOS', standardCostINR: 4500, hsn: '84812000', requiresQc: true, status: 'ACTIVE' }
  ],
  components: [
    { id: 'cmp-1', itemCode: 'CMP-SFT-001', name: 'Main Winding Spindle Shaft Hardened & Ground', rawMaterial: 'RM-EN19-075', uom: 'NOS', drawingNo: 'DWG-MHT-001-R3', standardCostINR: 14500, status: 'ACTIVE' },
    { id: 'cmp-2', itemCode: 'CMP-FLG-002', name: 'Turret Indexer Mount Flange 180mm', rawMaterial: 'RM-AL6061-T6', uom: 'NOS', drawingNo: 'DWG-MHT-002-R1', standardCostINR: 8200, status: 'ACTIVE' },
    { id: 'cmp-3', itemCode: 'CMP-BRK-003', name: 'Tensioner Mounting Cantilever Bracket', rawMaterial: 'RM-SS304-03', uom: 'NOS', drawingNo: 'DWG-MHT-003-R2', standardCostINR: 4600, status: 'ACTIVE' }
  ],
  subassemblies: [
    { id: 'sa-1', itemCode: 'SA-WND-HEAD', name: 'High-Torque Precision Winding Head Assembly', level: 'Level 1 Sub-Assembly', uom: 'SET', childPartsCount: 14, standardCostINR: 185000, status: 'ACTIVE' },
    { id: 'sa-2', itemCode: 'SA-TNS-UNIT', name: 'Closed-Loop Servo Wire Tensioner Unit', level: 'Level 1 Sub-Assembly', uom: 'SET', childPartsCount: 9, standardCostINR: 92000, status: 'ACTIVE' },
    { id: 'sa-3', itemCode: 'SA-TRT-CAR', name: '4-Station Rotary Turret Indexing Carousel', level: 'Level 1 Sub-Assembly', uom: 'SET', childPartsCount: 22, standardCostINR: 240000, status: 'ACTIVE' }
  ],
  assemblies: [
    { id: 'asy-1', itemCode: 'ASY-CW-400', name: 'Automated 4-Spindle High Speed Coil Winding Machine', modelSeries: 'CW-Series 400', leadWeeks: 8, standardPriceINR: 1850000, status: 'ACTIVE' },
    { id: 'asy-2', itemCode: 'ASY-CNC-5AX', name: '5-Axis Precision Gantry CNC Coil Forming Center', modelSeries: 'CNC-Gantry 5X', leadWeeks: 12, standardPriceINR: 4200000, status: 'ACTIVE' }
  ],
  companyProfile: {
    legalEntityName: 'Machine House - Winding Technologies Pvt Ltd',
    tagline: 'House of Innovations.....',
    cin: 'U29253PN2015PTC155421',
    pan: 'AACCM8892K',
    gstin: '27AACCM8892K1Z8',
    registeredOffice: 'Plot No. 44, Electronic Zone, MIDC Bhosari, Pune - 411026, Maharashtra, India',
    unit1Plant: 'Plot No. 12/B, Industrial Sector 7, Chakan Industrial Area, Pune - 410501, Maharashtra, India',
    billingEmail: 'accounts@machinehouse.in',
    purchaseEmail: 'purchase@machinehouse.in',
    phone: '+91 20 2712 4490',
    bankName: 'HDFC Bank Ltd',
    bankBranch: 'Bhosari Industrial Branch, Pune',
    accountNumber: '50200028479218',
    ifscCode: 'HDFC0001824',
    authorizedSignatory: 'Arshad Asraf',
    signatoryDesignation: 'Managing Director & Plant Head'
  },
  settings: {
    uoms: [
      { code: 'NOS', name: 'Numbers / Pieces', type: 'DISCRETE', isFractional: false },
      { code: 'SET', name: 'Complete Assembly Set', type: 'DISCRETE', isFractional: false },
      { code: 'KG', name: 'Kilograms', type: 'CONTINUOUS', isFractional: true },
      { code: 'MTR', name: 'Meters', type: 'CONTINUOUS', isFractional: true },
      { code: 'BOX', name: 'Box (Multi-pack)', type: 'DISCRETE', isFractional: false },
      { code: 'ROLL', name: 'Roll', type: 'CONTINUOUS', isFractional: true }
    ],
    currencies: [
      { code: 'INR', symbol: '₹', name: 'Indian Rupee', rateToINR: 1.0, isBase: true },
      { code: 'USD', symbol: '$', name: 'US Dollar', rateToINR: 86.5, isBase: false },
      { code: 'EUR', symbol: '€', name: 'Euro', rateToINR: 92.4, isBase: false },
      { code: 'GBP', symbol: '£', name: 'British Pound', rateToINR: 108.2, isBase: false }
    ],
    taxSlabs: [
      { rate: 0, label: '0% (Exempt)', cgst: 0, sgst: 0, igst: 0 },
      { rate: 5, label: '5% GST', cgst: 2.5, sgst: 2.5, igst: 5 },
      { rate: 12, label: '12% GST', cgst: 6, sgst: 6, igst: 12 },
      { rate: 18, label: '18% GST (Standard)', cgst: 9, sgst: 9, igst: 18 },
      { rate: 28, label: '28% GST (Luxury/Heavy)', cgst: 14, sgst: 14, igst: 28 }
    ]
  }
};

/**
 * Universal Lookup Endpoint (Tier 1: Read-Only for Entire App)
 * Accessible by ANY authenticated user across CRM, Design, Purchase, Store, Quality, etc.
 */
export const getMasterLookup = async (req, res, next) => {
  try {
    const { domains } = req.query; // optional comma-separated filter e.g. "vendors,uoms,currencies"
    const requested = domains ? domains.split(',').map((d) => d.trim()) : null;

    let responseData = {
      vendors: masterStore.vendors.map((v) => ({ _id: v.id, code: v.code, name: v.name, category: v.category, gstin: v.gstin })),
      customers: masterStore.customers.map((c) => ({ _id: c.id, code: c.code, name: c.name, segment: c.segment, gstin: c.gstin })),
      locations: masterStore.locations.map((l) => ({ _id: l.id, bin: l.bin, plant: l.plant, warehouse: l.warehouse, label: `${l.plant} > ${l.warehouse} > ${l.bin}` })),
      categories: masterStore.categories.map((c) => ({ _id: c.id, code: c.code, name: c.name, type: c.type })),
      rmItems: masterStore.rmItems.map((r) => ({ _id: r.id, itemCode: r.itemCode, name: r.name, uom: r.uom, cost: r.standardCostINR })),
      boItems: masterStore.boItems.map((b) => ({ _id: b.id, itemCode: b.itemCode, name: b.name, make: b.make, uom: b.uom, cost: b.standardCostINR })),
      components: masterStore.components.map((c) => ({ _id: c.id, itemCode: c.itemCode, name: c.name, uom: c.uom, drawingNo: c.drawingNo })),
      subassemblies: masterStore.subassemblies.map((s) => ({ _id: s.id, itemCode: s.itemCode, name: s.name, uom: s.uom })),
      assemblies: masterStore.assemblies.map((a) => ({ _id: a.id, itemCode: a.itemCode, name: a.name, price: a.standardPriceINR })),
      uoms: masterStore.settings.uoms,
      currencies: masterStore.settings.currencies,
      taxSlabs: masterStore.settings.taxSlabs,
      company: {
        legalName: masterStore.companyProfile.legalEntityName,
        gstin: masterStore.companyProfile.gstin,
        pan: masterStore.companyProfile.pan
      }
    };

    if (requested) {
      const filtered = {};
      requested.forEach((key) => {
        if (responseData[key]) filtered[key] = responseData[key];
      });
      responseData = filtered;
    }

    res.status(200).json({ success: true, lookup: responseData });
  } catch (error) {
    next(error);
  }
};

/**
 * Domain-Specific Getters & Mutation Handlers (Tier 2: Protected by Master RBAC)
 */
export const getMasterDomainData = async (req, res, next) => {
  try {
    const { domain } = req.params;
    if (!masterStore[domain]) {
      return res.status(404).json({ success: false, message: `Master domain '${domain}' not found.` });
    }
    res.status(200).json({ success: true, count: masterStore[domain]?.length || 1, data: masterStore[domain] });
  } catch (error) {
    next(error);
  }
};

export const createMasterEntity = async (req, res, next) => {
  try {
    const { domain } = req.params;
    if (!masterStore[domain]) {
      return res.status(404).json({ success: false, message: `Master domain '${domain}' not found.` });
    }

    const newRecord = {
      id: `${domain}-${Date.now()}`,
      ...req.body,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    if (Array.isArray(masterStore[domain])) {
      masterStore[domain].unshift(newRecord);
    } else {
      masterStore[domain] = { ...masterStore[domain], ...req.body };
    }

    await logAuditEvent({
      req,
      action: `MASTER_${domain.toUpperCase()}_CREATED`,
      module: 'masters',
      entityId: newRecord.id,
      entityType: domain,
      afterData: newRecord,
      notes: `Created new master record in domain: ${domain}`
    });

    res.status(201).json({
      success: true,
      message: `All set! New ${domain.slice(0, -1)} master record added successfully.`,
      record: newRecord
    });
  } catch (error) {
    next(error);
  }
};
