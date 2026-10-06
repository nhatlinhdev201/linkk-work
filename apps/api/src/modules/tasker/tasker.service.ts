import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  Prisma,
  UserRole,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  AdjustDepositDto,
  CreateTaskerDto,
  UpdateKycDto,
  UpdateTaskerDto,
  UpdateWorkFloorDto,
} from './dto';

export interface TaskerQueryParams {
  tenantId?: string;
  search?: string;
  isOnline?: boolean;
  kycVerified?: boolean;
  lowDepositOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Loại bỏ passwordHash khỏi đối tượng User trước khi trả về client
 */
export function sanitizeTaskerUser<T extends { passwordHash?: string }>(
  user: T,
): Omit<T, 'passwordHash'> {
  const { passwordHash: _hash, ...sanitized } = user;
  return sanitized;
}

@Injectable()
export class TaskerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đăng ký thợ mới kèm hồ sơ năng lực và giao dịch ký quỹ khởi tạo
   */
  async createTasker(
    dto: CreateTaskerDto,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const targetTenantId = isSuperAdmin
      ? (dto.tenantId || effectiveTenantId || 'tenant-linkkwork')
      : effectiveTenantId;

    if (!targetTenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          ...(dto.phone ? [{ phone: dto.phone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email hoặc số điện thoại đã tồn tại trong hệ thống');
    }

    const passwordHash = await bcrypt.hash(dto.password || 'Tasker@123456', 10);
    const initialDeposit = dto.depositBalance !== undefined ? dto.depositBalance : 500000;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          phone: dto.phone,
          name: dto.name,
          passwordHash,
          role: UserRole.TASKER,
          status: 'ACTIVE',
          tenantId: targetTenantId,
        },
      });

      await tx.taskerProfile.create({
        data: {
          userId: user.id,
          tenantId: targetTenantId,
          skills: dto.skills || [],
          idCardNumber: dto.idCardNumber,
          depositBalance: initialDeposit,
          maxDistanceKm: dto.maxDistanceKm ?? 15,
          autoRadarEnabled: dto.autoRadarEnabled ?? true,
          bankName: dto.bankName,
          bankAccountNumber: dto.bankAccountNumber,
          bankAccountHolder: dto.bankAccountHolder,
        },
      });

      if (initialDeposit > 0) {
        const txCode = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await tx.walletTransaction.create({
          data: {
            code: txCode,
            tenantId: targetTenantId,
            taskerId: user.id,
            type: WalletTransactionType.TOP_UP_DEPOSIT,
            amount: initialDeposit,
            direction: 'IN',
            balanceBefore: 0,
            balanceAfter: initialDeposit,
            status: WalletTransactionStatus.COMPLETED,
            notes: 'Ký quỹ khởi tạo khi gia nhập hệ thống',
            triggeredBy: 'SYSTEM_ONBOARDING',
          },
        });
      }

      const result = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          taskerProfile: true,
          tenant: true,
        },
      });

      if (!result) {
        throw new NotFoundException(`Tasker ${user.id} not found after creation`);
      }

      return sanitizeTaskerUser(result);
    });
  }

  /**
   * Danh sách thợ có phân quyền cách ly Tenant và bộ lọc trạng thái sàn làm việc
   */
  async getTaskers(
    params: TaskerQueryParams,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: UserRole.TASKER,
    };

    if (!isSuperAdmin) {
      if (!effectiveTenantId) {
        throw new ForbiddenException('Tenant context is required');
      }
      where.tenantId = effectiveTenantId;
    } else if (params.tenantId) {
      where.tenantId = params.tenantId;
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const taskerProfileWhere: Prisma.TaskerProfileWhereInput = {};
    if (params.isOnline !== undefined) {
      taskerProfileWhere.isOnline = params.isOnline;
    }
    if (params.kycVerified !== undefined) {
      taskerProfileWhere.kycVerified = params.kycVerified;
    }
    if (params.lowDepositOnly) {
      taskerProfileWhere.depositBalance = { lt: 100000 };
    }

    if (Object.keys(taskerProfileWhere).length > 0) {
      where.taskerProfile = taskerProfileWhere;
    }

    const [total, taskers] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          taskerProfile: true,
          tenant: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      taskers: taskers.map(sanitizeTaskerUser),
      total,
      page,
      limit,
    };
  }

  /**
   * Lấy chi tiết thợ kèm hồ sơ, đơn vị chủ quản và 10 giao dịch tài chính gần nhất
   */
  async getTaskerById(
    id: string,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.prisma.user.findFirst({
      where: {
        OR: [{ id }, { taskerProfile: { id } }],
        role: UserRole.TASKER,
      },
      include: {
        taskerProfile: true,
        tenant: true,
        walletTransactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tasker) {
      throw new NotFoundException(`Tasker with ID ${id} not found`);
    }

    if (!isSuperAdmin) {
      if (!effectiveTenantId || tasker.tenantId !== effectiveTenantId) {
        throw new ForbiddenException('You do not have access to taskers in another tenant');
      }
    }

    return sanitizeTaskerUser(tasker);
  }

  /**
   * Cập nhật thông tin cá nhân và tài khoản ngân hàng của thợ
   */
  async updateTasker(
    id: string,
    dto: UpdateTaskerDto,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.findTaskerAndAuthorize(id, effectiveTenantId, isSuperAdmin);

    const userUpdates: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) userUpdates.name = dto.name;
    if (dto.phone !== undefined) userUpdates.phone = dto.phone;

    const profileUpdates: Prisma.TaskerProfileUpdateInput = {};
    if (dto.skills !== undefined) profileUpdates.skills = dto.skills;
    if (dto.idCardNumber !== undefined) profileUpdates.idCardNumber = dto.idCardNumber;
    if (dto.bankName !== undefined) profileUpdates.bankName = dto.bankName;
    if (dto.bankAccountNumber !== undefined) profileUpdates.bankAccountNumber = dto.bankAccountNumber;
    if (dto.bankAccountHolder !== undefined) profileUpdates.bankAccountHolder = dto.bankAccountHolder;
    if (dto.salaryType !== undefined) profileUpdates.salaryType = dto.salaryType;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({
          where: { id: tasker.id },
          data: userUpdates,
        });
      }

      if (Object.keys(profileUpdates).length > 0) {
        await tx.taskerProfile.update({
          where: { userId: tasker.id },
          data: profileUpdates,
        });
      }

      const updated = await tx.user.findUnique({
        where: { id: tasker.id },
        include: {
          taskerProfile: true,
          tenant: true,
        },
      });

      if (!updated) {
        throw new NotFoundException(`Tasker ${tasker.id} not found after update`);
      }

      return sanitizeTaskerUser(updated);
    });
  }

  /**
   * Cấu hình bán kính quét việc và trạng thái radar sàn làm việc
   */
  async updateWorkFloor(
    id: string,
    dto: UpdateWorkFloorDto,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.findTaskerAndAuthorize(id, effectiveTenantId, isSuperAdmin);

    const profileUpdates: Prisma.TaskerProfileUpdateInput = {};
    if (dto.maxDistanceKm !== undefined) profileUpdates.maxDistanceKm = dto.maxDistanceKm;
    if (dto.autoRadarEnabled !== undefined) profileUpdates.autoRadarEnabled = dto.autoRadarEnabled;
    if (dto.isOnline !== undefined) profileUpdates.isOnline = dto.isOnline;
    if (dto.currentLat !== undefined) profileUpdates.currentLat = dto.currentLat;
    if (dto.currentLng !== undefined) profileUpdates.currentLng = dto.currentLng;

    return this.prisma.taskerProfile.update({
      where: { userId: tasker.id },
      data: profileUpdates,
    });
  }

  /**
   * Chuyển đổi trạng thái trực tuyến / ngoại tuyến
   */
  async toggleOnlineStatus(
    id: string,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.findTaskerAndAuthorize(id, effectiveTenantId, isSuperAdmin);

    const currentOnline = tasker.taskerProfile?.isOnline ?? false;
    return this.prisma.taskerProfile.update({
      where: { userId: tasker.id },
      data: { isOnline: !currentOnline },
    });
  }

  /**
   * Nạp hoặc khấu trừ ký quỹ qua sổ cái giao dịch kép (Double-entry Ledger)
   */
  async adjustDeposit(
    id: string,
    dto: AdjustDepositDto,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
    triggeredBy: string,
  ) {
    if (dto.amount === 0) {
      throw new BadRequestException('Số tiền điều chỉnh không được bằng 0');
    }

    const tasker = await this.findTaskerAndAuthorize(id, effectiveTenantId, isSuperAdmin);

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.taskerProfile.findUnique({
        where: { userId: tasker.id },
      });

      if (!profile) {
        throw new NotFoundException(`Tasker profile not found for user ${tasker.id}`);
      }

      const newBalance = profile.depositBalance + dto.amount;
      if (newBalance < 0) {
        throw new BadRequestException('Số dư ký quỹ không thể âm');
      }

      const updatedProfile = await tx.taskerProfile.update({
        where: { userId: tasker.id },
        data: { depositBalance: newBalance },
      });

      const txCode = `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const transaction = await tx.walletTransaction.create({
        data: {
          code: txCode,
          tenantId: profile.tenantId,
          taskerId: tasker.id,
          type:
            dto.amount > 0
              ? WalletTransactionType.TOP_UP_DEPOSIT
              : WalletTransactionType.WITHDRAW_DEPOSIT,
          amount: Math.abs(dto.amount),
          direction: dto.amount > 0 ? 'IN' : 'OUT',
          balanceBefore: profile.depositBalance,
          balanceAfter: newBalance,
          status: WalletTransactionStatus.COMPLETED,
          notes: dto.notes,
          triggeredBy,
        },
      });

      return {
        taskerProfile: updatedProfile,
        transaction,
      };
    });
  }

  /**
   * Cập nhật trạng thái xác minh danh tính KYC
   */
  async updateKyc(
    id: string,
    dto: UpdateKycDto,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.findTaskerAndAuthorize(id, effectiveTenantId, isSuperAdmin);

    const updateData: Prisma.TaskerProfileUpdateInput = {
      kycVerified: dto.kycVerified,
    };
    if (dto.idCardNumber !== undefined) {
      updateData.idCardNumber = dto.idCardNumber;
    }

    return this.prisma.taskerProfile.update({
      where: { userId: tasker.id },
      data: updateData,
    });
  }

  /**
   * Lấy lịch sử giao dịch ký quỹ của thợ
   */
  async getTaskerTransactions(
    id: string,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.findTaskerAndAuthorize(id, effectiveTenantId, isSuperAdmin);

    return this.prisma.walletTransaction.findMany({
      where: {
        taskerId: tasker.id,
        ...(!isSuperAdmin && effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Kiểm tra thợ tồn tại và phân quyền quản trị của Tenant
   */
  private async findTaskerAndAuthorize(
    id: string,
    effectiveTenantId: string | null,
    isSuperAdmin: boolean,
  ) {
    const tasker = await this.prisma.user.findFirst({
      where: {
        OR: [{ id }, { taskerProfile: { id } }],
        role: UserRole.TASKER,
      },
      include: {
        taskerProfile: true,
        tenant: true,
      },
    });

    if (!tasker) {
      throw new NotFoundException(`Tasker with ID ${id} not found`);
    }

    if (!isSuperAdmin) {
      if (!effectiveTenantId || tasker.tenantId !== effectiveTenantId) {
        throw new ForbiddenException('You do not have access to taskers in another tenant');
      }
    }

    return tasker;
  }
}
