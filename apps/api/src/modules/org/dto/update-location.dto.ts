import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MIN_GEOFENCE_RADIUS_METERS } from '../geofence-radius';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(MIN_GEOFENCE_RADIUS_METERS)
  geofenceRadiusMeters?: number;

  @IsOptional()
  @IsString()
  timezone?: string;
}
