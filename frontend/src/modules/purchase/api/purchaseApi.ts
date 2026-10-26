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
    }),
    getRfqs: builder.query({
      query: (params) => ({
        url: '/purchase/rfq',
        params
      }),
      providesTags: ['PurchaseOrder']
    }),
    getQuotations: builder.query({
      query: (params) => ({
        url: '/purchase/quotations',
        params
      }),
      providesTags: ['PurchaseOrder']
    }),
    getBills: builder.query({
      query: (params) => ({
        url: '/purchase/bills',
        params
      }),
      providesTags: ['PurchaseOrder']
    }),
    createRfq: builder.mutation({
      query: (body) => ({
        url: '/purchase/rfq',
        method: 'POST',
        body
      }),
      invalidatesTags: ['PurchaseOrder']
    }),
    createQuotation: builder.mutation({
      query: (body) => ({
        url: '/purchase/quotations',
        method: 'POST',
        body
      }),
      invalidatesTags: ['PurchaseOrder', 'Quotation']
    }),
    createBill: builder.mutation({
      query: (body) => ({
        url: '/purchase/bills',
        method: 'POST',
        body
      }),
      invalidatesTags: ['PurchaseOrder']
    })
  })
});

export const {
  useGetPurchaseOrdersQuery,
  useCalculateNetDemandQuery,
  useGetVendorsQuery,
  useGetRfqsQuery,
  useGetQuotationsQuery,
  useGetBillsQuery,
  useCreateRfqMutation,
  useCreateQuotationMutation,
  useCreateBillMutation
} = purchaseApi;

