import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class AttendanceHistoryQueryDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['OPEN', 'ON_BREAK', 'CLOSED'])
  status?: 'OPEN' | 'ON_BREAK' | 'CLOSED';
}
