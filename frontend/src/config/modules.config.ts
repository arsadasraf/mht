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
    name: 'CRM & Enquiry',
    slug: 'crm',
    path: '/crm/dashboard',
    icon: 'Briefcase',
    description: '',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/crm/dashboard', icon: 'PieChart' },
      { id: 'leads', label: 'Leads & Inquiry', path: '/crm/leads', icon: 'Inbox' },
      { id: 'customer-po', label: 'Customer PO', path: '/crm/customer-po', icon: 'IndianRupee' },
      { id: 'masters', label: 'Masters', path: '/crm/masters', icon: 'Settings' }
    ]
  },
  {
    id: 'project-setup',
    name: 'Project Setup',
    slug: 'project-setup',
    path: '/project-setup/projects',
    icon: 'Cpu',
    description: '',
    tabs: [
      { id: 'projects', label: 'Projects', path: '/project-setup/projects', icon: 'FolderGit2' },
      { id: 'kanban', label: 'Kanban', path: '/project-setup/kanban', icon: 'Kanban' },
      { id: 'milestones', label: 'Milestones', path: '/project-setup/milestones', icon: 'CalendarCheck' },
      { id: 'masters', label: 'Masters', path: '/project-setup/masters', icon: 'Settings' }
    ]
  },
  {
    id: 'design',
    name: 'Design & CAD',
    slug: 'design',
    path: '/design/bom',
    icon: 'Compass',
    description: '',
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
    path: '/purchase/dashboard',
    icon: 'ShoppingBag',
    description: '',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/purchase/dashboard', icon: 'PieChart' },
      { id: 'rfq', label: 'Outward RFQ', path: '/purchase/rfq', icon: 'Inbox' },
      { id: 'quotations', label: 'Inward Quotation', path: '/purchase/quotations', icon: 'FileSpreadsheet' },
      { id: 'orders', label: 'Outward PO', path: '/purchase/orders', icon: 'Receipt' },
      { id: 'bills', label: 'Purchase Bills', path: '/purchase/bills', icon: 'IndianRupee' },
      { id: 'price-list', label: 'Price List', path: '/purchase/price-list', icon: 'Calculator' },
      { id: 'masters', label: 'Master', path: '/purchase/masters', icon: 'Settings' }
    ]
  },
  {
    id: 'quality',
    name: 'Quality',
    slug: 'quality',
    path: '/quality/incoming-inspection',
    icon: 'ScanLine',
    description: '',
    tabs: [
      { id: 'incoming-inspection', label: 'Incoming Inspection', path: '/quality/incoming-inspection', icon: 'ShieldCheck' },
      { id: 'process-inspection', label: 'Process Inspection', path: '/quality/process-inspection', icon: 'CheckSquare' },
      { id: 'pdi', label: 'PDI', path: '/quality/pdi', icon: 'Award' },
      { id: 'master', label: 'Master', path: '/quality/master', icon: 'Settings' }
    ]
  },
  {
    id: 'store',
    name: 'Store & Inventory',
    slug: 'store',
    path: '/store/inventory',
    icon: 'Boxes',
    description: '',
    tabs: [
      { id: 'inventory', label: 'Inventory Ledger', path: '/store/inventory', icon: 'Boxes' },
      { id: 'wip', label: 'WIP Management', path: '/store/wip', icon: 'Wrench' },
      { id: 'dc', label: 'Delivery Challan (DC)', path: '/store/dc', icon: 'Truck' },
      { id: 'master', label: 'Store Master', path: '/store/master', icon: 'Settings' },
      { id: 'allocations', label: 'Project Hard Allocations', path: '/store/allocations', icon: 'Lock' }
    ]
  },
  {
    id: 'production-trial',
    name: 'Production & Trials',
    slug: 'production-trial',
    path: '/production-trial/assembly',
    icon: 'Wrench',
    description: '',
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
    description: '',
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
    description: '',
    tabs: [
      { id: 'warranty', label: 'Warranties & Field Tickets', path: '/after-sales/warranty', icon: 'LifeBuoy' }
    ]
  },
  {
    id: 'masters',
    name: 'Master Data',
    slug: 'masters',
    path: '/masters/vendors',
    icon: 'Database',
    description: '',
    tabs: [
      { id: 'vendors', label: 'Vendor', path: '/masters/vendors', icon: 'Building2' },
      { id: 'customers', label: 'Customer', path: '/masters/customers', icon: 'Users' },
      { id: 'locations', label: 'Store Location', path: '/masters/locations', icon: 'PackageSearch' },
      { id: 'categories', label: 'Category', path: '/masters/categories', icon: 'FolderGit2' },
      { id: 'rm-items', label: 'RM Items', path: '/masters/rm-items', icon: 'Layers' },
      { id: 'bo-items', label: 'BO Items', path: '/masters/bo-items', icon: 'Calculator' },
      { id: 'components', label: 'Component', path: '/masters/components', icon: 'FileCode2' },
      { id: 'subassemblies', label: 'Subassembly', path: '/masters/subassemblies', icon: 'Boxes' },
      { id: 'assemblies', label: 'Assembly', path: '/masters/assemblies', icon: 'Kanban' },
      { id: 'company-profile', label: 'Company Profile', path: '/masters/company-profile', icon: 'ShieldCheck' },
      { id: 'settings', label: 'Setting', path: '/masters/settings', icon: 'Settings' }
    ]
  },
  {
    id: 'admin',
    name: 'Admin & Governance',
    slug: 'admin',
    path: '/admin/users',
    icon: 'ShieldAlert',
    description: '',
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
