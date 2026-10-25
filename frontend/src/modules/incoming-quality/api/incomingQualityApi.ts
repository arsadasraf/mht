import { apiSlice } from '../../../store/apiSlice';

export const incomingQualityApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGateEntries: builder.query({
      query: (params) => ({
        url: '/incoming-quality/gate-entry',
        params
      }),
      providesTags: ['GateEntry']
    }),
    getInspections: builder.query({
      query: (params) => ({
        url: '/incoming-quality/inspections',
        params
      }),
      providesTags: ['QcInspection']
    }),
    createInspection: builder.mutation({
      query: (body) => ({
        url: '/incoming-quality/inspections',
        method: 'POST',
        body
      }),
      invalidatesTags: ['QcInspection', 'GateEntry', 'Inventory', 'Allocation']
    })
  })
});

export const {
  useGetGateEntriesQuery,
  useGetInspectionsQuery,
  useCreateInspectionMutation
} = incomingQualityApi;
