import { IsArray, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CompleteEnrollmentDto {
  @IsOptional()
  @IsString()
  templateRef?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  livenessScore?: number;

  @IsOptional()
  @IsObject()
  captureMetadata?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  artifacts?: string[];
}
