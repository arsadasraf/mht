export interface ServiceTicket {
  _id: string;
  ticketNumber: string;
  projectId: string;
  customerName: string;
  issueDescription: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  assignedEngineer?: string;
  sparePartsRequired?: Array<{
    itemCode: string;
    quantity: number;
    dispatched: boolean;
  }>;
  createdAt: string;
}

export interface WarrantyRecord {
  projectId: string;
  machineSerial: string;
  commissioningDate: string;
  warrantyPeriodMonths: number;
  warrantyExpiryDate: string;
  isUnderWarranty: boolean;
}
