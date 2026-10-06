import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsString,
  NotEquals,
} from 'class-validator';

export class AdjustDepositDto {
  @ApiProperty({
    description: 'Số tiền ký quỹ cần điều chỉnh (dương để nạp, âm để khấu trừ)',
    example: 500000,
  })
  @IsNumber({}, { message: 'amount phải là số' })
  @NotEquals(0, { message: 'Số tiền điều chỉnh không được bằng 0' })
  amount!: number;

  @ApiProperty({
    description: 'Lý do / ghi chú điều chỉnh ký quỹ',
    example: 'Nạp tiền ký quỹ đảm bảo nhận việc',
  })
  @IsString({ message: 'notes phải là chuỗi' })
  @IsNotEmpty({ message: 'Ghi chú lý do không được để trống' })
  notes!: string;
}
