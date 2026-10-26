import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.config.js';
import { Role } from '../modules/admin/models/role.model.js';
import { User } from '../modules/admin/models/user.model.js';
import { Lead } from '../modules/crm/models/lead.model.js';
import { Quotation } from '../modules/crm/models/quotation.model.js';
import { Project } from '../modules/project-setup/models/project.model.js';
import { Milestone } from '../modules/project-setup/models/milestone.model.js';
import { StageMaster } from '../modules/project-setup/models/stageMaster.model.js';
import { Bom } from '../modules/design/models/bom.model.js';
import { Drawing } from '../modules/design/models/drawing.model.js';
import { Eco } from '../modules/design/models/eco.model.js';
import { Vendor } from '../modules/purchase/models/vendor.model.js';
import { PurchaseOrder } from '../modules/purchase/models/purchaseOrder.model.js';
import { GateEntry } from '../modules/incoming-quality/models/gateEntry.model.js';
import { QcInspection } from '../modules/incoming-quality/models/qcInspection.model.js';
import { InventoryItem } from '../modules/store/models/inventoryItem.model.js';
import { StockAllocation } from '../modules/store/models/stockAllocation.model.js';
import { AssemblyStage } from '../modules/production-trial/models/assemblyStage.model.js';
import { MachineTrial } from '../modules/production-trial/models/machineTrial.model.js';
import { DispatchOrder } from '../modules/dispatch/models/dispatchOrder.model.js';
import { ServiceTicket } from '../modules/after-sales/models/serviceTicket.model.js';
import { AuditLog } from '../modules/admin/models/auditLog.model.js';

