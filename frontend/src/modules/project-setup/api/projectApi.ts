import { apiSlice } from '../../../store/apiSlice';

export const projectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<{ success: boolean; total: number; page: number; projects: any[] }, any>({
      query: (params) => ({
        url: '/project-setup/projects',
        params
      }),
      providesTags: ['Project']
    }),
    getAvailableCustomerPos: builder.query<{ success: boolean; count: number; customerPos: any[] }, void>({
      query: () => '/project-setup/projects/available-customer-pos',
      providesTags: ['CustomerPo', 'Project']
    }),
    getProjectById: builder.query<{ success: boolean; project: any; milestones: any[] }, string>({
      query: (id) => `/project-setup/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }]
    }),
    createProject: builder.mutation<{ success: boolean; message: string; project: any; milestonesCount: number }, any>({
      query: (body) => ({
        url: '/project-setup/projects',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Project', 'Milestone', 'CustomerPo']
    }),
    getMilestones: builder.query<{ success: boolean; count: number; milestones: any[] }, string>({
      query: (projectId) => `/project-setup/milestones/project/${projectId}`,
      providesTags: ['Milestone']
    }),
    createProjectMilestone: builder.mutation<any, { projectId: string; [key: string]: any }>({
      query: ({ projectId, ...body }) => ({
        url: `/project-setup/milestones/project/${projectId}`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    updateMilestoneStatus: builder.mutation<any, { id: string; status: string; remarkText?: string }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/milestones/${id}/status`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    addMilestoneRemark: builder.mutation<any, { id: string; text: string; authorName?: string; authorRole?: string }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/milestones/${id}/remarks`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['Milestone']
    }),
    updateMilestone: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/milestones/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    getStageMasters: builder.query<{ success: boolean; count: number; stages: any[] }, { includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/project-setup/stage-masters',
        params: params || undefined
      }),
      providesTags: ['StageMaster']
    }),
    createStageMaster: builder.mutation<any, any>({
      query: (body) => ({
        url: '/project-setup/stage-masters',
        method: 'POST',
        body
      }),
      invalidatesTags: ['StageMaster']
    }),
    updateStageMaster: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/stage-masters/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['StageMaster']
    }),
    deleteStageMaster: builder.mutation<any, string>({
      query: (id) => ({
        url: `/project-setup/stage-masters/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['StageMaster']
    })
  })
});

export const {
  useGetProjectsQuery,
  useGetAvailableCustomerPosQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useGetMilestonesQuery,
  useCreateProjectMilestoneMutation,
  useUpdateMilestoneStatusMutation,
  useAddMilestoneRemarkMutation,
  useUpdateMilestoneMutation,
  useGetStageMastersQuery,
  useCreateStageMasterMutation,
  useUpdateStageMasterMutation,
  useDeleteStageMasterMutation
} = projectApi;
