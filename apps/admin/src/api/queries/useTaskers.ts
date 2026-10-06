import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type TaskerQueryParams, type TaskerDepositResult } from '../client';
import type { Tasker, WalletTransaction } from '../../types';
import type {
  CreateTaskerInput,
  UpdateTaskerInput,
  WorkFloorInput,
} from '../../schemas/tasker.schema';
import { useToast } from '../../components/feedback/ToastContext';

export const useTaskersQuery = (
  tenantId?: string | null,
  params?: TaskerQueryParams
) => {
  return useQuery<Tasker[]>({
    queryKey: ['taskers', tenantId || 'all', params],
    queryFn: () => api.getTaskers(tenantId, params),
  });
};

export const useTaskerDetailQuery = (id?: string | null) => {
  return useQuery<Tasker | undefined>({
    queryKey: ['tasker', id],
    queryFn: () => (id ? api.getTaskerById(id) : Promise.resolve(undefined)),
    enabled: Boolean(id),
  });
};

export const useTaskerTransactionsQuery = (taskerId?: string | null) => {
  return useQuery<WalletTransaction[]>({
    queryKey: ['taskerTransactions', taskerId],
    queryFn: () => (taskerId ? api.getTaskerTransactions(taskerId) : Promise.resolve([])),
    enabled: Boolean(taskerId),
  });
};

export const useCreateTaskerMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Tasker, Error, CreateTaskerInput>({
    mutationFn: async (data: CreateTaskerInput) => {
      return api.createTasker(data, tenantId || undefined);
    },
    onSuccess: (newDoc) => {
      toast({
        type: 'success',
        title: 'Thêm thợ thành công',
        message: `Đã khởi tạo tài khoản và hồ sơ cho thợ "${newDoc.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['taskers'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Thêm thợ thất bại',
        message: err.message || 'Không thể tạo mới tài khoản thợ.',
      });
    },
  });
};

export const useUpdateTaskerMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Tasker, Error, { id: string; data: UpdateTaskerInput }>({
    mutationFn: async ({ id, data }) => {
      return api.updateTasker(id, data);
    },
    onSuccess: (updated, { id }) => {
      toast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Đã lưu thông tin cho thợ "${updated.name}".`,
      });
      queryClient.invalidateQueries({ queryKey: ['taskers'] });
      queryClient.invalidateQueries({ queryKey: ['tasker', id] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.message || 'Không thể cập nhật thông tin thợ.',
      });
    },
  });
};

export const useUpdateWorkFloorMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { maxDistanceKm: number; autoRadarEnabled: boolean; isOnline?: boolean },
    Error,
    { id: string; data: WorkFloorInput }
  >({
    mutationFn: async ({ id, data }) => {
      return api.updateWorkFloor(id, data);
    },
    onSuccess: (_res, { id }) => {
      toast({
        type: 'success',
        title: 'Cập nhật sàn làm việc thành công',
        message: 'Đã lưu cấu hình bán kính quét việc và trạng thái radar.',
      });
      queryClient.invalidateQueries({ queryKey: ['taskers'] });
      queryClient.invalidateQueries({ queryKey: ['tasker', id] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Cập nhật sàn thất bại',
        message: err.message || 'Không thể cập nhật cấu hình sàn làm việc.',
      });
    },
  });
};

export const useToggleTaskerStatusMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<{ isOnline: boolean }, Error, string>({
    mutationFn: async (id: string) => {
      return api.toggleTaskerStatus(id);
    },
    onSuccess: (res, id) => {
      toast({
        type: 'info',
        title: 'Trạng thái hoạt động',
        message: res.isOnline
          ? 'Thợ đã trực tuyến và sẵn sàng nhận việc.'
          : 'Thợ đã chuyển sang trạng thái ngoại tuyến.',
      });
      queryClient.invalidateQueries({ queryKey: ['taskers'] });
      queryClient.invalidateQueries({ queryKey: ['tasker', id] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: err.message || 'Không thể chuyển đổi trạng thái trực tuyến.',
      });
    },
  });
};

export const useAdjustDepositMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    TaskerDepositResult,
    Error,
    { id: string; data: { amount: number; notes: string } }
  >({
    mutationFn: async ({ id, data }) => {
      return api.adjustTaskerDeposit(id, data);
    },
    onSuccess: (res, { id, data }) => {
      const isTopUp = data.amount > 0;
      toast({
        type: 'success',
        title: isTopUp ? 'Nạp tiền ký quỹ thành công' : 'Khấu trừ ký quỹ thành công',
        message: `Đã ${isTopUp ? 'nạp' : 'khấu trừ'} ${Math.abs(data.amount).toLocaleString('vi-VN')} đ. Số dư mới: ${res.taskerProfile.depositBalance.toLocaleString('vi-VN')} đ.`,
      });
      queryClient.invalidateQueries({ queryKey: ['taskers'] });
      queryClient.invalidateQueries({ queryKey: ['tasker', id] });
      queryClient.invalidateQueries({ queryKey: ['taskerTransactions', id] });
      queryClient.invalidateQueries({ queryKey: ['financialTransactions'] });
      queryClient.invalidateQueries({ queryKey: ['financialSummary'] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Giao dịch thất bại',
        message: err.message || 'Không thể điều chỉnh số dư ký quỹ.',
      });
    },
  });
};

export const useUpdateKycMutation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    { kycVerified: boolean; idCardNumber?: string | null },
    Error,
    { id: string; data: { kycVerified: boolean; idCardNumber?: string; notes?: string } }
  >({
    mutationFn: async ({ id, data }) => {
      return api.updateTaskerKyc(id, data);
    },
    onSuccess: (res, { id }) => {
      toast({
        type: 'success',
        title: 'Cập nhật KYC thành công',
        message: res.kycVerified
          ? 'Hồ sơ thợ đã được duyệt KYC thành công.'
          : 'Đã hủy trạng thái xác thực KYC của thợ.',
      });
      queryClient.invalidateQueries({ queryKey: ['taskers'] });
      queryClient.invalidateQueries({ queryKey: ['tasker', id] });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Cập nhật KYC thất bại',
        message: err.message || 'Không thể cập nhật trạng thái KYC.',
      });
    },
  });
};