const seedDatabase = async () => {
  try {
    await connectDatabase();
    console.log('⚡ Purging all dummy data and collections for clean enterprise setup...');

    // Drop or clear all operational collections
    await Promise.all([
      Role.deleteMany({}),
      User.collection.drop().catch(() => {}), // drop collection to bypass user deactivation hook
      Lead.deleteMany({}),
      Quotation.deleteMany({}),
      Project.deleteMany({}),
      Milestone.deleteMany({}),
      Bom.deleteMany({}),
      Drawing.deleteMany({}),
      Eco.deleteMany({}),
      Vendor.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      GateEntry.deleteMany({}),
      QcInspection.deleteMany({}),
      InventoryItem.deleteMany({}),
      StockAllocation.deleteMany({}),
      AssemblyStage.deleteMany({}),
      MachineTrial.deleteMany({}),
      DispatchOrder.deleteMany({}),
      ServiceTicket.deleteMany({}),
      AuditLog.collection.drop().catch(() => {})
    ]);

    console.log('✅ All dummy data purged successfully.');

    // Seed Master Roles (Essential System Structure)
    console.log('🌱 Seeding Master RBAC Roles...');
    const rolesData = [
      {
        name: 'Super Admin',
        slug: 'super-admin',
        description: 'Complete unrestricted system access across all modules & system governance',
        allowedRoutes: ['*']
      },
      {
        name: 'Master Data Administrator',
        slug: 'master-admin',
        description: 'Manages enterprise master catalogues: items, vendors, customers, locations, categories, assemblies, company profile, and global settings',
        allowedRoutes: [
          '/masters/vendors',
          '/masters/customers',
          '/masters/locations',
          '/masters/categories',
          '/masters/rm-items',
          '/masters/bo-items',
          '/masters/components',
          '/masters/subassemblies',
          '/masters/assemblies',
          '/masters/company-profile',
          '/masters/settings'
        ]
      },
      {
        name: 'Project Manager',
        slug: 'project-manager',
        description: 'Oversees machine milestone schedules, BOM baselines, and dispatch gate passes',
        allowedRoutes: [
          '/project-setup/projects',
          '/project-setup/kanban',
          '/project-setup/milestones',
          '/project-setup/masters',
          '/crm/leads',
          '/crm/quotations',
          '/design/bom',
          '/design/drawings',
          '/purchase/orders',
          '/store/inventory',
          '/production-trial/assembly',
          '/production-trial/trials',
          '/dispatch/verification',
          '/after-sales/warranty'
        ]
      },
      {
        name: 'Lead Design Engineer',
        slug: 'design-engineer',
        description: 'Creates 3-level BOMs, uploads CAD files, and manages Engineering Change Orders (ECOs)',
        allowedRoutes: ['/design/bom', '/design/drawings', '/design/eco', '/project-setup/projects']
      },
      {
        name: 'Purchase Head',
        slug: 'purchase-head',
        description: 'Reviews BOM net demand, manages RFQs and quotations, issues vendor POs and bills, tracks delivery lead times',
        allowedRoutes: [
          '/purchase/dashboard',
          '/purchase/rfq',
          '/purchase/quotations',
          '/purchase/orders',
          '/purchase/bills',
          '/purchase/price-list',
          '/purchase/masters',
          '/purchase/vendors',
          '/store/inventory',
          '/project-setup/projects'
        ]
      },
      {
        name: 'Quality Inspector',
        slug: 'quality-inspector',
        description: 'Performs gate inward quarantine inspections, logs defect root-causes, signs off trial snags',
        allowedRoutes: [
          '/incoming-quality/gate-entry',
          '/incoming-quality/inspections',
          '/production-trial/trials',
          '/project-setup/projects'
        ]
      },
      {
        name: 'Store Keeper',
        slug: 'store-keeper',
        description: 'Maintains 4-bucket inventory ledgers, hard stock allocation locks, and shopfloor issues',
        allowedRoutes: [
          '/store/inventory',
          '/store/allocations',
          '/incoming-quality/gate-entry',
          '/project-setup/projects'
        ]
      },
      {
        name: 'Production Engineer',
        slug: 'production-engineer',
        description: 'Executes mechanical & electrical assembly stages, records stage-gate checkpoints',
        allowedRoutes: [
          '/production-trial/assembly',
          '/production-trial/trials',
          '/store/inventory',
          '/project-setup/projects'
        ]
      },
      {
        name: 'Dispatch Officer',
        slug: 'dispatch-officer',
        description: 'Enforces Zero-Snag block, generates gate passes, and prepares shipping dossiers',
        allowedRoutes: ['/dispatch/verification', '/project-setup/projects']
      },
      {
        name: 'Service Engineer',
        slug: 'service-engineer',
        description: 'Tracks post-commissioning warranties, field service tickets, and spare parts supply',
        allowedRoutes: ['/after-sales/warranty', '/project-setup/projects']
      }
    ];

    const roles = await Role.insertMany(rolesData);
    const superAdminRole = roles.find((r) => r.slug === 'super-admin');

    // Authoritative Admin Email from .env
    const adminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();

    console.log(`🌱 Seeding Sole Super Admin User: ${adminEmail}...`);
    const superAdminUser = await User.create({
      firstName: 'Asraf',
      lastName: 'Ali',
      email: adminEmail,
      password: 'Admin@MH2026!', // Initial secure fallback password for corporate credentials login
      role: superAdminRole._id,
      department: 'ADMIN',
      plantLocation: 'Main Works - Unit 1',
      refreshTokenExpiry: '30d',
      isSuperAdmin: true,
      isActive: true,
      status: 'ACTIVE'
    });

    console.log('🌱 Seeding Standard Stage Master templates...');
    const defaultStages = [
      {
        stageCode: 'PROJECT_SETUP',
        stageName: 'Project Kickoff & Charter Sign-off',
        defaultOrder: 1,
        leadRole: 'Project Manager',
        standardDaysOffset: 7,
        weightPercent: 10,
        description: 'Customer alignment, kick-off meeting, and project baseline setup.'
      },
      {
        stageCode: 'DESIGN_BOM',
        stageName: '3-Level Hierarchical BOM & CAD Freeze',
        defaultOrder: 2,
        leadRole: 'Lead Design Engineer',
        standardDaysOffset: 14,
        weightPercent: 15,
        description: 'Complete 3D model release, structural analysis, and freeze of all 3 levels of BOM.'
      },
      {
        stageCode: 'PROCUREMENT',
        stageName: 'BOM Net Demand Sourced & POs Released',
        defaultOrder: 3,
        leadRole: 'Purchase Officer',
        standardDaysOffset: 35,
        weightPercent: 15,
        description: 'All buy-out and raw material purchase orders committed with verified vendor lead times.'
      },
      {
        stageCode: 'INCOMING_QC',
        stageName: 'Critical Inward Gate Inspection & QC Pass',
        defaultOrder: 4,
        leadRole: 'Quality Engineer',
        standardDaysOffset: 50,
        weightPercent: 15,
        description: 'Inspection of CNC machined parts, linear bearings, servo motors, and structural frames.'
      },
      {
        stageCode: 'STORE_ALLOCATION',
        stageName: 'Hard Stock Allocation Locked to Project',
        defaultOrder: 5,
        leadRole: 'Store Manager',
        standardDaysOffset: 55,
        weightPercent: 10,
        description: 'Physical and ERP stock hard-locking against the project spine ID.'
      },
      {
        stageCode: 'PRODUCTION_ASSEMBLY',
        stageName: 'Mechanical & Electrical Assembly Sign-off',
        defaultOrder: 6,
        leadRole: 'Production Engineer',
        standardDaysOffset: 75,
        weightPercent: 15,
        description: 'Base machine frame leveling, guide rails mounting, pneumatic plumbing, and control panel wiring.'
      },
      {
        stageCode: 'MACHINE_TRIAL',
        stageName: 'Internal Dry/Wet Run Trial Passed (Zero Snags)',
        defaultOrder: 7,
        leadRole: 'Commissioning Engineer',
        standardDaysOffset: 85,
        weightPercent: 10,
        description: 'Continuous 8-hour machine dry run trial followed by material test winding at rated speed.'
      },
      {
        stageCode: 'DISPATCH_READY',
        stageName: 'Zero-Snag Block Verification & Dossier Sign-off',
        defaultOrder: 8,
        leadRole: 'Plant Head',
        standardDaysOffset: 90,
        weightPercent: 10,
        description: 'Final packing list verification, dispatch gate pass generation, and client shipping notification.'
      }
    ];

    await StageMaster.deleteMany({});
    await StageMaster.insertMany(
      defaultStages.map((s) => ({
        ...s,
        createdBy: superAdminUser._id,
        updatedBy: superAdminUser._id
      }))
    );

    console.log('====================================================');
    console.log('🎉 Enterprise Environment Initialized Cleanly:');
    console.log(`👤 Super Admin Account: ${superAdminUser.email}`);
    console.log(`🔑 Super Admin Role:    ${superAdminRole.name} (Global Access)`);
    console.log('🎯 Standard Stages:     8 Master Stage templates created.');
    console.log('🧹 Zero Dummy Records:  All dummy projects, BOMs, POs, and orders purged.');
    console.log('====================================================');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Clean Seeding Failed:', error);
    process.exit(1);
  }
};

seedDatabase();
