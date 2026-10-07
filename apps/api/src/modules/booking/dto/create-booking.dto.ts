import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  IsArray,
  Min,
  Max,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PaymentMethod } from '@linkkwork/shared-types';

export class CreateBookingDto {
  @ApiProperty({ description: 'ID dịch vụ cần đặt', example: 'srv-hourly-cleaning' })
  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @ApiProperty({ description: 'Thời gian hẹn lịch làm việc (ISO 8601)', example: '2026-10-10T09:00:00Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ description: 'Tên khách hàng', example: 'Nguyễn Văn An' })
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @ApiProperty({ description: 'Số điện thoại khách hàng', example: '0901234567' })
  @IsString()
  @IsNotEmpty()
  customerPhone!: string;

  @ApiProperty({ description: 'Địa chỉ thực hiện dịch vụ', example: '123 Đường Cầu Giấy, Hà Nội' })
  @IsString()
  @IsNotEmpty()
  addressText!: string;

  @ApiPropertyOptional({ description: 'Tọa độ vĩ độ (Latitude)', example: 21.0333 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ description: 'Tọa độ kinh độ (Longitude)', example: 105.7833 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Thời lượng (giờ) cho dịch vụ HOURLY', example: 3 })
  @IsOptional()
  @IsPositive()
  durationHours?: number;

  @ApiPropertyOptional({ description: 'Số lượng đơn vị cho dịch vụ PER_UNIT', example: 2 })
  @IsOptional()
  @IsPositive()
  unitCount?: number;

  @ApiPropertyOptional({ description: 'Danh sách ID dịch vụ cộng thêm (Add-ons)', example: ['addon-tool-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];

  @ApiPropertyOptional({ description: 'Phụ phí khu vực xa xôi / giờ cao điểm', example: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  areaSurcharge?: number;

  @ApiPropertyOptional({ description: 'Hệ số tăng giá đột biến (Surge Multiplier >= 1.0)', example: 1.2 })
  @IsOptional()
  @IsNumber()
  @Min(1.0)
  surgeMultiplier?: number;

  @ApiPropertyOptional({ description: 'Mã voucher giảm giá', example: 'WELCOME20' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Số tiền giảm giá', example: 20000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Ghi chú đơn hàng từ Admin', example: 'Khách yêu cầu mang găng tay' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán',
    example: 'CASH',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
