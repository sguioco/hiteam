import type { TaskStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TASK_STATUSES } from '../../../common/constants/prisma-enum-values';

export class SetTaskStatusDto {
  @IsIn(TASK_STATUSES)
  status!: TaskStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
