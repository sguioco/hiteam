import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  shiftDate?: string;

  @IsOptional()
  @IsString()
  fixedBreakStartsAtLocal?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  fixedBreakDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  fixedBreakIsPaid?: boolean;
}
