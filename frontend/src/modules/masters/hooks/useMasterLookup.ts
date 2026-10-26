'use client';

import { useGetMasterLookupQuery } from '../api/mastersApi';

/**
 * Universal Master Lookup Hook for the Entire Application
 * Used by CRM, Design, Purchase, Store, Quality, Production, etc.
 *
 * @param domains Optional array of domains to filter (e.g. ['vendors', 'uoms', 'currencies'])
 */
export function useMasterLookup(domains?: string[]) {
  const params = domains ? { domains: domains.join(',') } : undefined;
  const { data, isLoading, error, refetch } = useGetMasterLookupQuery(params);

  return {
    lookup: data?.lookup || {},
    vendors: data?.lookup?.vendors || [],
    customers: data?.lookup?.customers || [],
    locations: data?.lookup?.locations || [],
    categories: data?.lookup?.categories || [],
    rmItems: data?.lookup?.rmItems || [],
    boItems: data?.lookup?.boItems || [],
    components: data?.lookup?.components || [],
    subassemblies: data?.lookup?.subassemblies || [],
    assemblies: data?.lookup?.assemblies || [],
    uoms: data?.lookup?.uoms || [],
    currencies: data?.lookup?.currencies || [],
    taxSlabs: data?.lookup?.taxSlabs || [],
    company: data?.lookup?.company || {},
    isLoading,
    error,
    refetch
  };
}
