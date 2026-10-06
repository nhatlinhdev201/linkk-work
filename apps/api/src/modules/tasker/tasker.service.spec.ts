import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TaskerService } from './tasker.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserRole, WalletTransactionType, WalletTransactionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  CreateTaskerDto,
  UpdateTaskerDto,
  UpdateWorkFloorDto,
  AdjustDepositDto,
  UpdateKycDto,
} from './dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('TaskerService', () => {
  let service: TaskerService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    taskerProfile: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    walletTransaction: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockTenantId = 'tenant-clean-house';
  const otherTenantId = 'tenant-other-corp';

  const mockUserTasker = {
    id: 'user-tasker-1',
    tenantId: mockTenantId,
    email: 'tho.nguyen@example.com',
    phone: '0901234567',
    name: 'Nguyễn Văn Thợ',
    role: UserRole.TASKER,
    status: 'ACTIVE',
    passwordHash: 'hashed_password',
    createdAt: new Date(),
    updatedAt: new Date(),
    taskerProfile: {
      id: 'profile-1',
      userId: 'user-tasker-1',
      tenantId: mockTenantId,
      rating: 5.0,
      completedJobsCount: 0,
      isOnline: false,
      currentLat: null,
      currentLng: null,
      skills: ['ve-sinh-nha-cua'],
      idCardNumber: '001200000001',
      kycVerified: false,
      maxDistanceKm: 15,
      autoRadarEnabled: true,
      currentStatus: 'IDLE',
      depositBalance: 500000,
      walletBalance: 0,
      salaryType: 'COMMISSION',
      bankName: 'Vietcombank',
      bankAccountNumber: '1012345678',
      bankAccountHolder: 'NGUYEN VAN THO',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    tenant: {
      id: mockTenantId,
      name: 'Clean House Corp',
      code: 'clean-house',
    },
    walletTransactions: [],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      taskerProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        return callback(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskerService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<TaskerService>(TaskerService);
  });

  describe('createTasker', () => {
    const dto: CreateTaskerDto = {
      name: 'Nguyễn Văn Thợ',
      phone: '0901234567',
      email: 'tho.nguyen@example.com',
      password: 'CustomPassword123',
      tenantId: mockTenantId,
      idCardNumber: '001200000001',
      skills: ['ve-sinh-nha-cua'],
      depositBalance: 500000,
      maxDistanceKm: 15,
      autoRadarEnabled: true,
      bankName: 'Vietcombank',
      bankAccountNumber: '1012345678',
      bankAccountHolder: 'NGUYEN VAN THO',
    };

    it('should throw ForbiddenException when no tenant context is provided for non-superadmin', async () => {
      await expect(
        service.createTasker(dto, null, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user with email or phone already exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-id', email: dto.email });

      await expect(
        service.createTasker(dto, mockTenantId, false),
      ).rejects.toThrow(ConflictException);
    });

    it('should create tasker user, profile, and initial deposit transaction successfully', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 'user-tasker-1' });
      prisma.taskerProfile.create.mockResolvedValueOnce({
        id: 'profile-1',
        userId: 'user-tasker-1',
        depositBalance: 500000,
      });
      prisma.walletTransaction.create.mockResolvedValueOnce({
        id: 'tx-1',
        amount: 500000,
      });
      prisma.user.findUnique.mockResolvedValueOnce(mockUserTasker);

      const result = await service.createTasker(dto, mockTenantId, false);

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: dto.email }, { phone: dto.phone }],
        },
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            phone: dto.phone,
            name: dto.name,
            role: UserRole.TASKER,
            tenantId: mockTenantId,
          }),
        }),
      );

      expect(prisma.taskerProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-tasker-1',
            tenantId: mockTenantId,
            depositBalance: 500000,
          }),
        }),
      );

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskerId: 'user-tasker-1',
            tenantId: mockTenantId,
            type: WalletTransactionType.TOP_UP_DEPOSIT,
            amount: 500000,
            direction: 'IN',
            balanceBefore: 0,
            balanceAfter: 500000,
            status: WalletTransactionStatus.COMPLETED,
          }),
        }),
      );

      expect(result).toEqual(mockUserTasker);
    });

    it('should allow Super Admin to create tasker with default tenant if none specified', async () => {
      const dtoNoTenant = { ...dto, tenantId: undefined };
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 'user-tasker-1' });
      prisma.taskerProfile.create.mockResolvedValueOnce({ id: 'profile-1' });
      prisma.walletTransaction.create.mockResolvedValueOnce({ id: 'tx-1' });
      prisma.user.findUnique.mockResolvedValueOnce(mockUserTasker);

      await service.createTasker(dtoNoTenant, null, true);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-linkkwork',
          }),
        }),
      );
    });

    it('should NOT create WalletTransaction if initial depositBalance is 0', async () => {
      const dtoZeroDeposit = { ...dto, depositBalance: 0 };
      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce({ id: 'user-tasker-1' });
      prisma.taskerProfile.create.mockResolvedValueOnce({ id: 'profile-1' });
      prisma.user.findUnique.mockResolvedValueOnce(mockUserTasker);

      await service.createTasker(dtoZeroDeposit, mockTenantId, false);

      expect(prisma.walletTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('getTaskers', () => {
    it('should enforce tenant isolation for non-superadmin', async () => {
      prisma.user.count.mockResolvedValueOnce(1);
      prisma.user.findMany.mockResolvedValueOnce([mockUserTasker]);

      const result = await service.getTaskers({}, mockTenantId, false);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            role: UserRole.TASKER,
          }),
        }),
      );
      expect(result.total).toBe(1);
      expect(result.taskers).toHaveLength(1);
    });

    it('should throw ForbiddenException if non-superadmin has no tenant context', async () => {
      await expect(service.getTaskers({}, null, false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow Super Admin to query across all tenants or filter by specific tenant', async () => {
      prisma.user.count.mockResolvedValueOnce(1);
      prisma.user.findMany.mockResolvedValueOnce([mockUserTasker]);

      await service.getTaskers({ tenantId: otherTenantId }, null, true);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: otherTenantId,
            role: UserRole.TASKER,
          }),
        }),
      );
    });

    it('should filter by search query for name or phone', async () => {
      prisma.user.count.mockResolvedValueOnce(1);
      prisma.user.findMany.mockResolvedValueOnce([mockUserTasker]);

      await service.getTaskers({ search: 'Thợ' }, mockTenantId, false);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            role: UserRole.TASKER,
            OR: [
              { name: { contains: 'Thợ', mode: 'insensitive' } },
              { phone: { contains: 'Thợ', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by lowDepositOnly (< 100,000 VND)', async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.findMany.mockResolvedValueOnce([]);

      await service.getTaskers({ lowDepositOnly: true }, mockTenantId, false);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            taskerProfile: expect.objectContaining({
              depositBalance: { lt: 100000 },
            }),
          }),
        }),
      );
    });
  });

  describe('getTaskerById', () => {
    it('should return tasker with profile, tenant and 10 recent transactions', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);

      const result = await service.getTaskerById('user-tasker-1', mockTenantId, false);

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ id: 'user-tasker-1' }, { taskerProfile: { id: 'user-tasker-1' } }],
            role: UserRole.TASKER,
          },
          include: expect.objectContaining({
            taskerProfile: true,
            tenant: true,
            walletTransactions: {
              take: 10,
              orderBy: { createdAt: 'desc' },
            },
          }),
        }),
      );
      expect(result).toEqual(mockUserTasker);
    });

    it('should throw NotFoundException if tasker not found', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getTaskerById('non-existent', mockTenantId, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if tasker belongs to another tenant for non-superadmin', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      await expect(
        service.getTaskerById('user-tasker-1', mockTenantId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow Super Admin to access tasker from any tenant', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      const result = await service.getTaskerById('user-tasker-1', null, true);
      expect(result.tenantId).toBe(otherTenantId);
    });
  });

  describe('updateTasker', () => {
    const updateDto: UpdateTaskerDto = {
      name: 'Nguyễn Văn Thợ Updated',
      skills: ['ve-sinh-sofa'],
      bankName: 'Techcombank',
    };

    it('should update tasker user and taskerProfile', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.user.update.mockResolvedValueOnce({ id: 'user-tasker-1' });
      prisma.taskerProfile.update.mockResolvedValueOnce({ id: 'profile-1' });
      prisma.user.findUnique.mockResolvedValueOnce({
        ...mockUserTasker,
        name: updateDto.name,
      });

      const result = await service.updateTasker('user-tasker-1', updateDto, mockTenantId, false);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-tasker-1' },
        data: { name: updateDto.name },
      });

      expect(prisma.taskerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-tasker-1' },
        data: {
          skills: updateDto.skills,
          bankName: updateDto.bankName,
        },
      });

      expect(result.name).toBe(updateDto.name);
    });

    it('should throw ForbiddenException if non-superadmin updates tasker in another tenant', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      await expect(
        service.updateTasker('user-tasker-1', updateDto, mockTenantId, false),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateWorkFloor', () => {
    const workFloorDto: UpdateWorkFloorDto = {
      maxDistanceKm: 25,
      autoRadarEnabled: false,
      isOnline: true,
      currentLat: 21.0285,
      currentLng: 105.8544,
    };

    it('should update tasker work floor configuration', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.update.mockResolvedValueOnce({
        ...mockUserTasker.taskerProfile,
        ...workFloorDto,
      });

      const result = await service.updateWorkFloor(
        'user-tasker-1',
        workFloorDto,
        mockTenantId,
        false,
      );

      expect(prisma.taskerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-tasker-1' },
        data: workFloorDto,
      });
      expect(result.maxDistanceKm).toBe(25);
    });
  });

  describe('toggleOnlineStatus', () => {
    it('should flip tasker isOnline from false to true', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.update.mockResolvedValueOnce({
        ...mockUserTasker.taskerProfile,
        isOnline: true,
      });

      const result = await service.toggleOnlineStatus('user-tasker-1', mockTenantId, false);

      expect(prisma.taskerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-tasker-1' },
        data: { isOnline: true },
      });
      expect(result.isOnline).toBe(true);
    });
  });

  describe('adjustDeposit', () => {
    const topUpDto: AdjustDepositDto = {
      amount: 200000,
      notes: 'Nạp thêm tiền bảo lãnh',
    };

    const withdrawDto: AdjustDepositDto = {
      amount: -100000,
      notes: 'Khấu trừ vi phạm nội quy',
    };

    it('should adjust deposit balance and create TOP_UP_DEPOSIT transaction for positive amount', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.findUnique.mockResolvedValueOnce(mockUserTasker.taskerProfile);
      prisma.taskerProfile.update.mockResolvedValueOnce({
        ...mockUserTasker.taskerProfile,
        depositBalance: 700000,
      });
      const createdTx = {
        id: 'tx-2',
        code: 'TX-12345',
        type: WalletTransactionType.TOP_UP_DEPOSIT,
        amount: 200000,
        direction: 'IN',
        balanceBefore: 500000,
        balanceAfter: 700000,
        notes: topUpDto.notes,
        triggeredBy: 'ADMIN_01',
      };
      prisma.walletTransaction.create.mockResolvedValueOnce(createdTx);

      const result = await service.adjustDeposit(
        'user-tasker-1',
        topUpDto,
        mockTenantId,
        false,
        'ADMIN_01',
      );

      expect(prisma.taskerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-tasker-1' },
        data: { depositBalance: 700000 },
      });

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            taskerId: 'user-tasker-1',
            tenantId: mockTenantId,
            type: WalletTransactionType.TOP_UP_DEPOSIT,
            amount: 200000,
            direction: 'IN',
            balanceBefore: 500000,
            balanceAfter: 700000,
            notes: topUpDto.notes,
            triggeredBy: 'ADMIN_01',
          }),
        }),
      );

      expect(result.taskerProfile.depositBalance).toBe(700000);
      expect(result.transaction).toEqual(createdTx);
    });

    it('should adjust deposit balance and create WITHDRAW_DEPOSIT transaction for negative amount', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.findUnique.mockResolvedValueOnce(mockUserTasker.taskerProfile);
      prisma.taskerProfile.update.mockResolvedValueOnce({
        ...mockUserTasker.taskerProfile,
        depositBalance: 400000,
      });
      prisma.walletTransaction.create.mockResolvedValueOnce({
        id: 'tx-3',
        type: WalletTransactionType.WITHDRAW_DEPOSIT,
        amount: 100000,
        direction: 'OUT',
        balanceBefore: 500000,
        balanceAfter: 400000,
      });

      const result = await service.adjustDeposit(
        'user-tasker-1',
        withdrawDto,
        mockTenantId,
        false,
        'ADMIN_01',
      );

      expect(prisma.walletTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: WalletTransactionType.WITHDRAW_DEPOSIT,
            amount: 100000,
            direction: 'OUT',
            balanceBefore: 500000,
            balanceAfter: 400000,
          }),
        }),
      );

      expect(result.taskerProfile.depositBalance).toBe(400000);
    });

    it('should throw BadRequestException if new deposit balance would become negative', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.findUnique.mockResolvedValueOnce({
        ...mockUserTasker.taskerProfile,
        depositBalance: 50000,
      });

      await expect(
        service.adjustDeposit(
          'user-tasker-1',
          { amount: -100000, notes: 'Quá số dư' },
          mockTenantId,
          false,
          'ADMIN_01',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if adjust amount is zero', async () => {
      await expect(
        service.adjustDeposit(
          'user-tasker-1',
          { amount: 0, notes: 'Không đổi' },
          mockTenantId,
          false,
          'ADMIN_01',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateKyc', () => {
    const kycDto: UpdateKycDto = {
      kycVerified: true,
      idCardNumber: '001200009999',
      notes: 'Đã xác minh qua VNeID',
    };

    it('should update tasker KYC verification status and idCardNumber', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.update.mockResolvedValueOnce({
        ...mockUserTasker.taskerProfile,
        kycVerified: true,
        idCardNumber: '001200009999',
      });

      const result = await service.updateKyc('user-tasker-1', kycDto, mockTenantId, false);

      expect(prisma.taskerProfile.update).toHaveBeenCalledWith({
        where: { userId: 'user-tasker-1' },
        data: {
          kycVerified: true,
          idCardNumber: '001200009999',
        },
      });
      expect(result.kycVerified).toBe(true);
    });
  });

  describe('getTaskerTransactions', () => {
    it('should return wallet transactions for tasker ordered by createdAt desc', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 500000, createdAt: new Date() },
        { id: 'tx-2', amount: 200000, createdAt: new Date() },
      ];

      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.walletTransaction.findMany.mockResolvedValueOnce(mockTransactions);

      const result = await service.getTaskerTransactions('user-tasker-1', mockTenantId, false);

      expect(prisma.walletTransaction.findMany).toHaveBeenCalledWith({
        where: {
          taskerId: 'user-tasker-1',
          tenantId: mockTenantId,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should throw ForbiddenException if user belongs to another tenant for non-superadmin', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      await expect(
        service.getTaskerTransactions('user-tasker-1', mockTenantId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if tasker not found', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getTaskerTransactions('non-existent', mockTenantId, false),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases in updateWorkFloor, toggleOnlineStatus, adjustDeposit and updateKyc', () => {
    it('should throw NotFoundException in updateWorkFloor if tasker does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.updateWorkFloor('non-existent', { isOnline: true }, mockTenantId, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException in updateWorkFloor if tenant does not match', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      await expect(
        service.updateWorkFloor('user-tasker-1', { isOnline: true }, mockTenantId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException in toggleOnlineStatus if tasker does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.toggleOnlineStatus('non-existent', mockTenantId, false),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException in toggleOnlineStatus if tenant does not match', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      await expect(
        service.toggleOnlineStatus('user-tasker-1', mockTenantId, false),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException in adjustDeposit if profile does not exist', async () => {
      prisma.user.findFirst.mockResolvedValueOnce(mockUserTasker);
      prisma.taskerProfile.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.adjustDeposit(
          'user-tasker-1',
          { amount: 50000, notes: 'Test' },
          mockTenantId,
          false,
          'ADMIN_01',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException in updateKyc if tenant does not match', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...mockUserTasker,
        tenantId: otherTenantId,
      });

      await expect(
        service.updateKyc(
          'user-tasker-1',
          { kycVerified: true },
          mockTenantId,
          false,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DTO Validations', () => {
    describe('CreateTaskerDto', () => {
      it('should validate valid CreateTaskerDto', async () => {
        const dto = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '0901234567',
          email: 'tho@example.com',
          password: 'Password123',
          depositBalance: 500000,
          maxDistanceKm: 15,
          autoRadarEnabled: true,
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should validate Vietnam phone format with +84', async () => {
        const dto = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '+84987654321',
          email: 'tho@example.com',
        });

        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should reject invalid phone format', async () => {
        const dto = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '123456',
          email: 'tho@example.com',
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'phone')).toBe(true);
      });

      it('should reject invalid email', async () => {
        const dto = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '0901234567',
          email: 'invalid-email',
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'email')).toBe(true);
      });

      it('should reject negative depositBalance', async () => {
        const dto = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '0901234567',
          email: 'tho@example.com',
          depositBalance: -100,
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'depositBalance')).toBe(true);
      });

      it('should reject maxDistanceKm out of range', async () => {
        const dtoTooHigh = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '0901234567',
          email: 'tho@example.com',
          maxDistanceKm: 150,
        });

        const errorsTooHigh = await validate(dtoTooHigh);
        expect(errorsTooHigh.some((e) => e.property === 'maxDistanceKm')).toBe(true);

        const dtoTooLow = plainToInstance(CreateTaskerDto, {
          name: 'Nguyễn Văn Thợ',
          phone: '0901234567',
          email: 'tho@example.com',
          maxDistanceKm: 0,
        });

        const errorsTooLow = await validate(dtoTooLow);
        expect(errorsTooLow.some((e) => e.property === 'maxDistanceKm')).toBe(true);
      });
    });

    describe('AdjustDepositDto', () => {
      it('should reject amount equal to 0', async () => {
        const dto = plainToInstance(AdjustDepositDto, {
          amount: 0,
          notes: 'Nạp thử',
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'amount')).toBe(true);
      });

      it('should reject empty notes', async () => {
        const dto = plainToInstance(AdjustDepositDto, {
          amount: 100000,
          notes: '',
        });

        const errors = await validate(dto);
        expect(errors.some((e) => e.property === 'notes')).toBe(true);
      });

      it('should accept valid positive and negative amounts', async () => {
        const posDto = plainToInstance(AdjustDepositDto, {
          amount: 200000,
          notes: 'Nạp ký quỹ',
        });
        const posErrors = await validate(posDto);
        expect(posErrors).toHaveLength(0);

        const negDto = plainToInstance(AdjustDepositDto, {
          amount: -150000,
          notes: 'Rút ký quỹ',
        });
        const negErrors = await validate(negDto);
        expect(negErrors).toHaveLength(0);
      });
    });

    describe('UpdateWorkFloorDto', () => {
      it('should reject maxDistanceKm less than 1 or greater than 100', async () => {
        const invalidLow = plainToInstance(UpdateWorkFloorDto, {
          maxDistanceKm: 0,
        });
        const lowErrors = await validate(invalidLow);
        expect(lowErrors.some((e) => e.property === 'maxDistanceKm')).toBe(true);

        const invalidHigh = plainToInstance(UpdateWorkFloorDto, {
          maxDistanceKm: 101,
        });
        const highErrors = await validate(invalidHigh);
        expect(highErrors.some((e) => e.property === 'maxDistanceKm')).toBe(true);
      });
    });

    describe('UpdateKycDto', () => {
      it('should validate kycVerified boolean requirement', async () => {
        const validDto = plainToInstance(UpdateKycDto, {
          kycVerified: true,
          idCardNumber: '001200000001',
        });
        const errors = await validate(validDto);
        expect(errors).toHaveLength(0);

        const invalidDto = plainToInstance(UpdateKycDto, {
          kycVerified: 'not-a-bool',
        });
        const invalidErrors = await validate(invalidDto);
        expect(invalidErrors.some((e) => e.property === 'kycVerified')).toBe(true);
      });
    });
  });
});
