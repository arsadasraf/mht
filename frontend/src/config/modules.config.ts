export interface ModuleTab {
  id: string;
  label: string;
  path: string;
  icon: string;
}

export interface CoreModule {
  id: string;
  name: string;
  slug: string;
  path: string;
  icon: string;
  description: string;
  isSpine?: boolean;
  tabs: ModuleTab[];
}

export const CORE_MODULES: CoreModule[] = [
  {
    id: 'crm',
    name: 'CRM & Estimations',
    slug: 'crm',
    path: '/crm/dashboard',
    icon: 'Briefcase',
    description: 'Customer machine inquiries, dual-currency cost estimations, customer PO logging, and project conversions.',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/crm/dashboard', icon: 'PieChart' },
      { id: 'leads', label: 'Leads & Inquiry', path: '/crm/leads', icon: 'Inbox' },
      { id: 'customer-po', label: 'Customer PO', path: '/crm/customer-po', icon: 'IndianRupee' },
      { id: 'masters', label: 'Masters', path: '/crm/masters', icon: 'Settings' }
    ]
  },
  {
    id: 'project-setup',
    name: 'Project Setup Spine',
    slug: 'project-setup',
    path: '/project-setup/projects',
    icon: 'Cpu',
    isSpine: true,
    description: 'Mints the master Unique Project ID (PRJ-XXXX) and baseline milestones linking the full machine lifecycle.',
    tabs: [
      { id: 'projects', label: 'Active Machine Projects', path: '/project-setup/projects', icon: 'FolderGit2' },
      { id: 'milestones', label: 'Milestone Baselines', path: '/project-setup/milestones', icon: 'CalendarCheck' }
    ]
  },
  {
    id: 'design',
    name: 'Design & CAD',
    slug: 'design',
    path: '/design/bom',
    icon: 'Compass',
    description: '3-level hierarchical BOMs, watermarked CAD viewing, and automated ECO freezes.',
    tabs: [
      { id: 'bom', label: '3-Level Hierarchical BOM', path: '/design/bom', icon: 'Layers' },
      { id: 'drawings', label: 'CAD Drawings & IP', path: '/design/drawings', icon: 'FileCode2' },
      { id: 'eco', label: 'ECO & Freeze Orders', path: '/design/eco', icon: 'AlertTriangle' }
    ]
  },
  {
    id: 'purchase',
    name: 'Purchase & Sourcing',
    slug: 'purchase',
    path: '/purchase/orders',
    icon: 'ShoppingBag',
    description: 'BOM net demand calculation, multi-currency purchase orders, and vendor delivery alerts.',
    tabs: [
      { id: 'orders', label: 'Purchase Orders', path: '/purchase/orders', icon: 'Receipt' },
      { id: 'demand', label: 'BOM Net Demand Engine', path: '/purchase/demand', icon: 'Calculator' },
      { id: 'vendors', label: 'Vendor Directory', path: '/purchase/vendors', icon: 'Building2' }
    ]
  },
  {
    id: 'incoming-quality',
    name: 'Incoming Quality',
    slug: 'incoming-quality',
    path: '/incoming-quality/gate-entry',
    icon: 'ScanLine',
    description: 'Quarantine gate inward holding, goods receipt QC inspections, and defect root-cause analysis.',
    tabs: [
      { id: 'gate-entry', label: 'Quarantine Gate Entry', path: '/incoming-quality/gate-entry', icon: 'ShieldCheck' },
      { id: 'inspections', label: 'Goods Receipt QC', path: '/incoming-quality/inspections', icon: 'CheckSquare' }
    ]
  },
  {
    id: 'store',
    name: 'Store & Inventory',
    slug: 'store',
    path: '/store/inventory',
    icon: 'Boxes',
    description: '4-bucket inventory tracking, dual-unit conversion, and hard project allocation locks.',
    tabs: [
      { id: 'inventory', label: '4-Bucket Stock Ledger', path: '/store/inventory', icon: 'PackageSearch' },
      { id: 'allocations', label: 'Project Hard Allocations', path: '/store/allocations', icon: 'Lock' }
    ]
  },
  {
    id: 'production-trial',
    name: 'Production & Trials',
    slug: 'production-trial',
    path: '/production-trial/assembly',
    icon: 'Wrench',
    description: 'Sub-assembly progress tracking, stage gate role sign-offs, and machine dry/wet run snag logs.',
    tabs: [
      { id: 'assembly', label: 'Assembly Workflows', path: '/production-trial/assembly', icon: 'Kanban' },
      { id: 'trials', label: 'Machine Trials & Snags', path: '/production-trial/trials', icon: 'Activity' }
    ]
  },
  {
    id: 'dispatch',
    name: 'Dispatch & Gate Pass',
    slug: 'dispatch',
    path: '/dispatch/verification',
    icon: 'Truck',
    description: 'Absolute Zero-Snag Block enforcement, shipping dossiers, and vehicle gate pass release.',
    tabs: [
      { id: 'verification', label: 'Zero-Snag Block & Gate Pass', path: '/dispatch/verification', icon: 'CheckCircle2' }
    ]
  },
  {
    id: 'after-sales',
    name: 'After Sales & Service',
    slug: 'after-sales',
    path: '/after-sales/warranty',
    icon: 'Headphones',
    description: 'Post-commissioning support, client warranty status, field snags, and spare parts orders.',
    tabs: [
      { id: 'warranty', label: 'Warranties & Field Tickets', path: '/after-sales/warranty', icon: 'LifeBuoy' }
    ]
  },
  {
    id: 'admin',
    name: 'Admin & Governance',
    slug: 'admin',
    path: '/admin/users',
    icon: 'ShieldAlert',
    description: 'User provisioning, RBAC route matrix, plant IP whitelists, and tamper-proof audit trails.',
    tabs: [
      { id: 'users', label: 'User Directory', path: '/admin/users', icon: 'Users' },
      { id: 'roles', label: 'Role & RBAC Matrix', path: '/admin/roles', icon: 'KeyRound' },
      { id: 'sessions', label: 'Live Activity & Sessions', path: '/admin/sessions', icon: 'Activity' },
      { id: 'audit-logs', label: 'Audit Trail (ISO)', path: '/admin/audit-logs', icon: 'FileSearch' }
    ]
  }
];

export const getModuleBySlug = (slug: string): CoreModule => {
  return CORE_MODULES.find((m) => m.slug === slug) || CORE_MODULES[0];
};

export const getActiveTab = (moduleSlug: string, tabSlug: string): ModuleTab => {
  const mod = getModuleBySlug(moduleSlug);
  return mod.tabs.find((t) => t.id === tabSlug) || mod.tabs[0];
};
