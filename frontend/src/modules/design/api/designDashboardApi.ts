import { apiSlice } from '../../../store/apiSlice';

export const designDashboardApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEngineerPerformance: builder.query<any, { projectId?: string; engineerId?: string; month?: string } | void>({
      query: (params) => ({
        url: '/design/dashboard/engineer-performance',
        params: params || {}
      }),
      providesTags: ['DesignDashboard', 'Milestone']
    }),

    getActivityReports: builder.query<any, { projectId?: string } | void>({
      query: (params) => ({
        url: '/design/dashboard/activity-reports',
        params: params || {}
      }),
      providesTags: ['DesignDashboard', 'Drawing', 'Eco']
    }),

    getDocumentControl: builder.query<any, { projectId?: string; category?: string; search?: string } | void>({
      query: (params) => ({
        url: '/design/dashboard/document-control',
        params: params || {}
      }),
      providesTags: ['DesignDashboard', 'Drawing']
    }),

    releaseDrawing: builder.mutation<any, string>({
      query: (id) => ({
        url: `/design/dashboard/drawings/${id}/release`,
        method: 'POST'
      }),
      invalidatesTags: ['DesignDashboard', 'Drawing']
    }),

    createDrawingRevision: builder.mutation<any, any>({
      query: (body) => ({
        url: '/design/dashboard/revisions',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignDashboard', 'Drawing']
    })
  })
});

export const {
  useGetEngineerPerformanceQuery,
  useGetActivityReportsQuery,
  useGetDocumentControlQuery,
  useReleaseDrawingMutation,
  useCreateDrawingRevisionMutation
} = designDashboardApi;
