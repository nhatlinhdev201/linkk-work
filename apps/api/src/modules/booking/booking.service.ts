import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { PricingEngine } from '../catalog/pricing.engine';
import { CreateBookingDto } from './dto/create-booking.dto';
import { AssignTaskerDto } from './dto/assign-tasker.dto';
import { TransitionStatusDto } from './dto/transition-status.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { RecordCashPaymentDto } from './dto/record-cash-payment.dto';
import { isValidBookingTransition } from './booking-state-machine';
import {
  BookingStatus,
  UserRole,
  ServicePricingType,
  PaymentStatus,
  PaymentMethod,
} from '@linkkwork/shared-types';
import {
  Prisma,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
} from '@prisma/client';
import {
  computeTaskerAvailability,
  formatActiveJob,
} from '../tasker/tasker-availability.helper';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pricingEngine: PricingEngine,
  ) {}

  /**
   * Tạo đơn hàng mới với Server-Side Authoritative Pricing và Snapshot giá
   */
  async createBooking(
    currentTenantId: string | null,
    userId: string | null,
    dto: CreateBookingDto,
  ) {
    // 1. Lấy thông tin Dịch vụ gốc
    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
      include: {
        category: true,
        addons: true,
      },
    });

    if (!service || !service.isActive) {
      throw new NotFoundException(`Dịch vụ ${dto.serviceId} không tồn tại hoặc đã ngừng hoạt động`);
    }

    // 2. Lấy thông tin addons được chọn
    const selectedAddons = dto.addonIds && dto.addonIds.length > 0
      ? service.addons.filter((a) => dto.addonIds?.includes(a.id) && a.isActive)
      : [];

    const addonsPrice = selectedAddons.reduce((sum, a) => sum + a.price, 0);

    // 3. Tính toán giá thẩm quyền phía máy chủ (Server-Side Authoritative Pricing)
    const pricingResult = this.pricingEngine.calculate({
      pricingType: service.pricingType as unknown as ServicePricingType,
      baseUnitPrice: service.baseUnitPrice,
      durationHours: dto.durationHours,
      unitCount: dto.unitCount,
      areaSurcharge: dto.areaSurcharge ?? 0,
      addonsPrice,
      surgeMultiplier: dto.surgeMultiplier ?? 1.0,
      discountAmount: dto.discountAmount ?? 0,
    });

    // 4. Xác định Tenant nguồn & Tenant thụ hưởng
    let resolvedTenantId = currentTenantId;
    if (!resolvedTenantId) {
      const defaultTenant = await this.prisma.tenant.findFirst({
        where: { isDefault: true },
      });
      if (!defaultTenant) {
        throw new BadRequestException('Chưa cấu hình Tenant nền tảng mặc định');
      }
      resolvedTenantId = defaultTenant.id;
    }

    // 5. Sinh mã đơn hàng duy nhất: BK-YYYY-XXXXXX
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const code = `BK-${year}-${randomSuffix}`;

    // 6. Lưu bản ghi Booking cùng chi tiết Addons & Sự kiện ban đầu trong 1 Transaction
    const scheduledAtDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledAtDate.getTime())) {
      throw new BadRequestException('Thời gian scheduledAt không hợp lệ');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          code,
          originTenantId: resolvedTenantId!,
          servicingTenantId: resolvedTenantId!,
          customerId: userId || null,
          serviceId: service.id,
          status: BookingStatus.PENDING_DISPATCH,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
          pricingType: service.pricingType,
          baseUnitPrice: service.baseUnitPrice,
          durationHours: dto.durationHours || (service.pricingType === 'HOURLY' ? 2 : null),
          unitCount: dto.unitCount || (service.pricingType === 'PER_UNIT' ? 1 : null),
          areaSurcharge: dto.areaSurcharge || 0,
          addonsPrice,
          surgeMultiplier: pricingResult.surgeMultiplier,
          surgeAmount: pricingResult.surgeAmount,
          discountAmount: pricingResult.discountAmount,
          voucherCode: dto.voucherCode || null,
          totalAmount: pricingResult.finalTotal,
          scheduledAt: scheduledAtDate,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          addressText: dto.addressText,
          latitude: dto.latitude || null,
          longitude: dto.longitude || null,
          addons: {
            create: selectedAddons.map((a) => ({
              addonId: a.id,
              name: a.name,
              price: a.price,
            })),
          },
          events: {
            create: {
              fromStatus: null,
              toStatus: BookingStatus.PENDING_DISPATCH,
              triggeredBy: userId || 'ADMIN',
              note: dto.note || 'Tạo đơn hàng mới',
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: true,
          originTenant: true,
          servicingTenant: true,
        },
      });

      return booking;
    });
  }

  /**
   * Danh sách đơn hàng có phân quyền cách ly Tenant
   */
  async getBookings(
    effectiveTenantId: string | null,
    query: QueryBookingsDto,
  ) {
    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Filter điều kiện Tenant
    const where: Record<string, unknown> = {};

    if (effectiveTenantId) {
      where.OR = [
        { servicingTenantId: effectiveTenantId },
        { originTenantId: effectiveTenantId },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.AND = [
        {
          OR: [
            { code: { contains: searchTerm, mode: 'insensitive' } },
            { customerName: { contains: searchTerm, mode: 'insensitive' } },
            { customerPhone: { contains: searchTerm } },
            { addressText: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          service: true,
          addons: true,
          events: {
            orderBy: { createdAt: 'asc' },
          },
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Chi tiết đơn hàng với xác thực Tenant
   */
  async getBookingById(
    id: string,
    effectiveTenantId: string | null,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        service: {
          include: { category: true },
        },
        addons: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
        originTenant: true,
        servicingTenant: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
        assignedTasker: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            taskerProfile: true,
          },
        },
        walletTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID ${id}`);
    }

    // Kiểm tra cô lập dữ liệu
    if (effectiveTenantId) {
      const belongsToTenant =
        booking.servicingTenantId === effectiveTenantId ||
        booking.originTenantId === effectiveTenantId;

      if (!belongsToTenant) {
        throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng của Tenant khác');
      }
    }

    return booking;
  }

  /**
   * Chỉ định thợ trực tiếp (Direct Assignment) với kiểm tra phân quyền Tenant
   */
  async directAssignTasker(
    bookingId: string,
    dto: AssignTaskerDto,
    effectiveTenantId: string | null,
    triggeredBy: string,
    isSuperAdmin: boolean = false,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    // Kiểm tra trạng thái hợp lệ để gán thợ
    if (
      booking.status !== BookingStatus.PENDING_DISPATCH &&
      booking.status !== BookingStatus.BROADCASTING &&
      booking.status !== BookingStatus.EMERGENCY_REDISPATCH
    ) {
      throw new BadRequestException(
        `Không thể gán thợ khi đơn đang ở trạng thái ${booking.status}. Trạng thái phải là PENDING_DISPATCH hoặc BROADCASTING.`,
      );
    }

    // Kiểm tra thợ tồn tại và thẩm quyền Tenant
    const tasker = await this.prisma.user.findUnique({
      where: { id: dto.taskerId },
      include: { taskerProfile: true },
    });

    if (!tasker || tasker.role !== UserRole.TASKER) {
      throw new BadRequestException(`Người dùng ${dto.taskerId} không phải là Tasker hợp lệ`);
    }

    // Thợ bắt buộc phải thuộc Tenant điều phối của đơn hàng
    if (tasker.tenantId !== booking.servicingTenantId) {
      if (!isSuperAdmin) {
        throw new ForbiddenException('Thợ không thuộc thẩm quyền của Tenant quản lý đơn này');
      }
    }

    const previousStatus = booking.status;

    return this.prisma.$transaction(async (tx) => {
      const isCrossTenant =
        tasker.tenantId !== booking.servicingTenantId && isSuperAdmin && Boolean(tasker.tenantId);

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          ...(isCrossTenant && tasker.tenantId ? { servicingTenantId: tasker.tenantId } : {}),
          assignedTaskerId: tasker.id,
          status: BookingStatus.ASSIGNED,
          events: {
            create: {
              fromStatus: previousStatus,
              toStatus: BookingStatus.ASSIGNED,
              triggeredBy,
              note: dto.note || `Chỉ định trực tiếp thợ ${tasker.name} (${tasker.phone})`,
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: true,
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      // Đồng bộ trạng thái ca việc của thợ được chỉ định
      await tx.taskerProfile.updateMany({
        where: { userId: tasker.id },
        data: { currentStatus: 'ASSIGNED' },
      });

      // Nếu đơn trước đó đã từng gán cho thợ khác, giải phóng thợ cũ về IDLE nếu không còn đơn nào
      if (booking.assignedTaskerId && booking.assignedTaskerId !== tasker.id) {
        const prevTaskerActive = await tx.booking.count({
          where: {
            assignedTaskerId: booking.assignedTaskerId,
            id: { not: bookingId },
            status: {
              in: [
                BookingStatus.ASSIGNED,
                BookingStatus.ARRIVING,
                BookingStatus.IN_PROGRESS,
                BookingStatus.PENDING_ACCEPTANCE,
              ],
            },
          },
        });
        if (prevTaskerActive === 0) {
          await tx.taskerProfile.updateMany({
            where: { userId: booking.assignedTaskerId },
            data: { currentStatus: 'IDLE' },
          });
        }
      }

      // Nếu đơn đang mở trên Redis radar thì cập nhật
      await this.redis.set(`job:status:${bookingId}`, 'ASSIGNED', 86400);

      return updatedBooking;
    });
  }

  /**
   * Chuyển trạng thái đơn hàng tuân thủ Booking State Machine
   */
  async transitionStatus(
    bookingId: string,
    dto: TransitionStatusDto,
    effectiveTenantId: string | null,
    triggeredBy: string,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    if (!isValidBookingTransition(booking.status, dto.status)) {
      throw new BadRequestException(
        `Chuyển đổi trạng thái không hợp lệ: không thể chuyển từ ${booking.status} sang ${dto.status}`,
      );
    }

    const previousStatus = booking.status;

    return this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: dto.status,
        events: {
          create: {
            fromStatus: previousStatus,
            toStatus: dto.status,
            triggeredBy,
            note: dto.note || `Chuyển trạng thái sang ${dto.status}`,
          },
        },
      };

      if (dto.status === BookingStatus.COMPLETED) {
        updateData.paymentStatus = PaymentStatus.RELEASED_TO_TASKER;
        if (!booking.paidAt) {
          updateData.paidAt = new Date();
        }

        // Tự động ghi nhận thanh toán và khấu trừ hoa hồng sàn nếu chưa từng thanh toán/khấu trừ trước đó
        const currentBooking = await tx.booking.findUnique({ where: { id: bookingId } });
        if (
          currentBooking?.paymentStatus !== PaymentStatus.RELEASED_TO_TASKER &&
          booking.assignedTaskerId
        ) {
          await this.settleCashBookingLedger(
            tx,
            booking,
            booking.totalAmount,
            triggeredBy,
            true,
            dto.note,
          );
        }
      }

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: updateData,
        include: {
          service: true,
          addons: true,
          events: {
            orderBy: { createdAt: 'asc' },
          },
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      if (booking.assignedTaskerId) {
        if (dto.status === BookingStatus.ARRIVING) {
          await tx.taskerProfile.updateMany({
            where: { userId: booking.assignedTaskerId },
            data: { currentStatus: 'ARRIVING' },
          });
        } else if (dto.status === BookingStatus.IN_PROGRESS) {
          await tx.taskerProfile.updateMany({
            where: { userId: booking.assignedTaskerId },
            data: { currentStatus: 'IN_PROGRESS' },
          });
        } else if (dto.status === BookingStatus.PENDING_ACCEPTANCE) {
          await tx.taskerProfile.updateMany({
            where: { userId: booking.assignedTaskerId },
            data: { currentStatus: 'PENDING_ACCEPTANCE' },
          });
        } else if (
          dto.status === BookingStatus.COMPLETED ||
          dto.status === BookingStatus.CANCELLED
        ) {
          // Tăng số lượng việc hoàn thành nếu là COMPLETED
          if (dto.status === BookingStatus.COMPLETED) {
            await tx.taskerProfile.updateMany({
              where: { userId: booking.assignedTaskerId },
              data: {
                completedJobsCount: { increment: 1 },
              },
            });
          }

          // Kiểm tra xem thợ còn đơn nào khác đang làm không, nếu không thì đưa về IDLE
          const remainingActive = await tx.booking.count({
            where: {
              assignedTaskerId: booking.assignedTaskerId,
              id: { not: bookingId },
              status: {
                in: [
                  BookingStatus.ASSIGNED,
                  BookingStatus.ARRIVING,
                  BookingStatus.IN_PROGRESS,
                  BookingStatus.PENDING_ACCEPTANCE,
                ],
              },
            },
          });

          if (remainingActive === 0) {
            await tx.taskerProfile.updateMany({
              where: { userId: booking.assignedTaskerId },
              data: { currentStatus: 'IDLE' },
            });
          }
        }
      }

      // Cập nhật trạng thái Redis cho radar/worker
      await this.redis.set(`job:status:${bookingId}`, dto.status, 86400);

      return updatedBooking;
    });
  }

  /**
   * Bắn đơn lên sàn radar diện rộng (BROADCASTING)
   */
  async broadcastBooking(
    bookingId: string,
    effectiveTenantId: string | null,
    triggeredBy: string,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    if (
      booking.status !== BookingStatus.PENDING_DISPATCH &&
      booking.status !== BookingStatus.EMERGENCY_REDISPATCH
    ) {
      throw new BadRequestException(
        `Chỉ đơn ở trạng thái PENDING_DISPATCH hoặc EMERGENCY_REDISPATCH mới được bắn đơn radar`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.BROADCASTING,
          events: {
            create: {
              fromStatus: booking.status,
              toStatus: BookingStatus.BROADCASTING,
              triggeredBy,
              note: 'Bắn đơn lên sàn radar cho thợ nhận việc',
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: true,
        },
      });

      // Mở trạng thái trên Redis cho thuật toán atomic fast-finger claim CAS
      await this.redis.set(`job:status:${bookingId}`, 'OPEN', 86400);

      return updated;
    });
  }

  /**
   * Danh sách thợ khả dụng của Tenant để phục vụ điều phối
   */
  async getAvailableTaskers(effectiveTenantId: string | null) {
    const where: Record<string, unknown> = {
      role: UserRole.TASKER,
    };

    if (effectiveTenantId) {
      where.tenantId = effectiveTenantId;
    }

    const taskers = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        avatarUrl: true,
        tenantId: true,
        status: true,
        taskerProfile: true,
        assignedBookings: {
          where: {
            status: {
              in: [
                BookingStatus.ASSIGNED,
                BookingStatus.ARRIVING,
                BookingStatus.IN_PROGRESS,
                BookingStatus.PENDING_ACCEPTANCE,
              ],
            },
          },
          take: 1,
          orderBy: { updatedAt: 'desc' },
          include: {
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return taskers.map((t) => {
      const activeBooking = t.assignedBookings?.[0] || null;
      const availability = computeTaskerAvailability(
        t.status,
        t.taskerProfile,
        activeBooking,
      );
      const activeJob = formatActiveJob(activeBooking);
      const { assignedBookings: _b, ...rest } = t;
      return {
        ...rest,
        availability,
        activeJob,
      };
    });
  }

  /**
   * Ghi nhận thanh toán tiền mặt và khấu trừ hoa hồng sàn từ ví ký quỹ của thợ
   */
  async recordCashPayment(
    bookingId: string,
    dto: RecordCashPaymentDto,
    effectiveTenantId: string | null,
    triggeredBy: string,
    _isSuperAdmin: boolean,
  ) {
    const booking = await this.getBookingById(bookingId, effectiveTenantId);

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.DRAFT) {
      throw new BadRequestException('Không thể ghi nhận thanh toán cho đơn hàng đã hủy hoặc bản nháp');
    }

    if (booking.paymentStatus === PaymentStatus.RELEASED_TO_TASKER) {
      throw new BadRequestException('Đơn hàng này đã được ghi nhận thanh toán trước đó');
    }

    return this.prisma.$transaction(async (tx) => {
      // TOCTOU Concurrency Guard: Kiểm tra lại trạng thái thanh toán bên trong giao dịch ACID
      const currentBooking = await tx.booking.findUnique({ where: { id: bookingId } });
      if (currentBooking?.paymentStatus === PaymentStatus.RELEASED_TO_TASKER) {
        throw new BadRequestException('Đơn hàng này đã được ghi nhận thanh toán trước đó');
      }

      const amountToCollect = dto.amount ?? booking.totalAmount;

      // Quyết toán sổ cái kép (CASH_COLLECTED & COMMISSION_FEE)
      const commissionTx = await this.settleCashBookingLedger(
        tx,
        booking,
        amountToCollect,
        triggeredBy,
        dto.deductCommission !== false,
        dto.note,
      );

      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: PaymentStatus.RELEASED_TO_TASKER,
          paymentMethod: PaymentMethod.CASH,
          paidAt: new Date(),
          events: {
            create: {
              fromStatus: booking.status,
              toStatus: booking.status,
              triggeredBy,
              note: dto.note || `Ghi nhận thanh toán tiền mặt: ${amountToCollect.toLocaleString('vi-VN')} đ`,
            },
          },
        },
        include: {
          service: true,
          addons: true,
          events: {
            orderBy: { createdAt: 'asc' },
          },
          originTenant: true,
          servicingTenant: true,
          assignedTasker: {
            select: { id: true, name: true, phone: true },
          },
          walletTransactions: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return {
        ...updatedBooking,
        commissionTransaction: commissionTx,
      };
    });
  }

  /**
   * Quyết toán sổ cái kép cho đơn hàng tiền mặt (CASH_COLLECTED & COMMISSION_FEE)
   */
  private async settleCashBookingLedger(
    tx: Prisma.TransactionClient,
    booking: {
      id: string;
      code: string;
      totalAmount: number;
      servicingTenantId: string;
      customerId?: string | null;
      customerName?: string;
      assignedTaskerId?: string | null;
      paymentMethod?: PaymentMethod | string | null;
    },
    amountToCollect: number,
    triggeredBy: string,
    deductCommission = true,
    note?: string,
  ): Promise<WalletTransaction | null> {
    if (!booking.assignedTaskerId) {
      return null;
    }

    const tasker = await tx.user.findUnique({
      where: { id: booking.assignedTaskerId },
    });
    const taskerProfile = await tx.taskerProfile.findUnique({
      where: { userId: booking.assignedTaskerId },
    });
    const servicingTenant = await tx.tenant.findUnique({
      where: { id: booking.servicingTenantId },
    });

    if (!taskerProfile) {
      return null;
    }

    // 1. Bút toán Thu tiền mặt (CASH_COLLECTED)
    await tx.walletTransaction.create({
      data: {
        code: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        tenantId: booking.servicingTenantId,
        taskerId: booking.assignedTaskerId,
        customerId: booking.customerId ?? null,
        bookingId: booking.id,
        type: WalletTransactionType.CASH_COLLECTED,
        sourceType: 'CUSTOMER',
        sourceId: booking.customerId ?? null,
        sourceName: booking.customerName || 'Khách hàng',
        targetType: 'TASKER',
        targetId: booking.assignedTaskerId,
        targetName: tasker?.name || 'Thợ đối tác',
        paymentMethod: PaymentMethod.CASH,
        amount: amountToCollect,
        direction: 'IN',
        balanceBefore: taskerProfile.depositBalance,
        balanceAfter: taskerProfile.depositBalance,
        status: WalletTransactionStatus.COMPLETED,
        notes: note || `Khách hàng thanh toán tiền mặt trực tiếp cho thợ: ${amountToCollect.toLocaleString('vi-VN')} đ`,
        triggeredBy,
      },
    });

    // 2. Bút toán Khấu trừ hoa hồng sàn (COMMISSION_FEE)
    let commissionTx: WalletTransaction | null = null;
    if (deductCommission) {
      const commissionRate = servicingTenant?.commissionRate ?? 15.0;
      const commissionAmount = Math.round(amountToCollect * (commissionRate / 100));

      if (commissionAmount > 0) {
        const newDepositBalance = taskerProfile.depositBalance - commissionAmount;

        await tx.taskerProfile.update({
          where: { id: taskerProfile.id },
          data: { depositBalance: newDepositBalance },
        });

        commissionTx = await tx.walletTransaction.create({
          data: {
            code: `TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
            tenantId: booking.servicingTenantId,
            taskerId: booking.assignedTaskerId,
            customerId: booking.customerId ?? null,
            bookingId: booking.id,
            type: WalletTransactionType.COMMISSION_FEE,
            sourceType: 'TASKER',
            sourceId: booking.assignedTaskerId,
            sourceName: tasker?.name || 'Thợ đối tác',
            targetType: 'TENANT',
            targetId: booking.servicingTenantId,
            targetName: servicingTenant?.name || 'Đơn vị đối tác',
            paymentMethod: PaymentMethod.WALLET,
            amount: commissionAmount,
            direction: 'OUT',
            balanceBefore: taskerProfile.depositBalance,
            balanceAfter: newDepositBalance,
            status: WalletTransactionStatus.COMPLETED,
            notes: `Khấu trừ hoa hồng sàn ${commissionRate}% cho đơn ${booking.code} (Thợ thu ${amountToCollect.toLocaleString('vi-VN')} đ tiền mặt)`,
            triggeredBy,
          },
        });
      }
    }

    return commissionTx;
  }
}
