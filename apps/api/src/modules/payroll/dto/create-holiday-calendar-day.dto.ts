import { IsBoolean, IsDateString, IsString, MinLength } from 'class-validator';

export class CreateHolidayCalendarDayDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  date!: string;

  @IsBoolean()
  isPaid!: boolean;
}
