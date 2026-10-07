import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import {
  useBookingsQuery,
  useTaskersQuery,
  useAssignBookingMutation,
  useBroadcastBookingMutation,
  useTransitionBookingStatusMutation,
  useRecordCashPaymentMutation,
} from '../../api/queries';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge, BadgeVariant } from '../../components/common/Badge';
import { SkeletonDispatch } from '../../components/common/Skeleton';
import { Booking, BookingStatus, Tasker } from '../../types';
import {
  Compass,
  Radio,
  UserCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Wallet,
  Star,
  Send,
  Zap,
  ShieldCheck,
  ArrowLeft,
  Truck,
  Wrench,
  Check,
  RotateCcw,
  XCircle,
  Building2,
  Globe,
  SlidersHorizontal,
  X,
  Banknote,
} from 'lucide-react';
import {
  DispatchStepper,
  CompletionModal,
  CancelBookingModal,
  AuditTimeline,
  RecordCashPaymentModal,
  PaymentLedgerCard,
  getStatusBadgeInfo,
} from './components';

type QueueTab = 'pending' | 'in_progress' | 'history';
type TaskerFilter = 'all' | 'tenant' | 'cross';

const PENDING_STATUSES: BookingStatus[] = [
  'PENDING_DISPATCH',
  'BROADCASTING',
  'MATCHING',
  'EMERGENCY_REDISPATCH',
  'OFFERED_TO_FAVORITE',
  'DRAFT',
];

const IN_PROGRESS_STATUSES: BookingStatus[] = [
  'ASSIGNED',
  'ARRIVING',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'PENDING_ACCEPTANCE',
];

const HISTORY_STATUSES: BookingStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'REVIEWED',
  'DISPATCH_FAILED',
];

const getStatusBadge = getStatusBadgeInfo;

