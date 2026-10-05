import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { CronJobItem } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';
import { useToast } from '../../components/feedback/ToastContext';

export const useCronJobsQuery = () => {
  return useQuery<CronJobItem[]>({
    queryKey: QUERY_KEYS.cronJobs,
    queryFn: () => api.getCronJobs(),
  });
};

export const useToggleCronMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    CronJobItem,
    Error,
    { jobName: string; enabled: boolean },
    { previousJobs?: CronJobItem[] }
  >({
    mutationFn: async ({ jobName, enabled }) => {
      return api.toggleCronJob(jobName, enabled);
    },
    onMutate: async ({ jobName, enabled }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cronJobs });

      const previousJobs = queryClient.getQueryData<CronJobItem[]>(
        QUERY_KEYS.cronJobs
      );

      // Optimistic 0ms toggle update
      queryClient.setQueryData<CronJobItem[]>(QUERY_KEYS.cronJobs, (old) => {
        if (!old) return [];
        return old.map((j) =>
          j.jobName === jobName
            ? { ...j, isEnabled: enabled, lastStatus: enabled ? 'IDLE' : 'PAUSED' }
            : j
        );
      });

      return { previousJobs };
    },
    onSuccess: (updated) => {
      toast({
        type: updated.isEnabled ? 'success' : 'warning',
        title: updated.isEnabled ? 'Đã bật tiến trình' : 'Đã tạm dừng tiến trình',
        message: `Tiến trình "${updated.jobName}" hiện ${
          updated.isEnabled ? 'sẵn sàng kích hoạt' : 'đã dừng theo lệnh'
        }.`,
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(QUERY_KEYS.cronJobs, context.previousJobs);
      }
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: err.message || 'Không thể chuyển đổi trạng thái tiến trình.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cronJobs });
    },
  });
};

export const useTriggerCronMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: async (jobName: string) => {
      return api.triggerCronJobNow(jobName);
    },
    onSuccess: (res, jobName) => {
      // Optimistically bump successCount and timestamp
      queryClient.setQueryData<CronJobItem[]>(QUERY_KEYS.cronJobs, (old) => {
        if (!old) return [];
        return old.map((j) =>
          j.jobName === jobName
            ? {
                ...j,
                lastRunAt: new Date().toISOString(),
                lastStatus: 'SUCCESS',
                successCount: j.successCount + 1,
              }
            : j
        );
      });

      toast({
        type: 'success',
        title: 'Chạy ngầm thành công!',
        message: res.message,
      });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Kích hoạt thất bại',
        message: err.message || 'Lỗi khi gọi tiến trình ngầm.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cronJobs });
    },
  });
};

export const useUpdateCronParamsMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    CronJobItem,
    Error,
    { jobName: string; params: Record<string, string | number | boolean> },
    { previousJobs?: CronJobItem[] }
  >({
    mutationFn: async ({ jobName, params }) => {
      return api.updateCronJobParams(jobName, params);
    },
    onMutate: async ({ jobName, params }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.cronJobs });
      const previousJobs = queryClient.getQueryData<CronJobItem[]>(
        QUERY_KEYS.cronJobs
      );

      queryClient.setQueryData<CronJobItem[]>(QUERY_KEYS.cronJobs, (old) => {
        if (!old) return [];
        return old.map((j) =>
          j.jobName === jobName ? { ...j, params: { ...j.params, ...params } } : j
        );
      });

      return { previousJobs };
    },
    onSuccess: () => {
      toast({
        type: 'success',
        title: 'Lưu tham số thành công',
        message: 'Cấu hình tham số tiến trình đã được áp dụng.',
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(QUERY_KEYS.cronJobs, context.previousJobs);
      }
      toast({
        type: 'error',
        title: 'Lưu thất bại',
        message: err.message || 'Không thể lưu tham số.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.cronJobs });
    },
  });
};
