import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { Tasker } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';

export const useTaskersQuery = (tenantId?: string | null) => {
  return useQuery<Tasker[]>({
    queryKey: QUERY_KEYS.taskers(tenantId),
    queryFn: () => api.getTaskers(tenantId),
  });
};
