export interface AssemblyStage {
  _id: string;
  projectId: string;
  stageName: string;
  stageOrder: number;
  stageType: 'MECHANICAL' | 'ELECTRICAL' | 'PNEUMATIC' | 'SOFTWARE';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  signedOffBy?: string;
  signedOffAt?: string;
}

export interface SnagItem {
  _id: string;
  snagNumber: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  reportedBy: string;
  assignedTo?: string;
  status: 'OPEN' | 'IN_REWORK' | 'RESOLVED' | 'VERIFIED_CLOSED';
  resolutionNotes?: string;
}

export interface MachineTrial {
  _id: string;
  projectId: string;
  trialType: 'DRY_RUN' | 'WET_RUN' | 'FULL_LOAD' | 'FAT';
  parametersTested: {
    spindleRpmAchieved?: number;
    wireTensionGrams?: number;
    traversePitchMm?: number;
    cycleTimeSec?: number;
  };
  overallTrialResult: 'PASS' | 'PASS_WITH_SNAGS' | 'FAIL';
  openSnags: SnagItem[];
  testedBy: string;
  trialDate: string;
}
