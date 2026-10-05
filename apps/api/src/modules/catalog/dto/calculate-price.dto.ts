import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePricingType, PricingCalculationInput } from '@linkkwork/shared-types';

export class CalculatePriceDto implements PricingCalculationInput {
  @ApiProperty({ enum: ServicePricingType, example: ServicePricingType.HOURLY })
  @IsEnum(ServicePricingType)
  pricingType!: ServicePricingType;

  @ApiPropertyOptional({ example: 2, description: 'Duration in hours (for HOURLY, default 2)' })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  durationHours?: number;

  @ApiPropertyOptional({ example: 1, description: 'Unit count (for PER_UNIT, default 1)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  unitCount?: number;

  @ApiProperty({ example: 80000, description: 'Base unit price' })
  @IsNumber()
  @Min(0)
  baseUnitPrice!: number;

  @ApiPropertyOptional({ example: 20000, description: 'Area surcharge' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSurcharge?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Addons price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  addonsPrice?: number;

  @ApiPropertyOptional({ example: 1.2, description: 'Surge multiplier (min 1.0)' })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  surgeMultiplier?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
