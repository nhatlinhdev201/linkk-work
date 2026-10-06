import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateKycDto {
  @ApiProperty({ description: 'Trạng thái xác minh KYC', example: true })
  @IsBoolean({ message: 'kycVerified phải là boolean' })
  kycVerified!: boolean;

  @ApiPropertyOptional({ description: 'Số CMND / CCCD xác minh', example: '001200000001' })
  @IsOptional()
  @IsString({ message: 'idCardNumber phải là chuỗi' })
  idCardNumber?: string;

  @ApiPropertyOptional({ description: 'Ghi chú xác thực KYC', example: 'Đã đối chiếu căn cước công dân gốc' })
  @IsOptional()
  @IsString({ message: 'notes phải là chuỗi' })
  notes?: string;
}
