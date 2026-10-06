import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import type { Tasker } from '../../types';
import {
  useTaskersQuery,
  useToggleTaskerStatusMutation,
  useUpdateKycMutation,
} from '../../api/queries';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import { Card, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Tabs } from '../../components/common/Tabs';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonCardGrid } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { HRMAlertsBanner } from './HRMAlertsBanner';
import { TaskerModal } from './TaskerModal';
import { WorkFloorModal } from './WorkFloorModal';
import { DepositModal } from './DepositModal';
import { TaskerDetailDrawer } from './TaskerDetailDrawer';
import {
  Users,
  Search,
  Star,
  ShieldCheck,
  ShieldAlert,
  Phone,
  UserPlus,
  Compass,
  Wallet,
  Edit,
  Power,
  Radio,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export const TaskersPage: React.FC = () => {
  const { currentTenantId, currentTenantName } = useAuth();
  const confirm = useConfirm();

  const { data: taskers = [], isLoading } = useTaskersQuery(currentTenantId);
  const toggleStatusMutation = useToggleTaskerStatusMutation();
  const updateKycMutation = useUpdateKycMutation();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals & Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTasker, setEditingTasker] = useState<Tasker | null>(null);
  const [workFloorTasker, setWorkFloorTasker] = useState<Tasker | null>(null);
  const [depositTasker, setDepositTasker] = useState<Tasker | null>(null);
  const [detailTasker, setDetailTasker] = useState<Tasker | null>(null);

  // Computed Counts
  const onlineCount = taskers.filter((t) => t.isOnline).length;
  const lowDepositCount = taskers.filter((t) => (t.depositBalance ?? 0) < 100000).length;
  const pendingKycCount = taskers.filter((t) => !t.kycVerified).length;
  const lowRatingCount = taskers.filter(
    (t) => (t.ratingScore ?? t.rating ?? 5.0) < 4.0
  ).length;

  // Filter Tabs
  const filterTabs = [
    { id: 'ALL', label: 'Tất cả nhân sự', count: taskers.length },
    { id: 'ONLINE', label: 'Đang trực tuyến', count: onlineCount },
    { id: 'OFFLINE', label: 'Ngoại tuyến', count: taskers.length - onlineCount },
    { id: 'LOW_DEPOSIT', label: 'Nợ cọc (< 100k)', count: lowDepositCount },
    { id: 'PENDING_KYC', label: 'Chờ duyệt KYC', count: pendingKycCount },
    ...(lowRatingCount > 0
      ? [{ id: 'LOW_RATING', label: 'Sao thấp (< 4★)', count: lowRatingCount }]
      : []),
  ];

  // Filter Logic
  const filteredTaskers = taskers.filter((t) => {
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.phone.includes(q) ||
      (t.skills && t.skills.some((s) => s.toLowerCase().includes(q))) ||
      (t.idCardNumber && t.idCardNumber.toLowerCase().includes(q)) ||
      t.id.toLowerCase().includes(q) ||
      (t.code && t.code.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (activeFilter === 'ONLINE') return t.isOnline;
    if (activeFilter === 'OFFLINE') return !t.isOnline;
    if (activeFilter === 'LOW_DEPOSIT') return (t.depositBalance ?? 0) < 100000;
    if (activeFilter === 'PENDING_KYC') return !t.kycVerified;
    if (activeFilter === 'LOW_RATING') return (t.ratingScore ?? t.rating ?? 5.0) < 4.0;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTaskers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  // Action Handlers
  const handleToggleOnline = async (t: Tasker) => {
    try {
      await toggleStatusMutation.mutateAsync(t.id);
    } catch {
      // Error toasted automatically in useTaskers.ts
    }
  };

  const handleToggleKyc = async (t: Tasker) => {
    const willVerify = !t.kycVerified;
    const ok = await confirm({
      title: willVerify ? 'Xác thực hồ sơ KYC' : 'Hủy xác thực KYC',
      message: willVerify
        ? `Bạn có chắc chắn muốn duyệt KYC cho thợ "${t.name}"? Thợ sẽ đủ điều kiện nhận đơn hàng giá trị cao.`
        : `Bạn có chắc chắn muốn hủy trạng thái KYC của thợ "${t.name}"?`,
      variant: willVerify ? 'primary' : 'warning',
      confirmText: willVerify ? 'Duyệt KYC ngay' : 'Hủy xác thực',
    });

    if (ok) {
      try {
        await updateKycMutation.mutateAsync({
          id: t.id,
          data: {
            kycVerified: willVerify,
            idCardNumber: t.idCardNumber,
            notes: willVerify ? 'Duyệt KYC thủ công bởi quản trị viên' : 'Hủy duyệt KYC',
          },
        });
      } catch {
        // Error toasted automatically
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-500" />
            Đội ngũ Thợ &amp; Quản trị Nhân sự (HRM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đơn vị quản trị:{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>. Theo dõi
            nhân sự, radar sàn làm việc, xác thực KYC, số dư ký quỹ đảm bảo và sổ cái giao dịch kép.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="brand" size="md">
            {onlineCount} thợ trực tuyến
          </Badge>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<UserPlus className="w-4 h-4" />}
          >
            Đăng ký Thợ mới
          </Button>
        </div>
      </div>

      {/* HRM Intelligent Alerts Banner */}
      <HRMAlertsBanner
        taskers={taskers}
        activeFilter={activeFilter}
        onFilterLowDeposit={() => {
          setActiveFilter('LOW_DEPOSIT');
          setCurrentPage(1);
        }}
        onFilterPendingKyc={() => {
          setActiveFilter('PENDING_KYC');
          setCurrentPage(1);
        }}
        onFilterLowRating={() => {
          setActiveFilter('LOW_RATING');
          setCurrentPage(1);
        }}
        onClearFilter={() => {
          setActiveFilter('ALL');
          setCurrentPage(1);
        }}
      />

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <Tabs
          tabs={filterTabs}
          activeTab={activeFilter}
          onChange={(tab) => {
            setActiveFilter(tab);
            setCurrentPage(1);
          }}
          size="sm"
        />

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên thợ, SĐT, CCCD, kỹ năng..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Taskers Grid */}
      {isLoading && taskers.length === 0 ? (
        <SkeletonCardGrid count={6} columns={3} />
      ) : filteredTaskers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-brand-400" />}
          title="Không tìm thấy thợ nào"
          description="Hãy thử nhập từ khóa tìm kiếm khác hoặc chuyển sang bộ lọc khác."
          action={
            activeFilter !== 'ALL' ? (
              <Button variant="outline" size="sm" onClick={() => setActiveFilter('ALL')}>
                Xem tất cả thợ
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTaskers
              .slice((safePage - 1) * pageSize, safePage * pageSize)
              .map((t) => {
                const isLowDeposit = (t.depositBalance ?? 0) < 100000;
                const ratingValue = (t.ratingScore ?? t.rating ?? 5.0).toFixed(1);

                return (
                  <Card
                    key={t.id}
                    className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 border-slate-200/90 flex flex-col justify-between"
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Top Row: Avatar, Identity, Online Toggle */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-base border border-brand-200 shadow-2xs">
                              {t.name.slice(0, 1)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                t.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-sm truncate flex items-center gap-1.5">
                              {t.name}
                            </h3>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="font-mono">{t.phone}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              {t.kycVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/80">
                                  <ShieldCheck className="w-3 h-3 text-blue-600" />
                                  KYC Đã duyệt
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleKyc(t)}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 transition-colors cursor-pointer"
                                  title="Bấm để mở xác nhận duyệt KYC"
                                >
                                  <ShieldAlert className="w-3 h-3 text-amber-600" />
                                  Chờ duyệt KYC
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Online / Offline status badge button */}
                        <button
                          type="button"
                          onClick={() => handleToggleOnline(t)}
                          disabled={toggleStatusMutation.isPending}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide transition-all cursor-pointer ${
                            t.isOnline
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
                          }`}
                          title={t.isOnline ? 'Nhấn để chuyển sang Ngoại tuyến' : 'Nhấn để Bật trực tuyến'}
                        >
                          <Power className={`w-3 h-3 ${t.isOnline ? 'text-emerald-600' : 'text-slate-400'}`} />
                          {t.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </button>
                      </div>

                      {/* Metrics 4-col Grid */}
                      <div className="grid grid-cols-4 gap-2 py-2 px-2.5 bg-slate-50 border border-slate-100 rounded-xl text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Đánh giá</span>
                          <span className="font-bold text-xs text-amber-600 flex items-center justify-center gap-0.5 mt-0.5">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            {ratingValue}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Đã xong</span>
                          <span className="font-bold text-xs text-slate-800 mt-0.5 block">
                            {t.completedJobs} đơn
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Bán kính</span>
                          <span className="font-bold text-xs text-slate-800 mt-0.5 flex items-center justify-center gap-0.5">
                            {t.autoRadarEnabled && <Radio className="w-2.5 h-2.5 text-brand-600 shrink-0" />}
                            {t.maxDistanceKm ?? 15}km
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Ký quỹ</span>
                          <span
                            className={`font-bold text-xs mt-0.5 block ${
                              isLowDeposit ? 'text-rose-600 font-extrabold' : 'text-emerald-700'
                            }`}
                          >
                            {((t.depositBalance || 0) / 1000).toFixed(0)}k đ
                          </span>
                        </div>
                      </div>

                      {/* Low Deposit Alert notice */}
                      {isLowDeposit && (
                        <div className="p-2 bg-rose-50/80 border border-rose-200/80 rounded-lg flex items-center justify-between text-[11px] text-rose-700">
                          <span className="flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            Dưới 100k (Bị chặn nhận việc)
                          </span>
                          <button
                            type="button"
                            onClick={() => setDepositTasker(t)}
                            className="font-bold underline hover:text-rose-900 cursor-pointer ml-1"
                          >
                            Nạp ngay
                          </button>
                        </div>
                      )}

                      {/* Skills Tags */}
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1 font-medium">
                          Kỹ năng &amp; Chuyên môn:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {t.skills && t.skills.length > 0 ? (
                            t.skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-md font-medium"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Chưa đăng ký kỹ năng</span>
                          )}
                          {t.skills && t.skills.length > 3 && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-slate-200/80 text-slate-600 rounded-md font-semibold">
                              +{t.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Multi-wallet Mini Badges */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-mono text-[10px] text-slate-400">
                          Mã: {t.code || t.id.slice(0, 8)}
                        </span>
                        <span className="font-medium text-slate-700">
                          Thu nhập:{' '}
                          <strong className="text-emerald-700">
                            {(t.walletBalance ?? 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </span>
                      </div>
                    </CardContent>

                    {/* Action Buttons Toolbar */}
                    <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailTasker(t)}
                        icon={<Eye className="w-3.5 h-3.5 text-slate-600" />}
                        className="text-xs"
                      >
                        Sổ cái
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWorkFloorTasker(t)}
                          icon={<Compass className="w-3.5 h-3.5 text-slate-600" />}
                          className="text-xs px-2"
                          title="Cấu hình bán kính quét việc và Radar tự động"
                        >
                          Sàn
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDepositTasker(t)}
                          icon={<Wallet className="w-3.5 h-3.5 text-emerald-600" />}
                          className="text-xs px-2"
                          title="Nạp hoặc khấu trừ ký quỹ hợp đồng"
                        >
                          Cọc
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingTasker(t)}
                          icon={<Edit className="w-3.5 h-3.5 text-slate-700" />}
                          className="text-xs px-2"
                          title="Chỉnh sửa hồ sơ thợ"
                        >
                          Sửa
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredTaskers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* 360-Degree Detail & Ledger Drawer (Rendered before modals so modals stack on top) */}
      <TaskerDetailDrawer
        isOpen={Boolean(detailTasker)}
        onClose={() => setDetailTasker(null)}
        tasker={detailTasker}
        onOpenEditModal={(t) => setEditingTasker(t)}
        onOpenWorkFloorModal={(t) => setWorkFloorTasker(t)}
        onOpenDepositModal={(t) => setDepositTasker(t)}
      />

      {/* Onboarding Modal (Add New Tasker) */}
      <TaskerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        tenantId={currentTenantId}
        onSuccess={(created) => {
          setIsCreateModalOpen(false);
          setDetailTasker(created);
        }}
      />

      {/* Edit Profile Modal */}
      <TaskerModal
        isOpen={Boolean(editingTasker)}
        onClose={() => setEditingTasker(null)}
        tasker={editingTasker}
        tenantId={currentTenantId}
        onSuccess={() => setEditingTasker(null)}
      />

      {/* Work Floor & Radar Modal */}
      <WorkFloorModal
        isOpen={Boolean(workFloorTasker)}
        onClose={() => setWorkFloorTasker(null)}
        tasker={workFloorTasker}
        onSuccess={() => setWorkFloorTasker(null)}
      />

      {/* Deposit Adjustment Modal */}
      <DepositModal
        isOpen={Boolean(depositTasker)}
        onClose={() => setDepositTasker(null)}
        tasker={depositTasker}
        onSuccess={() => setDepositTasker(null)}
      />
    </div>
  );
};
