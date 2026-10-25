export interface GateEntry {
  _id: string;
  gatePassNumber: string;
  poNumber: string;
  vendorName: string;
  deliveryChallanNumber: string;
  vehicleNumber?: string;
  inwardDate: string;
  quarantineStatus: 'QUARANTINE_HOLD' | 'INSPECTION_IN_PROGRESS' | 'CLEARED' | 'REJECTED';
}

export interface QcInspectionItem {
  itemCode: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  reworkQty: number;
  defectReason?: string;
  correctiveAction?: string;
}

export interface QcInspection {
  _id: string;
  inspectionNumber: string;
  gateEntryId: string;
  poNumber: string;
  items: QcInspectionItem[];
  overallStatus: 'ACCEPTED' | 'PARTIAL' | 'REJECTED';
  inspectorId: string;
  inspectedAt: string;
  snagPhotos?: string[];
}
