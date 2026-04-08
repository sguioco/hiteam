import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class TimeOffBalanceUpsertDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  vacationAllowanceDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  personalDayOffAllowanceDays?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
