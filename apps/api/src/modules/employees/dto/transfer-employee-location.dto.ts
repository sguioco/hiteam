import { IsIn, IsOptional, IsString } from 'class-validator';

export class TransferEmployeeLocationDto {
  @IsString()
  locationId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsIn(['keep', 'cancel'])
  futureShiftStrategy?: 'keep' | 'cancel';
}
