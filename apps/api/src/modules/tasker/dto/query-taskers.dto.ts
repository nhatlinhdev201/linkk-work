import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryTaskersDto {
  @ApiPropertyOptional({ description: 'Tenant ID filter (Super Admin only)' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm tên hoặc số điện thoại' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Lọc trạng thái hoạt động (true/false)' })
  @IsOptional()
  @IsString()
  isOnline?: string;

  @ApiPropertyOptional({ description: 'Lọc trạng thái KYC (true/false)' })
  @IsOptional()
  @IsString()
  kycVerified?: string;

  @ApiPropertyOptional({ description: 'Chỉ lấy thợ có số dư ký quỹ thấp (< 100k)' })
  @IsOptional()
  @IsString()
  lowDepositOnly?: string;

  @ApiPropertyOptional({ description: 'Chỉ lấy thợ sẵn sàng nhận việc (true/false)' })
  @IsOptional()
  @IsString()
  readyOnly?: string;

  @ApiPropertyOptional({ description: 'Chỉ lấy thợ đang bận làm việc (true/false)' })
  @IsOptional()
  @IsString()
  busyOnly?: string;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  page?: string | number;

  @ApiPropertyOptional({ description: 'Số lượng bản ghi mỗi trang', default: 20 })
  @IsOptional()
  limit?: string | number;
}
