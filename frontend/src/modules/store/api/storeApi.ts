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
    })
  })
});

export const {
  useGetInventoryQuery,
  useGetAllocationsQuery,
  useRequestTransferMutation,
  useApproveTransferMutation
} = storeApi;
