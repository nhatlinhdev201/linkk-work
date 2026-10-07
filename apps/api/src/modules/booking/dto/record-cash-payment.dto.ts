import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsPositive, IsBoolean } from 'class-validator';

export class RecordCashPaymentDto {
  @ApiPropertyOptional({
    description: 'Số tiền mặt thực thu (mặc định lấy theo tổng cước đơn hàng)',
    example: 240000,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Ghi chú thu tiền mặt',
    example: 'Khách đã thanh toán đủ 240.000đ cho thợ',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Tự động trích hoa hồng sàn từ ví ký quỹ của thợ (mặc định true)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  deductCommission?: boolean;
}
