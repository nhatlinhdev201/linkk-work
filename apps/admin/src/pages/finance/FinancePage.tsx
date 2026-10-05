import React, { useState } from 'react';
import { WalletTransaction } from '../../types';
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
import { EmptyState } from '../../components/common/EmptyState';
import { SkeletonStatCards, SkeletonTable } from '../../components/common/Skeleton';
import { Pagination } from '../../components/common/Pagination';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft,
  FileSpreadsheet,
  Calendar,
  Download,
  Clock,
} from 'lucide-react';

export const FinancePage: React.FC = () => {
  const { currentTenantId, currentTenantName, isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const { data: summary, isLoading: isLoadingSummary } = useFinancialSummaryQuery(currentTenantId);
  const { data: transactions = [], isLoading: isLoadingTx } = useWalletTransactionsQuery(currentTenantId);

  const isInitialLoading = (isLoadingSummary || isLoadingTx) && !summary;

  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const filteredTx = transactions.filter((t) => {
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'DEPOSIT')
      return t.type === 'TOP_UP_DEPOSIT' || t.type === 'SOFT_HOLD' || t.type === 'HOLD_RELEASE';
    if (activeFilter === 'COMMISSION') return t.type === 'COMMISSION_FEE';
    if (activeFilter === 'SUBSCRIPTION') return t.type === 'SUBSCRIPTION_FEE';
    if (activeFilter === 'PAYOUT') return t.type === 'ORDER_PAYOUT';
    return true;
  });

  const getTxTypeBadge = (type: WalletTransaction['type']) => {
    switch (type) {
      case 'TOP_UP_DEPOSIT':
        return <Badge variant="success">Nạp tiền ký quỹ</Badge>;
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
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  const handleExportCSV = () => {
    toast({
      type: 'info',
      title: 'Xuất dữ liệu đối soát',
      message: 'Hệ thống đã kết xuất sao kê tài chính định dạng CSV thành công.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-brand-500" />
            Tài chính, Ví Sàn &amp; Sổ cái Kép
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đơn vị:{' '}
            <span className="font-semibold text-brand-600">{currentTenantName}</span>. Theo dõi
            dòng tiền đơn hàng, hoa hồng sàn, số dư ký quỹ thợ và quyết toán thanh toán.
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
      {isInitialLoading ? (
        <SkeletonStatCards count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tổng giá trị đơn (GMV)"
            value={summary ? `${(summary.grossServiceVolume / 1000000).toFixed(1)} tr đ` : '0 đ'}
            icon={<DollarSign className="w-5 h-5" />}
            trend={{ value: 14.8, isPositive: true, label: 'so với tháng trước' }}
          />
          <StatCard
            title="Hoa hồng sàn thu về"
            value={summary ? `${(summary.platformCommissionEarned / 1000000).toFixed(1)} tr đ` : '0 đ'}
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
            trend={{ value: 12.3, isPositive: true, label: 'tỷ lệ 15%' }}
          />
          <StatCard
            title="Doanh thu thực nhận"
            value={summary ? `${(summary.tenantNetRevenue / 1000000).toFixed(1)} tr đ` : '0 đ'}
            icon={<Wallet className="w-5 h-5 text-blue-600" />}
            iconBgColor="bg-blue-50 text-blue-600 border border-blue-100"
            description="Đã khấu trừ hoa hồng"
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

      {/* Transactions Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            tabs={[
              { id: 'ALL', label: 'Tất cả biến động', count: transactions.length },
              { id: 'DEPOSIT', label: 'Ký quỹ thợ' },
              { id: 'COMMISSION', label: 'Hoa hồng sàn' },
              { id: 'SUBSCRIPTION', label: 'Gói cước tháng' },
              { id: 'PAYOUT', label: 'Quyết toán' },
            ]}
            activeTab={activeFilter}
            onChange={(tabId) => {
              setActiveFilter(tabId);
              setCurrentPage(1);
            }}
            size="sm"
          />

          <span className="text-xs text-slate-400">
            Hiển thị {filteredTx.length} bút toán mới nhất
          </span>
        </div>

        {isInitialLoading ? (
          <SkeletonTable rows={6} cols={7} />
        ) : filteredTx.length === 0 ? (
          <EmptyState
            icon={<FileSpreadsheet className="w-8 h-8 text-brand-400" />}
            title="Không có giao dịch nào trong danh mục này"
            description="Các bút toán dòng tiền khi có đơn hàng hoặc nạp cọc sẽ được ghi nhận tại đây."
          />
        ) : (
          <div className="space-y-4">
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <tr>
                    <TableHead>Mã bút toán &amp; Thời gian</TableHead>
                    <TableHead>Nghiệp vụ giao dịch</TableHead>
                    <TableHead>Đối tượng liên quan</TableHead>
                    <TableHead>Đơn tham chiếu</TableHead>
                    <TableHead align="right">Số tiền biến động</TableHead>
                    <TableHead align="right">Số dư sau GD</TableHead>
                    <TableHead align="center">Trạng thái</TableHead>
                  </tr>
                </TableHeader>
                <TableBody>
                  {filteredTx
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((tx) => {
                      const isIncome = tx.direction === 'IN';
                      return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div className="font-mono font-bold text-slate-900 text-xs">{tx.code}</div>
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

                          <TableCell>
                            <div>{getTxTypeBadge(tx.type)}</div>
                            <div className="text-xs text-slate-500 mt-1 max-w-xs truncate" title={tx.notes}>
                              {tx.notes}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="font-medium text-slate-900 text-xs">
                              {tx.taskerName || tx.tenantName}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {tx.taskerId ? 'Đối tác Thợ' : 'Doanh nghiệp'}
                            </div>
                          </TableCell>

                          <TableCell>
                            {tx.bookingCode ? (
                              <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                                {tx.bookingCode}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </TableCell>

                          <TableCell align="right">
                            <span
                              className={`font-black text-xs inline-flex items-center gap-0.5 ${
                                isIncome ? 'text-emerald-600' : 'text-slate-800'
                              }`}
                            >
                              {isIncome ? (
                                <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3 text-slate-400" />
                              )}
                              {isIncome ? '+' : '-'}
                              {tx.amount.toLocaleString('vi-VN')} đ
                            </span>
                          </TableCell>

                          <TableCell align="right">
                            <span className="font-mono text-xs font-semibold text-slate-600">
                              {tx.balanceAfter.toLocaleString('vi-VN')} đ
                            </span>
                          </TableCell>

                          <TableCell align="center">
                            <Badge
                              variant={tx.status === 'COMPLETED' ? 'success' : 'warning'}
                              size="sm"
                            >
                              {tx.status === 'COMPLETED' ? 'Thành công' : 'Đang xử lý'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View (< md) */}
            <div className="md:hidden space-y-3">
              {filteredTx
                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                .map((tx) => {
                  const isIncome = tx.direction === 'IN';
                  return (
                    <div
                      key={tx.id}
                      className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs space-y-3 transition active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-xs block">{tx.code}</span>
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
                        <Badge variant={tx.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">
                          {tx.status === 'COMPLETED' ? 'Thành công' : 'Đang xử lý'}
                        </Badge>
                      </div>

                      <div className="space-y-1.5 py-2 px-3 bg-slate-50 rounded-xl text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Nghiệp vụ:</span>
                          {getTxTypeBadge(tx.type)}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Đối tượng:</span>
                          <span className="font-medium text-slate-800">
                            {tx.taskerName || tx.tenantName} ({tx.taskerId ? 'Thợ' : 'Doanh nghiệp'})
                          </span>
                        </div>
                        {tx.bookingCode && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Đơn tham chiếu:</span>
                            <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                              {tx.bookingCode}
                            </span>
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
                          <span className="text-[10px] text-slate-400 block font-medium">Số dư sau GD:</span>
                          <span className="font-mono text-xs font-semibold text-slate-600">
                            {tx.balanceAfter.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Biến động:</span>
                          <span
                            className={`font-black text-sm inline-flex items-center gap-0.5 ${
                              isIncome ? 'text-emerald-600' : 'text-slate-800'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            {isIncome ? '+' : '-'}
                            {tx.amount.toLocaleString('vi-VN')} đ
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredTx.length / pageSize)}
              totalItems={filteredTx.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
