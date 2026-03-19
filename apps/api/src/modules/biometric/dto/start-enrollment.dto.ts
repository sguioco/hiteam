import { IsOptional, IsString } from 'class-validator';

export class StartEnrollmentDto {
  @IsOptional()
  @IsString()
  consentVersion?: string;
}
