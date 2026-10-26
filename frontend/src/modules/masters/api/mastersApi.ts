import { apiSlice } from '../../../store/apiSlice';

export const mastersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Universal Tier 1 Read-Only Lookup for entire app
    getMasterLookup: builder.query({
      query: (params) => ({
        url: '/masters/lookup',
        params
      }),
      providesTags: ['MasterLookup']
    }),

    // Tier 2 Domain specific data
    getMasterDomain: builder.query({
      query: (domain: string) => `/masters/${domain}`,
      providesTags: (result, error, domain) => [{ type: 'MasterDomain' as const, id: domain }]
    }),

    createMasterEntity: builder.mutation({
      query: ({ domain, data }: { domain: string; data: any }) => ({
        url: `/masters/${domain}`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { domain }) => [
        { type: 'MasterDomain' as const, id: domain },
        'MasterLookup'
      ]
    })
  })
});

export const {
  useGetMasterLookupQuery,
  useGetMasterDomainQuery,
  useCreateMasterEntityMutation
} = mastersApi;
