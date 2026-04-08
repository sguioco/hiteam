import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  name!: string;

  @IsString()
  @MaxLength(32)
  code!: string;

  @IsString()
  address!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  geofenceRadiusMeters?: number;

  @IsString()
  companyId!: string;

  @IsString()
  timezone!: string;
}
