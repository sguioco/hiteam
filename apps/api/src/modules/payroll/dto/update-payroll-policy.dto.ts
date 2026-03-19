import { IsBoolean, IsInt, IsNumber, IsString, Matches, Min } from 'class-validator';

export class UpdatePayrollPolicyDto {
  @IsNumber()
  @Min(0)
  baseHourlyRate!: number;

  @IsNumber()
  @Min(1)
  overtimeMultiplier!: number;

  @IsNumber()
  @Min(1)
  weekendMultiplier!: number;

  @IsNumber()
  @Min(1)
  weekendOvertimeMultiplier!: number;

  @IsNumber()
  @Min(1)
  holidayMultiplier!: number;

  @IsNumber()
  @Min(1)
  holidayOvertimeMultiplier!: number;

  @IsNumber()
  @Min(0)
  nightPremiumMultiplier!: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  nightShiftStartLocal!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  nightShiftEndLocal!: string;

  @IsNumber()
  @Min(0)
  latenessPenaltyPerMinute!: number;

  @IsNumber()
  @Min(0)
  earlyLeavePenaltyPerMinute!: number;

  @IsNumber()
  @Min(0)
  leavePaidRatio!: number;

  @IsNumber()
  @Min(0)
  sickLeavePaidRatio!: number;

  @IsInt()
  @Min(1)
  standardShiftMinutes!: number;

  @IsBoolean()
  defaultBreakIsPaid!: boolean;

  @IsInt()
  @Min(1)
  maxBreakMinutes!: number;

  @IsInt()
  @Min(1)
  mandatoryBreakThresholdMinutes!: number;

  @IsInt()
  @Min(0)
  mandatoryBreakDurationMinutes!: number;
}
