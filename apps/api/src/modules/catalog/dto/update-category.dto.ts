import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePricingType } from '@linkkwork/shared-types';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Dọn dẹp vệ sinh cao cấp' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'don-dep-ve-sinh-cao-cap' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'sparkles' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({ example: 'Dịch vụ vệ sinh cao cấp theo tiêu chuẩn 5 sao' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ServicePricingType, example: ServicePricingType.HOURLY })
  @IsOptional()
  @IsEnum(ServicePricingType)
  defaultPricingType?: ServicePricingType;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultBasePrice?: number;

  @ApiPropertyOptional({ example: 'giờ' })
  @IsOptional()
  @IsString()
  defaultUnitLabel?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
