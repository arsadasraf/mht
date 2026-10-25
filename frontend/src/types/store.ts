export type InventoryBucket = 'ORDERED' | 'IN_QC' | 'ACCEPTED' | 'ISSUED';

export interface InventoryItem {
  _id: string;
  itemCode: string;
  itemName: string;
  uom: string;
  orderedQty: number;
  inQcQty: number;
  acceptedQty: number;
  issuedQty: number;
  availableUnreservedQty: number;
  binLocation?: string;
}

export interface StockAllocation {
  _id: string;
  projectId: string; // Hard-locked to Unique Project Spine ID
  inventoryItemId: string | InventoryItem;
  allocatedQty: number;
  status: 'RESERVED' | 'ISSUED' | 'TRANSFERRED';
  allocatedAt: string;
}
