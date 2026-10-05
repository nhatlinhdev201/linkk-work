import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Booking, PricingModel } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/common/Table';
import {
  CalendarDays,
  PlusCircle,
  Search,
  Clock,
  MapPin,
  User,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const BookingsPage: React.FC = () => {
  const { currentTenantId, currentTenantName } = useAuth();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modal manual booking state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    addressText: '',
    serviceName: 'Dọn dẹp nhà theo giờ',
    pricingType: 'HOURLY' as PricingModel,
    scheduledAt: new Date(Date.now() + 3600 * 2000).toISOString().slice(0, 16),
    durationHours: 3,
    totalAmount: 240000,
  });

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings(currentTenantId);
      setBookings(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải danh sách đơn';
      toast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [currentTenantId]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.customerName.trim() || form.customerName.trim().length < 2) {
      errors.customerName = 'Họ tên khách hàng phải có ít nhất 2 ký tự';
    }
    const phoneClean = form.customerPhone.trim().replace(/\s+/g, '');
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneClean || !phoneRegex.test(phoneClean)) {
      errors.customerPhone = 'Số điện thoại không hợp lệ (Ví dụ: 0912345678)';
    }
    if (!form.addressText.trim() || form.addressText.trim().length < 5) {
      errors.addressText = 'Vui lòng nhập địa chỉ cụ thể (tối thiểu 5 ký tự)';
    }
    if (form.totalAmount <= 0) {
      errors.totalAmount = 'Tổng cước phí phải lớn hơn 0 đ';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast({
        type: 'warning',
        title: 'Dữ liệu chưa hợp lệ',
        message: 'Vui lòng kiểm tra lại các trường báo lỗi màu đỏ trên biểu mẫu.',
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Tạo đơn thất bại';
      toast({
        type: 'error',
        title: 'Tạo đơn thất bại',
        message,
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
        return <Badge variant="brand">Đã nhận việc</Badge>;
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

  const filterTabs = [
    { id: 'ALL', label: 'Tất cả', count: bookings.length },
    {
      id: 'PENDING_DISPATCH',
      label: 'Chờ điều phối',
      count: bookings.filter((b) => b.status === 'PENDING_DISPATCH').length,
    },
    {
      id: 'BROADCASTING',
      label: 'Đang bắn đơn',
      count: bookings.filter((b) => b.status === 'BROADCASTING').length,
    },
    {
      id: 'ASSIGNED',
      label: 'Đã nhận việc',
      count: bookings.filter((b) => b.status === 'ASSIGNED' || b.status === 'ON_THE_WAY').length,
    },
    {
      id: 'IN_PROGRESS',
      label: 'Đang làm',
      count: bookings.filter((b) => b.status === 'IN_PROGRESS').length,
    },
    {
      id: 'COMPLETED',
      label: 'Hoàn thành',
      count: bookings.filter((b) => b.status === 'COMPLETED').length,
    },
  ];

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

        <Button
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          leftIcon={<PlusCircle className="w-4 h-4" />}
        >
          Tạo đơn thủ công
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs
          tabs={filterTabs}
          activeTab={statusFilter}
          onChange={setStatusFilter}
          size="sm"
        />

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách hàng, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Bookings Table / Empty State */}
      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="w-8 h-8 text-brand-400" />}
          title="Không tìm thấy đơn hàng nào"
          description="Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc trạng thái khác."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
                setCurrentPage(1);
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Mã đơn &amp; Dịch vụ</TableHead>
                  <TableHead>Khách hàng &amp; Địa chỉ</TableHead>
                  <TableHead>Lịch hẹn &amp; Thời lượng</TableHead>
                  <TableHead>Thợ phụ trách</TableHead>
                  <TableHead align="right">Tổng cước</TableHead>
                  <TableHead align="center">Trạng thái</TableHead>
                  <TableHead align="right">Điều phối</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {filteredBookings
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <span className="font-mono font-bold text-brand-600 text-xs block">
                          {b.code}
                        </span>
                        <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                          {b.serviceName}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {b.pricingType === 'HOURLY'
                            ? 'Theo giờ'
                            : b.pricingType === 'PER_UNIT'
                            ? 'Đơn vị cố định'
                            : 'Đấu thầu RFQ'}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-slate-900 text-xs">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {b.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          {b.customerPhone}
                        </div>
                        <div className="text-[11px] text-slate-600 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {b.addressText}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-slate-800 font-medium flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          {new Date(b.scheduledAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {b.durationHours ? `${b.durationHours} giờ làm việc` : 'Theo khối lượng'}
                        </div>
                      </TableCell>

                      <TableCell>
                        {b.assignedTaskerName ? (
                          <div>
                            <div className="font-medium text-slate-900 flex items-center gap-1 text-xs">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {b.assignedTaskerName}
                            </div>
                            <div className="text-[11px] text-slate-400">{b.assignedTaskerPhone}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium italic">
                            Chưa phân công thợ
                          </span>
                        )}
                      </TableCell>

                      <TableCell align="right">
                        <span className="font-bold text-slate-900 text-xs">
                          {b.totalAmount.toLocaleString('vi-VN')} đ
                        </span>
                      </TableCell>

                      <TableCell align="center">{getStatusBadge(b.status)}</TableCell>

                      <TableCell align="right">
                        {b.status === 'PENDING_DISPATCH' || b.status === 'BROADCASTING' ? (
                          <Link
                            to={`/dispatch?bookingId=${b.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                          >
                            Điều phối
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <Link
                            to={`/dispatch?bookingId=${b.id}`}
                            className="text-xs text-slate-400 hover:text-slate-700 font-medium"
                          >
                            Chi tiết
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-3">
            {filteredBookings
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 transition active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-brand-600 text-xs">{b.code}</span>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">
                          • {b.pricingType === 'HOURLY' ? 'Theo giờ' : b.pricingType === 'PER_UNIT' ? 'Cố định' : 'RFQ'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-0.5">{b.serviceName}</h4>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className="grid grid-cols-1 gap-1.5 text-xs bg-slate-50 p-2.5 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {b.customerName}
                      </span>
                      <span className="text-slate-400 font-mono">{b.customerPhone}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {b.addressText}
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-brand-500" />
                        {new Date(b.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(b.scheduledAt).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="font-medium text-slate-700">
                        {b.assignedTaskerName ? b.assignedTaskerName : 'Chưa phân công'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Tổng cước:</span>
                      <span className="text-sm font-black text-brand-600">
                        {b.totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <Link
                      to={`/dispatch?bookingId=${b.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                    >
                      {b.status === 'PENDING_DISPATCH' || b.status === 'BROADCASTING' ? 'Điều phối ngay' : 'Chi tiết đơn'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredBookings.length / pageSize)}
            totalItems={filteredBookings.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Manual Booking Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormErrors({});
        }}
        title="Tạo đơn hàng dịch vụ thủ công"
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setFormErrors({});
              }}
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
              label="Họ và tên khách hàng"
              placeholder="Nguyễn Văn A"
              value={form.customerName}
              onChange={(e) => {
                setForm({ ...form, customerName: e.target.value });
                if (formErrors.customerName) setFormErrors({ ...formErrors, customerName: '' });
              }}
              error={formErrors.customerName}
              required
            />
            <Input
              label="Số điện thoại liên hệ"
              placeholder="0912345678"
              value={form.customerPhone}
              onChange={(e) => {
                setForm({ ...form, customerPhone: e.target.value });
                if (formErrors.customerPhone) setFormErrors({ ...formErrors, customerPhone: '' });
              }}
              error={formErrors.customerPhone}
              required
            />
          </div>

          <Input
            label="Địa chỉ chi tiết nơi làm việc"
            placeholder="Số 45, Đường Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM"
            value={form.addressText}
            onChange={(e) => {
              setForm({ ...form, addressText: e.target.value });
              if (formErrors.addressText) setFormErrors({ ...formErrors, addressText: '' });
            }}
            error={formErrors.addressText}
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
                  pricingType: e.target.value as PricingModel,
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
