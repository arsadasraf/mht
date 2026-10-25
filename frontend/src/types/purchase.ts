export interface Vendor {
  _id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin?: string;
  city?: string;
  rating?: number;
  paymentTermsDays?: number;
}

export interface PurchaseOrderItem {
  bomItemId?: string;
  itemCode: string;
  description: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  lineTotal: number;
  deliveryDueDate: string;
  isEcoFrozen?: boolean;
}

export interface PurchaseOrder {
  _id: string;
  poNumber: string;
  vendorId: string | Vendor;
  projectId: string;
  items: PurchaseOrderItem[];
  currency: string;
  exchangeRate: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  baseGrandTotalINR: number;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  approvedBy?: string;
  createdAt: string;
}
