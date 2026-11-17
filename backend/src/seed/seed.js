import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { basePrisma, connectDatabase, disconnectDB } from '../config/db.config.js';

const rolesData = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Complete unrestricted system access across all modules & system governance',
    allowedRoutes: ['*'],
    isSystemRole: true
  },
  {
    name: 'Master Data Administrator',
    slug: 'master-admin',
    description:
      'Manages enterprise master catalogues across modules: CRM, Design, Purchase, Store, Production, and Dispatch',
    allowedRoutes: [
      '/crm/masters',
      '/project-setup/masters',
      '/design/masters',
      '/purchase/masters',
      '/store/master',
      '/production-trial/masters',
      '/dispatch/masters'
    ],
    isSystemRole: true
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
      '/design/dashboard',
      '/design/projects',
      '/design/masters',
      '/purchase/orders',
      '/store/inventory',
      '/production-trial/dashboard',
      '/production-trial/projects',
      '/production-trial/masters',
      '/dispatch/dashboard',
      '/dispatch/projects',
      '/dispatch/masters',
      '/after-sales/warranty'
    ],
    isSystemRole: true
  },
  {
    name: 'Lead Design Engineer',
    slug: 'design-engineer',
    description: 'Creates 3-level BOMs, uploads CAD files, and manages Engineering Change Orders (ECOs)',
    allowedRoutes: ['/design/dashboard', '/design/projects', '/design/masters', '/project-setup/projects'],
    isSystemRole: true
  },
  {
    name: 'Purchase Head',
    slug: 'purchase-head',
    description:
      'Reviews BOM net demand, manages RFQs and quotations, issues vendor POs and bills, tracks delivery lead times',
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
    ],
    isSystemRole: true
  },
  {
    name: 'Quality Inspector',
    slug: 'quality-inspector',
    description:
      'Performs gate inward quarantine inspections, logs defect root-causes, signs off trial snags',
    allowedRoutes: [
      '/incoming-quality/gate-entry',
      '/incoming-quality/inspections',
      '/dispatch/dashboard',
      '/dispatch/projects',
      '/project-setup/projects'
    ],
    isSystemRole: true
  },
  {
    name: 'Store Keeper',
    slug: 'store-keeper',
    description:
      'Maintains 4-bucket inventory ledgers, material issues, and store masters',
    allowedRoutes: [
      '/store/inventory',
      '/store/master',
      '/incoming-quality/gate-entry',
      '/project-setup/projects'
    ],
    isSystemRole: true
  },
  {
    name: 'Production Engineer',
    slug: 'production-engineer',
    description:
      'Executes mechanical & electrical assembly stages, records stage-gate checkpoints',
    allowedRoutes: [
      '/production-trial/dashboard',
      '/production-trial/projects',
      '/production-trial/masters',
      '/dispatch/dashboard',
      '/dispatch/projects',
      '/store/inventory',
      '/project-setup/projects'
    ],
    isSystemRole: true
  },
  {
    name: 'Dispatch Officer',
    slug: 'dispatch-officer',
    description:
      'Oversees inspection checklist progress, attaches sub-stages, and coordinates vehicle dispatch',
    allowedRoutes: [
      '/dispatch/dashboard',
      '/dispatch/projects',
      '/dispatch/masters',
      '/project-setup/projects'
    ],
    isSystemRole: true
  },
  {
    name: 'Service Engineer',
    slug: 'service-engineer',
    description:
      'Tracks post-commissioning warranties, field service tickets, and spare parts supply',
    allowedRoutes: ['/after-sales/warranty', '/project-setup/projects'],
    isSystemRole: true
  }
];

const seedDatabase = async () => {
  try {
    await connectDatabase();
    console.log('⚡ Resetting PostgreSQL Auth & Admin tables for clean enterprise setup...');

    // Use basePrisma for clean reset during seed (bypasses runtime immutability hooks)
    await basePrisma.auditLog.deleteMany();
    await basePrisma.userLoginHistory.deleteMany();
    await basePrisma.user.deleteMany();
    await basePrisma.role.deleteMany();

    console.log('🌱 Seeding Master RBAC Roles into PostgreSQL...');
    const createdRoles = [];
    for (const r of rolesData) {
      const role = await basePrisma.role.create({ data: r });
      createdRoles.push(role);
    }

    const superAdminRole = createdRoles.find((r) => r.slug === 'super-admin');
    const adminEmail = (process.env.ADMIN_EMAIL || 'asrafali444u@gmail.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Asraf@123';

    console.log(`🌱 Seeding Sole Super Admin User: ${adminEmail}...`);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const superAdminUser = await basePrisma.user.create({
      data: {
        firstName: 'Asraf',
        lastName: 'Ali',
        email: adminEmail,
        password: hashedPassword,
        roleId: superAdminRole.id,
        department: 'ADMIN',
        plantLocation: 'Main Works - Unit 1 (Bengaluru)',
        authMethod: 'BOTH',
        refreshTokenExpiry: '30d',
        isSuperAdmin: true,
        isActive: true,
        status: 'ACTIVE'
      }
    });

    console.log('====================================================');
    console.log('🎉 PostgreSQL Database Seeded Cleanly:');
    console.log(`👤 Super Admin Account: ${superAdminUser.email}`);
    console.log(`🔑 Default Password:    ${adminPassword}`);
    console.log(`🛡️ Roles Seeded:        ${createdRoles.length} Enterprise RBAC Roles`);
    console.log('====================================================');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ PostgreSQL Seeding Failed:', error);
    await disconnectDB();
    process.exit(1);
  }
};

seedDatabase();
