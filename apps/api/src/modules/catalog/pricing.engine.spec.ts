import { BadRequestException } from '@nestjs/common';
import { PricingEngine } from './pricing.engine';
import { ServicePricingType, PricingCalculationInput } from '@linkkwork/shared-types';

describe('PricingEngine', () => {
  let engine: PricingEngine;

  beforeEach(() => {
    engine = new PricingEngine();
  });

  describe('HOURLY pricing calculation', () => {
    it('should calculate baseTotal with custom durationHours', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 80000,
        durationHours: 3,
      };

      const result = engine.calculate(input);

      expect(result.baseTotal).toBe(240000);
      expect(result.subtotal).toBe(240000);
      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.surgeAmount).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.finalTotal).toBe(240000);
    });

    it('should default durationHours to 2 when omitted', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 80000,
      };

      const result = engine.calculate(input);

      expect(result.baseTotal).toBe(160000); // 2 * 80,000
      expect(result.finalTotal).toBe(160000);
    });

    it('should throw BadRequestException if durationHours is <= 0', () => {
      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 80000,
          durationHours: 0,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 80000,
          durationHours: -1,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('PER_UNIT pricing calculation', () => {
    it('should calculate baseTotal with unitCount', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.PER_UNIT,
        baseUnitPrice: 150000,
        unitCount: 4,
      };

      const result = engine.calculate(input);

      expect(result.baseTotal).toBe(600000);
      expect(result.subtotal).toBe(600000);
      expect(result.finalTotal).toBe(600000);
    });

    it('should default unitCount to 1 when omitted', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.PER_UNIT,
        baseUnitPrice: 150000,
      };

      const result = engine.calculate(input);

      expect(result.baseTotal).toBe(150000);
      expect(result.finalTotal).toBe(150000);
    });

    it('should throw BadRequestException if unitCount is <= 0', () => {
      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.PER_UNIT,
          baseUnitPrice: 150000,
          unitCount: 0,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.PER_UNIT,
          baseUnitPrice: 150000,
          unitCount: -2,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('BIDDING pricing calculation', () => {
    it('should set baseTotal equal to baseUnitPrice', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.BIDDING,
        baseUnitPrice: 500000,
      };

      const result = engine.calculate(input);

      expect(result.baseTotal).toBe(500000);
      expect(result.subtotal).toBe(500000);
      expect(result.finalTotal).toBe(500000);
    });
  });

  describe('Area surcharge and Addons', () => {
    it('should correctly include area surcharge and addonsPrice in subtotal', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2, // baseTotal = 200,000
        areaSurcharge: 30000,
        addonsPrice: 50000,
      };

      const result = engine.calculate(input);

      expect(result.baseTotal).toBe(200000);
      expect(result.subtotal).toBe(280000); // 200,000 + 30,000 + 50,000
      expect(result.finalTotal).toBe(280000);
    });
  });

  describe('Surge pricing', () => {
    it('should calculate surge pricing when surgeMultiplier > 1.0', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2, // baseTotal = 200,000
        surgeMultiplier: 1.5,
      };

      const result = engine.calculate(input);

      expect(result.subtotal).toBe(200000);
      expect(result.surgeMultiplier).toBe(1.5);
      expect(result.surgeAmount).toBe(100000); // Math.round(200,000 * 0.5)
      expect(result.finalTotal).toBe(300000); // 200,000 + 100,000
    });

    it('should clamp surgeMultiplier to a minimum of 1.0', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2,
        surgeMultiplier: 0.8, // lower than 1.0
      };

      const result = engine.calculate(input);

      expect(result.surgeMultiplier).toBe(1.0);
      expect(result.surgeAmount).toBe(0);
      expect(result.finalTotal).toBe(200000);
    });
  });

  describe('Discount bounding', () => {
    it('should apply discount bounded by preDiscountTotal', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2, // baseTotal = 200,000
        discountAmount: 50000,
      };

      const result = engine.calculate(input);

      expect(result.subtotal).toBe(200000);
      expect(result.discountAmount).toBe(50000);
      expect(result.finalTotal).toBe(150000);
    });

    it('should bound discount to not exceed preDiscountTotal (prevent negative total)', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2, // baseTotal = 200,000
        discountAmount: 300000, // exceeds preDiscountTotal
      };

      const result = engine.calculate(input);

      expect(result.discountAmount).toBe(200000);
      expect(result.finalTotal).toBe(0);
    });

    it('should combine surge and discount correctly', () => {
      const input: PricingCalculationInput = {
        pricingType: ServicePricingType.HOURLY,
        baseUnitPrice: 100000,
        durationHours: 2, // baseTotal = 200,000
        areaSurcharge: 20000, // subtotal = 220,000
        surgeMultiplier: 1.2, // surgeAmount = 220,000 * 0.2 = 44,000 -> preDiscount = 264,000
        discountAmount: 50000,
      };

      const result = engine.calculate(input);

      expect(result.subtotal).toBe(220000);
      expect(result.surgeMultiplier).toBe(1.2);
      expect(result.surgeAmount).toBe(44000);
      expect(result.discountAmount).toBe(50000);
      expect(result.finalTotal).toBe(214000);
    });
  });

  describe('Invalid inputs', () => {
    it('should throw BadRequestException if baseUnitPrice is negative', () => {
      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: -100,
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for unknown pricingType', () => {
      expect(() =>
        engine.calculate({
          pricingType: 'UNKNOWN' as unknown as ServicePricingType,
          baseUnitPrice: 100000,
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if areaSurcharge is negative', () => {
      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 100000,
          areaSurcharge: -5000,
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if addonsPrice is negative', () => {
      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 100000,
          addonsPrice: -5000,
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if discountAmount is negative', () => {
      expect(() =>
        engine.calculate({
          pricingType: ServicePricingType.HOURLY,
          baseUnitPrice: 100000,
          discountAmount: -5000,
        }),
      ).toThrow(BadRequestException);
    });
  });
});
