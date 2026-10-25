export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY';

export interface MonetaryAmount {
  currency: CurrencyCode;
  amount: number;
  exchangeRate: number;
  baseAmountINR: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  total: number;
  page: number;
  pages?: number;
  data?: T[];
}

export type DateFilterScope = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'all' | 'custom';
