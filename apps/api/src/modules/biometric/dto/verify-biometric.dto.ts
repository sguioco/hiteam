import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class VerifyBiometricDto {
  @IsOptional()
  @IsString()
  attendanceEventId?: string;

  @IsOptional()
  @IsString()
  intent?: string;

  @IsOptional()
  @IsObject()
  captureMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artifacts?: string[];
}
