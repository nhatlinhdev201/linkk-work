import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Tenant, PartnerApplication } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import {
  Building2,
  FileCheck,
  CheckCircle2,
  XCircle,
  LogIn,
  Search,
  Users,
  Briefcase,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TenantsPage: React.FC = () => {
  const { user, impersonatedTenantId, setImpersonatedTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'tenants' | 'applications'>('tenants');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Reject modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, aList] = await Promise.all([
        api.getTenants(),
        api.getPartnerApplications(),
      ]);
      setTenants(tList);
      setApplications(aList);
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Lỗi tải dữ liệu',
        message: err.message || 'Không thể tải danh sách đối tác',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (appId: string) => {
    try {
      setIsSubmitting(true);
      const newTenant = await api.approvePartnerApplication(appId);
      toast({
        type: 'success',
        title: 'Đã phê duyệt thành công!',
        message: `Đã cấp Tenant [${newTenant.code}] cho doanh nghiệp "${newTenant.name}".`,
      });
      await loadData();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Phê duyệt thất bại',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppId) return;
    if (!rejectionReason.trim()) {
      toast({
        type: 'warning',
        title: 'Thiếu lý do từ chối',
        message: 'Vui lòng nhập lý do để thông báo cho đối tác.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.rejectPartnerApplication(rejectingAppId, rejectionReason);
      toast({
        type: 'info',
        title: 'Đã từ chối hồ sơ',
        message: 'Hồ sơ đã được đánh dấu từ chối.',
      });
      setRejectingAppId(null);
      setRejectionReason('');
      await loadData();
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Thao tác thất bại',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonate = async (tenantId: string, tenantName: string) => {
    try {
      await setImpersonatedTenant(tenantId);
      toast({
        type: 'warning',
        title: 'Đang đóng vai đối tác',
        message: `Bạn đang đại diện cho Tenant "${tenantName}". Dữ liệu hiển thị sẽ được giới hạn trong Tenant này.`,
      });
      navigate('/dashboard');
    } catch (err: any) {
      toast({
        type: 'error',
        title: 'Lỗi ủy quyền',
        message: err.message,
      });
    }
  };

  // Filters
  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingApps = applications.filter((a) => a.status === 'SUBMITTED');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-brand-500" />
            Quản trị Doanh nghiệp & Đối tác
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Duyệt hồ sơ đăng ký doanh nghiệp mới và quản lý phân quyền đa Tenant của nền tảng.
          </p>
        </div>

        {/* Tab switch buttons */}
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'tenants'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Doanh nghiệp hoạt động ({tenants.length})
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'applications'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Hồ sơ chờ duyệt
            {pendingApps.length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                {pendingApps.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Đang tải dữ liệu đối tác...</p>
        </div>
      ) : activeTab === 'tenants' ? (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên công ty, mã tenant, tỉnh thành..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              Hiển thị {filteredTenants.length} / {tenants.length} đơn vị
            </span>
          </div>

          {/* Tenants Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Mã & Doanh nghiệp</th>
                    <th className="py-3.5 px-4">Địa bàn & Thuế</th>
                    <th className="py-3.5 px-4">Gói cước / Phí sàn</th>
                    <th className="py-3.5 px-4">Quy mô thợ & Đơn</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.map((t) => {
                    const isImpersonatingThis = impersonatedTenantId === t.id;
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          t.isDefault ? 'bg-brand-50/30' : ''
                        } ${isImpersonatingThis ? 'bg-amber-50/50' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {t.code.slice(0, 3)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {t.name}
                                {t.isDefault && (
                                  <Badge variant="warning" size="sm">
                                    Mặc định Sàn
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 font-mono">
                                CODE: {t.code} • {t.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{t.city}</div>
                          <div className="text-xs text-slate-400">MST: {t.taxId || 'N/A'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={t.plan === 'ENTERPRISE' ? 'primary' : 'neutral'} size="sm">
                              {t.plan}
                            </Badge>
                            <span className="text-xs font-semibold text-slate-600">
                              {t.commissionRate}% hoa hồng
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {t.taskerCount} thợ
                            </span>
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                              {t.activeOrderCount} đơn chạy
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={t.status === 'ACTIVE' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {t.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user?.role === 'SUPER_ADMIN' && !t.isDefault && (
                              <Button
                                size="sm"
                                variant={isImpersonatingThis ? 'secondary' : 'outline'}
                                onClick={() => handleImpersonate(t.id, t.name)}
                                leftIcon={<LogIn className="w-3.5 h-3.5 text-amber-600" />}
                                className={isImpersonatingThis ? 'border-amber-400 bg-amber-100 text-amber-800' : ''}
                              >
                                {isImpersonatingThis ? 'Đang đại diện' : 'Đại diện'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Applications Tab */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Quy trình thẩm định đối tác doanh nghiệp:</p>
              <p className="text-amber-700 mt-0.5">
                Kiểm tra kỹ mã số thuế, tính hợp lệ của giấy phép đăng ký kinh doanh và thông tin người đại diện theo pháp luật trước khi bấm duyệt. Khi phê duyệt, hệ thống sẽ tự động khởi tạo Tenant độc lập và tài khoản Tenant Admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.length === 0 ? (
              <div className="col-span-2 py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Không có đơn đăng ký đối tác nào.
              </div>
            ) : (
              applications.map((app) => (
                <Card key={app.id} className="relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 right-0 h-1.5 ${
                      app.status === 'SUBMITTED'
                        ? 'bg-amber-500'
                        : app.status === 'APPROVED'
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                  />
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {app.businessName}
                      </CardTitle>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Mã đơn: {app.id} • Ngày nộp:{' '}
                        {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                    <Badge
                      variant={
                        app.status === 'SUBMITTED'
                          ? 'warning'
                          : app.status === 'APPROVED'
                          ? 'success'
                          : 'danger'
                      }
                    >
                      {app.status === 'SUBMITTED'
                        ? 'Chờ duyệt'
                        : app.status === 'APPROVED'
                        ? 'Đã duyệt'
                        : 'Từ chối'}
                    </Badge>
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-50 rounded-lg p-2.5">
                      <div>
                        <span className="text-slate-400 block">Đại diện pháp luật:</span>
                        <span className="font-semibold text-slate-800">{app.contactName}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Số điện thoại:</span>
                        <span className="font-semibold text-slate-800">{app.contactPhone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Mã số thuế (MST):</span>
                        <span className="font-mono font-medium text-slate-800">{app.taxId}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Khu vực hoạt động:</span>
                        <span className="font-semibold text-slate-800">{app.city}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-slate-400 block mb-1">Dịch vụ cung cấp:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {app.services.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded-md font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Giấy phép ĐKKD:</span>
                      <a
                        href={app.licenseDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium underline"
                      >
                        Xem tài liệu xác minh <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {app.rejectionReason && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
                        <span className="font-semibold">Lý do từ chối:</span> {app.rejectionReason}
                      </div>
                    )}

                    {app.status === 'SUBMITTED' && (
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingAppId(app.id);
                            setRejectionReason('');
                          }}
                          leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                          disabled={isSubmitting}
                        >
                          Từ chối
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApprove(app.id)}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          disabled={isSubmitting}
                        >
                          Phê duyệt & Cấp Tenant
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingAppId}
        onClose={() => setRejectingAppId(null)}
        title="Từ chối hồ sơ đăng ký đối tác"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectingAppId(null)}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              disabled={isSubmitting}
            >
              Xác nhận từ chối
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Vui lòng nhập lý do từ chối để gửi thông báo giải trình cho doanh nghiệp đăng ký:
          </p>
          <textarea
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Ví dụ: Giấy phép kinh doanh bị mờ, mã số thuế không trùng khớp trên Cổng thông tin quốc gia..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};
