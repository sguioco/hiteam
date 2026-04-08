import { IsIn, IsOptional } from 'class-validator';

export class CreateLivenessBootstrapDto {
  @IsOptional()
  @IsIn(['enroll', 'verify'])
  mode?: 'enroll' | 'verify';
}
