import { apiSlice } from '../../../store/apiSlice';

export const afterSalesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getServiceTickets: builder.query({
      query: (params) => ({
        url: '/after-sales/tickets',
        params
      }),
      providesTags: ['ServiceTicket']
    }),
    createServiceTicket: builder.mutation({
      query: (body) => ({
        url: '/after-sales/tickets',
        method: 'POST',
        body
      }),
      invalidatesTags: ['ServiceTicket']
    })
  })
});

export const {
  useGetServiceTicketsQuery,
  useCreateServiceTicketMutation
} = afterSalesApi;
