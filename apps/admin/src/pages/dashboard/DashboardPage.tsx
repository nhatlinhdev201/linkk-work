import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  CheckCircle2,
  PlusCircle,
  Radio,
  ArrowUpRight,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../api/client';
import { Booking, Tasker } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
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
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.status === 'COMPLETED' || b.status === 'IN_PROGRESS' ? b.totalAmount : 0), 0);
  const activeOrders = bookings.filter((b) => b.status === 'PENDING_DISPATCH' || b.status === 'BROADCASTING' || b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS').length;
  const onlineTaskers = taskers.filter((t) => t.isOnline).length;

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'IN_PROGRESS':
        return <Badge variant="warning" dot>Đang làm việc</Badge>;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
              {isSuperAdmin && !isImpersonating ? 'Bảng Điều Khiển Nền Tảng' : 'Bảng Điều Khiển Tenant'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Hôm nay: {new Date().toLocaleDateString('vi-VN')}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Xin chào, {user?.name}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Đang quản trị phạm vi:{' '}
            <strong className="text-slate-900 underline decoration-brand-500 font-semibold">
              {activeTenantName}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/bookings">
            <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
              Tạo Đơn Thủ Công
            </Button>
          </Link>
          <Link to="/dispatch">
            <Button variant="secondary" icon={<Radio className="w-4 h-4" />}>
              Bàn Điều Phối
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Doanh thu ghi nhận</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {totalRevenue.toLocaleString('vi-VN')} <span className="text-sm font-normal text-slate-500">đ</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+15.4% so với hôm qua</span>
          </div>
        </Card>

        {/* Stat 2 */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Đơn hàng đang xử lý</span>
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {activeOrders}{' '}
            <span className="text-sm font-normal text-slate-500">/ {bookings.length} tổng đơn</span>
          </div>
          <div className="mt-2 text-xs text-brand-600 font-semibold flex items-center gap-1">
            <span>Theo dõi thời gian thực</span>
          </div>
        </Card>

        {/* Stat 3 */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tasker Trực tuyến</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            {onlineTaskers}{' '}
            <span className="text-sm font-normal text-slate-500">/ {taskers.length} nhân sự</span>
          </div>
          <div className="mt-2 text-xs text-sky-600 font-semibold flex items-center gap-1">
            <span>Sẵn sàng nhận việc</span>
          </div>
        </Card>

        {/* Stat 4 */}
        <Card className="p-5">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tỷ lệ hoàn thành</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
            98.5%
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
            <span>⭐ Điểm sao trung bình 4.92</span>
          </div>
        </Card>
      </div>

      {/* Recent Orders Section */}
      <Card
        title="Danh Sách Đơn Hàng Gần Đây"
        subtitle={`Phạm vi quản lý: ${activeTenantName}`}
        action={
          <Link
            to="/bookings"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <span>Xem toàn bộ</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">Đang tải dữ liệu đơn hàng...</div>
        ) : bookings.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">Chưa có đơn hàng nào trong Tenant này.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-y border-slate-100">
                <tr>
                  <th className="px-4 py-3">Mã đơn</th>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Dịch vụ</th>
                  <th className="px-4 py-3">Thời gian ca</th>
                  <th className="px-4 py-3">Thực hiện</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-xs text-brand-700">
                      {b.code}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-slate-900">{b.customerName}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[200px]" title={b.addressText}>
                          {b.addressText}
                        </span>
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-slate-800">{b.serviceName}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 flex items-center gap-1.5 mt-3">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(b.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {b.assignedTaskerName ? (
                        <span className="font-medium text-xs text-slate-900 bg-slate-100 px-2 py-1 rounded">
                          {b.assignedTaskerName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa gán thợ</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(b.status)}</td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-900">
                      {b.totalAmount.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
