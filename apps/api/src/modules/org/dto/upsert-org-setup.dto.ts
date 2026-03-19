import { IsIn, IsNumber, IsOptional, IsString, Min } from "class-validator";

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

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  geofenceRadiusMeters?: number;

  @IsString()
  timezone!: string;
}
