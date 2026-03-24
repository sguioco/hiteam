import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RescheduleTaskDto {
  @IsDateString()
  dueAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
