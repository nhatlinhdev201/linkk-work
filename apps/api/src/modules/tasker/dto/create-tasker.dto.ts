import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTaskerDto {
  @ApiProperty({ description: 'Họ và tên của thợ', example: 'Nguyễn Văn Thợ' })
  @IsString()
  @IsNotEmpty({ message: 'Tên không được để trống' })
  name!: string;

  @ApiProperty({ description: 'Số điện thoại liên lạc', example: '0901234567' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/^(\+?84|0)[35789][0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam',
  })
  phone!: string;

  @ApiProperty({ description: 'Địa chỉ email', example: 'tho.nguyen@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiPropertyOptional({ description: 'Mật khẩu khởi tạo', example: 'Tasker@123456' })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  password?: string;

  @ApiPropertyOptional({ description: 'ID Tenant (dành cho Super Admin)', example: 'tenant-linkkwork' })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ description: 'Số CMND / CCCD', example: '001200000001' })
  @IsOptional()
  @IsString()
  idCardNumber?: string;

  @ApiPropertyOptional({
    description: 'Danh sách kỹ năng chuyên môn',
    example: ['don-dep-ve-sinh', 'giat-ghe-sofa'],
  })
  @IsOptional()
  @IsArray({ message: 'skills phải là danh sách mảng' })
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({ description: 'Số dư ký quỹ ban đầu (VND)', example: 500000 })
  @IsOptional()
  @IsNumber({}, { message: 'depositBalance phải là số' })
  @Min(0, { message: 'Số dư ký quỹ không thể âm' })
  depositBalance?: number;

  @ApiPropertyOptional({ description: 'Bán kính quét việc tối đa (km)', example: 15 })
  @IsOptional()
  @IsNumber({}, { message: 'maxDistanceKm phải là số' })
  @Min(1, { message: 'Bán kính quét việc tối thiểu là 1 km' })
  @Max(100, { message: 'Bán kính quét việc tối đa là 100 km' })
  maxDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Bật tự động nhận tín hiệu radar quét việc', example: true })
  @IsOptional()
  @IsBoolean({ message: 'autoRadarEnabled phải là boolean' })
  autoRadarEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Tên ngân hàng nhận thanh toán', example: 'Vietcombank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Số tài khoản ngân hàng', example: '1012345678' })
  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Chủ tài khoản ngân hàng', example: 'NGUYEN VAN THO' })
  @IsOptional()
  @IsString()
  bankAccountHolder?: string;
}
