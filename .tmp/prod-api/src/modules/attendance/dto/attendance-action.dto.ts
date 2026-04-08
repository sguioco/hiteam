import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class AttendanceActionDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsNumber()
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
