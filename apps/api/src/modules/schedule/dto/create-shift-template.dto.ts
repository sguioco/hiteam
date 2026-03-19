import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateShiftTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsString()
  locationId!: string;

  @IsString()
  positionId!: string;

  @IsString()
  startsAtLocal!: string;

  @IsString()
  endsAtLocal!: string;

  @IsInt()
  @Min(0)
  @Max(180)
  gracePeriodMinutes!: number;
}
