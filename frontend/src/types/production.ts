export interface ProductionTeamMember {
  _id: string;
  memberCode: string;
  fullName: string;
  designation: string;
  email?: string;
  phone?: string;
  department: string;
  skillSpecialty: string;
  isActive: boolean;
  notes?: string;
}

export interface ProductionSubStage {
  _id: string;
  subStageCode: string;
  subStageName: string;
  departmentModule: string;
  parentStageCode: string;
  defaultOrder: number;
  standardDays: number;
  weightPercent: number;
  description?: string;
  isActive: boolean;
}
