import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '@linkkwork/shared-types';

export class TransitionStatusDto {
  @ApiProperty({ enum: BookingStatus, description: 'Trạng thái chuyển tiếp mục tiêu' })
  @IsEnum(BookingStatus)
  @IsNotEmpty()
  status!: BookingStatus;

  @ApiPropertyOptional({ description: 'Lý do hoặc ghi chú sự kiện thay đổi trạng thái', example: 'Khách yêu cầu hủy sớm' })
  @IsOptional()
  @IsString()
  note?: string;
}
