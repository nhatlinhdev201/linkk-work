import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterPartnerDto as IRegisterPartnerDto } from '@linkkwork/shared-types';

export class RegisterPartnerDto implements IRegisterPartnerDto {
  @ApiProperty({ example: 'Công ty Vệ Sinh Ánh Dương' })
  @IsString()
  @IsNotEmpty({ message: 'businessName is required' })
  businessName!: string;

  @ApiProperty({ example: '0301234567' })
  @IsString()
  @IsNotEmpty({ message: 'taxId is required' })
  taxId!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'contactName is required' })
  contactName!: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty({ message: 'contactPhone is required' })
  contactPhone!: string;

  @ApiProperty({ example: 'contact@anhduong.vn' })
  @IsEmail({}, { message: 'contactEmail must be a valid email' })
  @IsNotEmpty({ message: 'contactEmail is required' })
  contactEmail!: string;

  @ApiProperty({ example: 'Hồ Chí Minh' })
  @IsString()
  @IsNotEmpty({ message: 'city is required' })
  city!: string;

  @ApiProperty({ example: ['don-dep-ve-sinh'] })
  @IsArray({ message: 'services must be an array of service slugs' })
  @IsString({ each: true })
  services!: string[];

  @ApiPropertyOptional({ example: '123 Đường Số 1, Quận 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/license.pdf' })
  @IsOptional()
  @IsString()
  businessLicenseUrl?: string;

  @ApiPropertyOptional({ example: 'Partner@123456' })
  @IsOptional()
  @IsString()
  password?: string;
}
