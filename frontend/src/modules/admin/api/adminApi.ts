import { apiSlice } from '../../../store/apiSlice';

export const adminApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<any, any>({
      query: (params) => ({
        url: '/admin/users',
        params
      }),
      providesTags: ['User']
    }),

    createUser: builder.mutation<any, any>({
      query: (body) => ({
        url: '/admin/users',
        method: 'POST',
        body
      }),
      invalidatesTags: ['User', 'AuditLog']
    }),

    updateUser: builder.mutation<any, any>({
      query: ({ id, ...body }) => ({
        url: `/admin/users/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['User', 'AuditLog', 'Session']
    }),

    getUserPreview: builder.query<any, string>({
      query: (id) => `/admin/users/${id}/preview`,
      providesTags: (result, error, id) => [{ type: 'User' as const, id }]
    }),

    toggleUserStatus: builder.mutation<any, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/admin/users/${id}/status`,
        method: 'PATCH',
        body: { status }
      }),
      invalidatesTags: ['User', 'AuditLog', 'Session']
    }),

    getRoles: builder.query<any, void>({
      query: () => '/admin/roles',
      providesTags: ['Role']
    }),

    createRole: builder.mutation<any, any>({
      query: (body) => ({
        url: '/admin/roles',
        method: 'POST',
        body
      }),
      invalidatesTags: ['Role', 'AuditLog']
    }),

    updateRolePermissions: builder.mutation<any, any>({
      query: ({ id, ...body }) => ({
        url: `/admin/roles/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['Role', 'AuditLog', 'User']
    }),

    getActiveSessions: builder.query<any, void>({
      query: () => '/admin/users/sessions/active',
      providesTags: ['Session']
    }),

    terminateSession: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/users/sessions/${id}/terminate`,
        method: 'POST'
      }),
      invalidatesTags: ['Session', 'User', 'AuditLog']
    }),

    sendHeartbeat: builder.mutation<any, { currentActiveTab?: string }>({
      query: (body) => ({
        url: '/admin/users/heartbeat',
        method: 'POST',
        body
      })
    }),

    getAuditLogs: builder.query<any, any>({
      query: (params) => ({
        url: '/admin/audit-logs',
        params
      }),
      providesTags: ['AuditLog']
    })
  })
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetUserPreviewQuery,
  useLazyGetUserPreviewQuery,
  useToggleUserStatusMutation,
  useGetRolesQuery,
  useCreateRoleMutation,
  useUpdateRolePermissionsMutation,
  useGetActiveSessionsQuery,
  useTerminateSessionMutation,
  useSendHeartbeatMutation,
  useGetAuditLogsQuery
} = adminApi;
