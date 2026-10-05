import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Tenant, PartnerApplication } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';
import { useToast } from '../../components/feedback/ToastContext';

export const useTenantsQuery = () => {
  return useQuery<Tenant[]>({
    queryKey: QUERY_KEYS.tenants,
    queryFn: () => api.getTenants(),
  });
};

export const usePartnerApplicationsQuery = () => {
  return useQuery<PartnerApplication[]>({
    queryKey: QUERY_KEYS.partnerApplications,
    queryFn: () => api.getPartnerApplications(),
  });
};

export const useApprovePartnerMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Tenant,
    Error,
    string,
    { previousApps?: PartnerApplication[]; previousTenants?: Tenant[] }
  >({
    mutationFn: async (appId: string) => {
      return api.approvePartnerApplication(appId);
    },
    onMutate: async (appId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.partnerApplications });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.tenants });

      const previousApps = queryClient.getQueryData<PartnerApplication[]>(
        QUERY_KEYS.partnerApplications
      );
      const previousTenants = queryClient.getQueryData<Tenant[]>(QUERY_KEYS.tenants);

      // Optimistically update application status to APPROVED
      queryClient.setQueryData<PartnerApplication[]>(
        QUERY_KEYS.partnerApplications,
        (old) => {
          if (!old) return [];
          return old.map((app) =>
            app.id === appId ? { ...app, status: 'APPROVED' } : app
          );
        }
      );

      return { previousApps, previousTenants };
    },
    onSuccess: (newTenant) => {
      // Optimistically add tenant to cache
      queryClient.setQueryData<Tenant[]>(QUERY_KEYS.tenants, (old) => {
        if (!old) return [newTenant];
        if (old.some((t) => t.id === newTenant.id)) return old;
        return [...old, newTenant];
      });

      toast({
        type: 'success',
        title: 'Phê duyệt thành công!',
        message: `Đã cấp Tenant [${newTenant.code}] cho doanh nghiệp "${newTenant.name}".`,
      });
    },
    onError: (err, _appId, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(
          QUERY_KEYS.partnerApplications,
          context.previousApps
        );
      }
      if (context?.previousTenants) {
        queryClient.setQueryData(QUERY_KEYS.tenants, context.previousTenants);
      }
      toast({
        type: 'error',
        title: 'Phê duyệt thất bại',
        message: err.message || 'Không thể phê duyệt đơn đăng ký.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partnerApplications });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants });
    },
  });
};

export const useRejectPartnerMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    void,
    Error,
    { appId: string; reason: string },
    { previousApps?: PartnerApplication[] }
  >({
    mutationFn: async ({ appId, reason }) => {
      return api.rejectPartnerApplication(appId, reason);
    },
    onMutate: async ({ appId, reason }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.partnerApplications });

      const previousApps = queryClient.getQueryData<PartnerApplication[]>(
        QUERY_KEYS.partnerApplications
      );

      // Optimistically update application to REJECTED
      queryClient.setQueryData<PartnerApplication[]>(
        QUERY_KEYS.partnerApplications,
        (old) => {
          if (!old) return [];
          return old.map((app) =>
            app.id === appId
              ? { ...app, status: 'REJECTED', rejectionReason: reason }
              : app
          );
        }
      );

      return { previousApps };
    },
    onSuccess: () => {
      toast({
        type: 'info',
        title: 'Đã từ chối hồ sơ',
        message: 'Hồ sơ đã được đánh dấu từ chối thành công.',
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(
          QUERY_KEYS.partnerApplications,
          context.previousApps
        );
      }
      toast({
        type: 'error',
        title: 'Từ chối thất bại',
        message: err.message || 'Không thể cập nhật trạng thái hồ sơ.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.partnerApplications });
    },
  });
};
