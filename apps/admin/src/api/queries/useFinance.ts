import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { FinancialSummary, WalletTransaction } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';

export const useFinancialSummaryQuery = (tenantId?: string | null) => {
  return useQuery<FinancialSummary>({
    queryKey: QUERY_KEYS.financialSummary(tenantId),
    queryFn: () => api.getFinancialSummary(tenantId),
  });
};

export const useWalletTransactionsQuery = (tenantId?: string | null) => {
  return useQuery<WalletTransaction[]>({
    queryKey: QUERY_KEYS.financialTransactions(tenantId),
    queryFn: () => api.getWalletTransactions(tenantId),
  });
};
