import React, { useEffect } from 'react';
import type { Tasker, WalletTransaction } from '../../types';
import {
  useTaskerTransactionsQuery,
  useToggleTaskerStatusMutation,
  useUpdateKycMutation,
} from '../../api/queries';
import { useConfirm } from '../../components/feedback/ConfirmContext';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import {
  X,
  Phone,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Star,
  CheckCircle2,
  Wallet,
  CreditCard,
  Compass,
  Power,
  Edit,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  FileText,
  Clock,
  Briefcase,
} from 'lucide-react';

export interface TaskerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasker: Tasker | null;
  onOpenEditModal: (tasker: Tasker) => void;
  onOpenWorkFloorModal: (tasker: Tasker) => void;
  onOpenDepositModal: (tasker: Tasker) => void;
}

export const TaskerDetailDrawer: React.FC<TaskerDetailDrawerProps> = ({
  isOpen,
  onClose,
  tasker,
  onOpenEditModal,
  onOpenWorkFloorModal,
  onOpenDepositModal,
}) => {
  const confirm = useConfirm();
  const toggleStatusMutation = useToggleTaskerStatusMutation();
  const updateKycMutation = useUpdateKycMutation();

  const { data: transactions = [], isLoading: isLoadingTx } =
    useTaskerTransactionsQuery(tasker?.id);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !tasker) return null;

  const handleToggleOnline = async () => {
    try {
      await toggleStatusMutation.mutateAsync(tasker.id);
    } catch {
      // Error is toasted automatically in useTaskers.ts
    }
  };

  const handleToggleKyc = async () => {
    const willVerify = !tasker.kycVerified;
    const ok = await confirm({
      title: willVerify ? 'Xác thực hồ sơ KYC' : 'Hủy xác thực KYC',
      message: willVerify
        ? `Bạn có chắc chắn muốn duyệt xác thực danh tính KYC cho thợ "${tasker.name}"? Thợ sẽ đủ điều kiện nhận các đơn hàng giá trị cao.`
        : `Bạn có chắc chắn muốn hủy trạng thái KYC của thợ "${tasker.name}"?`,
      variant: willVerify ? 'primary' : 'warning',
      confirmText: willVerify ? 'Duyệt KYC ngay' : 'Hủy xác thực',
    });

    if (ok) {
      try {
        await updateKycMutation.mutateAsync({
          id: tasker.id,
          data: {
            kycVerified: willVerify,
            idCardNumber: tasker.idCardNumber,
            notes: willVerify ? 'Duyệt KYC thủ công bởi quản trị viên' : 'Hủy duyệt KYC',
          },
        });
      } catch {
        // Error is toasted automatically
      }
    }
  };

  const getTransactionTypeLabel = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'TOP_UP_DEPOSIT':
        return 'Nạp ký quỹ';
      case 'WITHDRAW_DEPOSIT':
        return 'Khấu trừ ký quỹ';
      case 'SOFT_HOLD':
        return 'Tạm giữ cọc';
      case 'HOLD_RELEASE':
        return 'Hoàn cọc';
      case 'ORDER_PAYOUT':
        return 'Tiền công hoàn tất';
      case 'COMMISSION_FEE':
        return 'Phí hoa hồng';
      case 'PENALTY_DEDUCTION':
        return 'Phạt vi phạm';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fadeIn">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xl border-2 border-white shadow-xs">
                  {tasker.name.slice(0, 1)}
                </div>
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                    tasker.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                  title={tasker.isOnline ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{tasker.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      tasker.isOnline
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tasker.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã thợ: <strong className="font-mono text-slate-700">{tasker.code || tasker.id}</strong> • {tasker.tenantName}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-4 gap-2.5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Đánh giá</span>
                <span className="text-sm font-bold text-amber-600 flex items-center justify-center gap-1 mt-0.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {(tasker.ratingScore || tasker.rating || 5.0).toFixed(1)}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Đã hoàn thành</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {tasker.completedJobs} đơn
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Bán kính</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {tasker.maxDistanceKm ?? 15} km
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Xác thực KYC</span>
                <span
                  className={`text-xs font-bold mt-1 flex items-center justify-center gap-0.5 ${
                    tasker.kycVerified ? 'text-blue-600' : 'text-amber-600'
                  }`}
                >
                  {tasker.kycVerified ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" /> Đã duyệt
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" /> Chờ duyệt
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Financial Multi-Wallet Overview */}
            <div className="bg-slate-900 text-white rounded-2xl p-4.5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Đa ví Tài chính &amp; Ký quỹ
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono">
                  {tasker.salaryType === 'FIXED_SALARY' ? 'Lương cứng' : 'Hoa hồng (85/15)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Ví ký quỹ đảm bảo</span>
                  <span
                    className={`text-base font-bold block mt-0.5 ${
                      (tasker.depositBalance ?? 0) >= 100000
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {(tasker.depositBalance ?? 0).toLocaleString('vi-VN')} đ
                  </span>
                  {(tasker.depositBalance ?? 0) < 100000 && (
                    <span className="text-[10px] text-rose-300 block mt-0.5 font-medium">
                      ⚠️ Dưới ngưỡng 100k (Chặn nhận đơn)
                    </span>
                  )}
                </div>

                <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 block">Ví thu nhập khả dụng</span>
                  <span className="text-base font-bold text-slate-100 block mt-0.5">
                    {(tasker.walletBalance ?? 0).toLocaleString('vi-VN')} đ
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Sẵn sàng quyết toán
                  </span>
                </div>
              </div>
            </div>

            {/* Identification & Bank details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contact info */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-brand-600" />
                  Liên hệ &amp; Pháp lý
                </h4>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tasker.phone}</span>
                  </div>
                  {tasker.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tasker.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>CCCD: {tasker.idCardNumber || 'Chưa cung cấp'}</span>
                  </div>
                </div>
              </div>

              {/* Bank Account */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-brand-600" />
                  Ngân hàng nhận lương
                </h4>
                <div className="space-y-1 text-slate-600">
                  <div>
                    <span className="text-slate-400">Ngân hàng: </span>
                    <strong className="text-slate-800">{tasker.bankName || 'Chưa thiết lập'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Số tài khoản: </span>
                    <strong className="font-mono text-slate-800">
                      {tasker.bankAccountNumber || 'Chưa thiết lập'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Chủ tài khoản: </span>
                    <strong className="text-slate-800">
                      {tasker.bankAccountHolder || 'Chưa thiết lập'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills & Services */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-600" />
                Kỹ năng &amp; Lĩnh vực đảm nhận ({tasker.skills?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {tasker.skills && tasker.skills.length > 0 ? (
                  tasker.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg font-medium"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 italic">Chưa đăng ký kỹ năng</span>
                )}
              </div>
            </div>

            {/* Sổ cái Giao dịch Ký quỹ gần nhất */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-brand-600" />
                  Lịch sử Sổ cái Giao dịch Ký quỹ
                </h4>
                <span className="text-[11px] text-slate-400">
                  {transactions.length} giao dịch gần nhất
                </span>
              </div>

              {isLoadingTx ? (
                <div className="p-4 text-center text-slate-400">Đang tải lịch sử giao dịch...</div>
              ) : transactions.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 border border-slate-200/80 rounded-xl text-slate-400">
                  Chưa có giao dịch ký quỹ nào được ghi nhận.
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50/60 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            tx.direction === 'IN'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {tx.direction === 'IN' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {getTransactionTypeLabel(tx.type)}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {tx.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {tx.notes || 'Không có ghi chú'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-bold block ${
                            tx.direction === 'IN' ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {tx.direction === 'IN' ? '+' : '-'}
                          {tx.amount.toLocaleString('vi-VN')} đ
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Số dư sau: {tx.balanceAfter.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Toolbar Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/90 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleOnline}
                isLoading={toggleStatusMutation.isPending}
                icon={<Power className="w-3.5 h-3.5" />}
              >
                {tasker.isOnline ? 'Chuyển Offline' : 'Bật Online'}
              </Button>

              <Button
                variant={tasker.kycVerified ? 'outline' : 'secondary'}
                size="sm"
                onClick={handleToggleKyc}
                isLoading={updateKycMutation.isPending}
                icon={
                  tasker.kycVerified ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  )
                }
              >
                {tasker.kycVerified ? 'Hủy duyệt KYC' : 'Duyệt KYC'}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenWorkFloorModal(tasker)}
                icon={<Compass className="w-3.5 h-3.5" />}
              >
                Sàn làm việc
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenDepositModal(tasker)}
                icon={<Wallet className="w-3.5 h-3.5" />}
              >
                Nạp ký quỹ
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => onOpenEditModal(tasker)}
                icon={<Edit className="w-3.5 h-3.5" />}
              >
                Sửa hồ sơ
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
