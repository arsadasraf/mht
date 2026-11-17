import { apiSlice } from '../../../store/apiSlice';

export const storeApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query({
      query: (params) => ({
        url: '/store/inventory',
        params
      }),
      providesTags: ['Inventory']
    }),
    createGrn: builder.mutation({
      query: (data) => ({
        url: '/store/grn',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['Inventory']
    }),
    getMaterialRequests: builder.query({
      query: (params) => ({
        url: '/store/wip/material-requests',
        params
      }),
      providesTags: ['MaterialRequest']
    }),
    createMaterialRequest: builder.mutation({
      query: (data) => ({
        url: '/store/wip/material-requests',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['MaterialRequest']
    }),
    issueMaterialRequest: builder.mutation({
      query: ({ id, items, notes }) => ({
        url: `/store/wip/material-requests/${id}/issue`,
        method: 'POST',
        body: { items, notes }
      }),
      invalidatesTags: ['MaterialRequest', 'Inventory']
    }),
    getWorkOrderBomItems: builder.query<any, string>({
      query: (projectId) => `/store/wip/work-orders/${projectId}/items`,
      providesTags: ['Inventory', 'Project']
    }),
    getWorkOrderWipSummary: builder.query<any, { status?: string; search?: string } | void>({
      query: (params) => ({
        url: '/store/wip/work-orders',
        params: params || {}
      }),
      providesTags: ['MaterialRequest', 'Inventory']
    }),
    completeWorkOrderWip: builder.mutation<any, { projectId: string; mrIds?: string[]; notes?: string }>({
      query: ({ projectId, ...body }) => ({
        url: `/store/wip/work-orders/${projectId}/complete`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['MaterialRequest', 'Inventory']
    }),
    consumeMaterialRequest: builder.mutation<any, { id: string; notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/store/wip/material-requests/${id}/consume`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['MaterialRequest', 'Inventory']
    }),
    updateMaterialRequest: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...data }) => ({
        url: `/store/wip/material-requests/${id}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: ['MaterialRequest', 'Inventory']
    }),
    deleteMaterialRequest: builder.mutation<any, string>({
      query: (id) => ({
        url: `/store/wip/material-requests/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['MaterialRequest', 'Inventory']
    }),
    getWipInventory: builder.query({
      query: (params) => ({
        url: '/store/wip/inventory',
        params
      }),
      providesTags: ['WipInventory']
    }),
    returnWipMaterial: builder.mutation({
      query: (data) => ({
        url: '/store/wip/return',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['WipInventory', 'Inventory']
    }),
    getDeliveryChallans: builder.query({
      query: (params) => ({
        url: '/store/dc',
        params
      }),
      providesTags: ['DeliveryChallan']
    }),
    createDeliveryChallan: builder.mutation({
      query: (data) => ({
        url: '/store/dc',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['DeliveryChallan']
    }),
    markDcReturned: builder.mutation({
      query: ({ id, returnNotes, returnedItems }) => ({
        url: `/store/dc/${id}/return`,
        method: 'POST',
        body: { returnNotes, returnedItems }
      }),
      invalidatesTags: ['DeliveryChallan', 'Inventory']
    }),
    getStoreMasters: builder.query({
      query: (params) => ({
        url: '/store/masters',
        params
      }),
      providesTags: ['StoreMaster']
    }),
    createStoreMaster: builder.mutation({
      query: (data) => ({
        url: '/store/masters',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['StoreMaster']
    }),
    getStoreConfig: builder.query({
      query: () => '/store/config',
      providesTags: ['StoreMaster']
    }),
    updateStoreConfig: builder.mutation({
      query: (body) => ({
        url: '/store/config',
        method: 'PUT',
        body
      }),
      invalidatesTags: ['StoreMaster']
    }),
    getStoreLocations: builder.query({
      query: (params) => ({
        url: '/store/locations',
        params
      }),
      providesTags: ['StoreMaster']
    }),
    createStoreLocation: builder.mutation({
      query: (body) => ({
        url: '/store/locations',
        method: 'POST',
        body
      }),
      invalidatesTags: ['StoreMaster']
    }),
    updateStoreLocation: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/store/locations/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['StoreMaster']
    }),
    deleteStoreLocation: builder.mutation({
      query: (id) => ({
        url: `/store/locations/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['StoreMaster']
    }),
    assignItemLocation: builder.mutation({
      query: (body) => ({
        url: '/store/inventory/assign-location',
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['Inventory']
    }),
    getNextGrnNumber: builder.query({
      query: () => '/store/grn/next-number',
      providesTags: ['StoreMaster']
    }),
    getOpenPurchaseOrders: builder.query({
      query: (params) => ({
        url: '/store/open-pos',
        params
      }),
      providesTags: ['PurchaseOrder']
    }),
    getGrnRecords: builder.query({
      query: (params) => ({
        url: '/store/grn',
        params
      }),
      providesTags: ['Inventory', 'StoreMaster']
    }),
    getGrnById: builder.query({
      query: (id) => `/store/grn/${id}`,
      providesTags: ['Inventory']
    }),
    updateGrn: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/store/grn/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Inventory', 'StoreMaster', 'PurchaseOrder']
    }),
    deleteGrn: builder.mutation({
      query: (id) => ({
        url: `/store/grn/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Inventory', 'StoreMaster', 'PurchaseOrder']
    })
  })
});

export const {
  useGetInventoryQuery,
  useCreateGrnMutation,
  useGetGrnRecordsQuery,
  useGetGrnByIdQuery,
  useUpdateGrnMutation,
  useDeleteGrnMutation,
  useGetMaterialRequestsQuery,
  useCreateMaterialRequestMutation,
  useIssueMaterialRequestMutation,
  useUpdateMaterialRequestMutation,
  useDeleteMaterialRequestMutation,
  useGetWorkOrderBomItemsQuery,
  useGetWorkOrderWipSummaryQuery,
  useCompleteWorkOrderWipMutation,
  useConsumeMaterialRequestMutation,
  useGetWipInventoryQuery,
  useReturnWipMaterialMutation,
  useGetDeliveryChallansQuery,
  useCreateDeliveryChallanMutation,
  useMarkDcReturnedMutation,
  useGetStoreMastersQuery,
  useCreateStoreMasterMutation,
  useGetStoreConfigQuery,
  useUpdateStoreConfigMutation,
  useGetStoreLocationsQuery,
  useCreateStoreLocationMutation,
  useUpdateStoreLocationMutation,
  useDeleteStoreLocationMutation,
  useAssignItemLocationMutation,
  useGetNextGrnNumberQuery,
  useGetOpenPurchaseOrdersQuery
} = storeApi;

