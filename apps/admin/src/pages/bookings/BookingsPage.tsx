import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Booking } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  CalendarDays,
  PlusCircle,
  Search,
  Filter,
  Clock,
  MapPin,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const BookingsPage: React.FC = () => {
  const { currentTenantId, currentTenantName } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal manual booking state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    addressText: '',
    serviceName: 'Dọn dẹp nhà theo giờ',
    pricingType: 'HOURLY' as 'HOURLY' | 'PER_UNIT' | 'BIDDING',
    scheduledAt: new Date(Date.now() + 3600 * 2000).toISOString().slice(0, 16),
    durationHours: 3,
    totalAmount: 240000,
  });

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings(currentTenantId);
      setBookings(data);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Lỗi tải danh sách đơn',
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [currentTenantId]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName || !form.customerPhone || !form.addressText) {
      toast({
        type: 'warning',
        title: 'Thiếu thông tin',
        message: 'Vui lòng nhập đầy đủ tên khách, số điện thoại và địa chỉ thực hiện việc.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await api.createManualBooking(
        currentTenantId,
        currentTenantName,
        {
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          addressText: form.addressText,
          serviceName: form.serviceName,
          pricingType: form.pricingType,
          scheduledAt: form.scheduledAt,
          durationHours: Number(form.durationHours),
          totalAmount: Number(form.totalAmount),
        }
      );

      toast({
        type: 'success',
        title: 'Tạo đơn thành công!',
        message: `Đơn hàng [${created.code}] đã được khởi tạo trong phạm vi ${currentTenantName}.`,
      });

      setIsModalOpen(false);
      // Reset form
      setForm({
        customerName: '',
        customerPhone: '',
        addressText: '',
        serviceName: 'Dọn dẹp nhà theo giờ',
        pricingType: 'HOURLY',
        scheduledAt: new Date(Date.now() + 3600 * 2000).toISOString().slice(0, 16),
        durationHours: 3,
        totalAmount: 240000,
      });

      await loadBookings();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Tạo đơn thất bại',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    const matchSearch =
      b.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.includes(searchQuery) ||
      b.addressText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'ALL') return matchSearch;
    return matchSearch && b.status === statusFilter;
  });

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'PENDING_DISPATCH':
        return <Badge variant="warning">Chờ điều phối</Badge>;
      case 'MATCHING':
      case 'BROADCASTING':
        return <Badge variant="info">Đang bắn đơn nội bộ</Badge>;
      case 'ASSIGNED':
      case 'ON_THE_WAY':
        return <Badge variant="primary">Đã nhận việc</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="warning">Đang làm việc</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Hoàn thành</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Đã hủy</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-brand-500" />
            Quản lý Đơn hàng Dịch vụ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đơn vị quản lý:{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>. Theo dõi
            và điều phối toàn bộ lịch đặt hẹn dịch vụ.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Tạo đơn thủ công
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách, SĐT, địa chỉ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'PENDING_DISPATCH', label: 'Chờ điều phối' },
            { id: 'BROADCASTING', label: 'Đang bắn đơn' },
            { id: 'ASSIGNED', label: 'Đã nhận việc' },
            { id: 'IN_PROGRESS', label: 'Đang làm' },
            { id: 'COMPLETED', label: 'Hoàn thành' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-all ${
                statusFilter === tab.id
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải danh sách đơn hàng...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <p className="text-base font-semibold text-slate-600">Không tìm thấy đơn hàng nào</p>
          <p className="text-xs mt-1">Hãy thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã đơn & Dịch vụ</th>
                  <th className="py-3.5 px-4">Khách hàng & Địa chỉ</th>
                  <th className="py-3.5 px-4">Lịch hẹn & Thời lượng</th>
                  <th className="py-3.5 px-4">Thợ phụ trách</th>
                  <th className="py-3.5 px-4">Tổng tiền & Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Điều phối</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-brand-600">{b.code}</div>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5">
                        {b.serviceName}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {b.pricingType === 'HOURLY'
                          ? 'Tính theo giờ'
                          : b.pricingType === 'PER_UNIT'
                          ? 'Theo đơn vị'
                          : 'Đấu thầu RFQ'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {b.customerName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {b.customerPhone}
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1 mt-1 truncate max-w-xs">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {b.addressText}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 font-medium flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        {new Date(b.scheduledAt).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {b.durationHours ? `${b.durationHours} giờ làm việc` : 'Theo khối lượng'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {b.assignedTaskerName ? (
                        <div>
                          <div className="font-medium text-slate-900 flex items-center gap-1 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            {b.assignedTaskerName}
                          </div>
                          <div className="text-xs text-slate-400">{b.assignedTaskerPhone}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium italic">
                          Chưa phân công thợ
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {b.totalAmount.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="mt-1">{getStatusBadge(b.status)}</div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {b.status === 'PENDING_DISPATCH' || b.status === 'BROADCASTING' ? (
                        <Link
                          to={`/dispatch?bookingId=${b.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                        >
                          Điều phối ngay
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <Link
                          to={`/dispatch?bookingId=${b.id}`}
                          className="text-xs text-slate-400 hover:text-slate-700 font-medium"
                        >
                          Xem chi tiết
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Booking Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tạo đơn hàng dịch vụ thủ công"
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateBooking}
              disabled={isSubmitting}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {isSubmitting ? 'Đang khởi tạo...' : 'Xác nhận & Tạo đơn'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateBooking} className="space-y-4">
          <div className="p-3 bg-brand-50 border border-brand-200 rounded-lg text-xs text-brand-900">
            Đơn này sẽ được gắn cố định với Tenant:{' '}
            <strong className="text-brand-700">{currentTenantName}</strong>. Chỉ điều phối viên và
            thợ của Tenant này mới được phép xử lý.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Họ và tên khách hàng *"
              placeholder="Nguyễn Văn A"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              required
            />
            <Input
              label="Số điện thoại liên hệ *"
              placeholder="0912345678"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              required
            />
          </div>

          <Input
            label="Địa chỉ chi tiết nơi làm việc *"
            placeholder="Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM"
            value={form.addressText}
            onChange={(e) => setForm({ ...form, addressText: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Gói dịch vụ"
              value={form.serviceName}
              onChange={(e) => setForm({ ...form, serviceName: e.target.value })}
              options={[
                { value: 'Dọn dẹp nhà theo giờ', label: 'Dọn dẹp nhà theo giờ' },
                { value: 'Vệ sinh máy lạnh / Điều hòa', label: 'Vệ sinh máy lạnh / Điều hòa' },
                { value: 'Tổng vệ sinh sau xây dựng', label: 'Tổng vệ sinh sau xây dựng' },
                { value: 'Sửa chữa điện nước khẩn cấp', label: 'Sửa chữa điện nước khẩn cấp' },
                { value: 'Giặt ghế Sofa / Đệm cao su', label: 'Giặt ghế Sofa / Đệm cao su' },
              ]}
            />

            <Select
              label="Hình thức tính giá"
              value={form.pricingType}
              onChange={(e) =>
                setForm({
                  ...form,
                  pricingType: e.target.value as any,
                })
              }
              options={[
                { value: 'HOURLY', label: 'Tính theo giờ (Hourly)' },
                { value: 'PER_UNIT', label: 'Theo đơn vị cố định (Per-unit)' },
                { value: 'BIDDING', label: 'Đấu thầu báo giá (RFQ)' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Thời gian hẹn làm việc"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              required
            />
            <Input
              label="Số giờ dự kiến"
              type="number"
              min={1}
              max={12}
              value={form.durationHours}
              onChange={(e) => {
                const hours = Number(e.target.value);
                setForm({
                  ...form,
                  durationHours: hours,
                  totalAmount: hours * 80000,
                });
              }}
            />
            <Input
              label="Tổng cước phí (VND) *"
              type="number"
              value={form.totalAmount}
              onChange={(e) => setForm({ ...form, totalAmount: Number(e.target.value) })}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
