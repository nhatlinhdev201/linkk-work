import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import {
  useTenantsQuery,
  usePartnerApplicationsQuery,
  useApprovePartnerMutation,
  useRejectPartnerMutation,
} from '../../api/queries';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonTable, SkeletonCardGrid } from '../../components/common/Skeleton';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TenantsPage: React.FC = () => {
  const { user, impersonatedTenantId, setImpersonatedTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('tenants');

  const { data: tenants = [], isLoading: isLoadingTenants } = useTenantsQuery();
  const { data: applications = [], isLoading: isLoadingApps } = usePartnerApplicationsQuery();

  const approveMutation = useApprovePartnerMutation();
  const rejectMutation = useRejectPartnerMutation();

  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;
  const [appCurrentPage, setAppCurrentPage] = useState(1);
  const appPageSize = 4;

  // Reject modal state
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const handleApprove = async (appId: string) => {
    try {
      await approveMutation.mutateAsync(appId);
    } catch {
      // Handled in mutation onError
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingAppId) return;
    if (!rejectionReason.trim()) {
      setRejectionError('Vui lòng nhập lý do từ chối để thông báo cho đối tác.');
      return;
    }

    try {
      await rejectMutation.mutateAsync({ appId: rejectingAppId, reason: rejectionReason });
      setRejectingAppId(null);
      setRejectionReason('');
      setRejectionError(null);
    } catch {
      // Handled in mutation onError
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi ủy quyền';
      toast({
        type: 'error',
        title: 'Lỗi ủy quyền',
        message,
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
            Quản trị Doanh nghiệp &amp; Đối tác
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Duyệt hồ sơ đăng ký doanh nghiệp mới và quản lý phân quyền đa Tenant của nền tảng.
          </p>
        </div>

        {/* Tab switcher */}
        <Tabs
          tabs={[
            {
              id: 'tenants',
              label: 'Doanh nghiệp hoạt động',
              icon: <Building2 className="w-4 h-4" />,
              count: tenants.length,
            },
            {
              id: 'applications',
              label: 'Hồ sơ chờ duyệt',
              icon: <FileCheck className="w-4 h-4" />,
              count: pendingApps.length,
            },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Main Content */}
      {activeTab === 'tenants' ? (
        isLoadingTenants && tenants.length === 0 ? (
          <SkeletonTable rows={6} cols={6} />
        ) : (
          <div className="space-y-4">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo tên công ty, mã tenant, tỉnh thành..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <span className="text-xs text-slate-500">
              Hiển thị {Math.min(filteredTenants.length, (currentPage - 1) * pageSize + 1)} - {Math.min(filteredTenants.length, currentPage * pageSize)} / {filteredTenants.length} đơn vị
            </span>
          </div>

          {/* Tenants Dual-Mode (Desktop Table + Mobile Cards) */}
          {filteredTenants.length === 0 ? (
            <EmptyState
              icon={<Building2 className="w-8 h-8 text-brand-400" />}
              title="Không tìm thấy doanh nghiệp đối tác nào"
              description="Hãy thử nhập từ khóa tìm kiếm khác."
            />
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableHead>Mã &amp; Doanh nghiệp</TableHead>
                      <TableHead>Địa bàn &amp; Thuế</TableHead>
                      <TableHead>Gói cước / Phí sàn</TableHead>
                      <TableHead>Quy mô thợ &amp; Đơn</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead align="right">Thao tác</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants
                      .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                      .map((t) => {
                        const isImpersonatingThis = impersonatedTenantId === t.id;
                        return (
                          <TableRow
                            key={t.id}
                            className={`${t.isDefault ? 'bg-brand-50/20' : ''} ${
                              isImpersonatingThis ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                  {t.code.slice(0, 3)}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                                    {t.name}
                                    {t.isDefault && (
                                      <Badge variant="warning" size="sm">
                                        Mặc định Sàn
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    CODE: {t.code} • {t.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-slate-800 font-medium text-xs">{t.city}</div>
                              <div className="text-[11px] text-slate-400">MST: {t.taxId || 'N/A'}</div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={t.plan === 'ENTERPRISE' ? 'brand' : 'neutral'}
                                  size="sm"
                                >
                                  {t.plan}
                                </Badge>
                                <span className="text-xs font-semibold text-slate-600">
                                  {t.commissionRate}% hoa hồng
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1 text-slate-600 font-medium">
                                  <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  {t.taskerCount} thợ
                                </span>
                                <span className="flex items-center gap-1 text-slate-600 font-medium">
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  {t.activeOrderCount} đơn chạy
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={t.status === 'ACTIVE' ? 'success' : 'danger'}
                                size="sm"
                              >
                                {t.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                              </Badge>
                            </TableCell>

                            <TableCell align="right">
                              {user?.role === 'SUPER_ADMIN' && !t.isDefault && (
                                <Button
                                  size="sm"
                                  variant={isImpersonatingThis ? 'secondary' : 'outline'}
                                  onClick={() => handleImpersonate(t.id, t.name)}
                                  leftIcon={<LogIn className="w-3.5 h-3.5 text-amber-600" />}
                                  className={
                                    isImpersonatingThis
                                      ? 'border-amber-400 bg-amber-100 text-amber-800'
                                      : ''
                                  }
                                >
                                  {isImpersonatingThis ? 'Đang đại diện' : 'Đại diện'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View (< md) */}
              <div className="md:hidden space-y-3">
                {filteredTenants
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((t) => {
                    const isImpersonatingThis = impersonatedTenantId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-xl border bg-white shadow-xs space-y-3 ${
                          isImpersonatingThis ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {t.code.slice(0, 3)}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                {t.name}
                                {t.isDefault && (
                                  <Badge variant="warning" size="sm">
                                    Sàn
                                  </Badge>
                                )}
                              </h3>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                CODE: {t.code}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={t.status === 'ACTIVE' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {t.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg">
                          <div>
                            <span className="text-slate-400 block">Địa bàn:</span>
                            <span className="font-medium text-slate-800">{t.city}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Mã số thuế:</span>
                            <span className="font-mono text-slate-800">{t.taxId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Gói &amp; Phí sàn:</span>
                            <span className="font-medium text-brand-600">
                              {t.plan} ({t.commissionRate}%)
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Quy mô:</span>
                            <span className="font-medium text-slate-800">
                              {t.taskerCount} thợ • {t.activeOrderCount} đơn
                            </span>
                          </div>
                        </div>

                        {user?.role === 'SUPER_ADMIN' && !t.isDefault && (
                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <Button
                              size="sm"
                              variant={isImpersonatingThis ? 'secondary' : 'outline'}
                              onClick={() => handleImpersonate(t.id, t.name)}
                              leftIcon={<LogIn className="w-3.5 h-3.5 text-amber-600" />}
                              className={
                                isImpersonatingThis
                                  ? 'border-amber-400 bg-amber-100 text-amber-800 text-xs'
                                  : 'text-xs'
                              }
                            >
                              {isImpersonatingThis ? 'Đang đại diện' : 'Đóng vai đối tác'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Tenants Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredTenants.length / pageSize)}
                totalItems={filteredTenants.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
        )
      ) : isLoadingApps && applications.length === 0 ? (
        <SkeletonCardGrid count={4} columns={2} />
      ) : (
        /* Applications Tab */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold text-sm">Quy trình thẩm định đối tác doanh nghiệp:</p>
              <p className="text-amber-700 mt-0.5 leading-relaxed">
                Kiểm tra kỹ mã số thuế, tính hợp lệ của giấy phép đăng ký kinh doanh và thông tin người đại diện theo pháp luật trước khi bấm duyệt. Khi phê duyệt, hệ thống sẽ tự động khởi tạo Tenant độc lập và tài khoản Tenant Admin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.length === 0 ? (
              <div className="col-span-2">
                <EmptyState
                  icon={<FileCheck className="w-8 h-8 text-brand-400" />}
                  title="Không có hồ sơ đăng ký nào"
                  description="Khi có doanh nghiệp đăng ký đối tác qua cổng công khai (/partner/register), hồ sơ sẽ hiển thị tại đây."
                />
              </div>
            ) : (
              applications
                .slice((appCurrentPage - 1) * appPageSize, appCurrentPage * appPageSize)
                .map((app) => (
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
                        {app.licenseDocUrl ? (
                          <a
                            href={app.licenseDocUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-600 hover:text-brand-700 flex items-center gap-1 font-medium underline"
                          >
                            Xem tài liệu xác minh <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Chưa đính kèm tài liệu</span>
                        )}
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
                              setRejectionError(null);
                            }}
                            leftIcon={<XCircle className="w-3.5 h-3.5 text-rose-500" />}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            Từ chối
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApprove(app.id)}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            disabled={approveMutation.isPending && approveMutation.variables === app.id}
                          >
                            {approveMutation.isPending && approveMutation.variables === app.id
                              ? 'Đang duyệt...'
                              : 'Phê duyệt & Cấp Tenant'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
            )}
          </div>

          {/* Applications Pagination */}
          {applications.length > appPageSize && (
            <Pagination
              currentPage={appCurrentPage}
              totalPages={Math.ceil(applications.length / appPageSize)}
              totalItems={applications.length}
              pageSize={appPageSize}
              onPageChange={setAppCurrentPage}
            />
          )}
        </div>
      )}

      {/* Reject Modal with Inline Validation */}
      <Modal
        isOpen={!!rejectingAppId}
        onClose={() => {
          setRejectingAppId(null);
          setRejectionError(null);
        }}
        title="Từ chối hồ sơ đăng ký đối tác"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectingAppId(null);
                setRejectionError(null);
              }}
              disabled={rejectMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Đang từ chối...' : 'Xác nhận từ chối'}
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
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${
              rejectionError ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
            }`}
            placeholder="Ví dụ: Giấy phép kinh doanh bị mờ, mã số thuế không trùng khớp trên Cổng thông tin quốc gia..."
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              if (rejectionError) setRejectionError(null);
            }}
          />
          {rejectionError && (
            <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {rejectionError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

