import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 120_000, // 2 minutes: instant cached responses without re-fetching
      gcTime: 600_000, // 10 minutes cache lifetime in memory
      refetchOnWindowFocus: false, // Prevent unwanted background re-renders on tab switch
      retry: 1, // Max 1 retry on network failure
    },
    mutations: {
      retry: 0,
    },
  },
});

export const QUERY_KEYS = {
  currentUser: ['currentUser'] as const,
  tenants: ['tenants'] as const,
  tenant: (id: string) => ['tenants', id] as const,
  partnerApplications: ['partnerApplications'] as const,
  bookings: (tenantId?: string | null) => ['bookings', tenantId ?? 'all'] as const,
  taskers: (tenantId?: string | null) => ['taskers', tenantId ?? 'all'] as const,
  cronJobs: ['cronJobs'] as const,
  serviceCategories: ['serviceCategories'] as const,
  services: (tenantId?: string | null) => ['services', tenantId ?? 'all'] as const,
  financialSummary: (tenantId?: string | null) => ['financialSummary', tenantId ?? 'all'] as const,
  financialTransactions: (tenantId?: string | null) =>
    ['financialTransactions', tenantId ?? 'all'] as const,
  tenantSettings: (tenantId: string) => ['tenantSettings', tenantId] as const,
};
