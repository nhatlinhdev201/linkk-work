import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginDto as ILoginDto, UserRole } from '@linkkwork/shared-types';

export class LoginDto implements ILoginDto {
  @ApiProperty({ example: 'admin@linkkwork.vn', description: 'User email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({ example: 'Admin@123456', description: 'User password (min 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;

  @ApiPropertyOptional({ example: '0901234567', description: 'User phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Role if explicitly specified' })
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ example: 'uuid', description: 'Tenant ID for multi-tenant users' })
  @IsOptional()
  @IsString()
  tenantId?: string;
}
