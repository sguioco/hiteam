import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateShiftTemplateDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  positionId?: string;

  @IsString()
  startsAtLocal!: string;

  @IsString()
  endsAtLocal!: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(180)
  gracePeriodMinutes?: number;

  @IsOptional()
  @IsString()
  fixedBreakStartsAtLocal?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  fixedBreakDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  fixedBreakIsPaid?: boolean;
}
