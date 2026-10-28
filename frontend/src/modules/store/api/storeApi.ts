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
    getAllocations: builder.query({
      query: (params) => ({
        url: '/store/allocations',
        params
      }),
      providesTags: ['Allocation']
    }),
    requestTransfer: builder.mutation({
      query: ({ id, targetProjectId, justification }) => ({
        url: `/store/allocations/${id}/request-transfer`,
        method: 'POST',
        body: { targetProjectId, justification }
      }),
      invalidatesTags: ['Allocation', 'Inventory']
    }),
    approveTransfer: builder.mutation({
      query: ({ id, approved, notes }) => ({
        url: `/store/allocations/${id}/approve-transfer`,
        method: 'POST',
        body: { approved, notes }
      }),
      invalidatesTags: ['Allocation', 'Inventory']
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
    })
  })
});

export const {
  useGetInventoryQuery,
  useGetAllocationsQuery,
  useRequestTransferMutation,
  useApproveTransferMutation,
  useCreateGrnMutation,
  useGetMaterialRequestsQuery,
  useCreateMaterialRequestMutation,
  useIssueMaterialRequestMutation,
  useGetWipInventoryQuery,
  useReturnWipMaterialMutation,
  useGetDeliveryChallansQuery,
  useCreateDeliveryChallanMutation,
  useMarkDcReturnedMutation,
  useGetStoreMastersQuery,
  useCreateStoreMasterMutation
} = storeApi;

