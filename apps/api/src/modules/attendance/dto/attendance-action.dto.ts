import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AttendanceActionDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  accuracyMeters!: number;

  @IsString()
  deviceFingerprint!: string;

  @IsOptional()
  @IsString()
  biometricVerificationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isPaidBreak?: boolean;
}
