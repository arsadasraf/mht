import { apiSlice } from '../../../store/apiSlice';

export const productionTrialApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAssemblyStages: builder.query({
      query: (params) => ({
        url: '/production-trial/assembly',
        params
      }),
      providesTags: ['AssemblyStage']
    }),
    updateAssemblyStage: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/production-trial/assembly/${id}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['AssemblyStage', 'Project']
    }),
    getMachineTrials: builder.query({
      query: (params) => ({
        url: '/production-trial/trials',
        params
      }),
      providesTags: ['MachineTrial']
    }),
    updateSnagStatus: builder.mutation({
      query: ({ trialId, snagId, ...body }) => ({
        url: `/production-trial/trials/${trialId}/snags/${snagId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['MachineTrial', 'DispatchOrder', 'Project']
    })
  })
});

export const {
  useGetAssemblyStagesQuery,
  useUpdateAssemblyStageMutation,
  useGetMachineTrialsQuery,
  useUpdateSnagStatusMutation
} = productionTrialApi;
