import { apiSlice } from '../../../store/apiSlice';

export const purchaseApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: '/purchase/orders',
        params
      }),
      providesTags: ['PurchaseOrder']
    }),
    calculateNetDemand: builder.query({
      query: (projectId) => `/purchase/orders/demand/${projectId}`,
      providesTags: ['PurchaseOrder', 'Inventory', 'Bom']
    }),
    getVendors: builder.query({
      query: (params) => ({
        url: '/purchase/vendors',
        params
      }),
      providesTags: ['Vendor']
    })
  })
});

export const {
  useGetPurchaseOrdersQuery,
  useCalculateNetDemandQuery,
  useGetVendorsQuery
} = purchaseApi;