export const DispatchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlBookingId = searchParams.get('bookingId');

  const { isSuperAdmin, isImpersonating, currentTenantId, currentTenantName } = useAuth();

  // Super Admin without impersonation queries across all tenants
  const queryTenantId = isSuperAdmin && !isImpersonating ? undefined : currentTenantId;

  const { data: bookings = [], isLoading: isLoadingBookings } = useBookingsQuery(queryTenantId);
  const { data: taskers = [], isLoading: isLoadingTaskers } = useTaskersQuery(queryTenantId);

  const assignMutation = useAssignBookingMutation(queryTenantId);
  const broadcastMutation = useBroadcastBookingMutation(queryTenantId);
  const transitionMutation = useTransitionBookingStatusMutation(queryTenantId);
  const recordCashPaymentMutation = useRecordCashPaymentMutation(queryTenantId);

  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(urlBookingId);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [taskerFilter, setTaskerFilter] = useState<TaskerFilter>('all');

  // Modals state
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  const hasInitializedUrlRef = useRef<string | null>(null);

  const confirm = useConfirm();

  // Filter queues
  const pendingBookings = useMemo(
    () => bookings.filter((b) => PENDING_STATUSES.includes(b.status)),
    [bookings]
  );
  const inProgressBookings = useMemo(
    () => bookings.filter((b) => IN_PROGRESS_STATUSES.includes(b.status)),
    [bookings]
  );
  const historyBookings = useMemo(
    () => bookings.filter((b) => HISTORY_STATUSES.includes(b.status)),
    [bookings]
  );

  const currentQueueList = useMemo(() => {
    switch (activeTab) {
      case 'in_progress':
        return inProgressBookings;
      case 'history':
        return historyBookings;
      case 'pending':
      default:
        return pendingBookings;
    }
  }, [activeTab, pendingBookings, inProgressBookings, historyBookings]);

  // Synchronize selected booking based on active tab and URL (one-time initialization for url query)
  useEffect(() => {
    if (urlBookingId && hasInitializedUrlRef.current !== urlBookingId) {
      const urlBooking = bookings.find((b) => b.id === urlBookingId);
      if (urlBooking) {
        setSelectedBookingId(urlBooking.id);
        if (IN_PROGRESS_STATUSES.includes(urlBooking.status)) {
          setActiveTab('in_progress');
        } else if (HISTORY_STATUSES.includes(urlBooking.status)) {
          setActiveTab('history');
        } else {
          setActiveTab('pending');
        }
        hasInitializedUrlRef.current = urlBookingId;
        return;
      }
    }

    if (
      !selectedBookingId ||
      !currentQueueList.some((b) => b.id === selectedBookingId)
    ) {
      if (currentQueueList.length > 0) {
        setSelectedBookingId(currentQueueList[0].id);
      } else {
        setSelectedBookingId(null);
      }
    }
  }, [urlBookingId, currentQueueList, selectedBookingId, bookings]);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedBookingId),
    [bookings, selectedBookingId]
  );

  // Group taskers based on selected booking servicingTenantId
  const { tenantTaskers, crossTenantTaskers } = useMemo(() => {
    if (!selectedBooking) {
      return {
        tenantTaskers: taskers.filter((t) => t.tenantId === currentTenantId),
        crossTenantTaskers: taskers.filter((t) => t.tenantId !== currentTenantId),
      };
    }
    const tenant = taskers.filter((t) => t.tenantId === selectedBooking.servicingTenantId);
    const cross = taskers.filter((t) => t.tenantId !== selectedBooking.servicingTenantId);
    return { tenantTaskers: tenant, crossTenantTaskers: cross };
  }, [taskers, selectedBooking, currentTenantId]);

  const displayedTaskers = useMemo(() => {
    if (taskerFilter === 'tenant') return tenantTaskers;
    if (taskerFilter === 'cross') return crossTenantTaskers;
    return taskers;
  }, [taskerFilter, tenantTaskers, crossTenantTaskers, taskers]);

  // Handle direct tasker assignment
  const handleDirectAssign = async (
    taskerId: string,
    taskerName: string,
    taskerPhone: string,
    isCrossTenant: boolean
  ) => {
    if (!selectedBooking) return;

    if (isCrossTenant) {
      const confirmed = await confirm({
        title: `Chỉ định thợ toàn sàn "${taskerName}"?`,
        message: (
          <div className="space-y-2 text-sm text-slate-600">
            <p>
              Bạn đang chỉ định thợ <strong>{taskerName}</strong> ({taskerPhone}) thuộc đơn vị đối tác khác cho đơn hàng{' '}
              <strong className="font-mono text-brand-600">{selectedBooking.code}</strong>.
            </p>
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs font-medium">
              ⚠️ <strong>Đặc quyền Super Admin:</strong> Khi chỉ định, đơn vị điều phối (servicing tenant) của đơn hàng sẽ tự động được điều chỉnh sang đơn vị quản lý của thợ này.
            </div>
          </div>
        ),
        variant: 'warning',
        confirmText: 'Chỉ định thợ & Cập nhật đơn vị',
        cancelText: 'Hủy bỏ',
      });
      if (!confirmed) return;
    } else {
      const confirmed = await confirm({
        title: `Chỉ định thợ "${taskerName}"?`,
        message: (
          <span>
            Bạn có chắc chắn muốn chỉ định thợ <strong>{taskerName}</strong> ({taskerPhone}) tiếp nhận đơn hàng{' '}
            <strong className="font-mono text-brand-600">{selectedBooking.code}</strong>? Đơn sẽ chuyển trạng thái sang{' '}
            <strong>ASSIGNED</strong> và gửi thông báo công việc tới thợ.
          </span>
        ),
        variant: 'primary',
        confirmText: 'Chỉ định thợ ngay',
        cancelText: 'Hủy bỏ',
      });
      if (!confirmed) return;
    }

    try {
      setAssigningTaskId(taskerId);
      await assignMutation.mutateAsync({
        bookingId: selectedBooking.id,
        taskerId,
        taskerName,
        taskerPhone,
        adminTenantId: currentTenantId,
      });
    } catch {
      // Handled in mutation onError
    } finally {
      setAssigningTaskId(null);
    }
  };

  // Broadcast to Radar
  const handleBroadcast = async () => {
    if (!selectedBooking) return;

    const confirmed = await confirm({
      title: `Phát sóng đơn "${selectedBooking.code}" lên Radar?`,
      message: (
        <span>
          Đơn hàng sẽ được phát sóng công khai (trạng thái <strong>BROADCASTING</strong>). Tất cả các thợ đủ điều kiện trong khu vực
          sẽ nhận được tín hiệu và có thể bấm nhận việc (Fast-Finger Claiming).
        </span>
      ),
      variant: 'warning',
      confirmText: 'Phát sóng ngay',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;

    try {
      await broadcastMutation.mutateAsync(selectedBooking.id);
    } catch {
      // Handled in mutation onError
    }
  };

  // Status transitions
  const handleMarkArriving = async () => {
    if (!selectedBooking) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'ARRIVING',
        note: 'Quản trị viên xác nhận thợ bắt đầu xuất phát di chuyển tới điểm hẹn',
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleStartJob = async () => {
    if (!selectedBooking) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'IN_PROGRESS',
        note: 'Thợ đã có mặt và bắt đầu triển khai dịch vụ',
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleReportPendingAcceptance = async () => {
    if (!selectedBooking) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'PENDING_ACCEPTANCE',
        note: 'Thợ đã hoàn thành công việc, gửi báo cáo nghiệm thu',
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleRedispatch = async () => {
    if (!selectedBooking) return;
    const confirmed = await confirm({
      title: `Điều phối lại đơn "${selectedBooking.code}"?`,
      message: (
        <span>
          Bạn có chắc chắn muốn chuyển đơn sang trạng thái <strong>Điều phối lại (EMERGENCY_REDISPATCH)</strong>? Bạn có thể chọn thợ mới hoặc phát sóng lại lên Radar.
        </span>
      ),
      variant: 'warning',
      confirmText: 'Xác nhận điều phối lại',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'EMERGENCY_REDISPATCH',
        note: 'Yêu cầu điều phối lại / đổi thợ tiếp nhận',
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleRejectAcceptance = async () => {
    if (!selectedBooking) return;
    const confirmed = await confirm({
      title: `Yêu cầu làm lại đơn "${selectedBooking.code}"?`,
      message: (
        <span>
          Nghiệm thu chưa đạt yêu cầu? Đơn sẽ chuyển lại về trạng thái{' '}
          <strong>Đang làm việc (IN_PROGRESS)</strong> để thợ tiếp tục xử lý và hoàn thiện dịch vụ.
        </span>
      ),
      variant: 'warning',
      confirmText: 'Yêu cầu làm lại',
      cancelText: 'Hủy bỏ',
    });
    if (!confirmed) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'IN_PROGRESS',
        note: 'Quản trị viên yêu cầu thợ làm lại / khắc phục các hạng mục chưa đạt nghiệm thu',
      });
    } catch {
      // Handled in mutation onError
    }
  };

  const handleCancelBooking = () => {
    if (!selectedBooking) return;
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!selectedBooking) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'CANCELLED',
        note: reason,
      });
      setIsCancelModalOpen(false);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleConfirmComplete = async (rating: number, note: string) => {
    if (!selectedBooking) return;
    try {
      await transitionMutation.mutateAsync({
        bookingId: selectedBooking.id,
        status: 'COMPLETED',
        note: `Nghiệm thu đạt ${rating}/5 sao${note ? `: ${note}` : ''}`,
      });
      setIsCompleteModalOpen(false);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleConfirmCashPayment = async (
    amount: number,
    note: string,
    deductCommission: boolean
  ) => {
    if (!selectedBooking) return;
    try {
      await recordCashPaymentMutation.mutateAsync({
        bookingId: selectedBooking.id,
        amount,
        note,
        deductCommission,
      });
      setIsRecordPaymentModalOpen(false);
    } catch {
      // Handled in mutation onError
    }
  };

  const isDispatchable =
    selectedBooking &&
    ['PENDING_DISPATCH', 'BROADCASTING', 'MATCHING', 'EMERGENCY_REDISPATCH'].includes(
      selectedBooking.status
    );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-brand-500" />
            Bàn Điều phối Đơn hàng
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Trung tâm gán việc, phát sóng Radar và giám sát vòng đời đơn hàng cho{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning" size="md">
            {pendingBookings.length} chờ điều phối
          </Badge>
          <Badge variant="brand" size="md">
            {inProgressBookings.length} đang thực hiện
          </Badge>
          <Badge variant="neutral" size="md">
            {taskers.filter((t) => t.isOnline).length} / {taskers.length} thợ online
          </Badge>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('pending');
            setMobileView('list');
          }}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Chờ điều phối</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full font-bold ${
              activeTab === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {pendingBookings.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('in_progress');
            setMobileView('list');
          }}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'in_progress'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Đang thực hiện</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full font-bold ${
              activeTab === 'in_progress'
                ? 'bg-brand-100 text-brand-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {inProgressBookings.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('history');
            setMobileView('list');
          }}
          className={`pb-3 px-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'history'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Đã hoàn thành / Lịch sử</span>
          <span
            className={`px-2 py-0.5 text-xs rounded-full font-bold ${
              activeTab === 'history'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {historyBookings.length}
          </span>
        </button>
      </div>

      {/* Mobile View Toggle Switch (< lg) */}
      <div className="flex lg:hidden rounded-xl bg-slate-100 p-1">
        <button
          onClick={() => setMobileView('list')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileView === 'list'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Danh sách đơn ({currentQueueList.length})
        </button>
        <button
          onClick={() => setMobileView('detail')}
          disabled={!selectedBooking}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            mobileView === 'detail'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          } disabled:opacity-40`}
        >
          Chi tiết & Xử lý {selectedBooking ? `(${selectedBooking.code})` : ''}
        </button>
      </div>

      {(isLoadingBookings || isLoadingTaskers) && bookings.length === 0 ? (
        <SkeletonDispatch />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Bookings in Active Queue */}
          <div
            className={`${
              mobileView === 'list' ? 'block' : 'hidden'
            } lg:block lg:col-span-4 space-y-3`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-brand-500" />
                Hàng đợi ({currentQueueList.length})
              </h2>
              <span className="text-xs text-slate-400">
                {activeTab === 'pending'
                  ? 'Chờ gán việc'
                  : activeTab === 'in_progress'
                  ? 'Đang triển khai'
                  : 'Lịch sử lưu trữ'}
              </span>
            </div>

            {currentQueueList.length === 0 ? (
              <Card className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-medium text-slate-700">Hàng đợi trống</p>
                <p className="text-xs text-slate-500 mt-1">
                  Hiện không có đơn nào trong trạng thái này.
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {currentQueueList.map((b) => {
                  const isSelected = selectedBookingId === b.id;
                  const badgeInfo = getStatusBadge(b.status);

                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setMobileView('detail');
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/50 shadow-sm ring-1 ring-brand-500'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-brand-600">
                          {b.code}
                        </span>
                        <Badge variant={badgeInfo.variant} size="sm">
                          {badgeInfo.label}
                        </Badge>
                      </div>

                      <div className="font-semibold text-slate-900 text-sm mt-1">
                        {b.serviceName}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {b.addressText}
                      </div>

                      {b.assignedTaskerName && (
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                          <UserCheck className="w-3 h-3 text-brand-500" />
                          <span>Thợ: {b.assignedTaskerName}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-600 font-medium">
                          {new Date(b.scheduledAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {new Date(b.scheduledAt).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="font-bold text-slate-900">
                          {b.totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Dispatch Action Center & Detail */}
          <div
            className={`${
              mobileView === 'detail' ? 'block' : 'hidden'
            } lg:block lg:col-span-8 space-y-6`}
          >
            {/* Back button on mobile */}
            <div className="lg:hidden flex items-center justify-between pb-2 border-b border-slate-200">
              <button
                onClick={() => setMobileView('list')}
                className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại danh sách đơn
              </button>
              {selectedBooking && (
                <span className="font-mono text-xs font-bold text-slate-500">
                  {selectedBooking.code}
                </span>
              )}
            </div>

            {selectedBooking ? (
              <>
                {/* Visual Workflow Stepper */}
                <DispatchStepper status={selectedBooking.status} />

                {/* Selected Booking Detail Card */}
                <Card className="border-brand-200 bg-gradient-to-br from-white to-orange-50/30">
                  <CardHeader className="pb-3 border-b border-orange-100 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded">
                          {selectedBooking.code}
                        </span>
                        <Badge variant={getStatusBadge(selectedBooking.status).variant}>
                          {selectedBooking.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg font-bold text-slate-900 mt-1">
                        {selectedBooking.serviceName}
                      </CardTitle>
                    </div>

                    <div className="text-right">
                      <div className="text-xl font-black text-brand-600">
                        {selectedBooking.totalAmount.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedBooking.durationHours || 2} giờ dự kiến
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <UserCheck className="w-4 h-4 text-brand-500" />
                        <span className="font-medium text-slate-900">
                          {selectedBooking.customerName}
                        </span>{' '}
                        • {selectedBooking.customerPhone}
                      </div>
                      <div className="flex items-start gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                        <span>{selectedBooking.addressText}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="w-4 h-4 text-brand-500" />
                        <span>
                          Thời gian hẹn:{' '}
                          <strong className="text-slate-900">
                            {new Date(selectedBooking.scheduledAt).toLocaleString('vi-VN')}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Building2 className="w-4 h-4 text-brand-500" />
                        <span>
                          Đơn vị quản lý:{' '}
                          <strong className="text-slate-900">
                            {selectedBooking.servicingTenantName || 'Nền tảng LinkkWork'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Assigned Tasker Banner (if assigned) */}
                  {selectedBooking.assignedTaskerName && (
                    <div className="p-3.5 bg-brand-50/70 border-t border-brand-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-200 text-brand-800 font-bold flex items-center justify-center text-xs">
                          {selectedBooking.assignedTaskerName.slice(0, 1)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {selectedBooking.assignedTaskerName}
                          </div>
                          <div className="text-slate-500">
                            {selectedBooking.assignedTaskerPhone || 'Đã chỉ định'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="brand" size="sm">
                        Đang phụ trách đơn
                      </Badge>
                    </div>
                  )}

                  {/* Quick Action Buttons Toolbar */}
                  <div className="p-4 bg-orange-100/50 border-t border-orange-200/60 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                      <Zap className="w-4 h-4 text-brand-600" />
                      <span>Hành động trạng thái:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* PENDING_DISPATCH / BROADCASTING / EMERGENCY_REDISPATCH */}
                      {isDispatchable && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={handleBroadcast}
                            disabled={
                              broadcastMutation.isPending ||
                              selectedBooking.status === 'BROADCASTING'
                            }
                            leftIcon={<Send className="w-3.5 h-3.5" />}
                          >
                            {broadcastMutation.isPending
                              ? 'Đang phát sóng...'
                              : selectedBooking.status === 'BROADCASTING'
                              ? 'Đang phát sóng'
                              : 'Bắn đơn lên Radar'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            disabled={transitionMutation.isPending}
                            onClick={handleCancelBooking}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Hủy đơn
                          </Button>
                        </>
                      )}

                      {/* ASSIGNED */}
                      {selectedBooking.status === 'ASSIGNED' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={transitionMutation.isPending}
                            onClick={handleMarkArriving}
                            leftIcon={<Truck className="w-3.5 h-3.5" />}
                          >
                            Báo thợ xuất phát (ARRIVING)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={transitionMutation.isPending}
                            onClick={handleRedispatch}
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Điều phối lại / Đổi thợ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            disabled={transitionMutation.isPending}
                            onClick={handleCancelBooking}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Hủy đơn
                          </Button>
                        </>
                      )}

                      {/* ARRIVING */}
                      {(selectedBooking.status === 'ARRIVING' ||
                        selectedBooking.status === 'ON_THE_WAY') && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={transitionMutation.isPending}
                            onClick={handleStartJob}
                            leftIcon={<Wrench className="w-3.5 h-3.5" />}
                          >
                            Bắt đầu làm việc (IN_PROGRESS)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={transitionMutation.isPending}
                            onClick={handleRedispatch}
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Đổi thợ khẩn cấp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            disabled={transitionMutation.isPending}
                            onClick={handleCancelBooking}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Hủy đơn
                          </Button>
                        </>
                      )}

                      {/* IN_PROGRESS */}
                      {selectedBooking.status === 'IN_PROGRESS' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={transitionMutation.isPending}
                            onClick={handleReportPendingAcceptance}
                            leftIcon={<Clock className="w-3.5 h-3.5" />}
                          >
                            Báo xong ca / Chờ nghiệm thu
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={transitionMutation.isPending}
                            onClick={() => setIsCompleteModalOpen(true)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Nghiệm thu & Hoàn tất ngay
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={transitionMutation.isPending}
                            onClick={handleRedispatch}
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Đổi thợ
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            disabled={transitionMutation.isPending}
                            onClick={handleCancelBooking}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Hủy đơn
                          </Button>
                        </>
                      )}

                      {/* PENDING_ACCEPTANCE */}
                      {selectedBooking.status === 'PENDING_ACCEPTANCE' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={transitionMutation.isPending}
                            onClick={() => setIsCompleteModalOpen(true)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Nghiệm thu & Hoàn thành đơn (COMPLETED)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-700 hover:bg-amber-50 border-amber-300"
                            disabled={transitionMutation.isPending}
                            onClick={handleRejectAcceptance}
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                          >
                            Yêu cầu làm lại (IN_PROGRESS)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            disabled={transitionMutation.isPending}
                            onClick={handleCancelBooking}
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Hủy đơn
                          </Button>
                        </>
                      )}

                      {/* COMPLETED / REVIEWED */}
                      {['COMPLETED', 'REVIEWED'].includes(selectedBooking.status) && (
                        <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Đã hoàn thành toàn trình
                        </span>
                      )}

                      {/* Action Ghi nhận thu tiền mặt nếu chưa thu */}
                      {selectedBooking.paymentStatus !== 'RELEASED_TO_TASKER' &&
                        !['DRAFT', 'CANCELLED'].includes(selectedBooking.status) && (
                          <Button
                            size="sm"
                            variant="primary"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={recordCashPaymentMutation.isPending}
                            onClick={() => setIsRecordPaymentModalOpen(true)}
                            leftIcon={<Banknote className="w-3.5 h-3.5" />}
                          >
                            Ghi nhận thu tiền mặt
                          </Button>
                        )}
                    </div>
                  </div>
                </Card>

                {/* Payment & Ledger Card */}
                <PaymentLedgerCard
                  booking={selectedBooking}
                  onRecordPaymentClick={() => setIsRecordPaymentModalOpen(true)}
                />

                {/* Audit Timeline / Event Logs */}
                <AuditTimeline events={selectedBooking.events} />

                {/* Direct Assignment: Tasker List (Available when dispatchable) */}
                {isDispatchable && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-brand-500" />
                          Chỉ định thợ trực tiếp (Direct Assignment)
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Đơn vị phục vụ hiện tại:{' '}
                          <span className="font-semibold text-brand-600">
                            {selectedBooking.servicingTenantName || 'Mặc định'}
                          </span>
                        </p>
                      </div>

                      {/* Filter segmented buttons */}
                      <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                        <button
                          onClick={() => setTaskerFilter('all')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            taskerFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Tất cả ({taskers.length})
                        </button>
                        <button
                          onClick={() => setTaskerFilter('tenant')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            taskerFilter === 'tenant'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Thuộc đơn vị ({tenantTaskers.length})
                        </button>
                        <button
                          onClick={() => setTaskerFilter('cross')}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            taskerFilter === 'cross'
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Toàn sàn ({crossTenantTaskers.length})
                        </button>
                      </div>
                    </div>

                    {/* Notice for cross-tenant authority */}
                    {isSuperAdmin ? (
                      <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>
                          <strong>Đặc quyền Super Admin:</strong> Bạn có thể gán bất kỳ thợ nào trên toàn sàn. Đơn vị điều phối sẽ tự động được đồng bộ sang đơn vị của thợ khi bạn chỉ định.
                        </span>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Bạn đang quản lý đơn theo phạm vi Tenant. Thợ khác đơn vị quản lý sẽ bị vô hiệu hóa gán việc trực tiếp.
                        </span>
                      </div>
                    )}

                    {displayedTaskers.length === 0 ? (
                      <Card className="p-8 text-center text-slate-400">
                        <UserCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-700">Không có thợ khả dụng</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Vui lòng kiểm tra lại bộ lọc hoặc điều phối lại qua Radar.
                        </p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {displayedTaskers.map((t) => {
                          const isAssignedToThis = selectedBooking.assignedTaskerId === t.id;
                          const hasEnoughDeposit = t.depositBalance >= 100000;
                          const isSameTenant = t.tenantId === selectedBooking.servicingTenantId;
                          const canAssign = isSameTenant || isSuperAdmin;

                          return (
                            <div
                              key={t.id}
                              className={`p-3.5 rounded-xl border bg-white flex flex-col justify-between gap-3 transition-all ${
                                isAssignedToThis
                                  ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30'
                                  : isSameTenant
                                  ? 'border-slate-200 hover:border-slate-300'
                                  : 'border-indigo-100 bg-indigo-50/20 hover:border-indigo-200'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-sm">
                                    {t.name.slice(0, 1)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                      {t.name}
                                      {t.kycVerified && (
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                      <span>{t.phone}</span>
                                      <span>•</span>
                                      <span className="flex items-center text-amber-500 font-semibold">
                                        <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                                        {t.ratingScore}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                      t.isOnline
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {t.isOnline ? 'ONLINE' : 'OFFLINE'}
                                  </span>
                                  {!isSameTenant && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-100 text-indigo-800">
                                      Toàn sàn
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs py-2 px-2.5 bg-slate-50 rounded-lg">
                                <span className="text-slate-500 flex items-center gap-1">
                                  <Wallet className="w-3.5 h-3.5 text-slate-400" />
                                  Ký quỹ:
                                </span>
                                <span
                                  className={`font-semibold ${
                                    hasEnoughDeposit ? 'text-slate-800' : 'text-rose-600'
                                  }`}
                                >
                                  {t.depositBalance.toLocaleString('vi-VN')} đ
                                  {!hasEnoughDeposit && ' (Thấp)'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[11px] text-slate-400">
                                  Đã làm {t.completedJobs} đơn
                                </span>

                                <Button
                                  size="sm"
                                  variant={
                                    isAssignedToThis
                                      ? 'secondary'
                                      : !canAssign
                                      ? 'outline'
                                      : !isSameTenant
                                      ? 'primary'
                                      : 'primary'
                                  }
                                  disabled={
                                    (assignMutation.isPending && assigningTaskId === t.id) ||
                                    isAssignedToThis ||
                                    !canAssign
                                  }
                                  title={
                                    !canAssign
                                      ? 'Khác đơn vị quản lý - Cần quyền Super Admin'
                                      : undefined
                                  }
                                  onClick={() =>
                                    handleDirectAssign(t.id, t.name, t.phone, !isSameTenant)
                                  }
                                  leftIcon={
                                    isAssignedToThis ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : undefined
                                  }
                                >
                                  {isAssignedToThis
                                    ? 'Đang phụ trách'
                                    : !canAssign
                                    ? 'Khác đơn vị'
                                    : assigningTaskId === t.id && assignMutation.isPending
                                    ? 'Đang gán...'
                                    : !isSameTenant
                                    ? 'Gán toàn sàn'
                                    : 'Chỉ định đơn này'}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="py-24 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                <Compass className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Chưa chọn đơn hàng</p>
                <p className="text-xs text-slate-400 mt-1">
                  Chọn một đơn hàng từ danh sách bên trái để bắt đầu điều phối và quản lý.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {/* Completion Modal */}
      <CompletionModal
        isOpen={isCompleteModalOpen}
        booking={selectedBooking || null}
        isSubmitting={transitionMutation.isPending}
        onClose={() => setIsCompleteModalOpen(false)}
        onConfirm={handleConfirmComplete}
      />

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        isOpen={isCancelModalOpen}
        booking={selectedBooking || null}
        isSubmitting={transitionMutation.isPending}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
      />

      {/* Record Cash Payment Modal */}
      <RecordCashPaymentModal
        isOpen={isRecordPaymentModalOpen}
        booking={selectedBooking || null}
        isSubmitting={recordCashPaymentMutation.isPending}
        onClose={() => setIsRecordPaymentModalOpen(false)}
        onConfirm={handleConfirmCashPayment}
      />
    </div>
  );
};
