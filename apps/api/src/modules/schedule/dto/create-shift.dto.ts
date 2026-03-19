import { IsDateString, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsString()
  templateId!: string;

  @IsString()
  employeeId!: string;

  @IsDateString()
  shiftDate!: string;
}
