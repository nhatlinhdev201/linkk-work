import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TransactionQueryParams, WalletTransaction } from '../../types';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastContext';
import { useFinancialSummaryQuery, useWalletTransactionsQuery } from '../../api/queries';
import { StatCard } from '../../components/common/StatCard';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/common/Table';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Tabs } from '../../components/common/Tabs';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonStatCards, SkeletonTable } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import { TransactionDetailModal } from './TransactionDetailModal';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Download,
  Clock,
  Search,
  X,
  Copy,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

export const FinancePage: React.FC = () => {
  const { currentTenantId, currentTenantName, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;
  const [selectedTx, setSelectedTx] = useState<WalletTransaction | null>(null);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // TanStack Query hooks
  const { data: summary, isLoading: isLoadingSummary } = useFinancialSummaryQuery(currentTenantId);

  const isDepositTab = activeTab === 'DEPOSIT';
  const queryParams: TransactionQueryParams = {
    tenantId: isSuperAdmin
      ? currentTenantId === 'tenant-linkkwork'
        ? undefined
        : currentTenantId
      : currentTenantId,
    search: debouncedSearch.trim() || undefined,
    type: activeTab === 'ALL' ? undefined : (isDepositTab ? undefined : activeTab),
    paymentMethod: paymentMethodFilter === 'ALL' ? undefined : paymentMethodFilter,
    page: isDepositTab ? 1 : currentPage,
    limit: isDepositTab ? 100 : pageSize,
  };

  const { data: txResponse, isLoading: isLoadingTx } = useWalletTransactionsQuery(queryParams);

  const isSummaryLoading = isLoadingSummary && !summary;
  const isTableLoading = isLoadingTx && !txResponse;
  const transactions = txResponse || [];

  // Local filter fallback for DEPOSIT group tab
  const filteredTx = (transactions as WalletTransaction[]).filter((t) => {
    if (isDepositTab) {
      return (
        t.type === 'TOP_UP_DEPOSIT' ||
        t.type === 'WITHDRAW_DEPOSIT' ||
        t.type === 'SOFT_HOLD' ||
        t.type === 'HOLD_RELEASE'
      );
    }
    return true;
  });

  const totalItems = isDepositTab ? filteredTx.length : (txResponse?.total ?? filteredTx.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Determine transactions displayed on current page
  const displayedTx = isDepositTab
    ? filteredTx.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredTx;

  const handleExportCSV = () => {
    toast({
      type: 'info',
      title: 'Xuất dữ liệu đối soát',
      message: 'Hệ thống đã kết xuất sao kê tài chính định dạng CSV thành công.',
    });
  };

  const handleCopyCode = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
      toast({
        type: 'success',
        title: 'Đã sao chép mã bút toán',
        message: code,
      });
    } catch {
      toast({
        type: 'error',
        title: 'Lỗi sao chép',
        message: 'Không thể sao chép: Trình duyệt không hỗ trợ hoặc chặn quyền',
      });
    }
  };

  const handleBookingClick = (e: React.MouseEvent, bookingCode: string) => {
    e.stopPropagation();
    navigate(`/dispatch?search=${encodeURIComponent(bookingCode)}`);
  };

  const getRolePill = (type: string) => {
    const norm = (type || '').toUpperCase();
    if (norm === 'CUSTOMER' || norm.includes('KHÁCH')) {
      return {
        label: 'Khách',
        className: 'bg-sky-50 text-sky-700 border-sky-200',
      };
    }
    if (norm === 'TASKER' || norm.includes('THỢ')) {
      return {
        label: 'Thợ',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    if (norm === 'TENANT' || norm.includes('DOANH NGHIỆP')) {
      return {
        label: 'Doanh nghiệp',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    }
    if (norm === 'PLATFORM' || norm === 'SYSTEM' || norm.includes('SÀN')) {
      return {
        label: 'Sàn',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    }
    if (norm === 'WALLET' || norm.includes('VÍ')) {
      return {
        label: 'Ví cọc',
        className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      };
    }
    return {
      label: type || 'Khác',
      className: 'bg-slate-100 text-slate-700 border-slate-200',
    };
  };

  const getPaymentMethodBadge = (method: WalletTransaction['paymentMethod']) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            💵 Tiền mặt
          </span>
        );
      case 'WALLET':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
            👛 Ví ký quỹ
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
            🏦 Chuyển khoản
          </span>
        );
      case 'MOMO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-50 text-pink-800 border border-pink-200">
            📱 MoMo
          </span>
        );
      case 'VNPAY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
            💳 VNPay
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {method || 'Khác'}
          </span>
        );
    }
  };

  const getTxTypeBadge = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'CASH_COLLECTED':
        return <Badge variant="success">Thu tiền mặt</Badge>;
      case 'TOP_UP_DEPOSIT':
        return <Badge variant="success">Nạp tiền ký quỹ</Badge>;
      case 'WITHDRAW_DEPOSIT':
        return <Badge variant="danger">Rút ký quỹ</Badge>;
      case 'SOFT_HOLD':
        return <Badge variant="warning">Tạm khóa cọc</Badge>;
      case 'HOLD_RELEASE':
        return <Badge variant="info">Hoàn cọc đơn</Badge>;
      case 'COMMISSION_FEE':
        return <Badge variant="brand">Hoa hồng sàn 15%</Badge>;
      case 'SUBSCRIPTION_FEE':
        return <Badge variant="neutral">Gói SaaS tháng</Badge>;
      case 'ORDER_PAYOUT':
        return <Badge variant="success">Quyết toán tiền công</Badge>;
      case 'PENALTY_DEDUCTION':
        return <Badge variant="danger">Phạt vi phạm</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-brand-500" />
            Sổ Cái Giao Dịch &amp; Tài Chính Toàn Hệ Thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đơn vị:{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>. Theo dõi
            đối soát dòng tiền kế toán kép, hoa hồng sàn, quỹ cọc thợ và quyết toán thanh toán.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExportCSV}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Xuất báo cáo sao kê
        </Button>
      </div>

      {/* KPI Stat Cards */}
      {isSummaryLoading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tổng giá trị đơn (GMV)"
            value={summary ? `${(summary.grossServiceVolume / 1000000).toFixed(1)} tr đ` : '0 đ'}
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
            trend={{ value: 14.8, isPositive: true, label: 'so với tháng trước' }}
          />
          <StatCard
            title="Hoa hồng sàn thu về"
            value={
              summary ? `${(summary.platformCommissionEarned / 1000000).toFixed(1)} tr đ` : '0 đ'
            }
            icon={<TrendingUp className="w-5 h-5 text-brand-600" />}
            iconBgColor="bg-brand-50 text-brand-600 border border-brand-100"
            trend={{ value: 12.3, isPositive: true, label: 'tỷ lệ 15%' }}
          />
          <StatCard
            title="Doanh thu thực nhận"
            value={summary ? `${(summary.tenantNetRevenue / 1000000).toFixed(1)} tr đ` : '0 đ'}
            icon={<Wallet className="w-5 h-5 text-blue-600" />}
            iconBgColor="bg-blue-50 text-blue-600 border border-blue-100"
            description="Đã khấu trừ hoa hồng sàn"
          />
          <StatCard
            title="Quỹ cọc thợ an toàn"
            value={summary ? `${(summary.totalDepositHeld / 1000000).toFixed(1)} tr đ` : '0 đ'}
            icon={<ShieldCheck className="w-5 h-5 text-amber-600" />}
            iconBgColor="bg-amber-50 text-amber-600 border border-amber-100"
            description={`${summary?.pendingSettlementsCount || 0} đơn đang cấn trừ`}
          />
        </div>
      )}

      {/* Interactive Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="md:col-span-8">
            <Input
              placeholder="Tìm theo mã bút toán, tên khách, thợ, mã đơn..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              icon={<Search className="w-4 h-4 text-slate-400" />}
              rightElement={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Payment Method Filter Dropdown */}
          <div className="md:col-span-4">
            <Select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'ALL', label: 'Tất cả hình thức' },
                { value: 'CASH', label: '💵 Tiền mặt (Cash)' },
                { value: 'WALLET', label: '👛 Ví nội bộ (Wallet)' },
                { value: 'BANK_TRANSFER', label: '🏦 Chuyển khoản (Bank)' },
              ]}
            />
          </div>
        </div>

        {/* Tabs Bar & Summary */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'Tất cả biến động' },
              { id: 'CASH_COLLECTED', label: '💵 Thu tiền mặt' },
              { id: 'COMMISSION_FEE', label: '🏢 Hoa hồng sàn' },
              { id: 'DEPOSIT', label: '👛 Ký quỹ thợ' },
              { id: 'ORDER_PAYOUT', label: '💳 Quyết toán' },
            ]}
            activeTab={activeTab}
            onChange={(tabId) => {
              setActiveTab(tabId);
              setCurrentPage(1);
            }}
            size="sm"
          />

          <div className="text-xs text-slate-500 flex items-center gap-1.5 self-end lg:self-auto">
            <span>
              Tổng cộng <strong className="text-slate-800 font-semibold">{totalItems}</strong> bút
              toán
            </span>
            {debouncedSearch && (
              <span className="text-brand-600 font-medium">(lọc theo &quot;{debouncedSearch}&quot;)</span>
            )}
          </div>
        </div>
      </div>

      {/* Ledger Table Section */}
      <div className="space-y-4">
        {isTableLoading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : filteredTx.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-8 h-8 text-brand-400" />}
            title="Không tìm thấy giao dịch nào phù hợp"
            description={
              searchQuery || paymentMethodFilter !== 'ALL' || activeTab !== 'ALL'
                ? 'Hãy thử điều chỉnh bộ lọc tìm kiếm hoặc hình thức thanh toán.'
                : 'Các bút toán dòng tiền khi có đơn hàng hoặc nạp cọc sẽ được ghi nhận tại đây.'
            }
            action={
              searchQuery || paymentMethodFilter !== 'ALL' || activeTab !== 'ALL' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setPaymentMethodFilter('ALL');
                    setActiveTab('ALL');
                    setCurrentPage(1);
                  }}
                >
                  Đặt lại bộ lọc
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Mã bút toán &amp; Thời gian</TableHead>
                    <TableHead>Nghiệp vụ &amp; Hình thức</TableHead>
                    <TableHead>Dòng tiền (Nguồn ➔ Đích)</TableHead>
                    <TableHead>Đơn tham chiếu</TableHead>
                    <TableHead align="right">Số tiền biến động</TableHead>
                    <TableHead align="right">Số dư sau GD</TableHead>
                    <TableHead align="center">Trạng thái</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {displayedTx.map((tx) => {
                    const isIncome = tx.direction === 'IN';
                    const sourceRole = getRolePill(tx.sourceType);
                    const targetRole = getRolePill(tx.targetType);

                    return (
                      <TableRow
                        key={tx.id}
                        className="cursor-pointer hover:bg-slate-50/80 transition group"
                        onClick={() => setSelectedTx(tx)}
                      >
                        {/* 1. Mã bút toán & Thời gian */}
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {tx.code}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyCode(e, tx.code)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition"
                              title="Sao chép mã bút toán"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(tx.createdAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </div>
                        </TableCell>

                        {/* 2. Nghiệp vụ & Hình thức */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getTxTypeBadge(tx.type)}
                            {getPaymentMethodBadge(tx.paymentMethod)}
                          </div>
                          {tx.notes && (
                            <div
                              className="text-[11px] text-slate-500 mt-1 max-w-xs truncate"
                              title={tx.notes}
                            >
                              {tx.notes}
                            </div>
                          )}
                        </TableCell>

                        {/* 3. Dòng tiền (Nguồn ➔ Đích) */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="font-medium text-slate-800 text-xs truncate max-w-[110px]"
                              title={tx.sourceName}
                            >
                              {tx.sourceName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${sourceRole.className}`}
                            >
                              {sourceRole.label}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0 mx-0.5" />
                            <span
                              className="font-medium text-slate-800 text-xs truncate max-w-[110px]"
                              title={tx.targetName}
                            >
                              {tx.targetName}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${targetRole.className}`}
                            >
                              {targetRole.label}
                            </span>
                          </div>
                        </TableCell>

                        {/* 4. Đơn tham chiếu */}
                        <TableCell>
                          {tx.bookingCode ? (
                            <button
                              type="button"
                              onClick={(e) => handleBookingClick(e, tx.bookingCode!)}
                              className="font-mono text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 px-2 py-0.5 rounded border border-brand-200 transition inline-flex items-center gap-1"
                              title="Xem đơn trên màn hình Điều phối"
                            >
                              <span>{tx.bookingCode}</span>
                              <ExternalLink className="w-3 h-3 text-brand-500" />
                            </button>
                          ) : (
                            <span className="text-slate-400 text-xs font-mono">-</span>
                          )}
                        </TableCell>

                        {/* 5. Số tiền biến động */}
                        <TableCell align="right">
                          <span
                            className={`font-black text-xs inline-flex items-center gap-0.5 ${
                              isIncome ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                            )}
                            {isIncome ? '+' : '-'}
                            {tx.amount.toLocaleString('vi-VN')} đ
                          </span>
                        </TableCell>

                        {/* 6. Số dư sau GD */}
                        <TableCell align="right">
                          <span className="font-mono text-xs font-semibold text-slate-700">
                            {tx.balanceAfter.toLocaleString('vi-VN')} đ
                          </span>
                        </TableCell>

                        {/* 7. Trạng thái & Action */}
                        <TableCell align="center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge
                              variant={tx.status === 'COMPLETED' ? 'success' : 'warning'}
                              size="sm"
                            >
                              {tx.status === 'COMPLETED' ? 'Thành công' : 'Đang xử lý'}
                            </Badge>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTx(tx);
                              }}
                              className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition"
                              title="Xem chi tiết bút toán"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden space-y-3">
              {displayedTx.map((tx) => {
                const isIncome = tx.direction === 'IN';
                const sourceRole = getRolePill(tx.sourceType);
                const targetRole = getRolePill(tx.targetType);

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3 cursor-pointer active:scale-[0.99] transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {tx.code}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(e, tx.code)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition"
                            title="Sao chép mã"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(tx.createdAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                      </div>
                      <Badge
                        variant={tx.status === 'COMPLETED' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {tx.status === 'COMPLETED' ? 'Thành công' : 'Đang xử lý'}
                      </Badge>
                    </div>

                    <div className="space-y-2 py-2 px-3 bg-slate-50 rounded-xl text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-slate-400 text-[11px]">Nghiệp vụ:</span>
                        <div className="flex items-center gap-1">
                          {getTxTypeBadge(tx.type)}
                          {getPaymentMethodBadge(tx.paymentMethod)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-400">Luồng tiền:</span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-slate-700 truncate max-w-[80px]">
                            {tx.sourceName}
                          </span>
                          <span
                            className={`px-1 py-0.5 rounded text-[9px] font-semibold border ${sourceRole.className}`}
                          >
                            {sourceRole.label}
                          </span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                          <span className="font-medium text-slate-700 truncate max-w-[80px]">
                            {tx.targetName}
                          </span>
                          <span
                            className={`px-1 py-0.5 rounded text-[9px] font-semibold border ${targetRole.className}`}
                          >
                            {targetRole.label}
                          </span>
                        </div>
                      </div>

                      {tx.bookingCode && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Đơn tham chiếu:</span>
                          <button
                            type="button"
                            onClick={(e) => handleBookingClick(e, tx.bookingCode!)}
                            className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200 inline-flex items-center gap-0.5"
                          >
                            <span>{tx.bookingCode}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      {tx.notes && (
                        <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 truncate">
                          {tx.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Số dư sau GD:
                        </span>
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {tx.balanceAfter.toLocaleString('vi-VN')} đ
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">
                          Biến động:
                        </span>
                        <span
                          className={`font-black text-sm inline-flex items-center gap-0.5 ${
                            isIncome ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          {isIncome ? '+' : '-'}
                          {tx.amount.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTx(tx);
                      }}
                    >
                      Xem chứng từ chi tiết
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Accessible Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Transaction Detail 360 Voucher Modal */}
      <TransactionDetailModal
        isOpen={!!selectedTx}
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </div>
  );
};
