export type ProjectStatus =
  | 'INITIALIZED'
  | 'DESIGN_IN_PROGRESS'
  | 'PROCUREMENT'
  | 'INWARD_QC'
  | 'STORES_RESERVED'
  | 'ASSEMBLY'
  | 'SHOPFLOOR_TRIAL'
  | 'DISPATCH_BLOCKED'
  | 'DISPATCHED'
  | 'COMMISSIONED';

export interface Milestone {
  _id: string;
  projectId: string;
  name: string;
  code: string;
  targetDate: string;
  actualDate?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  weightagePercent: number;
  signedOffBy?: string;
  remarks?: string;
}

export interface Project {
  _id: string;
  projectId: string; // Unique Project Spine ID: PRJ-YYYY-XXXX
  workOrderNumber: string; // Master Work Order: WO-YYYY-XXXX
  customerPoNumber: string;
  customerPoId?: string;
  customerName: string;
  companyName: string;
  machineModelCode: string;
  machineModelName: string;
  quantity: number;
  status: ProjectStatus;
  targetDispatchDate: string;
  actualDispatchDate?: string;
  projectManagerId?: string;
  milestones?: Milestone[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
