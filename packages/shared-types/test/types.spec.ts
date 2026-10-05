import {
  BookingStatus,
  TenantSubscriptionStatus,
  UserRole,
  ServicePricingType,
  PaymentStatus,
  PricingCalculationInput,
  PricingCalculationResult,
  ClaimJobInput,
  ClaimJobResult,
  LoginDto,
  RegisterPartnerDto,
  JwtPayload,
} from '../src';

describe('Shared Domain Types & State Machines', () => {
  describe('Domain Enums', () => {
    describe('BookingStatus', () => {
      it('should define all 13 lifecycle states from the booking state machine', () => {
        expect(BookingStatus.DRAFT).toBe('DRAFT');
        expect(BookingStatus.PENDING_DISPATCH).toBe('PENDING_DISPATCH');
        expect(BookingStatus.OFFERED_TO_FAVORITE).toBe('OFFERED_TO_FAVORITE');
        expect(BookingStatus.BROADCASTING).toBe('BROADCASTING');
        expect(BookingStatus.ASSIGNED).toBe('ASSIGNED');
        expect(BookingStatus.ARRIVING).toBe('ARRIVING');
        expect(BookingStatus.IN_PROGRESS).toBe('IN_PROGRESS');
        expect(BookingStatus.PENDING_ACCEPTANCE).toBe('PENDING_ACCEPTANCE');
        expect(BookingStatus.COMPLETED).toBe('COMPLETED');
        expect(BookingStatus.REVIEWED).toBe('REVIEWED');
        expect(BookingStatus.CANCELLED).toBe('CANCELLED');
        expect(BookingStatus.EMERGENCY_REDISPATCH).toBe('EMERGENCY_REDISPATCH');
        expect(BookingStatus.DISPATCH_FAILED).toBe('DISPATCH_FAILED');

        const states = Object.values(BookingStatus);
        expect(states).toHaveLength(13);
        expect(states).toEqual(
          expect.arrayContaining([
            'DRAFT',
            'PENDING_DISPATCH',
            'OFFERED_TO_FAVORITE',
            'BROADCASTING',
            'ASSIGNED',
            'ARRIVING',
            'IN_PROGRESS',
            'PENDING_ACCEPTANCE',
            'COMPLETED',
            'REVIEWED',
            'CANCELLED',
            'EMERGENCY_REDISPATCH',
            'DISPATCH_FAILED',
          ]),
        );
      });
    });

    describe('TenantSubscriptionStatus', () => {
      it('should define all 5 subscription lifecycle statuses', () => {
        expect(TenantSubscriptionStatus.ACTIVE).toBe('ACTIVE');
        expect(TenantSubscriptionStatus.PAST_DUE).toBe('PAST_DUE');
        expect(TenantSubscriptionStatus.RESTRICTED).toBe('RESTRICTED');
        expect(TenantSubscriptionStatus.SUSPENDED).toBe('SUSPENDED');
        expect(TenantSubscriptionStatus.CANCELLED).toBe('CANCELLED');

        const statuses = Object.values(TenantSubscriptionStatus);
        expect(statuses).toHaveLength(5);
        expect(statuses).toEqual(
          expect.arrayContaining(['ACTIVE', 'PAST_DUE', 'RESTRICTED', 'SUSPENDED', 'CANCELLED']),
        );
      });
    });

    describe('UserRole', () => {
      it('should define all 5 multi-tenant user roles', () => {
        expect(UserRole.SUPER_ADMIN).toBe('SUPER_ADMIN');
        expect(UserRole.TENANT_ADMIN).toBe('TENANT_ADMIN');
        expect(UserRole.TENANT_DISPATCHER).toBe('TENANT_DISPATCHER');
        expect(UserRole.TASKER).toBe('TASKER');
        expect(UserRole.CUSTOMER).toBe('CUSTOMER');

        const roles = Object.values(UserRole);
        expect(roles).toHaveLength(5);
        expect(roles).toEqual(
          expect.arrayContaining([
            'SUPER_ADMIN',
            'TENANT_ADMIN',
            'TENANT_DISPATCHER',
            'TASKER',
            'CUSTOMER',
          ]),
        );
      });
    });

    describe('ServicePricingType', () => {
      it('should define all 3 service pricing models', () => {
        expect(ServicePricingType.HOURLY).toBe('HOURLY');
        expect(ServicePricingType.PER_UNIT).toBe('PER_UNIT');
        expect(ServicePricingType.BIDDING).toBe('BIDDING');

        const pricingTypes = Object.values(ServicePricingType);
        expect(pricingTypes).toHaveLength(3);
        expect(pricingTypes).toEqual(expect.arrayContaining(['HOURLY', 'PER_UNIT', 'BIDDING']));
      });
    });

    describe('PaymentStatus', () => {
      it('should define all 5 escrow & payment statuses', () => {
        expect(PaymentStatus.PENDING).toBe('PENDING');
        expect(PaymentStatus.ESCROW_HOLD).toBe('ESCROW_HOLD');
        expect(PaymentStatus.RELEASED_TO_TASKER).toBe('RELEASED_TO_TASKER');
        expect(PaymentStatus.REFUNDED).toBe('REFUNDED');
        expect(PaymentStatus.DISPUTED).toBe('DISPUTED');

        const paymentStatuses = Object.values(PaymentStatus);
        expect(paymentStatuses).toHaveLength(5);
        expect(paymentStatuses).toEqual(
          expect.arrayContaining([
            'PENDING',
            'ESCROW_HOLD',
            'RELEASED_TO_TASKER',
            'REFUNDED',
            'DISPUTED',
          ]),
        );
      });
    });
  });

  describe('Interfaces & DTOs Typing', () => {
    it('should correctly type PricingCalculationInput and PricingCalculationResult', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        durationHours: 3,
        unitCount: 1,
        baseUnitPrice: 80000,
        areaSurcharge: 20000,
        addonsPrice: 30000,
        surgeMultiplier: 1.2,
        discountAmount: 10000,
      };

      const result: PricingCalculationResult = {
        baseTotal: 240000,
        subtotal: 290000,
        surgeMultiplier: 1.2,
        surgeAmount: 58000,
        discountAmount: 10000,
        finalTotal: 338000,
      };

      expect(input.pricingType).toBe(ServicePricingType.HOURLY);
      expect(input.durationHours).toBe(3);
      expect(input.baseUnitPrice).toBe(80000);
      expect(result.finalTotal).toBe(338000);
    });

    it('should correctly type ClaimJobInput and ClaimJobResult', () => {
      const claimInput: ClaimJobInput = {
        bookingId: 'bk_test_123',
        taskerId: 'tsk_test_456',
        tenantId: 'tnt_test_789',
        lockExpiryMs: 10000,
      };

      const claimSuccessResult: ClaimJobResult = {
        success: true,
        code: 'CLAIMED',
        bookingId: 'bk_test_123',
        taskerId: 'tsk_test_456',
        claimedAt: new Date('2026-10-05T12:00:00Z'),
        message: 'Successfully claimed job',
      };

      const claimFailedResult: ClaimJobResult = {
        success: false,
        code: 'ALREADY_TAKEN',
        bookingId: 'bk_test_123',
        message: 'Job was already claimed by another tasker',
      };

      expect(claimInput.bookingId).toBe('bk_test_123');
      expect(claimSuccessResult.code).toBe('CLAIMED');
      expect(claimFailedResult.code).toBe('ALREADY_TAKEN');
    });

    it('should correctly type LoginDto, RegisterPartnerDto, and JwtPayload', () => {
      const loginDto: LoginDto = {
        email: 'admin@linkkwork.vn',
        password: 'securePassword123',
        role: UserRole.SUPER_ADMIN,
        tenantId: 'tnt_linkkwork',
      };

      const partnerDto: RegisterPartnerDto = {
        businessName: 'Công ty TNHH Vệ Sinh Hoàn Mỹ',
        taxId: '0101234567',
        contactName: 'Nguyễn Văn A',
        contactPhone: '0912345678',
        contactEmail: 'contact@hoanmy.vn',
        city: 'Hà Nội',
        services: ['Dọn dẹp nhà theo giờ', 'Vệ sinh máy lạnh'],
        address: '123 Phố Huế, Hai Bà Trưng, Hà Nội',
        businessLicenseUrl: 'https://storage.linkkwork.vn/licenses/lic_001.pdf',
      };

      const jwtPayload: JwtPayload = {
        sub: 'usr_abc123',
        email: 'admin@linkkwork.vn',
        role: UserRole.SUPER_ADMIN,
        tenantId: 'tnt_linkkwork',
        isSuperAdmin: true,
        iat: 1760000000,
        exp: 1760086400,
      };

      expect(loginDto.email).toBe('admin@linkkwork.vn');
      expect(partnerDto.services).toContain('Dọn dẹp nhà theo giờ');
      expect(jwtPayload.role).toBe(UserRole.SUPER_ADMIN);
      expect(jwtPayload.isSuperAdmin).toBe(true);
    });
  });
});
