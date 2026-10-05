import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  CheckCircle2,
  PlusCircle,
  Radio,
  ArrowRight,
  Clock,
  MapPin,
  Compass,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { Booking, Tasker } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/common/Table';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, isSuperAdmin, activeTenantId, activeTenantName, isImpersonating } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [taskers, setTaskers] = useState<Tasker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [bList, tList] = await Promise.all([
          api.getBookings(isSuperAdmin && !isImpersonating ? null : activeTenantId),
          api.getTaskers(isSuperAdmin && !isImpersonating ? null : activeTenantId),
        ]);
        setBookings(bList);
        setTaskers(tList);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTenantId, isSuperAdmin, isImpersonating]);

  // Compute metrics
  const totalRevenue = bookings.reduce(
    (sum, b) =>
      sum + (b.status === 'COMPLETED' || b.status === 'IN_PROGRESS' ? b.totalAmount : 0),
    0
  );
  const activeOrders = bookings.filter(
    (b) =>
      b.status === 'PENDING_DISPATCH' ||
      b.status === 'BROADCASTING' ||
      b.status === 'ASSIGNED' ||
      b.status === 'IN_PROGRESS'
  ).length;
  const onlineTaskers = taskers.filter((t) => t.isOnline).length;
  const completionRate =
    bookings.length > 0
      ? Math.round(
          (bookings.filter((b) => b.status === 'COMPLETED').length / bookings.length) * 100
        )
      : 96;

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="warning" dot>Đang làm</Badge>;
      case 'COMPLETED':
        return <Badge variant="success" dot>Hoàn thành</Badge>;
      case 'ASSIGNED':
        return <Badge variant="info" dot>Đã gán thợ</Badge>;
      case 'PENDING_DISPATCH':
        return <Badge variant="danger" dot>Chờ điều phối</Badge>;
      case 'BROADCASTING':
        return <Badge variant="brand" dot>Đang bắn đơn</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
              {isSuperAdmin && !isImpersonating
                ? 'Bảng Điều Khiển Toàn Sàn'
                : 'Bảng Điều Khiển Tenant'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">
              {new Date().toLocaleDateString('vi-VN')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Xin chào, {user?.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Không gian quản lý hiện hành:{' '}
            <strong className="text-slate-800 font-semibold">{activeTenantName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/dispatch">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Radio className="w-3.5 h-3.5 text-brand-500" />}
            >
              Bàn Điều phối
            </Button>
          </Link>
          <Link to="/bookings">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
            >
              Tạo đơn mới
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng doanh thu đơn"
          value={`${totalRevenue.toLocaleString('vi-VN')} đ`}
          icon={<TrendingUp className="w-5 h-5 text-brand-600" />}
          trend={{ value: 18.5, isPositive: true, label: 'vs tháng trước' }}
        />
        <StatCard
          title="Đơn đang hoạt động"
          value={activeOrders}
          icon={<ShoppingBag className="w-5 h-5 text-blue-600" />}
          iconBgColor="bg-blue-50 text-blue-600 border border-blue-100"
          description={`Tổng số ${bookings.length} đơn tích lũy`}
        />
        <StatCard
          title="Tỷ lệ hoàn thành"
          value={`${completionRate}%`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
          trend={{ value: 2.1, isPositive: true, label: 'chất lượng dịch vụ' }}
        />
        <StatCard
          title="Thợ đang trực tuyến"
          value={`${onlineTaskers} / ${taskers.length}`}
          icon={<Users className="w-5 h-5 text-amber-600" />}
          iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
          description="Sẵn sàng nhận việc tức thì"
        />
      </div>

      {/* Recent Bookings Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Đơn Hàng Gần Đây Cần Theo Dõi
            </h2>
            <p className="text-xs text-slate-500">
              Cập nhật thời gian thực các đơn đang xử lý và mới tạo
            </p>
          </div>
          <Link
            to="/bookings"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span className="text-xs font-medium">Đang đồng bộ dữ liệu...</span>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={<Compass className="w-8 h-8 text-brand-400" />}
            title="Chưa có đơn hàng nào trong hệ thống"
            description="Hãy bấm 'Tạo đơn mới' để khởi tạo đơn hàng phục vụ khách hàng đầu tiên."
            action={
              <Link to="/bookings">
                <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Tạo đơn ngay
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Mã đơn</TableHead>
                <TableHead>Dịch vụ</TableHead>
                <TableHead>Khách hàng &amp; Địa chỉ</TableHead>
                <TableHead>Thời gian hẹn</TableHead>
                <TableHead>Thợ phụ trách</TableHead>
                <TableHead align="right">Tổng tiền</TableHead>
                <TableHead align="center">Trạng thái</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {bookings.slice(0, 5).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <span className="font-mono font-bold text-brand-600 text-xs">{b.code}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-900 text-xs">{b.serviceName}</span>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      {b.pricingType}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 text-xs">{b.customerName}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {b.addressText}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-700 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3 text-brand-500" />
                      {new Date(b.scheduledAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {new Date(b.scheduledAt).toLocaleDateString('vi-VN')}
                    </div>
                  </TableCell>
                  <TableCell>
                    {b.assignedTaskerName ? (
                      <div className="text-xs font-medium text-slate-900">
                        {b.assignedTaskerName}
                      </div>
                    ) : (
                      <span className="text-xs text-amber-600 italic font-medium">
                        Chưa phân công
                      </span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <span className="font-bold text-xs text-slate-900">
                      {b.totalAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </TableCell>
                  <TableCell align="center">{getStatusBadge(b.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
