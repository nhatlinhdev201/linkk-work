import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ServicePricingType,
  PricingCalculationInput,
  PricingCalculationResult,
} from '@linkkwork/shared-types';

@Injectable()
export class PricingEngine {
  /**
   * Calculates dynamic pricing for marketplace services based on pricing model,
   * duration/units, add-ons, area surcharge, surge pricing, and discounts.
   */
  calculate(input: PricingCalculationInput): PricingCalculationResult {
    const {
      pricingType,
      baseUnitPrice,
      durationHours,
      unitCount,
      areaSurcharge = 0,
      addonsPrice = 0,
      surgeMultiplier: rawSurgeMultiplier,
      discountAmount: rawDiscountAmount,
    } = input;

    if (baseUnitPrice === undefined || baseUnitPrice === null || isNaN(baseUnitPrice) || baseUnitPrice < 0) {
      throw new BadRequestException('Base unit price must be a non-negative number');
    }

    if (areaSurcharge < 0) {
      throw new BadRequestException('Area surcharge cannot be negative');
    }

    if (addonsPrice < 0) {
      throw new BadRequestException('Addons price cannot be negative');
    }

    if (rawDiscountAmount !== undefined && rawDiscountAmount !== null && rawDiscountAmount < 0) {
      throw new BadRequestException('Discount amount cannot be negative');
    }

    let baseTotal = 0;

    switch (pricingType) {
      case ServicePricingType.HOURLY: {
        const effectiveHours = durationHours ?? 2;
        if (isNaN(effectiveHours) || effectiveHours <= 0) {
          throw new BadRequestException('Duration hours must be greater than 0 for HOURLY pricing');
        }
        baseTotal = effectiveHours * baseUnitPrice;
        break;
      }

      case ServicePricingType.PER_UNIT: {
        const effectiveUnits = unitCount ?? 1;
        if (isNaN(effectiveUnits) || effectiveUnits <= 0) {
          throw new BadRequestException('Unit count must be greater than 0 for PER_UNIT pricing');
        }
        baseTotal = effectiveUnits * baseUnitPrice;
        break;
      }

      case ServicePricingType.BIDDING: {
        baseTotal = baseUnitPrice;
        break;
      }

      default:
        throw new BadRequestException(`Unsupported pricing type: ${pricingType}`);
    }

    // Subtotal: baseTotal + area surcharge + addons
    const subtotal = baseTotal + areaSurcharge + addonsPrice;

    // Surge pricing: minimum multiplier is 1.0 (no surge)
    const surgeMultiplier = Math.max(rawSurgeMultiplier ?? 1.0, 1.0);
    const surgeAmount = Math.round(subtotal * (surgeMultiplier - 1.0));

    // Pre-discount total
    const preDiscountTotal = subtotal + surgeAmount;

    // Discount: bounded by [0, preDiscountTotal]
    const discountAmount = Math.min(rawDiscountAmount ?? 0, preDiscountTotal);

    // Final total
    const finalTotal = preDiscountTotal - discountAmount;

    return {
      baseTotal,
      subtotal,
      surgeMultiplier,
      surgeAmount,
      discountAmount,
      finalTotal,
    };
  }
}
