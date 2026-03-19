import type { TaskPriority } from '@prisma/client';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TASK_PRIORITIES } from '../../../common/constants/prisma-enum-values';

export class CreateTaskDto {
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

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  assigneeEmployeeId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];
}
