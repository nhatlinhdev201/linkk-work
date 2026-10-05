import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { ServiceItem, ServiceCategory } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';
import { useToast } from '../../components/feedback/ToastContext';

export const useServicesQuery = (tenantId?: string | null) => {
  return useQuery<ServiceItem[]>({
    queryKey: QUERY_KEYS.services(tenantId),
    queryFn: () => api.getServices(tenantId),
  });
};

export const useServiceCategoriesQuery = () => {
  return useQuery<ServiceCategory[]>({
    queryKey: QUERY_KEYS.serviceCategories,
    queryFn: () => api.getServiceCategories(),
  });
};

export const useToggleServiceMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceItem,
    Error,
    { serviceId: string; isActive: boolean },
    { previousServices?: ServiceItem[] }
  >({
    mutationFn: async ({ serviceId, isActive }) => {
      return api.toggleServiceActive(serviceId, isActive);
    },
    onMutate: async ({ serviceId, isActive }) => {
      // 1. Cancel queries
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.services(tenantId) });

      // 2. Snapshot
      const previousServices = queryClient.getQueryData<ServiceItem[]>(
        QUERY_KEYS.services(tenantId)
      );

      // 3. Optimistic update (0ms switch toggle!)
      queryClient.setQueryData<ServiceItem[]>(
        QUERY_KEYS.services(tenantId),
        (old) => {
          if (!old) return [];
          return old.map((s) =>
            s.id === serviceId ? { ...s, isActive } : s
          );
        }
      );

      return { previousServices };
    },
    onSuccess: (updated) => {
      toast({
        type: 'info',
        title: 'Cập nhật trạng thái',
        message: `Dịch vụ "${updated.name}" đã ${updated.isActive ? 'kích hoạt' : 'tạm ngưng'}.`,
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(
          QUERY_KEYS.services(tenantId),
          context.previousServices
        );
      }
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: err.message || 'Không thể thay đổi trạng thái dịch vụ.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services(tenantId) });
    },
  });
};

export const useCreateServiceMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceItem,
    Error,
    Omit<ServiceItem, 'id' | 'createdAt'>
  >({
    mutationFn: async (newServiceData) => {
      return api.createService(newServiceData);
    },
    onSuccess: (newService) => {
      queryClient.setQueryData<ServiceItem[]>(
        QUERY_KEYS.services(tenantId),
        (old) => (old ? [newService, ...old] : [newService])
      );
      toast({
        type: 'success',
        title: 'Tạo dịch vụ thành công!',
        message: `Dịch vụ "${newService.name}" đã được đưa vào danh mục hoạt động.`,
      });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Tạo dịch vụ thất bại',
        message: err.message || 'Không thể tạo mới dịch vụ.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.services(tenantId) });
    },
  });
};
