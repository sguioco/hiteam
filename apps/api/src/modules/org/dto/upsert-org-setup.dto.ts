import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Min, ValidateIf, IsISO31661Alpha2 } from "class-validator";
import { MIN_GEOFENCE_RADIUS_METERS } from "../geofence-radius";

export class UpsertOrgSetupDto {
  @IsOptional()
  @IsIn(["create", "update", "create-location"])
  mode?: "create" | "update" | "create-location";

  @IsOptional()
  @IsString()
  locationName?: string;

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsString()
  companyName!: string;

  @IsOptional()
  @IsString()
  companyLogoUrl?: string;

  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @ValidateIf((value) => value.attendanceTrackingEnabled !== false)
  @IsString()
  address?: string;

  @ValidateIf((value) => value.attendanceTrackingEnabled === false)
  @IsISO31661Alpha2()
  billingCountry?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @ValidateIf((value) => value.attendanceTrackingEnabled !== false)
  @IsNumber()
  latitude?: number;

  @ValidateIf((value) => value.attendanceTrackingEnabled !== false)
  @IsNumber()
  longitude?: number;

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
