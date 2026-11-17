import { apiSlice } from '../../../store/apiSlice';

export const afterSalesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getServiceTickets: builder.query<any, any | void>({
      query: (params) => ({
        url: '/after-sales/tickets',
        params: params || {}
      }),
      providesTags: ['ServiceTicket']
    }),
    createServiceTicket: builder.mutation({
      query: (body) => ({
        url: '/after-sales/tickets',
        method: 'POST',
        body
      }),
      invalidatesTags: ['ServiceTicket']
    }),

    // Field Service & Commissioning Team
    getAfterSalesTeam: builder.query<any, { search?: string; designation?: string; department?: string; includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/after-sales/masters/team',
        params: params || {}
      }),
      providesTags: ['User', 'Role']
    }),
    createAfterSalesTeamMember: builder.mutation<any, any>({
      query: (body) => ({
        url: '/after-sales/masters/team',
        method: 'POST',
        body
      }),
      invalidatesTags: ['User', 'Role']
    }),
    updateAfterSalesTeamMember: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/after-sales/masters/team/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['User', 'Role']
    }),
    deleteAfterSalesTeamMember: builder.mutation<any, string>({
      query: (id) => ({
        url: `/after-sales/masters/team/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['User', 'Role']
    }),

    // Service Sub-Stages
    getAfterSalesSubStages: builder.query<any, { includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/after-sales/masters/sub-stages',
        params: params || {}
      }),
      providesTags: ['Milestone']
    }),
    createAfterSalesSubStage: builder.mutation<any, any>({
      query: (body) => ({
        url: '/after-sales/masters/sub-stages',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    updateAfterSalesSubStage: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/after-sales/masters/sub-stages/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    deleteAfterSalesSubStage: builder.mutation<any, string>({
      query: (id) => ({
        url: `/after-sales/masters/sub-stages/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Milestone']
    })
  })
});

export const {
  useGetServiceTicketsQuery,
  useCreateServiceTicketMutation,
  useGetAfterSalesTeamQuery,
  useCreateAfterSalesTeamMemberMutation,
  useUpdateAfterSalesTeamMemberMutation,
  useDeleteAfterSalesTeamMemberMutation,
  useGetAfterSalesSubStagesQuery,
  useCreateAfterSalesSubStageMutation,
  useUpdateAfterSalesSubStageMutation,
  useDeleteAfterSalesSubStageMutation
} = afterSalesApi;
