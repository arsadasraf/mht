export interface DispatchTeamMember {
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

export interface DispatchSubStage {
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
