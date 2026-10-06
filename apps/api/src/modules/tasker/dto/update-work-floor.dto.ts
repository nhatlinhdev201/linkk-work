import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateWorkFloorDto {
  @ApiPropertyOptional({ description: 'Bán kính nhận việc tối đa (km)', example: 15 })
  @IsOptional()
  @IsNumber({}, { message: 'maxDistanceKm phải là số' })
  @Min(1, { message: 'Bán kính quét việc tối thiểu là 1 km' })
  @Max(100, { message: 'Bán kính quét việc tối đa là 100 km' })
  maxDistanceKm?: number;

  @ApiPropertyOptional({ description: 'Bật tự động nhận tín hiệu radar quét việc', example: true })
  @IsOptional()
  @IsBoolean({ message: 'autoRadarEnabled phải là boolean' })
  autoRadarEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Trạng thái trực tuyến (online/offline)', example: true })
  @IsOptional()
  @IsBoolean({ message: 'isOnline phải là boolean' })
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Tọa độ vĩ độ hiện tại', example: 21.028511 })
  @IsOptional()
  @IsNumber({}, { message: 'currentLat phải là số thực' })
  currentLat?: number;

  @ApiPropertyOptional({ description: 'Tọa độ kinh độ hiện tại', example: 105.854444 })
  @IsOptional()
  @IsNumber({}, { message: 'currentLng phải là số thực' })
  currentLng?: number;
}
