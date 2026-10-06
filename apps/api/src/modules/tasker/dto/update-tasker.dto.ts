import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateTaskerDto {
  @ApiPropertyOptional({ description: 'Họ và tên của thợ', example: 'Nguyễn Văn Thợ' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Số điện thoại liên lạc', example: '0901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, {
    message: 'Số điện thoại không đúng định dạng Việt Nam',
  })
  phone?: string;

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

  @ApiPropertyOptional({
    description: 'Chính sách tiền lương / thu nhập',
    example: 'COMMISSION',
    enum: ['COMMISSION', 'FIXED_SALARY'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['COMMISSION', 'FIXED_SALARY'], {
    message: 'salaryType phải là COMMISSION hoặc FIXED_SALARY',
  })
  salaryType?: string;
}
