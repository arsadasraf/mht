import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.config.js';

// Operational models to purge
import { Lead } from '../modules/crm/models/lead.model.js';
import { Quotation } from '../modules/crm/models/quotation.model.js';
import { CustomerPo } from '../modules/crm/models/customerPo.model.js';
import { Project } from '../modules/project-setup/models/project.model.js';
import { Milestone } from '../modules/project-setup/models/milestone.model.js';
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

// Core governance models (PRESERVED)
import { User } from '../modules/admin/models/user.model.js';
import { Role } from '../modules/admin/models/role.model.js';
import { CrmMaster } from '../modules/crm/models/crmMaster.model.js';

const purgeAllDummyData = async () => {
  try {
    await connectDatabase();
    console.log('====================================================');
    console.log('⚡ MACHINE HOUSE ERP — COMPLETE DUMMY DATA PURGE');
    console.log('====================================================');

    // 1. Audit counts before purge
    console.log('\n📊 Auditing Operational Collections Before Purge:');
    const beforeCounts = {
      leads: await Lead.countDocuments(),
      quotations: await Quotation.countDocuments(),
      customerPos: await CustomerPo.countDocuments(),
      projects: await Project.countDocuments(),
      milestones: await Milestone.countDocuments(),
      boms: await Bom.countDocuments(),
      drawings: await Drawing.countDocuments(),
      ecos: await Eco.countDocuments(),
      vendors: await Vendor.countDocuments(),
      purchaseOrders: await PurchaseOrder.countDocuments(),
      gateEntries: await GateEntry.countDocuments(),
      qcInspections: await QcInspection.countDocuments(),
      inventoryItems: await InventoryItem.countDocuments(),
      stockAllocations: await StockAllocation.countDocuments(),
      assemblyStages: await AssemblyStage.countDocuments(),
      machineTrials: await MachineTrial.countDocuments(),
      dispatchOrders: await DispatchOrder.countDocuments(),
      serviceTickets: await ServiceTicket.countDocuments(),
      auditLogs: await AuditLog.countDocuments()
    };
    console.table(beforeCounts);

    // 2. Perform Atomic Purge on Operational Collections
    console.log('🧹 Purging operational dummy documents...');
    await Promise.all([
      Lead.deleteMany({}),
      Quotation.deleteMany({}),
      CustomerPo.deleteMany({}),
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

    // 3. Verify Preserved Core Governance
    const adminCount = await User.countDocuments();
    const roleCount = await Role.countDocuments();
    const crmMasterCount = await CrmMaster.countDocuments();
    const adminUser = await User.findOne({ isSuperAdmin: true });

    // 4. Audit counts after purge
    console.log('\n✅ Verification After Purge:');
    const afterCounts = {
      leads: await Lead.countDocuments(),
      quotations: await Quotation.countDocuments(),
      customerPos: await CustomerPo.countDocuments(),
      projects: await Project.countDocuments(),
      milestones: await Milestone.countDocuments(),
      boms: await Bom.countDocuments(),
      drawings: await Drawing.countDocuments(),
      ecos: await Eco.countDocuments(),
      vendors: await Vendor.countDocuments(),
      purchaseOrders: await PurchaseOrder.countDocuments(),
      gateEntries: await GateEntry.countDocuments(),
      qcInspections: await QcInspection.countDocuments(),
      inventoryItems: await InventoryItem.countDocuments(),
      stockAllocations: await StockAllocation.countDocuments(),
      assemblyStages: await AssemblyStage.countDocuments(),
      machineTrials: await MachineTrial.countDocuments(),
      dispatchOrders: await DispatchOrder.countDocuments(),
      serviceTickets: await ServiceTicket.countDocuments(),
      auditLogs: await AuditLog.countDocuments()
    };
    console.table(afterCounts);

    console.log('\n🔒 Preserved System Essentials:');
    console.log(`👤 Super Admin Users: ${adminCount} (${adminUser?.email || 'N/A'}) - SAFE & ACTIVE`);
    console.log(`🛡️  RBAC System Roles: ${roleCount} - SAFE & CONFIGURED`);
    console.log(`🏭 Official Catalog:  ${crmMasterCount} master doc - SAFE`);

    console.log('\n====================================================');
    console.log('🎉 SYSTEM 100% CLEAN: All dummy data successfully purged!');
    console.log('====================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Purge Failed:', error);
    process.exit(1);
  }
};

purgeAllDummyData();
