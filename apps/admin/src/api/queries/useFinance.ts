import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import {
  FinancialSummary,
  TransactionQueryParams,
  TransactionsResponse,
  WalletTransaction,
} from '../../types';

export const useFinancialSummaryQuery = (tenantId?: string | null) => {
  return useQuery<FinancialSummary>({
    queryKey: ['financialSummary', tenantId],
    queryFn: () => api.getFinancialSummary(tenantId),
  });
};

export const useWalletTransactionsQuery = (
  params?: TransactionQueryParams | string | null
) => {
  const resolvedParams: TransactionQueryParams | undefined =
    typeof params === 'string'
      ? { tenantId: params }
      : params ?? undefined;

  return useQuery<WalletTransaction[] & TransactionsResponse>({
    queryKey: ['financialTransactions', params],
    queryFn: () => api.getWalletTransactions(resolvedParams),
  });
};
