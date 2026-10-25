import { apiSlice } from '../../../store/apiSlice';
import {
  Lead,
  CustomerPo,
  Quotation,
  CrmMasters,
  CrmOverviewSummary,
  GetLeadsParams,
  GetCustomerPosParams,
  Customer,
  GetCustomersParams
} from '../types';

export const crmApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Overview & Forecast
    getCrmOverview: builder.query<{ success: boolean; overview: CrmOverviewSummary }, Record<string, unknown> | void>({
      query: (params) => ({
        url: '/crm/leads/overview',
        params: params || undefined
      }),
      providesTags: ['Lead', 'Quotation']
    }),

    // Leads & Inquiries
    getLeads: builder.query<{ success: boolean; leads: Lead[]; total: number; page: number }, GetLeadsParams | void>({
      query: (params) => ({
        url: '/crm/leads',
        params: params || undefined
      }),
      providesTags: (result) =>
        result?.leads
          ? [
              ...result.leads.map(({ _id }) => ({ type: 'Lead' as const, id: _id })),
              { type: 'Lead' as const, id: 'LIST' }
            ]
          : [{ type: 'Lead' as const, id: 'LIST' }]
    }),

    createLead: builder.mutation<{ success: boolean; lead: Lead }, Partial<Lead>>({
      query: (body) => ({
        url: '/crm/leads',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }]
    }),

    updateLead: builder.mutation<{ success: boolean; lead: Lead }, { id: string } & Partial<Lead>>({
      query: ({ id, ...body }) => ({
        url: `/crm/leads/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' }
      ]
    }),

    updateLeadStage: builder.mutation<{ success: boolean; lead: Lead }, { id: string; stage: string; lossReason?: string; notes?: string }>({
      query: ({ id, ...body }) => ({
        url: `/crm/leads/${id}/stage`,
        method: 'PATCH',
        body
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Lead', id },
        { type: 'Lead', id: 'LIST' }
      ]
    }),

    bulkImportLeads: builder.mutation<any, { rows?: any[]; leads?: any[]; dryRun?: boolean; defaultSource?: string }>({
      query: (body) => ({
        url: '/crm/leads/bulk-import',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }]
    }),

    deleteLead: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/crm/leads/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'Lead', id: 'LIST' }]
    }),

    // Quotations & Deals
    getQuotations: builder.query<{ success: boolean; quotations: Quotation[] }, Record<string, unknown> | void>({
      query: (params) => ({
        url: '/crm/deals',
        params: params || undefined
      }),
      providesTags: (result) =>
        result?.quotations
          ? [
              ...result.quotations.map(({ _id }) => ({ type: 'Quotation' as const, id: _id })),
              { type: 'Quotation' as const, id: 'LIST' }
            ]
          : [{ type: 'Quotation' as const, id: 'LIST' }]
    }),

    getQuotationById: builder.query<{ success: boolean; quotation: Quotation }, string>({
      query: (id) => `/crm/deals/${id}`,
      providesTags: (result, error, id) => [{ type: 'Quotation', id }]
    }),

    createQuotation: builder.mutation<{ success: boolean; quotation: Quotation }, Partial<Quotation>>({
      query: (body) => ({
        url: '/crm/deals',
        method: 'POST',
        body
      }),
      invalidatesTags: [
        { type: 'Quotation', id: 'LIST' },
        { type: 'Lead', id: 'LIST' }
      ]
    }),

    updateQuotation: builder.mutation<{ success: boolean; quotation: Quotation }, { id: string } & Partial<Quotation>>({
      query: ({ id, ...body }) => ({
        url: `/crm/deals/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' }
      ]
    }),

    convertQuotationToProject: builder.mutation<{ success: boolean; project: unknown }, { id: string; targetDispatchDate?: string }>({
      query: ({ id, ...body }) => ({
        url: `/crm/deals/${id}/convert-po`,
        method: 'POST',
        body
      }),
      invalidatesTags: [
        { type: 'Quotation', id: 'LIST' },
        { type: 'Lead', id: 'LIST' },
        { type: 'Project', id: 'LIST' },
        { type: 'Milestone', id: 'LIST' }
      ]
    }),

    // CRM Masters & Presets
    getCrmMasters: builder.query<{ success: boolean; masters: CrmMasters }, void>({
      query: () => '/crm/masters',
      providesTags: ['CrmMaster']
    }),

    updateCrmMasters: builder.mutation<{ success: boolean; masters: CrmMasters }, Partial<CrmMasters>>({
      query: (body) => ({
        url: '/crm/masters',
        method: 'PUT',
        body
      }),
      invalidatesTags: ['CrmMaster']
    }),

    testLeadSourceConnection: builder.mutation<{ success: boolean; message: string }, string>({
      query: (slug) => ({
        url: `/crm/masters/sources/${slug}/test-connection`,
        method: 'POST'
      }),
      invalidatesTags: ['CrmMaster']
    }),

    deleteProductFromMaster: builder.mutation<{ success: boolean; message: string; machines: unknown[] }, string>({
      query: (idOrCode) => ({
        url: `/crm/masters/machines/${idOrCode}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['CrmMaster']
    }),

    deleteAllProductsFromMaster: builder.mutation<{ success: boolean; message: string; machines: unknown[] }, void>({
      query: () => ({
        url: '/crm/masters/machines',
        method: 'DELETE'
      }),
      invalidatesTags: ['CrmMaster']
    }),

    // Customer Purchase Orders (Customer POs)
    getCustomerPos: builder.query<{ success: boolean; customerPos: CustomerPo[]; total: number; page: number }, GetCustomerPosParams | void>({
      query: (params) => ({
        url: '/crm/customer-pos',
        params: params || undefined
      }),
      providesTags: (result) =>
        result?.customerPos
          ? [
              ...result.customerPos.map(({ _id }) => ({ type: 'CustomerPo' as const, id: _id })),
              { type: 'CustomerPo' as const, id: 'LIST' }
            ]
          : [{ type: 'CustomerPo' as const, id: 'LIST' }]
    }),

    getCustomerPoById: builder.query<{ success: boolean; customerPo: CustomerPo }, string>({
      query: (id) => `/crm/customer-pos/${id}`,
      providesTags: (result, error, id) => [{ type: 'CustomerPo', id }]
    }),

    createCustomerPo: builder.mutation<{ success: boolean; customerPo: CustomerPo }, Partial<CustomerPo>>({
      query: (body) => ({
        url: '/crm/customer-pos',
        method: 'POST',
        body
      }),
      invalidatesTags: [
        { type: 'CustomerPo', id: 'LIST' },
        { type: 'Lead', id: 'LIST' },
        { type: 'Quotation', id: 'LIST' }
      ]
    }),

    updateCustomerPo: builder.mutation<{ success: boolean; customerPo: CustomerPo }, { id: string } & Partial<CustomerPo>>({
      query: ({ id, ...body }) => ({
        url: `/crm/customer-pos/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'CustomerPo', id },
        { type: 'CustomerPo', id: 'LIST' }
      ]
    }),

    convertCustomerPoToProject: builder.mutation<{ success: boolean; project: unknown; customerPo: CustomerPo }, { id: string } & Record<string, unknown>>({
      query: ({ id, ...body }) => ({
        url: `/crm/customer-pos/${id}/convert-project`,
        method: 'POST',
        body
      }),
      invalidatesTags: [
        { type: 'CustomerPo', id: 'LIST' },
        { type: 'Lead', id: 'LIST' },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Project', id: 'LIST' },
        { type: 'Milestone', id: 'LIST' }
      ]
    }),

    // AWS S3 Presigned URL Helpers
    getS3PresignedUpload: builder.query<{ success: boolean; url: string; key: string; expiresIn: number; bucket: string }, { key: string; contentType?: string; expiresIn?: number }>({
      query: (params) => ({
        url: '/s3/presigned-upload',
        params
      })
    }),

    getS3PresignedDownload: builder.query<{ success: boolean; url: string; key: string; expiresIn: number }, { key: string; expiresIn?: number }>({
      query: (params) => ({
        url: '/s3/presigned-download',
        params
      })
    }),

    uploadDirectToS3: builder.mutation<{ success: boolean; key: string }, { key: string; contentType?: string; fileData?: string }>({
      query: (body) => ({
        url: '/s3/direct-upload',
        method: 'POST',
        body
      })
    }),

    // Category Management
    addCategory: builder.mutation<{ success: boolean; categories: any[] }, { name: string; description?: string }>({
      query: (body) => ({
        url: '/crm/masters/categories',
        method: 'POST',
        body
      }),
      invalidatesTags: ['CrmMaster']
    }),

    updateCategory: builder.mutation<{ success: boolean; categories: any[] }, { id: string; name?: string; description?: string }>({
      query: ({ id, ...body }) => ({
        url: `/crm/masters/categories/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: ['CrmMaster']
    }),

    deleteCategory: builder.mutation<{ success: boolean; categories: any[] }, string>({
      query: (id) => ({
        url: `/crm/masters/categories/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['CrmMaster']
    }),

    // Customer Master Endpoints
    getCustomers: builder.query<{ success: boolean; customers: Customer[]; total: number; page?: number; pages?: number }, GetCustomersParams | void>({
      query: (params) => ({
        url: '/crm/customers',
        params: params || undefined
      }),
      providesTags: (result) =>
        result?.customers
          ? [
              ...result.customers.map(({ _id }) => ({ type: 'Customer' as const, id: _id })),
              { type: 'Customer' as const, id: 'LIST' }
            ]
          : [{ type: 'Customer' as const, id: 'LIST' }]
    }),

    getCustomerById: builder.query<{ success: boolean; customer: Customer }, string>({
      query: (id) => ({
        url: `/crm/customers/${id}`
      }),
      providesTags: (result, error, id) => [{ type: 'Customer', id }]
    }),

    createCustomer: builder.mutation<{ success: boolean; message: string; customer: Customer }, Partial<Customer>>({
      query: (body) => ({
        url: '/crm/customers',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }]
    }),

    updateCustomer: builder.mutation<{ success: boolean; message: string; customer: Customer }, { id: string } & Partial<Customer>>({
      query: ({ id, ...body }) => ({
        url: `/crm/customers/${id}`,
        method: 'PUT',
        body
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Customer', id },
        { type: 'Customer', id: 'LIST' }
      ]
    }),

    deleteCustomer: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/crm/customers/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }]
    }),

    deleteAllCustomers: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/crm/customers',
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }]
    }),

    bulkImportCustomers: builder.mutation<{ success: boolean; message: string; importedCount: number; skippedCount: number; errors?: Array<{ row: number; error: string }> }, { customers: Partial<Customer>[] }>({
      query: (body) => ({
        url: '/crm/customers/bulk-import',
        method: 'POST',
        body
      }),
      invalidatesTags: [{ type: 'Customer', id: 'LIST' }]
    })
  })
});

export const {
  useGetCrmOverviewQuery,
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useUpdateLeadStageMutation,
  useBulkImportLeadsMutation,
  useDeleteLeadMutation,
  useGetQuotationsQuery,
  useGetQuotationByIdQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useConvertQuotationToProjectMutation,
  useGetCrmMastersQuery,
  useUpdateCrmMastersMutation,
  useDeleteProductFromMasterMutation,
  useDeleteAllProductsFromMasterMutation,
  useTestLeadSourceConnectionMutation,
  useGetCustomerPosQuery,
  useGetCustomerPoByIdQuery,
  useCreateCustomerPoMutation,
  useUpdateCustomerPoMutation,
  useConvertCustomerPoToProjectMutation,
  useLazyGetS3PresignedUploadQuery,
  useLazyGetS3PresignedDownloadQuery,
  useUploadDirectToS3Mutation,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useDeleteAllCustomersMutation,
  useBulkImportCustomersMutation
} = crmApi;
