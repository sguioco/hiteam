import type { TaskPriority, TaskTemplateFrequency } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_TEMPLATE_FREQUENCIES } from '../../../common/constants/prisma-enum-values';

export class CreateTaskTemplateDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @IsIn(TASK_TEMPLATE_FREQUENCIES)
  frequency!: TaskTemplateFrequency;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekDays?: number[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dayOfMonth?: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(30)
  dueAfterDays?: number;

  @IsOptional()
  @IsString()
  dueTimeLocal?: string;

  @IsOptional()
  @IsString()
  assigneeEmployeeId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
