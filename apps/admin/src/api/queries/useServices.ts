import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import type { ServiceItem, ServiceCategory, ServiceAddon, PricingModel } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';
import { useToast } from '../../components/feedback/ToastContext';

export const useServicesQuery = (tenantId?: string | null) => {
  return useQuery<ServiceItem[]>({
    queryKey: QUERY_KEYS.services(tenantId),
    queryFn: () => api.getServices(tenantId),
  });
};

export const useServiceCategoriesQuery = (all?: boolean) => {
  return useQuery<ServiceCategory[]>({
    queryKey: all ? (['serviceCategories', 'all'] as const) : QUERY_KEYS.serviceCategories,
    queryFn: () => api.getServiceCategories(all),
  });
};

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceCategory,
    Error,
    {
      name: string;
      slug?: string;
      icon?: string;
      description?: string;
      defaultPricingType?: PricingModel;
      defaultBasePrice?: number;
      defaultUnitLabel?: string;
      displayOrder?: number;
    }
  >({
    mutationFn: async (data) => {
      return api.createCategory(data);
    },
    onSuccess: (newCat) => {
      toast({
        type: 'success',
        title: 'Tạo nhóm danh mục thành công',
        message: `Nhóm dịch vụ "${newCat.name}" đã được thêm vào hệ thống.`,
      });
      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Tạo nhóm danh mục thất bại',
        message: err.message || 'Không thể tạo mới nhóm danh mục.',
      });
    },
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceCategory,
    Error,
    { id: string; data: Partial<ServiceCategory> }
  >({
    mutationFn: async ({ id, data }) => {
      return api.updateCategory(id, data);
    },
    onSuccess: (updated) => {
      toast({
        type: 'success',
        title: 'Cập nhật nhóm danh mục thành công',
        message: `Đã cập nhật cấu hình cho nhóm "${updated.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.message || 'Không thể cập nhật nhóm danh mục.',
      });
    },
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      return api.deleteCategory(id);
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Xóa nhóm danh mục thành công',
        message: 'Đã xóa nhóm danh mục khỏi hệ thống.',
      });
      queryClient.invalidateQueries({ queryKey: ['serviceCategories'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Xóa nhóm thất bại',
        message: err.message || 'Không thể xóa nhóm danh mục có dịch vụ trực thuộc.',
      });
    },
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
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.services(tenantId) });

      const previousServices = queryClient.getQueryData<ServiceItem[]>(
        QUERY_KEYS.services(tenantId)
      );

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
      queryClient.invalidateQueries({ queryKey: ['services'] });
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
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Tạo dịch vụ thất bại',
        message: err.message || 'Không thể tạo mới dịch vụ.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

export const useUpdateServiceMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceItem,
    Error,
    { id: string; data: Partial<ServiceItem> }
  >({
    mutationFn: async ({ id, data }) => {
      return api.updateService(id, data);
    },
    onSuccess: (updated) => {
      toast({
        type: 'success',
        title: 'Cập nhật dịch vụ thành công',
        message: `Dịch vụ "${updated.name}" đã được lưu thông tin mới.`,
      });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Cập nhật dịch vụ thất bại',
        message: err.message || 'Không thể cập nhật dịch vụ.',
      });
    },
  });
};

export const useDeleteServiceMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      return api.deleteService(id);
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Xóa dịch vụ thành công',
        message: 'Dịch vụ đã được xóa khỏi danh mục sàn.',
      });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Xóa dịch vụ thất bại',
        message: err.message || 'Không thể xóa dịch vụ này.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

export const useCreateAddonMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceAddon,
    Error,
    { serviceId: string; data: { name: string; price: number; description?: string } }
  >({
    mutationFn: async ({ serviceId, data }) => {
      return api.createAddon(serviceId, data);
    },
    onSuccess: (newAddon) => {
      toast({
        type: 'success',
        title: 'Thêm phụ phí thành công',
        message: `Đã thêm phụ thu "${newAddon.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Thêm phụ phí thất bại',
        message: err.message || 'Không thể tạo mới phụ phí.',
      });
    },
  });
};

export const useUpdateAddonMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    ServiceAddon,
    Error,
    { addonId: string; data: { name?: string; price?: number; description?: string; isActive?: boolean } }
  >({
    mutationFn: async ({ addonId, data }) => {
      return api.updateAddon(addonId, data);
    },
    onSuccess: (updated) => {
      toast({
        type: 'success',
        title: 'Cập nhật phụ phí thành công',
        message: `Đã lưu thay đổi cho "${updated.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Cập nhật phụ phí thất bại',
        message: err.message || 'Không thể cập nhật phụ phí.',
      });
    },
  });
};

export const useDeleteAddonMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<void, Error, string>({
    mutationFn: async (addonId: string) => {
      return api.deleteAddon(addonId);
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Xóa phụ phí thành công',
        message: 'Đã xóa dịch vụ bán kèm khỏi danh sách.',
      });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Xóa phụ phí thất bại',
        message: err.message || 'Không thể xóa phụ phí.',
      });
    },
  });
};
