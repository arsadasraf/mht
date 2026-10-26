import { apiSlice } from '../../../store/apiSlice';

export const qualityApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGateEntries: builder.query({
      query: (params) => ({
        url: '/quality/gate-entry',
        params
      }),
      providesTags: ['GateEntry']
    }),
    createGateEntry: builder.mutation({
      query: (body) => ({
        url: '/quality/gate-entry',
        method: 'POST',
        body
      }),
      invalidatesTags: ['GateEntry']
    }),
    getInspections: builder.query({
      query: (params) => ({
        url: '/quality/inspections',
        params
      }),
      providesTags: ['QcInspection']
    }),
    createInspection: builder.mutation({
      query: (body) => ({
        url: '/quality/inspections',
        method: 'POST',
        body
      }),
      invalidatesTags: ['QcInspection', 'GateEntry', 'Inventory', 'Allocation']
    }),
    getProcessInspections: builder.query({
      query: (params) => ({
        url: '/quality/process',
        params
      }),
      providesTags: ['QcInspection']
    }),
    getPdiInspections: builder.query({
      query: (params) => ({
        url: '/quality/pdi',
        params
      }),
      providesTags: ['QcInspection']
    }),
    getQualityMasters: builder.query({
      query: (params) => ({
        url: '/quality/masters',
        params
      }),
      providesTags: ['MasterLookup']
    })
  })
});

export const {
  useGetGateEntriesQuery,
  useCreateGateEntryMutation,
  useGetInspectionsQuery,
  useCreateInspectionMutation,
  useGetProcessInspectionsQuery,
  useGetPdiInspectionsQuery,
  useGetQualityMastersQuery
} = qualityApi;
