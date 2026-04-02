import { IsOptional, IsString } from 'class-validator';

export class EmployeeStatsQueryDto {
  @IsOptional()
  @IsString()
  companyId?: string;
}
