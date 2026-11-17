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
    createPurchaseOrder: builder.mutation({
      query: (body) => ({
        url: '/purchase/orders',
        method: 'POST',
        body
      }),
      invalidatesTags: ['PurchaseOrder', 'Inventory']
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
    createVendor: builder.mutation({
      query: (body) => ({
        url: '/purchase/vendors',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Vendor']
    }),
    updateVendor: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/purchase/vendors/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Vendor']
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({
        url: `/purchase/vendors/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Vendor']
    }),
    getPriceAgreements: builder.query({
      query: (params) => ({
        url: '/purchase/vendors/price-agreements',
        params
      }),
      providesTags: ['Vendor', 'PurchaseOrder']
    }),
    createVendorPriceAgreement: builder.mutation({
      query: (body) => ({
        url: '/purchase/vendors/price-agreements',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Vendor', 'PurchaseOrder']
    }),
    updateVendorPriceAgreement: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/purchase/vendors/price-agreements/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Vendor', 'PurchaseOrder']
    }),
    deleteVendorPriceAgreement: builder.mutation({
      query: (id) => ({
        url: `/purchase/vendors/price-agreements/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Vendor', 'PurchaseOrder']
    }),
    getPurchaseConfig: builder.query({
      query: () => '/purchase/vendors/config',
      providesTags: ['Vendor', 'PurchaseOrder']
    }),
    updatePurchaseConfig: builder.mutation({
      query: (body) => ({
        url: '/purchase/vendors/config',
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Vendor', 'PurchaseOrder']
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
    }),
    approvePurchaseOrder: builder.mutation({
      query: ({ id }) => ({
        url: `/purchase/orders/${id}/approve`,
        method: 'PATCH'
      }),
      invalidatesTags: ['PurchaseOrder']
    }),
    updatePurchaseOrderStatus: builder.mutation({
      query: ({ id, status }) => ({
        url: `/purchase/orders/${id}/status`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: ['PurchaseOrder']
    }),
    addPurchaseOrderComment: builder.mutation({
      query: ({ id, comment }) => ({
        url: `/purchase/orders/${id}/comments`,
        method: 'POST',
        body: { comment }
      }),
      invalidatesTags: ['PurchaseOrder']
    }),
    getPurchaseOrderGrnHistory: builder.query({
      query: (id) => `/purchase/orders/${id}/grn-history`,
      providesTags: ['PurchaseOrder']
    }),
    updatePurchaseOrder: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/purchase/orders/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['PurchaseOrder']
    }),
    deletePurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/purchase/orders/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['PurchaseOrder']
    }),
    uploadDirectToS3: builder.mutation<
      { success: boolean; key: string; url?: string; permanentUrl?: string; s3Url?: string; message?: string },
      { key: string; contentType?: string; base64Data: string; fileData?: string }
    >({
      query: (body) => ({
        url: '/s3/direct-upload',
        method: 'POST',
        body
      })
    })
  })
});

export const {
  useGetPurchaseOrdersQuery,
  useCreatePurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
  useAddPurchaseOrderCommentMutation,
  useGetPurchaseOrderGrnHistoryQuery,
  useLazyGetPurchaseOrderGrnHistoryQuery,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useCalculateNetDemandQuery,
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPriceAgreementsQuery,
  useCreateVendorPriceAgreementMutation,
  useUpdateVendorPriceAgreementMutation,
  useDeleteVendorPriceAgreementMutation,
  useGetPurchaseConfigQuery,
  useUpdatePurchaseConfigMutation,
  useUploadDirectToS3Mutation,
  useGetRfqsQuery,
  useGetQuotationsQuery,
  useGetBillsQuery,
  useCreateRfqMutation,
  useCreateQuotationMutation,
  useCreateBillMutation
} = purchaseApi;
