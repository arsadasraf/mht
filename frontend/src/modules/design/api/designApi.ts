import { apiSlice } from '../../../store/apiSlice';

export const designApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDesignMasters: builder.query({
      query: (params) => ({
        url: '/design/masters',
        params
      }),
      providesTags: ['DesignMaster']
    }),
    saveDesignMasterItem: builder.mutation({
      query: (body) => ({
        url: '/design/masters/item',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster', 'Bom']
    }),
    addDesignFileVersion: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/design/masters/item/${id}/version`,
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster', 'Drawing']
    }),
    deleteDesignMasterItem: builder.mutation({
      query: (id) => ({
        url: `/design/masters/item/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['DesignMaster']
    }),
    updateDesignMasterConfig: builder.mutation({
      query: (body) => ({
        url: '/design/masters/config',
        method: 'PUT',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    getBomByProject: builder.query({
      query: (projectId) => `/design/bom/project/${projectId}`,
      providesTags: ['Bom']
    }),
    saveBom: builder.mutation({
      query: (body) => ({
        url: '/design/bom',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Bom']
    }),
    attachAssemblyToProject: builder.mutation({
      query: (body) => ({
        url: '/design/bom/attach-assembly',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Bom', 'Project']
    }),
    getDrawings: builder.query({
      query: (params) => ({
        url: '/design/drawings',
        params
      }),
      providesTags: ['Drawing']
    }),
    registerDrawing: builder.mutation({
      query: (body) => ({
        url: '/design/drawings',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Drawing']
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
    createEco: builder.mutation({
      query: (body) => ({
        url: '/design/eco',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Eco']
    }),
    getDesignTeamUsers: builder.query<{ success: boolean; count: number; users: any[] }, void>({
      query: () => '/design/masters/team-users',
      providesTags: ['User']
    }),
    getDesignCategories: builder.query<{ success: boolean; count: number; categories: any[] }, { itemType?: string; search?: string; isActive?: boolean; includeInactive?: boolean } | void>({
      query: (params) => ({
        url: '/design/masters/categories',
        params: params || {}
      }),
      providesTags: ['DesignMaster']
    }),
    createDesignCategory: builder.mutation({
      query: (body) => ({
        url: '/design/masters/categories',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    updateDesignCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/design/masters/categories/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    deleteDesignCategory: builder.mutation({
      query: (id) => ({
        url: `/design/masters/categories/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['DesignMaster']
    }),
    getRmItems: builder.query<{ success: boolean; count: number; items: any[] }, { search?: string; category?: string; isActive?: boolean } | void>({
      query: (params) => ({
        url: '/design/masters/rm',
        params: params || {}
      }),
      providesTags: ['DesignMaster']
    }),
    createRmItem: builder.mutation({
      query: (body) => ({
        url: '/design/masters/rm',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    updateRmItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/design/masters/rm/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    deleteRmItem: builder.mutation({
      query: (id) => ({
        url: `/design/masters/rm/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['DesignMaster']
    }),
    getRmWhereUsed: builder.query<
      {
        success: boolean;
        item: any;
        bomCheck: { isAttached: boolean; count: number; attachments: any[] };
        txCheck: { hasTransactions: boolean; count: number; summary: string; details: any };
      },
      string
    >({
      query: (id) => `/design/masters/rm/${id}/where-used`,
      providesTags: ['DesignMaster']
    }),
    bulkImportRmItems: builder.mutation<
      {
        success: boolean;
        message: string;
        importedCount: number;
        skippedCount: number;
        skippedItems: Array<{ row: number; name: string; revision: string; reason: string }>;
        createdCategoriesCount?: number;
        createdCategories?: string[];
      },
      { items: any[] }
    >({
      query: (body) => ({
        url: '/design/masters/rm/bulk-import',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    getFgItems: builder.query<{ success: boolean; count: number; items: any[] }, { search?: string; classification?: string; category?: string; isActive?: boolean } | void>({
      query: (params) => ({
        url: '/design/masters/fg',
        params: params || {}
      }),
      providesTags: ['DesignMaster']
    }),
    createFgItem: builder.mutation({
      query: (body) => ({
        url: '/design/masters/fg',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    updateFgItem: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/design/masters/fg/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    createFgRevision: builder.mutation({
      query: ({ id, revision, changeNotes }) => ({
        url: `/design/masters/fg/${id}/revision`,
        method: 'POST',
        body: { revision, changeNotes }
      }),
      invalidatesTags: ['DesignMaster']
    }),
    deleteFgItem: builder.mutation({
      query: (id) => ({
        url: `/design/masters/fg/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['DesignMaster']
    }),
    getFgWhereUsed: builder.query<
      {
        success: boolean;
        item: any;
        bomCheck: { isAttached: boolean; count: number; attachments: any[] };
        txCheck: { hasTransactions: boolean; count: number; summary: string; details: any };
      },
      string
    >({
      query: (id) => `/design/masters/fg/${id}/where-used`,
      providesTags: ['DesignMaster']
    }),
    bulkImportFgItems: builder.mutation<
      {
        success: boolean;
        message: string;
        importedCount: number;
        skippedCount: number;
        skippedItems: Array<{ row: number; name: string; revision: string; reason: string }>;
        createdCategoriesCount?: number;
        createdCategories?: string[];
      },
      { items: any[] }
    >({
      query: (body) => ({
        url: '/design/masters/fg/bulk-import',
        method: 'POST',
        body
      }),
      invalidatesTags: ['DesignMaster']
    }),
    uploadDirectToS3: builder.mutation<
      { success: boolean; key: string; url?: string; message?: string },
      { key: string; contentType?: string; base64Data: string; fileData?: string }
    >({
      query: (body) => ({
        url: '/s3/direct-upload',
        method: 'POST',
        body
      })
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
  useGetDesignMastersQuery,
  useSaveDesignMasterItemMutation,
  useAddDesignFileVersionMutation,
  useDeleteDesignMasterItemMutation,
  useUpdateDesignMasterConfigMutation,
  useGetBomByProjectQuery,
  useSaveBomMutation,
  useAttachAssemblyToProjectMutation,
  useGetDrawingsQuery,
  useRegisterDrawingMutation,
  useGetDrawingViewUrlQuery,
  useGetEcosQuery,
  useCreateEcoMutation,
  useApproveEcoMutation,
  useGetDesignTeamUsersQuery,
  useGetDesignCategoriesQuery,
  useCreateDesignCategoryMutation,
  useUpdateDesignCategoryMutation,
  useDeleteDesignCategoryMutation,
  useGetRmItemsQuery,
  useCreateRmItemMutation,
  useUpdateRmItemMutation,
  useDeleteRmItemMutation,
  useGetRmWhereUsedQuery,
  useLazyGetRmWhereUsedQuery,
  useBulkImportRmItemsMutation,
  useGetFgItemsQuery,
  useCreateFgItemMutation,
  useUpdateFgItemMutation,
  useCreateFgRevisionMutation,
  useDeleteFgItemMutation,
  useGetFgWhereUsedQuery,
  useLazyGetFgWhereUsedQuery,
  useBulkImportFgItemsMutation,
  useUploadDirectToS3Mutation
} = designApi;
