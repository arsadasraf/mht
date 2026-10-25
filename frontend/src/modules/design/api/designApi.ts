import { apiSlice } from '../../../store/apiSlice';

export const designApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBomByProject: builder.query({
      query: (projectId) => `/design/bom/project/${projectId}`,
      providesTags: ['Bom']
    }),
    getDrawings: builder.query({
      query: (params) => ({
        url: '/design/drawings',
        params
      }),
      providesTags: ['Drawing']
    }),
    getDrawingViewUrl: builder.query({
      query: (id) => `/design/drawings/${id}/view`
    }),
    getEcos: builder.query({
      query: (params) => ({
        url: '/design/eco',
        params
      }),
      providesTags: ['Eco']
    }),
    approveEco: builder.mutation({
      query: ({ id, approvalNotes }) => ({
        url: `/design/eco/${id}/approve-freeze`,
        method: 'POST',
        body: { approvalNotes }
      }),
      invalidatesTags: ['Eco', 'Bom', 'Project']
    })
  })
});

export const {
  useGetBomByProjectQuery,
  useGetDrawingsQuery,
  useGetDrawingViewUrlQuery,
  useGetEcosQuery,
  useApproveEcoMutation
} = designApi;
