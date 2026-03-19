import { IsDateString, IsOptional } from 'class-validator';

export class RequestCalendarQueryDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
