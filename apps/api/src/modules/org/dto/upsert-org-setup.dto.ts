import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { MIN_GEOFENCE_RADIUS_METERS } from "../geofence-radius";

export class UpsertOrgSetupDto {
  @IsOptional()
  @IsIn(["create", "update"])
  mode?: "create" | "update";

  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  companyLogoUrl?: string;

  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(MIN_GEOFENCE_RADIUS_METERS)
  geofenceRadiusMeters?: number;

  @IsString()
  timezone!: string;

  @IsOptional()
  @IsBoolean()
  attendanceTrackingEnabled?: boolean;
}
