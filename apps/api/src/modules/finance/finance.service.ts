import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  BookingStatus,
  Prisma,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryTransactionsDto } from './dto/query-transactions.dto';

export interface FinancialSummary {
  grossServiceVolume: number;
  platformCommissionEarned: number;
  tenantNetRevenue: number;
  totalDepositHeld: number;
  pendingSettlementsCount: number;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Truy vấn danh sách giao dịch sổ cái kép có phân quyền tenant và tính tổng tóm tắt
   */
  async getTransactions(
    query: QueryTransactionsDto,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.WalletTransactionWhereInput = {};

    // Phân quyền tenant
    const targetTenantId = effectiveTenantId || (isSuperAdmin ? query.tenantId : null);
    if (targetTenantId) {
      where.tenantId = targetTenantId;
    } else if (!isSuperAdmin) {
      throw new ForbiddenException('Tenant context is required');
    }

    // Bộ lọc nghiệp vụ và phương thức
    if (query.type) {
      where.type = query.type;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod;
    }

    if (query.taskerId) {
      where.taskerId = query.taskerId;
    }

    // Lọc theo khoảng ngày
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Tìm kiếm đa trường
    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { sourceName: { contains: searchTerm, mode: 'insensitive' } },
        { targetName: { contains: searchTerm, mode: 'insensitive' } },
        { notes: { contains: searchTerm, mode: 'insensitive' } },
        { booking: { code: { contains: searchTerm, mode: 'insensitive' } } },
        { tasker: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [total, rawTransactions] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              code: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
          tasker: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
    ]);

    const transactions = rawTransactions.map((tx) => ({
      ...tx,
      tenantName: tx.tenant?.name,
      taskerName: tx.tasker?.name,
      bookingCode: tx.booking?.code,
    }));

    // Tính toán số liệu tóm tắt cho matching tenant
    const summaryTenantFilter: Prisma.WalletTransactionWhereInput = {};
    if (targetTenantId) {
      summaryTenantFilter.tenantId = targetTenantId;
    }

    const [cashAgg, commAgg, depositAgg] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: {
          ...summaryTenantFilter,
          type: WalletTransactionType.CASH_COLLECTED,
          status: WalletTransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: {
          ...summaryTenantFilter,
          type: WalletTransactionType.COMMISSION_FEE,
          status: WalletTransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: {
          ...summaryTenantFilter,
          type: WalletTransactionType.TOP_UP_DEPOSIT,
          status: WalletTransactionStatus.COMPLETED,
        },
        _sum: { amount: true },
      }),
    ]);

    const summary = {
      totalCashCollected: cashAgg._sum.amount ?? 0,
      totalCommissionFee: commAgg._sum.amount ?? 0,
      totalDepositTopUp: depositAgg._sum.amount ?? 0,
    };

    return {
      transactions,
      total,
      page,
      limit,
      summary,
    };
  }

  /**
   * Thống kê tổng quan tài chính thời gian thực từ cơ sở dữ liệu
   */
  async getFinancialSummary(
    queryTenantId: string | undefined,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ): Promise<FinancialSummary> {
    const targetTenantId = effectiveTenantId || (isSuperAdmin ? queryTenantId : null);
    if (!targetTenantId && !isSuperAdmin) {
      throw new ForbiddenException('Tenant context is required');
    }

    const bookingWhere: Prisma.BookingWhereInput = {
      status: BookingStatus.COMPLETED,
      ...(targetTenantId ? { servicingTenantId: targetTenantId } : {}),
    };

    const commTxWhere: Prisma.WalletTransactionWhereInput = {
      type: WalletTransactionType.COMMISSION_FEE,
      status: WalletTransactionStatus.COMPLETED,
      ...(targetTenantId ? { tenantId: targetTenantId } : {}),
    };

    const profileWhere: Prisma.TaskerProfileWhereInput = {
      ...(targetTenantId ? { tenantId: targetTenantId } : {}),
    };

    const pendingWhere: Prisma.BookingWhereInput = {
      status: {
        in: [BookingStatus.IN_PROGRESS, BookingStatus.PENDING_ACCEPTANCE],
      },
      ...(targetTenantId ? { servicingTenantId: targetTenantId } : {}),
    };

    const [bookingSum, commSum, depositSum, pendingCount] = await Promise.all([
      this.prisma.booking.aggregate({
        where: bookingWhere,
        _sum: { totalAmount: true },
      }),
      this.prisma.walletTransaction.aggregate({
        where: commTxWhere,
        _sum: { amount: true },
      }),
      this.prisma.taskerProfile.aggregate({
        where: profileWhere,
        _sum: { depositBalance: true },
      }),
      this.prisma.booking.count({
        where: pendingWhere,
      }),
    ]);

    const grossServiceVolume = bookingSum._sum.totalAmount ?? 0;
    const platformCommissionEarned = commSum._sum.amount ?? 0;
    const tenantNetRevenue = grossServiceVolume - platformCommissionEarned;
    const totalDepositHeld = depositSum._sum.depositBalance ?? 0;
    const pendingSettlementsCount = pendingCount;

    return {
      grossServiceVolume,
      platformCommissionEarned,
      tenantNetRevenue,
      totalDepositHeld,
      pendingSettlementsCount,
    };
  }
}
