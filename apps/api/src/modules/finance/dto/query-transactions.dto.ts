import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethod, WalletTransactionType } from '@prisma/client';

export class QueryTransactionsDto {
  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm (mã GD, tên nguồn, tên đích, ghi chú, mã đơn)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: WalletTransactionType, description: 'Lọc theo loại giao dịch ví' })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Lọc theo phương thức thanh toán' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Tenant ID filter (Super Admin cross-tenant)' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Tasker ID filter' })
  @IsOptional()
  @IsString()
  taskerId?: string;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu lọc (ISO 8601 string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày kết thúc lọc (ISO 8601 string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng bản ghi mỗi trang', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class QueryFinancialSummaryDto {
  @ApiPropertyOptional({ description: 'Tenant ID filter (Super Admin cross-tenant)' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
