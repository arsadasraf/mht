import {
  createApi,
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError
} from '@reduxjs/toolkit/query/react';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api/v1',
  credentials: 'include',
  prepareHeaders: (headers) => {
    // Anti-CSRF Custom Header
    headers.set('X-Requested-With', 'XMLHttpRequest');

    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('mht_access_token');
    }
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  }
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && (result.error.status === 401 || (result.error.data as any)?.code === 'TOKEN_EXPIRED')) {
    // Attempt session refresh via HttpOnly cookie
    let refreshToken: string | null = null;
    if (typeof window !== 'undefined') {
      refreshToken = localStorage.getItem('mht_refresh_token');
    }

    const refreshResult = await rawBaseQuery(
      {
        url: '/admin/auth/refresh',
        method: 'POST',
        body: refreshToken ? { refreshToken } : undefined
      },
      api,
      extraOptions
    );

    if (refreshResult.data && (refreshResult.data as any).success) {
      // If server rotated tokens and set new HttpOnly cookies, retry original request
      result = await rawBaseQuery(args, api, extraOptions);
    } else if (refreshResult.error) {
      // If refresh failed, purge stale local storage items if any exist
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mht_access_token');
        localStorage.removeItem('mht_refresh_token');
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Role',
    'Lead',
    'Quotation',
    'CustomerPo',
    'Customer',
    'Project',
    'Milestone',
    'Bom',
    'Drawing',
    'Eco',
    'Vendor',
    'PurchaseOrder',
    'GateEntry',
    'QcInspection',
    'Inventory',
    'Allocation',
    'ServiceTicket',
    'AuditLog',
    'CrmMaster',
    'Session',
    'StageMaster',
    'DesignMaster',
    'MaterialRequest',
    'WipInventory',
    'DeliveryChallan',
    'StoreMaster',
    'DesignDashboard'
  ],
  endpoints: () => ({})
});
