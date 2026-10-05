import { ServicePricingType } from '../enums/service-pricing-type.enum';

export interface PricingCalculationInput {
  pricingType: ServicePricingType;
  durationHours?: number;
  unitCount?: number;
  baseUnitPrice: number;
  areaSurcharge?: number;
  addonsPrice?: number;
  surgeMultiplier?: number;
  discountAmount?: number;
}

export interface PricingCalculationResult {
  baseTotal: number;
  subtotal: number;
  surgeMultiplier: number;
  surgeAmount: number;
  discountAmount: number;
  finalTotal: number;
}
