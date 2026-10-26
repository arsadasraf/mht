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
    // Attempt session refresh
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

    if (refreshResult.data && (refreshResult.data as any).accessToken) {
      const newAccessToken = (refreshResult.data as any).accessToken;
      const newRefreshToken = (refreshResult.data as any).refreshToken;
      if (typeof window !== 'undefined') {
        localStorage.setItem('mht_access_token', newAccessToken);
        if (newRefreshToken) localStorage.setItem('mht_refresh_token', newRefreshToken);
      }
      // Retry original request with newly refreshed token
      result = await rawBaseQuery(args, api, extraOptions);
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
    'AssemblyStage',
    'MachineTrial',
    'DispatchOrder',
    'ServiceTicket',
    'AuditLog',
    'CrmMaster',
    'Session',
    'MasterLookup',
    'MasterDomain',
    'StageMaster'
  ],
  endpoints: () => ({})
});
