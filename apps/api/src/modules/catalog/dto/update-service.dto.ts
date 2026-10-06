import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePricingType } from '@linkkwork/shared-types';

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Dọn dẹp nhà chuyên sâu' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'don-dep-nha-chuyen-sau' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: '33ff9d04-1150-4403-84f9-cabe982d55f4' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ServicePricingType, example: ServicePricingType.HOURLY })
  @IsOptional()
  @IsEnum(ServicePricingType)
  pricingType?: ServicePricingType;

  @ApiPropertyOptional({ example: 95000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseUnitPrice?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  durationHours?: number;

  @ApiPropertyOptional({ example: 'giờ' })
  @IsOptional()
  @IsString()
  unitLabel?: string;

  @ApiPropertyOptional({ example: 2.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  minHours?: number;

  @ApiPropertyOptional({ example: 'Dịch vụ dọn dẹp vệ sinh nhà ở chuyên sâu kèm khử khuẩn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
