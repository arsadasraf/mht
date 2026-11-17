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
    path: '/design/dashboard',
    icon: 'Compass',
    description: '',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/design/dashboard', icon: 'PieChart' },
      { id: 'projects', label: 'Projects', path: '/design/projects', icon: 'FolderGit2' },
      { id: 'kanban', label: 'Kanban', path: '/design/kanban', icon: 'Kanban' },
      { id: 'gantt', label: 'Gantt Chart', path: '/design/gantt', icon: 'CalendarCheck' },
      { id: 'masters', label: 'Master', path: '/design/masters', icon: 'Settings' }
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
      { id: 'projects', label: 'Projects', path: '/purchase/projects', icon: 'FolderGit2' },
      { id: 'rfq', label: 'Outward RFQ', path: '/purchase/rfq', icon: 'Inbox' },
      { id: 'quotations', label: 'Inward Quotation', path: '/purchase/quotations', icon: 'FileSpreadsheet' },
      { id: 'orders', label: 'Outward PO', path: '/purchase/orders', icon: 'IndianRupee' },
      { id: 'bills', label: 'Purchase Bills', path: '/purchase/bills', icon: 'Receipt' },
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
      { id: 'master', label: 'Master', path: '/store/master', icon: 'Settings' }
    ]
  },
  {
    id: 'production-trial',
    name: 'Production & Testing',
    slug: 'production-trial',
    path: '/production-trial/dashboard',
    icon: 'Wrench',
    description: '',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/production-trial/dashboard', icon: 'PieChart' },
      { id: 'projects', label: 'Projects & Work Orders', path: '/production-trial/projects', icon: 'FolderGit2' },
      { id: 'masters', label: 'Masters', path: '/production-trial/masters/team', icon: 'Settings' }
    ]
  },
  {
    id: 'dispatch',
    name: 'Trials/Inspection & Dispatch',
    slug: 'dispatch',
    path: '/dispatch/dashboard',
    icon: 'Truck',
    description: '',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/dispatch/dashboard', icon: 'BarChart2' },
      { id: 'projects', label: 'Projects & Work Orders', path: '/dispatch/projects', icon: 'Kanban' },
      { id: 'masters', label: 'Masters', path: '/dispatch/masters/team', icon: 'Sliders' }
    ]
  },
  {
    id: 'after-sales',
    name: 'After Sales & Service',
    slug: 'after-sales',
    path: '/after-sales/dashboard',
    icon: 'Headphones',
    description: '',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', path: '/after-sales/dashboard', icon: 'BarChart2' },
      { id: 'projects', label: 'Projects & Work Orders', path: '/after-sales/projects', icon: 'Kanban' },
      { id: 'warranty', label: 'Warranties & Field Tickets', path: '/after-sales/warranty', icon: 'LifeBuoy' },
      { id: 'masters', label: 'Masters', path: '/after-sales/masters/customers', icon: 'Sliders' }
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
