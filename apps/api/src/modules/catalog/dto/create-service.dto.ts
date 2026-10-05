import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePricingType } from '@linkkwork/shared-types';

export class CreateServiceDto {
  @ApiProperty({ example: 'Dọn dẹp nhà theo giờ' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'don-dep-nha-theo-gio' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ example: '33ff9d04-1150-4403-84f9-cabe982d55f4' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({ enum: ServicePricingType, example: ServicePricingType.HOURLY })
  @IsEnum(ServicePricingType)
  pricingType!: ServicePricingType;

  @ApiProperty({ example: 80000 })
  @IsNumber()
  @Min(0)
  baseUnitPrice!: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  durationHours?: number;

  @ApiPropertyOptional({ example: 'Dịch vụ dọn dẹp vệ sinh nhà ở chuyên nghiệp' })
  @IsOptional()
  @IsString()
  description?: string;
}
