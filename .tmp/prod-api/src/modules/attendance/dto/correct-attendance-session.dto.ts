import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CorrectAttendanceSessionDto {
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  paidBreakMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lateMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  earlyLeaveMinutes?: number;

  @IsString()
  @MaxLength(500)
  reason!: string;
}
