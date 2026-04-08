import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AttendanceCorrectionActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
