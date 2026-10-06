import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AssignTaskerDto {
  @ApiProperty({ description: 'ID của thợ / Tasker cần chỉ định', example: 'usr-tasker-1' })
  @IsString()
  @IsNotEmpty()
  taskerId!: string;

  @ApiPropertyOptional({ description: 'Ghi chú điều phối', example: 'Chỉ định trực tiếp thợ cứng kinh nghiệm' })
  @IsOptional()
  @IsString()
  note?: string;
}
