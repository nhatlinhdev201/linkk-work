import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { TenantSettings } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';
import { useToast } from '../../components/feedback/ToastContext';

export const useTenantSettingsQuery = (tenantId: string) => {
  return useQuery<TenantSettings>({
    queryKey: QUERY_KEYS.tenantSettings(tenantId),
    queryFn: () => api.getTenantSettings(tenantId),
    enabled: Boolean(tenantId),
  });
};

export const useUpdateTenantSettingsMutation = (tenantId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    TenantSettings,
    Error,
    Partial<TenantSettings>,
    { previousSettings?: TenantSettings }
  >({
    mutationFn: async (updates) => {
      return api.updateTenantSettings(tenantId, updates);
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({
        queryKey: QUERY_KEYS.tenantSettings(tenantId),
      });

      const previousSettings = queryClient.getQueryData<TenantSettings>(
        QUERY_KEYS.tenantSettings(tenantId)
      );

      // Optimistic update
      queryClient.setQueryData<TenantSettings>(
        QUERY_KEYS.tenantSettings(tenantId),
        (old) => {
          if (!old) return old;
          return { ...old, ...updates };
        }
      );

      return { previousSettings };
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Lưu cài đặt thành công!',
        message: 'Các tham số vận hành của Tenant đã được áp dụng ngay lập tức.',
      });
    },
    onError: (err, _updates, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(
          QUERY_KEYS.tenantSettings(tenantId),
          context.previousSettings
        );
      }
      toast({
        type: 'error',
        title: 'Lưu cài đặt thất bại',
        message: err.message || 'Không thể lưu cài đặt.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.tenantSettings(tenantId),
      });
    },
  });
};
