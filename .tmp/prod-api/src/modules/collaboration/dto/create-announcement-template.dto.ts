import type { AnnouncementAudience, AnnouncementTemplateFrequency } from '@prisma/client';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_TEMPLATE_FREQUENCIES,
} from '../../../common/constants/prisma-enum-values';

export class CreateAnnouncementTemplateDto {
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

  @IsIn(ANNOUNCEMENT_TEMPLATE_FREQUENCIES)
  frequency!: AnnouncementTemplateFrequency;

  @IsOptional()
  weekDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsString()
  startDate!: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  publishTimeLocal?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
