import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import {
  CreateAnnouncementAttachmentDto,
  CreateAnnouncementAttachmentLocationDto,
} from "./create-announcement.dto";

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

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  linkUrl?: string;

  @IsOptional()
  @IsBoolean()
  removeLink?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAnnouncementAttachmentLocationDto)
  attachmentLocation?: CreateAnnouncementAttachmentLocationDto;

  @IsOptional()
  @IsBoolean()
  removeAttachmentLocation?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateAnnouncementAttachmentDto)
  attachments?: CreateAnnouncementAttachmentDto[];

  @IsOptional()
  @IsBoolean()
  removeAttachments?: boolean;
}
