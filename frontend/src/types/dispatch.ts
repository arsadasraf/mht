export interface DispatchOrder {
  _id: string;
  dispatchNumber: string;
  projectId: string;
  customerPoNumber: string;
  isZeroSnagClearanceAchieved: boolean; // Absolute Zero-Snag Block
  unresolvedSnagCount: number;
  gatePassNumber?: string;
  packingListVerified: boolean;
  transporterName?: string;
  vehicleNumber?: string;
  lrNumber?: string;
  dispatchedAt?: string;
  status: 'BLOCKED_SNAGS' | 'CLEARED_FOR_DISPATCH' | 'GATE_PASS_ISSUED' | 'DISPATCHED';
}
