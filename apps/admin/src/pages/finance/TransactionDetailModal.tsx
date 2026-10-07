import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WalletTransaction } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/feedback/ToastContext';
import {
  Copy,
  Check,
  Clock,
  ArrowRight,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Wrench,
  Building2,
  ShieldCheck,
  Wallet,
  ExternalLink,
  FileText,
  Layers,
  Landmark,
} from 'lucide-react';

export interface TransactionDetailModalProps {
  transaction: WalletTransaction | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ActorVisualConfig {
  label: string;
  roleBadgeStyle: string;
  icon: React.ReactNode;
  containerBg: string;
}

const getActorVisualConfig = (actorType: string): ActorVisualConfig => {
  const norm = (actorType || '').toUpperCase();
  if (norm === 'CUSTOMER' || norm.includes('KHÁCH')) {
    return {
      label: 'Khách hàng',
      roleBadgeStyle: 'bg-sky-50 text-sky-700 border-sky-200',
      icon: <User className="w-5 h-5 text-sky-600" />,
      containerBg: 'bg-sky-50/40 border-sky-100',
    };
  }
  if (norm === 'TASKER' || norm.includes('THỢ')) {
    return {
      label: 'Đối tác Thợ',
      roleBadgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Wrench className="w-5 h-5 text-amber-600" />,
      containerBg: 'bg-amber-50/40 border-amber-100',
    };
  }
  if (norm === 'TENANT' || norm.includes('DOANH NGHIỆP') || norm.includes('CÔNG TY')) {
    return {
      label: 'Doanh nghiệp (Tenant)',
      roleBadgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: <Building2 className="w-5 h-5 text-purple-600" />,
      containerBg: 'bg-purple-50/40 border-purple-100',
    };
  }
  if (
    norm === 'PLATFORM' ||
    norm === 'SYSTEM' ||
    norm.includes('SÀN') ||
    norm.includes('HỆ THỐNG')
  ) {
    return {
      label: 'Nền tảng Sàn',
      roleBadgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      containerBg: 'bg-emerald-50/40 border-emerald-100',
    };
  }
  if (norm === 'WALLET' || norm.includes('VÍ')) {
    return {
      label: 'Ví ký quỹ',
      roleBadgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <Wallet className="w-5 h-5 text-indigo-600" />,
      containerBg: 'bg-indigo-50/40 border-indigo-100',
    };
  }
  return {
    label: actorType || 'Khác',
    roleBadgeStyle: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <Wallet className="w-5 h-5 text-slate-500" />,
    containerBg: 'bg-slate-50 border-slate-100',
  };
};

interface PaymentMethodVisual {
  label: string;
  emoji: string;
  badgeClass: string;
}

const getPaymentMethodVisual = (method: string): PaymentMethodVisual => {
  switch (method) {
    case 'CASH':
      return {
        label: 'Tiền mặt',
        emoji: '💵',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      };
    case 'WALLET':
      return {
        label: 'Ví ký quỹ',
        emoji: '👛',
        badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      };
    case 'BANK_TRANSFER':
      return {
        label: 'Chuyển khoản',
        emoji: '🏦',
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    case 'MOMO':
      return {
        label: 'Ví MoMo',
        emoji: '📱',
        badgeClass: 'bg-pink-50 text-pink-800 border-pink-200',
      };
    case 'VNPAY':
      return {
        label: 'Cổng VNPAY',
        emoji: '💳',
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      };
    default:
      return {
        label: method || 'Khác',
        emoji: '💳',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
};

const getTxTypeBadge = (type: WalletTransaction['type']) => {
  switch (type) {
    case 'CASH_COLLECTED':
      return <Badge variant="success">Thu tiền mặt trực tiếp</Badge>;
    case 'TOP_UP_DEPOSIT':
      return <Badge variant="success">Nạp tiền ký quỹ</Badge>;
    case 'WITHDRAW_DEPOSIT':
      return <Badge variant="danger">Khấu trừ / Rút cọc</Badge>;
    case 'SOFT_HOLD':
      return <Badge variant="warning">Tạm khóa cọc nhận việc</Badge>;
    case 'HOLD_RELEASE':
      return <Badge variant="info">Hoàn cọc đơn</Badge>;
    case 'COMMISSION_FEE':
      return <Badge variant="brand">Hoa hồng sàn 15%</Badge>;
    case 'SUBSCRIPTION_FEE':
      return <Badge variant="neutral">Gói SaaS tháng</Badge>;
    case 'ORDER_PAYOUT':
      return <Badge variant="success">Quyết toán tiền công</Badge>;
    case 'PENALTY_DEDUCTION':
      return <Badge variant="danger">Phạt vi phạm quy chế</Badge>;
    default:
      return <Badge variant="neutral">{type}</Badge>;
  }
};

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);

  if (!transaction) return null;

  const isIncome = transaction.direction === 'IN';
  const sourceConfig = getActorVisualConfig(transaction.sourceType);
  const targetConfig = getActorVisualConfig(transaction.targetType);
  const paymentConfig = getPaymentMethodVisual(transaction.paymentMethod);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(transaction.code);
    setIsCopied(true);
    toast({
      type: 'success',
      title: 'Đã sao chép mã bút toán',
      message: transaction.code,
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleBookingClick = () => {
    if (transaction.bookingCode) {
      onClose();
      navigate(`/dispatch?search=${encodeURIComponent(transaction.bookingCode)}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chi tiết bút toán kế toán & Sổ cái"
      subtitle="Chứng từ giao dịch & luồng luân chuyển dòng tiền đối soát"
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-400 hidden sm:inline">
            Hệ thống đối soát sổ cái kép LinkkWork Universal Ledger
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header Voucher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Mã bút toán:</span>
            <span className="font-mono text-sm font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              {transaction.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition"
              title="Sao chép mã bút toán"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Badge
              variant={transaction.status === 'COMPLETED' ? 'success' : 'warning'}
              size="sm"
            >
              {transaction.status === 'COMPLETED' ? 'COMPLETED (Thành công)' : transaction.status}
            </Badge>
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(transaction.createdAt).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        {/* Flow Banner (Nguồn tiền ➔ Đích nhận) */}
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            Luồng luân chuyển dòng tiền (Nguồn tiền ➔ Đích nhận)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] items-center gap-3 md:gap-4">
            {/* Nguồn tiền */}
            <div
              className={`p-3.5 rounded-xl border ${sourceConfig.containerBg} flex items-center gap-3 transition-all`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
                {sourceConfig.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Bên chi / Nguồn:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${sourceConfig.roleBadgeStyle}`}
                  >
                    {sourceConfig.label}
                  </span>
                </div>
                <p
                  className="font-bold text-slate-900 text-sm truncate mt-0.5"
                  title={transaction.sourceName}
                >
                  {transaction.sourceName}
                </p>
              </div>
            </div>

            {/* Center Arrow & Payment Method */}
            <div className="flex flex-col items-center justify-center gap-1 py-1">
              <div className="flex items-center gap-1.5">
                <ArrowRight className="w-5 h-5 text-brand-500 hidden md:block" />
                <ArrowDown className="w-5 h-5 text-brand-500 md:hidden" />
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-2xs ${paymentConfig.badgeClass}`}
              >
                <span>{paymentConfig.emoji}</span>
                <span>{paymentConfig.label}</span>
              </span>
            </div>

            {/* Đích nhận */}
            <div
              className={`p-3.5 rounded-xl border ${targetConfig.containerBg} flex items-center gap-3 transition-all`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0">
                {targetConfig.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Bên thu / Đích:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${targetConfig.roleBadgeStyle}`}
                  >
                    {targetConfig.label}
                  </span>
                </div>
                <p
                  className="font-bold text-slate-900 text-sm truncate mt-0.5"
                  title={transaction.targetName}
                >
                  {transaction.targetName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Balance Trajectory Card */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Biến động số dư &amp; Chiều dòng tiền
            </span>
            <Badge variant={isIncome ? 'success' : 'danger'} size="sm">
              {isIncome ? 'Dòng tiền vào (IN)' : 'Dòng tiền ra (OUT)'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Balance Before */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400 block">Số dư trước GD</span>
              <span className="font-mono text-base font-semibold text-slate-700 mt-1 block">
                {transaction.balanceBefore.toLocaleString('vi-VN')} đ
              </span>
            </div>

            {/* Amount Changed */}
            <div
              className={`p-3.5 rounded-xl border shadow-2xs ${
                isIncome ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-500 block">Số tiền biến động</span>
              <div className="flex items-center gap-1 mt-1">
                {isIncome ? (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                )}
                <span
                  className={`font-mono text-base font-bold ${
                    isIncome ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isIncome ? '+' : '-'}
                  {transaction.amount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Balance After */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-medium text-slate-400 block">Số dư sau GD</span>
              <span className="font-mono text-base font-bold text-slate-900 mt-1 block">
                {transaction.balanceAfter.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        </div>

        {/* Reference Documents & Audit Metadata */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Chứng từ tham chiếu &amp; Kiểm toán sổ cái
            </span>
            {getTxTypeBadge(transaction.type)}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs pt-1">
            {/* Booking code */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Mã đơn dịch vụ (Booking):</span>
              {transaction.bookingCode ? (
                <button
                  type="button"
                  onClick={handleBookingClick}
                  className="inline-flex items-center gap-1 font-mono font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded border border-brand-200 transition group"
                  title="Xem đơn hàng trên màn hình Điều phối"
                >
                  <span>{transaction.bookingCode}</span>
                  <ExternalLink className="w-3 h-3 text-brand-500 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ) : (
                <span className="text-slate-400 font-mono text-xs">Không áp dụng</span>
              )}
            </div>

            {/* Tenant Name */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Đơn vị Tenant:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                {transaction.tenantName || transaction.tenantId}
              </span>
            </div>

            {/* Tasker Name */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Đối tác Thợ:</span>
              <span className="font-medium text-slate-800 truncate max-w-[180px]">
                {transaction.taskerName || (transaction.taskerId ? transaction.taskerId : 'Không áp dụng')}
              </span>
            </div>

            {/* Triggered By */}
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Người / Tác vụ kích hoạt:</span>
              <span className="font-mono text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
                {transaction.triggeredBy || 'Hệ thống tự động'}
              </span>
            </div>

            {/* Bank Account Info if Bank Transfer */}
            {(transaction.bankName || transaction.bankAccount) && (
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 sm:col-span-2">
                <span className="text-slate-500 flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-slate-400" />
                  Thông tin chuyển khoản:
                </span>
                <span className="font-medium text-slate-800">
                  {transaction.bankName} - {transaction.bankAccount}
                </span>
              </div>
            )}

            {/* Memo / Notes */}
            <div className="sm:col-span-2 pt-1.5">
              <span className="text-slate-500 block mb-1">Diễn giải bút toán kế toán:</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-xs leading-relaxed font-sans">
                {transaction.notes || 'Không có ghi chú thêm.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
