export * from '../../types/crm';

export interface CrmOverviewSummary {
  totalLeads: number;
  activePipelineValue: number;
  ordersWonCount: number;
  ordersWonValue: number;
  conversionRate: number;
  quotationsSentCount: number;
  avgOrderValue: number;
  indiaMartLeadsCount: number;
  stageFunnel: Record<string, { count: number; value: number; percentage: number }>;
}

export interface GetLeadsParams {
  search?: string;
  stage?: string;
  source?: string;
  priority?: string;
  assignedTo?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface GetCustomerPosParams {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}
