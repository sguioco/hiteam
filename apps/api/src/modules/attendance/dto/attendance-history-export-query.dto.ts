import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class AttendanceHistoryExportQueryDto {
  @IsOptional()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['csv', 'xlsx', 'pdf'])
  format?: 'csv' | 'xlsx' | 'pdf';
}
