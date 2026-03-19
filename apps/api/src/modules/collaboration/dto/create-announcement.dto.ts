import type { AnnouncementAudience } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ANNOUNCEMENT_AUDIENCES } from '../../../common/constants/prisma-enum-values';

export class CreateAnnouncementDto {
  @IsIn(ANNOUNCEMENT_AUDIENCES)
  audience!: AnnouncementAudience;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  targetEmployeeId?: string;

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
}
