import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import { Booking, Tasker } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { SkeletonDispatch } from '../../components/common/Skeleton';
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
  AlertTriangle,
  Send,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export const DispatchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlBookingId = searchParams.get('bookingId');

  const { currentTenantId, currentTenantName } = useAuth();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [taskers, setTaskers] = useState<Tasker[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(urlBookingId);
  const [loading, setLoading] = useState(true);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bList, tList] = await Promise.all([
        api.getBookings(currentTenantId),
        api.getTaskers(currentTenantId),
      ]);
      setBookings(bList);
      setTaskers(tList);

      // Auto select first pending booking if none selected or not valid
      const pendingList = bList.filter(
        (b) =>
          b.status === 'PENDING_DISPATCH' ||
          b.status === 'BROADCASTING' ||
          b.status === 'MATCHING'
      );
      if (urlBookingId && bList.find((b) => b.id === urlBookingId)) {
        setSelectedBookingId(urlBookingId);
      } else if (pendingList.length > 0 && !selectedBookingId) {
        setSelectedBookingId(pendingList[0].id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải dữ liệu điều phối';
      toast({
        type: 'error',
        title: 'Lỗi tải dữ liệu điều phối',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentTenantId]);

  const selectedBooking = bookings.find((b) => b.id === selectedBookingId);

  const handleDirectAssign = async (taskerId: string, taskerName: string) => {
    if (!selectedBooking) return;
    try {
      setAssigningTaskId(taskerId);
      await api.directAssignBooking(selectedBooking.id, taskerId, currentTenantId);
      toast({
        type: 'success',
        title: 'Chỉ định thành công!',
        message: `Đơn [${selectedBooking.code}] đã được giao cho đối tác ${taskerName}.`,
      });
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Chỉ định thất bại';
      toast({
        type: 'error',
        title: 'Chỉ định thất bại',
        message,
      });
    } finally {
      setAssigningTaskId(null);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedBooking) return;
    try {
      await api.broadcastInternalBooking(selectedBooking.id);
      toast({
        type: 'info',
        title: 'Đã phát sóng đơn nội bộ',
        message: `Hệ thống đã bắn thông báo đơn [${selectedBooking.code}] tới ứng dụng của toàn bộ thợ thuộc ${currentTenantName}.`,
      });
      await loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bắn đơn thất bại';
      toast({
        type: 'error',
        title: 'Bắn đơn thất bại',
        message,
      });
    }
  };

  const pendingBookings = bookings.filter(
    (b) =>
      b.status === 'PENDING_DISPATCH' ||
      b.status === 'BROADCASTING' ||
      b.status === 'MATCHING'
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
            Trung tâm gán việc trực tiếp và phát tán đơn hàng nội bộ cho thợ thuộc{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning" size="md">
            {pendingBookings.length} đơn chờ điều phối
          </Badge>
          <Badge variant="primary" size="md">
            {taskers.filter((t) => t.isOnline).length} / {taskers.length} thợ đang online
          </Badge>
        </div>
      </div>

      {loading ? (
        <SkeletonDispatch />
      ) : (

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: List of Pending Bookings */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-brand-500" />
              Hàng đợi cần xử lý ({pendingBookings.length})
            </h2>

            {pendingBookings.length === 0 ? (
              <Card className="p-8 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="font-medium text-slate-700">Hàng đợi trống</p>
                <p className="text-xs text-slate-500 mt-1">
                  Hiện không có đơn nào đang cần gán việc gấp.
                </p>
              </Card>
            ) : (
              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {pendingBookings.map((b) => {
                  const isSelected = selectedBookingId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookingId(b.id)}
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
                        <Badge
                          variant={b.status === 'BROADCASTING' ? 'info' : 'warning'}
                          size="sm"
                        >
                          {b.status === 'BROADCASTING' ? 'Đang bắn' : 'Chưa gán'}
                        </Badge>
                      </div>

                      <div className="font-semibold text-slate-900 text-sm mt-1">
                        {b.serviceName}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {b.addressText}
                      </div>

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

          {/* Right Column: Dispatch Action Center */}
          <div className="lg:col-span-8 space-y-6">
            {selectedBooking ? (
              <>
                {/* Selected Booking Detail Card */}
                <Card className="border-brand-200 bg-gradient-to-br from-white to-orange-50/30">
                  <CardHeader className="pb-3 border-b border-orange-100 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-brand-100 text-brand-800 px-2 py-0.5 rounded">
                          {selectedBooking.code}
                        </span>
                        <Badge variant="warning">{selectedBooking.status}</Badge>
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
                        {selectedBooking.durationHours} giờ dự kiến
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
                        <Zap className="w-4 h-4 text-brand-500" />
                        <span>
                          Phương thức tính giá:{' '}
                          <strong className="text-slate-900">
                            {selectedBooking.pricingType}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Quick Action: Internal Broadcast */}
                  <div className="p-4 bg-orange-100/60 border-t border-orange-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-brand-900 font-medium">
                      <Radio className="w-4 h-4 text-brand-600 shrink-0 animate-pulse" />
                      <span>
                        Bắn đơn tự động qua WebSocket/FCM để thợ trong Tenant giật đơn tức thì (&lt;5ms).
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleBroadcast}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Bắn đơn nội bộ ngay
                    </Button>
                  </div>
                </Card>

                {/* Direct Assignment: Tasker List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-brand-500" />
                      Chỉ định trực tiếp thợ nội bộ của {currentTenantName}
                    </h3>
                    <span className="text-xs text-slate-400">
                      Chỉ hiển thị nhân sự trực thuộc đơn vị
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {taskers.map((t) => {
                      const isAssignedToThis = selectedBooking.assignedTaskerId === t.id;
                      const hasEnoughDeposit = t.depositBalance >= 100000;

                      return (
                        <div
                          key={t.id}
                          className={`p-3.5 rounded-xl border bg-white flex flex-col justify-between gap-3 transition-all ${
                            isAssignedToThis
                              ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/30'
                              : 'border-slate-200 hover:border-slate-300'
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

                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                t.isOnline
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {t.isOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
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
                              variant={isAssignedToThis ? 'secondary' : 'primary'}
                              disabled={assigningTaskId === t.id || isAssignedToThis}
                              onClick={() => handleDirectAssign(t.id, t.name)}
                              leftIcon={
                                isAssignedToThis ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : undefined
                              }
                            >
                              {isAssignedToThis
                                ? 'Đang phụ trách'
                                : assigningTaskId === t.id
                                ? 'Đang gán...'
                                : 'Chỉ định đơn này'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="py-24 text-center bg-white rounded-xl border border-slate-200 text-slate-400">
                <Compass className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-700">Chưa chọn đơn hàng</p>
                <p className="text-xs text-slate-400 mt-1">
                  Chọn một đơn hàng từ danh sách bên trái để bắt đầu điều phối.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
