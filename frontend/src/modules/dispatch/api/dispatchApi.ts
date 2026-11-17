import { apiSlice } from '../../../store/apiSlice';

export const dispatchApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDispatchTeam: builder.query<any, { search?: string; designation?: string; department?: string; includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/dispatch/masters/team',
        params: params || {}
      }),
      providesTags: ['User', 'Role']
    }),
    createDispatchTeamMember: builder.mutation<any, any>({
      query: (body) => ({
        url: '/dispatch/masters/team',
        method: 'POST',
        body
      }),
      invalidatesTags: ['User', 'Role']
    }),
    updateDispatchTeamMember: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/dispatch/masters/team/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['User', 'Role']
    }),
    deleteDispatchTeamMember: builder.mutation<any, string>({
      query: (id) => ({
        url: `/dispatch/masters/team/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['User', 'Role']
    }),
    getDispatchSubStages: builder.query<any, { includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/dispatch/masters/sub-stages',
        params: params || {}
      }),
      providesTags: ['Milestone']
    }),
    createDispatchSubStage: builder.mutation<any, any>({
      query: (body) => ({
        url: '/dispatch/masters/sub-stages',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    updateDispatchSubStage: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/dispatch/masters/sub-stages/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    deleteDispatchSubStage: builder.mutation<any, string>({
      query: (id) => ({
        url: `/dispatch/masters/sub-stages/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Milestone']
    })
  })
});

export const {
  useGetDispatchTeamQuery,
  useCreateDispatchTeamMemberMutation,
  useUpdateDispatchTeamMemberMutation,
  useDeleteDispatchTeamMemberMutation,
  useGetDispatchSubStagesQuery,
  useCreateDispatchSubStageMutation,
  useUpdateDispatchSubStageMutation,
  useDeleteDispatchSubStageMutation
} = dispatchApi;
