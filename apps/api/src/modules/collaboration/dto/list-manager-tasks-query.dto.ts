import { IsIn, IsOptional, IsString } from 'class-validator';
import type { TaskPriority, TaskStatus } from '@prisma/client';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../../common/constants/prisma-enum-values';

export class ListManagerTasksQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  assigneeEmployeeId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  onlyOverdue?: string;
}
