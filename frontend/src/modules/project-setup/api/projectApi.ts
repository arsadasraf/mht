import { apiSlice } from '../../../store/apiSlice';

export const projectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<{ success: boolean; total: number; page: number; projects: any[] }, any>({
      query: (params) => ({
        url: '/project-setup/projects',
        params
      }),
      providesTags: ['Project', 'Bom']
    }),
    getProjectCostingDashboard: builder.query<{ success: boolean; summary: any; projects: any[] }, void>({
      query: () => '/project-setup/projects/costing',
      providesTags: ['Project', 'Bom', 'PurchaseOrder', 'Inventory', 'MaterialRequest', 'CustomerPo']
    }),
    updateProjectBomPrices: builder.mutation<
      { success: boolean; message: string; bom: any },
      { id: string; updates: Array<{ index?: number; itemId?: string; itemCode?: string; standardRateINR: number }> }
    >({
      query: ({ id, updates }) => ({
        url: `/project-setup/projects/${id}/bom-prices`,
        method: 'PATCH',
        body: { updates }
      }),
      invalidatesTags: ['Project', 'Bom']
    }),
    getAvailableCustomerPos: builder.query<{ success: boolean; count: number; customerPos: any[] }, void>({
      query: () => '/project-setup/projects/available-customer-pos',
      providesTags: ['CustomerPo', 'Project']
    }),
    getDepartmentUsers: builder.query<{ success: boolean; users: any[] }, void>({
      query: () => '/project-setup/projects/department-users',
      providesTags: ['User']
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
      invalidatesTags: ['Project', 'Milestone', 'CustomerPo', { type: 'CustomerPo', id: 'LIST' }, 'Lead', { type: 'Lead', id: 'LIST' }]
    }),
    approveProject: builder.mutation<{ success: boolean; message: string; project: any }, string>({
      query: (id) => ({
        url: `/project-setup/projects/${id}/approve`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Project', 'Milestone']
    }),
    updateProject: builder.mutation<{ success: boolean; message: string; project: any }, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/projects/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Project', 'Milestone', 'CustomerPo', { type: 'CustomerPo', id: 'LIST' }, 'Lead', { type: 'Lead', id: 'LIST' }]
    }),
    deleteProject: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/project-setup/projects/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Project', 'Milestone', 'CustomerPo', { type: 'CustomerPo', id: 'LIST' }, 'Lead', { type: 'Lead', id: 'LIST' }]
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
      invalidatesTags: ['Milestone', 'Project', 'CustomerPo', { type: 'CustomerPo', id: 'LIST' }]
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
    deleteMilestone: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/project-setup/milestones/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    addSubStageToMilestone: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/milestones/${id}/sub-stages`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    updateSubStage: builder.mutation<any, { subStageId: string; [key: string]: any }>({
      query: ({ subStageId, ...body }) => ({
        url: `/project-setup/milestones/sub-stages/${subStageId}`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    deleteSubStage: builder.mutation<any, string>({
      query: (subStageId) => ({
        url: `/project-setup/milestones/sub-stages/${subStageId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['Milestone', 'Project']
    }),
    getStageMasters: builder.query<
      { success: boolean; count: number; stages: any[]; subStages?: any[]; prefixLockPolicy?: any },
      { includeInactive?: boolean; departmentModule?: string } | void
    >({
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
    }),
    getSubStageMasters: builder.query<{ success: boolean; count: number; subStages: any[] }, { departmentModule?: string; parentStageCode?: string } | void>({
      query: (params) => ({
        url: '/project-setup/stage-masters/sub-stages',
        params: params || undefined
      }),
      providesTags: ['StageMaster']
    }),
    createSubStageMaster: builder.mutation<any, any>({
      query: (body) => ({
        url: '/project-setup/stage-masters/sub-stages',
        method: 'POST',
        body
      }),
      invalidatesTags: ['StageMaster']
    }),
    updateSubStageMaster: builder.mutation<any, { id: string; [key: string]: any }>({
      query: ({ id, ...body }) => ({
        url: `/project-setup/stage-masters/sub-stages/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['StageMaster']
    }),
    deleteSubStageMaster: builder.mutation<any, string>({
      query: (id) => ({
        url: `/project-setup/stage-masters/sub-stages/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['StageMaster']
    }),
    updateProjectSetupConfig: builder.mutation<any, any>({
      query: (body) => ({
        url: '/project-setup/stage-masters/config',
        method: 'PUT',
        body
      }),
      invalidatesTags: ['StageMaster', 'Project', 'Milestone']
    })
  })
});

export const {
  useGetProjectsQuery,
  useGetProjectCostingDashboardQuery,
  useUpdateProjectBomPricesMutation,
  useGetAvailableCustomerPosQuery,
  useGetDepartmentUsersQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useApproveProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetMilestonesQuery,
  useCreateProjectMilestoneMutation,
  useUpdateMilestoneStatusMutation,
  useAddMilestoneRemarkMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useAddSubStageToMilestoneMutation,
  useUpdateSubStageMutation,
  useDeleteSubStageMutation,
  useGetStageMastersQuery,
  useCreateStageMasterMutation,
  useUpdateStageMasterMutation,
  useDeleteStageMasterMutation,
  useGetSubStageMastersQuery,
  useCreateSubStageMasterMutation,
  useUpdateSubStageMasterMutation,
  useDeleteSubStageMasterMutation,
  useUpdateProjectSetupConfigMutation
} = projectApi;
