import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  body?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  imageDataUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(["1:1", "16:9", "4:3"])
  imageAspectRatio?: string;

  @IsOptional()
  @IsBoolean()
  removeImage?: boolean;
}
