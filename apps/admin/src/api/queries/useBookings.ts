import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';
import { Booking, BookingStatus, PricingModel } from '../../types';
import { QUERY_KEYS } from '../../lib/queryClient';
import { useToast } from '../../components/feedback/ToastContext';

export interface CreateBookingVariables {
  tenantId: string;
  tenantName: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  serviceName: string;
  pricingType: PricingModel;
  scheduledAt: string;
  durationHours?: number;
  totalAmount: number;
}

export interface AssignBookingVariables {
  bookingId: string;
  taskerId: string;
  taskerName: string;
  taskerPhone: string;
  adminTenantId: string;
}

export const useBookingsQuery = (tenantId?: string | null) => {
  return useQuery<Booking[]>({
    queryKey: QUERY_KEYS.bookings(tenantId),
    queryFn: () => api.getBookings(tenantId),
  });
};

export const useCreateBookingMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Booking, Error, CreateBookingVariables>({
    mutationFn: async (vars) => {
      return api.createManualBooking(vars.tenantId, vars.tenantName, {
        customerName: vars.customerName,
        customerPhone: vars.customerPhone,
        addressText: vars.addressText,
        serviceName: vars.serviceName,
        pricingType: vars.pricingType,
        scheduledAt: vars.scheduledAt,
        durationHours: vars.durationHours,
        totalAmount: vars.totalAmount,
      });
    },
    onSuccess: (newBooking) => {
      // Optimistically push into current list without requiring full re-fetch
      queryClient.setQueryData<Booking[]>(QUERY_KEYS.bookings(tenantId), (old) => {
        return old ? [newBooking, ...old] : [newBooking];
      });
      toast({
        type: 'success',
        title: 'Tạo đơn thành công!',
        message: `Đơn hàng [${newBooking.code}] đã được khởi tạo thành công.`,
      });
    },
    onError: (err) => {
      toast({
        type: 'error',
        title: 'Tạo đơn thất bại',
        message: err.message || 'Không thể tạo đơn hàng, vui lòng thử lại.',
      });
    },
    onSettled: () => {
      // Silently sync background
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });
    },
  });
};

export const useAssignBookingMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Booking,
    Error,
    AssignBookingVariables,
    { previousBookings?: Booking[] }
  >({
    mutationFn: async ({ bookingId, taskerId, adminTenantId }) => {
      return api.directAssignBooking(bookingId, taskerId, adminTenantId);
    },
    onMutate: async ({ bookingId, taskerId, taskerName, taskerPhone }) => {
      // 1. Cancel ongoing refetches to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });

      // 2. Snapshot previous state for rollback
      const previousBookings = queryClient.getQueryData<Booking[]>(
        QUERY_KEYS.bookings(tenantId)
      );

      // 3. Optimistically update Query Cache with 0ms delay!
      queryClient.setQueryData<Booking[]>(QUERY_KEYS.bookings(tenantId), (old) => {
        if (!old) return [];
        return old.map((b) => {
          if (b.id === bookingId) {
            return {
              ...b,
              assignedTaskerId: taskerId,
              assignedTaskerName: taskerName,
              assignedTaskerPhone: taskerPhone,
              status: 'ASSIGNED',
            };
          }
          return b;
        });
      });

      return { previousBookings };
    },
    onSuccess: (updatedBooking) => {
      toast({
        type: 'success',
        title: 'Chỉ định thợ thành công!',
        message: `Đơn [${updatedBooking.code}] đã được giao cho ${updatedBooking.assignedTaskerName}.`,
      });
    },
    onError: (err, _vars, context) => {
      // Rollback to snapshot on failure
      if (context?.previousBookings) {
        queryClient.setQueryData(
          QUERY_KEYS.bookings(tenantId),
          context.previousBookings
        );
      }
      toast({
        type: 'error',
        title: 'Chỉ định thất bại',
        message: err.message || 'Đã xảy ra sự cố khi phân công đơn hàng.',
      });
    },
    onSettled: () => {
      // Silent background revalidation (never triggers full page skeleton)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });
    },
  });
};

export const useBroadcastBookingMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<Booking, Error, string, { previousBookings?: Booking[] }>({
    mutationFn: async (bookingId: string) => {
      return api.broadcastInternalBooking(bookingId);
    },
    onMutate: async (bookingId: string) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });
      const previousBookings = queryClient.getQueryData<Booking[]>(
        QUERY_KEYS.bookings(tenantId)
      );

      // Optimistic update to BROADCASTING status immediately
      queryClient.setQueryData<Booking[]>(QUERY_KEYS.bookings(tenantId), (old) => {
        if (!old) return [];
        return old.map((b) => {
          if (b.id === bookingId) {
            return { ...b, status: 'BROADCASTING' };
          }
          return b;
        });
      });

      return { previousBookings };
    },
    onSuccess: (updatedBooking) => {
      toast({
        type: 'info',
        title: 'Bắn đơn thành công!',
        message: `Đơn [${updatedBooking.code}] đang được phát sóng tới mạng lưới thợ nội bộ.`,
      });
    },
    onError: (err, _bookingId, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(
          QUERY_KEYS.bookings(tenantId),
          context.previousBookings
        );
      }
      toast({
        type: 'error',
        title: 'Bắn đơn thất bại',
        message: err.message || 'Không thể phát sóng đơn hàng.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });
    },
  });
};

export interface TransitionBookingStatusVariables {
  bookingId: string;
  status: BookingStatus;
  note?: string;
}

export const useTransitionBookingStatusMutation = (tenantId?: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<
    Booking,
    Error,
    TransitionBookingStatusVariables,
    { previousBookings?: Booking[] }
  >({
    mutationFn: async ({ bookingId, status, note }) => {
      return api.transitionBookingStatus(bookingId, status, note, tenantId);
    },
    onMutate: async ({ bookingId, status }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });

      const previousBookings = queryClient.getQueryData<Booking[]>(
        QUERY_KEYS.bookings(tenantId)
      );

      queryClient.setQueryData<Booking[]>(QUERY_KEYS.bookings(tenantId), (old) => {
        if (!old) return [];
        return old.map((b) => {
          if (b.id === bookingId) {
            return {
              ...b,
              status,
            };
          }
          return b;
        });
      });

      return { previousBookings };
    },
    onSuccess: (updatedBooking) => {
      const statusLabels: Record<string, string> = {
        ASSIGNED: 'Đã gán thợ',
        ARRIVING: 'Thợ đang di chuyển',
        IN_PROGRESS: 'Đang thực hiện công việc',
        PENDING_ACCEPTANCE: 'Chờ nghiệm thu',
        COMPLETED: 'Đã hoàn thành đơn hàng',
        CANCELLED: 'Đã hủy đơn hàng',
        EMERGENCY_REDISPATCH: 'Điều phối lại',
      };
      const label = statusLabels[updatedBooking.status] || updatedBooking.status;
      toast({
        type: 'success',
        title: 'Cập nhật trạng thái thành công!',
        message: `Đơn [${updatedBooking.code}] đã chuyển sang: ${label}.`,
      });
    },
    onError: (err, _vars, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(
          QUERY_KEYS.bookings(tenantId),
          context.previousBookings
        );
      }
      toast({
        type: 'error',
        title: 'Cập nhật trạng thái thất bại',
        message: err.message || 'Không thể chuyển trạng thái đơn hàng.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.bookings(tenantId) });
    },
  });
};

