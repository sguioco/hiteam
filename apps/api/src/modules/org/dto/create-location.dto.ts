import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MIN_GEOFENCE_RADIUS_METERS } from '../geofence-radius';

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
  @Min(MIN_GEOFENCE_RADIUS_METERS)
  geofenceRadiusMeters?: number;

  @IsString()
  companyId!: string;

  @IsString()
  timezone!: string;
}
