import { Type } from 'class-transformer';
import type { AnnouncementAudience } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ANNOUNCEMENT_AUDIENCES } from '../../../common/constants/prisma-enum-values';

export class CreateAnnouncementAttachmentDto {
  @IsString()
  @MaxLength(180)
  fileName!: string;

  @IsString()
  dataUrl!: string;
}

export class CreateAnnouncementAttachmentLocationDto {
  @IsString()
  @MaxLength(320)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  placeId?: string;

  @Type(() => Number)
  @IsNumber()
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  longitude!: number;
}

export class CreateAnnouncementDto {
  @IsIn(ANNOUNCEMENT_AUDIENCES)
  audience!: AnnouncementAudience;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @IsOptional()
  @IsString()
  targetEmployeeId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetEmployeeIds?: string[];

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsString()
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1200)
  linkUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAnnouncementAttachmentLocationDto)
  attachmentLocation?: CreateAnnouncementAttachmentLocationDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => CreateAnnouncementAttachmentDto)
  attachments?: CreateAnnouncementAttachmentDto[];

  @IsOptional()
  @IsString()
  imageDataUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(["1:1", "16:9", "4:3"])
  imageAspectRatio?: string;

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
