import { apiSlice } from '../../../store/apiSlice';

export const productionTrialApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProductionTeam: builder.query<any, { search?: string; designation?: string; department?: string; includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/production-trial/masters/team',
        params: params || {}
      }),
      providesTags: ['User', 'Role']
    }),
    createProductionTeamMember: builder.mutation<any, any>({
      query: (body) => ({
        url: '/production-trial/masters/team',
        method: 'POST',
        body
      }),
      invalidatesTags: ['User', 'Role']
    }),
    updateProductionTeamMember: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/production-trial/masters/team/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['User', 'Role']
    }),
    deleteProductionTeamMember: builder.mutation<any, string>({
      query: (id) => ({
        url: `/production-trial/masters/team/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['User', 'Role']
    }),
    getProductionSubStages: builder.query<any, { includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/production-trial/masters/sub-stages',
        params: params || {}
      }),
      providesTags: ['Milestone']
    }),
    createProductionSubStage: builder.mutation<any, any>({
      query: (body) => ({
        url: '/production-trial/masters/sub-stages',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    updateProductionSubStage: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/production-trial/masters/sub-stages/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    deleteProductionSubStage: builder.mutation<any, string>({
      query: (id) => ({
        url: `/production-trial/masters/sub-stages/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Milestone']
    })
  })
});

export const {
  useGetProductionTeamQuery,
  useCreateProductionTeamMemberMutation,
  useUpdateProductionTeamMemberMutation,
  useDeleteProductionTeamMemberMutation,
  useGetProductionSubStagesQuery,
  useCreateProductionSubStageMutation,
  useUpdateProductionSubStageMutation,
  useDeleteProductionSubStageMutation
} = productionTrialApi;
