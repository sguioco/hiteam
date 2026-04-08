import { IsIn, IsOptional, IsString } from 'class-validator';

export class BiometricReviewsQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsIn(['PASSED', 'FAILED', 'REVIEW'])
  result?: 'PASSED' | 'FAILED' | 'REVIEW';
}
