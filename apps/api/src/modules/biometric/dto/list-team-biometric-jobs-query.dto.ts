import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTeamBiometricJobsQueryDto {
  @IsOptional()
  @IsIn(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'])
  status?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
