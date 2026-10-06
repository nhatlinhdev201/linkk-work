import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddonDto {
  @ApiProperty({ example: 'Khử khuẩn nano bạc' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 'Xịt khử khuẩn nano bạc công nghệ cao phòng ngừa vi khuẩn' })
  @IsOptional()
  @IsString()
  description?: string;
}
