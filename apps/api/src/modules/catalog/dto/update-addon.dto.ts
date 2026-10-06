import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAddonDto {
  @ApiPropertyOptional({ example: 'Khử khuẩn nano bạc cao cấp' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 60000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ example: 'Xịt khử khuẩn nano bạc công nghệ cao phòng ngừa vi khuẩn' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
