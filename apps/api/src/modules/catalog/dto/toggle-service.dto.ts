import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ToggleServiceDto {
  @ApiPropertyOptional({ example: true, description: 'Explicit target active state (if omitted, toggles)' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
