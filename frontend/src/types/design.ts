export type BomLevel = 'MACHINE' | 'SUB_ASSEMBLY' | 'PART_COMPONENT';

export interface BomItem {
  _id: string;
  projectId: string;
  level: BomLevel;
  parentBomId?: string;
  itemCode: string;
  itemName: string;
  description?: string;
  quantity: number;
  uom: string;
  materialGrade?: string;
  isMakeOrBuy: 'MAKE' | 'BUY';
  cadDrawingNumber?: string;
  isFrozenForEco?: boolean;
  ecoId?: string;
}

export interface Drawing {
  _id: string;
  projectId: string;
  drawingNumber: string;
  revision: string;
  title: string;
  fileKey: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy?: string;
  isApproved: boolean;
  approvedBy?: string;
  createdAt: string;
}

export interface EcoChangeOrder {
  _id: string;
  ecoNumber: string;
  projectId: string;
  title: string;
  reason: string;
  affectedBomItemIds: string[];
  status: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  isFreezeActive: boolean;
  approvedBy?: string;
  createdAt: string;
}
