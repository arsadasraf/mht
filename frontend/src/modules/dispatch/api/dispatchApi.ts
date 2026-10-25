import { apiSlice } from '../../../store/apiSlice';

export const dispatchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDispatchOrders: builder.query({
      query: (params) => ({
        url: '/dispatch',
        params
      }),
      providesTags: ['DispatchOrder']
    }),
    verifyZeroSnags: builder.query({
      query: (projectId) => `/dispatch/zero-snag/${projectId}`,
      providesTags: ['DispatchOrder', 'MachineTrial']
    }),
    issueGatePass: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/dispatch/${id}/issue-gate-pass`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['DispatchOrder', 'Project']
    })
  })
});

export const {
  useGetDispatchOrdersQuery,
  useVerifyZeroSnagsQuery,
  useIssueGatePassMutation
} = dispatchApi;
