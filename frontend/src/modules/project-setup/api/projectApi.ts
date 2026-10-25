import { apiSlice } from '../../../store/apiSlice';

export const projectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: (params) => ({
        url: '/project-setup/projects',
        params
      }),
      providesTags: ['Project']
    }),
    getProjectById: builder.query({
      query: (id) => `/project-setup/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Project', id }]
    }),
    createProject: builder.mutation({
      query: (body) => ({
        url: '/project-setup/projects',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Project']
    }),
    getMilestones: builder.query({
      query: (projectId) => `/project-setup/milestones/project/${projectId}`,
      providesTags: ['Milestone']
    }),
    updateMilestone: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/project-setup/milestones/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Milestone', 'Project']
    })
  })
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useGetMilestonesQuery,
  useUpdateMilestoneMutation
} = projectApi;
